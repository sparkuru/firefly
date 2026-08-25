import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { DEFAULT_PRESENTATION_ID } from '@firefly/x-core';
import { pageSchema, postSchema } from '../src/lib/content-schema.mjs';

const validPost = {
  title: 'llm-workflow-with-trellis',
  htmlTitle: 'LLM workflow with Trellis',
  slug: '379',
  date: '2026-05-28',
  updated: '2026-07-03',
  description: 'A semantic post.',
  canonical: 'https://example.test/posts/379/',
  seoImage: '/images/trellis.png',
  noindex: false,
  tags: ['trellis'],
  draft: false,
  layout: 'post',
  presentation: 'semantic',
  aliases: ['/posts/main/379-alias/'],
  source: 'legacy/379.md#workflow'
};

const validPage = {
  title: 'About this foundation',
  slug: 'about',
  date: '2026-08-12',
  description: 'Why this site starts with a small and dependable content pipeline.',
  draft: false,
  layout: 'page',
  presentation: DEFAULT_PRESENTATION_ID
};

test('valid metadata parses and coerces dates', () => {
  const post = postSchema.parse(validPost);
  const page = pageSchema.parse(validPage);

  assert.ok(post.date instanceof Date);
  assert.ok(post.updated instanceof Date);
  assert.ok(page.date instanceof Date);
  assert.deepEqual(post.access, { visibility: 'public' });
  assert.deepEqual(post.firefly, { markers: [] });
  assert.deepEqual(post.tags, ['trellis']);
  assert.equal(post.source, 'legacy/379.md#workflow');
  assert.equal(postSchema.safeParse({ ...validPost, slug: undefined }).success, true);
});

test('omitted presentation defaults to firefly while semantic remains explicit', () => {
  const omitted = postSchema.parse({ ...validPost, presentation: undefined });

  assert.equal(omitted.presentation, DEFAULT_PRESENTATION_ID);
  assert.equal(postSchema.parse(validPost).presentation, 'semantic');
  assert.equal(postSchema.parse(validPost).htmlTitle, 'LLM workflow with Trellis');
  assert.equal(postSchema.parse(validPost).noindex, false);
});

test('used tag metadata stays a strict public string list', () => {
  assert.equal(postSchema.safeParse({ ...validPost, tags: ['foundation', 'astro'] }).success, true);
  assert.deepEqual(postSchema.parse({ ...validPost, tags: [' leading', 'trailing '] }).tags, ['leading', 'trailing']);
  for (const tags of [[''], ['valid', 1], 'foundation']) {
    assert.equal(postSchema.safeParse({ ...validPost, tags }).success, false);
  }
});

test('Firefly markers accept safe unknown IDs, deduplicate, and default empty', () => {
  const post = postSchema.parse({
    ...validPost,
    firefly: { markers: ['featured', 'future-marker', 'featured'] }
  });
  const page = pageSchema.parse({ ...validPage, firefly: { markers: ['featured'] } });

  assert.deepEqual(post.firefly.markers, ['featured', 'future-marker']);
  assert.deepEqual(page.firefly.markers, ['featured']);
  for (const markers of [
    ['Featured'],
    ['../private'],
    ['two words'],
    ['not-normalized e\u0301']
  ]) {
    assert.equal(postSchema.safeParse({ ...validPost, firefly: { markers } }).success, false, markers);
  }
  assert.equal(postSchema.safeParse({ ...validPost, firefly: { markers: ['featured'], extra: true } }).success, false);
  assert.equal(postSchema.safeParse({ ...validPost, firefly: 'featured' }).success, false);
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
  assert.equal(postSchema.parse({ ...validPost, slug: 'legacy title' }).slug, 'legacy-title');
  assert.equal(postSchema.parse({ ...validPost, slug: '  legacy\ttitle  ' }).slug, 'legacy-title');
});

test('legacy source metadata is a safe relative Markdown reference and never a route input', () => {
  for (const source of [
    '/absolute.md',
    '../outside.md',
    'legacy/../outside.md',
    'legacy/private.txt',
    'https:legacy.md',
    'legacy/unsafe%2f.md',
    'legacy/unsafe path.md',
    'legacy/file.md#',
    'legacy/file.md#unsafe fragment',
    'legacy/file.md#section/child'
  ]) {
    assert.equal(postSchema.safeParse({ ...validPost, source }).success, false, source);
  }
  const parsed = postSchema.parse({ ...validPost, slug: 'canonical title', source: 'legacy/file.md#section' });
  assert.equal(parsed.slug, 'canonical-title');
  assert.equal(parsed.source, 'legacy/file.md#section');
});

test('SEO front matter is strict and safe', () => {
  for (const value of [
    { ...validPost, canonical: '/relative/' },
    { ...validPost, canonical: 'javascript:alert(1)' },
    { ...validPost, canonical: 'https://example.test/#fragment' },
    { ...validPost, seoImage: 'relative.png' },
    { ...validPost, seoImage: '//cdn.example.test/card.png' },
    { ...validPost, seoImage: '/images/../secret.png' },
    { ...validPost, htmlTitle: 'unsafe\nline' },
    { ...validPost, noindex: 'true' }
  ]) {
    assert.equal(postSchema.safeParse(value).success, false);
  }
  assert.equal(postSchema.parse({ ...validPost, noindex: undefined }).noindex, false);
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
    postSchema.safeParse({ ...validPost, updated: '2026-05-01' }).success,
    false
  );
});

test('unknown front matter is rejected', () => {
  assert.equal(
    postSchema.safeParse({ ...validPost, unsupported: true }).success,
    false
  );
});

test('the real Terminal page keeps strict metadata and representative Markdown', async () => {
  const page = await readFile(
    new URL('../../../content/pages/about.md', import.meta.url),
    'utf8'
  );
  assert.match(page, /^---\ntitle: About this foundation\nslug: about\ndate: 2026-08-12/mu);
  assert.match(page, /draft: false\nlayout: page\n---/u);
  assert.doesNotMatch(page, /^presentation:/mu);
  assert.equal((page.match(/^# /gmu) ?? []).length, 0);
  assert.match(page, /^## A deliberately small beginning$/mu);
  assert.match(page, /^## What remains constant$/mu);
  assert.match(page, /Future presentations can change how the site looks/u);
});

test('the tracked demo article keeps compatibility metadata and authored Markdown content', async () => {
  const article = await readFile(
    new URL('../../../content/posts/ai/llm-workflow-with-trellis.md', import.meta.url),
    'utf8'
  );
  assert.match(article, /^---\ntitle: "llm-workflow-with-trellis"\ndate: 2026-05-28\nupdated: 2026-07-03\ndescription:/mu);
  assert.match(article, /draft: false\nlayout: post\n---/u);
  assert.doesNotMatch(article, /^source:/mu);
  assert.doesNotMatch(article, /^presentation:/mu);
  assert.equal((article.match(/^# /gmu) ?? []).length, 0);
  assert.match(article, /^## install$/mu);
  assert.match(article, /^## usage$/mu);
  assert.match(article, /Use the workflow like this/u);
  assert.match(article, /^\| Step \| Result \|/mu);
  assert.match(article, /^```mermaid\nflowchart TD/mu);
  assert.match(article, /https:\/\/github\.com\/mindfold-ai\/Trellis\.git/u);
});
