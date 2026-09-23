#!/usr/bin/env bash
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT

usage() {
	printf 'Usage: ./render.sh <command> [arguments...]\n' >&2
	printf 'Run document build/check/dev commands in the pinned diagram-rendering container.\n' >&2
	printf 'Example: ./render.sh npm run build:m4\n' >&2
}

main() {
	case "${1:-}" in
	-h | --help)
		usage
		return 0
		;;
	'')
		usage
		return 2
		;;
	esac
	if [[ ! -x "${REPO_ROOT}/sam" ]]; then
		printf '[render] executable not found: %s/sam\n' "${REPO_ROOT}" >&2
		return 127
	fi
	export SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble
	export SAM_IPC=host
	exec "${REPO_ROOT}/sam" "$@"
}

main "$@"
