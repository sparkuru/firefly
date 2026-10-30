import assert from 'node:assert/strict';
import test from 'node:test';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { semanticPresentation } from '@firefly/presentation-semantic';
import { terminalPresentation } from '@firefly/presentation-terminal';
import { createXCorePlugins, PresentationRegistry } from '@firefly/x-core';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { markdownHtmlSchema } from '../src/lib/markdown-html-policy.mjs';
import { collectFireflyBlocks, createFireflyBlockPlugins, parseFireflyBlock } from '../src/build/firefly-blocks.mjs';

const context = ({ data }) => ({
  documentId: 'posts/fixture.md',
  sourcePath: 'posts/fixture.md',
  route: '/posts/fixture/',
  collection: 'posts',
  slug: 'fixture',
  layout: 'post',
  presentation: data.astro?.frontmatter?.presentation ?? 'firefly'
});

async function processor() {
  const registry = new PresentationRegistry().register(terminalPresentation).register(semanticPresentation);
  const xCore = createXCorePlugins({ registry, resolveContext: context, allowAuthoredHtml: true });
  const firefly = createFireflyBlockPlugins({
    resolveContext: context,
    resolveMedia: ({ src }) => src.startsWith('./')
      ? { src: '/firefly-media/test.png', width: 640, height: 480 }
      : src
  });
  return createMarkdownProcessor({
    syntaxHighlight: false,
    remarkPlugins: [firefly.remarkPlugin, xCore.remarkPlugin],
    rehypePlugins: [rehypeRaw, [rehypeSanitize, markdownHtmlSchema], firefly.rehypePlugin, xCore.rehypePlugin],
    remarkRehype: { allowDangerousHtml: true }
  });
}

test('validates exact fields, URL protocols, duplicate keys and aliases', () => {
  assert.deepEqual(parseFireflyBlock('type: image\nsrc: ./image.png\nalt: ""'), { type: 'image', src: './image.png', alt: '' });
  assert.deepEqual(parseFireflyBlock('type: link\nurl: https://example.test/'), { type: 'link', url: 'https://example.test/' });
  for (const invalid of [
    'type: image\nsrc: javascript:alert(1)',
    'type: image\nsrc: https://example.test/%zz',
    'type: image\nsrc: https://example.test/%C0%AF',
    'type: link\nurl: //example.test/',
    'type: image\nsrc: https://example.test/a\nstyle: red',
    'type: video\nsrc: x\nsrc: y',
    'type: composition\nlayout: side\nmedia: {}\ncontent: hi',
    'type: image\nsrc: &path image.png\nalt: *path',
    'type: unknown'
  ]) {
    assert.throws(() => parseFireflyBlock(invalid, { documentPath: 'posts/example.md', line: 4 }), /\[FIREFLY_BLOCK\] posts\/example\.md:4:/u);
  }
});

test('collector recognizes actual fenced blocks, preserves source lines and gathers nested image references', async () => {
  const markdown = [
    '---', 'title: "fixture"', '---', '',
    '````text', '```firefly', 'type: image', 'src: ./not-a-block.png', '```', '````', '',
    '```firefly', 'type: composition', 'layout: image-left', 'media:', '  type: image',
    '  src: ./primary.png', 'content: |', '  Nested ![asset](./nested.png) and ![shared][picture].', '```', '',
    '[picture]: ./shared.png'
  ].join('\n');
  const blocks = await collectFireflyBlocks(markdown, { documentPath: 'posts/fixture.md' });
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].line, 12);
  assert.deepEqual(blocks[0].resources, ['./primary.png', './nested.png', './shared.png']);
});

test('collector ignores code-like text in valid spaced and BOM-prefixed front matter', async () => {
  for (const opening of ['---  ', '\uFEFF---']) {
    const markdown = [
      opening, 'description: |', '  ```firefly', '  type: image',
      '  src: ./metadata-is-not-an-asset.png', '  ```', '---  ', '',
      'Normal article prose.'
    ].join('\n');
    assert.deepEqual(await collectFireflyBlocks(markdown, { documentPath: 'posts/fixture.md' }), []);
  }
});

test('composition remains real Markdown through X Core and Astro heading analysis', async () => {
  const renderer = await processor();
  const source = [
    '```firefly', 'type: composition', 'layout: image-right', 'media:',
    '  type: image', '  src: ./main.png', '  alt: Bookshop', '  caption: Books',
    'content: |', '  ## Shared heading', '', '  First **bold** [link](https://example.test/).', '',
    '  Second paragraph.', '```', '', '## Shared heading', '', 'After the block.'
  ].join('\n');
  const first = await renderer.render(source, { frontmatter: { presentation: 'semantic' } });
  const second = await renderer.render(source, { frontmatter: { presentation: 'semantic' } });
  assert.equal(first.code, second.code, 'internal random markers must not affect generated output');
  assert.match(first.code, /class="firefly-block firefly-block-composition firefly-block-composition--image-right"/u);
  assert.match(first.code, /<figure class="firefly-block-media"><img[^>]*src="\/firefly-media\/test\.png"[^>]*alt="Bookshop"/u);
  assert.match(first.code, /width="640" height="480"/u);
  assert.match(first.code, /<figcaption>Books<\/figcaption>/u);
  assert.match(first.code, /First <strong>bold<\/strong>/u);
  assert.match(first.code, /Second paragraph\./u);
  assert.doesNotMatch(first.code, /firefly-start-|firefly-end-|firefly-block-marker|composition\.layout/u);
  const core = first.metadata.frontmatter.xCore;
  assert.deepEqual(core.outline.map(({ id }) => id), ['shared-heading', 'shared-heading-1']);
  assert.deepEqual(first.metadata.headings.map(({ slug }) => slug), ['shared-heading', 'shared-heading-1']);
  assert.ok(core.references.some(({ target, role }) => target === '/firefly-media/test.png' && role === 'resource'));
  assert.ok(core.references.some(({ target, role }) => target === 'https://example.test/' && role === 'link'));
  assert.notEqual(core.summary, 'type: composition');
});

test('an opening composition uses its prose as the document summary', async () => {
  const renderer = await processor();
  const source = [
    '```firefly', 'type: composition', 'layout: image-left', 'media:',
    '  type: image', '  src: https://example.test/cover.png', '  alt: Photograph of a bookshop',
    'content: |', '  The first paragraph describes our trip.', '```'
  ].join('\n');
  const result = await renderer.render(source, { frontmatter: { presentation: 'semantic' } });
  assert.equal(result.metadata.frontmatter.xCore.summary, 'The first paragraph describes our trip.');
});

test('renders each standalone type with explicit native links and no autoplay', async () => {
  const renderer = await processor();
  const source = [
    '```firefly', 'type: image', 'src: https://example.test/image.gif', 'alt: Animated firefly', '```', '',
    '```firefly', 'type: link', 'url: https://example.test/page', '```', '',
    '```firefly', 'type: video', 'src: https://example.test/clip.mp4', 'caption: Film', '```', '',
    '```firefly', 'type: audio', 'src: https://example.test/sound.mp3', '```'
  ].join('\n');
  const result = await renderer.render(source, { frontmatter: { presentation: 'firefly' } });
  assert.match(result.code, /class="firefly-block firefly-block-image"/u);
  assert.match(result.code, /alt="Animated firefly"/u);
  assert.match(result.code, /class="firefly-block firefly-block-link"[^>]*>\s*<a href="https:\/\/example\.test\/page"/u);
  assert.match(result.code, /<video src="https:\/\/example\.test\/clip\.mp4" controls preload="none"><\/video><a href="https:\/\/example\.test\/clip\.mp4">Open video<\/a>/u);
  assert.match(result.code, /<audio src="https:\/\/example\.test\/sound\.mp3" controls preload="none"><\/audio><a href="https:\/\/example\.test\/sound\.mp3">Open audio<\/a>/u);
  assert.doesNotMatch(result.code, /autoplay|firefly-start-/u);
});

test('keeps authored marker-looking HTML untrusted and sanitizes nested Markdown HTML', async () => {
  const renderer = await processor();
  const source = [
    '<pre><code class="language-firefly-block-marker">firefly-start-forged</code></pre>', '',
    '```firefly', 'type: composition', 'layout: image-left', 'media:',
    '  type: image', '  src: https://example.test/a.png', 'content: |',
    '  Safe <span onclick="alert(1)">word</span>.', '', '  <script>alert(2)</script>', '```'
  ].join('\n');
  const result = await renderer.render(source, { frontmatter: { presentation: 'semantic' } });
  assert.match(result.code, /firefly-start-forged/u);
  assert.match(result.code, /Safe <span>word<\/span>\./u);
  assert.doesNotMatch(result.code, /<script|onclick|alert\(2\)/u);
});

test('nested firefly fences fail with a virtual document and line number', async () => {
  const source = [
    '````firefly', 'type: composition', 'layout: image-top', 'media:',
    '  type: image', '  src: https://example.test/a.png', 'content: |',
    '  ```firefly', '  type: image', '  src: https://example.test/b.png', '  ```', '````'
  ].join('\n');
  await assert.rejects(collectFireflyBlocks(source, { documentPath: 'posts/fixture.md' }), /posts\/fixture\.md:1: nested firefly blocks/u);
});
