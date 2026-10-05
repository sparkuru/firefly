#!/usr/bin/env bash
# One entry for publication previews, rendering, verification, and packaging.
set -Eeuo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
readonly REPO_ROOT
readonly PROJECT_LABEL="sam.repo=${REPO_ROOT}"
readonly SCOPE_LABEL='sam.scope=preview.sh'
readonly PLAYWRIGHT_IMAGE='mcr.microsoft.com/playwright:v1.62.0-noble'
readonly VERIFY_IMAGE="${SAM_IMAGE-${PLAYWRIGHT_IMAGE}}"
readonly VERIFY_IPC="${SAM_IPC-host}"

startup_container=""
startup_name=""
startup_dir=""
container_json=""
listener_address=""
preview_mode=""
remote_daemon=false
addresses_discovered=false
ipv6_discovered=false
host_addresses=()
open_urls=()
local_urls=()
published_rows=()

usage() {
	printf '%s\n' \
		'Usage: ./preview.sh [start|dev|preview|build|stop|status|verify|package]' \
		'       ./preview.sh render <command> [arguments...]' \
		'' \
		'  start    Serve existing dist/ in the background (default; no build).' \
		'  dev      Start the main-site Astro development server in the background.' \
		'  preview  Build the publication, then start its background preview.' \
		'  build    Build the publication only; never start a service.' \
		"  stop     Stop only this repository's preview web containers (alias: down)." \
		'  status   Probe the current preview; never start a service.' \
		'  render   Run a command through sam with pinned Playwright and host IPC.' \
		'  verify   Run the tracked-fixture gate, then the host Memo lifecycle.' \
		'  package  Build and validate the runtime-only publication image.' \
		'' \
		'Set up preview configuration: cp .env.example .env' \
		'Install missing dependencies explicitly: ./sam npm run install:m51' >&2
}

die() {
	printf '[preview] %s\n' "$*" >&2
	exit 1
}

require_command() {
	command -v "$1" >/dev/null 2>&1 || {
		printf '[preview] required command not found: %s\n' "$1" >&2
		exit 127
	}
}

load_environment() {
	[[ -r "${REPO_ROOT}/tooling/shared/dev-env.sh" ]] || die 'missing tooling/shared/dev-env.sh'
	# shellcheck source=/dev/null
	source "${REPO_ROOT}/tooling/shared/dev-env.sh"
	load_dev_environment "${REPO_ROOT}"
}

require_sam() {
	[[ -x "${REPO_ROOT}/sam" ]] || {
		printf '[preview] executable not found: %s/sam\n' "${REPO_ROOT}" >&2
		exit 127
	}
}

render_command() {
	require_sam
	SAM_IMAGE="${PLAYWRIGHT_IMAGE}" SAM_IPC=host "${REPO_ROOT}/sam" "$@"
}

build_publication() {
	local target=build:m4
	[[ -z "${FIREFLY_COMMENTS_EXPORT:-}" && -z "${FIREFLY_MEMOS_EXPORT:-}" ]] || target=build:m51
	render_command npm run "${target}"
}

verify_repository() {
	local collection
	for collection in posts pages; do
		[[ -d "${REPO_ROOT}/content/${collection}" && -r "${REPO_ROOT}/content/${collection}" ]] ||
			die "tracked fixture is missing a readable ${collection}/ directory"
	done
	require_sam
	FIREFLY_CONTENT_ROOT="${REPO_ROOT}/content" SAM_IMAGE="${VERIFY_IMAGE}" SAM_IPC="${VERIFY_IPC}" "${REPO_ROOT}/sam" npm run verify:m51
	"${REPO_ROOT}/services/memos/ops/check-runtime.sh"
}

preview_configuration() {
	[[ -f "${REPO_ROOT}/.env" ]] || die 'preview configuration is missing; run: cp .env.example .env; then edit .env and retry'
	require_command docker
	require_command jq
	require_sam
	local key
	for key in SAM_BIND_HOST WEB_BIND_HOST WEB_HOST_PORT WEB_CONTAINER_PORT SAM_IMAGE SAM_IPC; do
		[[ -n "${!key:-}" ]] || die "required preview setting ${key} is missing or empty; copy missing keys from .env.example into .env"
	done
	if [[ "${SAM_BIND_HOST}" == \[*\] ]]; then
		SAM_BIND_HOST=${SAM_BIND_HOST:1:${#SAM_BIND_HOST}-2}
	fi
	[[ "${WEB_BIND_HOST}" == 0.0.0.0 || "${WEB_BIND_HOST}" == :: ]] || die 'WEB_BIND_HOST must be 0.0.0.0 or :: so the container listener is published-accessible'
	local port
	for port in "${WEB_HOST_PORT}" "${WEB_CONTAINER_PORT}"; do
		if [[ ! "${port}" =~ ^[0-9]+$ || ${#port} -gt 5 ]] || ! ((10#${port} > 0 && 10#${port} <= 65535)); then
			die 'preview ports must be integers from 1 to 65535'
		fi
	done
	[[ "${SAM_IPC}" == private || "${SAM_IPC}" == host ]] || die 'SAM_IPC must be private or host'
}

owned_containers() {
	docker ps -aq --filter "label=${PROJECT_LABEL}" --filter "label=${SCOPE_LABEL}" --filter label=sam.service=web
}

stop_preview() {
	local ids id mode result remaining attempt owned_dev=false
	require_command docker
	ids=$(owned_containers)
	if [[ -z "${ids}" ]]; then
		printf '[preview] no preview containers found\n' >&2
		return 0
	fi
	local -a containers=()
	local -a container_filters=(--filter "label=${PROJECT_LABEL}" --filter "label=${SCOPE_LABEL}" --filter label=sam.service=web)
	mapfile -t containers <<<"${ids}"
	for id in "${containers[@]}"; do
		if ! mode=$(docker inspect --format '{{index .Config.Labels "sam.preview.mode"}}' "${id}" 2>&1); then
			remaining=$(docker ps -aq "${container_filters[@]}" --filter "id=${id}")
			if [[ -z "${remaining}" && ("${mode}" == *'No such object:'* || "${mode}" == *'No such container:'*) ]]; then continue; fi
			printf '[preview] failed to inspect selected container: %s\n' "${mode}" >&2
			return 1
		fi
		[[ "${mode}" != dev ]] || owned_dev=true
		if ! result=$(docker stop "${id}" 2>&1); then
			remaining=$(docker ps -aq "${container_filters[@]}" --filter "id=${id}")
			if [[ -n "${remaining}" || ("${result}" != *'No such object:'* && "${result}" != *'No such container:'*) ]]; then
				printf '[preview] failed to stop selected container: %s\n' "${result}" >&2
				return 1
			fi
		fi
		for attempt in {1..40}; do
			remaining=$(docker ps -aq "${container_filters[@]}" --filter "id=${id}")
			[[ -n "${remaining}" ]] || break
			[[ ${attempt} -lt 40 ]] || die 'stopped preview container removal timed out; inspect Docker state, then retry ./preview.sh stop'
			sleep 0.25
		done
	done
	[[ "${owned_dev}" != true ]] || rm -f -- "${REPO_ROOT}/apps/site/.astro/dev.json"
	printf '[preview] stopped %s preview container(s)\n' "${#containers[@]}" >&2
}

inspect_daemon() {
	local endpoint=${DOCKER_HOST:-}
	if [[ -z "${endpoint}" ]]; then
		endpoint=$(docker context inspect --format '{{.Endpoints.docker.Host}}') || die 'cannot inspect Docker context'
	fi
	case "${endpoint}" in
	unix://*) remote_daemon=false ;;
	*) remote_daemon=true ;;
	esac
}

valid_ipv4() {
	local address=$1 part
	local -a parts=()
	[[ "${address}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || return 1
	IFS=. read -r -a parts <<<"${address}"
	for part in "${parts[@]}"; do
		[[ ${#part} -le 3 ]] && ((10#${part} <= 255)) || return 1
	done
	[[ "${parts[0]}" != 127 && "${address}" != 0.0.0.0 ]]
}

discover_addresses() {
	local family=$1 output row address existing duplicate
	local -a fields=()
	host_addresses=()
	[[ "${remote_daemon}" == false ]] || die 'wildcard preview uses a remote Docker host; run preview.sh on that host so ip -br a can inspect its addresses, or use a specific SAM_BIND_HOST'
	require_command ip
	output=$(ip -br a) || die 'host discovery failed: ip -br a; fix host inspection or select a specific SAM_BIND_HOST'
	while IFS= read -r row; do
		read -r -a fields <<<"${row}"
		[[ ${#fields[@]} -ge 3 && ("${fields[1]}" == UP || "${fields[1]}" == UNKNOWN) ]] || continue
		for address in "${fields[@]:2}"; do
			address=${address%%/*}
			if [[ "${family}" == 4 ]]; then
				valid_ipv4 "${address}" || continue
			else
				[[ "${address}" == *:* && "${address}" != :: && "${address}" != ::1 && ! "${address,,}" =~ ^fe[89ab] ]] || continue
				[[ "${address}" =~ ^[0-9a-fA-F:]+$ ]] || continue
			fi
			duplicate=false
			for existing in "${host_addresses[@]}"; do
				[[ "${existing}" != "${address}" ]] || duplicate=true
			done
			[[ "${duplicate}" == true ]] || host_addresses+=("${address}")
		done
	done <<<"${output}"
}

preflight_addresses() {
	inspect_daemon
	case "${SAM_BIND_HOST}" in
	0.0.0.0) discover_addresses 4 ;;
	:: | '[::]') discover_addresses 6 ;;
	esac
}

startup_diagnostics() {
	local log=$1 line
	while IFS= read -r line; do
		case "${line}" in
		*'port is already allocated'* | *'address already in use'* | *EADDRINUSE*) printf '[preview] startup diagnostic: configured port is already occupied.\n' >&2 ;;
		*'No such image'* | *'Unable to find image'*) printf '[preview] startup diagnostic: selected Docker image is not present locally; pull it explicitly before starting.\n' >&2 ;;
		*'Cannot find module'* | *ERR_MODULE_NOT_FOUND* | *ENOENT*) printf '[preview] startup diagnostic: a dependency or publication file is missing; install locked dependencies or rebuild explicitly.\n' >&2 ;;
		*'permission denied'* | *'Cannot connect to the Docker daemon'*) printf '[preview] startup diagnostic: Docker daemon access is unavailable.\n' >&2 ;;
		esac
	done <"${log}"
}

cleanup_startup() {
	if [[ -z "${startup_container}" && -n "${startup_name}" ]]; then
		startup_container=$(docker ps -aq --filter "label=${PROJECT_LABEL}" --filter "label=${SCOPE_LABEL}" --filter label=sam.service=web --filter "name=^/${startup_name}$") || startup_container=""
		[[ "${startup_container}" =~ ^[0-9a-f]{12,64}$ ]] || startup_container=""
	fi
	if [[ -n "${startup_container}" ]]; then
		docker rm -f "${startup_container}" >/dev/null 2>&1 || true
		[[ "${preview_mode}" != dev ]] || rm -f -- "${REPO_ROOT}/apps/site/.astro/dev.json"
	fi
	if [[ -n "${startup_dir}" && "${startup_dir}" == /tmp/firefly-preview.* ]]; then
		rm -rf -- "${startup_dir}"
	fi
}

inspect_container() {
	container_json=$(docker inspect "$1") || die 'preview container cannot be inspected; run ./preview.sh stop, then retry'
}

probe_container() {
	local id=$1 port=$2
	listener_address=$(docker exec "${id}" node -e '
const fs = require("node:fs");
const port = Number(process.argv[1]);
const entries = ["/proc/net/tcp", "/proc/net/tcp6"].flatMap(file => fs.readFileSync(file,"utf8").trim().split("\n").slice(1));
const sockets = entries.map(line => line.trim().split(/\s+/));
const listener = sockets.find(fields => fields[3] === "0A" && parseInt(fields[1].split(":")[1],16) === port);
if (!listener) process.exit(1);
const address = listener[1].split(":")[0];
if (!["00000000", "00000000000000000000000000000000"].includes(address)) process.exit(1);
fetch(`http://127.0.0.1:${port}/`, {signal: AbortSignal.timeout(1500)}).then(response => {
  if (response.status !== 200) process.exit(1);
  console.log(address.length === 8 ? "0.0.0.0" : "::");
}).catch(() => process.exit(1));
' "${port}" 2>/dev/null)
}

add_url() {
	local group=$1 address=$2 port=$3 url existing
	[[ "${address}" != *:* ]] || address="[${address}]"
	url="http://${address}:${port}"
	if [[ "${group}" == local ]]; then
		for existing in "${local_urls[@]}"; do [[ "${existing}" != "${url}" ]] || return 0; done
		local_urls+=("${url}")
	else
		for existing in "${open_urls[@]}"; do [[ "${existing}" != "${url}" ]] || return 0; done
		open_urls+=("${url}")
	fi
}

prepare_summary() {
	local port=$1 binding host published address
	local -a bindings=()
	open_urls=() local_urls=() published_rows=()
	addresses_discovered=false ipv6_discovered=false
	mapfile -t bindings < <(jq -r --arg port "${port}/tcp" '.[0].NetworkSettings.Ports[$port][]? | [.HostIp,.HostPort] | @tsv' <<<"${container_json}")
	[[ ${#bindings[@]} -gt 0 ]] || die 'preview has no active published web mapping; run ./preview.sh stop and retry'
	for binding in "${bindings[@]}"; do
		IFS=$'\t' read -r host published <<<"${binding}"
		published_rows+=("Published web: ${host}:${published} -> ${listener_address}:${port} (active listener)")
		case "${host}" in
		0.0.0.0 | ::)
			addresses_discovered=true
			if [[ "${host}" == 0.0.0.0 ]]; then
				discover_addresses 4
				add_url local 127.0.0.1 "${published}"
			else
				ipv6_discovered=true
				discover_addresses 6
				add_url local ::1 "${published}"
			fi
			for address in "${host_addresses[@]}"; do add_url open "${address}" "${published}"; done
			;;
		127.* | ::1) add_url local "${host}" "${published}" ;;
		*) add_url open "${host}" "${published}" ;;
		esac
	done
}

print_entries() {
	local base label route entry
	local -a urls=("$@") entries=('Website|')
	if [[ "${preview_mode}" == publication ]]; then
		[[ ! -f "${REPO_ROOT}/dist/lab/index.html" ]] || entries+=('Lab|/lab/')
		[[ ! -f "${REPO_ROOT}/dist/lab/majo/index.html" ]] || entries+=('MAJO|/lab/majo/')
		[[ ! -f "${REPO_ROOT}/dist/lab/nerv/index.html" ]] || entries+=('NERV|/lab/nerv/')
	fi
	for entry in "${entries[@]}"; do
		IFS='|' read -r label route <<<"${entry}"
		printf '%s (web):\n' "${label}"
		for base in "${urls[@]}"; do printf '%s%s\n' "${base}" "${route}"; done
	done
}

print_summary() {
	local port=$1
	printf 'System is ready.\n'
	if [[ ${#open_urls[@]} -gt 0 ]]; then
		printf '\nOpen:\n'
		print_entries "${open_urls[@]}"
	fi
	if [[ ${#local_urls[@]} -gt 0 ]]; then
		printf '\nLocal only (preview host):\n'
		print_entries "${local_urls[@]}"
	fi
	printf '\nListeners:\nListening web: %s:%s (container; HTTP)\n' "${listener_address}" "${port}"
	printf '\nPublished:\n'
	printf '%s\n' "${published_rows[@]}"
	printf '\nNotes:\n'
	if [[ "${addresses_discovered}" == true ]]; then
		printf 'Host addresses enumerated with ip -br a; access from other devices is unverified.\n'
		[[ ${#open_urls[@]} -gt 0 ]] || printf 'No non-loopback host address found.\n'
		[[ "${ipv6_discovered}" != true ]] || printf 'Link-local IPv6 addresses are omitted.\n'
	else
		printf 'Access from other devices is unverified.\n'
	fi
}

preview_status() {
	local ids id port
	preview_configuration
	ids=$(owned_containers)
	[[ -n "${ids}" && "${ids}" != *$'\n'* ]] || die 'preview is stopped or has multiple owned containers; use ./preview.sh start or ./preview.sh stop'
	id=${ids}
	inspect_container "${id}"
	[[ "$(jq -r '.[0].State.Running' <<<"${container_json}")" == true ]] || die 'web preview is not running; run ./preview.sh stop, then start'
	preview_mode=$(jq -r '.[0].Config.Labels["sam.preview.mode"]' <<<"${container_json}")
	port=$(jq -r '.[0].NetworkSettings.Ports | keys[] | select(endswith("/tcp")) | split("/")[0]' <<<"${container_json}")
	[[ "${port}" =~ ^[0-9]+$ ]] || die 'web preview port mapping is ambiguous'
	probe_container "${id}" "${port}" || die 'web preview is unhealthy; inspect its logs with docker logs, then ./preview.sh stop and start'
	inspect_daemon
	prepare_summary "${port}"
	print_summary "${port}"
}

start_preview() {
	local mode=$1 ids id attempt config_hash image=${SAM_IMAGE:-node:22-alpine} ipc=${SAM_IPC-private}
	local -a service_command=()
	preview_configuration
	preflight_addresses
	if [[ "${mode}" == dev ]]; then
		image=${PLAYWRIGHT_IMAGE} ipc=host
		[[ -x "${REPO_ROOT}/apps/site/node_modules/.bin/astro" ]] || die 'dependencies are missing; run: ./sam npm run install:m51'
		service_command=(npm --prefix apps/site run dev -- --host "${WEB_BIND_HOST}" --port "${WEB_CONTAINER_PORT}")
	else
		local file
		for file in dist/index.html dist/lab/index.html dist/lab/majo/index.html dist/lab/nerv/index.html tooling/assemble-publication/dist/src/serve-release.js; do
			[[ -f "${REPO_ROOT}/${file}" ]] || die "assembled publication is missing ${file}; run ./preview.sh build or ./preview.sh preview"
		done
		service_command=(env "PUBLICATION_PORT=${WEB_CONTAINER_PORT}" "PUBLICATION_HOST=${WEB_BIND_HOST}" npm --prefix tooling/assemble-publication run start:e2e)
	fi
	require_command sha256sum
	config_hash=$(printf '%s\0' "${mode}" "${image}" "${ipc}" "${SAM_BIND_HOST}" "${WEB_BIND_HOST}" "${WEB_HOST_PORT}" "${WEB_CONTAINER_PORT}" "${FIREFLY_CONTENT_ROOT:-${REPO_ROOT}/content}" "${FIREFLY_SITE_CONFIG_PATH:-}" | sha256sum)
	config_hash=${config_hash%% *}
	ids=$(owned_containers)
	preview_mode=${mode}
	if [[ -n "${ids}" ]]; then
		[[ "${ids}" != *$'\n'* ]] || die 'multiple owned preview containers exist; run ./preview.sh stop before starting'
		id=${ids}
		inspect_container "${id}"
		jq -e --arg config "${config_hash}" --arg mode "${mode}" --arg image "${image}" --arg ipc "${ipc}" --arg bind "${SAM_BIND_HOST}" --arg host "${WEB_HOST_PORT}" --arg port "${WEB_CONTAINER_PORT}/tcp" \
			'.[0] | .State.Running and .Config.Labels["sam.preview.config"] == $config and .Config.Labels["sam.preview.mode"] == $mode and .Config.Image == $image and .HostConfig.IpcMode == $ipc and (.HostConfig.PortBindings[$port] | length == 1) and .HostConfig.PortBindings[$port][0].HostIp == $bind and .HostConfig.PortBindings[$port][0].HostPort == $host' <<<"${container_json}" >/dev/null || die 'preview mode or configuration differs; run ./preview.sh stop before starting the requested preview'
		probe_container "${id}" "${WEB_CONTAINER_PORT}" || die 'existing web preview is unhealthy; inspect Docker logs and run ./preview.sh stop before restarting'
		prepare_summary "${WEB_CONTAINER_PORT}"
		print_summary "${WEB_CONTAINER_PORT}"
		return 0
	fi
	require_command mktemp
	startup_dir=$(mktemp -d /tmp/firefly-preview.XXXXXX)
	startup_name="firefly-preview-${startup_dir##*.}"
	trap cleanup_startup EXIT
	trap 'exit 130' INT
	trap 'exit 143' TERM
	[[ "${mode}" != dev ]] || rm -f -- "${REPO_ROOT}/apps/site/.astro/dev.json"
	if ! SAM_DETACH=1 SAM_CONTAINER_NAME="${startup_name}" SAM_SCOPE=preview.sh SAM_SERVICE=web SAM_PREVIEW_MODE="${mode}" SAM_PREVIEW_CONFIG="${config_hash}" \
		SAM_IMAGE="${image}" SAM_IPC="${ipc}" SAM_BIND_HOST="${SAM_BIND_HOST}" \
		WEB_HOST_PORT="${WEB_HOST_PORT}" WEB_CONTAINER_PORT="${WEB_CONTAINER_PORT}" \
		"${REPO_ROOT}/sam" "${service_command[@]}" >"${startup_dir}/container" 2>"${startup_dir}/startup.log"; then
		startup_diagnostics "${startup_dir}/startup.log"
		die 'web startup failed; check Docker availability, the local image (docker image inspect), and configured port; no preview was started'
	fi
	read -r startup_container <"${startup_dir}/container"
	if [[ ! "${startup_container}" =~ ^[0-9a-f]{12,64}$ ]]; then
		startup_container=""
		die 'sam did not return a detached container ID'
	fi
	id=${startup_container}
	for attempt in {1..30}; do
		if probe_container "${id}" "${WEB_CONTAINER_PORT}"; then break; fi
		[[ ${attempt} -lt 30 ]] || {
			docker logs --tail 40 "${id}" >"${startup_dir}/service.log" 2>&1 || true
			startup_diagnostics "${startup_dir}/service.log"
			die 'web readiness timed out; check publication/dependencies and configured container port, then retry; failed startup container was removed'
		}
		sleep 0.25
	done
	inspect_container "${id}"
	prepare_summary "${WEB_CONTAINER_PORT}"
	print_summary "${WEB_CONTAINER_PORT}"
	startup_container="" startup_name=""
	cleanup_startup
	trap - EXIT INT TERM
}

CONTEXT_ROOT=""
CONTAINER_ID=""

cleanup_package() {
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

package_runtime() {
	local IMAGE_NAME="${FIREFLY_RUNTIME_IMAGE:-firefly:runtime}"
	CONTEXT_ROOT=""
	CONTAINER_ID=""
	local port_binding
	local root_headers
	local runtime_user
	local navigation_asset
	local asset
	local expected_type
	local attempt
	local -a manifest_inventory=()
	local -a release_inventory=()
	local -a runtime_inventory=()
	local -a navigation_assets=()
	local -a site_assets=()
	local -a nerv_assets=()
	local -A manifest_files=()
	local -A release_files=()
	local -A runtime_files=()

	for dependency in curl cut docker find jq mktemp rg sed sha256sum sort; do
		require_command "${dependency}"
	done
	[[ -x "${REPO_ROOT}/sam" ]] || {
		printf '[package-runtime] executable not found: %s/sam\n' "${REPO_ROOT}" >&2
		return 1
	}

	cd "${REPO_ROOT}"
	trap cleanup_package EXIT
	trap 'exit 130' INT
	trap 'exit 143' TERM
	if [[ -n "${FIREFLY_COMMENTS_EXPORT:-}" || -n "${FIREFLY_MEMOS_EXPORT:-}" ]]; then
		render_command npm run build:m51
	else
		render_command npm run build:m4
	fi
	[[ "$(jq -r '.schemaVersion' artifacts/publication.json)" == 1 ]]
	jq -e '.comments.schemaVersion == 1 and (.comments.tombstoneEpoch | type == "number")' artifacts/publication.json >/dev/null
	./sam node tooling/assemble-publication/scripts/check-runtime-metadata.mjs
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
		--label sam.scope=package-runtime \
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
	probe_status 301 /lab/majo
	probe_status 200 /lab/majo/
	probe_status 301 /lab/nerv
	probe_status 200 /lab/nerv/
	probe_status 200 /lab/majo/media/images/slide-01.jpg
	probe_status 200 /lab/majo/media/music/track-01.mp3
	probe_status 404 /missing/
	probe_status 404 /lab/nerv/missing/
	probe_status 200 /fonts/JetBrainsMono-Regular-v2.304.woff2
	probe_status 200 /fonts/JetBrainsMono-Medium-v2.304.woff2
	probe_status 200 /licenses/JetBrainsMono-OFL-1.1.txt
	probe_status 200 /licenses/JetBrainsMono-PROVENANCE.txt
	for file in "${manifest_inventory[@]}"; do
		if [[ "${file}" =~ ^diagrams/[a-f0-9]{64}\.svg$ ]]; then
			probe_status 200 "/${file}"
			[[ "$(curl --fail --silent "${RUNTIME_ORIGIN}/${file}" | sha256sum | cut -d ' ' -f 1)" == "$(sha256sum "${REPO_ROOT}/dist/${file}" | cut -d ' ' -f 1)" ]]
		fi
	done
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
	mapfile -t navigation_assets < <(find dist/_astro -maxdepth 1 -type f -name 'DocumentNavigationStatus*.js' -printf '%f\n' | sort)
	[[ "${#navigation_assets[@]}" -eq 1 ]] || {
		printf '[package-runtime] expected exactly one DocumentNavigationStatus asset\n' >&2
		return 1
	}
	navigation_asset=${navigation_assets[0]}
	mapfile -t site_assets < <(find dist/_astro -maxdepth 1 -type f -printf '%f\n' | sort)
	mapfile -t nerv_assets < <(find dist/lab/nerv/_astro -type f -printf '%P\n' | sort)
	[[ "${#site_assets[@]}" -gt 0 && "${#nerv_assets[@]}" -gt 0 ]] || {
		printf '[package-runtime] site and NERV must each publish immutable runtime assets\n' >&2
		return 1
	}
	assert_header "/posts/ai/llm-workflow-with-trellis/" '^content-type: text/html'
	assert_no_header "/posts/ai/llm-workflow-with-trellis/" '^cache-control: .*immutable'
	assert_header "/_astro/${navigation_asset}" '^content-type: application/javascript'
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

main() {
	local command=${1:-start}
	if [[ $# -gt 0 ]]; then shift; fi
	case "${command}" in
	--help | -h | help)
		[[ $# -eq 0 ]] || return 2
		usage
		return 0
		;;
	render) [[ $# -gt 0 ]] || {
		usage
		return 2
	} ;;
	start | up | dev | preview | build | stop | down | status | verify | package)
		[[ $# -eq 0 ]] || {
			usage
			return 2
		}
		;;
	*)
		usage
		return 2
		;;
	esac
	if [[ "${command}" != stop && "${command}" != down ]]; then load_environment; fi
	cd -- "${REPO_ROOT}"
	case "${command}" in
	start | up) start_preview publication ;;
	dev) start_preview dev ;;
	preview)
		preview_configuration
		preflight_addresses
		build_publication
		start_preview publication
		;;
	build) build_publication ;;
	stop | down) stop_preview ;;
	status) preview_status ;;
	render) render_command "$@" ;;
	verify) verify_repository ;;
	package) package_runtime ;;
	esac
}

main "$@"
