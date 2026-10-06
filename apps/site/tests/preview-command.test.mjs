import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

const execute = promisify(execFile);
const containerId = 'a'.repeat(64);

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'firefly-preview-command-'));
  await mkdir(path.join(root, 'tooling/shared'), { recursive: true });
  await mkdir(path.join(root, 'bin'));
  await copyFile(new URL('../../../preview.sh', import.meta.url), path.join(root, 'preview.sh'));
  await copyFile(new URL('../../../tooling/shared/dev-env.sh', import.meta.url), path.join(root, 'tooling/shared/dev-env.sh'));
  await writeFile(path.join(root, '.env'), 'SAM_BIND_HOST=0.0.0.0\nWEB_BIND_HOST=0.0.0.0\nWEB_HOST_PORT=7081\nWEB_CONTAINER_PORT=4321\nSAM_IMAGE=node:22-alpine\nSAM_IPC=private\n');
  for (const file of ['dist/index.html', 'dist/lab/index.html', 'dist/lab/majo/index.html', 'dist/lab/nerv/index.html', 'tooling/assemble-publication/dist/src/serve-release.js']) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), 'fixture');
  }
  await writeFile(path.join(root, 'dist/plugins.public.v1.json'), JSON.stringify({ schemaVersion: 1, plugins: { comments: { enabled: false }, memos: { enabled: false } } }));
  for (const folder of ['content/posts', 'content/pages', 'tooling/publish-memos/ops', 'tooling/plugin-access']) await mkdir(path.join(root, folder), { recursive: true });
  await writeFile(path.join(root, 'tooling/publish-memos/ops/check-runtime.sh'), '#!/usr/bin/env bash\nprintf "host-memo\\n" >> "$FIXTURE_LOG"\n', { mode: 0o755 });
  await writeFile(path.join(root, 'tooling/plugin-access/check-runtime.sh'), '#!/usr/bin/env bash\nprintf "host-plugins\\n" >> "$FIXTURE_LOG"\n', { mode: 0o755 });
  await writeFile(path.join(root, 'sam'), `#!/usr/bin/env bash
printf 'sam:%s:%s:%s:%s\\n' "$SAM_IMAGE" "$SAM_IPC" "\${FIREFLY_CONTENT_ROOT:-}" "$*" >> "$FIXTURE_LOG"
if [[ "\${SAM_DETACH:-}" == 1 ]]; then
  printf '%s' "$SAM_PREVIEW_CONFIG" > "$FIXTURE_ROOT/config-hash"
  printf '%s' "$SAM_PREVIEW_MODE" > "$FIXTURE_ROOT/mode"
  touch "$FIXTURE_ROOT/running"
  if [[ "$SAM_PREVIEW_MODE" == dev ]]; then mkdir -p "$FIXTURE_ROOT/apps/site/.astro"; touch "$FIXTURE_ROOT/apps/site/.astro/dev.json"; fi
  if [[ "\${FIXTURE_START_FAIL:-0}" == 1 ]]; then exit 19; fi
  if [[ "\${FIXTURE_START_SIGNAL:-0}" == 1 ]]; then kill -TERM "$PPID"; exit 0; fi
  printf '${containerId}\\n'
else
  if [[ "$*" == 'node tooling/assemble-publication/scripts/check-runtime-metadata.mjs' ]]; then
    exit "\${FIXTURE_METADATA_EXIT:-0}"
  fi
  printf '%s\\n' "$SAM_IMAGE" "$SAM_IPC" "$@"
  exit "\${FIXTURE_SAM_EXIT:-0}"
fi
`, { mode: 0o755 });
  await writeFile(path.join(root, 'bin/docker'), `#!/usr/bin/env bash
printf 'docker:%s\\n' "$*" >> "$FIXTURE_LOG"
case "$1" in
ps)
 if [[ -e "$FIXTURE_ROOT/removing" && "\${FIXTURE_REMOVE_STUCK:-0}" != 1 ]]; then
  read -r remaining < "$FIXTURE_ROOT/removing"
  if ((remaining == 0)); then rm -f "$FIXTURE_ROOT/running" "$FIXTURE_ROOT/removing"; else printf '%s\\n' "$((remaining-1))" > "$FIXTURE_ROOT/removing"; fi
 fi
 [[ ! -e "$FIXTURE_ROOT/running" ]] || printf '${containerId}\\n'
 ;;
context) printf '%s\\n' "\${FIXTURE_DOCKER_HOST:-unix:///var/run/docker.sock}" ;;
exec) [[ "\${FIXTURE_HEALTH:-ready}" == ready ]] || exit 1; printf '0.0.0.0\\n' ;;
inspect)
 if [[ "\${FIXTURE_INSPECT_GONE:-0}" == 1 ]]; then rm -f "$FIXTURE_ROOT/running"; printf 'Error: No such object: ${containerId}\\n' >&2; exit 1; fi
 if [[ "\${FIXTURE_INSPECT_ERROR:-0}" == 1 ]]; then printf 'Cannot connect to the Docker daemon\\n' >&2; exit 1; fi
 if [[ "$2" == --format ]]; then cat "$FIXTURE_ROOT/mode"; else node "$FIXTURE_ROOT/inspect.mjs"; fi
 ;;
stop)
 if [[ "\${FIXTURE_STOP_GONE:-0}" == 1 ]]; then rm -f "$FIXTURE_ROOT/running"; printf 'Error: No such container: ${containerId}\\n' >&2; exit 1; fi
 if [[ "\${FIXTURE_STOP_ERROR:-0}" == 1 ]]; then printf 'Cannot connect to the Docker daemon\\n' >&2; exit 1; fi
 if [[ "\${FIXTURE_REMOVE_DELAY:-0}" != 0 || "\${FIXTURE_REMOVE_STUCK:-0}" == 1 ]]; then printf '%s\\n' "\${FIXTURE_REMOVE_DELAY:-1}" > "$FIXTURE_ROOT/removing"; else rm -f "$FIXTURE_ROOT/running"; fi
 ;;
rm) rm -f "$FIXTURE_ROOT/running" "$FIXTURE_ROOT/removing" ;;
*) exit 3 ;;
esac
`, { mode: 0o755 });
  await writeFile(path.join(root, 'inspect.mjs'), `import { readFileSync } from 'node:fs';
const root=process.env.FIXTURE_ROOT;
const config=readFileSync(root+'/config-hash','utf8');
const mode=readFileSync(root+'/mode','utf8');
const bind=process.env.FIXTURE_BIND??'0.0.0.0';
const host=process.env.FIXTURE_PUBLISHED_PORT??'7081';
console.log(JSON.stringify([{State:{Running:true},Config:{Image:'node:22-alpine',Labels:{'sam.preview.config':config,'sam.preview.mode':mode}},HostConfig:{IpcMode:'private',PortBindings:{'4321/tcp':[{HostIp:bind,HostPort:'7081'}]}},NetworkSettings:{Ports:{'4321/tcp':[{HostIp:bind,HostPort:host}]}}}]));
`);
  // The browser image does not require host jq. The fixture supplies Docker's
  // inspection projections, keeping Docker/address behavior independent of it.
  await writeFile(path.join(root, 'bin/jq'), `#!/usr/bin/env node
import { readFileSync } from 'node:fs';
const args=process.argv.slice(2);
if(args[1]==='.plugins.memos.enabled') { console.log(JSON.parse(readFileSync(args[2],'utf8')).plugins.memos.enabled);process.exit(0); }
let input='';for await (const part of process.stdin) input+=part;
const json=JSON.parse(input)[0];const vars={};
for(let i=0;i<args.length;i++) if(args[i]==='--arg'){vars[args[i+1]]=args[i+2];i+=2;}
const query=args.at(-1);
if(query.includes('.State.Running and')) {
 const binding=json.HostConfig.PortBindings[vars.port];
 const valid=json.State.Running && json.Config.Labels['sam.preview.config']===vars.config && json.Config.Labels['sam.preview.mode']===vars.mode && json.Config.Image===vars.image && json.HostConfig.IpcMode===vars.ipc && binding?.length===1 && binding[0].HostIp===vars.bind && binding[0].HostPort===vars.host;
 process.exit(valid?0:1);
} else if(query.includes('@tsv')) {
 for(const binding of json.NetworkSettings.Ports[vars.port]??[]) console.log(binding.HostIp+'\\t'+binding.HostPort);
} else if(query.includes('keys[]')) {
 for(const key of Object.keys(json.NetworkSettings.Ports)) if(key.endsWith('/tcp')) console.log(key.split('/')[0]);
} else if(query.includes('sam.preview.mode')) console.log(json.Config.Labels['sam.preview.mode']);
else if(query.includes('State.Running')) console.log(json.State.Running);
else process.exit(3);
`, { mode: 0o755 });
  await writeFile(path.join(root, 'bin/ip'), `#!/usr/bin/env bash
[[ "\${FIXTURE_IP_FAIL:-0}" != 1 ]] || exit 7
printf '%s\\n' "\${FIXTURE_ADDRESSES:-lo UNKNOWN 127.0.0.1/8 ::1/128
eth0 UP 192.0.2.10/24 192.0.2.11/24 192.0.2.10/24
br0 UP 198.51.100.20/24
tun0 UNKNOWN 203.0.113.2/32
down0 DOWN 203.0.113.99/24}"
`, { mode: 0o755 });
  await writeFile(path.join(root, 'bin/sleep'), '#!/usr/bin/env bash\nexit 0\n', { mode: 0o755 });
  const env = { ...process.env, PATH: `${root}/bin:${process.env.PATH}`, FIXTURE_ROOT: root, FIXTURE_LOG: path.join(root, 'calls') };
  for (const key of Object.keys(env)) if (/^(SAM_|WEB_|FIREFLY_)/u.test(key)) delete env[key];
  return { root, env, run: (args = [], extra = {}) => execute('bash', [path.join(root, 'preview.sh'), ...args], { cwd: tmpdir(), env: { ...env, ...extra } }), log: () => readFile(path.join(root, 'calls'), 'utf8'), cleanup: () => rm(root, { recursive: true, force: true }) };
}

async function withFixture(work) {
  const f = await fixture();
  try { await work(f); } finally { await f.cleanup(); }
}

test('render preserves exact arguments, exit status, and pins browser environment', () => withFixture(async (f) => {
  await assert.rejects(f.run(['render', 'npm', 'argument with spaces', '$(not-a-command)'], { SAM_IMAGE: 'node:22-alpine', SAM_IPC: 'private', FIXTURE_SAM_EXIT: '17' }), (error) => {
    assert.equal(error.code, 17);
    assert.deepEqual(error.stdout.trimEnd().split('\n'), ['mcr.microsoft.com/playwright:v1.62.0-noble', 'host', 'npm', 'argument with spaces', '$(not-a-command)']);
    return true;
  });
}));

test('help and invalid arguments need no config or Docker', () => withFixture(async (f) => {
  await rm(path.join(f.root, '.env'));
  const help = await f.run(['--help']);
  assert.match(help.stderr, /Usage:/u);
  for (const args of [['render'], ['verify', 'extra'], ['start', 'extra'], ['package', 'extra'], ['unknown']]) await assert.rejects(f.run(args), { code: 2 });
  await assert.rejects(f.run(), (error) => error.code === 1 && /cp \.env.example \.env/u.test(error.stderr));
  await assert.rejects(f.log(), { code: 'ENOENT' });
}));

test('build chooses publication gate without starting services, including export builds', () => withFixture(async (f) => {
  await f.run(['build']);
  await f.run(['build'], { FIREFLY_COMMENTS_EXPORT: 'fixture/export.json' });
  const calls = await f.log();
  assert.match(calls, /npm run build:m4/u);
  assert.match(calls, /npm run build:m51/u);
  assert.doesNotMatch(calls, /docker:/u);
}));

test('dev rejects selected static Memo composition before validation or Docker startup', () => withFixture(async (f) => {
  const candidate = path.join(f.root, 'memo-candidate');
  await mkdir(candidate);
  await assert.rejects(f.run(['dev'], { FIREFLY_MEMOS_CANDIDATE: candidate }), (error) => {
    assert.match(error.stderr, /Memo composition requires the static publication preview; use start or preview instead of dev/u);
    return true;
  });
  await assert.rejects(f.log(), { code: 'ENOENT' });
  await assert.rejects(readFile(path.join(f.root, 'running')), { code: 'ENOENT' });
}));

test('verify forces tracked content and runs Memo plus plugin runtime fixtures only after the inner gate', () => withFixture(async (f) => {
  await f.run(['verify'], { FIREFLY_CONTENT_ROOT: '/private/owner' });
  let calls = await f.log();
  assert.match(calls, new RegExp(`sam:mcr\\.microsoft\\.com/playwright:v1\\.62\\.0-noble:host:${f.root}/content:npm run verify:m51\\nhost-memo\\nhost-plugins\\n`, 'u'));
  await writeFile(path.join(f.root, 'calls'), '');
  await assert.rejects(f.run(['verify'], { FIXTURE_SAM_EXIT: '23' }), { code: 23 });
  calls = await f.log();
  assert.doesNotMatch(calls, /host-memo|host-plugins/u);
}));

test('start, repeat start and status share clean complete host-address summary and exact stop ownership', () => withFixture(async (f) => {
  const first = await f.run();
  const repeated = await f.run(['start']);
  const status = await f.run(['status']);
  assert.equal(first.stdout, repeated.stdout);
  assert.equal(first.stdout, status.stdout);
  assert.match(first.stdout, /^System is ready\.\n\nOpen:\nWebsite \(web\):/u);
  for (const address of ['192.0.2.10', '192.0.2.11', '198.51.100.20', '203.0.113.2']) {
    for (const suffix of ['', '/lab/', '/lab/majo/', '/lab/nerv/']) assert.equal(first.stdout.split(`http://${address}:7081${suffix}\n`).length - 1, 1);
  }
  assert.doesNotMatch(first.stdout, /203\.0\.113\.99|http:\/\/0\.0\.0\.0|sam:|container ID/u);
  assert.match(first.stdout, /Local only \(preview host\):\nWebsite \(web\):\nhttp:\/\/127\.0\.0\.1:7081/u);
  const calls = await f.log();
  assert.equal(calls.split('\n').filter((line) => line.includes(':env PUBLICATION_PORT=')).length, 1);
  assert.equal(calls.split('node tooling/assemble-publication/scripts/check-runtime-metadata.mjs').length - 1, 2);
  assert.match(calls, /--filter label=sam\.scope=preview\.sh --filter label=sam\.service=web/u);
  await f.run(['stop']);
  await f.run(['down']);
  await assert.rejects(f.run(['status']), (error) => error.code === 1 && !error.stdout.includes('System is ready.'));
}));

test('mode/config changes preserve the running preview and require explicit stop', () => withFixture(async (f) => {
  await f.run();
  await assert.rejects(f.run(['start'], { WEB_HOST_PORT: '9000' }), (error) => error.code === 1 && /configuration differs/u.test(error.stderr));
  assert.doesNotMatch(await f.log(), /docker:(stop|rm)/u);
}));

test('static preview rejects unsafe activation and enabled Memo without a selected artifact before service startup', () => withFixture(async (f) => {
  await assert.rejects(f.run([], { FIXTURE_METADATA_EXIT: '26' }), { code: 26 });
  assert.doesNotMatch(await f.log(), /:env PUBLICATION_PORT=/u);
  await writeFile(path.join(f.root, 'dist/plugins.public.v1.json'), JSON.stringify({ schemaVersion: 1, plugins: { comments: { enabled: false }, memos: { enabled: true } } }));
  await assert.rejects(f.run(), (error) => error.code === 1 && /enabled Memo preview\/package requires/u.test(error.stderr));
  assert.doesNotMatch(await f.log(), /:env PUBLICATION_PORT=/u);
}));

test('activation changes require a fresh preview instead of silently reusing its old gate snapshot', () => withFixture(async (f) => {
  await f.run();
  await writeFile(path.join(f.root, 'dist/plugins.public.v1.json'), JSON.stringify({ schemaVersion: 1, plugins: { comments: { enabled: true }, memos: { enabled: false } } }));
  await assert.rejects(f.run(['start']), (error) => error.code === 1 && /configuration differs/u.test(error.stderr));
  assert.doesNotMatch(await f.log(), /docker:(stop|rm)/u);
}));

test('status reports actual mapping instead of newly configured host port', () => withFixture(async (f) => {
  await f.run();
  const status = await f.run(['status'], { WEB_HOST_PORT: '9000', FIXTURE_PUBLISHED_PORT: '8088' });
  assert.match(status.stdout, /http:\/\/192\.0\.2\.10:8088/u);
  assert.doesNotMatch(status.stdout, /:9000/u);
}));

test('wildcard discovery failure/remote daemon fails before startup, empty discovery is explicit', () => withFixture(async (f) => {
  await assert.rejects(f.run([], { FIXTURE_IP_FAIL: '1' }), (error) => error.code === 1 && /host discovery failed/u.test(error.stderr));
  await assert.rejects(f.run([], { DOCKER_HOST: 'ssh://fixture', FIXTURE_DOCKER_HOST: 'ssh://fixture' }), (error) => error.code === 1 && /remote Docker host/u.test(error.stderr));
  assert.doesNotMatch(await f.log(), /sam:/u);
  const ready = await f.run([], { FIXTURE_ADDRESSES: 'lo UNKNOWN 127.0.0.1/8' });
  assert.doesNotMatch(ready.stdout, /\nOpen:/u);
  assert.match(ready.stdout, /No non-loopback host address found\./u);
}));

test('failed readiness removes only its newly created container and never prints success', () => withFixture(async (f) => {
  await assert.rejects(f.run([], { FIXTURE_HEALTH: 'unready' }), (error) => error.code === 1 && /web readiness timed out/u.test(error.stderr) && !error.stdout.includes('System is ready.'));
  assert.match(await f.log(), new RegExp(`docker:rm -f ${containerId}`, 'u'));
  assert.doesNotMatch(await f.log(), /docker:stop/u);
}));

test('failed or interrupted detached creation recovers only its exact named startup container', () => withFixture(async (f) => {
  for (const extra of [{ FIXTURE_START_FAIL: '1' }, { FIXTURE_START_SIGNAL: '1' }]) {
    await writeFile(path.join(f.root, 'calls'), '');
    await assert.rejects(f.run([], extra), (error) => {
      assert.ok([19, 1, 143].includes(error.code));
      assert.doesNotMatch(error.stdout, /System is ready/u);
      return true;
    });
    const calls = await f.log();
    assert.match(calls, /--filter label=sam\.scope=preview\.sh --filter label=sam\.service=web --filter name=\^\/firefly-preview-[A-Za-z0-9]+\$/u);
    assert.match(calls, new RegExp(`docker:rm -f ${containerId}`, 'u'));
    await assert.rejects(readFile(path.join(f.root, 'running')), { code: 'ENOENT' });
  }
}));

test('failed ready-summary output cleans the newly started service', () => withFixture(async (f) => {
  await assert.rejects(execute('bash', ['-c', 'set -o pipefail; bash "$1" | head -n 0', 'fixture', path.join(f.root, 'preview.sh')], { cwd: tmpdir(), env: f.env }));
  assert.match(await f.log(), new RegExp(`docker:rm -f ${containerId}`, 'u'));
  await assert.rejects(readFile(path.join(f.root, 'running')), { code: 'ENOENT' });
}));

test('publication teardown preserves unrelated Astro lock; owned dev teardown removes it', () => withFixture(async (f) => {
  const lock = path.join(f.root, 'apps/site/.astro/dev.json');
  await mkdir(path.dirname(lock), { recursive: true });
  await writeFile(lock, 'manual dev');
  await f.run();
  await f.run(['stop']);
  assert.equal(await readFile(lock, 'utf8'), 'manual dev');
  await f.run();
  await writeFile(path.join(f.root, 'mode'), 'dev');
  await f.run(['stop']);
  await assert.rejects(readFile(lock), { code: 'ENOENT' });
}));

test('stop waits for delayed auto-removal before an immediate down', () => withFixture(async (f) => {
  await f.run();
  await writeFile(path.join(f.root, 'calls'), '');
  await f.run(['stop'], { FIXTURE_REMOVE_DELAY: '3' });
  await assert.rejects(readFile(path.join(f.root, 'running')), { code: 'ENOENT' });
  await assert.rejects(readFile(path.join(f.root, 'removing')), { code: 'ENOENT' });
  const polls = (await f.log()).split('\n').filter((line) => line.includes(`--filter id=${containerId}`));
  assert.equal(polls.length, 4);
  assert.ok(polls.every((line) => line.includes('--filter label=sam.scope=preview.sh --filter label=sam.service=web')));
  const repeated = await f.run(['down']);
  assert.match(repeated.stderr, /no preview containers found/u);
}));

test('stop tolerates disappearance between its snapshot, inspect, and stop', () => withFixture(async (f) => {
  for (const extra of [{ FIXTURE_INSPECT_GONE: '1' }, { FIXTURE_STOP_GONE: '1' }]) {
    await f.run();
    await f.run(['stop'], extra);
    await assert.rejects(readFile(path.join(f.root, 'running')), { code: 'ENOENT' });
    await f.run(['down']);
  }
}));

test('stop preserves genuine inspect/stop errors and bounds removal waiting', () => withFixture(async (f) => {
  await f.run();
  for (const extra of [{ FIXTURE_INSPECT_ERROR: '1' }, { FIXTURE_STOP_ERROR: '1' }]) {
    await assert.rejects(f.run(['stop'], extra), (error) => error.code === 1 && /Cannot connect to the Docker daemon/u.test(error.stderr));
    await readFile(path.join(f.root, 'running'));
  }
  await writeFile(path.join(f.root, 'calls'), '');
  await assert.rejects(f.run(['stop'], { FIXTURE_REMOVE_STUCK: '1' }), (error) => error.code === 1 && /removal timed out/u.test(error.stderr));
  const polls = (await f.log()).split('\n').filter((line) => line.includes(`--filter id=${containerId}`));
  assert.equal(polls.length, 40);
}));

test('failed owned dev startup removes its generated Astro lock', () => withFixture(async (f) => {
  const astro = path.join(f.root, 'apps/site/node_modules/.bin/astro');
  await mkdir(path.dirname(astro), { recursive: true });
  await writeFile(astro, '#!/usr/bin/env bash\nexit 0\n', { mode: 0o755 });
  await assert.rejects(f.run(['dev'], { FIXTURE_HEALTH: 'failed' }));
  assert.match(await f.log(), new RegExp(`docker:rm -f ${containerId}`, 'u'));
  await assert.rejects(readFile(path.join(f.root, 'apps/site/.astro/dev.json')), { code: 'ENOENT' });
}));

test('.env values remain literal, exported environment wins, malformed configuration is rejected', () => withFixture(async (f) => {
  const sideEffect = path.join(f.root, 'must-not-exist');
  await writeFile(path.join(f.root, '.env'), `FIREFLY_CONTENT_ROOT="$(touch ${sideEffect})"\r\nSAM_IMAGE=custom\r\nSAM_IPC=private\r\n`);
  await f.run(['build']);
  assert.ok((await f.log()).includes(`$(touch ${sideEffect})`));
  await assert.rejects(readFile(sideEffect), { code: 'ENOENT' });
  await f.run(['render', 'node'], { FIREFLY_CONTENT_ROOT: '' });
  assert.match(await f.log(), /sam:mcr\.microsoft\.com\/playwright:v1\.62\.0-noble:host::node/u);
  await writeFile(path.join(f.root, '.env'), 'SAM_IPC=host\nSAM_IPC=private\n');
  await assert.rejects(f.run(['build']), { code: 2 });
  await writeFile(path.join(f.root, '.env'), 'SAM_IMAGE="missing-end\n');
  await assert.rejects(f.run(['build']), { code: 2 });
}));

test('ready status respects loopback, specific, and IPv6 exposure without wildcard URLs', () => withFixture(async (f) => {
  await f.run();
  const loopback = await f.run(['status'], { FIXTURE_BIND: '127.0.0.1', SAM_BIND_HOST: '127.0.0.1' });
  assert.doesNotMatch(loopback.stdout, /\nOpen:/u);
  assert.match(loopback.stdout, /Local only \(preview host\):/u);
  const specific = await f.run(['status'], { FIXTURE_BIND: '203.0.113.9', SAM_BIND_HOST: '203.0.113.9' });
  assert.match(specific.stdout, /http:\/\/203\.0\.113\.9:7081/u);
  assert.doesNotMatch(specific.stdout, /http:\/\/192\.0\.2\.10/u);
  const ipv6 = await f.run(['status'], { FIXTURE_BIND: '::', SAM_BIND_HOST: '::', FIXTURE_ADDRESSES: 'eth0 UP 2001:db8::10/64 fe80::1/64\nlo UNKNOWN ::1/128' });
  assert.match(ipv6.stdout, /http:\/\/\[2001:db8::10\]:7081/u);
  assert.match(ipv6.stdout, /http:\/\/\[::1\]:7081/u);
  assert.doesNotMatch(ipv6.stdout, /http:\/\/\[::\]|fe80::1/u);
}));

test('bracketed IPv6 configuration is canonical for repeated start', () => withFixture(async (f) => {
  const extra = { SAM_BIND_HOST: '[::]', FIXTURE_BIND: '::' };
  const first = await f.run([], extra);
  const repeated = await f.run(['start'], extra);
  assert.equal(first.stdout, repeated.stdout);
  assert.match(first.stdout, /http:\/\/\[::1\]:7081/u);
}));

test('sam constructs Docker IPv6 publish arguments with exactly one bracket pair', () => withFixture(async (f) => {
  await copyFile(new URL('../../../sam', import.meta.url), path.join(f.root, 'sam'));
  await writeFile(path.join(f.root, 'bin/docker'), '#!/usr/bin/env bash\nprintf "%s\\n" "$@"\n', { mode: 0o755 });
  for (const bind of ['::', '[::]', '2001:db8::10']) {
    const result = await execute('bash', [path.join(f.root, 'sam'), 'node', '--version'], { cwd: tmpdir(), env: { ...f.env, SAM_SERVICE: 'web', SAM_BIND_HOST: bind } });
    const address = bind.startsWith('[') ? bind : `[${bind}]`;
    assert.ok(result.stdout.split('\n').includes(`${address}:7081:4321`));
  }
}));

test('verify diagnostic overrides are explicit environment only, and stopped cleanup ignores malformed env', () => withFixture(async (f) => {
  await f.run(['verify'], { SAM_IMAGE: 'diagnostic-image', SAM_IPC: 'private' });
  assert.match(await f.log(), /sam:diagnostic-image:private:/u);
  await writeFile(path.join(f.root, '.env'), 'broken input\n');
  await f.run(['stop']);
}));

test('empty service configuration and missing ip fail before detached creation', () => withFixture(async (f) => {
  const original = await readFile(path.join(f.root, '.env'), 'utf8');
  await writeFile(path.join(f.root, '.env'), '');
  await assert.rejects(f.run(), (error) => error.code === 1 && /required preview setting/u.test(error.stderr));
  await assert.rejects(f.log(), { code: 'ENOENT' });
  await writeFile(path.join(f.root, '.env'), original);
  await rm(path.join(f.root, 'bin/ip'));
  await symlink('/bin/bash', path.join(f.root, 'bin/bash'));
  await symlink('/usr/bin/dirname', path.join(f.root, 'bin/dirname'));
  await assert.rejects(f.run([], { PATH: path.join(f.root, 'bin') }), (error) => error.code === 127 && /required command not found: ip/u.test(error.stderr));
}));

test('package chooses export-aware renderer build and short-circuits before Docker on build failure', () => withFixture(async (f) => {
  // Packaging dependencies are host tools. This fixture stops at the renderer
  // boundary and supplies names only where the browser image lacks them.
  for (const name of ['curl', 'cut', 'find', 'rg', 'sed', 'sort']) {
    await writeFile(path.join(f.root, 'bin', name), '#!/usr/bin/env bash\nexit 0\n', { mode: 0o755 });
  }
  await assert.rejects(f.run(['package'], { FIXTURE_SAM_EXIT: '31' }), { code: 31 });
  await assert.rejects(f.run(['package'], { FIREFLY_COMMENTS_EXPORT: '/fixture/comments.json', FIXTURE_SAM_EXIT: '32' }), { code: 32 });
  const calls = await f.log();
  assert.match(calls, /npm run build:m4/u);
  assert.match(calls, /npm run build:m51/u);
  assert.doesNotMatch(calls, /docker:/u);
}));
