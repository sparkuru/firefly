import assert from 'node:assert/strict';
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
});

test('invalid date values are rejected', () => {
  for (const date of ['not-a-date', null, true, false, 0]) {
    assert.equal(postSchema.safeParse({ ...validPost, date }).success, false);
  }
});

test('invalid slug is rejected', () => {
  assert.equal(
    postSchema.safeParse({ ...validPost, slug: 'nested/post' }).success,
    false
  );
});

test('unknown layouts and presentations are rejected', () => {
  assert.equal(
    postSchema.safeParse({ ...validPost, layout: 'page' }).success,
    false
  );
  assert.equal(
    pageSchema.safeParse({ ...validPage, layout: 'post' }).success,
    false
  );
  assert.equal(
    postSchema.safeParse({ ...validPost, presentation: 'terminal' }).success,
    false
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
