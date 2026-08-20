import { mkdir, rm } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { requireAbsent, requireRegularFile, verifyIntegrity } from './backup-lib.mjs';

const [sourceArgument, destinationArgument] = process.argv.slice(2);
if (!sourceArgument || !destinationArgument || process.argv.length !== 4) {
  throw new Error('Usage: node scripts/backup.mjs <database> <backup-file>');
}

const source = path.resolve(sourceArgument);
const destination = path.resolve(destinationArgument);
await requireRegularFile(source, 'database');
await requireAbsent(destination, 'backup destination');
await mkdir(path.dirname(destination), { recursive: true });

let created = false;
try {
  const database = new DatabaseSync(source);
  try {
    database.exec('PRAGMA wal_checkpoint(FULL)');
    const escapedDestination = destination.replaceAll("'", "''");
    database.exec(`VACUUM INTO '${escapedDestination}'`);
  } finally {
    database.close();
  }
  created = true;
  verifyIntegrity(destination);
  process.stdout.write(`Backup created at ${destination}\n`);
} catch (error) {
  if (created) await rm(destination, { force: true });
  throw error;
}
