import { chmod, copyFile, lstat, mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';

import {
  requireAbsent,
  requireContainedPrivateRegularFile,
  requireDirectory,
  requirePrivateRegularFile,
  safeRelativePath,
  sha256,
  verifyIntegrity
} from './backup-lib.mjs';

const [sourceArgument, destinationArgument] = process.argv.slice(2);
if (!sourceArgument || !destinationArgument || process.argv.length !== 4) {
  throw new Error('Usage: node scripts/restore.mjs <backup-file|backup-directory> <database|data-root>');
}

const source = path.resolve(sourceArgument);
const destination = path.resolve(destinationArgument);
const sourceStats = await lstat(source).catch(() => null);

if (sourceStats?.isDirectory() && !sourceStats.isSymbolicLink()) {
  await restoreBackupSet(source, destination);
} else {
  await restoreSingleBackup(source, destination);
}

async function restoreSingleBackup(sourcePath, destinationPath) {
  await requirePrivateRegularFile(sourcePath, 'backup file');
  await requireAbsent(destinationPath, 'restore destination');
  verifyIntegrity(sourcePath);
  const manifestPath = `${sourcePath}.manifest.json`;
  const manifestStats = await lstat(manifestPath).catch(() => null);
  if (manifestStats !== null) {
    await requirePrivateRegularFile(manifestPath, 'backup manifest');
    const manifest = await readJson(manifestPath);
    const database = manifest.databases?.[0];
    if (!database || database.sha256 !== await sha256(sourcePath)) {
      throw new Error('Backup manifest checksum does not match the backup file.');
    }
  }
  await mkdir(path.dirname(destinationPath), { recursive: true, mode: 0o700 });
  let created = false;
  try {
    await copyFile(sourcePath, destinationPath);
    created = true;
    await chmod(destinationPath, 0o600);
    verifyIntegrity(destinationPath);
    process.stdout.write(`Database restored at ${destinationPath}\n`);
  } catch (error) {
    if (created) await rm(destinationPath, { force: true });
    throw error;
  }
}

async function restoreBackupSet(sourcePath, destinationRoot) {
  await requireDirectory(sourcePath, 'backup set');
  await requireAbsent(destinationRoot, 'restore data root');
  const manifestPath = path.join(sourcePath, 'manifest.json');
  await requirePrivateRegularFile(manifestPath, 'backup manifest');
  const manifest = await readJson(manifestPath);
  validateManifest(manifest);
  await verifyManifestFiles(sourcePath, manifest);
  await mkdir(destinationRoot, { recursive: true, mode: 0o700 });
  let created = false;
  try {
    for (const database of manifest.databases) {
      const targetRelative = database.kind === 'core'
        ? 'core.db'
        : path.posix.join('plugins', database.pluginId, database.relativePath);
      safeRelativePath(targetRelative, 'restore database path');
      safeRelativePath(database.file, 'backup database file');
      const target = path.join(destinationRoot, ...targetRelative.split('/'));
      await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
      await copyFile(path.join(sourcePath, ...database.file.split('/')), target);
      await chmod(target, 0o600);
      verifyIntegrity(target);
    }
    for (const artifact of manifest.artifacts) {
      const targetRelative = artifact.kind === 'outbox'
        ? 'notifications.jsonl'
        : 'notifications.jsonl.state.json';
      const target = path.join(destinationRoot, targetRelative);
      await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
      await copyFile(path.join(sourcePath, ...artifact.file.split('/')), target);
      await chmod(target, 0o600);
    }
    created = true;
    process.stdout.write(`Backup set restored to ${destinationRoot}; active data was not modified.\n`);
  } catch (error) {
    if (!created) await rm(destinationRoot, { recursive: true, force: true });
    throw error;
  }
}

async function verifyManifestFiles(sourceRoot, manifest) {
  for (const database of manifest.databases) {
    safeRelativePath(database.file, 'backup database file');
    const file = path.join(sourceRoot, ...database.file.split('/'));
    await requireContainedPrivateRegularFile(sourceRoot, file, 'backup database');
    if (await sha256(file) !== database.sha256) {
      throw new Error(`Backup checksum failed for ${database.file}.`);
    }
    verifyIntegrity(file);
  }
  for (const artifact of manifest.artifacts) {
    safeRelativePath(artifact.file, 'backup artifact file');
    const file = path.join(sourceRoot, ...artifact.file.split('/'));
    await requireContainedPrivateRegularFile(sourceRoot, file, 'backup artifact');
    if (await sha256(file) !== artifact.sha256) {
      throw new Error(`Backup checksum failed for ${artifact.file}.`);
    }
  }
}

function validateManifest(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || value.manifestVersion !== 1 || !Array.isArray(value.databases) || !Array.isArray(value.artifacts)) {
    throw new Error('Backup manifest is invalid.');
  }
  let coreCount = 0;
  const files = new Set();
  const targets = new Set();
  for (const database of value.databases) {
    if (typeof database !== 'object' || database === null || (database.kind !== 'core' && database.kind !== 'plugin') || database.dialect !== 'sqlite' || typeof database.file !== 'string' || typeof database.sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(database.sha256)) {
      throw new Error('Backup database manifest entry is invalid.');
    }
    safeRelativePath(database.file, 'backup database file');
    if (files.has(database.file)) throw new Error('Backup manifest contains duplicate files.');
    files.add(database.file);
    if (database.kind === 'plugin' && (typeof database.pluginId !== 'string' || !/^[a-z][a-z0-9-]{0,62}$/u.test(database.pluginId) || typeof database.relativePath !== 'string')) {
      throw new Error('Backup plugin manifest entry is invalid.');
    }
    if (database.kind === 'core') {
      coreCount += 1;
      if (database.relativePath !== 'core.db' && database.relativePath !== undefined) throw new Error('Backup core manifest path is invalid.');
      targets.add('core.db');
    } else {
      safeRelativePath(database.relativePath, 'backup plugin relative path');
      const target = path.posix.join('plugins', database.pluginId, database.relativePath);
      if (targets.has(target)) throw new Error('Backup manifest contains duplicate storage paths.');
      targets.add(target);
    }
  }
  if (coreCount !== 1) throw new Error('Backup manifest must contain exactly one core database.');
  const artifactKinds = new Set();
  for (const artifact of value.artifacts) {
    if (typeof artifact !== 'object' || artifact === null || (artifact.kind !== 'outbox' && artifact.kind !== 'outbox-state') || typeof artifact.file !== 'string' || typeof artifact.sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(artifact.sha256)) {
      throw new Error('Backup artifact manifest entry is invalid.');
    }
    safeRelativePath(artifact.file, 'backup artifact file');
    if (files.has(artifact.file)) throw new Error('Backup manifest contains duplicate files.');
    if (artifactKinds.has(artifact.kind)) throw new Error(`Backup manifest contains duplicate ${artifact.kind} artifacts.`);
    files.add(artifact.file);
    artifactKinds.add(artifact.kind);
  }
  if (typeof value.retention !== 'object' || value.retention === null || value.retention.mode !== 'operator-managed') {
    throw new Error('Backup retention metadata is missing.');
  }
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch {
    throw new Error('Backup manifest is not valid JSON.');
  }
}
