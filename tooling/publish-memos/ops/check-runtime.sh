#!/usr/bin/env bash
set -Eeuo pipefail
REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd -P)"
readonly REPO_ROOT
fixture_root=""
container_id=""
image_name=""
cleanup() {
	[[ -z "${container_id}" ]] || docker rm -f "${container_id}" >/dev/null
	[[ -z "${image_name}" ]] || docker image rm "${image_name}" >/dev/null
	[[ -z "${fixture_root}" || "${fixture_root}" != /tmp/firefly-memos-runtime.* ]] || rm -rf -- "${fixture_root}"
}
check_host_config() {
	local source_root="${fixture_root}/config-source" output_root="${fixture_root}/config-output" deployment_root="${fixture_root}/config-deployment"
	local base_config="${fixture_root}/config-base.json" config_file="${fixture_root}/config-invalid.json" config_log="${fixture_root}/config-check.log"
	local invalid candidate
	mkdir -- "${source_root}" "${output_root}" "${deployment_root}"
	(
		umask 077
		jq -n --arg source "${source_root}" --arg output "${output_root}" --arg deployment "${deployment_root}" \
			'{sourceRoot:$source,outputRoot:$output,displayName:"Fixture Owner",deploymentRoot:$deployment}' >"${base_config}"
		: >"${config_file}"
		: >"${config_log}"
	)
	for invalid in \
		'{"sourceRoot":null}' '{"sourceRoot":false}' '{"sourceRoot":""}' \
		'{"outputRoot":null}' '{"outputRoot":false}' '{"outputRoot":""}' \
		'{"initialDeletionFloor":false}' '{"initialDeletionFloor":null}' '{"initialDeletionFloor":"0"}' \
		'{"initialDeletionFloor":{}}' '{"initialDeletionFloor":[]}' '{"initialDeletionFloor":-1}' \
		'{"initialDeletionFloor":1.5}' '{"initialDeletionFloor":9007199254740992}' \
		'{"remoteSudo":null}' '{"remoteSudo":0}' '{"remoteSudo":"false"}' \
		'{"remoteSudo":{}}' '{"remoteSudo":[]}' \
		'{"assetsRoot":null}' '{"assetsRoot":false}' '{"deploymentRoot":null}' \
		'{"sshTarget":null}' '{"knownHosts":null}' '{"sshConfig":null}' '{"remoteImage":null}'; do
		jq --argjson invalid "${invalid}" '. + $invalid' "${base_config}" >"${config_file}"
		if "${REPO_ROOT}/tooling/publish-memos/publish.sh" publish --local --config "${config_file}" >"${config_log}" 2>&1; then
			printf '[memos-runtime] invalid publisher config was accepted\n' >&2
			return 1
		fi
		rg --quiet --fixed-strings --line-regexp '[memos] invalid publisher config' "${config_log}"
		if rg --quiet '\[sam|validated local candidate|accepted Memo-only' "${config_log}"; then return 1; fi
		[[ -z "$(find "${source_root}" "${output_root}" "${deployment_root}" -mindepth 1 -print -quit)" ]]
	done
	# Exercise the real jq defaults and explicit floor before the broader runtime fixture.
	"${REPO_ROOT}/tooling/publish-memos/publish.sh" build --config "${base_config}" >"${config_log}" 2>&1
	candidate=$(sed -n 's/^\[memos\] validated local candidate: //p' "${config_log}")
	[[ "$(jq -r '.deletionFloor' "${candidate}/receipt.json")" == 0 ]]
	jq '. + {initialDeletionFloor:7,remoteSudo:false}' "${base_config}" >"${config_file}"
	"${REPO_ROOT}/tooling/publish-memos/publish.sh" build --config "${config_file}" >"${config_log}" 2>&1
	candidate=$(sed -n 's/^\[memos\] validated local candidate: //p' "${config_log}")
	[[ "$(jq -r '.deletionFloor' "${candidate}/receipt.json")" == 7 ]]
	[[ -z "$(find "${deployment_root}" -mindepth 1 -print -quit)" ]]
	printf '[memos-runtime] real host config type/default/floor checks passed\n'
}
main() {
	local command context candidate blog port origin
	[[ $# == 0 || ($# == 1 && "$1" == --config-check-only) ]] || {
		printf 'Usage: check-runtime.sh [--config-check-only]\n' >&2
		return 2
	}
	for command in docker jq mktemp cp mkdir rm curl rg sort sed find; do command -v "${command}" >/dev/null || {
		printf 'Missing command: %s\n' "${command}" >&2
		return 1
	}; done
	fixture_root=$(mktemp -d /tmp/firefly-memos-runtime.XXXXXXXX)
	trap cleanup EXIT
	trap 'exit 130' INT
	trap 'exit 143' TERM
	check_host_config
	[[ "${1:-}" != --config-check-only ]] || return 0
	SAM_CONTENT_MODE=none SAM_MEMOS_WORK_ROOT="${fixture_root}" "${REPO_ROOT}/sam" node tooling/publish-memos/ops/check-deployment.mjs "${fixture_root}" >"${fixture_root}/result.json"
	candidate=$(jq -r '.candidateRoot' "${fixture_root}/result.json")
	blog=$(jq -r '.blogPublicRoot' "${fixture_root}/result.json")
	context="${fixture_root}/context"
	mkdir "${context}"
	(
		umask 022
		cp "${REPO_ROOT}/Dockerfile" "${REPO_ROOT}/nginx.conf" "${context}/"
		cp -R "${blog}" "${context}/dist"
		cp -R "${candidate}/public" "${context}/memos-public"
	)
	image_name="firefly-memos-static-fixture:${fixture_root##*.}"
	docker build --quiet --target runtime-publication-memos --tag "${image_name}" "${context}" >/dev/null
	container_id=$(docker run --detach --rm --read-only --tmpfs /tmp:mode=1777 --cap-drop ALL --security-opt no-new-privileges:true \
		--label "sam.repo=${REPO_ROOT}" --label sam.scope=memos-static-fixture --publish 127.0.0.1::8080 "${image_name}")
	[[ "$(docker inspect --format '{{.HostConfig.ReadonlyRootfs}}' "${container_id}")" == true ]]
	[[ "$(docker inspect --format '{{index .Config.Labels "sam.scope"}}' "${container_id}")" == memos-static-fixture ]]
	[[ "$(docker exec "${container_id}" id -u)" != 0 ]]
	local expected_files actual_files
	expected_files=$(jq -r '.inventory[].path | sub("^public/"; "")' "${candidate}/receipt.json" | sort)
	actual_files=$(docker exec "${container_id}" find /usr/share/nginx/memos -type f | sed 's#^/usr/share/nginx/memos/##' | sort)
	[[ "${expected_files}" == "${actual_files}" ]]
	port=$(docker port "${container_id}" 8080/tcp)
	origin="http://127.0.0.1:${port##*:}"
	local attempt
	for attempt in {1..30}; do
		if curl --fail --silent "${origin}/healthz" >/dev/null; then break; fi
		[[ "${attempt}" != 30 ]] || return 1
		sleep 0.2
	done
	curl --fail --silent "${origin}/" | rg --quiet 'Updated Blog'
	curl --fail --silent "${origin}/memos/" | rg --quiet 'Current owner Memo'
	curl --fail --silent --head "${origin}/memos/" | rg --ignore-case --quiet '^cache-control: no-cache, no-store'
	curl --fail --silent --head "${origin}/memos/assets/style.css" | rg --ignore-case --quiet '^cache-control: no-cache, no-store'
	curl --fail --silent --head "${origin}/memos/assets/media/pixel.png" | rg --ignore-case --quiet '^cache-control: no-cache, no-store'
	curl --fail --silent "${origin}/memos/assets/style.css" >/dev/null
	curl --fail --silent "${origin}/memos/assets/media/pixel.png" >/dev/null
	[[ "$(curl --silent --output /dev/null --write-out '%{http_code}' "${origin}/memos/receipt.json")" == 404 ]]
	[[ "$(curl --silent --output /dev/null --write-out '%{http_code}' --request POST "${origin}/memos/")" == 403 ]]
	[[ "$(curl --silent --output /dev/null --write-out '%{http_code}' "${origin}/v1/memos/submissions")" == 404 ]]
	printf '[memos-runtime] independent publication, reciprocal preservation and read-only static mount passed\n'
}
main "$@"
