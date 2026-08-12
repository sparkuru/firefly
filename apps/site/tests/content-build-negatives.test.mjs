import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { access, mkdir, mkdtemp, rm, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const siteRoot = path.resolve(import.meta.dirname, '..');
const contentRoot = path.resolve(siteRoot, '../../content');
const negativeOutputRoot = path.join(siteRoot, 'test-results');
const prerenderRoot = path.join(siteRoot, '.astro', '.prerender');

async function expectNegativeBuild({ collection, filename, source, patterns }) {
  const fixturePath = path.join(contentRoot, collection, filename);
  await mkdir(negativeOutputRoot, { recursive: true });
  const outputRoot = await mkdtemp(
    path.join(negativeOutputRoot, 'negative-build-')
  );

  await assert.rejects(access(fixturePath));
  await writeFile(fixturePath, source, { encoding: 'utf8', flag: 'wx' });

  try {
    const result = spawnSync(
      'npm',
      ['run', 'astro', '--', 'build', '--force', '--outDir', outputRoot],
      {
        cwd: siteRoot,
        encoding: 'utf8',
        env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
        maxBuffer: 4 * 1024 * 1024
      }
    );
    const output = `${result.stdout}\n${result.stderr}`;

    assert.notEqual(result.status, 0, output);
    for (const pattern of patterns) {
      assert.match(output, pattern);
    }
  } finally {
    await unlink(fixturePath);
    await rm(outputRoot, { recursive: true, force: true });
    await rm(prerenderRoot, { recursive: true, force: true });
  }
}

test('negative builds preserve public invariants and X Core diagnostics', async (context) => {
  await context.test('duplicate public slugs name both owners', async () => {
    await expectNegativeBuild({
      collection: 'pages',
      filename: 'x-core-negative-duplicate.md',
      source: `---
title: Duplicate fixture
slug: hello-static-foundation
date: 2026-08-12
description: Must fail the global public slug invariant.
draft: false
layout: page
presentation: semantic
---

## Duplicate fixture

This content must never be published.
`,
      patterns: [
        /Duplicate public slug "hello-static-foundation"/u,
        /posts\/hello-static-foundation/u,
        /pages\/hello-static-foundation/u
      ]
    });
  });

  await context.test('unsupported public layouts fail before route emission', async () => {
    await expectNegativeBuild({
      collection: 'pages',
      filename: 'x-core-negative-layout.md',
      source: `---
title: Unsupported layout fixture
slug: x-core-negative-layout
date: 2026-08-12
description: Must fail the M2 semantic context boundary.
draft: false
layout: timeline
presentation: semantic
---

## Unsupported layout fixture

This content must never be published.
`,
      patterns: [
        /XCORE_UNSUPPORTED_CONTEXT/u,
        /pages\/x-core-negative-layout/u,
        /\/pages\/x-core-negative-layout\//u
      ]
    });
  });

  await context.test('unregistered presentations reach the registry diagnostic', async () => {
    await expectNegativeBuild({
      collection: 'posts',
      filename: 'x-core-negative-presentation.md',
      source: `---
title: Unregistered presentation fixture
slug: x-core-negative-presentation
date: 2026-08-12
description: Must fail registry selection.
draft: false
layout: post
presentation: unregistered
---

## Unregistered presentation fixture

This content must never be published.
`,
      patterns: [
        /XCORE_UNKNOWN_PRESENTATION/u,
        /posts\/x-core-negative-presentation/u,
        /\/posts\/x-core-negative-presentation\//u
      ]
    });
  });

  await context.test('raw authored HTML fails with source context', async () => {
    await expectNegativeBuild({
      collection: 'posts',
      filename: 'x-core-negative-raw-html.md',
      source: `---
title: Raw HTML fixture
slug: x-core-negative-raw-html
date: 2026-08-12
description: Must fail the authored HTML boundary.
draft: false
layout: post
presentation: semantic
---

<div>This content must never be published.</div>
`,
      patterns: [
        /XCORE_RAW_HTML/u,
        /posts\/x-core-negative-raw-html/u,
        /content\/posts\/x-core-negative-raw-html\.md/u
      ]
    });
  });
});
