import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { createMarkdownProcessor, unified } from '@astrojs/markdown-remark';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { createXCorePlugins, PresentationRegistry } from '@firefly/x-core';
import { terminalPresentation } from '@firefly/presentation-terminal';
import { semanticPresentation } from '@firefly/presentation-semantic';
import { markdownHtmlSchema } from '../src/lib/markdown-html-policy.mjs';
import { renderDiagram, sourcePolicyError, validateSvg, normalizeSvgDimensions } from '../src/build/mermaid-renderer.mjs';
import { rehypeMermaid } from '../src/build/mermaid-markdown.mjs';
import { siteRehypeShiki, siteSyntaxHighlight } from '../src/build/code-highlighting.mjs';
import { publishDiagramAssets } from '../src/build/mermaid-assets.mjs';

const source = 'flowchart TD\naccTitle: Chinese workflow\nA[中文] --> B["First<br/>Second"]';

test('fresh isolated renders and warm cache produce identical safe assets', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-diagrams-'));
  try {
    for (const diagram of [source, 'sequenceDiagram\nAlice->>Bob: Hello']) {
      const first = await renderDiagram(diagram, { cacheDir: path.join(root, 'first') });
      const second = await renderDiagram(diagram, { cacheDir: path.join(root, 'second') });
      assert.ok(first.url, JSON.stringify(first));
      assert.deepEqual(first, second);
      assert.equal(await readFile(path.join(root, 'first', `${first.key}.svg`), 'utf8'), await readFile(path.join(root, 'second', `${second.key}.svg`), 'utf8'));
      assert.deepEqual(await renderDiagram(diagram, { cacheDir: path.join(root, 'first') }), first);
    }
    const invalid = await renderDiagram('flowchart TD\nA[Unclosed', { cacheDir: root });
    assert.ok(invalid.error);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('authored overrides, callbacks, URLs and oversized source are explicit fallbacks', () => {
  for (const input of ['%%{init: {securityLevel: "loose"}}%%\nflowchart TD\nA-->B', '---\nconfig: {}\n---\nflowchart TD', 'flowchart TD\nclick A call()', 'flowchart TD\nA@{ img: "https://example.invalid/a.svg" }', 'x'.repeat(65537)]) assert.ok(sourcePolicyError(input));
});

test('SVG validation rejects executable and escaped CSS resources', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    for (const fragment of ['<script>alert(1)</script>', '<foreignObject/>', '<path onclick="alert(1)"/>', '<use href="https://example.invalid/a.svg#x"/>', '<style>path{fill:u\\72l(https://example.invalid/a)}</style>', '<style>@import "https://example.invalid/a";</style>', '<path style="fill:url(https://example.invalid/a)"/>']) {
      await assert.rejects(page.evaluate(validateSvg, `<svg xmlns="http://www.w3.org/2000/svg">${fragment}</svg>`));
    }
    assert.equal(await page.evaluate(validateSvg, '<svg xmlns="http://www.w3.org/2000/svg"><defs><marker id="arrow"/></defs><path marker-end="url(#arrow)"/></svg>'), true);
  } finally { await browser.close(); }
});

test('shared processor preserves heading identities, source and both adapters', async () => {
  const plugins = createXCorePlugins({ registry: new PresentationRegistry().register(terminalPresentation).register(semanticPresentation), allowAuthoredHtml: true, resolveContext: (file) => ({ documentId: 'pages/diagrams', sourcePath: 'content/pages/diagrams.md', route: '/pages/diagrams/', collection: 'pages', slug: 'diagrams', layout: 'page', presentation: file.data.astro.frontmatter.presentation }) });
  const processor = await createMarkdownProcessor({ syntaxHighlight: false, remarkPlugins: [plugins.remarkPlugin], rehypePlugins: [rehypeRaw, [rehypeSanitize, markdownHtmlSchema], rehypeMermaid, plugins.rehypePlugin], remarkRehype: { allowDangerousHtml: true } });
  const markdown = `## Diagram heading\n\n\`\`\`mermaid\n${source}\n\`\`\`\n\n<script>alert(1)</script>`;
  const results = [];
  for (const presentation of ['firefly', 'semantic']) {
    const result = await processor.render(markdown, { frontmatter: { presentation } });
    assert.match(result.code, /data-diagram="rendered"/u);
    assert.match(result.code, /<details/u);
    assert.match(result.code, /Chinese workflow/u);
    assert.doesNotMatch(result.code, /<script/u);
    results.push(result);
  }
  assert.deepEqual(results[0].metadata.headings, results[1].metadata.headings);
  assert.deepEqual([...results[0].code.matchAll(/data-node-id="([^"]+)"/gu)].map((match) => match[1]), [...results[1].code.matchAll(/data-node-id="([^"]+)"/gu)].map((match) => match[1]));
});

test('publication includes only public HTML references, including inert templates', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-assets-'));
  try {
    const cache = path.join(root, 'cache');
    const output = path.join(root, 'output');
    await mkdir(cache); await mkdir(output);
    const used = 'a'.repeat(64); const privateKey = 'b'.repeat(64);
    await writeFile(path.join(cache, `${used}.svg`), '<svg/>');
    await writeFile(path.join(cache, `${privateKey}.svg`), 'PRIVATE');
    await writeFile(path.join(output, 'index.html'), `<template><img src="/diagrams/${used}.svg"></template>`);
    await publishDiagramAssets(output, cache);
    assert.deepEqual(await readdir(path.join(output, 'diagrams')), [`${used}.svg`]);
    await rm(path.join(cache, `${used}.svg`));
    await assert.rejects(publishDiagramAssets(output, cache), /Missing generated diagram/u);
  } finally { await rm(root, { recursive: true, force: true }); }
});


test('missing browser is an actionable infrastructure error, not a diagram fallback', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-missing-browser-'));
  try {
    const moduleUrl = new URL('../src/build/mermaid-renderer.mjs', import.meta.url).href;
    const script = `import { renderDiagram } from ${JSON.stringify(moduleUrl)}; await renderDiagram('flowchart TD\\nA-->B', { cacheDir: ${JSON.stringify(root)} });`;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      encoding: 'utf8', env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: path.join(root, 'missing-browser') }
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Mermaid renderer unavailable/u);
    assert.match(result.stderr, /render\.sh/u);
  } finally { await rm(root, { recursive: true, force: true }); }
});


test('post-sanitization Shiki preserves Mermaid source and original headings', async () => {
  let retainedSource;
  function inspectSource() {
    return (tree) => {
      function visit(node) {
        if (node.tagName === 'code' && node.properties?.className?.includes('language-mermaid')) {
          retainedSource = node.children.map((child) => child.value).join('');
        }
        for (const child of node.children ?? []) visit(child);
      }
      visit(tree);
    };
  }
  const options = {
    syntaxHighlight: siteSyntaxHighlight,
    rehypePlugins: [rehypeRaw, [rehypeSanitize, markdownHtmlSchema], siteRehypeShiki],
    remarkRehype: { allowDangerousHtml: true }
  };
  const configuredProcessor = unified({
    rehypePlugins: [...options.rehypePlugins, rehypeMermaid, inspectSource],
    remarkRehype: options.remarkRehype
  });
  const processor = await configuredProcessor.createRenderer({ syntaxHighlight: siteSyntaxHighlight });
  const originalProcessor = await createMarkdownProcessor(options);
  const markdown = `## Stable heading\n\n\`\`\`mermaid\n${source}\n\`\`\`\n\n### Next heading\n\n\`\`\`js\nconst value = 1;\n\`\`\``;
  const rendered = await processor.render(markdown);
  const original = await originalProcessor.render(markdown);
  assert.match(rendered.code, /data-diagram="rendered"/u);
  assert.match(rendered.code, /data-language="js"/u);
  assert.match(rendered.code, /--shiki-dark:/u);
  assert.match(rendered.code, /class="line"/u);
  assert.equal(retainedSource, `${source}\n`);
  assert.deepEqual(rendered.metadata.headings, original.metadata.headings);
});

test('post-sanitization highlighting preserves code text and rejects authored styles', async () => {
  const processor = await createMarkdownProcessor({
    syntaxHighlight: siteSyntaxHighlight,
    rehypePlugins: [
      rehypeRaw,
      [rehypeSanitize, markdownHtmlSchema],
      siteRehypeShiki
    ],
    remarkRehype: { allowDangerousHtml: true }
  });
  const markdown = [
    '```js',
    'const value = 1;',
    '  console.log(value);',
    '```',
    '',
    '```text',
    '  exact  spacing',
    '```',
    '',
    '```not-a-language',
    '  unknown stays readable',
    '```',
    '',
    '```',
    '  unlabelled stays readable',
    '```',
    '',
    '<span style="color:red" onclick="alert(1)">safe</span><script>alert(2)</script>'
  ].join('\n');
  const { code } = await processor.render(markdown);
  assert.match(code, /data-language="js"/u);
  assert.match(code, /--shiki-dark:/u);
  assert.match(code, /  exact  spacing/u);
  assert.match(code, /  unknown stays readable/u);
  assert.match(code, /  unlabelled stays readable/u);
  assert.doesNotMatch(code, /color:red|onclick|<script|alert\(2\)/u);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(`<div class="terminal-root" data-terminal-theme="firefly"><div class="terminal-stream-prose"><div class="terminal-code-body">${code}</div></div></div><div class="canonical">${code}</div>`);
    await page.addStyleTag({ content: await readFile(new URL('../src/styles/terminal.css', import.meta.url), 'utf8') });
    const tokenColors = await page.locator('.terminal-stream-prose pre[data-language="js"] code .line span[style*="--shiki-dark"]').evaluateAll((tokens) =>
      tokens.map((token) => getComputedStyle(token).color));
    assert.ok(new Set(tokenColors).size >= 2, `Expected at least two terminal token colors, got ${tokenColors}`);
    const canonicalColors = await page.locator('.canonical pre[data-language="js"] code .line span[style*="--shiki-dark"]').evaluateAll((tokens) =>
      tokens.map((token) => getComputedStyle(token).color));
    assert.equal(new Set(canonicalColors).size, 1);
  } finally { await browser.close(); }
});


test('standalone SVG retains readable intrinsic dimensions and inline previews stay bounded', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-intrinsic-'));
  const browser = await chromium.launch();
  try {
    const diagram = `flowchart TD\n${Array.from({ length: 35 }, (_, index) => `N${index}[Step ${index}] --> N${index + 1}`).join('\n')}`;
    const result = await renderDiagram(diagram, { cacheDir: root });
    assert.ok(result.url, JSON.stringify(result));
    const svg = await readFile(path.join(root, `${result.key}.svg`), 'utf8');
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.route('http://diagram.test/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: svg }));
    await page.goto('http://diagram.test/figure.svg');
    const dimensions = await page.locator('svg').evaluate((element) => {
      const svg = element;
      const viewBox = svg.viewBox.baseVal;
      const rect = svg.getBoundingClientRect();
      return { width: rect.width, height: rect.height, expectedWidth: viewBox.width, expectedHeight: viewBox.height };
    });
    assert.ok(dimensions.height > 812);
    assert.ok(Math.abs(dimensions.width - dimensions.expectedWidth) < 1);
    assert.ok(Math.abs(dimensions.height - dimensions.expectedHeight) < 1);
    await page.goto('about:blank');
    await page.setContent('<img src="http://diagram.test/figure.svg" style="width:100%;max-width:100%;height:auto;max-height:576px;object-fit:contain">');
    const image = page.locator('img');
    await image.evaluate((image) => image.decode());
    const preview = await image.boundingBox();
    assert.ok(preview.width <= 375 && preview.height <= 576);
    for (const viewBox of ['0 0 0 50', '0 0 NaN 50', '0 0 40 Infinity', '0 0 1000001 20', '0 0 20']) {
      await assert.rejects(page.evaluate(normalizeSvgDimensions, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"/>`));
    }
  } finally { await browser.close(); await rm(root, { recursive: true, force: true }); }
});


test('native full-size anchor reveals the first node on a narrow no-JS viewport', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-diagram-anchor-'));
  const browser = await chromium.launch();
  try {
    const branches = Array.from({ length: 9 }, (_, index) => `Start --> B${index}[Branch ${index}]`).join('\n');
    const tail = Array.from({ length: 20 }, (_, index) => `T${index} --> T${index + 1}`).join('\n');
    const diagram = `flowchart TD\nStart[Begin reading]\n${branches}\nB4 --> T0\n${tail}`;
    const result = await renderDiagram(diagram, { cacheDir: root });
    assert.ok(result.fullSizeUrl?.includes('#'), JSON.stringify(result));
    assert.deepEqual(await renderDiagram(diagram, { cacheDir: root }), result);
    const svg = await readFile(path.join(root, `${result.key}.svg`), 'utf8');
    const page = await browser.newPage({ viewport: { width: 375, height: 812 }, javaScriptEnabled: false });
    await page.route('http://diagram.test/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: svg }));
    await page.goto(`http://diagram.test${result.fullSizeUrl}`);
    const bounds = await page.locator('g.node[id]').first().boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 376, JSON.stringify(bounds));
    assert.ok(bounds.y >= -1 && bounds.y + bounds.height <= 813, JSON.stringify(bounds));
    assert.ok(await page.evaluate(() => scrollX) > 0);
    const sequence = await renderDiagram('sequenceDiagram\nAlice->>Bob: data-diagram-start="fake"', { cacheDir: root });
    assert.equal(sequence.fullSizeUrl, sequence.url);
  } finally { await browser.close(); await rm(root, { recursive: true, force: true }); }
});
