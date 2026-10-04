import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';

export function readContainedFile(relativePath, repositoryRoot, label) {
  const invalid = () => new Error(`Unable to read ${label}: expected a contained regular file without symlinks.`);
  if (typeof relativePath !== 'string' || path.isAbsolute(relativePath) || relativePath.includes('\\') ||
    relativePath.split('/').some((segment) => !/^(?!\.{1,2}$)[A-Za-z0-9._~-]+$/u.test(segment))) throw invalid();
  let descriptor;
  try {
    const root = realpathSync(repositoryRoot);
    let current = root;
    for (const segment of relativePath.split('/')) {
      current = path.join(current, segment);
      if (lstatSync(current).isSymbolicLink()) throw invalid();
    }
    const resolved = realpathSync(current);
    const relative = path.relative(root, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !lstatSync(current).isFile()) throw invalid();
    descriptor = openSync(current, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    if (!fstatSync(descriptor).isFile()) throw invalid();
    return readFileSync(descriptor);
  } catch {
    throw invalid();
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}
