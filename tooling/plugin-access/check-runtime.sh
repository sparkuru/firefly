#!/usr/bin/env bash
set -Eeuo pipefail
REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd -P)"
readonly REPO_ROOT
fixture_root=""
nginx_container=""
upstream_container=""

cleanup() {
	local exit_status=$? container
	if [[ "${exit_status}" != 0 ]]; then
		for container in "${nginx_container}" "${upstream_container}"; do
			if [[ -n "${container}" ]] && ! docker logs --tail 40 "${container}" >&2; then
				printf '[plugins-runtime] unable to read failed fixture container logs\n' >&2
			fi
		done
	fi
	[[ -z "${nginx_container}" ]] || docker rm -f "${nginx_container}" >/dev/null
	[[ -z "${upstream_container}" ]] || docker rm -f "${upstream_container}" >/dev/null
	[[ -z "${fixture_root}" || "${fixture_root}" != /tmp/firefly-plugin-access.* ]] || rm -rf -- "${fixture_root}"
	return "${exit_status}"
}

probe() {
	local expected=$1 method=$2 route=$3 actual headers
	headers=$(mktemp "${fixture_root}/headers.XXXXXXXX")
	if [[ "${method}" == HEAD ]]; then
		actual=$(curl --silent --show-error --head --dump-header "${headers}" --output /dev/null --write-out '%{http_code}' "${origin}${route}")
	else
		actual=$(curl --silent --show-error --request "${method}" --dump-header "${headers}" --output /dev/null --write-out '%{http_code}' "${origin}${route}")
	fi
	[[ "${actual}" == "${expected}" ]] || {
		printf '[plugins-runtime] %s %s returned %s; expected %s\n' "${method}" "${route}" "${actual}" "${expected}" >&2
		return 1
	}
	if [[ "${route}" == /memos* || "${route}" == /v1/comments* ]]; then
		rg --ignore-case --quiet '^cache-control: .*no-store' "${headers}"
	fi
	rm -- "${headers}"
}

switch_release() {
	ln -s -- "$1" "${fixture_root}/blog/next"
	mv -Tf -- "${fixture_root}/blog/next" "${fixture_root}/blog/current"
}

check_state() {
	local comments=$1 memos=$2 method route
	local -a memo_routes=(/memos /memos/ /memos/index.html /memos/memos.public.v2.json /memos/assets/style.css)
	local -a comment_routes=(/v1/comments /v1/comments/ /v1/comments/submissions /v1/comments/verify/fixture /v1/comments/control/fixture /v1/comments/control/fixture/delete /v1/comments/admin/comments /v1/comments/admin/export)
	probe 200 GET /
	if [[ "${comments}" == 0 ]]; then
		for route in "${comment_routes[@]}"; do
			for method in GET HEAD POST OPTIONS PUT DELETE; do probe 404 "${method}" "${route}"; done
		done
	else
		probe 200 POST /v1/comments/submissions
		probe 200 GET /v1/comments/verify/fixture
		probe 200 GET /v1/comments/control/fixture
		probe 200 POST /v1/comments/control/fixture/delete
		probe 200 GET /v1/comments/admin/comments
		probe 200 GET /v1/comments/admin/export
		probe 204 OPTIONS /v1/comments/submissions
		probe 404 GET /v1/comments
	fi
	if [[ "${memos}" == 0 ]]; then
		for route in "${memo_routes[@]}" "${media_route}"; do
			for method in GET HEAD POST OPTIONS PUT DELETE; do probe 404 "${method}" "${route}"; done
		done
	else
		probe 301 GET /memos
		probe 301 HEAD /memos
		probe 403 POST /memos
		probe 403 OPTIONS /memos
		probe 200 GET /memos/
		probe 200 HEAD /memos/
		for route in /memos/index.html /memos/memos.public.v2.json /memos/assets/style.css "${media_route}"; do probe 200 GET "${route}"; done
		probe 403 POST /memos/
		probe 403 OPTIONS /memos/
		local file expected actual
		while IFS= read -r file; do
			expected=$(sha256sum -- "${candidate}/public/${file}")
			actual=$(curl --fail --silent --show-error "${origin}/memos/${file}" | sha256sum)
			[[ "${expected%% *}" == "${actual%% *}" ]] || return 1
		done < <(jq -r '.inventory[].path | sub("^public/"; "")' "${candidate}/receipt.json")
	fi
	probe 404 GET /memos/receipt.json
	probe 404 GET /memos/.private/state.json
	probe 404 GET /v1/unknown
	printf '[plugins-runtime] comments=%s memos=%s passed routes, methods and retained artifacts\n' "${comments}" "${memos}"
}

main() {
	[[ $# == 0 ]] || {
		printf 'Usage: check-runtime.sh\n' >&2
		return 2
	}
	local dependency candidate port attempt media_file state
	for dependency in docker jq mktemp cp mkdir rm chmod curl rg sed ln mv cat id sleep sha256sum; do
		command -v "${dependency}" >/dev/null || {
			printf 'Missing command: %s\n' "${dependency}" >&2
			return 127
		}
	done
	fixture_root=$(mktemp -d /tmp/firefly-plugin-access.XXXXXXXX)
	trap cleanup EXIT
	trap 'exit 130' INT
	trap 'exit 143' TERM
	chmod 755 "${fixture_root}"
	cp -- "${REPO_ROOT}/tooling/plugin-access/fixture-upstream.mjs" "${fixture_root}/upstream.mjs"
	sed -e 's#/usr/share/nginx/html#/fixture/blog/current#g' -e 's#/usr/share/nginx/memos/#/fixture/memos/#g' "${REPO_ROOT}/nginx.conf" >"${fixture_root}/nginx.conf"
	chmod 644 -- "${fixture_root}/nginx.conf" "${fixture_root}/upstream.mjs"
	SAM_CONTENT_MODE=none SAM_MEMOS_WORK_ROOT="${fixture_root}" "${REPO_ROOT}/sam" node tooling/plugin-access/runtime-fixture.mjs "${fixture_root}"
	candidate=$(cat "${fixture_root}/candidate-path.txt")
	media_file=$(jq -r '.inventory[].path | select(startswith("public/assets/") and endswith(".png")) | sub("^public/"; "")' "${candidate}/receipt.json")
	media_route="/memos/${media_file}"
	upstream_container=$(docker run --detach --read-only --cap-drop ALL --security-opt no-new-privileges:true \
		--user "$(id -u):$(id -g)" --label "sam.repo=${REPO_ROOT}" --label sam.scope=plugin-access-fixture --publish 127.0.0.1::8080 \
		--mount "type=bind,src=${fixture_root}/upstream.mjs,dst=/fixture-upstream.mjs,readonly" node:22-alpine node /fixture-upstream.mjs)
	for attempt in {1..30}; do
		[[ "$(docker inspect --format '{{.State.Running}}' "${upstream_container}")" == true ]] || return 1
		if docker exec "${upstream_container}" node -e 'fetch("http://127.0.0.1:8787/v1/comments/admin/export").then(r => process.exit(r.status === 200 ? 0 : 1)).catch(() => process.exit(1))'; then break; fi
		[[ "${attempt}" != 30 ]] || return 1
		sleep 0.2
	done
	nginx_container=$(docker run --detach --read-only --tmpfs /tmp:mode=1777 --cap-drop ALL --security-opt no-new-privileges:true \
		--user nginx --network "container:${upstream_container}" --label "sam.repo=${REPO_ROOT}" --label sam.scope=plugin-access-fixture \
		--mount "type=bind,src=${fixture_root}/nginx.conf,dst=/etc/nginx/nginx.conf,readonly" \
		--mount "type=bind,src=${fixture_root}/blog,dst=/fixture/blog,readonly" \
		--mount "type=bind,src=${candidate}/public,dst=/fixture/memos,readonly" --entrypoint nginx nginx:1.28-alpine -g 'daemon off;')
	docker exec "${nginx_container}" nginx -t
	port=$(docker port "${upstream_container}" 8080/tcp)
	origin="http://127.0.0.1:${port##*:}"
	for attempt in {1..30}; do
		if curl --fail --silent "${origin}/healthz" >/dev/null; then break; fi
		[[ "${attempt}" != 30 ]] || return 1
		sleep 0.2
	done
	for state in c0m0 c1m0 c0m1 c1m1 c0m0 c1m1; do
		switch_release "${state}"
		check_state "${state:1:1}" "${state:3:1}"
	done
	switch_release legacy
	check_state 0 0
	SAM_CONTENT_MODE=none SAM_MEMOS_WORK_ROOT="${fixture_root}" "${REPO_ROOT}/sam" node tooling/plugin-access/runtime-fixture.mjs "${fixture_root}" --verify
	printf '[plugins-runtime] four states, on/off/on without reload and missing legacy markers passed\n'
}

main "$@"
