import assert from 'node:assert/strict';
import test from 'node:test';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { semanticPresentation } from '@f1refly/presentation-semantic';
import { terminalPresentation } from '@f1refly/presentation-terminal';
import {
  createXCorePlugins,
  DEFAULT_PRESENTATION_ID,
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
    presentation: frontmatter.presentation ?? DEFAULT_PRESENTATION_ID
  };
}

async function createProcessor(
  registry = new PresentationRegistry()
    .register(semanticPresentation)
    .register(terminalPresentation)
) {
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

test('omitted presentation selects f1refly while explicit semantic remains available', async () => {
  const processor = await createProcessor();
  const frontmatter = postSchema.parse({
    title: 'Default integration fixture',
    slug: 'default',
    date: '2026-08-12',
    description: 'Exercises the default presentation.',
    draft: false,
    layout: 'post'
  });
  const rendered = await processor.render('## Default document\n\nA default body.\n\n```text\nwide content\n```', {
    fileURL: new URL('file:///repo/content/posts/default.md'),
    frontmatter
  });
  const metadata = parseXCoreMetadata(rendered.metadata.frontmatter.xCore);

  assert.equal(metadata.presentation, DEFAULT_PRESENTATION_ID);
  assert.match(rendered.code, /data-terminal-wide/u);
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

test('the production registry selects explicit semantic and f1refly presentations', async () => {
  const processor = await createProcessor();
  const markdown = '## Wide content\n\n| Name | Value |\n| --- | --- |\n| adapter | selected |';
  const semantic = await processor.render(markdown, {
    fileURL: new URL('file:///repo/content/posts/semantic.md'),
    frontmatter: { ...validFrontmatter, slug: 'semantic', presentation: 'semantic' }
  });
  const terminal = await processor.render(markdown, {
    fileURL: new URL('file:///repo/content/posts/terminal.md'),
    frontmatter: { ...validFrontmatter, slug: 'f1refly', presentation: DEFAULT_PRESENTATION_ID }
  });
  assert.match(semantic.code, /data-wide-content="table"/u);
  assert.doesNotMatch(semantic.code, /data-terminal-wide/u);
  assert.match(terminal.code, /data-terminal-wide="table"/u);
  assert.doesNotMatch(terminal.code, /data-wide-content/u);
  assert.equal(parseXCoreMetadata(semantic.metadata.frontmatter.xCore).presentation, 'semantic');
  assert.equal(parseXCoreMetadata(terminal.metadata.frontmatter.xCore).presentation, DEFAULT_PRESENTATION_ID);
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
