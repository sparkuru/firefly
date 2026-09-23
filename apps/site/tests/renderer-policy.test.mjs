import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { renderDiagram, sourcePolicyError } from '../src/build/mermaid-renderer.mjs';

test('ordinary URL and click instruction labels render as inert SVG text', async () => {
  const cacheDir = await mkdtemp(path.join(tmpdir(), 'firefly-diagram-labels-'));
  const source = 'flowchart TD\nA["https://example.com"] --> B["click here; click elsewhere"]\nB --> C[click here]';
  try {
    assert.equal(sourcePolicyError(source), undefined);
    const result = await renderDiagram(source, { cacheDir });
    assert.ok(result.url, JSON.stringify(result));
    const svg = await readFile(path.join(cacheDir, `${result.key}.svg`), 'utf8');
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      const labels = await page.evaluate((source) => {
        const document = new DOMParser().parseFromString(source, 'image/svg+xml');
        return [...document.querySelectorAll('.node text')].map((node) => node.textContent);
      }, svg);
      assert.ok(labels.some((label) => label.replace(/\s/gu, '').includes('https://example.com')), JSON.stringify(labels));
      assert.ok(labels.some((label) => label.includes('click')), JSON.stringify(labels));
    } finally { await browser.close(); }
    assert.doesNotMatch(svg, /(?:href|src)="https:/u);
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test('callback statements and image/icon declarations still fail before rendering', () => {
  for (const source of [
    'flowchart TD\nA --> B\nclick A callback',
    'flowchart TD; A-->B; click A "https://example.com"',
    'flowchart TD\nA@{ img: "https://example.com/image.svg" }',
    'flowchart TD\nA@{ icon: "fa:house" }',
    '%%{init: {securityLevel: "loose"}}%%\nflowchart TD\nA-->B',
    '---\nconfig: {}\n---\nflowchart TD\nA-->B'
  ]) assert.ok(sourcePolicyError(source), source);
});
