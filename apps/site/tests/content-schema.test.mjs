import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { pageSchema, postSchema } from '../src/lib/content-schema.mjs';

const validPost = {
  title: 'Hello, static foundation',
  slug: 'hello-static-foundation',
  date: '2026-08-12',
  updated: '2026-08-13',
  description: 'A valid post.',
  tags: ['foundation'],
  draft: false,
  layout: 'post',
  presentation: 'semantic',
  aliases: ['/hello-static-foundation/']
};

const validPage = {
  title: 'About',
  slug: 'about',
  date: '2026-08-12',
  description: 'A valid page.',
  draft: false,
  layout: 'page'
};

test('valid metadata parses and coerces dates', () => {
  const post = postSchema.parse(validPost);
  const page = pageSchema.parse(validPage);

  assert.ok(post.date instanceof Date);
  assert.ok(post.updated instanceof Date);
  assert.ok(page.date instanceof Date);
  assert.deepEqual(post.access, { visibility: 'public' });
  assert.equal(postSchema.safeParse({ ...validPost, slug: undefined }).success, true);
});

test('access metadata is an exact public or private-owner union', () => {
  assert.equal(postSchema.safeParse({ ...validPost, access: { visibility: 'public' } }).success, true);
  assert.equal(postSchema.safeParse({ ...validPost, access: { visibility: 'private', owner: 'owner-1' } }).success, true);
  for (const access of [
    { visibility: 'public', owner: 'owner-1' },
    { visibility: 'private' },
    { visibility: 'private', owner: '../owner' },
    { visibility: 'unknown' }
  ]) {
    assert.equal(postSchema.safeParse({ ...validPost, access }).success, false);
  }
});

test('invalid date values are rejected', () => {
  for (const date of ['not-a-date', null, true, false, 0]) {
    assert.equal(postSchema.safeParse({ ...validPost, date }).success, false);
  }
});

test('invalid slug is rejected', () => {
  for (const slug of ['nested/post', '.hidden', '..', 'encoded%2fpath', 'back\\slash', 'not normalized e\u0301']) {
    assert.equal(postSchema.safeParse({ ...validPost, slug }).success, false, slug);
  }
});

test('aliases require canonical safe directory routes', () => {
  assert.equal(postSchema.safeParse({ ...validPost, aliases: ['/archive/2026/'] }).success, true);
  for (const alias of ['relative/', '//double/', '/missing-trailing', '/nested//path/', '/./path/', '/../path/', '/.hidden/', '/encoded%2fpath/', '/back\\slash/']) {
    assert.equal(postSchema.safeParse({ ...validPost, aliases: [alias] }).success, false, alias);
  }
});

test('unknown layouts and malformed presentations are rejected', () => {
  assert.equal(
    postSchema.safeParse({ ...validPost, layout: 'page' }).success,
    false
  );
  assert.equal(
    pageSchema.safeParse({ ...validPage, layout: 'post' }).success,
    false
  );
  for (const presentation of ['Semantic', 'two words', '-invalid', 'invalid-']) {
    assert.equal(
      postSchema.safeParse({ ...validPost, presentation }).success,
      false
    );
  }
});

test('syntactically valid adapter IDs reach registry validation', () => {
  assert.equal(
    postSchema.safeParse({ ...validPost, presentation: 'unregistered' }).success,
    true
  );
});

test('an update before publication is rejected', () => {
  assert.equal(
    postSchema.safeParse({ ...validPost, updated: '2026-08-01' }).success,
    false
  );
});

test('unknown front matter is rejected', () => {
  assert.equal(
    postSchema.safeParse({ ...validPost, unsupported: true }).success,
    false
  );
});

test('the real Terminal article keeps strict metadata and representative Markdown', async () => {
  const article = await readFile(
    new URL('../../../content/posts/llm-workflow-with-trellis.md', import.meta.url),
    'utf8'
  );
  assert.match(article, /^---\ntitle: llm workflow with trellis\nslug: llm-workflow-with-trellis\ndate: 2026-05-28\nupdated: 2026-07-03/mu);
  assert.match(article, /draft: false\nlayout: post\npresentation: terminal/u);
  assert.equal((article.match(/^# /gmu) ?? []).length, 0);
  assert.match(article, /^## install$/mu);
  assert.match(article, /^### Phase 1 — Plan$/mu);
  assert.match(article, /^\| Spec 系统/mu);
  assert.match(article, /^> trellis 的工作流/mu);
  assert.match(article, /^```mermaid\nflowchart TD/mu);
  assert.match(article, /\[Trellis repository\]\(https:\/\/github\.com\/mindfold-ai\/Trellis\.git\)/u);
  assert.doesNotMatch(article, /trellis-spec-bootstarp/u);
});
