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
  await writeFile(path.join(root, 'dist/plugins.public.v2.json'), JSON.stringify({ schemaVersion: 2, plugins: { comments: { enabled: false } } }));
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
  [[ -z "\${FIXTURE_START_LOG:-}" ]] || printf '%s\\n' "$FIXTURE_START_LOG" >&2
  if [[ "\${FIXTURE_START_FAIL:-0}" == 1 ]]; then exit 19; fi
  if [[ "\${FIXTURE_START_SIGNAL:-0}" == 1 ]]; then kill -TERM "$PPID"; exit 0; fi
  printf '${containerId}\\n'
else
  if [[ "$*" == 'node tooling/assemble-publication/scripts/check-runtime-metadata.mjs' ]]; then
    exit "\${FIXTURE_METADATA_EXIT:-0}"
  fi
  [[ -z "\${FIXTURE_BUILD_LOG:-}" ]] || printf '%s\\n' "$FIXTURE_BUILD_LOG"
  printf '%s\\n' "$SAM_IMAGE" "$SAM_IPC" "$@"
  exit "\${FIXTURE_SAM_EXIT:-0}"
fi
`, { mode: 0o755 });
  await writeFile(path.join(root, 'bin/docker'), `#!/usr/bin/env bash
printf 'docker:%s\\n' "$*" >> "$FIXTURE_LOG"
if [[ "$*" == *--help* ]]; then
 [[ "\${FIXTURE_UNSUPPORTED_OP:-}" != "$1" && "\${FIXTURE_HELP_FAIL:-0}" != 1 ]] || exit 3
 printf 'Fixture Docker CLI --format\\n'
 exit 0
fi
case "$1" in
ps)
 [[ "\${FIXTURE_DAEMON_FAIL:-0}" != 1 ]] || exit 42
 if [[ "$*" == *'--filter id='* && "\${FIXTURE_FOREIGN_OWNER:-0}" == 1 ]]; then exit 0; fi
 if [[ -e "$FIXTURE_ROOT/removing" && "\${FIXTURE_REMOVE_STUCK:-0}" != 1 ]]; then
  read -r remaining < "$FIXTURE_ROOT/removing"
  if ((remaining == 0)); then rm -f "$FIXTURE_ROOT/running" "$FIXTURE_ROOT/removing"; else printf '%s\\n' "$((remaining-1))" > "$FIXTURE_ROOT/removing"; fi
 fi
 [[ ! -e "$FIXTURE_ROOT/running" ]] || printf '${containerId}\\n'
 ;;
context)
 [[ "\${FIXTURE_CONTEXT_FAIL:-0}" != 1 ]] || exit 4
 printf '%s\\n' "\${FIXTURE_DOCKER_HOST:-unix:///var/run/docker.sock}"
 ;;
exec) [[ "\${FIXTURE_HEALTH:-ready}" == ready ]] || exit 1; printf '0.0.0.0\\n' ;;
logs)
 [[ "\${FIXTURE_LOG_HANG:-0}" != 1 ]] || /usr/bin/sleep 20
 printf '%s\\n' "\${FIXTURE_SERVICE_LOG:-Application fixture log}"
 [[ "\${FIXTURE_LOG_FAIL:-0}" != 1 ]] || exit 43
 ;;
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
const args=process.argv.slice(2);
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
  for (const key of Object.keys(env)) if (/^(SAM_|WEB_|FIREFLY_|DOCKER_|COMMENTS_|MEMOS_)/u.test(key)) delete env[key];
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

test('active preview rejects retired independent Memo composition before Docker startup', () => withFixture(async (f) => {
  const candidate = path.join(f.root, 'memo-candidate');
  await mkdir(candidate);
  for (const command of ['dev', 'start', 'preview', 'package']) {
    await assert.rejects(f.run([command], { FIREFLY_MEMOS_CANDIDATE: candidate }), (error) => {
      assert.match(error.stderr, /FIREFLY_MEMOS_CANDIDATE is retired for active previews\/packages/u);
      return true;
    });
  }
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

test('static preview rejects unsafe activation and retained v1 releases before service startup', () => withFixture(async (f) => {
  await assert.rejects(f.run([], { FIXTURE_METADATA_EXIT: '26' }), { code: 26 });
  assert.doesNotMatch(await f.log(), /:env PUBLICATION_PORT=/u);
  await rm(path.join(f.root, 'dist/plugins.public.v2.json'));
  await writeFile(path.join(f.root, 'dist/plugins.public.v1.json'), JSON.stringify({ schemaVersion: 1, plugins: { comments: { enabled: false }, memos: { enabled: true } } }));
  await assert.rejects(f.run(), (error) => error.code === 1 && /requires an integrated version-2 release/u.test(error.stderr));
  assert.doesNotMatch(await f.log(), /:env PUBLICATION_PORT=/u);
}));

test('activation changes require a fresh preview instead of silently reusing its old gate snapshot', () => withFixture(async (f) => {
  await f.run();
  await writeFile(path.join(f.root, 'dist/plugins.public.v2.json'), JSON.stringify({ schemaVersion: 2, plugins: { comments: { enabled: true } } }));
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
  for (const [extra, expectedStatus] of [[{ FIXTURE_START_FAIL: '1' }, 19], [{ FIXTURE_START_SIGNAL: '1' }, 143]]) {
    await writeFile(path.join(f.root, 'calls'), '');
    await assert.rejects(f.run([], extra), (error) => {
      assert.equal(error.code, expectedStatus);
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
    await assert.rejects(f.run(['stop'], extra), (error) => error.code === 1 && /check Docker daemon access/u.test(error.stderr));
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
  await symlink('/usr/bin/timeout', path.join(f.root, 'bin/timeout'));
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

test('verbose flags preserve ready summaries and use bounded owned logs on stderr', () => withFixture(async (f) => {
  const normal = await f.run();
  assert.doesNotMatch(await f.log(), /docker:logs --tail/u);
  const verbose = await f.run(['start', '--verbose'], { FIXTURE_SERVICE_LOG: 'A safe web diagnostic' });
  assert.equal(verbose.stdout, normal.stdout);
  assert.match(verbose.stderr, /\[log\] A safe web diagnostic/u);
  const status = await f.run(['--verbose', 'status']);
  assert.equal(status.stdout, normal.stdout);
  const calls = await f.log();
  assert.match(calls, new RegExp(`--filter label=sam\\.repo=${f.root} --filter label=sam\\.scope=preview\\.sh --filter label=sam\\.service=web --filter id=${containerId}`, 'u'));
  assert.match(calls, new RegExp(`docker:logs --tail 80 ${containerId}`, 'u'));
  for (const command of ['verify', 'package', 'render']) await assert.rejects(f.run(['--verbose', command]), { code: 2 });
  const build = await f.run(['build', '--verbose']);
  assert.match(build.stderr, /Building publication/u);
  assert.match(build.stderr, /\[log\] build:m4/u);
  assert.equal(build.stdout, '');
  const stop = await f.run(['stop', '--verbose']);
  assert.match(stop.stderr, /Stopping selected owned web container/u);
  await f.run(['down', '--verbose']);
}));

test('failure and verbose logs mask literal/encoded secrets, accounts, auth URLs and bearer tokens', () => withFixture(async (f) => {
  const password = 'dollar$[bracket]/secret';
  const account = 'private-owner-fixture';
  const token = 'injected-token-fixture';
  const payload = `Watcher is running: Error: import failed\n${password}\n${encodeURIComponent(password)}\n${account}\n${token}\nhttps://unconfigured-user:unconfigured-pass@example.test/private\nAuthorization: bEaReR unknown-bearer-fixture\nunknown-person@example.test\n\u001b[31mBearer\u001b[0m hidden-by-color-fixture`;
  const extra = { COMMENTS_PASSWORD: password, COMMENTS_USERNAME: account, FIREFLY_PREVIEW_TOKEN: token, FIXTURE_SERVICE_LOG: payload, FIXTURE_START_LOG: `Wrapper diagnostic ${password}` };
  const assertSafe = (result) => {
    assert.match(result.stderr, /Error: import failed/u);
    assert.match(result.stderr, /\[REDACTED\]/u);
    for (const value of [password, encodeURIComponent(password), account, token, 'unconfigured-user', 'unconfigured-pass', 'unknown-bearer-fixture', 'unknown-person', 'hidden-by-color-fixture']) assert.ok(!result.stderr.includes(value), `leaked ${value}`);
    assert.doesNotMatch(result.stderr, /\u001b/u);
  };
  await assert.rejects(f.run([], { ...extra, FIXTURE_HEALTH: 'failed' }), (error) => {
    assert.equal(error.code, 1);
    assert.doesNotMatch(error.stdout, /System is ready/u);
    assertSafe(error);
    return true;
  });
  let calls = await f.log();
  assert.ok(calls.indexOf('docker:logs --tail 80') < calls.indexOf('docker:rm -f'));
  await assert.rejects(readFile(path.join(f.root, 'running')), { code: 'ENOENT' });
  await writeFile(path.join(f.root, 'calls'), '');
  const verbose = await f.run(['--verbose'], extra);
  assertSafe(verbose);
  assert.match(verbose.stdout, /^System is ready/u);
  calls = await f.log();
  assert.doesNotMatch(calls, /docker:rm/u);
}));

test('failed or timed-out log collection withholds partial output and preserves failure/cleanup', () => withFixture(async (f) => {
  await assert.rejects(f.run([], { FIXTURE_START_FAIL: '1', FIXTURE_LOG_FAIL: '1', FIXTURE_SERVICE_LOG: 'must-not-leak-from-failed-log' }), (error) => {
    assert.equal(error.code, 19);
    assert.match(error.stderr, /log collection failed or timed out/u);
    assert.doesNotMatch(error.stderr, /must-not-leak/u);
    return true;
  });
  await assert.rejects(readFile(path.join(f.root, 'running')), { code: 'ENOENT' });
  await writeFile(path.join(f.root, 'bin/timeout'), `#!/usr/bin/env bash
if [[ "$*" == *'docker logs --tail'* ]]; then printf 'must-not-leak-from-timeout\\n' >&2; exit 124; fi
exec /usr/bin/timeout "$@"
`, { mode: 0o755 });
  await assert.rejects(f.run([], { FIXTURE_HEALTH: 'failed' }), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /log collection failed or timed out/u);
    assert.doesNotMatch(error.stderr, /must-not-leak|System is ready/u);
    return true;
  });
  await assert.rejects(readFile(path.join(f.root, 'running')), { code: 'ENOENT' });
}));

test('redaction failure never emits partial raw output or changes the original startup status', () => withFixture(async (f) => {
  await writeFile(path.join(f.root, 'bin/awk'), '#!/usr/bin/env bash\nprintf "must-not-leak-from-redactor\\n"\nexit 23\n', { mode: 0o755 });
  await assert.rejects(f.run([], { FIXTURE_START_FAIL: '1', FIXTURE_SERVICE_LOG: 'must-not-leak-from-service' }), (error) => {
    assert.equal(error.code, 19);
    assert.match(error.stderr, /redaction failed; raw output withheld/u);
    assert.doesNotMatch(error.stderr, /must-not-leak/u);
    return true;
  });
  assert.match(await f.log(), new RegExp(`docker:rm -f ${containerId}`, 'u'));
  await assert.rejects(readFile(path.join(f.root, 'running')), { code: 'ENOENT' });
}));

test('ownership mismatch withholds logs and never removes an unverified container', () => withFixture(async (f) => {
  await assert.rejects(f.run([], { FIXTURE_HEALTH: 'failed', FIXTURE_FOREIGN_OWNER: '1' }), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /ownership could not be verified/u);
    assert.doesNotMatch(error.stdout, /System is ready/u);
    return true;
  });
  assert.doesNotMatch(await f.log(), /docker:logs --tail|docker:rm/u);
  await readFile(path.join(f.root, 'running'));
}));

test('Docker context takes precedence over host and current-context discovery needs no context show', () => withFixture(async (f) => {
  await f.run([], { DOCKER_CONTEXT: 'selected-fixture', DOCKER_HOST: 'ssh://ignored-fixture' });
  let calls = await f.log();
  assert.match(calls, /docker:context inspect selected-fixture --format/u);
  assert.doesNotMatch(calls, /docker:context show/u);
  await f.run(['stop']);
  await writeFile(path.join(f.root, 'calls'), '');
  await f.run();
  calls = await f.log();
  assert.match(calls, /docker:context inspect --format/u);
  assert.doesNotMatch(calls, /docker:context show/u);
}));

test('host-only Docker selection skips context operations and remote discovery never uses caller IPs', () => withFixture(async (f) => {
  await f.run([], { DOCKER_HOST: 'unix:///fixture.sock', FIXTURE_UNSUPPORTED_OP: 'context' });
  assert.doesNotMatch(await f.log(), /docker:context/u);
  await f.run(['stop']);
  await writeFile(path.join(f.root, 'calls'), '');
  await assert.rejects(f.run([], { DOCKER_HOST: 'ssh://remote-fixture', FIXTURE_DOCKER_HOST: 'unix:///irrelevant.sock' }), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /remote Docker host/u);
    return true;
  });
  assert.doesNotMatch(await f.log(), /sam:|docker:context/u);
}));

test('unsupported Docker operations, invalid context and daemon failures are distinct preflight errors', () => withFixture(async (f) => {
  for (const [extra, message] of [
    [{ FIXTURE_UNSUPPORTED_OP: 'context' }, /unsupported or unavailable Docker CLI operation: context inspect/u],
    [{ FIXTURE_UNSUPPORTED_OP: 'logs' }, /unsupported or unavailable Docker CLI operation: logs/u],
    [{ FIXTURE_CONTEXT_FAIL: '1' }, /cannot inspect the selected Docker context/u],
    [{ FIXTURE_DAEMON_FAIL: '1' }, /selected Docker daemon is unavailable/u]
  ]) {
    await assert.rejects(f.run([], extra), (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, message);
      assert.doesNotMatch(error.stdout, /System is ready/u);
      return true;
    });
  }
  assert.doesNotMatch(await f.log(), /sam:/u);
}));

test('help is side-effect free and color follows the actual output fd, NO_COLOR and TERM', () => withFixture(async (f) => {
  await rm(path.join(f.root, '.env'));
  const env = { ...f.env, TERM: 'xterm', PREVIEW_TEST_SCRIPT: path.join(f.root, 'preview.sh'), PREVIEW_TEST_STDERR: path.join(f.root, 'help.stderr') };
  delete env.NO_COLOR;
  const colored = await execute('script', ['-qec', 'bash "$PREVIEW_TEST_SCRIPT" --help > /dev/null', '/dev/null'], { env });
  assert.match(colored.stdout, /\u001b\[1;36mUsage:/u);
  const noColor = await execute('script', ['-qec', 'bash "$PREVIEW_TEST_SCRIPT" --help', '/dev/null'], { env: { ...env, NO_COLOR: '' } });
  const dumb = await execute('script', ['-qec', 'bash "$PREVIEW_TEST_SCRIPT" --help', '/dev/null'], { env: { ...env, TERM: 'dumb' } });
  for (const result of [noColor, dumb]) assert.doesNotMatch(result.stdout, /\u001b/u);
  await execute('script', ['-qec', 'bash "$PREVIEW_TEST_SCRIPT" --help 2> "$PREVIEW_TEST_STDERR"', '/dev/null'], { env });
  assert.doesNotMatch(await readFile(env.PREVIEW_TEST_STDERR, 'utf8'), /\u001b/u);
  const help = await f.run(['start', '--verbose', '--help']);
  for (const text of ['Bash 4.4+', 'Docker CLI', 'WEB_CONTAINER_PORT', 'DOCKER_CONTEXT wins', 'stop/down preserve', 'exported variables']) assert.ok(help.stderr.includes(text));
  await assert.rejects(f.log(), { code: 'ENOENT' });
}));

test('the real timeout bounds a hanging log command while preserving cleanup and startup failure', () => withFixture(async (f) => {
  const started = Date.now();
  await assert.rejects(f.run([], { FIXTURE_START_FAIL: '1', FIXTURE_LOG_HANG: '1' }), (error) => {
    assert.equal(error.code, 19);
    assert.match(error.stderr, /log collection failed or timed out/u);
    assert.doesNotMatch(error.stdout, /System is ready/u);
    return true;
  });
  assert.ok(Date.now() - started < 12_000, 'log timeout exceeded its bounded grace');
  assert.match(await f.log(), new RegExp(`docker:rm -f ${containerId}`, 'u'));
  await assert.rejects(readFile(path.join(f.root, 'running')), { code: 'ENOENT' });
}));

test('unhealthy existing start/status show owned diagnostics without deleting the existing instance', () => withFixture(async (f) => {
  await f.run();
  await writeFile(path.join(f.root, 'calls'), '');
  for (const command of ['start', 'status']) {
    await assert.rejects(f.run([command], { FIXTURE_HEALTH: 'failed', FIXTURE_SERVICE_LOG: 'Existing watcher: Error: import failed' }), (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /Existing watcher: Error: import failed/u);
      assert.doesNotMatch(error.stdout, /System is ready/u);
      return true;
    });
  }
  const calls = await f.log();
  assert.equal(calls.split('docker:logs --tail 80').length - 1, 2);
  assert.doesNotMatch(calls, /docker:rm|docker:stop/u);
  await readFile(path.join(f.root, 'running'));
}));

test('verbose build failure redacts its output, preserves status and never starts services', () => withFixture(async (f) => {
  const privateImage = 'private-image-account-fixture';
  await assert.rejects(f.run(['build', '--verbose'], { COMMENTS_ACCOUNT: privateImage, FIXTURE_BUILD_LOG: `Compiler account ${privateImage}`, FIXTURE_SAM_EXIT: '31' }), (error) => {
    assert.equal(error.code, 31);
    assert.match(error.stderr, /\[REDACTED\]/u);
    assert.ok(!error.stderr.includes(privateImage));
    assert.equal(error.stdout, '');
    return true;
  });
  assert.doesNotMatch(await f.log(), /docker:/u);
}));

test('ready TTY summaries color headings while URL lines remain plain', () => withFixture(async (f) => {
  const env = { ...f.env, TERM: 'xterm', PREVIEW_TEST_SCRIPT: path.join(f.root, 'preview.sh') };
  delete env.NO_COLOR;
  const result = await execute('script', ['-qec', 'bash "$PREVIEW_TEST_SCRIPT" start', '/dev/null'], { env });
  const output = result.stdout.replaceAll('\r', '');
  assert.match(output, /\u001b\[0;32mSystem is ready/u);
  const urls = output.split('\n').filter((line) => line.includes('http://'));
  assert.ok(urls.length > 0);
  for (const url of urls) assert.match(url, /^http:\/\/[^\s\u001b]+$/u);
}));
