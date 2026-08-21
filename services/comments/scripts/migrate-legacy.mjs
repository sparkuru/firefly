import { chmod, lstat, mkdir, rm } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { applySqliteMigrations, loadSqliteMigrations } from '../dist/src/sqlite-repository.js';

const [sourceArgument, destinationArgument] = process.argv.slice(2);
if (!sourceArgument || !destinationArgument || process.argv.length !== 4) {
  throw new Error('Usage: node scripts/migrate-legacy.mjs <legacy-comments.sqlite> <core.db>');
}

const source = path.resolve(sourceArgument);
const destination = path.resolve(destinationArgument);
await requirePrivateRegularFile(source, 'legacy database');
await requireAbsent(destination, 'core database');
await verifyIntegrity(source);
await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });

let created = false;
try {
  const sourceDatabase = new DatabaseSync(source, { readOnly: false });
  try {
    sourceDatabase.exec('PRAGMA wal_checkpoint(FULL)');
    const escapedDestination = destination.replaceAll("'", "''");
    sourceDatabase.exec(`VACUUM INTO '${escapedDestination}'`);
  } finally {
    sourceDatabase.close();
  }
  created = true;
  await chmod(destination, 0o600);
  const targetDatabase = new DatabaseSync(destination, { readOnly: false });
  try {
    const migrationsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../migrations');
    applySqliteMigrations(targetDatabase, loadSqliteMigrations(migrationsDirectory));
  } finally {
    targetDatabase.close();
  }
  await verifyIntegrity(destination);
  process.stdout.write(`Legacy comments database copied to ${destination}; old database was not modified.\n`);
} catch (error) {
  if (created) await rm(destination, { force: true });
  throw error;
}

async function requireRegularFile(filePath, label) {
  const stats = await lstat(filePath).catch(() => null);
  if (stats === null || !stats.isFile() || stats.isSymbolicLink()) {
    throw new Error(`${label} must be an existing regular file: ${filePath}`);
  }
}

async function requirePrivateRegularFile(filePath, label) {
  await requireRegularFile(filePath, label);
  const stats = await lstat(filePath);
  if ((stats.mode & 0o077) !== 0 || (stats.mode & 0o400) === 0) {
    throw new Error(`${label} must be owner-readable only: ${filePath}`);
  }
}

async function requireAbsent(filePath, label) {
  const stats = await lstat(filePath).catch(() => null);
  if (stats !== null) {
    throw new Error(`${label} already exists; refusing to overwrite: ${filePath}`);
  }
}

async function verifyIntegrity(filePath) {
  const database = new DatabaseSync(filePath, { readOnly: true });
  try {
    const row = database.prepare('PRAGMA integrity_check').get();
    if (row?.integrity_check !== 'ok') {
      throw new Error(`SQLite integrity check failed for ${filePath}.`);
    }
  } finally {
    database.close();
  }
}
