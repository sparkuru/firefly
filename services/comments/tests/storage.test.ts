import { strict as assert } from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  CORE_DATABASE_FILENAME,
  DEFAULT_COMMENTS_DATA_ROOT,
  SQLiteCommentRepository,
  UnsupportedDatabaseDialectError,
  assertSupportedRuntimeDialect,
  loadSqliteMigrations,
  normalizeStorageCatalogEntry,
  resolvePluginStoragePath,
  sortMigrations
} from '../src/index.js';

test('SQLite owns the ordered migration source and creates core.db-compatible metadata', async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'firefly-comments-storage-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const databasePath = path.join(directory, CORE_DATABASE_FILENAME);
  const repository = new SQLiteCommentRepository(databasePath);
  try {
    const versions = loadSqliteMigrations().map((migration) => migration.version);
    assert.deepEqual(versions, [1, 2]);
    assert.deepEqual(repository.listMigrationVersions(), [1, 2]);
    assert.deepEqual(repository.listPluginStorage(), []);
  } finally {
    repository.close();
  }
});

test('plugin catalog paths are independent and remain below the private data root', async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'firefly-comments-storage-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const repository = new SQLiteCommentRepository(path.join(directory, CORE_DATABASE_FILENAME), { dataRoot: directory });
  const first = { pluginId: 'comments', dialect: 'sqlite' as const, relativePath: 'data.db', schemaVersion: 1, lifecycleState: 'active' as const };
  const second = { pluginId: 'search', dialect: 'sqlite' as const, relativePath: 'data.db', schemaVersion: 3, lifecycleState: 'migrating' as const };
  try {
    repository.registerPluginStorage(first);
    repository.registerPluginStorage(second);
    assert.equal(repository.listPluginStorage().length, 2);
    assert.equal(repository.pluginStoragePath(first), path.join(directory, 'plugins', 'comments', 'data.db'));
    assert.throws(() => normalizeStorageCatalogEntry({ ...first, relativePath: '../core.db' }), /private data root/u);
    assert.throws(() => resolvePluginStoragePath(directory, { ...first, relativePath: 'nested/../../core.db' }), /private data root/u);
    assert.throws(() => repository.registerPluginStorage(first), /already exists/u);
  } finally {
    repository.close();
  }
});

test('dialect contracts sort migrations but fail closed for non-SQLite runtime drivers', () => {
  assert.deepEqual(sortMigrations([
    { version: 2, name: 'second', sql: 'SELECT 2' },
    { version: 1, name: 'first', sql: 'SELECT 1' }
  ]).map((migration) => migration.version), [1, 2]);
  assert.doesNotThrow(() => assertSupportedRuntimeDialect('sqlite'));
  assert.throws(() => assertSupportedRuntimeDialect('mariadb'), UnsupportedDatabaseDialectError);
  assert.throws(() => assertSupportedRuntimeDialect('mysql'), UnsupportedDatabaseDialectError);
  assert.equal(DEFAULT_COMMENTS_DATA_ROOT, '/var/lib/firefly-comments');
});
