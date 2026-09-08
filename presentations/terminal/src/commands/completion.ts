import type { CompletionContext, CompletionResult } from './contracts.js';
import { documentDisplayName } from './document-format.js';
import { classifyVirtualOperandPrefix } from '../vfs/paths.js';
import type { PublicDocument } from '../vfs/contracts.js';

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

function foldCompletionText(value: string): string {
  return value.normalize('NFC').toLocaleLowerCase('en-US');
}

function visibleChildCandidates(prefix: string, paths: readonly string[], caseInsensitive = false): readonly string[] {
  const slash = prefix.lastIndexOf('/');
  const parent = slash === -1 ? '' : prefix.slice(0, slash + 1);
  const segmentPrefix = prefix.slice(slash + 1);
  return paths.flatMap((candidate) => {
    if (!candidate.startsWith(parent)) return [];
    const remaining = candidate.slice(parent.length);
    const nextSlash = remaining.indexOf('/');
    const next = nextSlash === -1 ? remaining : `${remaining.slice(0, nextSlash)}/`;
    const matches = caseInsensitive
      ? foldCompletionText(next).startsWith(foldCompletionText(segmentPrefix))
      : next.startsWith(segmentPrefix);
    return matches ? [`${parent}${next}`] : [];
  });
}

function immediateChildCandidate(prefix: string, path: string): string | undefined {
  const slash = prefix.lastIndexOf('/');
  const parent = slash === -1 ? '' : prefix.slice(0, slash + 1);
  if (!path.startsWith(parent)) return undefined;
  const remaining = path.slice(parent.length);
  const nextSlash = remaining.indexOf('/');
  const next = nextSlash === -1 ? remaining : `${remaining.slice(0, nextSlash)}/`;
  return `${parent}${next}`;
}

function relativeCandidate(path: string, cwdPath: string, rootResourceDefault = false): string | undefined {
  if (path === '/') return undefined;
  if (cwdPath === '/' && rootResourceDefault && path.startsWith('/posts/')) return path.slice('/posts/'.length);
  const prefix = cwdPath === '/' ? '/' : `${cwdPath}/`;
  const pathWithoutTrailingSlash = path.endsWith('/') ? path.slice(0, -1) : path;
  return path.startsWith(prefix) && pathWithoutTrailingSlash !== cwdPath ? path.slice(prefix.length) : undefined;
}

type CompletionPath = string | PublicDocument;

interface ExpandedCompletionPath {
  readonly path: string;
  readonly document?: PublicDocument;
}

interface MappedCompletionCandidate {
  readonly match: string;
  readonly candidate: string;
  readonly value: string;
  readonly label?: string;
  readonly titleMatch: boolean;
}

function expandedPathCandidates(
  path: CompletionPath,
  parsed: Exclude<ReturnType<typeof classifyVirtualOperandPrefix>, { kind: 'invalid' }>,
  cwdPath: string,
  rootResourceDefault: boolean
): readonly ExpandedCompletionPath[] {
  const sourcePath = typeof path === 'string' ? path : path.path;
  const document = typeof path === 'string' ? undefined : path;
  if (parsed.kind === 'absolute') return sourcePath === '/'
    ? Object.freeze([])
    : Object.freeze([{ path: sourcePath.slice(1), ...(document === undefined ? {} : { document }) }]);
  if (rootResourceDefault && cwdPath === '/' && sourcePath.startsWith('/posts/')) {
    return Object.freeze([
      { path: sourcePath.slice('/posts/'.length), ...(document === undefined ? {} : { document }) },
      { path: sourcePath.slice(1), ...(document === undefined ? {} : { document }) }
    ]);
  }
  const candidate = relativeCandidate(sourcePath, cwdPath, rootResourceDefault);
  return candidate === undefined
    ? Object.freeze([])
    : Object.freeze([{ path: candidate, ...(document === undefined ? {} : { document }) }]);
}

function completeMapped(
  prefix: string,
  candidates: readonly MappedCompletionCandidate[],
  ownsAmbiguousTab: boolean,
  fallbackLabel: (candidate: MappedCompletionCandidate) => string
): CompletionResult {
  const byValue = new Map<string, MappedCompletionCandidate>();
  for (const candidate of candidates) {
    const matches = candidate.titleMatch
      ? foldCompletionText(candidate.match).startsWith(foldCompletionText(prefix))
      : candidate.match.startsWith(prefix);
    if (!matches) continue;
    const previous = byValue.get(candidate.value);
    if (previous === undefined || (previous.label === undefined && candidate.label !== undefined)) {
      byValue.set(candidate.value, candidate);
    }
  }

  const matches = [...byValue.values()].sort((left, right) =>
    left.candidate < right.candidate ? -1 : left.candidate > right.candidate ? 1 : left.value < right.value ? -1 : 1
  );
  if (matches.length === 0) return { kind: 'none', candidates: Object.freeze([]) };
  const exact = matches.filter((candidate) => candidate.titleMatch
    ? foldCompletionText(candidate.match) === foldCompletionText(prefix)
    : candidate.match === prefix);
  if (exact.length === 1) {
    return {
      kind: 'unique',
      value: exact[0]!.value,
      candidates: Object.freeze([exact[0]!.candidate])
    };
  }
  if (matches.length === 1) {
    return {
      kind: 'unique',
      value: matches[0]!.value,
      candidates: Object.freeze([matches[0]!.candidate])
    };
  }

  const candidateValues = matches.map(({ value }) => value);
  const commonValue = candidateValues.reduce((common, value) => {
    let index = 0;
    while (index < common.length && index < value.length && common[index] === value[index]) index += 1;
    return common.slice(0, index);
  });
  const hasLabels = matches.some(({ label }) => label !== undefined);
  return {
    kind: 'ambiguous',
    value: commonValue,
    candidates: Object.freeze(matches.map(({ candidate }) => candidate)),
    candidateValues: Object.freeze(candidateValues),
    ...(hasLabels ? { candidateLabels: Object.freeze(matches.map((candidate) => candidate.label ?? fallbackLabel(candidate))) } : {}),
    ownsTab: ownsAmbiguousTab
  };
}

function completeVirtualPaths(
  operand: string,
  paths: readonly CompletionPath[],
  invokedName: string,
  cwdPath: string,
  options: { readonly ownsAmbiguousTab?: boolean; readonly rootResourceDefault?: boolean; readonly extras?: readonly string[] } = {}
): CompletionResult {
  const parsed = classifyVirtualOperandPrefix(operand);
  if (parsed.kind === 'invalid' || !isSafeCompletionPrefix(parsed.prefix)) return { kind: 'none', candidates: Object.freeze([]) };
  const mappedCandidates: MappedCompletionCandidate[] = [];
  for (const path of paths) {
    for (const expanded of expandedPathCandidates(path, parsed, cwdPath, options.rootResourceDefault ?? false)) {
      const physicalCandidate = immediateChildCandidate(parsed.prefix, expanded.path);
      if (physicalCandidate === undefined) continue;
      const physicalMatches = visibleChildCandidates(parsed.prefix, [expanded.path])[0] === physicalCandidate;
      const value = `${invokedName} ${parsed.displayPrefix}${physicalCandidate}`;
      if (physicalMatches) mappedCandidates.push({ match: physicalCandidate, candidate: physicalCandidate, value, titleMatch: false });

      if (expanded.document === undefined || parsed.prefix.length === 0 || physicalCandidate.endsWith('/')) continue;
      const displayName = documentDisplayName(expanded.document);
      if (displayName.length === 0 || displayName.includes('/')) continue;
      const parent = physicalCandidate.slice(0, physicalCandidate.lastIndexOf('/') + 1);
      const titleCandidate = `${parent}${displayName}`;
      const titleVisible = visibleChildCandidates(parsed.prefix, [titleCandidate], true)[0];
      if (titleVisible !== titleCandidate || titleCandidate === physicalCandidate) continue;
      mappedCandidates.push({
        match: titleCandidate,
        candidate: physicalCandidate,
        value,
        label: `${displayName} — ${parsed.displayPrefix}${physicalCandidate}`,
        titleMatch: true
      });
    }
  }
  if (parsed.kind === 'relative' && parsed.displayPrefix === '') {
    for (const extra of options.extras ?? []) {
      const visible = visibleChildCandidates(parsed.prefix, [extra])[0];
      if (visible === undefined) continue;
      mappedCandidates.push({
        match: visible,
        candidate: visible,
        value: `${invokedName} ${visible}`,
        titleMatch: false
      });
    }
  }
  const completion = completeMapped(
    parsed.prefix,
    mappedCandidates,
    options.ownsAmbiguousTab ?? true,
    (candidate) => `${parsed.displayPrefix}${candidate.candidate}`
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
  readonly documents: readonly PublicDocument[];
  readonly experiments: readonly string[];
}

function completionPaths(context: CompletionContext): CompletionPaths {
  const directories = new Set<string>(['/', '/posts', '/pages', '/lab', '/.rshell', '/.rshell/tmp']);
  const documents = new Map<string, PublicDocument>();
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
    for (const document of listing.documents) documents.set(document.path, document);
    if (path === '/lab') for (const experiment of listing.experiments) {
      experiments.add(`/lab/${experiment.id}`);
      directories.add(`/lab/${experiment.id}`);
    }
  }
  return {
    directories: Object.freeze([...directories]),
    documents: Object.freeze([...documents.values()]),
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
