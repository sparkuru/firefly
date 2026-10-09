import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile
} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const siteRoot = path.resolve(import.meta.dirname, '..');
const testResultsRoot = path.join(siteRoot, 'test-results');
const generatedContentRoot = path.join(siteRoot, '.generated-content');
const prerenderRoot = path.join(siteRoot, '.astro', '.prerender');
const paperSelector = /\[data-article-content\]\[data-content-theme=(?:['"]?paper['"]?)\]/u;

async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relative = path.posix.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(absolute, relative)));
    } else {
      files.push(relative);
    }
  }

  return files.sort();
}

function assertPaperRoot(html, route) {
  const roots = [...html.matchAll(/<div\b[^>]*\bdata-article-content(?:\s|>)[^>]*>/gu)]
    .map(([openingTag]) => openingTag);
  const rootMarkup = roots.join('\n');

  assert.equal(roots.length, 1, `${route}: expected one article-content root`);
  assert.match(roots[0], /\bdata-content-theme="paper"/u, route);
  assert.equal(
    (rootMarkup.match(/\bdata-content-theme\s*=/gu) ?? []).length,
    1,
    `${route}: expected one content theme attribute`
  );
}

function documentHeadingId(html) {
  return /<h2\b[^>]*\bid="([^"]+)"[^>]*>Shared paper heading<\/h2>/u.exec(html)?.[1] ?? null;
}

test('paper routes and nested native directories build with shared content and empty friends', async () => {
  await mkdir(testResultsRoot, { recursive: true });
  const runRoot = await mkdtemp(path.join(testResultsRoot, 'paper-build-'));
  const contentRoot = path.join(runRoot, 'content');
  const outputRoot = path.join(runRoot, 'output');
  const body = `
## Shared paper heading

The same Markdown body reaches both presentations with a [safe link](https://example.test/paper).

中文 😀 proves the footer counts UTF-8 bytes rather than characters.

<div class="firefly-content-callout" data-content-theme="future" style="color: red">A paper callout.</div>

<script>alert('unsafe')</script>

> Warm paper reading should remain comfortable.

| Name | Value |
| --- | --- |
| theme | paper |

\`\`\`text
paper content with a deliberately long line for local scrolling
\`\`\`
`;
  const semanticSource = `---
title: Paper semantic fixture
slug: paper-semantic
date: 2026-08-12
description: A semantic paper fixture.
draft: false
layout: post
presentation: semantic
contentTheme: paper
license: CC-BY-SA-4.0
canonical: https://example.test/shared/paper/
---
${body}`;
  const terminalSource = `---
title: Paper Terminal fixture
slug: paper-terminal
date: 2026-08-12
description: A Terminal paper fixture.
draft: false
layout: page
contentTheme: paper
---
${body}`;

  await mkdir(path.join(contentRoot, 'posts'), { recursive: true });
  await mkdir(path.join(contentRoot, 'pages'), { recursive: true });
  await writeFile(path.join(contentRoot, 'posts/physical-source.md'), semanticSource);
  await writeFile(path.join(contentRoot, 'pages/physical-terminal.md'), terminalSource);
  await mkdir(path.join(contentRoot, 'posts/category/deeper'), { recursive: true });
  const terminalPostSource = semanticSource.replaceAll('paper-semantic', 'child').replace('presentation: semantic', 'presentation: firefly');
  await writeFile(path.join(contentRoot, 'posts/category/child.md'), terminalPostSource);
  await writeFile(path.join(contentRoot, 'posts/category/deeper/leaf.md'), semanticSource.replaceAll('paper-semantic', 'leaf'));
  const configPath = path.join(runRoot, 'site.toml');
  const siteConfig = await readFile(path.resolve(siteRoot, '../../config/site.toml.example'), 'utf8');
  await writeFile(configPath, siteConfig.replace(/\[\[terminal\.friends\]\][\s\S]*?(?=\n\[(?!\[terminal\.friends\])|$)/gu, '') + '\n[documentNavigation.firefly]\nnavigator = "none"\n');
  const terminalLayout = await readFile(path.join(siteRoot, 'src/layouts/TerminalLayout.astro'), 'utf8');
  const appearanceScript = /<script is:inline>([\s\S]*?)<\/script>/u.exec(terminalLayout)?.[1].trim();
  assert.ok(appearanceScript, 'the established appearance helper must be present');

  try {
    const result = spawnSync(
      'npm',
      ['run', 'astro', '--', 'build', '--force', '--outDir', outputRoot],
      {
        cwd: siteRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          ASTRO_TELEMETRY_DISABLED: '1',
          FIREFLY_CONTENT_ROOT: contentRoot,
          FIREFLY_SITE_CONFIG_PATH: path.relative(path.resolve(siteRoot, '../..'), configPath)
        },
        maxBuffer: 8 * 1024 * 1024
      }
    );
    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;

    assert.equal(result.error, undefined, output);
    assert.equal(result.status, 0, output);

    const home = await readFile(path.join(outputRoot, 'index.html'), 'utf8');
    assert.match(home, /data-home-root-navigation/u);
    assert.match(home, /data-home-friends[\s\S]*?No friend links\./u);
    assert.doesNotMatch(home, /data-terminal-friend-name=/u);
    assert.match(home, /data-terminal-entry-href="\/posts\/paper-semantic\/"/u);
    assert.match(home, /data-terminal-entry-href="\/posts\/category\/deeper\/leaf\/"/u);
    const postTemplate = /<template\b[^>]*data-terminal-template-path="posts\/physical-source\.md"[^>]*>([\s\S]*?)<\/template>/u.exec(home)?.[1] ?? '';
    assert.match(postTemplate, new RegExp(`data-terminal-source-bytes="${Buffer.byteLength(semanticSource)}"`, 'u'));
    assert.match(postTemplate, /~\/blog\/posts\/physical-source\.md/u);
    assert.match(postTemplate, /href="\/posts\/paper-semantic\/"[^>]*data-terminal-open/u);
    assert.match(postTemplate, /data-terminal-license="CC-BY-SA-4\.0"/u);
    assert.match(postTemplate, /data-terminal-share-url="https:\/\/example\.test\/shared\/paper\/"/u);
    const pageTemplate = /<template\b[^>]*data-terminal-template-path="pages\/physical-terminal\.md"[^>]*>([\s\S]*?)<\/template>/u.exec(home)?.[1] ?? '';
    assert.match(pageTemplate, new RegExp(`data-terminal-source-bytes="${Buffer.byteLength(terminalSource)}"`, 'u'));
    assert.match(pageTemplate, /~\/blog\/pages\/physical-terminal\.md/u);
    assert.doesNotMatch(pageTemplate, /data-terminal-license/u);
    assert.match(pageTemplate, /data-terminal-share-url="\/pages\/paper-terminal\/"/u);
    assert.doesNotMatch(home, /\.source-provenance\.json/u);

    for (const [directory, hrefs, parent] of [
      ['posts', ['/posts/category/', '/posts/paper-semantic/'], '/'],
      ['posts/category', ['/posts/category/deeper/', '/posts/category/child/'], '/posts/'],
      ['posts/category/deeper', ['/posts/category/deeper/leaf/'], '/posts/category/']
    ]) {
      const html = await readFile(path.join(outputRoot, directory, 'index.html'), 'utf8');
      const listing = /<ul class="terminal-directory-list">([\s\S]*?)<\/ul>/u.exec(html)?.[1] ?? '';
      assert.deepEqual([...listing.matchAll(/<a href="([^"]+)"/gu)].map((match) => match[1]), hrefs);
      const snapshot = new RegExp(`<template\\b[^>]*data-home-browse-href="/${directory}/"[^>]*>([\\s\\S]*?)<\\/template>`, 'u').exec(home)?.[1] ?? '';
      assert.deepEqual([...snapshot.matchAll(/<a href="([^"]+)"/gu)].map((match) => match[1]), hrefs);
      assert.doesNotMatch(snapshot, /data-terminal-entry|data-terminal-template|data-terminal-friend|<script\b/iu);
      assert.match(html, new RegExp(`<a href="${parent}">\\.\\.<\\/a>`, 'u'));
      assert.match(html, /<a href="\/">~\/blog<\/a>/u);
      const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/giu)];
      assert.equal(scripts.length, 1, 'native directories only include the established appearance helper');
      assert.equal(scripts[0][1].trim(), '', 'the appearance helper is inline, without module or external attributes');
      assert.equal(scripts[0][2].trim(), appearanceScript);
      const head = /<head\b[^>]*>([\s\S]*?)<\/head>/iu.exec(html)?.[1];
      const main = /<main\b[^>]*>([\s\S]*?)<\/main>/iu.exec(html)?.[1];
      assert.ok(head?.includes(scripts[0][0]), 'the appearance helper stays in the document head');
      assert.ok(main, 'native directory content must be present');
      assert.doesNotMatch(main, /<script\b/iu);
      assert.doesNotMatch(listing, /<script\b/iu);
    }

    const semanticRoute = await readFile(
      path.join(outputRoot, 'posts/paper-semantic/index.html'),
      'utf8'
    );
    const terminalRoute = await readFile(
      path.join(outputRoot, 'pages/paper-terminal/index.html'),
      'utf8'
    );
    assertPaperRoot(semanticRoute, 'semantic paper route');
    assertPaperRoot(terminalRoute, 'Terminal paper route');
    assert.match(semanticRoute, /class="semantic-document"/u);
    assert.match(terminalRoute, /class="terminal-document"/u);
    const licensedTerminal = await readFile(path.join(outputRoot, 'posts/category/child/index.html'), 'utf8');
    const metadata = /<p\b[^>]*data-document-file-metadata[^>]*>([\s\S]*?)<\/p>/u.exec(licensedTerminal)?.[1] ?? '';
    assert.match(metadata, new RegExp(`2026-08-12[\\s\\S]*?data-terminal-source-bytes="${Buffer.byteLength(terminalPostSource)}"[\\s\\S]*?data-terminal-license="CC-BY-SA-4.0"[\\s\\S]*?data-document-share`, 'u'));
    assert.match(metadata, /CC BY-SA 4\.0/u);
    assert.match(metadata, /data-document-share-url="https:\/\/example\.test\/shared\/paper\/"/u);
    assert.match(licensedTerminal, /<link rel="canonical" href="https:\/\/example\.test\/shared\/paper\/"/u);
    assert.match(licensedTerminal, /data-document-share-group/u);
    assert.doesNotMatch(licensedTerminal, /data-document-navigator|DocumentNavigationStatus/u);
    assert.match(licensedTerminal, /data-document-sharing/u);
    assert.match(licensedTerminal, /<script type="module" src="\/_astro\/TerminalDocument\.astro_astro_type_script_index_0_lang\.[A-Za-z0-9_-]+\.js"><\/script>/u);
    assert.doesNotMatch(semanticRoute, /data-terminal-theme="paper"/u);
    assert.match(terminalRoute, /data-terminal-theme="firefly"/u);
    assert.doesNotMatch(semanticRoute, /<script>alert\('unsafe'\)<\/script>/u);
    assert.doesNotMatch(terminalRoute, /<script>alert\('unsafe'\)<\/script>/u);
    assert.match(semanticRoute, /<div class="firefly-content-callout">A paper callout\.<\/div>/u);
    assert.match(terminalRoute, /<div class="firefly-content-callout">A paper callout\.<\/div>/u);
    const semanticHeadingId = documentHeadingId(semanticRoute);
    const terminalHeadingId = documentHeadingId(terminalRoute);
    assert.ok(semanticHeadingId);
    assert.ok(terminalHeadingId);
    assert.notEqual(semanticHeadingId, terminalHeadingId);
    assert.match(semanticHeadingId, /^posts-physical-source-md-h2-1$/u);
    assert.match(terminalHeadingId, /^pages-physical-terminal-md-h2-1$/u);
    assert.equal(
      (semanticRoute.match(/contentTheme/gu) ?? []).length,
      0,
      'site metadata must not be serialized into semantic output'
    );
    assert.equal(
      (terminalRoute.match(/contentTheme/gu) ?? []).length,
      0,
      'site metadata must not be serialized into Terminal output'
    );

    const semanticStylesheet = /<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+\.css)"/u.exec(semanticRoute)?.[1];
    assert.ok(semanticStylesheet, 'semantic route should link its compiled stylesheet');
    const stylesheetPath = path.join(outputRoot, semanticStylesheet.replace(/^\/+/, ''));
    const stylesheetFiles = await listFiles(outputRoot);
    assert.equal(stylesheetFiles.some(file => file.includes('source-provenance')), false);
    assert.ok(stylesheetFiles.includes(semanticStylesheet.replace(/^\/+/, '')));
    assert.match(await readFile(stylesheetPath, 'utf8'), paperSelector);
    assert.match(terminalRoute, paperSelector);
  } finally {
    await rm(runRoot, { recursive: true, force: true });
    await rm(generatedContentRoot, { recursive: true, force: true });
    await rm(prerenderRoot, { recursive: true, force: true });
  }
});
