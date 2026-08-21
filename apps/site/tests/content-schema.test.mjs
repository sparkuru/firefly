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
  aliases: ['/posts/main/379-alias/']
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
  assert.deepEqual(post.tags, ['trellis']);
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

test('a source article keeps metadata and Markdown content', async () => {
  const article = await readFile(
    new URL('../../../content/posts/ai/llm-workflow-with-trellis.md', import.meta.url),
    'utf8'
  );
  assert.match(article, /^---\ntitle: "llm-workflow-with-trellis"\ndescription: "和 LLM 沟通比和人打交道简单多了。"\ndate: "2026-05-28T03:48:00.000Z"/mu);
  assert.match(article, /draft: false\nlayout: "post"\nslug: "llm-workflow-with-trellis"/u);
  assert.doesNotMatch(article, /^presentation:/mu);
  assert.equal((article.match(/^# /gmu) ?? []).length, 0);
  assert.match(article, /^## llm workflow with trellis$/mu);
  assert.match(article, /^### Phase 1 — Plan$/mu);
  assert.match(article, /^\| Spec 系统/mu);
  assert.match(article, /^> trellis 的工作流/mu);
  assert.match(article, /^```mermaid\nflowchart TD/mu);
  assert.match(article, /https:\/\/github\.com\/mindfold-ai\/Trellis\.git/u);
});
