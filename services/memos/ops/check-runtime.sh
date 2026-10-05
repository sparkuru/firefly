#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
readonly SCRIPT_DIR
REPOSITORY_ROOT=$(cd -- "$SCRIPT_DIR/../../.." && pwd)
readonly REPOSITORY_ROOT

usage() {
	printf 'Usage: %s [--help]\nVerify an owned memo proxy, TLS mail worker and native browser/publication lifecycle.\nNo host service ports or external mail; requires installed/built repository packages.\nBuilds disposable service/browser images; browser trust requires the image package repository for libnss3-tools.\n' "${0##*/}"
}

die() {
	printf 'Error: %s\n' "$*" >&2
	exit 1
}

cleanup() {
	local status=$? id volume owned_image
	local -a mounted_volumes=()
	trap - EXIT
	while IFS= read -r id; do
		[[ -n "$id" ]] || continue
		if [[ "$(docker inspect --format '{{ index .Config.Labels "firefly.memo-runtime" }}' "$id")" == "$run_id" ]]; then
			while IFS= read -r volume; do
				[[ -z "$volume" ]] || mounted_volumes+=("$volume")
			done < <(docker inspect --format '{{range .Mounts}}{{if eq .Type "volume"}}{{println .Name}}{{end}}{{end}}' "$id")
			docker rm -fv "$id" >/dev/null || status=1
		else
			status=1
		fi
	done < <(docker ps -aq --filter "label=firefly.memo-runtime=$run_id")
	[[ -z "$(docker ps -aq --filter "label=firefly.memo-runtime=$run_id")" ]] || status=1
	for volume in "${mounted_volumes[@]}"; do
		if docker volume inspect "$volume" >/dev/null 2>&1; then status=1; fi
	done
	for owned_image in "${image:-}" "${browser_image:-}"; do
		[[ -n "$owned_image" ]] || continue
		if docker image inspect "$owned_image" >/dev/null 2>&1; then
			if [[ "$(docker image inspect --format '{{ index .Config.Labels "firefly.memo-runtime" }}' "$owned_image")" == "$run_id" ]]; then
				docker image rm "$owned_image" >/dev/null || status=1
			else
				status=1
			fi
		fi
	done
	if [[ "${scratch:-}" == /tmp/firefly-memo-runtime.* && -d "$scratch" ]]; then rm -rf -- "$scratch"; fi
	if [[ "${publication_root:-}" == "$REPOSITORY_ROOT/services/memos/dist/runtime-check."* && -d "$publication_root" ]]; then rm -rf -- "$publication_root"; fi
	if [[ "$status" == 0 ]]; then printf 'Memo runtime cleanup verified: no owned containers, anonymous volumes, images or fixture state remain.\n'; fi
	exit "$status"
}

start_http() {
	http_id=$(docker run -d --label "firefly.memo-runtime=$run_id" --init --user "$runtime_user" \
		--network "container:$edge_id" --read-only --tmpfs /tmp:size=16m,mode=1777 \
		--cap-drop ALL --security-opt no-new-privileges \
		--mount "type=bind,src=$scratch/data,dst=/var/lib/firefly-memos" \
		--mount "type=bind,src=$scratch/runtime/config.toml,dst=/app/config/plugins/memos/config.toml,readonly" \
		--mount "type=bind,src=$scratch/runtime/secrets.env,dst=/run/secrets/memos.env,readonly" \
		--env MEMOS_TRUST_PROXY=loopback "$image")
	containers+=("$http_id")
	local attempt
	for ((attempt = 0; attempt < 30; attempt++)); do
		if docker exec "$http_id" node -e "fetch('http://127.0.0.1:8788/readyz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then return 0; fi
		sleep 1
	done
	die 'owned HTTP service did not become ready'
}

probe() {
	docker run --rm --label "firefly.memo-runtime=$run_id" --network "container:$edge_id" --user "$runtime_user" \
		--read-only --tmpfs /tmp:size=16m,mode=1777 --cap-drop ALL --security-opt no-new-privileges \
		--mount "type=bind,src=$SCRIPT_DIR,dst=/scripts,readonly" \
		--mount "type=bind,src=$scratch/runtime,dst=/fixture" \
		--mount "type=bind,src=$scratch/data,dst=/var/lib/firefly-memos" \
		--mount "type=bind,src=$publication_root,dst=/publication,readonly" \
		--mount "type=bind,src=$scratch/runtime/config.toml,dst=/app/config/plugins/memos/config.toml,readonly" \
		--mount "type=bind,src=$scratch/runtime/secrets.env,dst=/run/secrets/memos.env,readonly" \
		--env MEMOS_TRUST_PROXY=loopback --env "MEMOS_FIXTURE_UID=$runtime_uid" "$image" /scripts/fixture-runtime.mjs "$1"
}

copy_export() {
	cp -- "$scratch/runtime/export.json" "$publication_root/inputs/memos.json"
}

build_site() {
	if ! FIREFLY_CONTENT_ROOT="$REPOSITORY_ROOT/content" FIREFLY_SITE_CONFIG_PATH="$publication_relative/config/site.toml" \
		"$REPOSITORY_ROOT/preview.sh" render env FIREFLY_MEMOS_EXPORT="$publication_relative/inputs/memos.json" \
		npm --prefix apps/site run astro -- build --outDir "/app/$publication_relative/apps/site/dist" >"$scratch/runtime/site-build.log" 2>&1; then
		cat "$scratch/runtime/site-build.log" >&2
		die 'owned static site build failed'
	fi
}

publication() {
	FIREFLY_CONTENT_ROOT="$REPOSITORY_ROOT/content" "$REPOSITORY_ROOT/sam" \
		node services/memos/ops/fixture-publication.mjs "$1" "/app/$publication_relative"
}

browser_probe() {
	docker run --rm --label "firefly.memo-runtime=$run_id" --network "container:$edge_id" --user "$runtime_user" --ipc host \
		--read-only --tmpfs /tmp:size=512m,mode=1777 --cap-drop ALL --security-opt no-new-privileges \
		--env HOME=/tmp --mount "type=bind,src=$REPOSITORY_ROOT/apps/site/node_modules,dst=/app/apps/site/node_modules,readonly" \
		--mount "type=bind,src=$SCRIPT_DIR/fixture-browser.mjs,dst=/scripts/fixture-browser.mjs,readonly" \
		--mount "type=bind,src=$scratch/runtime/ca.pem,dst=/fixture-ca.pem,readonly" \
		--mount "type=bind,src=$scratch/browser,dst=/fixture" \
		"$browser_image" node /scripts/fixture-browser.mjs "$1"
}

main() {
	if [[ "${1:-}" == --help || "${1:-}" == -h ]]; then
		usage
		return 0
	fi
	[[ $# == 0 ]] || die 'unexpected arguments'
	local dependency
	for dependency in docker openssl mktemp mkdir cp sed chmod rm dirname sleep id cat; do
		command -v "$dependency" >/dev/null 2>&1 || die "required command not found: $dependency"
	done
	[[ -f "$REPOSITORY_ROOT/tooling/assemble-publication/dist/src/index.js" && -d "$REPOSITORY_ROOT/apps/site/node_modules/@playwright/test" ]] || die 'install and build the repository packages first'
	runtime_uid=$(id -u)
	runtime_user="$runtime_uid:$(id -g)"
	[[ "$runtime_uid" != 0 ]] || die 'fixture runner requires a nonroot owner; never broaden private file permissions'
	scratch=$(mktemp -d /tmp/firefly-memo-runtime.XXXXXXXX)
	run_id=${scratch##*.}
	containers=()
	image="firefly-memos:runtime-$run_id"
	browser_image="firefly-memos-browser:runtime-$run_id"
	publication_root=$(mktemp -d "$REPOSITORY_ROOT/services/memos/dist/runtime-check.XXXXXXXX")
	publication_relative=${publication_root#"$REPOSITORY_ROOT/"}
	trap cleanup EXIT
	trap 'exit 130' INT
	trap 'exit 143' TERM
	mkdir -m 700 -- "$scratch/runtime" "$scratch/edge" "$scratch/data" "$scratch/browser" "$scratch/browser-image"
	mkdir -p -- "$publication_root/config" "$publication_root/inputs" "$publication_root/apps/site"
	chmod 700 "$scratch" "$publication_root"
	openssl req -x509 -newkey rsa:2048 -nodes -days 1 -keyout "$scratch/runtime/key.pem" \
		-out "$scratch/runtime/ca.pem" -subj /CN=localhost -addext subjectAltName=DNS:localhost \
		>"$scratch/runtime/certificate.log" 2>&1
	chmod 600 "$scratch/runtime/key.pem" "$scratch/runtime/ca.pem"
	cp -- "$scratch/runtime/key.pem" "$scratch/runtime/ca.pem" "$scratch/edge/"
	cat >"$scratch/runtime/config.toml" <<'TOML'
[runtime]
allowedOrigins=["https://localhost:8443"]
publicOrigin="https://localhost:8443"
dataRoot="/var/lib/firefly-memos"
[runtime.smtp]
host="localhost"
port=2465
secure=true
user="fixture"
from="memos@example.invalid"
connectionTimeoutMs=1000
commandTimeoutMs=1000
TOML
	cat >"$scratch/runtime/secrets.env" <<'ENV'
MEMOS_ENCRYPTION_KEY=0101010101010101010101010101010101010101010101010101010101010101
MEMOS_TOKEN_KEY=0202020202020202020202020202020202020202020202020202020202020202
MEMOS_ADMIN_TOKEN=fixture-only-owner-token-0123456789
MEMOS_SMTP_PASSWORD=fixture-only-password
ENV
	chmod 600 "$scratch/runtime/config.toml" "$scratch/runtime/secrets.env"
	sed -e '/^\[site\]$/a\url = "https://localhost:8443"' \
		-e '/^\[plugins.memos\]$/,$s/enabled = false/enabled = true/' \
		-e 's@configPath = "config/plugins/memos/config.toml"@configPath = "memos.toml"@' \
		"$REPOSITORY_ROOT/config/site.toml.example" >"$publication_root/config/site.toml"
	cat >"$publication_root/memos.toml" <<'TOML'
[public]
writeOrigin="https://localhost:8443"
exportPath="inputs/memos.json"
consentVersion="memos-v1"
TOML
	sed -e 's@root /usr/share/nginx/html;@root /public/dist;@' \
		-e '/listen 8080 default_server;/a\        listen 8443 ssl;\n        ssl_certificate /edge/ca.pem;\n        ssl_certificate_key /edge/key.pem;' \
		"$REPOSITORY_ROOT/nginx.conf" >"$scratch/edge/nginx.conf"
	docker compose -f "$REPOSITORY_ROOT/compose.yml" config --quiet
	docker compose -f "$REPOSITORY_ROOT/compose.yml" --profile memos config --quiet
	docker compose -f "$REPOSITORY_ROOT/compose.yml" --profile comments config --quiet
	docker compose -f "$REPOSITORY_ROOT/compose.yml" --profile comments --profile memos config --quiet
	MEMOS_RUNTIME_USER="$runtime_user" docker compose -f "$REPOSITORY_ROOT/plugins/memos/compose.yml" config --quiet
	docker build --label "firefly.memo-runtime=$run_id" --file "$REPOSITORY_ROOT/services/memos/Dockerfile" --tag "$image" "$REPOSITORY_ROOT" >"$scratch/runtime/image-build.log" 2>&1
	cat >"$scratch/browser-image/Dockerfile" <<'DOCKERFILE'
FROM mcr.microsoft.com/playwright:v1.62.0-noble
RUN apt-get update && apt-get install -y --no-install-recommends libnss3-tools && rm -rf /var/lib/apt/lists/*
DOCKERFILE
	docker build --label "firefly.memo-runtime=$run_id" --tag "$browser_image" "$scratch/browser-image" >"$scratch/runtime/browser-build.log" 2>&1
	edge_id=$(docker run -d --label "firefly.memo-runtime=$run_id" --network none --user "$runtime_user" --read-only \
		--cap-drop ALL --security-opt no-new-privileges --tmpfs /tmp:size=16m,mode=1777 \
		--mount "type=bind,src=$scratch/edge,dst=/edge,readonly" \
		--mount "type=bind,src=$publication_root,dst=/public,readonly" \
		--entrypoint nginx nginx:alpine -c /edge/nginx.conf -g 'daemon off;')
	containers+=("$edge_id")
	sleep 1
	docker exec "$edge_id" nginx -t -c /edge/nginx.conf
	probe absent
	start_http
	probe proxy
	docker stop --time 20 "$http_id" >/dev/null
	start_http
	probe persistence
	probe export
	copy_export
	build_site
	publication assemble
	smtp_id=$(docker run -d --label "firefly.memo-runtime=$run_id" --user "$runtime_user" --network "container:$edge_id" \
		--read-only --tmpfs /tmp:size=16m,mode=1777 --cap-drop ALL --security-opt no-new-privileges \
		--mount "type=bind,src=$SCRIPT_DIR,dst=/scripts,readonly" --mount "type=bind,src=$scratch/runtime,dst=/fixture" \
		"$image" /scripts/fixture-smtp.mjs)
	containers+=("$smtp_id")
	worker_id=$(docker run -d --label "firefly.memo-runtime=$run_id" --init --user "$runtime_user" --network "container:$edge_id" \
		--read-only --tmpfs /tmp:size=16m,mode=1777 --cap-drop ALL --security-opt no-new-privileges \
		--health-cmd 'node dist/src/worker-health.js' --health-interval 5s --health-timeout 3s --health-start-period 5s \
		--mount "type=bind,src=$scratch/data,dst=/var/lib/firefly-memos" \
		--mount "type=bind,src=$scratch/runtime/config.toml,dst=/app/config/plugins/memos/config.toml,readonly" \
		--mount "type=bind,src=$scratch/runtime/secrets.env,dst=/run/secrets/memos.env,readonly" \
		--mount "type=bind,src=$scratch/runtime/ca.pem,dst=/fixture/ca.pem,readonly" \
		--env NODE_EXTRA_CA_CERTS=/fixture/ca.pem "$image" dist/src/worker-server.js)
	containers+=("$worker_id")
	browser_probe post
	probe approve
	copy_export
	build_site
	publication assemble
	browser_probe read
	probe delete
	copy_export
	# Fresh export paired with old HTML must fail even with a newer deletion epoch.
	publication stale-dom
	build_site
	publication assemble
	probe restore
	copy_export
	build_site
	publication stale
	for dependency in "${containers[@]}"; do
		[[ "$(docker inspect --format '{{json .HostConfig.PortBindings}}' "$dependency")" =~ ^(null|\{\})$ ]] || die 'fixture published a private host port'
		[[ "$(docker inspect --format '{{.HostConfig.ReadonlyRootfs}}' "$dependency")" == true ]] || die 'fixture root filesystem was writable'
		docker logs "$dependency" >>"$scratch/runtime/logs.txt" 2>&1
	done
	docker exec "$worker_id" node dist/src/worker-health.js
	# HTTP remains healthy while the worker's own missing tick must fail health.
	docker exec "$worker_id" node -e "require('node:fs').unlinkSync('/tmp/memos-worker-health.json')"
	if docker exec "$worker_id" node dist/src/worker-health.js; then die 'HTTP sibling masked missing worker tick'; fi
	docker exec "$http_id" node -e "fetch('http://127.0.0.1:8788/readyz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
	probe privacy
	docker stop --time 200 "$worker_id" >/dev/null
	[[ "$(docker inspect --format '{{.State.ExitCode}}' "$worker_id")" == 0 ]] || die 'worker graceful shutdown failed'
	local evidence
	mkdir -p -- "$REPOSITORY_ROOT/services/memos/dist/test-results"
	evidence=$(mktemp -d "$REPOSITORY_ROOT/services/memos/dist/test-results/runtime-evidence.XXXXXXXX")
	cp -- "$scratch/browser/native-0.png" "$scratch/browser/native-1.png" \
		"$scratch/browser/approved-0.png" "$scratch/browser/approved-1.png" \
		"$scratch/browser/browser-read.json" "$scratch/browser/browser-post.json" "$evidence/"
	printf 'Sanitized desktop/mobile evidence: %s\n' "$evidence"
	printf 'Memo runtime proxy, persistent rates/outbox, TLS worker, desktop/mobile native POST, publication/removal/restore and privacy checks passed.\n'
}

main "$@"
