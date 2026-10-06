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
test('dry-run reads strict-key state, validates independently and performs no upload or promotion', async (t) => {
  const f = await fixture(t);
  await f.run(['--dry-run']);
  assert.equal(await readCurrentHistory(f.config.deploymentRoot), null);
  const log = await f.log();
  assert.match(log, /StrictHostKeyChecking=yes/u);
  assert.match(log, /PasswordAuthentication=no/u);
  assert.match(log, /-F \/dev\/null/u);
  assert.match(log, /--network none/u);
  assert.doesNotMatch(log, /\btar\b|\bmkdir\b|'promote'/u);
});
test('publish automatically uploads only Memo, ambiguous disconnect inspects matching receipt', async (t) => {
  const f = await fixture(t);
  await f.run([], { FIXTURE_AMBIGUOUS: '1' });
  const first = await readCurrentHistory(f.config.deploymentRoot);
  assert.equal(first.sequence, 1);
  assert.match(await f.log(), /'state'.*'promote'.*'state'/su);
  await writeFile(path.join(f.root, 'source/note.md'), '---\nid: m_host_fixture\ncreatedAt: 2026-10-06T00:00:00.000Z\ndraft: false\n---\nEdited owner Memo\n');
  await f.run();
  assert.equal((await readCurrentHistory(f.config.deploymentRoot)).sequence, 2);
  assert.doesNotMatch(await f.log(), /blog|posts|pages|ssh_config.*--mount/u);
});
test('transfer and promotion failures preserve accepted public and history', async (t) => {
  const f = await fixture(t);
  await f.run();
  const accepted = await readCurrentHistory(f.config.deploymentRoot);
  for (const mode of ['FIXTURE_FAIL_UPLOAD', 'FIXTURE_REJECT_PROMOTE']) {
    await assert.rejects(f.run([], { [mode]: '1' }));
    assert.deepEqual(await readCurrentHistory(f.config.deploymentRoot), accepted);
  }
});
test('config modes and unsafe remote paths fail before SSH', async (t) => {
  const f = await fixture(t);
  await chmod(f.configPath, 0o644);
  await assert.rejects(f.run(), /owner-owned 0600/u);
  await chmod(f.configPath, 0o600);
  await writeFile(f.configPath, JSON.stringify({ ...f.config, deploymentRoot: '/tmp/unsafe;echo' }));
  await assert.rejects(f.run(), /unsafe remote destination/u);
  await assert.rejects(f.log(), { code: 'ENOENT' });
});

test('present migration floor and optional fields reject malformed types before publication', async (t) => {
  const f = await fixture(t);
  for (const initialDeletionFloor of [false, null, '0', {}, [], -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    await writeFile(f.configPath, JSON.stringify({ ...f.config, initialDeletionFloor }));
    await assert.rejects(f.run(), /invalid publisher config/u);
  }
  for (const remoteSudo of [null, 0, 'false', {}, []]) {
    await writeFile(f.configPath, JSON.stringify({ ...f.config, remoteSudo }));
    await assert.rejects(f.run(), /invalid publisher config/u);
  }
  for (const key of ['sourceRoot', 'outputRoot', 'assetsRoot', 'deploymentRoot', 'sshTarget', 'knownHosts', 'sshConfig', 'remoteImage']) {
    for (const value of [null, false, 0, '']) {
      await writeFile(f.configPath, JSON.stringify({ ...f.config, [key]: value }));
      await assert.rejects(f.run(), /invalid publisher config/u);
    }
  }
  assert.equal(await readCurrentHistory(f.config.deploymentRoot), null);
  await assert.rejects(f.log(), { code: 'ENOENT' });
});

test('host absolute repository aliases cannot target blog output or source', async (t) => {
  const f = await fixture(t);
  for (const name of ['dist', 'artifacts', 'content/posts']) {
    const target = path.join(f.root, name);
    await mkdir(target, { recursive: true });
    await writeFile(path.join(target, 'sentinel.txt'), 'Preserved blog bytes');
    await writeFile(f.configPath, JSON.stringify({ ...f.config, outputRoot: target }));
    await assert.rejects(f.run(), /repository-local Memo output/u);
    assert.equal(await readFile(path.join(target, 'sentinel.txt'), 'utf8'), 'Preserved blog bytes');
  }
  await writeFile(f.configPath, JSON.stringify({ ...f.config, sourceRoot: path.join(f.root, 'content/posts') }));
  await assert.rejects(f.run(), /Memo source cannot overlap blog/u);
  await assert.rejects(f.log(), { code: 'ENOENT' });
});

test('new/build/local publish and local dry-run need no SSH or blog', async (t) => {
  const f = await fixture(t);
  await f.invoke('new', ['second-note']);
  assert.match(await readFile(path.join(f.root, 'content/memos/second-note.md'), 'utf8'), /draft: true/u);
  await f.invoke('build');
  assert.equal(await readCurrentHistory(f.config.deploymentRoot), null);
  await f.run(['--local']);
  const accepted = await readCurrentHistory(f.config.deploymentRoot);
  assert.equal(accepted.sequence, 1);
  await f.run(['--local', '--dry-run']);
  assert.deepEqual(await readCurrentHistory(f.config.deploymentRoot), accepted);
  await assert.rejects(f.log(), { code: 'ENOENT' });
});

async function publicNote(root, name = 'published.md') {
  await mkdir(path.join(root, 'content/memos'), { recursive: true });
  await writeFile(path.join(root, 'content/memos', name), '---\nid: m_clone_note\ncreatedAt: 2026-10-06T00:00:00.000Z\ndraft: false\n---\n**Clone Markdown**\n\n- Local list item\n');
}
function candidateFrom(result) {
  const match = /validated local candidate: (.+)/u.exec(result.stdout);
  assert.ok(match, result.stdout);
  return match[1];
}
test('copied checkout default new is cwd-independent, absent-only and mounts only its local authoring root', async (t) => {
  const f = await fixture(t);
  await rm(path.join(f.root, '.firefly'), { recursive: true });
  const defaultSource = path.join(f.root, 'content/memos');
  await f.plain('new', ['clone-note'], { SAM_MEMOS_HISTORY_ROOT: '/unusable/external/history', FIREFLY_MEMOS_CANDIDATE: '/unusable/external/candidate' });
  const filename = path.join(defaultSource, 'clone-note.md');
  const draft = await readFile(filename, 'utf8');
  assert.match(draft, /id: m_[A-Za-z0-9_-]+\ncreatedAt: [^\n]+Z\ndraft: true/u);
  await assert.rejects(f.plain('new', ['clone-note']), /destination or publication lock already exists/u);
  assert.equal(await readFile(filename, 'utf8'), draft);
  await assert.rejects(readFile(path.join(f.root, '.firefly/memos/candidates')), { code: 'ENOENT' });
  const mountRecords = (await readFile(path.join(f.root, 'sam-env.log'), 'utf8')).trimEnd().split('\n');
  assert.deepEqual(mountRecords.slice(0, 4), [defaultSource, '', '', '1']);
  assert.equal((await readdir(path.join(f.root, 'source'))).includes('clone-note.md'), false);
});
test('new accepts but never reads config or redirects into its external source', async (t) => {
  const f = await fixture(t);
  const before = await readFile(path.join(f.root, 'source/note.md'), 'utf8');
  await f.plain('new', ['configured-note', '--config', f.configPath]);
  assert.match(await readFile(path.join(f.root, 'content/memos/configured-note.md'), 'utf8'), /draft: true/u);
  assert.equal(await readFile(path.join(f.root, 'source/note.md'), 'utf8'), before);
  assert.equal((await readdir(path.join(f.root, 'source'))).includes('configured-note.md'), false);
  await f.plain('new', ['missing-config-note', '--config', path.join(f.root, 'unavailable.json')]);
  assert.match(await readFile(path.join(f.root, 'content/memos/missing-config-note.md'), 'utf8'), /draft: true/u);
});
test('default build renders checkout Markdown and omitted config roots resolve in the copied checkout', async (t) => {
  const f = await fixture(t);
  await rm(path.join(f.root, '.firefly'), { recursive: true });
  await publicNote(f.root);
  const candidate = candidateFrom(await f.plain('build'));
  assert.ok(candidate.startsWith(path.join(f.root, '.firefly/memos/candidates/')));
  const html = await readFile(path.join(candidate, 'public/index.html'), 'utf8');
  assert.match(html, /<strong>Clone Markdown<\/strong>/u);
  assert.match(html, /<li>Local list item<\/li>/u);
  assert.match(html, /<strong>Owner<\/strong>/u);
  await writeFile(f.configPath, JSON.stringify({ displayName: 'Configured Owner' }));
  const configured = candidateFrom(await f.plain('build', ['--config', f.configPath]));
  assert.ok(configured.startsWith(path.join(f.root, '.firefly/memos/candidates/')));
  assert.match(await readFile(path.join(configured, 'public/index.html'), 'utf8'), /<strong>Configured Owner<\/strong>/u);
  await assert.rejects(f.log(), { code: 'ENOENT' });
});
test('explicit external build source stays read-only and cannot redirect new', async (t) => {
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
  const record = (await readFile(path.join(f.root, 'sam-env.log'), 'utf8')).split('\n');
  assert.deepEqual(record.slice(0, 4), [external, '', path.join(f.root, '.firefly/memos/candidates'), '0']);
  await f.plain('new', ['local-only', '--config', f.configPath]);
  assert.deepEqual(await readdir(external), ['external.md']);
  assert.match(await readFile(path.join(f.root, 'content/memos/local-only.md'), 'utf8'), /draft: true/u);
});
test('unsafe default parents are refused before source/output creation', async (t) => {
  for (const operation of ['new', 'build']) {
    const f = await fixture(t);
    const outside = path.join(f.root, 'source');
    await symlink(outside, path.join(f.root, 'content'));
    await assert.rejects(f.plain(operation, operation === 'new' ? ['note'] : []), /nonsymlink regular directories/u);
    assert.equal((await readdir(outside)).includes('memos'), false);
  }
  const f = await fixture(t);
  await rm(path.join(f.root, '.firefly'), { recursive: true });
  await symlink(path.join(f.root, 'source'), path.join(f.root, '.firefly'));
  await assert.rejects(f.plain('build'), /nonsymlink regular directories/u);
  await assert.rejects(readdir(path.join(f.root, 'content')), { code: 'ENOENT' });
});
test('explicit configs require display identity and reject present null/wrong optional roots before defaults are created', async (t) => {
  const f = await fixture(t);
  await rm(path.join(f.root, '.firefly'), { recursive: true });
  for (const raw of [{}, { displayName: null }, { displayName: false }, { displayName: 'Owner', sourceRoot: null }, { displayName: 'Owner', outputRoot: false }]) {
    await writeFile(f.configPath, JSON.stringify(raw));
    await assert.rejects(f.plain('build', ['--config', f.configPath]), /invalid publisher config/u);
  }
  await assert.rejects(readdir(path.join(f.root, 'content')), { code: 'ENOENT' });
  await assert.rejects(f.plain('publish'), /--config is required/u);
  await assert.rejects(f.plain('rollback'), /--config is required/u);
});
