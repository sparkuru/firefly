import assert from 'node:assert/strict';
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  materializeContentWorkspace,
  materializeMarkdownWorkspace,
  scanContentWorkspace,
  scanMarkdownWorkspace
} from '../scripts/materialize-content.mjs';

async function workspace(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-content-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'source');
  const target = path.join(root, 'stage', 'posts');
  await mkdir(source, { recursive: true });
  return { root, source, target };
}

test('materializer dereferences nested file and directory links into ordinary Markdown', async (t) => {
  const { root, source, target } = await workspace(t);
  const external = path.join(root, 'external');
  await mkdir(path.join(source, 'native'), { recursive: true });
  await mkdir(path.join(external, 'linked-directory'), { recursive: true });
  await writeFile(path.join(source, 'native', 'local.md'), '# local\n');
  await writeFile(path.join(external, 'linked.md'), '# file link\n');
  await writeFile(path.join(external, 'linked-directory', 'child.md'), '# directory link\n');
  await symlink(path.join(external, 'linked.md'), path.join(source, 'linked-file.md'));
  await symlink(path.join(external, 'linked-directory'), path.join(source, 'linked-tree'));

  const inventory = await materializeMarkdownWorkspace({ sourceRoot: source, targetRoot: target });
  assert.deepEqual(inventory, ['linked-file.md', 'linked-tree/child.md', 'native/local.md']);
  assert.equal(await readFile(path.join(target, 'linked-file.md'), 'utf8'), '## file link\n');
  assert.equal((await lstat(path.join(target, 'linked-file.md'))).isSymbolicLink(), false);
  assert.equal((await lstat(path.join(target, 'linked-tree'))).isSymbolicLink(), false);
});

test('scanner rejects broken, cyclic, unsafe, case-colliding, and route-colliding sources', async (t) => {
  const cases = [
    async (source) => symlink(path.join(source, 'missing.md'), path.join(source, 'broken.md')),
    async (source) => { await mkdir(path.join(source, 'loop')); await symlink(source, path.join(source, 'loop', 'again')); },
    async (source) => symlink('/dev/null', path.join(source, 'special.md')),
    async (source) => { await writeFile(path.join(source, 'target.txt'), 'not Markdown\n'); await symlink(path.join(source, 'target.txt'), path.join(source, 'linked.md')); },
    async (source) => writeFile(path.join(source, 'bad?.md'), '# unsafe\n'),
    async (source) => { await writeFile(path.join(source, 'Alpha.md'), '# one\n'); await writeFile(path.join(source, 'alpha.md'), '# two\n'); },
    async (source) => { await writeFile(path.join(source, 'Stra\u00dfe.md'), '# one\n'); await writeFile(path.join(source, 'STRASSE.md'), '# two\n'); },
    async (source) => { await writeFile(path.join(source, 'topic.md'), '# file\n'); await mkdir(path.join(source, 'topic')); await writeFile(path.join(source, 'topic', 'child.md'), '# child\n'); }
  ];
  for (const setup of cases) {
    const { source } = await workspace(t);
    await setup(source);
    await assert.rejects(scanMarkdownWorkspace(source), /content|collision|unsafe|broken|cycle/iu);
  }
});

test('failed scanning preserves the prior stage and ignores hidden and ordinary non-Markdown files', async (t) => {
  const { source, target } = await workspace(t);
  await mkdir(path.join(target), { recursive: true });
  await writeFile(path.join(target, 'prior.md'), '# prior\n');
  await writeFile(path.join(source, '.private.md'), 'PRIVATE_SENTINEL\n');
  await writeFile(path.join(source, 'notes.txt'), 'not content\n');
  await symlink(path.join(source, 'missing.md'), path.join(source, 'broken.md'));
  await assert.rejects(materializeMarkdownWorkspace({ sourceRoot: source, targetRoot: target }), /broken/iu);
  assert.equal(await readFile(path.join(target, 'prior.md'), 'utf8'), '# prior\n');
});

test('failed promotion restores the prior stage and removes candidate and backup paths', async (t) => {
  const { root, source, target } = await workspace(t);
  await mkdir(target, { recursive: true });
  await writeFile(path.join(target, 'prior.md'), '# prior\n');
  await writeFile(path.join(source, 'next.md'), '# next\n');

  await assert.rejects(materializeMarkdownWorkspace({
    sourceRoot: source,
    targetRoot: target,
    beforePromote: async () => { throw new Error('promotion fixture failure'); }
  }), /promotion fixture failure/u);

  assert.equal(await readFile(path.join(target, 'prior.md'), 'utf8'), '# prior\n');
  await assert.rejects(readFile(path.join(target, 'next.md'), 'utf8'), /ENOENT/u);
  assert.deepEqual(await readdir(path.join(root, 'stage')), ['posts']);
});

test('source replacement between scan and copy cannot escape the workspace or replace the prior stage', async (t) => {
  const { root, source, target } = await workspace(t);
  const sourceFile = path.join(source, 'race.md');
  const outsideFile = path.join(root, 'outside.md');
  await mkdir(target, { recursive: true });
  await writeFile(path.join(target, 'prior.md'), '# prior\n');
  await writeFile(sourceFile, '# scanned\n');
  await writeFile(outsideFile, 'PRIVATE_RACE_SENTINEL\n');

  await assert.rejects(materializeMarkdownWorkspace({
    sourceRoot: source,
    targetRoot: target,
    beforeCopy: async () => {
      await rm(sourceFile);
      await symlink(outsideFile, sourceFile);
    }
  }), /source changed during materialization/iu);

  assert.equal(await readFile(path.join(target, 'prior.md'), 'utf8'), '# prior\n');
  assert.deepEqual(await readdir(path.join(root, 'stage')), ['posts']);
});

test('blog materializer scans posts and pages into one ordinary-file stage', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-blog-content-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'content');
  const target = path.join(root, 'generated-content');
  await mkdir(path.join(source, 'posts', 'ai'), { recursive: true });
  await mkdir(path.join(source, 'posts', 'acg'), { recursive: true });
  await mkdir(path.join(source, 'pages'), { recursive: true });
  await writeFile(path.join(source, 'posts', 'placeholder.md'), '');
  await writeFile(path.join(source, 'posts', 'ai', 'workflow.md'), '# workflow\n\n```text\n# keep this code\n```\n');
  await writeFile(path.join(source, 'posts', 'acg', 'legacy title.md'), '# legacy\n');
  await writeFile(path.join(source, 'pages', 'about.md'), '# about\n');

  const scanned = await scanContentWorkspace(source);
  assert.deepEqual(scanned.posts.map(({ virtualPath }) => virtualPath), ['acg/legacy title.md', 'ai/workflow.md']);
  assert.deepEqual(scanned.pages.map(({ virtualPath }) => virtualPath), ['about.md']);

  const inventory = await materializeContentWorkspace({ sourceRoot: source, targetRoot: target });
  assert.deepEqual(inventory, { pages: ['about.md'], posts: ['acg/legacy title.md', 'ai/workflow.md'] });
  assert.equal(await readFile(path.join(target, 'posts/ai/workflow.md'), 'utf8'), '## workflow\n\n```text\n# keep this code\n```\n');
  assert.equal(await readFile(path.join(target, 'posts/acg/legacy title.md'), 'utf8'), '## legacy\n');
  assert.equal(await readFile(path.join(target, 'pages/about.md'), 'utf8'), '## about\n');
  assert.equal((await lstat(path.join(target, 'posts/ai/workflow.md'))).isSymbolicLink(), false);
  assert.equal((await lstat(path.join(target, 'pages/about.md'))).isSymbolicLink(), false);
  await assert.rejects(readFile(path.join(target, 'posts/placeholder.md'), 'utf8'), /ENOENT/u);
  assert.deepEqual(await readdir(root), ['content', 'generated-content']);
});

test('blog promotion restores both collections when the atomic promotion hook fails', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-blog-content-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'content');
  const target = path.join(root, 'generated-content');
  await mkdir(path.join(source, 'posts'), { recursive: true });
  await mkdir(path.join(source, 'pages'), { recursive: true });
  await writeFile(path.join(source, 'posts', 'next.md'), '# next\n');
  await writeFile(path.join(source, 'pages', 'next.md'), '# next page\n');
  await mkdir(path.join(target, 'posts'), { recursive: true });
  await mkdir(path.join(target, 'pages'), { recursive: true });
  await writeFile(path.join(target, 'posts', 'prior.md'), '# prior\n');
  await writeFile(path.join(target, 'pages', 'prior.md'), '# prior page\n');

  await assert.rejects(materializeContentWorkspace({
    sourceRoot: source,
    targetRoot: target,
    beforePromote: async () => { throw new Error('blog promotion fixture failure'); }
  }), /blog promotion fixture failure/u);

  assert.equal(await readFile(path.join(target, 'posts/prior.md'), 'utf8'), '# prior\n');
  assert.equal(await readFile(path.join(target, 'pages/prior.md'), 'utf8'), '# prior page\n');
  await assert.rejects(readFile(path.join(target, 'posts/next.md'), 'utf8'), /ENOENT/u);
  await assert.rejects(readFile(path.join(target, 'pages/next.md'), 'utf8'), /ENOENT/u);
  assert.deepEqual(await readdir(root), ['content', 'generated-content']);
});
