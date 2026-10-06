import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalizeCommentsPublicationMetadata, walkSafeTree, type CommentsPublicationMetadata } from '../index.js';
import { decodePluginAccess, enabledMarkerPaths, PLUGIN_ACCESS_PATH, PLUGIN_MARKER_ROOT, readPluginAccess } from './access.js';
import { decodeMemoMetadata, hasMemoSurface, publicationContractRoot, readContainedFile } from './memos.js';

async function exists(candidate: string): Promise<boolean> {
  try { await lstat(candidate); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
}
async function priorMemoSurface(target: string): Promise<boolean> {
  if (!await exists(target)) return false;
  const tree = await walkSafeTree(target);
  for (const file of tree.files.filter((f) => f.endsWith('.html'))) {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(await readFile(path.join(target, file)));
    if (hasMemoSurface(text)) return true;
  }
  return false;
}
function invalid(): never { throw new TypeError('Missing or malformed prior publication history; recover the publication metadata before rebuilding.'); }
function decodeManifest(bytes: Buffer): { memos?: unknown; pluginAccess?: unknown } {
  let raw: unknown;
  try { raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { return invalid(); }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return invalid();
  const value = raw as Record<string, unknown>;
  if (Object.keys(value).some((key) => !['schemaVersion', 'catalog', 'comments', 'inventory', 'memos', 'pluginAccess'].includes(key)) || value.schemaVersion !== 1 || !Array.isArray(value.catalog) || !Array.isArray(value.inventory) || value.inventory.some((item) => typeof item !== 'string' || !item || path.posix.isAbsolute(item) || item.split('/').some((s) => s === '.' || s === '..' || !s)) || new Set(value.inventory).size !== value.inventory.length) return invalid();
  const comments = Object.hasOwn(value, 'comments') ? normalizeCommentsPublicationMetadata(value.comments as CommentsPublicationMetadata) : undefined;
  if (Object.hasOwn(value, 'pluginAccess')) {
    const access = decodePluginAccess(value.pluginAccess, 'prior publication activation');
    if (comments === undefined || comments.enabled !== access.plugins.comments.enabled) return invalid();
    const markers = value.inventory.filter((file) => file.startsWith(`${PLUGIN_MARKER_ROOT}/`)).sort();
    if (!value.inventory.includes(PLUGIN_ACCESS_PATH) || JSON.stringify(markers) !== JSON.stringify([...enabledMarkerPaths(access)].sort())) return invalid();
  }
  const catalogKeys = ['id', 'title', 'kind', 'href', 'entryHref', 'tags'];
  if (value.catalog.some((item) => item === null || typeof item !== 'object' || Array.isArray(item) ||
    Object.keys(item).length !== catalogKeys.length || catalogKeys.some((key) => !Object.hasOwn(item, key)) ||
    ['id', 'title', 'kind', 'href', 'entryHref'].some((key) => typeof item[key] !== 'string' || !item[key]) ||
    !Array.isArray(item.tags) || item.tags.some((tag: unknown) => typeof tag !== 'string'))) return invalid();
  return value;
}
export async function readMemoHistory(repositoryRoot: string, comments: CommentsPublicationMetadata): Promise<number> {
  const artifacts = path.join(repositoryRoot, 'artifacts');
  const release = path.join(repositoryRoot, 'dist');
  if (await exists(path.join(artifacts, 'publication.json'))) {
    const manifest = decodeManifest(readContainedFile('artifacts/publication.json', repositoryRoot, 'prior publication history', 4 * 1024 * 1024));
    if (Object.hasOwn(manifest, 'pluginAccess')) {
      const access = decodePluginAccess(manifest.pluginAccess);
      for (const target of [path.join(artifacts, 'site'), release]) {
        if (JSON.stringify(await readPluginAccess(target)) !== JSON.stringify(access)) return invalid();
      }
    }
    if (Object.hasOwn(manifest, 'memos')) {
      for (const target of [artifacts, release]) if (await exists(target)) await walkSafeTree(target);
      return decodeMemoMetadata(manifest.memos).tombstoneEpoch;
    }
    if (await priorMemoSurface(artifacts) || await priorMemoSurface(release)) return invalid();
    return 0;
  }
  const recognized = new Set<string>();
  const handoff = process.env.FIREFLY_COMMENTS_EXPORT;
  if (comments.enabled && handoff) {
    const relative = path.relative(repositoryRoot, path.resolve(repositoryRoot, handoff));
    const bytes = readContainedFile(relative, repositoryRoot, 'initial comments export', 64 * 1024 * 1024);
    const decoder = await import(pathToFileURL(path.join(publicationContractRoot, 'plugins/comments/public.mjs')).href) as typeof import('../../../../plugins/comments/public.mjs');
    let bundle;
    try { bundle = decoder.decodePublicCommentsExport(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)), 'initial comments export'); } catch { return invalid(); }
    if (bundle.digest !== comments.digest || bundle.sourceRevision !== comments.sourceRevision || bundle.generatedAt !== comments.generatedAt || bundle.tombstoneEpoch !== comments.tombstoneEpoch) return invalid();
    recognized.add(path.resolve(repositoryRoot, relative));
  }
  for (const target of [artifacts, release]) {
    if (!await exists(target)) continue;
    const tree = await walkSafeTree(target);
    if (tree.files.some((file) => !recognized.has(path.join(target, file)))) return invalid();
    if (tree.directories.some((directory) => !tree.files.some((file) => file.startsWith(`${directory}/`)))) return invalid();
  }
  return 0;
}
