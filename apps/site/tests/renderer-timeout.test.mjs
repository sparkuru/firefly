import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { renderDiagram } from '../src/build/mermaid-renderer.mjs';

test('render deadline produces no partial asset and releases the queue for subsequent diagrams', { timeout: 60000 }, async () => {
  const cacheDir = await mkdtemp(path.join(tmpdir(), 'firefly-diagram-timeout-'));
  const source = 'flowchart TD\nA[Deadline recovery] --> B[Rendered]';
  try {
    const timedOut = await renderDiagram(source, { cacheDir, timeoutMs: 1 });
    assert.match(timedOut.error, /could not be rendered safely/u);
    assert.deepEqual(await readdir(cacheDir), []);
    const recovered = await renderDiagram(source, { cacheDir });
    assert.ok(recovered.url, JSON.stringify(recovered));
    assert.deepEqual(await readdir(cacheDir), [`${recovered.key}.svg`]);
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});
