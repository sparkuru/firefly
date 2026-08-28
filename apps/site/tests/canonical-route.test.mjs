import assert from 'node:assert/strict';
import test from 'node:test';
import { projectCanonicalRoute } from '../src/lib/canonical-route.mjs';

test('projects pages and root posts into canonical routes', () => {
  assert.equal(projectCanonicalRoute({ collection: 'pages', slug: 'about' }), '/pages/about/');
  assert.equal(
    projectCanonicalRoute({ collection: 'posts', relativePath: 'welcome.md', slug: 'welcome' }),
    '/posts/welcome/'
  );
});

test('preserves nested post parents while normalizing canonical slugs', () => {
  assert.equal(
    projectCanonicalRoute({
      collection: 'posts',
      relativePath: 'architecture/notes.md',
      slug: 'A title with spaces'
    }),
    '/posts/architecture/A-title-with-spaces/'
  );
  assert.equal(
    projectCanonicalRoute({
      collection: 'posts',
      relativePath: '交流/萤火虫.md',
      slug: '萤火虫'
    }),
    '/posts/交流/萤火虫/'
  );
  assert.equal(
    projectCanonicalRoute({ collection: 'pages', slug: 'about this page' }),
    '/pages/about-this-page/'
  );
});

test('fails closed for missing or unsafe post route inputs', () => {
  assert.throws(
    () => projectCanonicalRoute({ collection: 'posts', slug: 'missing-path' }),
    /posts require a relative Markdown path/u
  );

  for (const input of [
    { collection: 'posts', relativePath: '../escape.md', slug: 'post' },
    { collection: 'posts', relativePath: 'nested/%2F.md', slug: 'post' },
    { collection: 'posts', relativePath: 'nested/post.txt', slug: 'post' },
    { collection: 'posts', relativePath: 'nested/post.md', slug: 'bad/route' },
    { collection: 'posts', relativePath: 'nested/post.md', slug: 'e\u0301' },
    { collection: 'other', relativePath: 'post.md', slug: 'post' }
  ]) {
    assert.throws(() => projectCanonicalRoute(input), TypeError);
  }
});
