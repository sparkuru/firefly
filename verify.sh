#!/usr/bin/env bash
set -Eeuo pipefail

readonly SCRIPT_NAME="${0##*/}"
SCRIPT_BASE="${BASH_SOURCE[0]}"
if [[ "${SCRIPT_BASE}" == */* ]]; then
	SCRIPT_BASE="${SCRIPT_BASE%/*}"
else
	SCRIPT_BASE=.
fi
readonly SCRIPT_BASE
SCRIPT_DIR="$(cd -- "${SCRIPT_BASE}" 2>/dev/null && pwd -P)"
readonly SCRIPT_DIR
readonly CONTENT_ROOT="${SCRIPT_DIR}/content"
readonly SAM_PATH="${SCRIPT_DIR}/sam"
readonly DEFAULT_PLAYWRIGHT_IMAGE='mcr.microsoft.com/playwright:v1.62.0-noble'

usage() {
	printf '%s\n' \
		"Usage: ${SCRIPT_NAME} [--help]" \
		'' \
		'Run the complete repository-fixture validation gate through ./sam.' \
		'The gate runs check:m51, test:m51, build:m51, and the site, NERV, and' \
		'assembled-publication Playwright suites in that order.' \
		'' \
		"The tracked ${CONTENT_ROOT} fixture is always selected. SAM_IMAGE and SAM_IPC" \
		'may be overridden for diagnostics; the defaults are:' \
		"  SAM_IMAGE=${DEFAULT_PLAYWRIGHT_IMAGE}" \
		'  SAM_IPC=host'
}

die() {
	printf '%s: %s\n' "${SCRIPT_NAME}" "$*" >&2
	exit 1
}

main() {
	case "$#" in
	0) ;;
	1)
		case "$1" in
		--help | -h)
			usage
			return 0
			;;
		*)
			usage >&2
			return 2
			;;
		esac
		;;
	*)
		usage >&2
		return 2
		;;
	esac

	[[ -x "${SAM_PATH}" ]] || die "required executable not found: ${SAM_PATH}"
	for collection in posts pages; do
		[[ -d "${CONTENT_ROOT}/${collection}" && -r "${CONTENT_ROOT}/${collection}" ]] ||
			die "tracked fixture is missing a readable ${collection}/ directory"
	done

	# Set the fixture before sam sources the optional config.dev file.
	export FIREFLY_CONTENT_ROOT="${CONTENT_ROOT}"
	export SAM_IMAGE="${SAM_IMAGE-${DEFAULT_PLAYWRIGHT_IMAGE}}"
	export SAM_IPC="${SAM_IPC-host}"

	exec "${SAM_PATH}" npm run verify:m51
}

main "$@"
