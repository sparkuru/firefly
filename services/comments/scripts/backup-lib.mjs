import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const pluginIdPattern = /^[a-z][a-z0-9-]{0,62}$/u;
const dialects = new Set(['sqlite', 'mariadb', 'mysql']);
const lifecycleStates = new Set(['active', 'migrating', 'retired']);

export async function requireRegularFile(filePath, label) {
  const stats = await lstat(filePath).catch(() => null);
  if (stats === null || !stats.isFile() || stats.isSymbolicLink()) {
    throw new Error(`${label} must be an existing regular file: ${filePath}`);
  }
}

export async function requirePrivateRegularFile(filePath, label) {
  await requireRegularFile(filePath, label);
  const stats = await lstat(filePath);
  if ((stats.mode & 0o077) !== 0 || (stats.mode & 0o400) === 0) {
    throw new Error(`${label} must be owner-readable only: ${filePath}`);
  }
}

export async function requireDirectory(directoryPath, label) {
  const stats = await lstat(directoryPath).catch(() => null);
  if (stats === null || !stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error(`${label} must be an existing regular directory: ${directoryPath}`);
  }
}

export async function requireContainedPrivateRegularFile(rootPath, filePath, label) {
  const root = await realpath(rootPath).catch(() => null);
  const file = await realpath(filePath).catch(() => null);
  if (root === null || file === null) {
    throw new Error(`${label} must resolve below the private data root: ${filePath}`);
  }
  const relative = path.relative(root, file);
  if (relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${label} must remain below the private data root: ${filePath}`);
  }
  await requirePrivateRegularFile(filePath, label);
}

export async function requireAbsent(filePath, label) {
  const stats = await lstat(filePath).catch(() => null);
  if (stats !== null) {
    throw new Error(`${label} already exists; refusing to overwrite: ${filePath}`);
  }
}

export function verifyIntegrity(filePath) {
  const database = new DatabaseSync(filePath, { readOnly: true });
  try {
    const row = database.prepare('PRAGMA integrity_check').get();
    const result = row?.integrity_check;
    if (result !== 'ok') {
      throw new Error(`SQLite integrity check failed for ${filePath}: ${String(result)}`);
    }
  } finally {
    database.close();
  }
}

export async function sha256(filePath) {
  const digest = createHash('sha256');
  digest.update(await readFile(filePath));
  return digest.digest('hex');
}

export function safeRelativePath(value, label) {
  if (typeof value !== 'string' || value.length === 0 || value.startsWith('/') || value.includes('\\') || /[\u0000-\u001f\u007f\s]/u.test(value)) {
    throw new Error(`${label} must be a safe relative path.`);
  }
  if (!value.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..' && /^[A-Za-z0-9][A-Za-z0-9._~-]*$/u.test(segment))) {
    throw new Error(`${label} must be a safe relative path.`);
  }
  return value;
}

export function schemaVersion(filePath) {
  const database = new DatabaseSync(filePath, { readOnly: true });
  try {
    try {
      const row = database.prepare('SELECT MAX(version) AS version FROM schema_migrations').get();
      return Number(row?.version ?? 0);
    } catch (error) {
      if (error instanceof Error && /no such table/iu.test(error.message)) return 0;
      throw error;
    }
  } finally {
    database.close();
  }
}

export function storageCatalog(filePath) {
  const database = new DatabaseSync(filePath, { readOnly: true });
  try {
    let rows;
    try {
      rows = database.prepare(`
        SELECT plugin_id, dialect, relative_path, schema_version, lifecycle_state
        FROM plugin_storage_catalog ORDER BY plugin_id ASC
      `).all();
    } catch (error) {
      if (error instanceof Error && /no such table/iu.test(error.message)) return [];
      throw error;
    }
    const entries = rows.map((row) => {
      if (typeof row.plugin_id !== 'string' || !pluginIdPattern.test(row.plugin_id)) {
        throw new Error('plugin storage catalog contains an invalid plugin identifier.');
      }
      if (typeof row.dialect !== 'string' || !dialects.has(row.dialect)) {
        throw new Error(`plugin storage catalog contains an unsupported dialect for ${row.plugin_id}.`);
      }
      if (typeof row.lifecycle_state !== 'string' || !lifecycleStates.has(row.lifecycle_state)) {
        throw new Error(`plugin storage catalog contains an invalid lifecycle state for ${row.plugin_id}.`);
      }
      const schemaVersion = Number(row.schema_version);
      if (!Number.isSafeInteger(schemaVersion) || schemaVersion < 0) {
        throw new Error(`plugin storage catalog contains an invalid schema version for ${row.plugin_id}.`);
      }
      return {
        pluginId: row.plugin_id,
        dialect: row.dialect,
        relativePath: safeRelativePath(row.relative_path, 'plugin relative path'),
        schemaVersion,
        lifecycleState: row.lifecycle_state
      };
    });
    const pluginIds = new Set();
    const paths = new Set();
    for (const entry of entries) {
      if (pluginIds.has(entry.pluginId)) throw new Error(`plugin storage catalog contains duplicate plugin: ${entry.pluginId}`);
      const storagePath = `${entry.pluginId}/${entry.relativePath}`;
      if (paths.has(storagePath)) throw new Error(`plugin storage catalog contains duplicate path: ${storagePath}`);
      pluginIds.add(entry.pluginId);
      paths.add(storagePath);
    }
    return entries;
  } finally {
    database.close();
  }
}
