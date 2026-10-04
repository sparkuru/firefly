import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { buildMemoFixture } from '../scripts/prepare-memos-fixture.mjs';
import { fixtureMemos, memoExport, prepareMemoFixture, privateSentinels, siteRoot } from './memos-fixture.mjs';

async function files(root, prefix = '') {
  const result = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...await files(path.join(root, entry.name), relative));
    else result.push(relative);
  }
  return result;
}

test('isolated enabled, empty and disabled builds keep memo discovery and data bounded', async (context) => {
  await mkdir(path.join(siteRoot, 'test-results'), { recursive: true });
  const root = await mkdtemp(path.join(siteRoot, 'test-results/memos-build-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const fixture = await prepareMemoFixture(root);
  const packageManifest = JSON.parse(await readFile(path.join(siteRoot, 'package.json'), 'utf8'));
  for (const name of ['build', 'build:workspace']) assert.match(packageManifest.scripts[name], /node scripts\/validate-memos-build\.mjs &&/u);
  const invalidOutput = path.join(root, 'invalid');
  for (const wire of [undefined, '{', Buffer.from([0xff]), JSON.stringify({ ...memoExport(), digest: '0'.repeat(64) }), JSON.stringify({ ...memoExport(), memos: [...memoExport().memos].reverse() }), JSON.stringify({ ...memoExport(), email: privateSentinels[0] })]) {
    if (wire === undefined) await rm(fixture.exportPath);
    else await writeFile(fixture.exportPath, wire);
    const result = buildMemoFixture(fixture, invalidOutput);
    assert.notEqual(result.status, 0);
    await assert.rejects(access(invalidOutput));
    for (const value of privateSentinels) assert.ok(!`${result.stdout}${result.stderr}`.includes(value));
  }
  await writeFile(fixture.exportPath, JSON.stringify(memoExport()));
  const aliasContent = path.join(root, 'alias-content');
  await mkdir(path.join(aliasContent, 'posts'), { recursive: true });
  await mkdir(path.join(aliasContent, 'pages'), { recursive: true });
  await writeFile(path.join(aliasContent, 'pages/collision.md'), `---\ntitle: Memo route collision\nslug: collision\ndate: 2026-10-04\ndescription: A route reservation fixture.\ndraft: false\nlayout: page\naliases:\n  - /memos/\n---\n\nA synthetic route collision.\n`);
  const collision = buildMemoFixture(fixture, path.join(root, 'collision'), { FIREFLY_CONTENT_ROOT: aliasContent });
  assert.notEqual(collision.status, 0);
  assert.match(`${collision.stdout}${collision.stderr}`, /Route collision between memo site page and alias/u);
  for (const state of ['enabled', 'empty', 'disabled']) {
    const outputRoot = path.join(root, state);
    if (state === 'empty') await writeFile(fixture.exportPath, JSON.stringify(memoExport([])));
    if (state === 'disabled') {
      await prepareMemoFixture(root, { enabled: false });
      await writeFile(fixture.pluginPath, 'unusable TOML');
      await rm(fixture.exportPath);
    }
    const result = buildMemoFixture(fixture, outputRoot, state === 'disabled' ? { FIREFLY_MEMOS_EXPORT: '/unusable/private.json' } : {});
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const inventory = await files(outputRoot);
    const home = await readFile(path.join(outputRoot, 'index.html'), 'utf8');
    const sitemap = await readFile(path.join(outputRoot, 'sitemap.xml'), 'utf8');
    if (state === 'disabled') {
      await assert.rejects(access(path.join(outputRoot, 'memos/index.html')));
      assert.doesNotMatch(home, /href="\/memos\/"/u);
      assert.doesNotMatch(sitemap, /\/memos\//u);
      assert.ok(!inventory.some((file) => file.startsWith('memos/')));
    } else {
      assert.deepEqual(inventory.filter((file) => file.startsWith('memos/')), ['memos/index.html']);
      assert.match(sitemap, /https:\/\/site\.fixture\.invalid\/memos\//u);
      assert.match(home, /<a href="\/memos\/">memos\/<\/a>/u);
      assert.doesNotMatch(home, /data-home-browse-directory[^>]*>memos/u);
      const html = await readFile(path.join(outputRoot, 'memos/index.html'), 'utf8');
      assert.match(html, /action="https:\/\/site\.fixture\.invalid\/v1\/memos\/submissions"/u);
      assert.match(html, /method="post" enctype="application\/x-www-form-urlencoded"/u);
      assert.deepEqual([...html.matchAll(/<(?:input|textarea)\b[^>]* name="([^"]+)"/gu)].map((match) => match[1]).sort(), ['body', 'consent', 'consentVersion', 'displayName', 'email', 'honeypot']);
      assert.match(html, /name="consent"[^>]*value="accepted"[^>]*required/u);
      assert.doesNotMatch(html, /\bchecked(?:=|\s|>)/u);
      if (state === 'enabled') {
        assert.match(html, /&lt;b&gt;Reader 😀&lt;\/b&gt;/u);
        assert.match(html, /&lt;script&gt;memoHostile\(\)&lt;\/script&gt;/u);
        assert.ok(html.includes('Second line 😀\n'));
        assert.ok(html.indexOf('Reader 😀') < html.indexOf('Older reader'));
      } else assert.match(html, /No published memos yet/u);
    }
    for (const file of inventory.filter((entry) => /\.(?:html|js|css|json|xml)$/u.test(entry))) {
      const source = await readFile(path.join(outputRoot, file), 'utf8');
      for (const value of privateSentinels) assert.ok(!source.includes(value), `${state}/${file} leaked private config`);
      if (file !== 'memos/index.html') for (const memo of fixtureMemos) {
        assert.ok(!source.includes(memo.id), `${file} projected a memo record`);
        assert.ok(!source.includes('memoHostile'), `${file} projected memo text`);
      }
    }
  }
});
