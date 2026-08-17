import type { ProcessContext, ProcessResult } from '../shell/contracts.js';
import { failureResult, successResult } from '../shell/streams.js';
import type { ParsedCommandArguments } from './arguments.js';

export const TREE_USAGE = 'tree [path]';
export const TREE_SUMMARY = 'show a public content subtree';

interface TreeChild {
  readonly name: string;
  readonly path: string;
  readonly directory: boolean;
}

function displayPath(path: string): string {
  return path === '/' ? '~/blog' : `~/blog${path}`;
}

function children(context: ProcessContext, path: string): readonly TreeChild[] {
  const listing = context.fs.list(path);
  if (listing === undefined) return Object.freeze([]);
  const prefix = path === '/' ? '/' : `${path}/`;
  const directories: TreeChild[] = listing.directories
    .filter((name) => !name.startsWith('.'))
    .map((name) => ({
      name,
      path: `${prefix}${name.slice(0, -1)}`,
      directory: true
    }));
  const experiments: TreeChild[] = listing.experiments.map((experiment) => ({
    name: `${experiment.id}/`,
    path: `${prefix}${experiment.id}`,
    directory: true
  }));
  const documents = listing.documents
    .filter((document) => document.path.startsWith(prefix) && !document.path.slice(prefix.length).includes('/'))
    .map((document) => ({ name: document.filename, path: document.path, directory: false }));
  const files = listing.files.map((name) => ({ name, path: `${prefix}${name}`, directory: false }));
  return Object.freeze([...directories, ...experiments, ...documents, ...files].sort((left, right) => {
    if (left.directory !== right.directory) return left.directory ? -1 : 1;
    return left.name.localeCompare(right.name);
  }));
}

export function executeTree(context: ProcessContext, args: ParsedCommandArguments): ProcessResult {
  const { operands } = args;
  if (operands.length > 1) return failureResult(`Usage: ${TREE_USAGE}`);
  const resolution = context.fs.resolve(operands[0] ?? '.', context.cwd, 'directory');
  if (!resolution.ok || resolution.path.startsWith('/.rshell') || context.fs.stat(resolution.path)?.kind !== 'directory') {
    return failureResult('Usage: tree [public virtual path]');
  }

  const lines: string[] = [];
  const visit = (path: string, prefix: string): void => {
    const items = children(context, path);
    items.forEach((item, index) => {
      const last = index === items.length - 1;
      lines.push(`${prefix}${last ? '└──' : '├──'} ${item.name}`);
      if (item.directory) visit(item.path, `${prefix}${last ? '    ' : '│   '}`);
    });
  };
  visit(resolution.path, '');
  const root = displayPath(resolution.path);
  return successResult([root, ...lines], { value: { kind: 'tree', root, lines: Object.freeze(lines) } });
}
