#!/usr/bin/env bash
set -Eeuo pipefail

command -v node >/dev/null 2>&1 || {
	printf '%s\n' '[comments-restore] required command not found: node' >&2
	exit 127
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "${SCRIPT_DIR}/../scripts/restore.mjs" "$@"
