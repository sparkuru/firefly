import { strict as assert } from 'node:assert';
import { execFile } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
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
  assert.match(dockerfile, /COPY plugins\/comments\/config\.mjs/u);
  assert.match(readme, /FIREFLY_COMMENTS_EXPORT/u);
  assert.match(readme, /-f services\/comments\/Dockerfile \./u);
  assert.match(readme, /config\/site\.toml/u);
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

test('storage backup sets include independent plugin databases, checksums, and private outbox artifacts', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'firefly-comments-data-'));
  const backupRoot = join(root, 'backup-set');
  const restoreRoot = join(root, 'restored-data');
  context.after(() => rm(root, { recursive: true, force: true }));
  const corePath = join(root, 'core.db');
  const core = new SQLiteCommentRepository(corePath, { dataRoot: root });
  core.registerPluginStorage({ pluginId: 'search', dialect: 'sqlite', relativePath: 'data.db', schemaVersion: 1, lifecycleState: 'active' });
  core.close();
  await mkdir(join(root, 'plugins', 'search'), { recursive: true, mode: 0o700 });
  const plugin = new SQLiteCommentRepository(join(root, 'plugins', 'search', 'data.db'), { dataRoot: root });
  plugin.close();
  await writeFile(join(root, 'notifications.jsonl'), '{"kind":"verification"}\n', { mode: 0o600 });
  await writeFile(join(root, 'notifications.jsonl.state.json'), '{}\n', { mode: 0o600 });

  const backupScript = new URL('../../scripts/backup.mjs', import.meta.url);
  const restoreScript = new URL('../../scripts/restore.mjs', import.meta.url);
  await execFileAsync(process.execPath, [backupScript.pathname, root, backupRoot]);
  const manifest = JSON.parse(await readFile(join(backupRoot, 'manifest.json'), 'utf8')) as {
    databases: Array<{ kind: string }>;
    artifacts: Array<{ kind: string }>;
    retention: { mode: string };
  };
  assert.equal(manifest.databases.length, 2);
  assert.deepEqual(manifest.artifacts.map((artifact) => artifact.kind), ['outbox', 'outbox-state']);
  assert.equal(manifest.retention.mode, 'operator-managed');
  await execFileAsync(process.execPath, [restoreScript.pathname, backupRoot, restoreRoot]);
  const restoredCore = new SQLiteCommentRepository(join(restoreRoot, 'core.db'));
  assert.equal(restoredCore.listPluginStorage()[0]?.pluginId, 'search');
  restoredCore.close();
  const restoredPlugin = new SQLiteCommentRepository(join(restoreRoot, 'plugins', 'search', 'data.db'));
  restoredPlugin.close();
});

test('storage backup rejects plugin database paths that escape through a symlinked directory', async (context) => {
  const workspace = await mkdtemp(join(tmpdir(), 'firefly-comments-data-'));
  const dataRoot = join(workspace, 'data');
  const outsideRoot = join(workspace, 'outside');
  const backupRoot = join(workspace, 'backup-set');
  context.after(() => rm(workspace, { recursive: true, force: true }));
  await mkdir(dataRoot, { mode: 0o700 });
  await mkdir(outsideRoot, { mode: 0o700 });
  const core = new SQLiteCommentRepository(join(dataRoot, 'core.db'), { dataRoot });
  core.registerPluginStorage({ pluginId: 'search', dialect: 'sqlite', relativePath: 'data.db', schemaVersion: 1, lifecycleState: 'active' });
  core.close();
  const plugin = new SQLiteCommentRepository(join(outsideRoot, 'data.db'));
  plugin.close();
  await mkdir(join(dataRoot, 'plugins'), { mode: 0o700 });
  await symlink(outsideRoot, join(dataRoot, 'plugins', 'search'), 'dir');

  const backupScript = new URL('../../scripts/backup.mjs', import.meta.url);
  await assert.rejects(
    execFileAsync(process.execPath, [backupScript.pathname, dataRoot, backupRoot]),
    /private data root/u
  );
});
