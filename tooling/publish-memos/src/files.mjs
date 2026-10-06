import { closeSync, constants, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { readContainedFile } from '../../shared/contained-file.mjs';

export const shaPathPattern = /^[a-f0-9]{64}$/u;
export function safeRelative(value) {
  if (typeof value !== 'string' || value.split('/').some((part) => !part || part === '.' || part === '..' || /[\p{Cc}\p{Cf}\p{Cs}\u2028\u2029\\?#%:]/u.test(part))) throw new TypeError('Expected a safe relative path without traversal.');
  return value;
}

export function safeDirectory(value) {
  const absolute = path.resolve(value);
  let cursor = path.parse(absolute).root;
  for (const part of absolute.slice(cursor.length).split('/').filter(Boolean)) {
    cursor = path.join(cursor, part);
    const stats = lstatSync(cursor);
    if (!stats.isDirectory() || stats.isSymbolicLink()) throw new TypeError('Expected a regular directory without symlinks.');
  }
  return realpathSync(absolute);
}

export function makeSafeDirectory(value, mode = 0o700) {
  const absolute = path.resolve(value);
  let cursor = path.parse(absolute).root;
  for (const part of absolute.slice(cursor.length).split('/').filter(Boolean)) {
    cursor = path.join(cursor, part);
    let stats;
    try { stats = lstatSync(cursor); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      mkdirSync(cursor, { mode });
      stats = lstatSync(cursor);
    }
    if (!stats.isDirectory() || stats.isSymbolicLink()) throw new TypeError('Expected a regular directory without symlinks.');
  }
  return absolute;
}

export function walkFiles(root, rejectEmptyDirectories = false) {
  const directory = safeDirectory(root);
  const result = [];
  function visit(relative) {
    for (const name of readdirSync(path.join(directory, relative)).sort()) {
      const file = safeRelative(relative ? `${relative}/${name}` : name);
      const stats = lstatSync(path.join(directory, file));
      if (stats.isSymbolicLink()) throw new TypeError('Symlinks are not publisher inputs.');
      if (stats.isDirectory()) {
        const before = result.length;
        visit(file);
        if (rejectEmptyDirectories && result.length === before) throw new TypeError('Empty candidate directories are unsupported.');
      }
      else if (stats.isFile()) result.push(file);
      else throw new TypeError('Non-regular files are not publisher inputs.');
    }
  }
  visit('');
  return result;
}

export function readFile(root, relative, limit = 16 * 1024 * 1024) {
  const safe = safeRelative(relative);
  const directory = safeDirectory(root);
  // The shared ASCII helper remains the fast path; author filenames may be Unicode.
  if (/^[A-Za-z0-9._~/-]+$/u.test(safe)) return readContainedFile(safe, directory, 'Memo input', limit);
  return readUnicodeFile(directory, safe, limit);
}

function readUnicodeFile(root, relative, limit) {
  let descriptor;
  try {
    let current = root;
    for (const part of relative.split('/')) {
      current = path.join(current, part);
      if (lstatSync(current).isSymbolicLink()) throw new TypeError('Symlink Memo input is forbidden.');
    }
    if (!overlaps(root, realpathSync(current))) throw new TypeError('Memo input escapes its root.');
    descriptor = openSync(current, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const stats = fstatSync(descriptor);
    if (!stats.isFile() || stats.size > limit) throw new TypeError('Memo input must be a bounded regular file.');
    const bytes = readFileSync(descriptor);
    if (bytes.length > limit) throw new TypeError('Memo input exceeds its byte limit.');
    return bytes;
  } finally { if (descriptor !== undefined) closeSync(descriptor); }
}

export function decodeUtf8(bytes) {
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
}

export function overlaps(left, right) {
  const relation = path.relative(path.resolve(left), path.resolve(right));
  return relation === '' || (!relation.startsWith(`..${path.sep}`) && relation !== '..' && !path.isAbsolute(relation));
}
