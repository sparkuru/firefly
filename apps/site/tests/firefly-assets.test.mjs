import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { materializeContentWorkspace } from '../scripts/materialize-content.mjs';
import { createFireflyAssetsIntegration, fireflyMediaReferences, publishFireflyAssets, resolveFireflyMedia } from '../src/build/firefly-assets.mjs';

const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/Z7sAAAAASUVORK5CYII=', 'base64');
const imageBlock = (src) => '```firefly\ntype: image\nsrc: ' + src + '\nalt: Example image\n```\n';
const compositionBlock = (src, nested) => '```firefly\ntype: composition\nlayout: image-left\nmedia:\n  type: image\n  src: ' + src + '\ncontent: |\n  Example.\n\n  ![Nested](' + nested + ')\n```\n';
const post = (body, extra = '') => '---\ntitle: Example\ndescription: Example\ndate: 2026-08-12\ndraft: false\nlayout: post\n' + extra + '---\n\n' + body;

async function workspace(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-article-media-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const sourceRoot = path.join(root, 'source');
  const targetRoot = path.join(root, '.generated-content');
  await mkdir(path.join(sourceRoot, 'posts', 'notes', 'assets'), { recursive: true });
  await mkdir(path.join(sourceRoot, 'pages'), { recursive: true });
  return { root, sourceRoot, targetRoot };
}

const imageName = () => createHash('sha256').update(pixel).digest('hex') + '.png';
const file = (virtualPath, frontmatter = {}) => ({
  path: `/fixture/.generated-content/${virtualPath}`,
  data: { astro: { frontmatter } }
});

test('stages and resolves referenced media by logical document identity', async (t) => {
  const { sourceRoot, targetRoot, root } = await workspace(t);
  await writeFile(path.join(sourceRoot, 'posts/notes/assets/图像.png'), pixel);
  await writeFile(path.join(sourceRoot, 'posts/notes/assets/unused.png'), 'UNREFERENCED');
  await writeFile(path.join(sourceRoot, 'posts/notes/example.md'), post(imageBlock('./assets/图像.png?view=1')));
  await writeFile(path.join(sourceRoot, 'posts/notes/second.md'), post(imageBlock('assets/图像.png')));
  await writeFile(path.join(sourceRoot, 'posts/private.md'), post(imageBlock('./private-missing.png'), 'access:\n  visibility: private\n  owner: example\n'));
  await writeFile(path.join(sourceRoot, 'posts/draft.md'), post(imageBlock('./draft-missing.png')).replace('draft: false', 'draft: true'));

  await materializeContentWorkspace({ sourceRoot, targetRoot });
  const name = imageName();
  const manifest = JSON.parse(await readFile(path.join(targetRoot, '.firefly-media.json'), 'utf8'));
  assert.deepEqual(Object.keys(manifest.documents).sort(), ['posts/notes/example.md', 'posts/notes/second.md']);
  assert.deepEqual(await readdir(path.join(targetRoot, '.firefly-media')), [name]);
  assert.deepEqual(await readFile(path.join(targetRoot, '.firefly-media', name)), pixel);
  const resolved = await resolveFireflyMedia({ src: './assets/图像.png?view=1', file: file('posts/notes/example.md'), stageRoot: targetRoot });
  assert.deepEqual(resolved, { src: `/firefly-media/${name}?view=1`, width: 1, height: 1 });
  assert.equal(await resolveFireflyMedia({ src: './private-missing.png', file: file('posts/private.md', { access: { visibility: 'private' } }), stageRoot: targetRoot }), '/firefly-media/unavailable');
  assert.equal(await resolveFireflyMedia({ src: './draft-missing.png', file: file('posts/draft.md', { draft: true }), stageRoot: targetRoot }), '/firefly-media/unavailable');
  assert.equal(await resolveFireflyMedia({ src: 'https://example.test/image.gif', file: file('posts/notes/example.md'), stageRoot: targetRoot }), 'https://example.test/image.gif');

  const output = path.join(root, 'output');
  await mkdir(output);
  await writeFile(path.join(output, 'index.html'), `<template><img src="${resolved.src}"></template>`);
  assert.deepEqual([...fireflyMediaReferences(await readFile(path.join(output, 'index.html'), 'utf8'))], [name]);
  assert.deepEqual([...await publishFireflyAssets(output, targetRoot)], [name]);
  assert.deepEqual(await readFile(path.join(output, 'firefly-media', name)), pixel);
});

test('stages images inside composition Markdown but ignores examples in outer code fences', async (t) => {
  const { sourceRoot, targetRoot } = await workspace(t);
  await writeFile(path.join(sourceRoot, 'posts/notes/assets/main.png'), pixel);
  await writeFile(path.join(sourceRoot, 'posts/notes/assets/nested.png'), pixel);
  const example = '````markdown\n' + imageBlock('./not-real.png') + '````\n';
  await writeFile(path.join(sourceRoot, 'posts/notes/example.md'), post(example + compositionBlock('./assets/main.png', './assets/nested.png')));
  await materializeContentWorkspace({ sourceRoot, targetRoot });
  const manifest = JSON.parse(await readFile(path.join(targetRoot, '.firefly-media.json'), 'utf8'));
  assert.deepEqual(Object.keys(manifest.documents['posts/notes/example.md']).sort(), ['./assets/main.png', './assets/nested.png']);
});

test('stages public media from valid spaced and BOM-prefixed front matter', async (t) => {
  const { sourceRoot, targetRoot } = await workspace(t);
  await writeFile(path.join(sourceRoot, 'posts/notes/assets/image.png'), pixel);
  for (const [name, opening] of [['spaced', '---  '], ['bom', '\uFEFF---']]) {
    const source = post(imageBlock('./assets/image.png'))
      .replace(/^---\n/u, `${opening}\n`)
      .replace('description: Example', [
        'description: |', '  Example of fenced YAML content.', '  ```firefly',
        '  type: image', '  src: ./missing-metadata.png', '  ```'
      ].join('\n'))
      .replace('\n---\n', '\n---  \n');
    await writeFile(path.join(sourceRoot, `posts/notes/${name}.md`), source);
  }
  await materializeContentWorkspace({ sourceRoot, targetRoot });
  const manifest = JSON.parse(await readFile(path.join(targetRoot, '.firefly-media.json'), 'utf8'));
  assert.deepEqual(Object.keys(manifest.documents).sort(), ['posts/notes/bom.md', 'posts/notes/spaced.md']);
  for (const resources of Object.values(manifest.documents)) {
    assert.deepEqual(Object.keys(resources), ['./assets/image.png']);
  }
});

test('missing, ignored, escaping, and linked assets never replace a prior stage', async (t) => {
  for (const kind of ['missing', 'ignored', 'escape', 'linked']) {
    const { root, sourceRoot, targetRoot } = await workspace(t);
    await mkdir(targetRoot);
    await writeFile(path.join(targetRoot, 'prior'), 'prior');
    let source = './assets/missing.png';
    if (kind === 'ignored') {
      source = './assets/excluded.png';
      await writeFile(path.join(sourceRoot, '.fireflyignore'), 'posts/notes/assets/excluded.png\n');
      await writeFile(path.join(sourceRoot, 'posts/notes/assets/excluded.png'), pixel);
    }
    if (kind === 'escape') source = '../../../outside.png';
    if (kind === 'linked') {
      source = './assets/linked.png';
      await writeFile(path.join(root, 'outside.png'), pixel);
      await symlink(path.join(root, 'outside.png'), path.join(sourceRoot, 'posts/notes/assets/linked.png'));
    }
    await writeFile(path.join(sourceRoot, 'posts/notes/example.md'), post(imageBlock(source)));
    await assert.rejects(materializeContentWorkspace({ sourceRoot, targetRoot }), /FIREFLY_MEDIA|Content link target is not Markdown/u, kind);
    assert.equal(await readFile(path.join(targetRoot, 'prior'), 'utf8'), 'prior');
    assert.deepEqual((await readdir(root)).filter((name) => name.includes('.candidate-') || name.includes('.backup-')), []);
  }
});

test('supports linked document directories and removes withdrawn assets on warm rebuild', async (t) => {
  const { root, sourceRoot, targetRoot } = await workspace(t);
  const external = path.join(root, 'linked-source');
  await mkdir(path.join(external, 'assets'), { recursive: true });
  await writeFile(path.join(external, 'assets/pixel.png'), pixel);
  await writeFile(path.join(external, 'linked.md'), post(imageBlock('./assets/pixel.png')));
  await symlink(external, path.join(sourceRoot, 'posts/linked'));
  await materializeContentWorkspace({ sourceRoot, targetRoot });
  const manifest = JSON.parse(await readFile(path.join(targetRoot, '.firefly-media.json'), 'utf8'));
  assert.ok(manifest.documents['posts/linked/linked.md']);
  await rm(path.join(external, 'linked.md'));
  await materializeContentWorkspace({ sourceRoot, targetRoot });
  const next = JSON.parse(await readFile(path.join(targetRoot, '.firefly-media.json'), 'utf8'));
  assert.deepEqual(next.documents, {});
  await assert.rejects(readdir(path.join(targetRoot, '.firefly-media')), /ENOENT/u);
});

test('linked source directories cannot be replaced between scan and media copy', async (t) => {
  const { root, sourceRoot, targetRoot } = await workspace(t);
  const original = path.join(root, 'original');
  const replacement = path.join(root, 'replacement');
  for (const directory of [original, replacement]) {
    await mkdir(path.join(directory, 'assets'), { recursive: true });
    await writeFile(path.join(directory, 'assets/pixel.png'), directory === original ? pixel : 'PRIVATE_REPLACEMENT');
    await writeFile(path.join(directory, 'linked.md'), post(imageBlock('./assets/pixel.png')));
  }
  const link = path.join(sourceRoot, 'posts/linked');
  await symlink(original, link);
  await mkdir(targetRoot);
  await writeFile(path.join(targetRoot, 'prior'), 'prior');
  await assert.rejects(materializeContentWorkspace({
    sourceRoot,
    targetRoot,
    beforeCopy: async () => { await rm(link); await symlink(replacement, link); }
  }), /document directory changed during materialization/u);
  assert.equal(await readFile(path.join(targetRoot, 'prior'), 'utf8'), 'prior');
});

test('publication rejects references absent from the guest-only manifest', async (t) => {
  const { root, sourceRoot, targetRoot } = await workspace(t);
  await writeFile(path.join(sourceRoot, 'posts/notes/example.md'), post('Ordinary text.\n'));
  await materializeContentWorkspace({ sourceRoot, targetRoot });
  const output = path.join(root, 'output');
  await mkdir(output);
  await writeFile(path.join(output, 'index.html'), `<img src="/firefly-media/${'a'.repeat(64)}.png">`);
  await assert.rejects(publishFireflyAssets(output, targetRoot), /unapproved Firefly media/u);
  await assert.rejects(readdir(path.join(output, 'firefly-media')), /ENOENT/u);
});

test('development endpoint limits access to guest assets and supports byte ranges', async (t) => {
  const { sourceRoot, targetRoot } = await workspace(t);
  await writeFile(path.join(sourceRoot, 'posts/notes/assets/image.png'), pixel);
  await writeFile(path.join(sourceRoot, 'posts/notes/example.md'), post(imageBlock('./assets/image.png')));
  await materializeContentWorkspace({ sourceRoot, targetRoot });
  let middleware;
  createFireflyAssetsIntegration({ stageRoot: targetRoot }).hooks['astro:server:setup']({ server: { middlewares: { use(fn) { middleware = fn; } } } });
  const server = http.createServer((request, response) => middleware(request, response, () => { response.statusCode = 404; response.end(); }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/firefly-media/${imageName()}`, { headers: { range: 'bytes=0-7' } });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.equal(response.headers.get('content-range'), `bytes 0-7/${pixel.length}`);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), pixel.subarray(0, 8));
  const head = await fetch(`${base}/firefly-media/${imageName()}`, { method: 'HEAD', headers: { range: 'bytes=0-7' } });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('content-length'), String(pixel.length));
  assert.equal(head.headers.get('content-range'), null);
  const conditional = await fetch(`${base}/firefly-media/${imageName()}`, { headers: { range: 'bytes=0-7', 'if-range': '"outdated"' } });
  assert.equal(conditional.status, 200);
  assert.deepEqual(Buffer.from(await conditional.arrayBuffer()), pixel);
  const hidden = await fetch(`${base}/firefly-media/${'a'.repeat(64)}.png`);
  assert.equal(hidden.status, 404);
  const invalid = await fetch(`${base}/firefly-media/${imageName()}`, { headers: { range: 'bytes=99999-' } });
  assert.equal(invalid.status, 416);
});

test('Astro build-done publishes media after its Vite module runner closes', async (t) => {
  const siteRoot = path.resolve(import.meta.dirname, '..');
  const fixturesRoot = path.join(siteRoot, 'test-results');
  await mkdir(fixturesRoot, { recursive: true });
  const root = await mkdtemp(path.join(fixturesRoot, 'firefly-assets-build-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const stageRoot = path.join(root, 'stage');
  await mkdir(path.join(root, 'src/pages'), { recursive: true });
  await mkdir(stageRoot);
  await writeFile(path.join(stageRoot, '.firefly-media.json'), JSON.stringify({ version: 1, documents: {} }));
  await writeFile(path.join(root, 'src/pages/index.astro'), '<main>Independent build fixture</main>\n');
  await writeFile(path.join(root, 'astro.config.mjs'), [
    "import { defineConfig } from 'astro/config';",
    "import { createFireflyAssetsIntegration } from '../../src/build/firefly-assets.mjs';",
    `export default defineConfig({ output: 'static', integrations: [createFireflyAssetsIntegration({ stageRoot: ${JSON.stringify(stageRoot)} })] });`,
    ''
  ].join('\n'));
  const build = spawnSync(process.execPath, [path.join(siteRoot, 'node_modules/astro/bin/astro.mjs'), 'build', '--root', root], {
    cwd: siteRoot,
    encoding: 'utf8',
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
    maxBuffer: 4 * 1024 * 1024
  });
  const output = `${build.stdout ?? ''}\n${build.stderr ?? ''}`;
  assert.equal(build.error, undefined, output);
  assert.equal(build.status, 0, output);
  assert.match(await readFile(path.join(root, 'dist/index.html'), 'utf8'), /Independent build fixture/u);
});
