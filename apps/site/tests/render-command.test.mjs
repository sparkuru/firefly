import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

const execute = promisify(execFile);

test('renderer entry delegates exact arguments and pinned browser environment through sam', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'firefly-render-command-'));
  try {
    await copyFile(new URL('../../../render.sh', import.meta.url), path.join(root, 'render.sh'));
    await writeFile(path.join(root, 'sam'), '#!/usr/bin/env bash\nprintf "%s\\n" "$SAM_IMAGE" "$SAM_IPC" "$@"\nexit 17\n', { mode: 0o755 });
    await assert.rejects(execute('bash', [path.join(root, 'render.sh'), 'npm', 'argument with spaces', '$(not-a-command)'], {
      env: { ...process.env, SAM_IMAGE: 'node:22-alpine', SAM_IPC: 'private' }
    }), (error) => {
      assert.equal(error.code, 17);
      assert.deepEqual(error.stdout.trimEnd().split('\n'), [
        'mcr.microsoft.com/playwright:v1.62.0-noble', 'host', 'npm',
        'argument with spaces', '$(not-a-command)'
      ]);
      return true;
    });
    const help = await execute('bash', [path.join(root, 'render.sh'), '--help']);
    assert.match(help.stderr, /Usage:/u);
    await assert.rejects(execute('bash', [path.join(root, 'render.sh')]), { code: 2 });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('ordinary sam retains its lightweight default while document entry points use renderer', async () => {
  const source = await readFile(new URL('../../../sam', import.meta.url), 'utf8');
  assert.match(source, /IMAGE="\$\{SAM_IMAGE:-node:22-alpine\}"/u);
  for (const name of ['dev.sh', 'package-runtime.sh']) {
    const script = await readFile(new URL(`../../../${name}`, import.meta.url), 'utf8');
    assert.match(script, /\.\/render\.sh npm run build:m/u);
    assert.doesNotMatch(script, /\.\/sam npm run build:m(?:4|51)\s*$/mu);
  }
});
