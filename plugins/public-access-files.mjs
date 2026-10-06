import { chmod, lstat, mkdir, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { readContainedFile } from '../tooling/shared/contained-file.mjs';
import {
  decodePluginAccess, enabledMarkerPaths, PLUGIN_ACCESS_PATH, PLUGIN_ENABLED_MARKER_CONTENTS,
  PLUGIN_IDS, PLUGIN_MARKER_ROOT, serializePluginAccess
} from './public-access.mjs';

async function regularRoot(root) {
  const resolved = path.resolve(root);
  const stats = await lstat(resolved);
  if (!stats.isDirectory() || stats.isSymbolicLink() || await realpath(resolved) !== resolved) {
    throw new Error('Plugin access root must be a canonical directory without symlinks.');
  }
  return resolved;
}

async function optionalStats(file) {
  try { return await lstat(file); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function markerInventory(root) {
  const directory = path.join(root, PLUGIN_MARKER_ROOT);
  const stats = await optionalStats(directory);
  if (!stats) return [];
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error('Plugin marker root must be a regular directory.');
  const entries = await readdir(directory, { withFileTypes: true });
  if (!entries.length) throw new Error('Empty plugin marker directory is not part of an activation snapshot.');
  for (const entry of entries) {
    if (!entry.isFile() || !PLUGIN_IDS.some((id) => entry.name === `${id}.enabled`)) {
      throw new Error(`Unexpected plugin activation marker entry: ${entry.name}.`);
    }
    const bytes = readContainedFile(`${PLUGIN_MARKER_ROOT}/${entry.name}`, root, 'plugin marker', 32);
    if (bytes.toString('utf8') !== PLUGIN_ENABLED_MARKER_CONTENTS) throw new Error('Invalid plugin enabled marker contents.');
  }
  return entries.map((entry) => `${PLUGIN_MARKER_ROOT}/${entry.name}`).sort();
}

export async function readPluginAccess(root) {
  const resolved = await regularRoot(root);
  let value;
  try { value = JSON.parse(readContainedFile(PLUGIN_ACCESS_PATH, resolved, 'plugin activation snapshot', 4096).toString('utf8')); }
  catch (error) { throw new Error(`Unable to read plugin activation snapshot; rebuild the blog release: ${error.message}`); }
  const access = decodePluginAccess(value, PLUGIN_ACCESS_PATH);
  const markers = await markerInventory(resolved);
  if (JSON.stringify(markers) !== JSON.stringify([...enabledMarkerPaths(access)].sort())) {
    throw new Error('Plugin activation snapshot and enabled markers disagree; rebuild the blog release.');
  }
  return access;
}

export async function writePluginAccess(root, access) {
  const decoded = decodePluginAccess(access);
  const resolved = await regularRoot(root);
  const snapshot = await optionalStats(path.join(resolved, PLUGIN_ACCESS_PATH));
  if (snapshot) await readPluginAccess(resolved);
  else if (await optionalStats(path.join(resolved, PLUGIN_MARKER_ROOT))) {
    throw new Error('Reserved plugin marker directory already exists without an owned activation snapshot.');
  }
  const markerRoot = path.join(resolved, PLUGIN_MARKER_ROOT);
  if (snapshot) await rm(markerRoot, { recursive: true, force: true });
  const markers = enabledMarkerPaths(decoded);
  if (markers.length) {
    await mkdir(markerRoot, { mode: 0o755 });
    await chmod(markerRoot, 0o755);
    for (const marker of markers) {
      const markerPath = path.join(resolved, marker);
      await writeFile(markerPath, PLUGIN_ENABLED_MARKER_CONTENTS, { flag: 'wx', mode: 0o644 });
      await chmod(markerPath, 0o644);
    }
  }
  const snapshotPath = path.join(resolved, PLUGIN_ACCESS_PATH);
  await writeFile(snapshotPath, serializePluginAccess(decoded), { flag: snapshot ? 'w' : 'wx', mode: 0o644 });
  await chmod(snapshotPath, 0o644);
  return decoded;
}
