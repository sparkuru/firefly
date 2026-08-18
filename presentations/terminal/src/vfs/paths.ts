import type { PathResolution, VirtualPath } from './contracts.js';

const shellRoot = '~/blog';
const unsafeSegment = /[\\/?#%\u0000-\u001f\u007f]/u;
const resourceMounts = Object.freeze(['posts', 'pages', 'lab']);

function isSafeSegment(segment: string, allowWildcard: boolean): boolean {
  return segment.length > 0 &&
    segment !== '.' &&
    segment !== '..' &&
    !segment.startsWith('.') &&
    segment.normalize('NFC') === segment &&
    !unsafeSegment.test(segment) &&
    (allowWildcard || !segment.includes('*'));
}

function isKnownRoot(path: string): boolean {
  return path === '/' ||
    path === '/.rshell' ||
    path === '/.rshell/tmp' ||
    path === '/posts' ||
    path === '/pages' ||
    path === '/lab' ||
    path.startsWith('/posts/') ||
    path.startsWith('/pages/') ||
    path.startsWith('/lab/') ||
    path.startsWith('/.rshell/');
}

function rootResourceMount(input: string, cwd: VirtualPath, mode: 'directory' | 'resource' | 'pattern'): string | undefined {
  if (cwd !== '/' || mode !== 'resource') return undefined;
  const operand = input.startsWith('./') ? input.slice(2) : input;
  return resourceMounts.some((mount) => operand === mount || operand.startsWith(`${mount}/`))
    ? operand
    : undefined;
}

export function displayVirtualPath(path: VirtualPath): string {
  return path === '/' ? shellRoot : shellRoot + path;
}

export function virtualPathFromDisplay(cwd: string): VirtualPath {
  return cwd === shellRoot
    ? '/'
    : cwd.startsWith(shellRoot + '/')
      ? cwd.slice(shellRoot.length)
      : '/posts';
}

export function parentVirtualPath(path: VirtualPath): VirtualPath {
  const slash = path.lastIndexOf('/');
  return slash <= 0 ? '/' : path.slice(0, slash);
}

export function resolveVirtualPath(
  input: string,
  cwd: VirtualPath,
  mode: 'directory' | 'resource' | 'pattern'
): PathResolution {
  const allowParentTraversal = mode !== 'resource';
  const allowWildcard = mode === 'pattern';
  if (
    input.length === 0 ||
    input.normalize('NFC') !== input ||
    input.includes('\\') ||
    input.includes('%') ||
    input.includes('?') ||
    input.includes('#') ||
    input.includes('://') ||
    /[\u0000-\u001f\u007f]/u.test(input)
  ) {
    return { ok: false, reason: 'unsafe' };
  }

  const mountAlias = input.endsWith('/') ? input.slice(0, -1) : input;
  if (mountAlias === 'posts' || mountAlias === 'pages' || mountAlias === 'lab') {
    return { ok: true, path: '/' + mountAlias };
  }

  let base: string;
  if (input === '~' || input === '~/blog') {
    base = '/';
  } else if (input.startsWith('~/')) {
    if (!input.startsWith(shellRoot + '/')) return { ok: false, reason: 'unknown-root' };
    base = '/' + input.slice(shellRoot.length + 1);
  } else if (input.startsWith('/')) {
    base = input;
  } else {
    const rootMount = rootResourceMount(input, cwd, mode);
    base = rootMount !== undefined
      ? `/${rootMount}`
      : cwd === '/'
        ? mode === 'resource' ? `/posts/${input}` : `/${input}`
        : `${cwd}/${input}`;
  }

  const segments: string[] = [];
  const rawSegments = base.split('/');
  for (const [index, segment] of rawSegments.entries()) {
    const leadingOrTrailing = segment === '' && (index === 0 || index === rawSegments.length - 1);
    if (leadingOrTrailing) continue;
    if (segment === '') return { ok: false, reason: 'unsafe' };
    if (segment === '.') continue;
    if (segment === '..') {
      if (!allowParentTraversal || segments.length === 0) return { ok: false, reason: 'unsafe' };
      segments.pop();
      continue;
    }
    if (segment === '.rshell' && segments.length === 0) {
      segments.push(segment);
      continue;
    }
    if (!isSafeSegment(segment, allowWildcard)) return { ok: false, reason: 'unsafe' };
    segments.push(segment);
  }

  const path = '/' + segments.join('/');
  return isKnownRoot(path)
    ? { ok: true, path: path || '/' }
    : { ok: false, reason: 'unknown-root' };
}

export function wildcardSegmentMatches(pattern: string, value: string): boolean {
  let patternIndex = 0;
  let valueIndex = 0;
  let starIndex = -1;
  let starValueIndex = -1;
  while (valueIndex < value.length) {
    if (patternIndex < pattern.length && pattern[patternIndex] === value[valueIndex]) {
      patternIndex += 1;
      valueIndex += 1;
    } else if (patternIndex < pattern.length && pattern[patternIndex] === '*') {
      starIndex = patternIndex;
      starValueIndex = valueIndex;
      patternIndex += 1;
    } else if (starIndex !== -1) {
      patternIndex = starIndex + 1;
      starValueIndex += 1;
      valueIndex = starValueIndex;
    } else {
      return false;
    }
  }
  while (patternIndex < pattern.length && pattern[patternIndex] === '*') patternIndex += 1;
  return patternIndex === pattern.length;
}

export function matchesVirtualPattern(pattern: VirtualPath, path: VirtualPath): boolean {
  const patternSegments = pattern.split('/');
  const pathSegments = path.split('/');
  return patternSegments.length === pathSegments.length &&
    patternSegments.every((segment, index) => wildcardSegmentMatches(segment, pathSegments[index]!));
}
