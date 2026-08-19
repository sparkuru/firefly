#!/usr/bin/env bash
# dev.sh - Run the Astro development server through ./sam.
#
# Default: http://${SAM_BIND_HOST:-0.0.0.0}:${WEB_HOST_PORT:-4321}/
# Preview: ./dev.sh preview builds and serves the assembled publication.
#
# Service: http://${SAM_BIND_HOST:-0.0.0.0}:${WEB_HOST_PORT:-4321}/
# Requires Docker, ./sam, and dependencies installed with:
#   ./sam npm run install:m4
set -Eeuo pipefail

SCRIPT_NAME=$(basename "$0")
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_LABEL="sam.repo=${REPO_ROOT}"
SCOPE_LABEL="sam.scope=dev.sh"

SAM_BIND_HOST="${SAM_BIND_HOST:-0.0.0.0}"
WEB_HOST_PORT="${WEB_HOST_PORT:-4321}"
WEB_CONTAINER_PORT="${WEB_CONTAINER_PORT:-4321}"
ASTRO_DEV_LOCK_PATH="${REPO_ROOT}/apps/site/.astro/dev.json"

readonly SCRIPT_NAME REPO_ROOT PROJECT_LABEL SCOPE_LABEL ASTRO_DEV_LOCK_PATH

service_pids=()

usage() {
	printf 'Usage: %s [start|up|preview|build|down|stop]\n' "${SCRIPT_NAME}" >&2
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
	rm -f -- "${ASTRO_DEV_LOCK_PATH}"

	for pid in "${service_pids[@]}"; do
		kill "${pid}" 2>/dev/null || true
	done
}

ensure_dev_dependencies() {
	local -a required_binaries=("$@")
	local binary

	for binary in "${required_binaries[@]}"; do
		if [[ ! -x "${REPO_ROOT}/${binary}" ]]; then
			printf '[dev.sh] dependencies are missing; run: ./sam npm run install:m4\n' >&2
			return 1
		fi
	done

	return 0
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
	local mode=$1
	local status=0
	local -a required_binaries=("apps/site/node_modules/.bin/astro")

	if [[ "${mode}" == preview ]]; then
		required_binaries=(
			"tooling/validate-experiments/node_modules/.bin/tsc"
			"packages/x-core/node_modules/.bin/tsc"
			"presentations/semantic/node_modules/.bin/tsc"
			"presentations/terminal/node_modules/.bin/tsc"
			"tooling/assemble-publication/node_modules/.bin/tsc"
			"apps/site/node_modules/.bin/astro"
			"experiments/nerv/node_modules/.bin/astro"
		)
	fi

	require_command docker
	[[ -x "${REPO_ROOT}/sam" ]] || {
		printf '[dev.sh] executable not found: %s/sam\n' "${REPO_ROOT}" >&2
		return 1
	}
	ensure_dev_dependencies "${required_binaries[@]}"

	cd "${REPO_ROOT}"
	trap cleanup INT TERM EXIT
	down_services quiet
	rm -f -- "${ASTRO_DEV_LOCK_PATH}"

	if [[ "${mode}" == preview ]]; then
		printf '[dev.sh] building the M5 publication for preview\n' >&2
		SAM_SCOPE=dev.sh ./sam npm run build:m5
		printf '[dev.sh] publication preview: http://%s:%s/\n' "${SAM_BIND_HOST}" "${WEB_HOST_PORT}" >&2
		run_service web \
			./sam env PUBLICATION_PORT="${WEB_CONTAINER_PORT}" \
			npm --prefix tooling/assemble-publication run start:e2e
	else
		printf '[dev.sh] starting Astro development server (no build)\n' >&2
		printf '[dev.sh] development site: http://%s:%s/\n' "${SAM_BIND_HOST}" "${WEB_HOST_PORT}" >&2
		run_service web \
			./sam npm --prefix apps/site run dev -- \
			--host 0.0.0.0 --port "${WEB_CONTAINER_PORT}"
	fi

	wait "${service_pids[0]}" || status=$?
	trap - INT TERM EXIT
	cleanup
	return "${status}"
}

main() {
	local command=${1:-start}

	case "${command}" in
	start | up)
		start_services dev
		;;
	preview | build)
		start_services preview
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
