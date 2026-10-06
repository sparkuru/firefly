#!/usr/bin/env bash
set -Eeuo pipefail
REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd -P)"
readonly REPO_ROOT
config_file=""
operation=""
local_only=false
dry_run=false
scratch=""
remote_stage=""
ssh_args=()

usage() {
	printf '%s\n' 'Usage: publish.sh new NAME [--config FILE] | build [--config FILE]' \
		'       publish.sh publish|rollback --config FILE [--local] [--dry-run] [--prior-candidate PATH]' \
		'new always authors checkout-local content/memos; a supplied config is ignored.' \
		'publish automatically pushes only Memo. build never promotes. --local selects a local deployment.' \
		'Use an owner-only JSON config; SSH uses keys and strict known-host checking.' >&2
}
die() {
	printf '[memos] %s\n' "$*" >&2
	exit 1
}
require_command() { command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"; }
cleanup() {
	[[ -z "${scratch}" || "${scratch}" != /tmp/firefly-memos-publish.* ]] || rm -rf -- "${scratch}"
}
cli() {
	if [[ "${operation}" == new ]]; then
		SAM_CONTENT_MODE=none SAM_MEMOS_SOURCE_WRITABLE=1 SAM_MEMOS_SOURCE_ROOT="${source_root}" \
			SAM_MEMOS_ASSETS_ROOT="" SAM_MEMOS_WORK_ROOT="" SAM_MEMOS_DEPLOYMENT_ROOT="" \
			SAM_MEMOS_HISTORY_ROOT="" SAM_MEMOS_PRIOR_ROOT="" FIREFLY_MEMOS_CANDIDATE="" FIREFLY_MEMOS_PUBLIC_ROOT="" \
			"${REPO_ROOT}/sam" node tooling/publish-memos/src/cli.mjs "$@"
		return
	fi
	SAM_CONTENT_MODE=none SAM_MEMOS_SOURCE_WRITABLE=0 SAM_MEMOS_SOURCE_ROOT="${source_root}" SAM_MEMOS_ASSETS_ROOT="${assets_root}" \
		SAM_MEMOS_WORK_ROOT="${output_root}" SAM_MEMOS_DEPLOYMENT_ROOT="${local_deployment}" \
		"${REPO_ROOT}/sam" node tooling/publish-memos/src/cli.mjs "$@"
}

safe_remote_value() { [[ "$1" =~ ^[A-Za-z0-9_./:@+-]+$ ]] && [[ "$1" != *..* ]]; }
ssh_command() {
	local command=$1
	# shellcheck disable=SC2029 # Client substitutions are restricted validated paths/CLI tokens.
	ssh "${ssh_args[@]}" "${ssh_target}" "${command}" 2>"${scratch}/remote-error"
}
remote_cli() {
	local writable=$1 command arg
	shift
	command="${docker_prefix} run --rm --pull never --network none --read-only --cap-drop ALL --security-opt no-new-privileges:true --tmpfs /tmp:size=16m,mode=1777 --user \$(id -u):\$(id -g) --label sam.scope=memos-publisher --mount type=bind,src=${deployment_root},dst=/deployment${writable} ${remote_image}"
	for arg in "$@"; do
		safe_remote_value "${arg}" || die 'unsafe remote CLI argument'
		command+=" '${arg}'"
	done
	ssh_command "${command}"
}
paths_overlap() { [[ "$1" == "$2" || "$1/" == "$2/"* || "$2/" == "$1/"* ]]; }
canonical_directory() {
	local selected=$1 resolved
	[[ "${selected}" == /* && -d "${selected}" && ! -L "${selected}" ]] || die 'selected local roots must be existing regular absolute directories'
	resolved=$(realpath -e -- "${selected}") || die 'cannot resolve selected local root'
	[[ "${resolved}" == "${selected}" ]] || die 'selected local roots must be canonical and nonsymlink'
}
protect_local_output() {
	local selected=$1
	if paths_overlap "${selected}" "${REPO_ROOT}"; then
		[[ "${selected}" == "${REPO_ROOT}/.firefly/memos" || "${selected}" == "${REPO_ROOT}/.firefly/memos/"* ]] || die 'repository-local Memo output must stay within .firefly/memos'
	fi
}
validate_local_roots() {
	local allow_missing_defaults=${1:-false} protected
	if [[ "${allow_missing_defaults}" == true && "${default_source}" == true ]]; then check_default_directory "${source_root}"; else canonical_directory "${source_root}"; fi
	if [[ "${allow_missing_defaults}" == true && "${default_output}" == true ]]; then check_default_directory "${output_root}"; else canonical_directory "${output_root}"; fi
	protect_local_output "${output_root}"
	for protected in content/posts content/pages artifacts dist apps/site; do
		if paths_overlap "${source_root}" "${REPO_ROOT}/${protected}"; then die 'Memo source cannot overlap blog source or release'; fi
	done
	if paths_overlap "${source_root}" "${output_root}"; then die 'Memo source and output must be separate'; fi
	if [[ -n "${assets_root}" ]]; then
		canonical_directory "${assets_root}"
		if paths_overlap "${assets_root}" "${output_root}"; then die 'Memo assets and output must be separate'; fi
	fi
	if [[ -n "${local_deployment}" ]]; then
		canonical_directory "${local_deployment}"
		protect_local_output "${local_deployment}"
		if paths_overlap "${source_root}" "${local_deployment}" || paths_overlap "${output_root}" "${local_deployment}" || { [[ -n "${assets_root}" ]] && paths_overlap "${assets_root}" "${local_deployment}"; }; then die 'local deployment must be separate from source, assets and candidates'; fi
	fi
}
check_default_directory() {
	local selected=$1 cursor="/" part
	local -a parts=()
	[[ "${selected}" == "${REPO_ROOT}/"* ]] || die 'default directories must belong to this checkout'
	IFS='/' read -r -a parts <<<"${selected#/}"
	for part in "${parts[@]}"; do
		[[ -n "${part}" && "${part}" != . && "${part}" != .. ]] || die 'default directory has a noncanonical path'
		cursor="${cursor%/}/${part}"
		[[ ! -L "${cursor}" ]] || die 'default directory parents must be nonsymlink regular directories'
		if [[ -e "${cursor}" ]]; then
			[[ -d "${cursor}" ]] || die 'default directory parents must be nonsymlink regular directories'
			canonical_directory "${cursor}"
		fi
	done
}
create_default_directory() {
	local selected=$1 cursor="/" part
	local -a parts=()
	IFS='/' read -r -a parts <<<"${selected#/}"
	for part in "${parts[@]}"; do
		cursor="${cursor%/}/${part}"
		[[ ! -L "${cursor}" ]] || die 'default directory parents must be nonsymlink regular directories'
		[[ -e "${cursor}" ]] || mkdir -m 700 -- "${cursor}"
		canonical_directory "${cursor}"
	done
}
prepare_local_roots() {
	# Inspect both default paths and all selected inputs before creating anything.
	validate_local_roots true
	[[ "${default_source}" == false ]] || create_default_directory "${source_root}"
	[[ "${default_output}" == false ]] || create_default_directory "${output_root}"
	validate_local_roots
}

load_config() {
	[[ -f "${config_file}" && ! -L "${config_file}" && "$(stat -c '%a' -- "${config_file}")" == 600 && "$(stat -c '%u' -- "${config_file}")" == "$(id -u)" ]] || die 'config must be a regular owner-owned 0600 JSON file'
	jq -e 'type == "object" and (keys - ["sourceRoot","assetsRoot","outputRoot","displayName","deploymentRoot","sshTarget","knownHosts","sshConfig","remoteImage","remoteSudo","initialDeletionFloor"] | length == 0) and (.displayName | type == "string" and length > 0) and (if has("initialDeletionFloor") then (.initialDeletionFloor | type == "number" and . >= 0 and . <= 9007199254740991 and floor == .) else true end) and (if has("remoteSudo") then (.remoteSudo | type == "boolean") else true end) and ([to_entries[] | select(.key | IN("sourceRoot","outputRoot","assetsRoot","deploymentRoot","sshTarget","knownHosts","sshConfig","remoteImage")) | .value] | all(type == "string" and length > 0))' "${config_file}" >/dev/null || die 'invalid publisher config'
	local configured_source configured_output
	configured_source=$(jq -r '.sourceRoot // empty' "${config_file}")
	configured_output=$(jq -r '.outputRoot // empty' "${config_file}")
	if [[ -n "${configured_source}" ]]; then
		source_root=${configured_source}
		default_source=false
	fi
	if [[ -n "${configured_output}" ]]; then
		output_root=${configured_output}
		default_output=false
	fi
	assets_root=$(jq -r '.assetsRoot // empty' "${config_file}")
	display_name=$(jq -r '.displayName' "${config_file}")
	deployment_root=$(jq -r '.deploymentRoot // empty' "${config_file}")
	initial_floor=$(jq -r '.initialDeletionFloor // 0' "${config_file}")
	if [[ "${local_only}" == true ]]; then
		[[ "${deployment_root}" == /* && -d "${deployment_root}" ]] || die 'local deploymentRoot must be an existing absolute directory'
		local_deployment=${deployment_root}
	fi
}

prepare_ssh() {
	ssh_target=$(jq -r '.sshTarget // empty' "${config_file}")
	remote_image=$(jq -r '.remoteImage // empty' "${config_file}")
	local known_hosts ssh_config
	known_hosts=$(jq -r '.knownHosts // empty' "${config_file}")
	ssh_config=$(jq -r '.sshConfig // "/dev/null"' "${config_file}")
	[[ "${deployment_root}" == /* && "${deployment_root}" != / && "${deployment_root}" != */ && "${remote_image}" =~ ^sha256:[a-f0-9]{64}$ ]] || die 'remote deploymentRoot and immutable remoteImage are required'
	if ! safe_remote_value "${deployment_root}" || ! safe_remote_value "${ssh_target}" || [[ "${ssh_target}" == -* ]]; then die 'unsafe remote destination'; fi
	[[ "${known_hosts}" == /* && -f "${known_hosts}" && ! -L "${known_hosts}" ]] || die 'knownHosts must be an existing absolute regular file'
	[[ "${ssh_config}" == /dev/null || ("${ssh_config}" == /* && -f "${ssh_config}" && ! -L "${ssh_config}") ]] || die 'sshConfig must be an absolute regular file or /dev/null'
	ssh_args=(-F "${ssh_config}" -o BatchMode=yes -o PasswordAuthentication=no -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=${known_hosts}" -o ConnectTimeout=10)
	docker_prefix=docker
	[[ "$(jq -r '.remoteSudo // false' "${config_file}")" != true ]] || docker_prefix='sudo -n docker'
}
main() {
	local name="" prior_candidate="" source_root="${REPO_ROOT}/content/memos" assets_root="" output_root="${REPO_ROOT}/.firefly/memos/candidates" display_name=Owner deployment_root="" initial_floor=0
	local default_source=true default_output=true
	local local_deployment="" ssh_target remote_image docker_prefix candidate expected_base candidate_digest accepted_digest
	operation=${1:-}
	[[ "${operation}" != --help && "${operation}" != -h ]] || {
		usage
		return 0
	}
	[[ "${operation}" == new || "${operation}" == build || "${operation}" == publish || "${operation}" == rollback ]] || {
		usage
		return 2
	}
	shift
	if [[ "${operation}" == new ]]; then
		name=${1:-}
		[[ -n "${name}" ]] || die 'new requires a name'
		shift
	fi
	while (($#)); do
		case "$1" in
		--config)
			[[ $# -ge 2 ]] || die '--config requires a path'
			config_file=$2
			shift 2
			;;
		--prior-candidate)
			[[ $# -ge 2 ]] || die '--prior-candidate requires a path'
			prior_candidate=$2
			shift 2
			;;
		--local)
			local_only=true
			shift
			;;
		--dry-run)
			dry_run=true
			shift
			;;
		*)
			usage
			return 2
			;;
		esac
	done
	if [[ "${operation}" == publish || "${operation}" == rollback ]]; then [[ -n "${config_file}" ]] || die '--config is required for publish or rollback'; fi
	if [[ "${operation}" == new || "${operation}" == build ]]; then
		[[ "${local_only}" == false && "${dry_run}" == false && -z "${prior_candidate}" ]] || die 'publication-only flags require publish or rollback'
	fi
	[[ "${operation}" == rollback || -z "${prior_candidate}" ]] || die '--prior-candidate requires rollback'
	for dependency in realpath mkdir; do require_command "${dependency}"; done
	if [[ "${operation}" == new ]]; then
		# Compatibility --config is deliberately never read by the authoring command.
		check_default_directory "${source_root}"
		create_default_directory "${source_root}"
		cli new "${name}" --source-root "${source_root}"
		return
	fi
	for dependency in jq stat id mktemp rm chmod; do require_command "${dependency}"; done
	[[ -z "${config_file}" ]] || load_config
	prepare_local_roots
	scratch=$(mktemp -d /tmp/firefly-memos-publish.XXXXXXXX)
	chmod 700 "${scratch}"
	local private_file
	for private_file in history.json remote-error build.json receipt.json promote.json after.json; do
		(
			umask 077
			: >"${scratch}/${private_file}"
		)
	done
	trap cleanup EXIT
	trap 'exit 130' INT
	trap 'exit 143' TERM
	if [[ "${operation}" == build ]]; then
		printf 'null\n' >"${scratch}/history.json"
	elif [[ "${local_only}" == true ]]; then
		cli state --deployment-root "${deployment_root}" >"${scratch}/history.json"
	else
		require_command ssh
		prepare_ssh
		remote_cli ,readonly state --deployment-root /deployment >"${scratch}/history.json" || die 'remote history probe failed; no candidate uploaded'
	fi
	expected_base=$(jq -er 'if . == null then "null" else .digest end' "${scratch}/history.json")
	[[ "${expected_base}" == null || "${expected_base}" =~ ^[a-f0-9]{64}$ ]] || die 'invalid current receipt'
	# The state probe is data, never shell input; expose only its narrow temporary directory.
	export SAM_MEMOS_HISTORY_ROOT=${scratch}
	candidate="${output_root}/candidate-${scratch##*.}"
	local -a build_args=(--source-root "${source_root}" --output-root "${candidate}" --display-name "${display_name}" --history "${scratch}/history.json")
	[[ -z "${assets_root}" ]] || build_args+=(--assets-root "${assets_root}")
	[[ "${expected_base}" != null ]] || build_args+=(--initial-deletion-floor "${initial_floor}")
	if [[ "${operation}" == rollback ]]; then
		[[ -n "${prior_candidate}" ]] || die 'rollback requires --prior-candidate pointing to an owner-retained local candidate'
		export SAM_MEMOS_PRIOR_ROOT=${prior_candidate}
		cli rollback --candidate-root "${prior_candidate}" --history "${scratch}/history.json" --output-root "${candidate}" >"${scratch}/build.json"
	else
		cli build "${build_args[@]}" >"${scratch}/build.json"
	fi
	cli validate --candidate-root "${candidate}" >"${scratch}/receipt.json"
	candidate_digest=$(jq -er '.digest' "${scratch}/receipt.json")
	if [[ "${operation}" == build || "${dry_run}" == true ]]; then
		printf '[memos] validated local candidate: %s\n' "${candidate}"
		return
	fi
	local -a promotion_args=(--expected-base "${expected_base}")
	[[ "${expected_base}" != null ]] || promotion_args+=(--initial-deletion-floor "${initial_floor}")
	if [[ "${local_only}" == true ]]; then
		cli promote --candidate-root "${candidate}" --deployment-root "${deployment_root}" "${promotion_args[@]}"
		return
	fi
	require_command tar
	remote_stage="${deployment_root}/incoming/upload-${scratch##*.}"
	# Candidate validation fixes the complete regular-file inventory before this bounded transfer.
	if ! tar -C "${candidate}" -cf - public receipt.json | ssh_command \
		"umask 077; test -d '${deployment_root}' && test ! -L '${deployment_root}/incoming' && mkdir -p '${deployment_root}/incoming' && mkdir '${remote_stage}' && tar --no-same-owner --no-same-permissions -xf - -C '${remote_stage}'" 2>"${scratch}/remote-error"; then
		ssh_command "test ! -L '${remote_stage}' && rm -rf -- '${remote_stage}'" 2>"${scratch}/remote-error" || die 'upload failed; inspect retained incoming candidate before retry'
		die 'upload failed; accepted publication remains unchanged'
	fi
	if ! remote_cli '' promote --candidate-root "/deployment/incoming/upload-${scratch##*.}" --deployment-root /deployment "${promotion_args[@]}" >"${scratch}/promote.json"; then
		remote_cli ,readonly state --deployment-root /deployment >"${scratch}/after.json" || die 'promotion outcome is ambiguous; inspect current receipt before retrying'
		accepted_digest=$(jq -er 'if . == null then "null" else .digest end' "${scratch}/after.json")
		[[ "${accepted_digest}" == "${candidate_digest}" ]] || die 'promotion was not accepted; retain candidate and inspect current history'
	fi
	ssh_command "test ! -L '${remote_stage}' && rm -rf -- '${remote_stage}'" 2>"${scratch}/remote-error" || die 'publication accepted; incoming cleanup failed'
	printf '[memos] accepted Memo-only publication %s\n' "${candidate_digest}"
}
main "$@"
