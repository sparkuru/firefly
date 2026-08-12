import assert from 'node:assert/strict';
import test from 'node:test';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { semanticPresentation } from '@f1refly/presentation-semantic';
import {
  createXCorePlugins,
  parseXCoreMetadata,
  PresentationRegistry,
  XCoreError
} from '@f1refly/x-core';
import { postSchema } from '../src/lib/content-schema.mjs';

const validFrontmatter = postSchema.parse({
  title: 'Integration fixture',
  slug: 'integration-fixture',
  date: '2026-08-12',
  description: 'Exercises the Astro metadata bridge.',
  draft: false,
  layout: 'post',
  presentation: 'semantic'
});

function contextResolver(file) {
  const frontmatter = file.data.astro?.frontmatter;

  if (!frontmatter || typeof frontmatter.slug !== 'string') {
    throw new Error('Missing integration fixture front matter.');
  }

  return {
    documentId: `posts/${frontmatter.slug}`,
    sourcePath: `content/posts/${frontmatter.slug}.md`,
    route: `/posts/${frontmatter.slug}/`,
    collection: 'posts',
    slug: frontmatter.slug,
    layout: frontmatter.layout,
    presentation: frontmatter.presentation ?? 'semantic'
  };
}

async function createProcessor(registry = new PresentationRegistry().register(semanticPresentation)) {
  const plugins = createXCorePlugins({ registry, resolveContext: contextResolver });

  return createMarkdownProcessor({
    syntaxHighlight: false,
    remarkPlugins: [plugins.remarkPlugin],
    rehypePlugins: [plugins.rehypePlugin],
    remarkRehype: { allowDangerousHtml: false }
  });
}

test('Astro carries deterministic X Core metadata and matching heading IDs', async () => {
  const processor = await createProcessor();
  const markdown = `## Duplicate

The integration summary links to [About](/pages/about/).

## Duplicate

\`\`\`text
wide content
\`\`\``;
  const first = await processor.render(markdown, {
    fileURL: new URL('file:///repo/content/posts/integration-fixture.md'),
    frontmatter: validFrontmatter
  });
  const second = await processor.render(markdown, {
    fileURL: new URL('file:///repo/content/posts/integration-fixture.md'),
    frontmatter: validFrontmatter
  });
  const metadata = parseXCoreMetadata(first.metadata.frontmatter.xCore);

  assert.deepEqual(first, second);
  assert.deepEqual(
    first.metadata.headings.map(({ depth, slug, text }) => ({ depth, slug, text })),
    metadata.outline.map(({ depth, id, text }) => ({ depth, slug: id, text }))
  );
  assert.deepEqual(metadata.outline.map(({ id }) => id), ['duplicate', 'duplicate-1']);
  assert.equal(metadata.presentation, 'semantic');
  assert.deepEqual(metadata.enhancements, []);
  assert.match(first.code, /role="region"/u);
  assert.match(first.code, /data-wide-content="code"/u);
  assert.doesNotMatch(first.code, /<script/u);
});

test('the same schema-validated Markdown selects deterministic semantic and fixture presentations', async () => {
  const fixtureAdapter = {
    id: 'fixture',
    supports: () => true,
    transform: ({ tree }) => {
      tree.children.unshift({
        type: 'element',
        tagName: 'aside',
        properties: { dataPresentation: 'fixture' },
        children: [{ type: 'text', value: 'Fixture presentation' }]
      });
      return tree;
    },
    enhancements: () => []
  };
  const processor = await createProcessor(
    new PresentationRegistry()
      .register(semanticPresentation)
      .register(fixtureAdapter)
  );
  const markdown = '## Shared document\n\nOne body, selected at build time.';
  const renderOptions = {
    fileURL: new URL('file:///repo/content/posts/integration-fixture.md'),
    frontmatter: validFrontmatter
  };
  const semantic = await processor.render(markdown, renderOptions);
  const fixtureOptions = {
    ...renderOptions,
    frontmatter: { ...validFrontmatter, presentation: 'fixture' }
  };
  const fixture = await processor.render(markdown, fixtureOptions);
  const fixtureAgain = await processor.render(markdown, fixtureOptions);
  const semanticMetadata = parseXCoreMetadata(semantic.metadata.frontmatter.xCore);
  const fixtureMetadata = parseXCoreMetadata(fixture.metadata.frontmatter.xCore);

  assert.ok(validFrontmatter.date instanceof Date);
  assert.doesNotMatch(semantic.code, /Fixture presentation/u);
  assert.match(fixture.code, /Fixture presentation/u);
  assert.deepEqual(fixture, fixtureAgain);
  assert.equal(semanticMetadata.summary, fixtureMetadata.summary);
  assert.deepEqual(semanticMetadata.outline, fixtureMetadata.outline);
  assert.equal(semanticMetadata.presentation, 'semantic');
  assert.equal(fixtureMetadata.presentation, 'fixture');
});

test('Astro surfaces unknown adapters with owning document context', async () => {
  const processor = await createProcessor();

  await assert.rejects(
    processor.render('A valid body.', {
      fileURL: new URL('file:///repo/content/posts/integration-fixture.md'),
      frontmatter: { ...validFrontmatter, presentation: 'unregistered' }
    }),
    (error) => {
      assert.ok(error instanceof XCoreError);
      assert.equal(error.diagnostic.code, 'XCORE_UNKNOWN_PRESENTATION');
      assert.match(error.message, /posts\/integration-fixture/u);
      assert.match(error.message, /\/posts\/integration-fixture\//u);
      return true;
    }
  );
});

test('Astro rejects raw HTML before the dangerous HTML bridge', async () => {
  const processor = await createProcessor();

  await assert.rejects(
    processor.render('<div>Authored HTML is prohibited.</div>', {
      fileURL: new URL('file:///repo/content/posts/integration-fixture.md'),
      frontmatter: validFrontmatter
    }),
    (error) => {
      assert.ok(error instanceof XCoreError);
      assert.equal(error.diagnostic.code, 'XCORE_RAW_HTML');
      assert.match(error.message, /content\/posts\/integration-fixture\.md/u);
      return true;
    }
  );
});
