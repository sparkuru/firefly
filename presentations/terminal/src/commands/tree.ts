import type { ProcessContext, ProcessResult } from '../shell/contracts.js';
import { failureResult, successResult } from '../shell/streams.js';
import type { ParsedCommandArguments } from './arguments.js';
import type { TreeLine, TreeNode } from '../vfs/contracts.js';

export const TREE_USAGE = 'tree [path]';
export const TREE_SUMMARY = 'show a public content subtree';

function displayPath(path: string): string {
  return path === '/' ? '~/blog' : `~/blog${path}`;
}

function isDirectoryNode(node: TreeNode): boolean {
  return node.kind === 'directory';
}

function children(context: ProcessContext, path: string): readonly TreeNode[] {
  const listing = context.fs.list(path);
  if (listing === undefined) return Object.freeze([]);
  const prefix = path === '/' ? '/' : `${path}/`;
  const directories: TreeNode[] = listing.directories
    .filter((name) => !name.startsWith('.'))
    .map((name) => ({
      kind: 'directory',
      name,
      path: `${prefix}${name.slice(0, -1)}`
    }));
  const experiments: TreeNode[] = listing.experiments.map((experiment) => ({
    kind: 'experiment',
    name: `${experiment.id}/`,
    path: `${prefix}${experiment.id}`,
    experiment
  }));
  const documents = listing.documents
    .filter((document) => document.path.startsWith(prefix) && !document.path.slice(prefix.length).includes('/'))
    .map((document): TreeNode => ({ kind: 'document', name: document.filename, path: document.path, document }));
  const files: TreeNode[] = listing.files.map((name) => ({ kind: 'file', name, path: `${prefix}${name}` }));
  return Object.freeze([...directories, ...experiments, ...documents, ...files].sort((left, right) => {
    const leftDirectory = isDirectoryNode(left) || left.kind === 'experiment';
    const rightDirectory = isDirectoryNode(right) || right.kind === 'experiment';
    if (leftDirectory !== rightDirectory) return leftDirectory ? -1 : 1;
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
  const nodes: TreeLine[] = [];
  const visit = (path: string, prefix: string): void => {
    const items = children(context, path);
    items.forEach((item, index) => {
      const last = index === items.length - 1;
      const linePrefix = `${prefix}${last ? '└──' : '├──'} `;
      lines.push(`${linePrefix}${item.name}`);
      nodes.push(Object.freeze({ prefix: linePrefix, node: Object.freeze(item) }));
      if (isDirectoryNode(item)) visit(item.path, `${prefix}${last ? '    ' : '│   '}`);
    });
  };
  visit(resolution.path, '');
  const root = displayPath(resolution.path);
  return successResult([root, ...lines], {
    value: { kind: 'tree', root, lines: Object.freeze(lines), nodes: Object.freeze(nodes) }
  });
}
