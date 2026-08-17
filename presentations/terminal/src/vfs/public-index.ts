import type {
  DirectoryListing,
  PublicDocument,
  PublicExperiment,
  ReadableResource,
  ReadonlyVirtualFs,
  VfsNode,
  VirtualPath
} from './contracts.js';
import { matchesVirtualPattern, resolveVirtualPath } from './paths.js';

export interface PublicIndexTextDocument {
  readonly path: VirtualPath;
  readonly lines: readonly string[];
}

export interface PublicIndexScratchFile {
  readonly name: string;
  readonly lines: readonly string[];
}

export interface PublicIndexInput {
  readonly documents: readonly PublicDocument[];
  readonly experiments: readonly PublicExperiment[];
  readonly textDocuments?: readonly PublicIndexTextDocument[];
  readonly scratch?: readonly PublicIndexScratchFile[];
}

const rootDirectories = Object.freeze(['/', '/posts', '/pages', '/lab', '/.rshell', '/.rshell/tmp']);

function freezeLines(lines: readonly string[]): readonly string[] {
  return Object.freeze([...lines]);
}

function freezeDocument(document: PublicDocument): PublicDocument {
  return Object.freeze({ ...document });
}

function freezeExperiment(experiment: PublicExperiment): PublicExperiment {
  return Object.freeze({ ...experiment });
}

function parentDirectories(path: VirtualPath): readonly VirtualPath[] {
  const result: VirtualPath[] = [];
  let current = path.slice(0, path.lastIndexOf('/'));
  while (current.length > 0) {
    result.push(current);
    if (current === '/') break;
    current = current.slice(0, current.lastIndexOf('/')) || '/';
  }
  return result;
}

function directChildName(parent: VirtualPath, child: VirtualPath): string | undefined {
  const prefix = parent === '/' ? '/' : `${parent}/`;
  if (!child.startsWith(prefix) || child === parent) return undefined;
  const remainder = child.slice(prefix.length);
  if (remainder.includes('/')) return undefined;
  return remainder;
}

function isPublicPath(path: VirtualPath): boolean {
  return path === '/' || path === '/posts' || path === '/pages' || path === '/lab' ||
    path.startsWith('/posts/') || path.startsWith('/pages/') || path.startsWith('/lab/');
}

function directoryListing(
  path: VirtualPath,
  directories: ReadonlySet<VirtualPath>,
  documents: readonly PublicDocument[],
  experiments: readonly PublicExperiment[]
): DirectoryListing | undefined {
  if (!directories.has(path) || path.startsWith('/.rshell')) return undefined;
  const childDirectories = [...directories]
    .map((candidate) => directChildName(path, candidate))
    .filter((name): name is string => name !== undefined && !name.startsWith('.'))
    .map((name) => `${name}/`)
    .sort();
  const directDocuments = documents
    .filter((document) => directChildName(path, document.path) !== undefined)
    .sort((left, right) => left.path.localeCompare(right.path));
  return Object.freeze({
    path,
    directories: Object.freeze(childDirectories),
    documents: Object.freeze(directDocuments),
    experiments: path === '/lab' ? experiments : Object.freeze([]),
    files: Object.freeze([])
  });
}

export function createPublicIndex(input: PublicIndexInput): ReadonlyVirtualFs {
  const documents = Object.freeze(input.documents.map(freezeDocument).sort((left, right) => left.path.localeCompare(right.path)));
  const experiments = Object.freeze(input.experiments.map(freezeExperiment).sort((left, right) => left.id.localeCompare(right.id)));
  const scratch = Object.freeze((input.scratch ?? []).map((file) => Object.freeze({ name: file.name, lines: freezeLines(file.lines) })).sort((left, right) => left.name.localeCompare(right.name)));
  const documentByPath = new Map(documents.map((document) => [document.path, document] as const));
  const experimentByPath = new Map(experiments.map((experiment) => [`/lab/${experiment.id}`, experiment] as const));
  const textByPath = new Map<string, readonly string[]>();
  for (const document of input.textDocuments ?? []) {
    if (!documentByPath.has(document.path) || textByPath.has(document.path)) continue;
    textByPath.set(document.path, freezeLines(document.lines));
  }
  for (const document of documents) {
    if (!textByPath.has(document.path)) textByPath.set(document.path, freezeLines([document.title]));
  }

  const directories = new Set<VirtualPath>(rootDirectories);
  for (const document of documents) {
    for (const parent of parentDirectories(document.path)) directories.add(parent);
  }

  const nodes = new Map<VirtualPath, VfsNode>();
  for (const directory of directories) nodes.set(directory, { kind: 'directory', path: directory });
  for (const document of documents) nodes.set(document.path, { kind: 'document', path: document.path, document });
  for (const [path, experiment] of experimentByPath) nodes.set(path, { kind: 'experiment', path, experiment });
  for (const file of scratch) {
    const path = `/.rshell/tmp/${file.name}`;
    nodes.set(path, { kind: 'scratch', path, name: file.name });
  }

  const knownPaths = Object.freeze([
    ...directories,
    ...documents.map(({ path }) => path),
    ...experimentByPath.keys(),
    ...scratch.map(({ name }) => `/.rshell/tmp/${name}`)
  ].filter((path) => isPublicPath(path) || path.startsWith('/.rshell/')).sort());
  const scratchByPath = new Map<string, PublicIndexScratchFile>(scratch.map((file) => [`/.rshell/tmp/${file.name}`, file] as const));

  return Object.freeze({
    resolve(inputPath: string, cwd: VirtualPath, mode: 'directory' | 'resource' | 'pattern') {
      return resolveVirtualPath(inputPath, cwd, mode);
    },
    stat(path: VirtualPath) {
      return nodes.get(path);
    },
    list(path: VirtualPath) {
      if (path === '/.rshell/tmp') {
        return Object.freeze({
          path,
          directories: Object.freeze([]),
          documents: Object.freeze([]),
          experiments: Object.freeze([]),
          files: Object.freeze(scratch.map(({ name }) => name))
        });
      }
      return directoryListing(path, directories, documents, experiments);
    },
    glob(pattern: VirtualPath) {
      return Object.freeze(knownPaths.filter((path) => matchesVirtualPattern(pattern, path)));
    },
    read(path: VirtualPath): ReadableResource | undefined {
      const document = documentByPath.get(path);
      if (document !== undefined) {
        return Object.freeze({ path, lines: textByPath.get(path) ?? Object.freeze([]), document });
      }
      const file = scratchByPath.get(path);
      return file === undefined ? undefined : Object.freeze({ path, lines: file.lines });
    }
  });
}
