import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { chmod, copyFile, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';
import { readCurrentHistory } from '../src/index.mjs';
const execute = promisify(execFile);
const realRoot = path.resolve(import.meta.dirname, '../../..');
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-host-publisher-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const dir of ['tooling/publish-memos', 'bin', 'source', '.firefly/memos/candidates', '.firefly/memos/deployment']) await mkdir(path.join(root, dir), { recursive: true });
  const script = path.join(root, 'tooling/publish-memos/publish.sh');
  await copyFile(path.join(realRoot, 'tooling/publish-memos/publish.sh'), script);
  await chmod(script, 0o755);
  await writeFile(path.join(root, 'known_hosts'), 'synthetic known-host fixture');
  await writeFile(path.join(root, 'source/note.md'), '---\nid: m_host_fixture\ncreatedAt: 2026-10-06T00:00:00.000Z\ndraft: false\n---\nInitial owner Memo\n');
  const image = `sha256:${'a'.repeat(64)}`;
  const config = { sourceRoot: path.join(root, 'source'), outputRoot: path.join(root, '.firefly/memos/candidates'), displayName: 'Fixture', deploymentRoot: path.join(root, '.firefly/memos/deployment'), sshTarget: 'fixture-target', knownHosts: path.join(root, 'known_hosts'), sshConfig: '/dev/null', remoteImage: image, remoteSudo: false };
  const configPath = path.join(root, 'publisher.json');
  await writeFile(configPath, JSON.stringify(config), { mode: 0o600 });
  await writeFile(path.join(root, 'sam'), `#!/usr/bin/env bash\nset -eu\nprintf '%s\\n' \"$SAM_MEMOS_SOURCE_ROOT\" \"\${SAM_MEMOS_ASSETS_ROOT:-}\" \"\${SAM_MEMOS_WORK_ROOT:-}\" \"\${SAM_MEMOS_SOURCE_WRITABLE:-}\" >> \"$FIXTURE_ROOT/sam-env.log\"\nshift 2\nexec '${process.execPath}' '${realRoot}/tooling/publish-memos/src/cli.mjs' "$@"\n`, { mode: 0o755 });
  await writeFile(path.join(root, 'bin/ssh'), `#!/usr/bin/env bash
set -eu
command=\${!#}
printf '%s\\n' "$*" >> "$FIXTURE_ROOT/ssh.log"
if [[ "$command" == *'tar --no-same-owner'* && "\${FIXTURE_FAIL_UPLOAD:-0}" == 1 ]]; then exit 7; fi
if [[ "$command" == *"'promote'"* && "\${FIXTURE_REJECT_PROMOTE:-0}" == 1 ]]; then exit 255; fi
bash -c "$command"
if [[ "$command" == *"'promote'"* && "\${FIXTURE_AMBIGUOUS:-0}" == 1 ]]; then exit 255; fi
`, { mode: 0o755 });
  await writeFile(path.join(root, 'bin/docker'), `#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
const args = process.argv.slice(2);
const mount = args[args.indexOf('--mount') + 1];
const root = mount.match(/src=([^,]+)/)[1];
const index = args.indexOf('${image}');
const command = args.slice(index + 1).map((arg) => arg.startsWith('/deployment') ? root + arg.slice('/deployment'.length) : arg);
const result = spawnSync(process.execPath, ['${realRoot}/tooling/publish-memos/src/cli.mjs', ...command], { stdio: 'inherit' });
process.exit(result.status ?? 1);
`, { mode: 0o755 });
  // Model jq's trusted JSON projection in the pinned image, which has no jq binary.
  await writeFile(path.join(root, 'bin/jq'), `#!/usr/bin/env node
import { readFileSync } from 'node:fs';
const args = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
const query = args[0]; const value = JSON.parse(readFileSync(args[1], 'utf8'));
let result;
if (query.startsWith('type == "object"')) {
 const allowed = ['sourceRoot','assetsRoot','outputRoot','displayName','deploymentRoot','sshTarget','knownHosts','sshConfig','remoteImage','remoteSudo','initialDeletionFloor'];
 const strings = ['sourceRoot','outputRoot','assetsRoot','deploymentRoot','sshTarget','knownHosts','sshConfig','remoteImage'];
 const nonempty = (item) => typeof item === 'string' && item.length > 0;
 const present = (key) => Object.hasOwn(value, key);
 result = value !== null && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).every((key) => allowed.includes(key)) &&
  nonempty(value.displayName) &&
  (!present('initialDeletionFloor') || (Number.isSafeInteger(value.initialDeletionFloor) && value.initialDeletionFloor >= 0)) &&
  (!present('remoteSudo') || typeof value.remoteSudo === 'boolean') &&
  strings.every((key) => !present(key) || nonempty(value[key]));
 if (!result) process.exit(1);
}
else if (query.startsWith('if . == null')) result = value === null ? 'null' : value.digest;
else {
 const key = query.match(/^\\.([A-Za-z]+)/)?.[1];
 if (!key) throw new Error('Unexpected jq fixture query');
 result = value[key];
 if (result === undefined) result = query.includes('empty') ? '' : query.includes('/dev/null') ? '/dev/null' : query.includes('false') ? false : 0;
}
process.stdout.write(String(result) + '\\n');
`, { mode: 0o755 });
  const env = { ...process.env, PATH: `${root}/bin:${process.env.PATH}`, FIXTURE_ROOT: root };
  return { root, config, configPath, plain: (operation, args = [], extra = {}) => execute(script, [operation, ...args], { cwd: os.tmpdir(), env: { ...env, ...extra } }), invoke: (operation, args = []) => execute(script, [operation, ...args, '--config', configPath], { env }), run: (args = [], extra = {}) => execute(script, ['publish', '--config', configPath, ...args], { env: { ...env, ...extra } }), log: () => readFile(path.join(root, 'ssh.log'), 'utf8') };
}
test('retired authoring/publishing commands refuse before config, SSH or writes', async (t) => {
  const f = await fixture(t);
  const source = await readFile(path.join(f.root, 'source/note.md'));
  for (const operation of ['new', 'publish', 'push', 'rollback']) {
    await assert.rejects(f.plain(operation, ['--config', '/unavailable/private.json']), /Independent Memo authoring\/publishing is retired/u);
  }
  assert.deepEqual(await readFile(path.join(f.root, 'source/note.md')), source);
  assert.equal(await readCurrentHistory(f.config.deploymentRoot), null);
  await assert.rejects(f.log(), { code: 'ENOENT' });
  await assert.rejects(readFile(path.join(f.root, 'sam-env.log')), { code: 'ENOENT' });
});
test('legacy recovery build remains read-only and cannot promote', async (t) => {
  const f = await fixture(t);
  const source = await readFile(path.join(f.root, 'source/note.md'));
  const built = await f.invoke('build');
  const candidate = /validated local candidate: (.+)/u.exec(built.stdout)?.[1];
  assert.ok(candidate);
  assert.match(await readFile(path.join(candidate, 'public/index.html'), 'utf8'), /Initial owner Memo/u);
  assert.deepEqual(await readFile(path.join(f.root, 'source/note.md')), source);
  assert.equal(await readCurrentHistory(f.config.deploymentRoot), null);
  await assert.rejects(f.log(), { code: 'ENOENT' });
});
test('legacy recovery config still rejects malformed types and unsafe local overlap', async (t) => {
  const f = await fixture(t);
  for (const initialDeletionFloor of [false, null, '0', {}, [], -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    await writeFile(f.configPath, JSON.stringify({ ...f.config, initialDeletionFloor }));
    await assert.rejects(f.invoke('build'), /invalid publisher config/u);
  }
  for (const name of ['dist', 'artifacts', 'content/posts']) {
    const target = path.join(f.root, name);
    await mkdir(target, { recursive: true });
    await writeFile(path.join(target, 'sentinel.txt'), 'Preserved bytes');
    await writeFile(f.configPath, JSON.stringify({ ...f.config, outputRoot: target }));
    await assert.rejects(f.invoke('build'), /repository-local Memo output/u);
    assert.equal(await readFile(path.join(target, 'sentinel.txt'), 'utf8'), 'Preserved bytes');
  }
  await assert.rejects(f.log(), { code: 'ENOENT' });
});

function candidateFrom(result) {
  const match = /validated local candidate: (.+)/u.exec(result.stdout);
  assert.ok(match, result.stdout);
  return match[1];
}

test('recovery build defaults remain checkout-local and independent of caller cwd', async (t) => {
  const f = await fixture(t);
  await rm(path.join(f.root, '.firefly'), { recursive: true });
  await mkdir(path.join(f.root, 'content/memos'), { recursive: true });
  await writeFile(path.join(f.root, 'content/memos/published.md'), '---\nid: m_clone_note\ncreatedAt: 2026-10-06T00:00:00.000Z\ndraft: false\n---\n**Clone Markdown**\n\n- Local list item\n');
  const candidate = candidateFrom(await f.plain('build'));
  assert.ok(candidate.startsWith(path.join(f.root, '.firefly/memos/candidates/')));
  const html = await readFile(path.join(candidate, 'public/index.html'), 'utf8');
  assert.match(html, /<strong>Clone Markdown<\/strong>/u);
  assert.match(html, /<li>Local list item<\/li>/u);
  await writeFile(f.configPath, JSON.stringify({ displayName: 'Configured Owner' }));
  const configured = candidateFrom(await f.plain('build', ['--config', f.configPath]));
  assert.ok(configured.startsWith(path.join(f.root, '.firefly/memos/candidates/')));
  assert.match(await readFile(path.join(configured, 'public/index.html'), 'utf8'), /<strong>Configured Owner<\/strong>/u);
  await assert.rejects(f.log(), { code: 'ENOENT' });
});

test('recovery build keeps selected external sources and authoring mounts read-only', async (t) => {
  const f = await fixture(t);
  const external = await mkdtemp(path.join(os.tmpdir(), 'firefly-memo-selected-source-'));
  t.after(() => rm(external, { recursive: true, force: true }));
  const filename = path.join(external, 'external.md');
  await writeFile(filename, '---\nid: m_external_note\ncreatedAt: 2026-10-06T00:00:00.000Z\ndraft: false\n---\nExternal **selected** content\n');
  const before = await readFile(filename);
  await writeFile(f.configPath, JSON.stringify({ sourceRoot: external, displayName: 'External Owner' }));
  const candidate = candidateFrom(await f.plain('build', ['--config', f.configPath]));
  assert.match(await readFile(path.join(candidate, 'public/index.html'), 'utf8'), /External <strong>selected<\/strong>/u);
  assert.deepEqual(await readFile(filename), before);
  assert.deepEqual(await readdir(external), ['external.md']);
  const record = (await readFile(path.join(f.root, 'sam-env.log'), 'utf8')).split('\n');
  assert.deepEqual(record.slice(0, 4), [external, '', path.join(f.root, '.firefly/memos/candidates'), '0']);
  await assert.rejects(f.log(), { code: 'ENOENT' });
});

test('recovery build rejects unsafe default parents before creating inputs or output', async (t) => {
  const f = await fixture(t);
  await symlink(path.join(f.root, 'source'), path.join(f.root, 'content'));
  await assert.rejects(f.plain('build'), /nonsymlink regular directories/u);
  assert.equal((await readdir(path.join(f.root, 'source'))).includes('memos'), false);
  const output = await fixture(t);
  await rm(path.join(output.root, '.firefly'), { recursive: true });
  await symlink(path.join(output.root, 'source'), path.join(output.root, '.firefly'));
  await assert.rejects(output.plain('build'), /nonsymlink regular directories/u);
  await assert.rejects(readdir(path.join(output.root, 'content')), { code: 'ENOENT' });
});
