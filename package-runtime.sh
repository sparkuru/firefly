#!/usr/bin/env bash
# Build and probe the runtime-only image from a validated assembled publication.
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE_NAME="${F1REFLY_RUNTIME_IMAGE:-f1refly:m5-runtime}"
PROJECT_LABEL="sam.repo=${REPO_ROOT}"
SCOPE_LABEL="sam.scope=package-runtime-m5"
CONTEXT_ROOT=""
CONTAINER_ID=""

readonly REPO_ROOT IMAGE_NAME PROJECT_LABEL SCOPE_LABEL

require_command() {
	command -v "$1" >/dev/null 2>&1 || {
		printf '[package-runtime] required command not found: %s\n' "$1" >&2
		exit 127
	}
}

cleanup() {
	if [[ -n "${CONTAINER_ID}" ]]; then
		docker rm -f "${CONTAINER_ID}" >/dev/null 2>&1 || true
	fi
	if [[ -n "${CONTEXT_ROOT}" && "${CONTEXT_ROOT}" == /tmp/f1refly-runtime-context.* ]]; then
		rm -rf -- "${CONTEXT_ROOT}"
	fi
}

probe_status() {
	local expected=$1
	local path=$2
	local status

	status=$(curl --silent --output /dev/null --write-out '%{http_code}' "${RUNTIME_ORIGIN}${path}")
	[[ "${status}" == "${expected}" ]] || {
		printf '[package-runtime] %s returned %s, expected %s\n' "${path}" "${status}" "${expected}" >&2
		return 1
	}
}

main() {
	local port_binding
	local root_headers
	local runtime_user
	local reader_asset
	local attempt
	local index
	local -a manifest_inventory=()
	local -a release_inventory=()
	local -a runtime_inventory=()
	local -A manifest_files=()
	local -A release_files=()
	local -A runtime_files=()

	for dependency in curl docker find jq mktemp rg sed sort; do
		require_command "${dependency}"
	done
	[[ -x "${REPO_ROOT}/sam" ]] || {
		printf '[package-runtime] executable not found: %s/sam\n' "${REPO_ROOT}" >&2
		return 1
	}

	cd "${REPO_ROOT}"
	trap cleanup EXIT INT TERM
	./sam npm run build:m5
	[[ "$(jq -r '.schemaVersion' artifacts/publication.json)" == 1 ]]
	mapfile -t manifest_inventory < <(jq -r '.inventory[]' artifacts/publication.json)
	mapfile -t release_inventory < <(find dist -type f -printf '%P\n' | sort)
	[[ "${#manifest_inventory[@]}" -eq 23 && "${#release_inventory[@]}" -eq 23 ]] || {
		printf '[package-runtime] publication inventory must contain exactly 23 files\n' >&2
		return 1
	}
	for index in "${!manifest_inventory[@]}"; do
		manifest_files["${manifest_inventory[index]}"]=1
		release_files["${release_inventory[index]}"]=1
	done
	for index in "${!manifest_inventory[@]}"; do
		[[ -n "${release_files[${manifest_inventory[index]}]:-}" && -n "${manifest_files[${release_inventory[index]}]:-}" ]] || {
			printf '[package-runtime] publication manifest does not match the assembled release\n' >&2
			return 1
		}
	done
	if rg --quiet 'PRIVATE_(TITLE|BODY)_M5_7f2a|private-owner|owner-fixture|hidden-draft|F1REFLY_CONTENT_ROOT|/home/|/tmp/f1refly-' dist; then
		printf '[package-runtime] publication contains a private or source-path sentinel\n' >&2
		return 1
	fi

	CONTEXT_ROOT=$(mktemp -d /tmp/f1refly-runtime-context.XXXXXX)
	mkdir -p "${CONTEXT_ROOT}/dist"
	cp Dockerfile nginx.conf "${CONTEXT_ROOT}/"
	cp -R dist/. "${CONTEXT_ROOT}/dist/"
	docker build --target runtime-publication --tag "${IMAGE_NAME}" "${CONTEXT_ROOT}"

	runtime_user=$(docker image inspect --format '{{.Config.User}}' "${IMAGE_NAME}")
	[[ "${runtime_user}" == nginx ]]
	CONTAINER_ID=$(docker run --detach --rm --init \
		--read-only \
		--tmpfs /tmp:size=16m,mode=1777 \
		--cap-drop ALL \
		--security-opt no-new-privileges:true \
		--publish 127.0.0.1::8080 \
		--label "${PROJECT_LABEL}" \
		--label "${SCOPE_LABEL}" \
		--label sam.service=web \
		"${IMAGE_NAME}")
	port_binding=$(docker port "${CONTAINER_ID}" 8080/tcp)
	RUNTIME_ORIGIN="http://127.0.0.1:${port_binding##*:}"
	export RUNTIME_ORIGIN

	for attempt in {1..30}; do
		if curl --fail --silent --show-error "${RUNTIME_ORIGIN}/healthz" >/dev/null; then
			break
		fi
		[[ "${attempt}" -lt 30 ]] || {
			printf '[package-runtime] runtime health probe timed out\n' >&2
			return 1
		}
		sleep 0.2
	done

	[[ "$(docker inspect --format '{{.HostConfig.ReadonlyRootfs}}' "${CONTAINER_ID}")" == true ]]
	[[ "$(docker inspect --format '{{index .Config.Labels "sam.repo"}}' "${CONTAINER_ID}")" == "${REPO_ROOT}" ]]
	[[ "$(docker inspect --format '{{index .Config.Labels "sam.scope"}}' "${CONTAINER_ID}")" == package-runtime-m5 ]]
	mapfile -t runtime_inventory < <(docker exec "${CONTAINER_ID}" find /usr/share/nginx/html -type f | sed 's#^/usr/share/nginx/html/##' | sort)
	[[ "${#runtime_inventory[@]}" -eq 23 ]] || {
		printf '[package-runtime] runtime image must contain exactly 23 publication files\n' >&2
		return 1
	}
	for index in "${!runtime_inventory[@]}"; do
		runtime_files["${runtime_inventory[index]}"]=1
	done
	for index in "${!manifest_inventory[@]}"; do
		[[ -n "${runtime_files[${manifest_inventory[index]}]:-}" && -n "${manifest_files[${runtime_inventory[index]}]:-}" ]] || {
			printf '[package-runtime] runtime image inventory differs from publication manifest\n' >&2
			return 1
		}
	done
	probe_status 200 /
	probe_status 200 /posts/
	probe_status 301 /posts/characters
	probe_status 200 /posts/characters/
	probe_status 200 /posts/characters/nahida/
	probe_status 200 /lab/
	probe_status 301 /lab/nerv
	probe_status 200 /lab/nerv/
	probe_status 404 /missing/
	probe_status 404 /lab/nerv/missing/
	probe_status 200 /fonts/JetBrainsMono-Regular-v2.304.woff2
	probe_status 200 /fonts/JetBrainsMono-Medium-v2.304.woff2
	probe_status 200 /licenses/JetBrainsMono-OFL-1.1.txt
	probe_status 200 /licenses/JetBrainsMono-PROVENANCE.txt
	curl --silent "${RUNTIME_ORIGIN}/missing/" | rg --quiet 'Page not found'
	curl --silent "${RUNTIME_ORIGIN}/lab/nerv/missing/" | rg --quiet 'MAGI records'
	root_headers=$(curl --fail --silent --head "${RUNTIME_ORIGIN}/")
	rg --ignore-case --quiet '^content-security-policy: ' <<<"${root_headers}"
	rg --ignore-case --quiet '^referrer-policy: strict-origin-when-cross-origin' <<<"${root_headers}"
	rg --ignore-case --quiet '^x-content-type-options: nosniff' <<<"${root_headers}"
	rg --ignore-case --quiet '^x-frame-options: sameorigin' <<<"${root_headers}"
	if rg --ignore-case --quiet '^server: nginx/' <<<"${root_headers}" || rg --ignore-case --quiet 'cache-control: .*immutable' <<<"${root_headers}"; then
		printf '[package-runtime] HTML headers expose a server version or immutable cache policy\n' >&2
		return 1
	fi
	reader_asset=$(find dist/_astro -maxdepth 1 -type f -name 'TerminalDocument*.js' -printf '%f\n')
	curl --fail --silent --head "${RUNTIME_ORIGIN}/_astro/${reader_asset}" | rg --ignore-case --quiet 'cache-control: public, max-age=31536000, immutable'
	curl --fail --silent --head "${RUNTIME_ORIGIN}/fonts/JetBrainsMono-Regular-v2.304.woff2" | rg --ignore-case --quiet 'cache-control: public, max-age=31536000, immutable'
	curl --fail --silent --head "${RUNTIME_ORIGIN}/fonts/JetBrainsMono-Medium-v2.304.woff2" | rg --ignore-case --quiet 'cache-control: public, max-age=31536000, immutable'

	printf '[package-runtime] image %s passed exact 23-file publication, route, header, 404, non-root, and read-only probes\n' "${IMAGE_NAME}"
}

main "$@"
