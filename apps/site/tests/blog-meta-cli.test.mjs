import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { main, parseFrontMatter } from '../scripts/blog-meta.mjs';

const scriptPath = path.resolve(new URL('../scripts/blog-meta.mjs', import.meta.url).pathname);

async function runCli(arguments_, { cwd = path.dirname(scriptPath), env = process.env } = {}) {
  let stdout = '';
  let stderr = '';
  const output = { write(chunk) { stdout += String(chunk); } };
  const errors = { write(chunk) { stderr += String(chunk); } };
  const status = await main(arguments_, { cwd, env, stdout: output, stderr: errors });
  return { status, stdout, stderr };
}

async function blogFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-blog-meta-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const blog = path.join(root, 'blog');
  await mkdir(path.join(blog, 'posts'), { recursive: true });
  await mkdir(path.join(blog, 'pages'), { recursive: true });
  return { root, blog };
}

test('save-as adds schema-valid defaults and preserves a no-frontmatter body byte-for-byte', async (t) => {
  const { root, blog } = await blogFixture(t);
  const source = path.join(root, 'drafts', '001-unicode note.md');
  const body = Buffer.from('# Draft title\n\nUnicode: 萤火虫\n\n```text\n# keep\n```\r\n', 'utf8');
  await mkdir(path.dirname(source), { recursive: true });
  await writeFile(source, body);

  const result = await runCli([source, '--blog-root', blog]);
  assert.equal(result.status, 0, result.stderr);
  const destination = path.join(blog, 'posts', 'unicode-note.md');
  const output = await readFile(destination);
  const parsed = parseFrontMatter(output, destination);
  assert.equal(parsed.metadata.title, 'Draft title');
  assert.equal(parsed.metadata.description, 'Unicode: 萤火虫');
  assert.equal(parsed.metadata.draft, true);
  assert.equal(parsed.metadata.layout, 'post');
  assert.equal(parsed.metadata.date, new Date().toISOString().slice(0, 10));
  assert.deepEqual(parsed.body, body);
  assert.match(result.stdout, new RegExp(`Wrote ${destination.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}`));

  const bomSource = path.join(root, 'drafts', '002-bom.md');
  const bomBody = Buffer.from('# BOM body\n', 'utf8');
  await writeFile(bomSource, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), bomBody]));
  const bomResult = await runCli([bomSource, '--blog-root', blog, '--output', 'posts/bom.md']);
  assert.equal(bomResult.status, 0, bomResult.stderr);
  const bomOutput = await readFile(path.join(blog, 'posts/bom.md'));
  assert.deepEqual(bomOutput.subarray(0, 3), Buffer.from([0xef, 0xbb, 0xbf]));
  assert.deepEqual(parseFrontMatter(bomOutput).body, bomBody);
});

test('pages infer a safe slug and explicit overrides preserve unrelated metadata', async (t) => {
  const { root, blog } = await blogFixture(t);
  const source = path.join(root, 'source', '12-page note.md');
  await mkdir(path.dirname(source), { recursive: true });
  await writeFile(source, Buffer.from('Body with 中文.\n', 'utf8'));

  const result = await runCli([
    source,
    '--blog-root', blog,
    '--collection', 'pages',
    '--title', 'A page',
    '--tag', 'one',
    '--tag', 'two',
    '--access', 'private:owner-1'
  ]);
  assert.equal(result.status, 0, result.stderr);
  const destination = path.join(blog, 'pages', 'page-note.md');
  const parsed = parseFrontMatter(await readFile(destination), destination);
  assert.equal(parsed.metadata.title, 'A page');
  assert.equal(parsed.metadata.slug, 'page-note');
  assert.equal(parsed.metadata.layout, 'page');
  assert.deepEqual(parsed.metadata.tags, ['one', 'two']);
  assert.deepEqual(parsed.metadata.access, { visibility: 'private', owner: 'owner-1' });
  assert.equal(parsed.body.toString('utf8'), 'Body with 中文.\n');
});

test('empty and existing front matter are normalized without losing authored fields', async (t) => {
  const { root, blog } = await blogFixture(t);
  const emptySource = path.join(root, 'empty.md');
  await writeFile(emptySource, '---\n---\n# Empty body\n');
  const emptyResult = await runCli([emptySource, '--blog-root', blog]);
  assert.equal(emptyResult.status, 0, emptyResult.stderr);
  const emptyOutput = parseFrontMatter(await readFile(path.join(blog, 'posts/empty.md')));
  assert.equal(emptyOutput.metadata.title, 'Empty body');
  assert.equal(emptyOutput.metadata.draft, true);
  assert.equal(emptyOutput.body.toString('utf8'), '# Empty body\n');

  const existingSource = path.join(root, 'existing.md');
  await writeFile(existingSource, [
    '---',
    'title: Existing title',
    'date: 2026-01-01',
    'description: Keep this description',
    'tags:',
    '  - retained',
    'draft: true',
    'layout: post',
    'firefly:',
    '  markers:',
    '    - featured',
    '---',
    '',
    'Existing body.\n'
  ].join('\n'));
  const existingResult = await runCli([existingSource, '--blog-root', blog, '--output', 'posts/existing-copy.md']);
  assert.equal(existingResult.status, 0, existingResult.stderr);
  const existingOutput = parseFrontMatter(await readFile(path.join(blog, 'posts/existing-copy.md')));
  assert.equal(existingOutput.metadata.title, 'Existing title');
  assert.deepEqual(existingOutput.metadata.tags, ['retained']);
  assert.deepEqual(existingOutput.metadata.firefly, { markers: ['featured'] });
  assert.equal(existingOutput.body.toString('utf8'), '\nExisting body.\n');
});

test('write-back is explicit, preview does not write, and save-as refuses an existing target', async (t) => {
  const { blog } = await blogFixture(t);
  const source = path.join(blog, 'posts', 'existing.md');
  await writeFile(source, '# Existing\n');

  const preview = await runCli([source, '--blog-root', blog, '--preview', '--output', 'posts/preview.md']);
  assert.equal(preview.status, 0, preview.stderr);
  assert.match(preview.stdout, /Preview:/u);
  assert.equal(await readFile(source, 'utf8'), '# Existing\n');

  const collision = await runCli([source, '--blog-root', blog]);
  assert.notEqual(collision.status, 0);
  assert.match(collision.stderr, /write-back|output path|destination is the source|already exists/iu);

  const writeBack = await runCli([source, '--blog-root', blog, '--write-back', '--date', '2026-01-02']);
  assert.equal(writeBack.status, 0, writeBack.stderr);
  const updated = parseFrontMatter(await readFile(source), source);
  assert.equal(updated.metadata.date, '2026-01-02');
  assert.equal(updated.metadata.draft, true);
  assert.equal(updated.body.toString('utf8'), '# Existing\n');
});

test('schema, source-link, and output-containment failures do not write a destination', async (t) => {
  const { root, blog } = await blogFixture(t);
  const source = path.join(root, 'bad.md');
  await writeFile(source, '---\ntitle: valid\nunsupported: true\n---\nbody\n');
  const invalid = await runCli([source, '--blog-root', blog]);
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stderr, /invalid|unsupported/iu);
  await assert.rejects(readFile(path.join(blog, 'posts', 'bad.md')));

  const malformed = path.join(root, 'malformed.md');
  await writeFile(malformed, '---\ntitle: [unterminated\n---\nbody\n');
  const malformedResult = await runCli([malformed, '--blog-root', blog]);
  assert.notEqual(malformedResult.status, 0);
  assert.match(malformedResult.stderr, /invalid YAML|front matter/iu);
  await assert.rejects(readFile(path.join(blog, 'posts', 'malformed.md')));

  const linked = path.join(root, 'linked.md');
  await symlink(source, linked);
  const linkResult = await runCli([linked, '--blog-root', blog]);
  assert.notEqual(linkResult.status, 0);
  assert.match(linkResult.stderr, /symbolic link/iu);

  const valid = path.join(root, 'valid.md');
  await writeFile(valid, '# valid\n');
  const escape = await runCli([valid, '--blog-root', blog, '--output', '../outside.md']);
  assert.notEqual(escape.status, 0);
  assert.match(escape.stderr, /output|unsafe|root/iu);
});
