import assert from 'node:assert/strict';
import test from 'node:test';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { semanticPresentation } from '@firefly/presentation-semantic';
import { terminalPresentation } from '@firefly/presentation-terminal';
import {
  createXCorePlugins,
  DEFAULT_PRESENTATION_ID,
  parseXCoreMetadata,
  PresentationRegistry,
  XCoreError
} from '@firefly/x-core';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { postSchema } from '../src/lib/content-schema.mjs';
import { markdownHtmlSchema } from '../src/lib/markdown-html-policy.mjs';

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
  const plugins = createXCorePlugins({
    registry,
    resolveContext: contextResolver,
    allowAuthoredHtml: true
  });

  return createMarkdownProcessor({
    syntaxHighlight: false,
    remarkPlugins: [plugins.remarkPlugin],
    rehypePlugins: [
      rehypeRaw,
      [rehypeSanitize, markdownHtmlSchema],
      plugins.rehypePlugin
    ],
    remarkRehype: { allowDangerousHtml: true }
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
  assert.equal(Object.hasOwn(metadata, 'articleTheme'), false);
  assert.deepEqual(Object.keys(metadata).sort(), [
    'enhancements',
    'outline',
    'presentation',
    'references',
    'summary',
    'version'
  ]);
  assert.match(first.code, /role="region"/u);
  assert.match(first.code, /data-wide-content="code"/u);
  assert.doesNotMatch(first.code, /<script/u);
});

test('omitted presentation selects firefly while explicit semantic remains available', async () => {
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
  assert.equal(Object.hasOwn(metadata, 'articleTheme'), false);
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

test('the production registry selects explicit semantic and firefly presentations', async () => {
  const processor = await createProcessor();
  const markdown = '## Wide content\n\n| Name | Value |\n| --- | --- |\n| adapter | selected |';
  const semantic = await processor.render(markdown, {
    fileURL: new URL('file:///repo/content/posts/semantic.md'),
    frontmatter: { ...validFrontmatter, slug: 'semantic', presentation: 'semantic' }
  });
  const terminal = await processor.render(markdown, {
    fileURL: new URL('file:///repo/content/posts/terminal.md'),
    frontmatter: { ...validFrontmatter, slug: 'firefly', presentation: DEFAULT_PRESENTATION_ID }
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

test('Astro sanitizes authored HTML before X Core metadata and presentation transforms', async () => {
  const processor = await createProcessor();
  const markdown = `## Safe HTML

<div class="firefly-content-callout arbitrary-author-class" data-article-theme="future" style="color: red" onclick="alert(1)">A safe callout.</div>

<script>alert('script')</script>
<style>body { color: red; }</style>
<iframe src="https://unsafe-embedding.test/">embedding</iframe>
<form action="https://unsafe-form.test/"><input type="text" value="unsafe"></form>
<a href="javascript:alert(1)" onmouseover="alert(1)">unsafe link</a>
<a href="//unsafe-protocol-relative.test/">protocol-relative link</a>
<img src="data:text/html,unsafe" onerror="alert(1)" style="display: none" alt="unsafe image">

## <center> Legacy center heading </center>

A paragraph remains in the normalized document.`;

  const semantic = await processor.render(markdown, {
    fileURL: new URL('file:///repo/content/posts/integration-fixture.md'),
    frontmatter: validFrontmatter
  });
  const terminal = await processor.render(markdown, {
    fileURL: new URL('file:///repo/content/posts/integration-fixture.md'),
    frontmatter: { ...validFrontmatter, presentation: DEFAULT_PRESENTATION_ID }
  });
  const semanticMetadata = parseXCoreMetadata(semantic.metadata.frontmatter.xCore);
  const terminalMetadata = parseXCoreMetadata(terminal.metadata.frontmatter.xCore);

  assert.deepEqual(semanticMetadata.outline, [
    { depth: 2, id: 'safe-html', text: 'Safe HTML' },
    { depth: 2, id: 'legacy-center-heading', text: 'Legacy center heading' }
  ]);
  assert.deepEqual(semanticMetadata.outline, terminalMetadata.outline);
  assert.equal(semanticMetadata.presentation, 'semantic');
  assert.equal(terminalMetadata.presentation, DEFAULT_PRESENTATION_ID);
  assert.deepEqual(semanticMetadata.enhancements, []);
  assert.deepEqual(terminalMetadata.enhancements, []);

  for (const rendered of [semantic, terminal]) {
    assert.match(rendered.code, /<div class="firefly-content-callout">A safe callout\.<\/div>/u);
    assert.match(rendered.code, /<center>\s+Legacy center heading\s+<\/center>/u);
    assert.match(rendered.code, /data-node-id="posts-integration-fixture-p-1"/u);
    assert.doesNotMatch(rendered.code, /<script|<style|<iframe|<form|<input|javascript:|data:text|data-article-theme|onmouseover|onerror|style=/iu);
    assert.doesNotMatch(rendered.code, /arbitrary-author-class|unsafe-protocol-relative/u);
  }

  assert.match(semantic.code, /class="firefly-content-callout"/u);
  assert.doesNotMatch(semantic.code, /data-terminal-wide|terminal-wide/u);
  assert.match(terminal.code, /class="firefly-content-callout"/u);
  assert.doesNotMatch(terminal.code, /data-wide-content|wide-content/u);
});

test('site policy preserves safe relative and HTTP(S) resource links only', async () => {
  const processor = await createProcessor();
  const rendered = await processor.render(
    '<a href="/pages/about/">internal</a> <a href="guide.md">relative</a> <a href="https://safe.test/">external</a> <a href="mailto:unsafe@example.test">removed</a>',
    {
      fileURL: new URL('file:///repo/content/posts/integration-fixture.md'),
      frontmatter: validFrontmatter
    }
  );

  assert.match(rendered.code, /<a href="\/pages\/about\/">internal<\/a>/u);
  assert.match(rendered.code, /<a href="guide\.md">relative<\/a>/u);
  assert.match(rendered.code, /<a href="https:\/\/safe\.test\/">external<\/a>/u);
  assert.match(rendered.code, /<a>removed<\/a>/u);
});
