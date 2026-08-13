import {
  lstat,
  mkdir,
  open,
  readdir,
  readlink,
  realpath,
  rename,
  rm,
  stat,
  writeFile
} from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
export const generatedPostsRoot = path.join(siteRoot, '.generated-content', 'posts');
const unsafeSegment = /[\\/?#\u0000-\u001f\u007f]/u;

function safeDiagnosticPath(segments) {
  return segments.length === 0 ? 'posts/' : `posts/${segments.join('/')}`;
}

function validateSegment(segment, virtualSegments) {
  if (
    segment.length === 0 ||
    segment === '.' ||
    segment === '..' ||
    segment.startsWith('.') ||
    unsafeSegment.test(segment) ||
    segment.normalize('NFC') !== segment
  ) {
    throw new Error(`Unsafe content path: ${safeDiagnosticPath([...virtualSegments, segment])}`);
  }
}

function collisionKey(value) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replaceAll('\u00df', 'ss')
    .replaceAll('\u03c2', '\u03c3');
}

async function requireSourceRoot(sourceRoot) {
  const source = path.resolve(sourceRoot);
  const sourceStat = await stat(source).catch(() => null);
  if (sourceStat === null || !sourceStat.isDirectory()) {
    throw new Error('F1REFLY_CONTENT_ROOT must name a readable directory.');
  }
  return source;
}

export async function scanMarkdownWorkspace(sourceRoot) {
  const source = await requireSourceRoot(sourceRoot);
  const files = [];
  const publicPaths = new Map();
  const directoryRoutes = new Map();
  const fileRoutes = new Map();

  function reservePath(virtualPath, kind) {
    const key = collisionKey(virtualPath);
    const existing = publicPaths.get(key);
    if (existing !== undefined) {
      throw new Error(`Content path collision: posts/${existing} and posts/${virtualPath}`);
    }
    publicPaths.set(key, virtualPath);

    const route = kind === 'file' ? virtualPath.slice(0, -3) : virtualPath;
    const routeKey = collisionKey(route);
    const opposite = kind === 'file' ? directoryRoutes : fileRoutes;
    const routeOwner = opposite.get(routeKey);
    if (routeOwner !== undefined) {
      throw new Error(`Content file/directory route collision: posts/${routeOwner} and posts/${virtualPath}`);
    }
    (kind === 'file' ? fileRoutes : directoryRoutes).set(routeKey, virtualPath);
  }

  async function walk(physicalPath, virtualSegments, resolvedAncestors) {
    let nodeStat = await lstat(physicalPath).catch(() => null);
    if (nodeStat === null) {
      throw new Error(`Broken content link: ${safeDiagnosticPath(virtualSegments)}`);
    }

    let resolvedPath = physicalPath;
    const linked = nodeStat.isSymbolicLink();
    if (linked) {
      await readlink(physicalPath);
      resolvedPath = await realpath(physicalPath).catch(() => '');
      if (resolvedPath.length === 0) {
        throw new Error(`Broken content link: ${safeDiagnosticPath(virtualSegments)}`);
      }
      nodeStat = await stat(resolvedPath).catch(() => null);
      if (nodeStat === null) {
        throw new Error(`Broken content link: ${safeDiagnosticPath(virtualSegments)}`);
      }
    }

    if (nodeStat.isDirectory()) {
      const resolvedDirectory = await realpath(resolvedPath);
      if (resolvedAncestors.has(resolvedDirectory)) {
        throw new Error(`Content link cycle: ${safeDiagnosticPath(virtualSegments)}`);
      }
      if (virtualSegments.length > 0) {
        reservePath(virtualSegments.join('/'), 'directory');
      }
      const nextAncestors = new Set(resolvedAncestors);
      nextAncestors.add(resolvedDirectory);
      const children = await readdir(resolvedPath, { withFileTypes: true });
      children.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
      for (const child of children) {
        if (child.name.startsWith('.')) {
          continue;
        }
        validateSegment(child.name, virtualSegments);
        await walk(path.join(resolvedPath, child.name), [...virtualSegments, child.name], nextAncestors);
      }
      return;
    }

    if (!nodeStat.isFile()) {
      throw new Error(`Unsupported content node: ${safeDiagnosticPath(virtualSegments)}`);
    }
    const filename = virtualSegments.at(-1) ?? '';
    if (path.extname(filename).toLowerCase() !== '.md') {
      if (linked) throw new Error(`Content link target is not Markdown: ${safeDiagnosticPath(virtualSegments)}`);
      return;
    }
    const virtualPath = virtualSegments.join('/');
    reservePath(virtualPath, 'file');
    files.push(Object.freeze({
      device: nodeStat.dev,
      inode: nodeStat.ino,
      sourcePath: resolvedPath,
      virtualPath
    }));
  }

  const rootRealPath = await realpath(source);
  const children = await readdir(source, { withFileTypes: true });
  children.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
  for (const child of children) {
    if (child.name.startsWith('.')) {
      continue;
    }
    validateSegment(child.name, []);
    await walk(path.join(source, child.name), [child.name], new Set([rootRealPath]));
  }
  return Object.freeze(files);
}

export async function materializeMarkdownWorkspace({
  sourceRoot = process.env.F1REFLY_CONTENT_ROOT ?? path.resolve(siteRoot, '../../content/posts'),
  targetRoot = generatedPostsRoot,
  beforeCopy,
  beforePromote
} = {}) {
  const target = path.resolve(targetRoot);
  const parent = path.dirname(target);
  if (target === parent || path.basename(target).length === 0) {
    throw new Error('Generated content target is unsafe.');
  }
  const files = await scanMarkdownWorkspace(sourceRoot);
  await mkdir(parent, { recursive: true });
  const candidate = `${target}.candidate-${process.pid}-${Date.now()}`;
  const backup = `${target}.backup-${process.pid}-${Date.now()}`;
  let priorMoved = false;
  await rm(candidate, { recursive: true, force: true });
  await mkdir(candidate, { recursive: true });
  try {
    if (beforeCopy !== undefined) {
      await beforeCopy();
    }
    for (const file of files) {
      const destination = path.join(candidate, ...file.virtualPath.split('/'));
      await mkdir(path.dirname(destination), { recursive: true });
      let sourceHandle;
      try {
        sourceHandle = await open(file.sourcePath, constants.O_RDONLY | constants.O_NOFOLLOW);
        const currentStat = await sourceHandle.stat();
        if (!currentStat.isFile() || currentStat.dev !== file.device || currentStat.ino !== file.inode) {
          throw new Error(`Content source changed during materialization: posts/${file.virtualPath}`);
        }
        await writeFile(destination, await sourceHandle.readFile());
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('Content source changed during materialization:')) {
          throw error;
        }
        throw new Error(`Content source changed during materialization: posts/${file.virtualPath}`, { cause: error });
      } finally {
        await sourceHandle?.close();
      }
    }
    const prior = await lstat(target).catch(() => null);
    if (prior !== null) {
      await rename(target, backup);
      priorMoved = true;
    }
    if (beforePromote !== undefined) {
      await beforePromote();
    }
    await rename(candidate, target);
    if (priorMoved) {
      await rm(backup, { recursive: true, force: true });
    }
  } catch (error) {
    await rm(candidate, { recursive: true, force: true });
    if (priorMoved) {
      await rm(target, { recursive: true, force: true });
      await rename(backup, target);
    }
    throw error;
  }
  return files.map(({ virtualPath }) => virtualPath);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const inventory = await materializeMarkdownWorkspace();
  process.stdout.write(`[content] materialized ${inventory.length} Markdown files\n`);
}
