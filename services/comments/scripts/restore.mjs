import { chmod, copyFile, mkdir, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { requireAbsent, requireRegularFile, verifyIntegrity } from './backup-lib.mjs';

const [sourceArgument, destinationArgument] = process.argv.slice(2);
if (!sourceArgument || !destinationArgument || process.argv.length !== 4) {
  throw new Error('Usage: node scripts/restore.mjs <backup-file> <database>');
}

const source = path.resolve(sourceArgument);
const destination = path.resolve(destinationArgument);
await requireRegularFile(source, 'backup file');
await requireAbsent(destination, 'restore destination');
verifyIntegrity(source);
await mkdir(path.dirname(destination), { recursive: true });

let created = false;
try {
  await copyFile(source, destination, constants.COPYFILE_EXCL);
  created = true;
  await chmod(destination, 0o600);
  verifyIntegrity(destination);
  process.stdout.write(`Database restored at ${destination}\n`);
} catch (error) {
  if (created) await rm(destination, { force: true });
  throw error;
}
