import assert from 'node:assert/strict';
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { materializeMarkdownWorkspace, scanMarkdownWorkspace } from '../scripts/materialize-content.mjs';

async function workspace(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'f1refly-content-'));
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
  assert.equal(await readFile(path.join(target, 'linked-file.md'), 'utf8'), '# file link\n');
  assert.equal((await lstat(path.join(target, 'linked-file.md'))).isSymbolicLink(), false);
  assert.equal((await lstat(path.join(target, 'linked-tree'))).isSymbolicLink(), false);
});

test('scanner rejects broken, cyclic, unsafe, case-colliding, and route-colliding sources', async (t) => {
  const cases = [
    async (source) => symlink(path.join(source, 'missing.md'), path.join(source, 'broken.md')),
    async (source) => { await mkdir(path.join(source, 'loop')); await symlink(source, path.join(source, 'loop', 'again')); },
    async (source) => symlink('/dev/null', path.join(source, 'special.md')),
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
