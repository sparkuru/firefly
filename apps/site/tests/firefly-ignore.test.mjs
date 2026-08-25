import assert from 'node:assert/strict';
import { lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  decideFireflyIgnore,
  parseFireflyIgnore
} from '../scripts/firefly-ignore.mjs';
import {
  materializeContentWorkspace,
  materializeMarkdownWorkspace,
  scanContentWorkspace
} from '../scripts/materialize-content.mjs';

function evaluate(text, pathname, options = {}) {
  return decideFireflyIgnore([
    {
      baseSegments: [],
      policy: parseFireflyIgnore(text, { logicalPath: 'posts/.fireflyignore' })
    }
  ], pathname, options);
}

test('matcher follows comments, escapes, trailing spaces, and ordered rules', () => {
  const escaped = parseFireflyIgnore([
    '# comment',
    '',
    '\\#literal.md',
    '\\!literal.md',
    'name\\ '
  ].join('\n'), { logicalPath: 'posts/.fireflyignore' });

  assert.equal(escaped.test('#literal.md').ignored, true);
  assert.equal(escaped.test('!literal.md').ignored, true);
  assert.equal(escaped.test('name ').ignored, true);
  assert.equal(evaluate('*.md\n!keep.md', 'keep.md').ignored, false);
  assert.equal(evaluate('*.md\n!keep.md', 'nested/keep.md').ignored, false);
  assert.equal(evaluate('*.md\n!keep.md', 'other.md').ignored, true);
});

test('matcher supports rooted and unrooted paths, wildcards, ranges, and globstars', () => {
  const policy = [
    '/root.md',
    '*.draft.md',
    'file?.md',
    '[a-c].md',
    '**/draft.md',
    'a/**/b.md'
  ].join('\n');

  assert.equal(evaluate(policy, 'root.md').ignored, true);
  assert.equal(evaluate(policy, 'nested/root.md').ignored, false);
  assert.equal(evaluate(policy, 'nested/story.draft.md').ignored, true);
  assert.equal(evaluate(policy, 'file1.md').ignored, true);
  assert.equal(evaluate(policy, 'b.md').ignored, true);
  assert.equal(evaluate(policy, 'draft.md').ignored, true);
  assert.equal(evaluate(policy, 'nested/draft.md').ignored, true);
  assert.equal(evaluate(policy, 'a/b.md').ignored, true);
  assert.equal(evaluate(policy, 'a/x/y/b.md').ignored, true);
  assert.equal(evaluate(policy, 'z.md').ignored, false);
});

test('directory-only patterns keep directory state separate from similarly named files', () => {
  const policy = [
    'build/',
    'assets/**/generated.md'
  ].join('\n');

  assert.equal(evaluate(policy, 'build', { directory: true }).ignored, true);
  assert.equal(evaluate(policy, 'build/child.md').ignored, true);
  assert.equal(evaluate(policy, 'build.md').ignored, false);
  assert.equal(evaluate(policy, 'assets/generated.md').ignored, true);
  assert.equal(evaluate(policy, 'assets/images/generated.md').ignored, true);
});

test('nested policies override inherited rules using local path bases', () => {
  const root = parseFireflyIgnore('posts/archive/*.md', { logicalPath: '.fireflyignore' });
  const nested = parseFireflyIgnore('!keep.md', { logicalPath: 'posts/archive/.fireflyignore' });
  const chain = [
    { baseSegments: [], policy: root },
    { baseSegments: ['posts', 'archive'], policy: nested }
  ];

  assert.equal(decideFireflyIgnore(chain, 'posts/archive/keep.md').ignored, false);
  assert.equal(decideFireflyIgnore(chain, 'posts/archive/other.md').ignored, true);
});

test('a descendant negation cannot bypass an excluded parent directory', () => {
  const root = parseFireflyIgnore('posts/archive/', { logicalPath: '.fireflyignore' });
  const nested = parseFireflyIgnore('!keep.md', { logicalPath: 'posts/archive/.fireflyignore' });
  const chain = [
    { baseSegments: [], policy: root },
    { baseSegments: ['posts', 'archive'], policy: nested }
  ];
  const directory = decideFireflyIgnore(chain, 'posts/archive', { directory: true });
  assert.equal(directory.ignored, true);
  assert.equal(
    decideFireflyIgnore(chain, 'posts/archive/keep.md', {
      blockedByIgnoredParent: directory.ignored
    }).ignored,
    true
  );

  const reinclude = [
    { baseSegments: [], policy: root },
    {
      baseSegments: ['posts'],
      policy: parseFireflyIgnore('!archive/', { logicalPath: 'posts/.fireflyignore' })
    }
  ];
  assert.equal(decideFireflyIgnore(reinclude, 'posts/archive', { directory: true }).ignored, false);
});

test('malformed policy diagnostics expose only logical path and line', () => {
  assert.throws(
    () => parseFireflyIgnore('ok\nbad\\', { logicalPath: 'posts/archive/.fireflyignore' }),
    (error) => {
      assert.match(error.message, /posts\/archive\/\.fireflyignore:2/u);
      assert.doesNotMatch(error.message, /bad\\/u);
      assert.doesNotMatch(error.message, /\/host\/private/u);
      return true;
    }
  );
});

test('materializer filters both collections before reservation and never copies policies', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-ignore-blog-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'content');
  const target = path.join(root, 'generated-content');
  await mkdir(path.join(source, 'posts', 'private'), { recursive: true });
  await mkdir(path.join(source, 'posts', 'collision'), { recursive: true });
  await mkdir(path.join(source, 'posts', 'notes'), { recursive: true });
  await mkdir(path.join(source, 'pages', 'internal'), { recursive: true });
  await writeFile(path.join(source, '.fireflyignore'), [
    '# root paths include collection prefixes',
    'posts/private/',
    'posts/collision/',
    'posts/**/omit.md',
    'pages/hidden.md'
  ].join('\n'));
  await writeFile(path.join(source, 'posts', 'notes', '.fireflyignore'), '*.md\n!keep.md\n');
  await writeFile(path.join(source, 'posts', 'private', 'hidden.md'), '# private\n');
  await writeFile(path.join(source, 'posts', 'collision', 'hidden.md'), '# collision\n');
  await writeFile(path.join(source, 'posts', 'collision.md'), '# included collision name\n');
  await writeFile(path.join(source, 'posts', 'notes', 'keep.md'), '# keep\n');
  await writeFile(path.join(source, 'posts', 'notes', 'omit.md'), '# omit\n');
  await writeFile(path.join(source, 'posts', 'public.md'), '# public\n');
  await writeFile(path.join(source, 'pages', 'hidden.md'), '# hidden\n');
  await writeFile(path.join(source, 'pages', 'about.md'), '# about\n');
  await writeFile(path.join(source, 'pages', 'internal', '.fireflyignore'), '*.md\n!keep.md\n');
  await writeFile(path.join(source, 'pages', 'internal', 'keep.md'), '# page keep\n');
  await writeFile(path.join(source, 'pages', 'internal', 'omit.md'), '# page omit\n');
  const sourceBytes = await readFile(path.join(source, 'posts', 'private', 'hidden.md'));

  const scanned = await scanContentWorkspace(source);
  assert.deepEqual(scanned.posts.map(({ virtualPath }) => virtualPath), [
    'collision.md',
    'notes/keep.md',
    'public.md'
  ]);
  assert.deepEqual(scanned.pages.map(({ virtualPath }) => virtualPath), ['about.md', 'internal/keep.md']);

  const inventory = await materializeContentWorkspace({ sourceRoot: source, targetRoot: target });
  assert.deepEqual(inventory, {
    posts: ['collision.md', 'notes/keep.md', 'public.md'],
    pages: ['about.md', 'internal/keep.md']
  });
  assert.equal(await readFile(path.join(target, 'posts/collision.md'), 'utf8'), '## included collision name\n');
  assert.equal(await readFile(path.join(target, 'posts/notes/keep.md'), 'utf8'), '## keep\n');
  assert.equal(await readFile(path.join(target, 'pages/about.md'), 'utf8'), '## about\n');
  assert.equal(await readFile(path.join(target, 'pages/internal/keep.md'), 'utf8'), '## page keep\n');
  await assert.rejects(readFile(path.join(target, 'posts/private/hidden.md')), /ENOENT/u);
  await assert.rejects(readFile(path.join(target, 'pages/internal/omit.md')), /ENOENT/u);
  await assert.rejects(readFile(path.join(target, 'posts/notes/.fireflyignore')), /ENOENT/u);
  await assert.rejects(readFile(path.join(target, 'pages/internal/.fireflyignore')), /ENOENT/u);
  await assert.rejects(readFile(path.join(target, '.fireflyignore')), /ENOENT/u);
  assert.deepEqual(await readFile(path.join(source, 'posts/private/hidden.md')), sourceBytes);
  assert.equal((await lstat(path.join(target, 'posts/notes/keep.md'))).isSymbolicLink(), false);
});

test('single-tree materialization accepts a root policy without matching its own root', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-ignore-single-tree-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'posts');
  const target = path.join(root, 'generated');
  await mkdir(path.join(source, 'nested'), { recursive: true });
  await writeFile(path.join(source, '.fireflyignore'), 'nested/\n');
  await writeFile(path.join(source, 'public.md'), '# public\n');
  await writeFile(path.join(source, 'nested', 'private.md'), '# private\n');

  assert.deepEqual(
    await materializeMarkdownWorkspace({ sourceRoot: source, targetRoot: target }),
    ['public.md']
  );
  await assert.rejects(readFile(path.join(target, 'nested', 'private.md')), /ENOENT/u);
});

test('.gitignore alone does not change publication and malformed policy preserves the prior stage', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-ignore-errors-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'content');
  const target = path.join(root, 'generated-content');
  await mkdir(path.join(source, 'posts'), { recursive: true });
  await mkdir(path.join(source, 'pages'), { recursive: true });
  await writeFile(path.join(source, '.gitignore'), 'posts/hidden.md\n');
  await writeFile(path.join(source, 'posts', 'hidden.md'), '# still public\n');
  await writeFile(path.join(source, 'pages', 'about.md'), '# about\n');
  assert.deepEqual((await scanContentWorkspace(source)).posts.map(({ virtualPath }) => virtualPath), ['hidden.md']);

  await mkdir(path.join(target, 'posts'), { recursive: true });
  await mkdir(path.join(target, 'pages'), { recursive: true });
  await writeFile(path.join(target, 'posts', 'prior.md'), '# prior\n');
  await writeFile(path.join(source, '.fireflyignore'), 'bad\\');
  await assert.rejects(
    materializeContentWorkspace({ sourceRoot: source, targetRoot: target }),
    /\.fireflyignore:1/u
  );
  assert.equal(await readFile(path.join(target, 'posts', 'prior.md'), 'utf8'), '# prior\n');
});

test('a symlinked policy is rejected as an unsafe hidden link', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-ignore-link-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'source');
  const policy = path.join(root, 'policy.txt');
  await mkdir(source, { recursive: true });
  await writeFile(policy, '*.md\n');
  await symlink(policy, path.join(source, '.fireflyignore'));
  await assert.rejects(
    import('../scripts/materialize-content.mjs').then(({ scanMarkdownWorkspace }) => scanMarkdownWorkspace(source, {
      collection: 'posts',
      policyRoot: source
    })),
    /Unsafe hidden content link.*\.fireflyignore/u
  );
});
