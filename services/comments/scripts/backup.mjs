import { chmod, copyFile, lstat, mkdir, rm, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

import {
  requireAbsent,
  requireContainedPrivateRegularFile,
  requireDirectory,
  requirePrivateRegularFile,
  safeRelativePath,
  schemaVersion,
  sha256,
  storageCatalog,
  verifyIntegrity
} from './backup-lib.mjs';

const [sourceArgument, destinationArgument, ...options] = process.argv.slice(2);
if (!sourceArgument || !destinationArgument) {
  throw new Error('Usage: node scripts/backup.mjs <database|data-root> <backup-file|backup-directory> [--outbox <path>] [--state <path>]');
}

const source = path.resolve(sourceArgument);
const destination = path.resolve(destinationArgument);
const optionValues = parseOptions(options);
const sourceStats = await lstat(source).catch(() => null);

if (sourceStats?.isDirectory() && !sourceStats.isSymbolicLink()) {
  await createBackupSet(source, destination, optionValues.outbox, optionValues.state);
} else {
  await createSingleBackup(source, destination);
}

function parseOptions(values) {
  const result = { outbox: null, state: null };
  for (let index = 0; index < values.length; index += 1) {
    const key = values[index];
    const value = values[index + 1];
    if ((key !== '--outbox' && key !== '--state') || !value || value.startsWith('--')) {
      throw new Error('Backup options must be --outbox <path> and/or --state <path>.');
    }
    result[key === '--outbox' ? 'outbox' : 'state'] = path.resolve(value);
    index += 1;
  }
  return result;
}

async function createSingleBackup(sourcePath, destinationPath) {
  await requirePrivateRegularFile(sourcePath, 'database');
  await requireAbsent(destinationPath, 'backup destination');
  const manifestPath = `${destinationPath}.manifest.json`;
  await requireAbsent(manifestPath, 'backup manifest');
  await mkdir(path.dirname(destinationPath), { recursive: true, mode: 0o700 });
  let created = false;
  try {
    await snapshotDatabase(sourcePath, destinationPath);
    created = true;
    await chmod(destinationPath, 0o600);
    verifyIntegrity(destinationPath);
    await writeManifest(manifestPath, {
      manifestVersion: 1,
      createdAt: new Date().toISOString(),
      databases: [{
        kind: 'core',
        dialect: 'sqlite',
        relativePath: path.basename(sourcePath),
        file: path.basename(destinationPath),
        schemaVersion: schemaVersion(destinationPath),
        sha256: await sha256(destinationPath)
      }],
      artifacts: [],
      retention: retentionPolicy()
    });
    process.stdout.write(`Backup created at ${destinationPath}\n`);
  } catch (error) {
    if (created) await rm(destinationPath, { force: true });
    await rm(manifestPath, { force: true });
    throw error;
  }
}

async function createBackupSet(dataRoot, destinationPath, configuredOutbox, configuredState) {
  await requireDirectory(dataRoot, 'comments data root');
  await requireAbsent(destinationPath, 'backup destination');
  await mkdir(destinationPath, { recursive: true, mode: 0o700 });
  let created = false;
  try {
    const corePath = path.join(dataRoot, 'core.db');
    await requireContainedPrivateRegularFile(dataRoot, corePath, 'core database');
    const databases = [];
    const coreFile = path.join('databases', 'core.db');
    await snapshotDatabase(corePath, path.join(destinationPath, coreFile));
    await chmod(path.join(destinationPath, coreFile), 0o600);
    verifyIntegrity(path.join(destinationPath, coreFile));
    databases.push({
      kind: 'core',
      dialect: 'sqlite',
      relativePath: 'core.db',
      file: coreFile,
      schemaVersion: schemaVersion(path.join(destinationPath, coreFile)),
      sha256: await sha256(path.join(destinationPath, coreFile))
    });

    for (const entry of storageCatalog(corePath)) {
      if (entry.dialect !== 'sqlite') {
        throw new Error(`Cannot back up unsupported runtime dialect for plugin ${entry.pluginId}.`);
      }
      const sourcePath = path.resolve(dataRoot, 'plugins', entry.pluginId, ...entry.relativePath.split('/'));
      const pluginRoot = path.resolve(dataRoot, 'plugins', entry.pluginId);
      if (sourcePath !== pluginRoot && !sourcePath.startsWith(`${pluginRoot}${path.sep}`)) {
        throw new Error(`Plugin storage path escapes the private data root for ${entry.pluginId}.`);
      }
      await requireContainedPrivateRegularFile(dataRoot, sourcePath, `plugin database ${entry.pluginId}`);
      const file = path.posix.join('databases', 'plugins', entry.pluginId, entry.relativePath);
      safeRelativePath(file, 'backup database file');
      const backupPath = path.join(destinationPath, ...file.split('/'));
      await snapshotDatabase(sourcePath, backupPath);
      await chmod(backupPath, 0o600);
      verifyIntegrity(backupPath);
      databases.push({
        kind: 'plugin',
        pluginId: entry.pluginId,
        dialect: entry.dialect,
        relativePath: entry.relativePath,
        file,
        schemaVersion: schemaVersion(backupPath),
        catalogSchemaVersion: entry.schemaVersion,
        sha256: await sha256(backupPath)
      });
    }

    const artifacts = [];
    const outboxPath = configuredOutbox ?? path.join(dataRoot, 'notifications.jsonl');
    const statePath = configuredState ?? `${outboxPath}.state.json`;
    for (const [kind, artifactPath] of [['outbox', outboxPath], ['outbox-state', statePath]]) {
      const stats = await lstat(artifactPath).catch(() => null);
      if (stats === null) continue;
      await requirePrivateRegularFile(artifactPath, `${kind} artifact`);
      const file = path.posix.join('artifacts', kind === 'outbox' ? 'notifications.jsonl' : 'notifications.state.json');
      const target = path.join(destinationPath, ...file.split('/'));
      await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
      await copyFile(artifactPath, target);
      await chmod(target, 0o600);
      artifacts.push({ kind, file, sha256: await sha256(target) });
    }

    const manifest = {
      manifestVersion: 1,
      createdAt: new Date().toISOString(),
      databases,
      artifacts,
      retention: retentionPolicy()
    };
    await writeManifest(path.join(destinationPath, 'manifest.json'), manifest);
    created = true;
    process.stdout.write(`Backup set created at ${destinationPath}\n`);
  } catch (error) {
    if (!created) await rm(destinationPath, { recursive: true, force: true });
    throw error;
  }
}

async function snapshotDatabase(sourcePath, destinationPath) {
  await mkdir(path.dirname(destinationPath), { recursive: true, mode: 0o700 });
  const database = new DatabaseSync(sourcePath, { readOnly: false });
  try {
    database.exec('PRAGMA wal_checkpoint(FULL)');
    const escapedDestination = destinationPath.replaceAll("'", "''");
    database.exec(`VACUUM INTO '${escapedDestination}'`);
  } finally {
    database.close();
  }
}

async function writeManifest(manifestPath, manifest) {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  await chmod(manifestPath, 0o600);
}

function retentionPolicy() {
  return {
    mode: 'operator-managed',
    keep: 'owner-defined retention window',
    encryption: 'backup destination must provide encryption; this script does not'
  };
}
