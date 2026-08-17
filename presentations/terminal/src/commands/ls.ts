import type { ProcessContext, ProcessResult } from '../shell/contracts.js';
import { failureResult, successResult } from '../shell/streams.js';
import type { ParsedCommandArguments } from './arguments.js';
import type { DirectoryListing, PublicDocument, VfsNode } from '../vfs/contracts.js';
import { parentVirtualPath } from '../vfs/paths.js';

export const LS_USAGE = 'ls [path|pattern]';
export const LS_SUMMARY = 'list a public or session virtual directory';

function formatDocument(document: PublicDocument): string {
  const displayPath = document.kind === 'post' ? document.relativePath : document.path;
  return `${displayPath} — ${document.date} — ${document.title}`;
}

function listingLines(listing: DirectoryListing): readonly string[] {
  const lines = [
    ...listing.directories,
    ...listing.documents.map(formatDocument),
    ...listing.experiments.map((experiment) => `${experiment.id}/ — ${experiment.title}`),
    ...listing.files
  ];
  return Object.freeze(lines);
}

function childName(parent: string, path: string): string {
  const prefix = parent === '/' ? '/' : `${parent}/`;
  return path.slice(prefix.length);
}

function listingForPattern(context: ProcessContext, paths: readonly string[]): DirectoryListing | undefined {
  const first = paths[0];
  if (first === undefined) return undefined;
  const path = parentVirtualPath(first);
  const directories: string[] = [];
  const documents: PublicDocument[] = [];
  const experiments: NonNullable<DirectoryListing['experiments']>[number][] = [];
  const files: string[] = [];

  for (const matchedPath of paths) {
    if (parentVirtualPath(matchedPath) !== path) return undefined;
    const node = context.fs.stat(matchedPath);
    if (node?.kind === 'directory') directories.push(`${childName(path, matchedPath)}/`);
    else if (node?.kind === 'document') documents.push(node.document);
    else if (node?.kind === 'experiment') experiments.push(node.experiment);
    else if (node?.kind === 'scratch') files.push(node.name);
    else return undefined;
  }

  return Object.freeze({
    path,
    directories: Object.freeze(directories.sort()),
    documents: Object.freeze(documents.sort((left, right) => left.path.localeCompare(right.path))),
    experiments: Object.freeze(experiments.sort((left, right) => left.id.localeCompare(right.id))),
    files: Object.freeze(files.sort())
  });
}

function formatPatternPath(context: ProcessContext, path: string): string | undefined {
  const node = context.fs.stat(path);
  if (node?.kind === 'directory') return `${childName(parentVirtualPath(path), path)}/`;
  if (node?.kind === 'document') return formatDocument(node.document);
  if (node?.kind === 'experiment') return `${node.experiment.id}/ — ${node.experiment.title}`;
  if (node?.kind === 'scratch') return node.name;
  return undefined;
}

function nearestDirectorySuggestion(context: ProcessContext, operand: string, resolvedPath: string): string | undefined {
  const slash = resolvedPath.lastIndexOf('/');
  const parent = slash <= 0 ? '/' : resolvedPath.slice(0, slash);
  const segment = resolvedPath.slice(slash + 1);
  if (segment.length === 0 || segment.includes('*')) return undefined;
  const matches = context.fs.glob(`${parent === '/' ? '' : parent + '/'}${segment}*`);
  const directories = matches.filter((path) => context.fs.stat(path)?.kind === 'directory');
  if (directories.length !== 1) return undefined;
  const candidate = directories[0]!;
  const cwdPrefix = context.cwd === '/' ? '/' : `${context.cwd}/`;
  const relative = candidate.startsWith(cwdPrefix) ? candidate.slice(cwdPrefix.length) : candidate;
  return `${relative}/`;
}

function unknownDirectory(context: ProcessContext, operand: string | undefined, resolvedPath: string): ProcessResult {
  const shown = operand ?? context.cwd;
  const suggestion = operand === undefined ? undefined : nearestDirectorySuggestion(context, operand, resolvedPath);
  return failureResult(
    `No rshell directory named "${shown}".${suggestion === undefined ? ' Try "ls --help".' : ` Did you mean "${suggestion}"? Press Tab to complete.`}`
  );
}

export function executeLs(context: ProcessContext, args: ParsedCommandArguments): ProcessResult {
  const { operands, options } = args;
  if (operands.length > 1) return failureResult(`Usage: ${LS_USAGE}`);
  const operand = operands[0];
  if (options.help === true) {
    if (operand !== undefined) return failureResult(`Usage: ${LS_USAGE}`);
    return successResult([
      `Usage: ${LS_USAGE}`,
      LS_SUMMARY,
      'Options: -h, --help; * matches known public names.'
    ]);
  }

  const resolution = context.fs.resolve(operand ?? '.', context.cwd, 'pattern');
  if (!resolution.ok) return failureResult('ls accepts only safe rshell virtual paths or * directory patterns.');
  const matchedPaths = resolution.path.includes('*')
    ? context.fs.glob(resolution.path).filter((path) => !path.startsWith('/.rshell'))
    : context.fs.glob(resolution.path);
  if (matchedPaths.length === 0) {
    if (resolution.path.includes('*')) return failureResult(`No rshell path matches "${operand}". Try "ls --help".`);
    return unknownDirectory(context, operand, resolution.path);
  }
  if (matchedPaths.length > 1) {
    const listing = resolution.path.includes('*') ? listingForPattern(context, matchedPaths) : undefined;
    if (listing !== undefined) {
      return successResult(listingLines(listing), { value: { kind: 'directory-listing', listing } });
    }
    const lines = matchedPaths
      .map((path) => formatPatternPath(context, path))
      .filter((line): line is string => line !== undefined);
    return successResult(lines);
  }

  const path = matchedPaths[0]!;
  const node: VfsNode | undefined = context.fs.stat(path);
  if (node?.kind === 'document') {
    const listing: DirectoryListing = Object.freeze({
      path: parentVirtualPath(path),
      directories: Object.freeze([]),
      documents: Object.freeze([node.document]),
      experiments: Object.freeze([]),
      files: Object.freeze([])
    });
    return successResult([formatDocument(node.document)], { value: { kind: 'directory-listing', listing } });
  }
  if (node?.kind === 'experiment') {
    return successResult([
      `${node.experiment.id}/ — ${node.experiment.title}`,
      `Use "open lab/${node.experiment.id}" to enter this experiment.`
    ]);
  }
  const listing = node?.kind === 'directory' ? context.fs.list(path) : undefined;
  if (listing === undefined) return unknownDirectory(context, operand, path);
  return successResult(listingLines(listing), { value: { kind: 'directory-listing', listing } });
}
