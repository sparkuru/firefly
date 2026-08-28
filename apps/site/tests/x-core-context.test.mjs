import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_PRESENTATION_ID, XCoreError } from '@firefly/x-core';
import { projectCanonicalRoute } from '../src/lib/canonical-route.mjs';
import { resolveDocumentContext } from '../src/lib/x-core-context.ts';

function stagedFile(collection, relativePath, frontmatter) {
  return {
    path: `/app/apps/site/.generated-content/${collection}/${relativePath}`,
    data: { astro: { frontmatter } }
  };
}

test('X Core context routes agree with the site canonical projection', () => {
  const cases = [
    {
      file: stagedFile('posts', 'welcome.md', { layout: 'post' }),
      input: { collection: 'posts', relativePath: 'welcome.md', slug: 'welcome' }
    },
    {
      file: stagedFile('posts', 'architecture/notes.md', { layout: 'post', slug: 'A title with spaces' }),
      input: { collection: 'posts', relativePath: 'architecture/notes.md', slug: 'A title with spaces' }
    },
    {
      file: stagedFile('posts', '交流/萤火虫.md', { layout: 'post' }),
      input: { collection: 'posts', relativePath: '交流/萤火虫.md', slug: '萤火虫' }
    },
    {
      file: stagedFile('pages', 'about.md', { layout: 'page', slug: 'about this page' }),
      input: { collection: 'pages', relativePath: 'about.md', slug: 'about this page' }
    }
  ];

  for (const { file, input } of cases) {
    const context = resolveDocumentContext(file);
    assert.equal(context.route, projectCanonicalRoute(input));
  }
});

test('X Core context preserves the default presentation and fails closed for unstaged posts', () => {
  const context = resolveDocumentContext(
    stagedFile('posts', 'default.md', { layout: 'post' })
  );
  assert.equal(context.presentation, DEFAULT_PRESENTATION_ID);

  assert.throws(
    () => resolveDocumentContext({
      path: '/app/content/posts/not-staged.md',
      data: { astro: { frontmatter: { layout: 'post' } } }
    }),
    (error) => error instanceof XCoreError && error.diagnostic.code === 'XCORE_CONTEXT_RESOLUTION'
  );
});
