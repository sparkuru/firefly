import { lstat } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';

export async function requireRegularFile(filePath, label) {
  const stats = await lstat(filePath).catch(() => null);
  if (stats === null || !stats.isFile() || stats.isSymbolicLink()) {
    throw new Error(`${label} must be an existing regular file: ${filePath}`);
  }
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
