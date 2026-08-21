#!/usr/bin/env bash
# Build and probe the runtime-only image from a validated assembled publication.
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE_NAME="${FIREFLY_RUNTIME_IMAGE:-firefly:runtime}"
PROJECT_LABEL="sam.repo=${REPO_ROOT}"
SCOPE_LABEL="sam.scope=package-runtime"
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
	if [[ -n "${CONTEXT_ROOT}" && "${CONTEXT_ROOT}" == /tmp/firefly-runtime-context.* ]]; then
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

assert_header() {
	local request_path=$1
	local pattern=$2
	local headers

	headers=$(curl --fail --silent --head "${RUNTIME_ORIGIN}${request_path}")
	rg --ignore-case --quiet -- "${pattern}" <<<"${headers}" || {
		printf '[package-runtime] %s is missing header matching %s\n' "${request_path}" "${pattern}" >&2
		return 1
	}
}

assert_no_header() {
	local request_path=$1
	local pattern=$2
	local headers

	headers=$(curl --fail --silent --head "${RUNTIME_ORIGIN}${request_path}")
	if rg --ignore-case --quiet -- "${pattern}" <<<"${headers}"; then
		printf '[package-runtime] %s has unexpected header matching %s\n' "${request_path}" "${pattern}" >&2
		return 1
	fi
}

assert_sha256() {
	local file=$1
	local expected=$2
	local actual

	actual=$(sha256sum -- "${file}")
	actual=${actual%% *}
	[[ "${actual}" == "${expected}" ]] || {
		printf '[package-runtime] unexpected SHA-256 for %s\n' "${file}" >&2
		return 1
	}
}

assert_no_non_authored_private_data() {
	if (
		cd "${REPO_ROOT}/dist"
		rg --quiet \
			--glob '!posts/**/index.html' \
			--glob '!pages/**/index.html' \
			--glob '!index.html' \
			'PRIVATE_(TITLE|BODY)_FIREFLY_7f2a|private-owner|owner-fixture|hidden-draft|FIREFLY_CONTENT_ROOT|/home/|/tmp/firefly-|/(srv/uploads|srv/backups|var/www|usr/(local/)?uploads)/' \
			.
	); then
		printf '[package-runtime] publication contains private data or source metadata outside authored document bodies\n' >&2
		return 1
	fi
}

main() {
	local port_binding
	local root_headers
	local runtime_user
	local reader_asset
	local asset
	local expected_type
	local attempt
	local -a manifest_inventory=()
	local -a release_inventory=()
	local -a runtime_inventory=()
	local -a reader_assets=()
	local -a site_assets=()
	local -a nerv_assets=()
	local -A manifest_files=()
	local -A release_files=()
	local -A runtime_files=()

	for dependency in curl docker find jq mktemp rg sed sha256sum sort; do
		require_command "${dependency}"
	done
	[[ -x "${REPO_ROOT}/sam" ]] || {
		printf '[package-runtime] executable not found: %s/sam\n' "${REPO_ROOT}" >&2
		return 1
	}

	cd "${REPO_ROOT}"
	trap cleanup EXIT INT TERM
	if [[ -n "${FIREFLY_COMMENTS_EXPORT:-}" ]]; then
		./sam npm run build:m51
	else
		./sam npm run build:m4
	fi
	[[ "$(jq -r '.schemaVersion' artifacts/publication.json)" == 1 ]]
	jq -e '.comments.schemaVersion == 1 and (.comments.tombstoneEpoch | type == "number")' artifacts/publication.json >/dev/null
	mapfile -t manifest_inventory < <(jq -r '.inventory[]' artifacts/publication.json)
	mapfile -t release_inventory < <(find dist -type f -printf '%P\n' | sort)
	[[ "${#manifest_inventory[@]}" -gt 0 && "${#manifest_inventory[@]}" -eq "${#release_inventory[@]}" ]] || {
		printf '[package-runtime] publication manifest and assembled release must have equal non-empty inventories\n' >&2
		return 1
	}
	for file in "${manifest_inventory[@]}"; do
		manifest_files["${file}"]=1
	done
	for file in "${release_inventory[@]}"; do
		release_files["${file}"]=1
	done
	for file in "${manifest_inventory[@]}"; do
		[[ -n "${release_files[${file}]:-}" ]] || {
			printf '[package-runtime] publication manifest does not match the assembled release\n' >&2
			return 1
		}
	done
	for file in "${release_inventory[@]}"; do
		[[ -n "${manifest_files[${file}]:-}" ]] || {
			printf '[package-runtime] publication manifest does not match the assembled release\n' >&2
			return 1
		}
	done
	assert_no_non_authored_private_data
	assert_sha256 "${REPO_ROOT}/dist/fonts/JetBrainsMono-Regular-v2.304.woff2" "a9cb1cd82332b23a47e3a1239d25d13c86d16c4220695e34b243effa999f45f2"
	assert_sha256 "${REPO_ROOT}/dist/fonts/JetBrainsMono-Medium-v2.304.woff2" "086c48dfbea9ddaff1320f7e09399b8e2924e88ce67453721255db3bdbb5a353"

	CONTEXT_ROOT=$(mktemp -d /tmp/firefly-runtime-context.XXXXXX)
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
	[[ "$(docker inspect --format '{{index .Config.Labels "sam.scope"}}' "${CONTAINER_ID}")" == package-runtime ]]
	mapfile -t runtime_inventory < <(docker exec "${CONTAINER_ID}" find /usr/share/nginx/html -type f | sed 's#^/usr/share/nginx/html/##' | sort)
	[[ "${#runtime_inventory[@]}" -eq "${#manifest_inventory[@]}" ]] || {
		printf '[package-runtime] runtime image inventory must match the publication manifest size\n' >&2
		return 1
	}
	for file in "${runtime_inventory[@]}"; do
		runtime_files["${file}"]=1
	done
	for file in "${manifest_inventory[@]}"; do
		[[ -n "${runtime_files[${file}]:-}" ]] || {
			printf '[package-runtime] runtime image inventory differs from publication manifest\n' >&2
			return 1
		}
	done
	for file in "${runtime_inventory[@]}"; do
		[[ -n "${manifest_files[${file}]:-}" ]] || {
			printf '[package-runtime] runtime image inventory differs from publication manifest\n' >&2
			return 1
		}
	done
	probe_status 200 /
	probe_status 200 /posts/
	probe_status 200 /posts/ai/llm-workflow-with-trellis/
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
	mapfile -t reader_assets < <(find dist/_astro -maxdepth 1 -type f -name 'ReaderStatus*.js' -printf '%f\n' | sort)
	[[ "${#reader_assets[@]}" -eq 1 ]] || {
		printf '[package-runtime] expected exactly one ReaderStatus asset\n' >&2
		return 1
	}
	reader_asset=${reader_assets[0]}
	mapfile -t site_assets < <(find dist/_astro -maxdepth 1 -type f -printf '%f\n' | sort)
	mapfile -t nerv_assets < <(find dist/lab/nerv/_astro -type f -printf '%P\n' | sort)
	[[ "${#site_assets[@]}" -gt 0 && "${#nerv_assets[@]}" -gt 0 ]] || {
		printf '[package-runtime] site and NERV must each publish immutable runtime assets\n' >&2
		return 1
	}
	assert_header "/posts/ai/llm-workflow-with-trellis/" '^content-type: text/html'
	assert_no_header "/posts/ai/llm-workflow-with-trellis/" '^cache-control: .*immutable'
	assert_header "/_astro/${reader_asset}" '^content-type: application/javascript'
	for asset in "${site_assets[@]}"; do
		assert_header "/_astro/${asset}" '^cache-control: public, max-age=31536000, immutable'
	done
	for asset in "${nerv_assets[@]}"; do
		case "${asset}" in
		*.css) expected_type='^content-type: text/css' ;;
		*.js) expected_type='^content-type: application/javascript' ;;
		*) continue ;;
		esac
		assert_header "/lab/nerv/_astro/${asset}" "${expected_type}"
		assert_header "/lab/nerv/_astro/${asset}" '^cache-control: public, max-age=31536000, immutable'
	done
	assert_header '/fonts/JetBrainsMono-Regular-v2.304.woff2' '^content-type: font/woff2'
	assert_header '/fonts/JetBrainsMono-Medium-v2.304.woff2' '^content-type: font/woff2'
	assert_header '/fonts/JetBrainsMono-Regular-v2.304.woff2' '^cache-control: public, max-age=31536000, immutable'
	assert_header '/fonts/JetBrainsMono-Medium-v2.304.woff2' '^cache-control: public, max-age=31536000, immutable'

	printf '[package-runtime] image %s passed publication, route, header, 404, non-root, and read-only probes\n' "${IMAGE_NAME}"
}

main "$@"
