import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { assemblePublication } from '../src/index.js';
import { decodeMemoMetadata, loadMemoPublication, memoContract, readContainedFile, type MemoPublicationInput } from '../src/plugins/memos.js';

const discovery = Object.freeze({ manifests: Object.freeze([]), catalog: Object.freeze([]) });
const disabledConfig = '[plugins.memos]\nenabled = false\nconfigPath = "config/memos.toml"\n';
const enabledConfig = disabledConfig.replace('false', 'true');
const pluginConfig = '[public]\nwriteOrigin = "https://memo.fixture.invalid"\nexportPath = "inputs/memos.json"\nconsentVersion = "memo-test-v1"\n[runtime]\nthisPrivateValueIsNotForAssembler = true\n';
const publicMemos = [
  { id: 'm_new', displayName: 'Reader <b>😀</b>', body: '<script>plain()</script> & reader@example.invalid\nemailCiphertext is ordinary public text.', createdAt: '2026-10-03T12:00:00.000Z' },
  { id: 'm_old', displayName: 'Older', body: 'Older note', createdAt: '2026-10-02T12:00:00.000Z' }
];
function bundle(epoch = 3, memos = publicMemos) { return memoContract.createPublicExport({ schemaVersion: 1, sourceRevision: `memo-${epoch}`, generatedAt: '2026-10-04T00:00:00.000Z', tombstoneEpoch: epoch, memos }); }
function escaped(value: string) { return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }
export function memoHtml(input: MemoPublicationInput): string {
  const e = input.envelope;
  const records = e.memos.length ? `<ol class="memo-list">${e.memos.map((m) => `<li><article data-memo-id="${m.id}"><h3>${escaped(m.displayName)}</h3><time datetime="${m.createdAt}">${m.createdAt}</time><p class="memo-body">${escaped(m.body)}</p></article></li>`).join('')}</ol>` : '<p>No published memos yet. You can leave a note below.</p>';
  return `<!DOCTYPE html><html><head><title>Memos</title></head><body><section class="memo-stream" aria-labelledby="memo-stream-heading" data-memos-schema-version="1" data-memos-source-revision="${e.sourceRevision}" data-memos-generated-at="${e.generatedAt}" data-memos-digest="${e.digest}" data-memos-tombstone-epoch="${e.tombstoneEpoch}"><h2 id="memo-stream-heading">Reader notes</h2>${records}</section><section class="memo-submission"><form action="https://memo.fixture.invalid/v1/memos/submissions" method="post" enctype="application/x-www-form-urlencoded"><input name="displayName" type="text" required><input name="email" type="email" required><textarea name="body" required></textarea><input name="consentVersion" type="hidden" value="memo-test-v1"><input name="honeypot" type="hidden" value=""><label><input name="consent" type="checkbox" value="accepted" required></label><button type="submit">Send</button></form></section></body></html>`;
}
async function fixture(t: test.TestContext, enabled = true, epoch = 3, memos = publicMemos) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-memo-publication-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const site = path.join(root, 'apps/site/dist');
  await mkdir(path.join(site, 'lab'), { recursive: true });
  await mkdir(path.join(root, 'config'));
  await mkdir(path.join(root, 'inputs'));
  await writeFile(path.join(root, 'config/site.toml'), enabled ? enabledConfig : disabledConfig);
  await writeFile(path.join(root, 'config/memos.toml'), pluginConfig);
  await writeFile(path.join(root, 'inputs/memos.json'), memoContract.serializePublicExport(bundle(epoch, memos)));
  for (const file of ['index.html', '404.html', 'lab/index.html']) await writeFile(path.join(site, file), '<h1>Static</h1>');
  const input = loadMemoPublication(root, { environment: {} });
  const html = input ? memoHtml(input) : null;
  if (html) { await mkdir(path.join(site, 'memos')); await writeFile(path.join(site, 'memos/index.html'), html); }
  const assemble = (extra = {}) => assemblePublication({ repositoryRoot: root, discovery, memoOptions: { environment: {} }, ...extra });
  return { root, site, html, input, assemble };
}
async function trees(root: string) {
  const result: Record<string, string> = {};
  const walk = async (dir: string) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(file); else result[path.relative(root, file)] = (await readFile(file)).toString('base64');
    }
  };
  for (const target of ['artifacts', 'dist']) { try { await walk(path.join(root, target)); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; } }
  return result;
}

test('enabled and empty exports bind actual records and keep the canonical snapshot outside dist', async (t) => {
  for (const memos of [publicMemos, []]) {
    const f = await fixture(t, true, 3, memos);
    const result = await f.assemble();
    assert.equal(result.memos.tombstoneEpoch, 3);
    assert.deepEqual(Object.keys(result.memos).sort(), ['digest', 'enabled', 'generatedAt', 'schemaVersion', 'sourceRevision', 'tombstoneEpoch']);
    assert.deepEqual(memoContract.decodePublicMemosExport(await readFile(path.join(f.root, 'artifacts/memos/memos.public.v1.json'))), f.input!.envelope);
    assert.equal(result.inventory.some((file) => file.endsWith('.json')), false);
    assert.equal(await readFile(path.join(f.root, 'dist/memos/index.html'), 'utf8'), f.html);
    await f.assemble();
  }
});
test('disabled returns before config/export getters and allows marker-free authored aliases', async (t) => {
  const f = await fixture(t, false);
  await rm(path.join(f.root, 'config/memos.toml'));
  assert.equal(loadMemoPublication(f.root, { environment: {}, get exportPath(): string { throw new Error('unused'); } }), null);
  await mkdir(path.join(f.site, 'memos'));
  await writeFile(path.join(f.site, 'memos/index.html'), '<h1>An authored alias</h1>');
  assert.equal((await f.assemble()).memos.enabled, false);
  await writeFile(path.join(f.site, 'memos/index.html'), '<section class="memo-stream"></section>');
  await assert.rejects(f.assemble(), /Memo HTML/u);
});
test('disabled retains deletion floor without reading an export; re-enable refuses stale epoch', async (t) => {
  const f = await fixture(t);
  await f.assemble();
  await writeFile(path.join(f.root, 'config/site.toml'), disabledConfig);
  await rm(path.join(f.site, 'memos'), { recursive: true });
  await rm(path.join(f.root, 'config/memos.toml'));
  await rm(path.join(f.root, 'inputs/memos.json'));
  assert.deepEqual((await f.assemble()).memos, { enabled: false, schemaVersion: 1, sourceRevision: 'empty', generatedAt: '1970-01-01T00:00:00.000Z', digest: null, tombstoneEpoch: 3 });
  await assert.rejects(lstat(path.join(f.root, 'artifacts/memos/memos.public.v1.json')), { code: 'ENOENT' });
  await writeFile(path.join(f.root, 'config/site.toml'), enabledConfig);
  await writeFile(path.join(f.root, 'config/memos.toml'), pluginConfig);
  await writeFile(path.join(f.root, 'inputs/memos.json'), memoContract.serializePublicExport(bundle(2)));
  await assert.rejects(f.assemble(), /predates the published epoch 3/u);
});

const mutations: Array<[string, (html: string) => string]> = [
  ['template counterfeit', (h) => h.replace('<body>', '<body><template>').replace('</body>', '</template></body>')],
  ['closed details ancestor', (h) => h.replace('<body>', '<body><details>').replace('</body>', '</details></body>')],
  ['inline invisible ancestor', (h) => h.replace('<body>', '<body><div style="opacity:0">').replace('</body>', '</div></body>')],
  ['hidden ancestor', (h) => h.replace('<body>', '<body><div hidden>').replace('</body>', '</div></body>')],
  ['stale name with copied marker', (h) => h.replace('Reader &lt;b&gt;', 'Stale &lt;b&gt;')],
  ['stale body', (h) => h.replace('Older note', 'Stale note')],
  ['stale time', (h) => h.replace('<time datetime="2026-10-03', '<time datetime="2026-10-02')],
  ['altered id', (h) => h.replace('data-memo-id="m_new"', 'data-memo-id="m_other"')],
  ['duplicate record', (h) => h.replace('</ol>', '<li><article data-memo-id="m_new"></article></li></ol>')],
  ['missing record', (h) => h.replace(/<li><article data-memo-id="m_old">.*?<\/li>/u, '')],
  ['nested active markup', (h) => h.replace('Older note', '<img src="x">Older note')],
  ['event attribute', (h) => h.replace('<h3>', '<h3 onclick="alert(1)">')],
  ['duplicate evidence attribute', (h) => h.replace('data-memos-schema-version="1"', 'data-memos-schema-version="1" data-memos-schema-version="1"')],
  ['parser-repaired nesting', (h) => h.replace('<h3>', '<h3><p>')],
  ['private form field', (h) => h.replace('</form>', '<input type="hidden" name="token" value="private"></form>')],
  ['wrong action', (h) => h.replace('https://memo.fixture.invalid/v1/memos/submissions', 'https://other.fixture.invalid/v1/memos/submissions')],
  ['wrong consent version', (h) => h.replace('value="memo-test-v1"', 'value="other"')],
  ['prechecked consent', (h) => h.replace('type="checkbox"', 'type="checkbox" checked')],
  ['extra surface', (h) => h.replace('</body>', '<section class="memo-stream"></section></body>')],
  ['wrong identity', (h) => h.replace('data-memos-source-revision="memo-3"', 'data-memos-source-revision="memo-4"')]
];
for (const [label, mutate] of mutations) test(`rejects ${label} and preserves both promoted trees`, async (t) => {
  const f = await fixture(t);
  await f.assemble();
  const before = await trees(f.root);
  await writeFile(path.join(f.site, 'memos/index.html'), mutate(f.html!));
  await assert.rejects(f.assemble(), /Memo HTML/u);
  assert.deepEqual(await trees(f.root), before);
  assert.deepEqual((await readdir(f.root)).filter((name) => name.includes('candidate') || name.includes('previous-')), []);
});
test('records in wrong order fail despite a matching envelope receipt', async (t) => {
  const f = await fixture(t);
  const html = f.html!.replace(/(<li>.*?<\/li>)(<li>.*?<\/li>)/su, '$2$1');
  await writeFile(path.join(f.site, 'memos/index.html'), html);
  await assert.rejects(f.assemble(), /Memo HTML/u);
});
test('swapped export after site build fails inside public assembly API', async (t) => {
  const f = await fixture(t);
  await writeFile(path.join(f.root, 'inputs/memos.json'), memoContract.serializePublicExport(bundle(4)));
  await assert.rejects(f.assemble(), /Memo HTML/u);
});
test('copied tree is validated when site changes during staging', async (t) => {
  const f = await fixture(t);
  // The site is untrusted build output; a caller cannot authorize it with metadata.
  await writeFile(path.join(f.site, 'memos/index.html'), f.html!.replace('Older note', 'Unbound note'));
  await assert.rejects(f.assemble({ memos: { enabled: false } }), /Memo HTML/u);
});
test('raw UTF-8, malformed records, private fields, digest and malformed paths fail closed', async (t) => {
  const f = await fixture(t);
  for (const bytes of [Buffer.from([0xff]), Buffer.from('{"schemaVersion":1,"schemaVersion":1}'), Buffer.from(JSON.stringify({ ...bundle(), email: 'PRIVATE_SENTINEL' })), Buffer.from(JSON.stringify({ ...bundle(), digest: 'a'.repeat(64) }))]) {
    await writeFile(path.join(f.root, 'inputs/memos.json'), bytes);
    assert.throws(() => loadMemoPublication(f.root, { environment: {} }));
  }
  for (const exportPath of ['/tmp/memos.json', '../memos.json', 'inputs\\memos.json', 'inputs/memos.txt', 'inputs//memos.json', 'inputs/%2e.json']) assert.throws(() => loadMemoPublication(f.root, { environment: {}, exportPath }));
});
test('contained helper rejects symlink leaf, symlink parent, directories and oversized inputs', async (t) => {
  const f = await fixture(t);
  assert.throws(() => readContainedFile('inputs/memos.json', f.root, 'oversized fixture', 1), /contained regular/u);
  await symlink(path.join(f.root, 'inputs/memos.json'), path.join(f.root, 'inputs/link.json'));
  await symlink(path.join(f.root, 'inputs'), path.join(f.root, 'linked'));
  await mkdir(path.join(f.root, 'inputs/directory.json'));
  for (const exportPath of ['inputs/link.json', 'linked/memos.json', 'inputs/directory.json']) assert.throws(() => loadMemoPublication(f.root, { environment: {}, exportPath }), /contained regular/u);
});
test('legacy memo-free metadata is compatible; legacy memo HTML requires recovery', async (t) => {
  const f = await fixture(t, false);
  await f.assemble();
  const manifestPath = path.join(f.root, 'artifacts/publication.json');
  const prior = JSON.parse(await readFile(manifestPath, 'utf8'));
  delete prior.memos;
  await writeFile(manifestPath, JSON.stringify(prior));
  assert.equal((await f.assemble()).memos.tombstoneEpoch, 0);
  delete prior.memos;
  await writeFile(manifestPath, JSON.stringify(prior));
  await mkdir(path.join(f.root, 'dist/memos'));
  await writeFile(path.join(f.root, 'dist/memos/index.html'), '<section class="memo-stream"></section>');
  await assert.rejects(f.assemble(), /prior publication history/u);
});
test('lost history and malformed memo fields never become zero', async (t) => {
  const f = await fixture(t);
  await f.assemble();
  const manifestPath = path.join(f.root, 'artifacts/publication.json');
  const bytes = await readFile(manifestPath);
  const prior = JSON.parse(bytes.toString());
  const variants = [null, { ...prior.memos, extra: true }, { ...prior.memos, digest: null }, { ...prior.memos, generatedAt: 'yesterday' }, { ...prior.memos, tombstoneEpoch: -1 }, { ...prior.memos, tombstoneEpoch: 1.5 }, { ...prior.memos, tombstoneEpoch: Number.MAX_SAFE_INTEGER + 1 }];
  for (const memos of variants) {
    await writeFile(manifestPath, JSON.stringify({ ...prior, memos }));
    await assert.rejects(f.assemble(), /publication history/u);
  }
  await writeFile(manifestPath, bytes);
  await rm(manifestPath);
  await assert.rejects(f.assemble(), /prior publication history/u);
  assert.throws(() => decodeMemoMetadata({ ...prior.memos, tombstoneEpoch: -0 }), /publication history/u);
});
test('prior manifest rejects bad bytes, schema and symlinked state', async (t) => {
  const f = await fixture(t);
  await f.assemble();
  const manifestPath = path.join(f.root, 'artifacts/publication.json');
  const good = await readFile(manifestPath);
  for (const bytes of [Buffer.from([0xff]), Buffer.from('{'), Buffer.from('{"schemaVersion":2,"catalog":[],"inventory":[]}')]) {
    await writeFile(manifestPath, bytes);
    await assert.rejects(f.assemble(), /prior publication history/u);
  }
  await writeFile(path.join(f.root, 'inputs/prior.json'), good);
  await rm(manifestPath);
  await symlink(path.join(f.root, 'inputs/prior.json'), manifestPath);
  await assert.rejects(f.assemble(), /contained regular/u);
});
test('input-only bootstrap consumes target override into canonical artifact snapshot', async (t) => {
  for (const target of ['artifacts', 'dist']) {
    const f = await fixture(t);
    await mkdir(path.join(f.root, target));
    const override = `${target}/initial.json`;
    await writeFile(path.join(f.root, override), memoContract.serializePublicExport(bundle()));
    await f.assemble({ memoOptions: { environment: {}, exportPath: override } });
    await assert.rejects(lstat(path.join(f.root, override)), { code: 'ENOENT' });
    assert.deepEqual(memoContract.decodePublicMemosExport(await readFile(path.join(f.root, 'artifacts/memos/memos.public.v1.json'))), bundle());
  }
});
test('unrecognized bootstrap siblings require history recovery', async (t) => {
  const f = await fixture(t);
  await mkdir(path.join(f.root, 'artifacts'));
  await writeFile(path.join(f.root, 'artifacts/unrecognized.txt'), 'PRIVATE_SIBLING');
  await assert.rejects(f.assemble(), /prior publication history/u);
  assert.equal(await readFile(path.join(f.root, 'artifacts/unrecognized.txt'), 'utf8'), 'PRIVATE_SIBLING');
});
test('all four promotion rename failures restore the complete pair and owned candidates', async (t) => {
  const f = await fixture(t);
  await f.assemble();
  const before = await trees(f.root);
  for (const step of [1, 2, 3, 4]) {
    await assert.rejects(f.assemble({ beforePromotionRename: (current: number) => { if (current === step) throw new Error('injected promotion failure'); } }), /injected promotion failure/u);
    assert.deepEqual(await trees(f.root), before);
    assert.deepEqual((await readdir(f.root)).filter((name) => name.includes('candidate') || name.includes('previous-')), []);
  }
});
test('failed promotion preserves an initial input under a replaced target', async (t) => {
  const f = await fixture(t);
  await mkdir(path.join(f.root, 'dist'));
  await cp(path.join(f.root, 'inputs/memos.json'), path.join(f.root, 'dist/initial.json'));
  const before = await trees(f.root);
  await assert.rejects(f.assemble({ memoOptions: { environment: {}, exportPath: 'dist/initial.json' }, beforePromotionRename: (step: number) => { if (step === 2) throw new Error('injected'); } }), /injected/u);
  assert.deepEqual(await trees(f.root), before);
});

test('empty site override uses the same default as the site', async (t) => {
  const f = await fixture(t);
  assert.deepEqual(loadMemoPublication(f.root, { environment: { FIREFLY_SITE_CONFIG_PATH: '' } }), f.input);
});
test('expanded-year history and unsafe prior target roots fail closed', async (t) => {
  const f = await fixture(t);
  const result = await f.assemble();
  assert.throws(() => decodeMemoMetadata({ ...result.memos, generatedAt: '+010000-01-01T00:00:00.000Z' }));
  await rm(path.join(f.root, 'dist'), { recursive: true });
  await symlink(f.site, path.join(f.root, 'dist'));
  await assert.rejects(f.assemble(), /real directory/u);
});
test('enabled rejects marker-free memo shadow routes', async (t) => {
  const f = await fixture(t);
  for (const file of ['memos.html', 'memos/shadow.html']) {
    await writeFile(path.join(f.site, file), '<h1>Shadow</h1>');
    await assert.rejects(f.assemble(), /Memo HTML/u);
    await rm(path.join(f.site, file));
  }
});
test('unsafe or invalid UTF-8 prior history is refused without touching the release', async (t) => {
  for (const variant of ['symlink', 'directory', 'fifo', 'utf8']) {
    const f = await fixture(t);
    await f.assemble();
    const manifest = path.join(f.root, 'artifacts/publication.json');
    const original = await readFile(manifest);
    const released = await readFile(path.join(f.root, 'dist/memos/index.html'));
    await rm(manifest);
    if (variant === 'symlink') {
      await writeFile(path.join(f.root, 'prior.json'), original);
      await symlink(path.join(f.root, 'prior.json'), manifest);
    } else if (variant === 'directory') await mkdir(manifest);
    else if (variant === 'fifo') execFileSync('mkfifo', [manifest]);
    else await writeFile(manifest, Buffer.from([0xff]));
    await assert.rejects(f.assemble(), /contained regular|publication history/u);
    assert.deepEqual(await readFile(path.join(f.root, 'dist/memos/index.html')), released);
    const state = await lstat(manifest);
    assert.equal(variant === 'symlink' ? state.isSymbolicLink() : variant === 'directory' ? state.isDirectory() : variant === 'fifo' ? state.isFIFO() : state.isFile(), true);
    assert.deepEqual((await readdir(f.root)).filter((name) => name.includes('candidate') || name.includes('previous-')), []);
  }
});
test('literal asset-looking text is escaped and never interpreted as a local reference', async (t) => {
  const f = await fixture(t, true, 3, [{ ...publicMemos[0]!, body: '<img src="../../../../outside.png"> href="/unknown/" is text' }]);
  await assert.doesNotReject(f.assemble());
});

test('combined initial comments and memo inputs bootstrap without copying siblings', async (t) => {
  const f = await fixture(t);
  const commentsContract = await import(new URL('../../../../plugins/comments/public.mjs', import.meta.url).href) as typeof import('../../../plugins/comments/public.mjs');
  const commentsExport = commentsContract.createPublicExport({ schemaVersion: 1, sourceRevision: 'comments-bootstrap', generatedAt: '2026-10-04T00:00:00.000Z', tombstoneEpoch: 0, comments: [] });
  const comments = { enabled: true, schemaVersion: 1 as const, sourceRevision: commentsExport.sourceRevision, generatedAt: commentsExport.generatedAt, digest: commentsExport.digest!, tombstoneEpoch: commentsExport.tombstoneEpoch };
  await mkdir(path.join(f.root, 'artifacts/memos'), { recursive: true });
  await mkdir(path.join(f.root, 'artifacts/comments'));
  await writeFile(path.join(f.root, 'artifacts/memos/initial.json'), memoContract.serializePublicExport(bundle()));
  await writeFile(path.join(f.root, 'artifacts/comments/initial.json'), JSON.stringify(commentsExport));
  const previous = process.env.FIREFLY_COMMENTS_EXPORT;
  process.env.FIREFLY_COMMENTS_EXPORT = 'artifacts/comments/initial.json';
  try {
    await f.assemble({ comments, memoOptions: { environment: {}, exportPath: 'artifacts/memos/initial.json' } });
  } finally {
    if (previous === undefined) delete process.env.FIREFLY_COMMENTS_EXPORT; else process.env.FIREFLY_COMMENTS_EXPORT = previous;
  }
  assert.deepEqual(memoContract.decodePublicMemosExport(await readFile(path.join(f.root, 'artifacts/memos/memos.public.v1.json'))), bundle());
  await assert.rejects(lstat(path.join(f.root, 'artifacts/comments/initial.json')), { code: 'ENOENT' });
});
test('snapshot serialization preserves external selected input bytes and excludes its siblings', async (t) => {
  const f = await fixture(t);
  const raw = `${JSON.stringify(bundle(), null, 4)}\n\n`;
  await writeFile(path.join(f.root, 'inputs/memos.json'), raw);
  await writeFile(path.join(f.root, 'inputs/private-sibling.txt'), 'MEMO_PRIVATE_SIBLING');
  await f.assemble();
  assert.equal(await readFile(path.join(f.root, 'inputs/memos.json'), 'utf8'), raw);
  const pair = await trees(f.root);
  assert.ok(Object.values(pair).every((value) => !Buffer.from(value, 'base64').toString().includes('MEMO_PRIVATE_SIBLING')));
});
