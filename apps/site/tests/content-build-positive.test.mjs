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
const paperSelector = /\[data-article-content\]\[data-article-theme=(?:['"]?paper['"]?)\]/u;

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
  assert.match(roots[0], /\bdata-article-theme="paper"/u, route);
  assert.equal(
    (rootMarkup.match(/\bdata-article-theme\s*=/gu) ?? []).length,
    1,
    `${route}: expected one article theme attribute`
  );
}

function documentHeadingId(html) {
  return /<h2\b[^>]*\bid="([^"]+)"[^>]*>Shared paper heading<\/h2>/u.exec(html)?.[1] ?? null;
}

test('paper front matter builds to semantic and Terminal routes with shared content', async () => {
  await mkdir(testResultsRoot, { recursive: true });
  const runRoot = await mkdtemp(path.join(testResultsRoot, 'paper-build-'));
  const contentRoot = path.join(runRoot, 'content');
  const outputRoot = path.join(runRoot, 'output');
  const body = `
## Shared paper heading

The same Markdown body reaches both presentations with a [safe link](https://example.test/paper).

<div class="firefly-content-callout" data-article-theme="future" style="color: red">A paper callout.</div>

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
articleTheme: paper
---
${body}`;
  const terminalSource = `---
title: Paper Terminal fixture
slug: paper-terminal
date: 2026-08-12
description: A Terminal paper fixture.
draft: false
layout: page
articleTheme: paper
---
${body}`;

  await mkdir(path.join(contentRoot, 'posts'), { recursive: true });
  await mkdir(path.join(contentRoot, 'pages'), { recursive: true });
  await writeFile(path.join(contentRoot, 'posts/paper-semantic.md'), semanticSource);
  await writeFile(path.join(contentRoot, 'pages/paper-terminal.md'), terminalSource);

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
          FIREFLY_CONTENT_ROOT: contentRoot
        },
        maxBuffer: 8 * 1024 * 1024
      }
    );
    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;

    assert.equal(result.error, undefined, output);
    assert.equal(result.status, 0, output);

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
    assert.match(semanticHeadingId, /^posts-paper-semantic-md-h2-1$/u);
    assert.match(terminalHeadingId, /^pages-paper-terminal-md-h2-1$/u);
    assert.equal(
      (semanticRoute.match(/articleTheme/gu) ?? []).length,
      0,
      'site metadata must not be serialized into semantic output'
    );
    assert.equal(
      (terminalRoute.match(/articleTheme/gu) ?? []).length,
      0,
      'site metadata must not be serialized into Terminal output'
    );

    const semanticStylesheet = /<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+\.css)"/u.exec(semanticRoute)?.[1];
    assert.ok(semanticStylesheet, 'semantic route should link its compiled stylesheet');
    const stylesheetPath = path.join(outputRoot, semanticStylesheet.replace(/^\/+/, ''));
    const stylesheetFiles = await listFiles(outputRoot);
    assert.ok(stylesheetFiles.includes(semanticStylesheet.replace(/^\/+/, '')));
    assert.match(await readFile(stylesheetPath, 'utf8'), paperSelector);
    assert.match(terminalRoute, paperSelector);
  } finally {
    await rm(runRoot, { recursive: true, force: true });
    await rm(generatedContentRoot, { recursive: true, force: true });
    await rm(prerenderRoot, { recursive: true, force: true });
  }
});
