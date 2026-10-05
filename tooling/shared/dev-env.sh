#!/usr/bin/env bash

load_dev_environment() {
	local dev_env_root=$1
	local dev_env_path="${dev_env_root}/.env"
	local dev_env_line dev_env_key dev_env_value
	local dev_env_number=0
	local -A dev_env_seen=()

	[[ -f "${dev_env_path}" ]] || return 0
	while IFS= read -r dev_env_line || [[ -n "${dev_env_line}" ]]; do
		dev_env_number=$((dev_env_number + 1))
		dev_env_line=${dev_env_line%$'\r'}
		dev_env_line="${dev_env_line#"${dev_env_line%%[![:space:]]*}"}"
		[[ -n "${dev_env_line}" && "${dev_env_line}" != \#* ]] || continue
		if [[ ! "${dev_env_line}" =~ ^([A-Za-z_][A-Za-z_0-9]*)[[:space:]]*=(.*)$ ]]; then
			printf '[environment] invalid assignment in .env at line %s\n' "${dev_env_number}" >&2
			return 2
		fi
		dev_env_key=${BASH_REMATCH[1]}
		dev_env_value=${BASH_REMATCH[2]}
		if [[ -v "dev_env_seen[${dev_env_key}]" ]]; then
			printf '[environment] duplicate key in .env: %s\n' "${dev_env_key}" >&2
			return 2
		fi
		dev_env_seen["${dev_env_key}"]=1
		dev_env_value="${dev_env_value#"${dev_env_value%%[![:space:]]*}"}"
		dev_env_value="${dev_env_value%"${dev_env_value##*[![:space:]]}"}"
		case "${dev_env_value}" in
		\"* | \'*)
			if [[ ${#dev_env_value} -lt 2 || "${dev_env_value: -1}" != "${dev_env_value:0:1}" ]]; then
				printf '[environment] unmatched quote in .env at line %s\n' "${dev_env_number}" >&2
				return 2
			fi
			dev_env_value=${dev_env_value:1:${#dev_env_value}-2}
			;;
		*)
			dev_env_value=${dev_env_value%%[[:space:]]\#*}
			dev_env_value="${dev_env_value%"${dev_env_value##*[![:space:]]}"}"
			;;
		esac
		# Other keys remain available to Compose without changing the wrapper environment.
		case "${dev_env_key}" in
		SAM_* | WEB_* | FIREFLY_* | COMMENTS_* | MEMOS_*)
			[[ -v "${dev_env_key}" ]] || export "${dev_env_key}=${dev_env_value}"
			;;
		esac
	done <"${dev_env_path}"
}
