#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
readonly SCRIPT_DIR
REPOSITORY_ROOT=$(cd -- "$SCRIPT_DIR/../../.." && pwd)
readonly REPOSITORY_ROOT
readonly STYLE_RESET=$'\033[0m'
readonly STYLE_SUCCESS=$'\033[0;32m'
readonly STYLE_ERROR=$'\033[0;31m'

color_text() {
	local style=$1 text=$2
	if [[ -n "${NO_COLOR:-}" || ! -t 1 ]]; then
		printf '%s' "$text"
	else
		printf '%s%s%s' "$style" "$text" "$STYLE_RESET"
	fi
}

die() {
	printf '%s\n' "$(color_text "$STYLE_ERROR" "Error: $*")" >&2
	exit 1
}

usage() {
	printf 'Usage: %s [image-tag]\nBuild and verify a disposable memo image with no published ports or real mail.\n' "${0##*/}"
}

cleanup() {
	local status=$?
	trap - EXIT
	if [[ -n "${container_id:-}" ]]; then
		docker rm -f "$container_id" >/dev/null || status=1
	fi
	if [[ -n "${data_volume:-}" ]]; then
		docker volume rm "$data_volume" >/dev/null || status=1
	fi
	if [[ -n "${fixture_volume:-}" ]]; then
		docker volume rm "$fixture_volume" >/dev/null || status=1
	fi
	if [[ -n "${scratch:-}" && "$scratch" == /tmp/firefly-memo-image.* && -d "$scratch" ]]; then
		rm -rf -- "$scratch"
	fi
	exit "$status"
}

start_container() {
	container_id=$(docker run -d --network none \
		--label firefly.memo-check="$run_id" \
		--mount "type=volume,src=$data_volume,dst=/var/lib/firefly-memos" \
		--mount "type=volume,src=$fixture_volume,dst=/app/config/plugins/memos,readonly" \
		--env MEMOS_SECRETS_FILE=/app/config/plugins/memos/secrets.env "$image")
	local attempt
	for ((attempt = 0; attempt < 30; attempt++)); do
		if docker exec "$container_id" node -e "Promise.all(['/healthz','/readyz'].map(p=>fetch('http://127.0.0.1:8788'+p))).then(r=>process.exit(r.every(v=>v.ok)?0:1)).catch(()=>process.exit(1))"; then
			return 0
		fi
		sleep 1
	done
	die 'container readiness failed'
}

main() {
	if [[ "${1:-}" == --help || "${1:-}" == -h ]]; then
		usage
		return 0
	fi
	[[ $# -le 1 ]] || die 'expected at most one image tag'
	local dependency
	for dependency in docker mktemp rm dirname sleep; do
		command -v "$dependency" >/dev/null 2>&1 || die "required command not found: $dependency"
	done
	image=${1:-firefly-memos:local-check}
	[[ "$image" != -* && "$image" != *[[:space:]]* ]] || die 'unsafe image tag'
	scratch=$(mktemp -d /tmp/firefly-memo-image.XXXXXXXX)
	run_id=${scratch##*.}
	container_id='' data_volume='' fixture_volume=''
	trap cleanup EXIT
	docker build --file "$REPOSITORY_ROOT/services/memos/Dockerfile" --tag "$image" "$REPOSITORY_ROOT"
	data_volume=$(docker volume create --label firefly.memo-check="$run_id")
	fixture_volume=$(docker volume create --label firefly.memo-check="$run_id")
	docker run --rm -i --network none --user 0:0 --entrypoint node \
		--mount "type=volume,src=$fixture_volume,dst=/fixture" "$image" --input-type=module <<'JS'
import fs from 'node:fs';
fs.chmodSync('/fixture', 0o700); fs.chownSync('/fixture', 1000, 1000);
fs.writeFileSync('/fixture/config.toml', '[runtime]\nallowedOrigins=["https://example.com"]\npublicOrigin="https://example.com"\ndataRoot="/var/lib/firefly-memos"\n[runtime.smtp]\nhost="smtp.example.com"\nuser="fake-login"\nfrom="memos@example.com"\n', { mode: 0o600 });
fs.writeFileSync('/fixture/secrets.env', `MEMOS_ENCRYPTION_KEY=${'01'.repeat(32)}\nMEMOS_TOKEN_KEY=${'02'.repeat(32)}\nMEMOS_ADMIN_TOKEN=fixture-only-owner-token-0123456789\nMEMOS_SMTP_PASSWORD=fixture-only-password\n`, { mode: 0o600 });
for (const file of ['config.toml', 'secrets.env']) fs.chownSync(`/fixture/${file}`, 1000, 1000);
JS
	start_container
	local bindings
	bindings=$(docker inspect --format '{{json .HostConfig.PortBindings}}' "$container_id")
	[[ "$bindings" == '{}' || "$bindings" == null ]] || die 'container published a host port'
	docker exec -i "$container_id" node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openRuntime } from './dist/src/runtime.js';
import { loadSecrets } from './dist/src/config.js';
assert.equal(process.getuid(), 1000);
const { repository } = openRuntime();
try {
  const base = 'http://127.0.0.1:8788';
  const auth = { Authorization: `Bearer ${loadSecrets(process.env).MEMOS_ADMIN_TOKEN}` };
  const submit = async body => {
    const response = await fetch(`${base}/v1/memos/submissions`, { method: 'POST', headers: { Origin: 'https://example.com', 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: 'Fixture reader', email: 'reader@example.com', body, consentVersion: 'memos-v1', consent: 'accepted' }) });
    assert.equal(response.status, 202);
  };
  await submit('Public fixture');
  const id = repository.list().submissions[0].id;
  const queued = repository.database.prepare('SELECT payload_cipher FROM outbox WHERE id = ?').get(id);
  const token = JSON.parse(repository.crypto.decrypt('outbox', id, queued.payload_cipher)).token;
  assert.equal((await fetch(`${base}/v1/memos/verify/${token}`)).status, 200);
  assert.equal((await fetch(`${base}/v1/memos/admin/submissions/${id}/approve`, { method: 'POST', headers: auth })).status, 200);
  await submit('Still private fixture');
  const exported = repository.export();
  assert.equal(exported.sourceRevision, 'r_1'); assert.equal(exported.memos.length, 1);
  fs.writeFileSync('/var/lib/firefly-memos/expected.json', JSON.stringify(exported.memos), { flag: 'wx', mode: 0o600 });
} finally { repository.close(); }
JS
	docker rm -f "$container_id" >/dev/null
	container_id=''
	start_container
	docker exec -i "$container_id" node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openRuntime } from './dist/src/runtime.js';
assert.equal(process.getuid(), 1000);
const { repository } = openRuntime();
try {
  const exported = repository.export();
  assert.equal(exported.sourceRevision, 'r_1'); assert.equal(exported.tombstoneEpoch, 0);
  assert.deepEqual(exported.memos, JSON.parse(fs.readFileSync('/var/lib/firefly-memos/expected.json', 'utf8')));
  const queued = repository.database.prepare("SELECT id, payload_cipher FROM outbox WHERE state = 'queued'").all();
  assert.equal(queued.length, 1);
  const payload = JSON.parse(repository.crypto.decrypt('outbox', queued[0].id, queued[0].payload_cipher));
  assert.equal(payload.to, 'reader@example.com'); assert.equal(payload.token.length, 43);
  assert.equal(repository.database.prepare('SELECT count(*) AS n FROM rate_events').get().n, 2);
  assert.equal(repository.list().submissions.length, 2);
  assert.equal(fs.statSync('/var/lib/firefly-memos').mode & 0o777, 0o700);
  assert.equal(fs.statSync('/var/lib/firefly-memos/memos.sqlite').mode & 0o777, 0o600);
  const bytes = fs.readFileSync('/var/lib/firefly-memos/memos.sqlite');
  assert.ok(!bytes.includes(Buffer.from(payload.to))); assert.ok(!bytes.includes(Buffer.from(payload.token)));
  assert.ok(!JSON.stringify(exported).includes('Still private fixture'));
} finally { repository.close(); }
JS
	printf '%s\n' "$(color_text "$STYLE_SUCCESS" 'Memo image health, nonroot privacy and recreation checks passed.')"
}

main "$@"
