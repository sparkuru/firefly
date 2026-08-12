#!/usr/bin/env bash
# dev.sh - Start and stop the NERV Astro development server through ./sam.
#
# Service: http://${SAM_BIND_HOST:-127.0.0.1}:${WEB_HOST_PORT:-4321}/lab/nerv/
# Requires Docker, ./sam, and dependencies installed with:
#   ./sam npm --prefix experiments/nerv ci
set -Eeuo pipefail

SCRIPT_NAME=$(basename "$0")
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_LABEL="sam.repo=${REPO_ROOT}"
SCOPE_LABEL="sam.scope=dev.sh"

SAM_BIND_HOST="${SAM_BIND_HOST:-127.0.0.1}"
WEB_HOST_PORT="${WEB_HOST_PORT:-4321}"
WEB_CONTAINER_PORT="${WEB_CONTAINER_PORT:-4321}"

readonly SCRIPT_NAME REPO_ROOT PROJECT_LABEL SCOPE_LABEL

service_pids=()

usage() {
	printf 'Usage: %s [start|up|down|stop]\n' "${SCRIPT_NAME}" >&2
}

require_command() {
	command -v "$1" >/dev/null 2>&1 || {
		printf '[dev.sh] required command not found: %s\n' "$1" >&2
		exit 127
	}
}

down_services() {
	local mode=${1:-verbose}
	local -a container_ids=()

	if ! command -v docker >/dev/null 2>&1; then
		[[ "${mode}" == quiet ]] || printf '[dev.sh] docker is not available; no containers stopped\n' >&2
		return 0
	fi

	mapfile -t container_ids < <(
		docker ps -q \
			--filter "label=${PROJECT_LABEL}" \
			--filter "label=${SCOPE_LABEL}"
	)

	if [[ ${#container_ids[@]} -eq 0 ]]; then
		[[ "${mode}" == quiet ]] || printf '[dev.sh] no dev containers found\n' >&2
		return 0
	fi

	printf '[dev.sh] stopping %s container(s)\n' "${#container_ids[@]}" >&2
	if ! docker stop "${container_ids[@]}" >/dev/null; then
		printf '[dev.sh] one or more containers could not be stopped\n' >&2
		return 1
	fi
}

cleanup() {
	local pid

	down_services quiet

	for pid in "${service_pids[@]}"; do
		kill "${pid}" 2>/dev/null || true
	done
}

ensure_dev_dependencies() {
	[[ -x "${REPO_ROOT}/experiments/nerv/node_modules/.bin/astro" ]] && return 0

	printf '[dev.sh] dependencies are missing; run: ./sam npm --prefix experiments/nerv ci\n' >&2
	return 1
}

run_service() {
	local name=$1
	shift

	printf '[dev.sh] starting %s: %s\n' "${name}" "$*" >&2
	env \
		SAM_SCOPE=dev.sh \
		SAM_SERVICE="${name}" \
		SAM_BIND_HOST="${SAM_BIND_HOST}" \
		WEB_HOST_PORT="${WEB_HOST_PORT}" \
		WEB_CONTAINER_PORT="${WEB_CONTAINER_PORT}" \
		"$@" &
	service_pids+=("$!")
}

start_services() {
	local status=0

	require_command docker
	[[ -x "${REPO_ROOT}/sam" ]] || {
		printf '[dev.sh] executable not found: %s/sam\n' "${REPO_ROOT}" >&2
		return 1
	}
	ensure_dev_dependencies

	cd "${REPO_ROOT}"
	trap cleanup INT TERM EXIT
	down_services quiet

	printf '[dev.sh] NERV: http://%s:%s/lab/nerv/\n' "${SAM_BIND_HOST}" "${WEB_HOST_PORT}" >&2
	run_service web \
		./sam npm --prefix experiments/nerv run start -- \
		--host 0.0.0.0 \
		--port "${WEB_CONTAINER_PORT}"

	wait "${service_pids[0]}" || status=$?
	trap - INT TERM EXIT
	cleanup
	return "${status}"
}

main() {
	local command=${1:-start}

	case "${command}" in
	start | up)
		start_services
		;;
	down | stop)
		cd "${REPO_ROOT}"
		down_services
		;;
	--help | -h)
		usage
		;;
	*)
		usage
		return 2
		;;
	esac
}

main "$@"
