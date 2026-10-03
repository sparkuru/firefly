import fs from 'node:fs';
import path from 'node:path';
import { ServiceError } from './types.js';

function unavailable(): never { throw new ServiceError(503, 'unsafe_file'); }
export function noSymlinks(target: string): void {
  const absolute = path.resolve(target);
  let current = path.parse(absolute).root;
  for (const segment of absolute.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (fs.lstatSync(current).isSymbolicLink()) unavailable();
  }
}
export function privateDirectory(target: string, create = false): string {
  const absolute = path.resolve(target);
  if (create && !fs.existsSync(absolute)) {
    noSymlinks(path.dirname(absolute));
    fs.mkdirSync(absolute, { mode: 0o700 });
  }
  noSymlinks(absolute);
  const stat = fs.lstatSync(absolute);
  if (!stat.isDirectory() || (stat.mode & 0o077) !== 0 || (stat.mode & 0o700) !== 0o700 || (process.getuid && stat.uid !== process.getuid())) unavailable();
  return fs.realpathSync(absolute);
}
export function containedFile(root: string, target: string): string {
  const absolute = path.resolve(target);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) unavailable();
  noSymlinks(path.dirname(absolute));
  if (fs.lstatSync(absolute, { throwIfNoEntry: false })) requireRegular(absolute, true);
  else if (fs.lstatSync(path.dirname(absolute)).isDirectory() === false) unavailable();
  return absolute;
}
export function readRegular(target: string, privateMode = false): Buffer {
  noSymlinks(target);
  const descriptor = fs.openSync(target, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const stat = fs.fstatSync(descriptor);
    if (!stat.isFile() || (privateMode && ((stat.mode & 0o077) !== 0 || (stat.mode & 0o400) === 0 || (process.getuid && stat.uid !== process.getuid())))) unavailable();
    return fs.readFileSync(descriptor);
  } finally { fs.closeSync(descriptor); }
}
export function requireRegular(target: string, privateMode = false): void {
  noSymlinks(target);
  const descriptor = fs.openSync(target, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const stat = fs.fstatSync(descriptor);
    if (!stat.isFile() || (privateMode && ((stat.mode & 0o077) !== 0 || (stat.mode & 0o400) === 0 || (process.getuid && stat.uid !== process.getuid())))) unavailable();
  } finally { fs.closeSync(descriptor); }
}
export function reservePrivateFile(target: string): void {
  noSymlinks(path.dirname(target));
  const descriptor = fs.openSync(target, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW, 0o600);
  fs.closeSync(descriptor);
}
