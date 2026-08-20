import { strict as assert } from 'node:assert';
import { execFile } from 'node:child_process';
import { chmod, mkdtemp, readFile, rm } from 'node:fs/promises';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { SQLiteCommentRepository } from '../src/index.js';

const execFileAsync = promisify(execFile);

test('runtime and staging contracts keep private state outside the publication image', async () => {
  const dockerfile = await readFile(new URL('../../Dockerfile', import.meta.url), 'utf8');
  const readme = await readFile(new URL('../../README.md', import.meta.url), 'utf8');
  const staging = await readFile(new URL('../../staging.env.example', import.meta.url), 'utf8');
  assert.match(dockerfile, /USER node/u);
  assert.match(dockerfile, /VOLUME \["\/var\/lib\/firefly-comments"\]/u);
  assert.match(readme, /FIREFLY_COMMENTS_EXPORT/u);
  assert.match(readme, /--read-only/u);
  assert.match(readme, /encrypted/u);
  assert.doesNotMatch(staging, /-----BEGIN|sk-[A-Za-z0-9]|prod(?:uction)?/iu);
});

test('offline backup and restore refuse overwrite and verify SQLite integrity', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'firefly-comments-ops-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const source = join(directory, 'source.sqlite');
  const backup = join(directory, 'backups', 'snapshot.sqlite');
  const restored = join(directory, 'restored.sqlite');
  const repository = new SQLiteCommentRepository(source);
  repository.close();
  const backupScript = new URL('../../scripts/backup.mjs', import.meta.url);
  const restoreScript = new URL('../../scripts/restore.mjs', import.meta.url);
  await execFileAsync(process.execPath, [backupScript.pathname, source, backup]);
  await execFileAsync(process.execPath, [restoreScript.pathname, backup, restored]);
  await assert.rejects(execFileAsync(process.execPath, [restoreScript.pathname, backup, restored]), /already exists/u);
  const restoredRepository = new SQLiteCommentRepository(restored);
  restoredRepository.close();
  await chmod(backup, 0o600);
});
