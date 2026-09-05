import type { CompletionContext, CompletionResult } from './contracts.js';
import { classifyVirtualOperandPrefix } from '../vfs/paths.js';

export function completeFrom(
  prefix: string,
  candidates: readonly string[],
  render: (candidate: string) => string,
  ownsAmbiguousTab = false
): CompletionResult {
  const matches = [...new Set(candidates)].filter((candidate) => candidate.startsWith(prefix)).sort();
  const exact = matches.find((candidate) => candidate === prefix);
  if (exact !== undefined) return { kind: 'unique', value: render(exact), candidates: Object.freeze([exact]) };
  if (matches.length === 1 && matches[0] !== undefined) return { kind: 'unique', value: render(matches[0]), candidates: Object.freeze(matches) };
  if (matches.length === 0) return { kind: 'none', candidates: Object.freeze([]) };
  const candidateValues = matches.map(render);
  const commonValue = candidateValues.reduce((common, value) => {
    let index = 0;
    while (index < common.length && index < value.length && common[index] === value[index]) index += 1;
    return common.slice(0, index);
  });
  return {
    kind: 'ambiguous',
    value: commonValue,
    candidates: Object.freeze(matches),
    candidateValues: Object.freeze(candidateValues),
    ownsTab: ownsAmbiguousTab
  };
}

function isSafeCompletionPrefix(prefix: string, allowWildcard = false): boolean {
  return prefix.normalize('NFC') === prefix &&
    !prefix.includes('%') &&
    !prefix.includes('\\') &&
    !prefix.includes('?') &&
    !prefix.includes('#') &&
    !prefix.includes('://') &&
    !/[\u0000-\u001f\u007f]/u.test(prefix) &&
    (allowWildcard || !prefix.includes('*')) &&
    !prefix.split('/').some((segment, index, values) =>
      (segment === '' && index < values.length - 1) || segment === '..' || segment === '.' || segment.startsWith('.'));
}

function visibleChildCandidates(prefix: string, paths: readonly string[]): readonly string[] {
  const slash = prefix.lastIndexOf('/');
  const parent = slash === -1 ? '' : prefix.slice(0, slash + 1);
  const segmentPrefix = prefix.slice(slash + 1);
  return paths.flatMap((candidate) => {
    if (!candidate.startsWith(parent)) return [];
    const remaining = candidate.slice(parent.length);
    const nextSlash = remaining.indexOf('/');
    const next = nextSlash === -1 ? remaining : `${remaining.slice(0, nextSlash)}/`;
    return next.startsWith(segmentPrefix) ? [`${parent}${next}`] : [];
  });
}

function relativeCandidate(path: string, cwdPath: string, rootResourceDefault = false): string | undefined {
  if (path === '/') return undefined;
  if (cwdPath === '/' && rootResourceDefault && path.startsWith('/posts/')) return path.slice('/posts/'.length);
  const prefix = cwdPath === '/' ? '/' : `${cwdPath}/`;
  const pathWithoutTrailingSlash = path.endsWith('/') ? path.slice(0, -1) : path;
  return path.startsWith(prefix) && pathWithoutTrailingSlash !== cwdPath ? path.slice(prefix.length) : undefined;
}

function completeVirtualPaths(
  operand: string,
  paths: readonly string[],
  invokedName: string,
  cwdPath: string,
  options: { readonly ownsAmbiguousTab?: boolean; readonly rootResourceDefault?: boolean; readonly extras?: readonly string[] } = {}
): CompletionResult {
  const parsed = classifyVirtualOperandPrefix(operand);
  if (parsed.kind === 'invalid' || !isSafeCompletionPrefix(parsed.prefix)) return { kind: 'none', candidates: Object.freeze([]) };
  const candidates = paths.flatMap((path) => {
    if (parsed.kind === 'absolute') return path === '/' ? [] : [path.slice(1)];
    if (options.rootResourceDefault && cwdPath === '/' && path.startsWith('/posts/')) {
      return [path.slice('/posts/'.length), path.slice(1)];
    }
    const candidate = relativeCandidate(path, cwdPath, options.rootResourceDefault);
    return candidate === undefined ? [] : [candidate];
  });
  if (parsed.kind === 'relative' && parsed.displayPrefix === '') candidates.push(...(options.extras ?? []));
  const visible = visibleChildCandidates(parsed.prefix, candidates);
  const completion = completeFrom(
    parsed.prefix,
    visible,
    (candidate) => `${invokedName} ${parsed.displayPrefix}${candidate}`,
    options.ownsAmbiguousTab ?? true
  );
  if (completion.kind === 'none') return Object.freeze({ kind: 'no-match', candidates: Object.freeze([]) as readonly [], ownsTab: true });
  if (completion.kind !== 'ambiguous') return completion;
  return Object.freeze({
    ...completion,
    candidates: Object.freeze(completion.candidates.map((candidate) => `${parsed.displayPrefix}${candidate}`))
  });
}

interface CompletionPaths {
  readonly directories: readonly string[];
  readonly documents: readonly string[];
  readonly experiments: readonly string[];
}

function completionPaths(context: CompletionContext): CompletionPaths {
  const directories = new Set<string>(['/', '/posts', '/pages', '/lab', '/.rshell', '/.rshell/tmp']);
  const documents = new Set<string>();
  const experiments = new Set<string>();
  const queue = ['/', '/posts', '/pages', '/lab', '/.rshell/tmp'];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const path = queue.shift()!;
    if (visited.has(path)) continue;
    visited.add(path);
    const listing = context.fs.list(path);
    if (listing === undefined) continue;
    for (const directory of listing.directories) {
      const child = path === '/' ? `/${directory.slice(0, -1)}` : `${path}/${directory.slice(0, -1)}`;
      directories.add(child);
      queue.push(child);
    }
    for (const document of listing.documents) documents.add(document.path);
    if (path === '/lab') for (const experiment of listing.experiments) {
      experiments.add(`/lab/${experiment.id}`);
      directories.add(`/lab/${experiment.id}`);
    }
  }
  return {
    directories: Object.freeze([...directories]),
    documents: Object.freeze([...documents]),
    experiments: Object.freeze([...experiments])
  };
}

export function completePath(context: CompletionContext, operand: string): CompletionResult {
  return completeVirtualPaths(operand, completionPaths(context).documents, context.invokedName, context.cwd, { rootResourceDefault: true });
}

export function completeLs(context: CompletionContext, operand: string): CompletionResult {
  const paths = completionPaths(context);
  const candidates = [
    ...paths.directories
      .filter((path) => !path.startsWith('/.rshell'))
      .map((path) => path === '/' ? path : `${path}/`),
    ...paths.documents
  ];
  return completeVirtualPaths(operand, candidates, context.invokedName, context.cwd, {
    ownsAmbiguousTab: operand.length === 0,
    extras: Object.freeze(['-h', '--help'])
  });
}

export function completeDirectory(context: CompletionContext, operand: string): CompletionResult {
  const paths = completionPaths(context);
  return completeVirtualPaths(
    operand,
    paths.directories.filter((path) => !path.startsWith('/.rshell')).map((path) => path === '/' ? path : `${path}/`),
    context.invokedName,
    context.cwd
  );
}

export function completeOpen(context: CompletionContext, operand: string): CompletionResult {
  return completeVirtualPaths(operand, completionPaths(context).experiments, context.invokedName, context.cwd);
}

export function completeTree(context: CompletionContext, operand: string): CompletionResult {
  if (operand === '~/blog') return { kind: 'unique', value: `${context.invokedName} ~/blog`, candidates: Object.freeze(['~/blog']) };
  const paths = completionPaths(context);
  const directories = paths.directories
    .filter((path) => !path.startsWith('/.rshell') && context.fs.stat(path)?.kind === 'directory')
    .map((path) => path === '/' ? path : `${path}/`);
  return completeVirtualPaths(operand, directories, context.invokedName, context.cwd);
}
