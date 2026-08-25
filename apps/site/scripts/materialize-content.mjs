import {
  access,
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
import {
  decideFireflyIgnore,
  loadFireflyIgnorePolicy
} from './firefly-ignore.mjs';

const siteRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultContentRoot = path.resolve(siteRoot, '../../content');
export const generatedContentRoot = path.join(siteRoot, '.generated-content');
export const generatedPostsRoot = path.join(generatedContentRoot, 'posts');
export const generatedPagesRoot = path.join(generatedContentRoot, 'pages');
const collections = Object.freeze(['posts', 'pages']);
const unsafeSegment = /[\\/?#%\u0000-\u001f\u007f]/u;

function safeDiagnosticPath(segments, collection = 'posts') {
  return segments.length === 0 ? `${collection}/` : `${collection}/${segments.join('/')}`;
}

function collectionName(options) {
  const collection = typeof options === 'string' ? options : options?.collection ?? 'posts';
  if (!collections.includes(collection)) {
    throw new Error(`Unsupported content collection: ${collection}`);
  }
  return collection;
}

function validateSegment(segment, virtualSegments, collection) {
  if (
    segment.length === 0 ||
    segment === '.' ||
    segment === '..' ||
    segment.startsWith('.') ||
    unsafeSegment.test(segment) ||
    segment.normalize('NFC') !== segment
  ) {
    throw new Error(`Unsafe content path: ${safeDiagnosticPath([...virtualSegments, segment], collection)}`);
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
  const readable = await access(source, constants.R_OK).then(() => true).catch(() => false);
  if (sourceStat === null || !sourceStat.isDirectory() || !readable) {
    throw new Error('FIREFLY_CONTENT_ROOT must name a readable directory.');
  }
  return source;
}

export async function scanMarkdownWorkspace(sourceRoot, options = {}) {
  const collection = collectionName(options);
  const source = await requireSourceRoot(sourceRoot);
  const policyRoot = options.policyRoot === undefined || options.policyRoot === null
    ? null
    : await requireSourceRoot(options.policyRoot);
  const policyEnabled = policyRoot !== null;
  const policyPrefix = options.policyPrefix ?? (
    policyEnabled && path.resolve(policyRoot) !== source ? [collection] : []
  );
  const policyChain = [];
  const files = [];
  const publicPaths = new Map();
  const directoryRoutes = new Map();
  const fileRoutes = new Map();

  function reservePath(virtualPath, kind) {
    const key = collisionKey(virtualPath);
    const existing = publicPaths.get(key);
    if (existing !== undefined) {
      throw new Error(`Content path collision: ${collection}/${existing} and ${collection}/${virtualPath}`);
    }
    publicPaths.set(key, virtualPath);

    const route = kind === 'file' ? virtualPath.slice(0, -3) : virtualPath;
    const routeKey = collisionKey(route);
    const opposite = kind === 'file' ? directoryRoutes : fileRoutes;
    const routeOwner = opposite.get(routeKey);
    if (routeOwner !== undefined) {
      throw new Error(`Content file/directory route collision: ${collection}/${routeOwner} and ${collection}/${virtualPath}`);
    }
    (kind === 'file' ? fileRoutes : directoryRoutes).set(routeKey, virtualPath);
  }

  function logicalSegments(virtualSegments) {
    return [...policyPrefix, ...virtualSegments];
  }

  function policyDecision(virtualSegments, { directory = false, blockedByIgnoredParent = false } = {}) {
    if (!policyEnabled) {
      return { ignored: false, blockedByIgnoredParent: false };
    }
    return decideFireflyIgnore(policyChain, logicalSegments(virtualSegments), {
      directory,
      blockedByIgnoredParent
    });
  }

  async function appendPolicy(directoryPath, directorySegments, { rootPolicy } = {}) {
    if (!policyEnabled) {
      return;
    }
    const policy = rootPolicy === undefined
      ? await loadFireflyIgnorePolicy(directoryPath, directorySegments)
      : rootPolicy;
    if (policy !== null) {
      policyChain.push({ baseSegments: directorySegments, policy });
    }
  }

  async function walk(physicalPath, virtualSegments, resolvedAncestors, blockedByIgnoredParent) {
    let nodeStat = await lstat(physicalPath).catch(() => null);
    if (nodeStat === null) {
      throw new Error(`Broken content link: ${safeDiagnosticPath(virtualSegments, collection)}`);
    }

    let resolvedPath = physicalPath;
    const linked = nodeStat.isSymbolicLink();
    if (linked) {
      await readlink(physicalPath);
      resolvedPath = await realpath(physicalPath).catch(() => '');
      if (resolvedPath.length === 0) {
        throw new Error(`Broken content link: ${safeDiagnosticPath(virtualSegments, collection)}`);
      }
      nodeStat = await stat(resolvedPath).catch(() => null);
      if (nodeStat === null) {
        throw new Error(`Broken content link: ${safeDiagnosticPath(virtualSegments, collection)}`);
      }
    }

    if (nodeStat.isDirectory()) {
      const resolvedDirectory = await realpath(resolvedPath);
      if (resolvedAncestors.has(resolvedDirectory)) {
        throw new Error(`Content link cycle: ${safeDiagnosticPath(virtualSegments, collection)}`);
      }
      const decision = policyDecision(virtualSegments, {
        directory: true,
        blockedByIgnoredParent
      });
      const directoryBlocked = blockedByIgnoredParent || decision.ignored;
      if (virtualSegments.length > 0 && !directoryBlocked) {
        reservePath(virtualSegments.join('/'), 'directory');
      }
      const nextAncestors = new Set(resolvedAncestors);
      nextAncestors.add(resolvedDirectory);
      const previousPolicyCount = policyChain.length;
      await appendPolicy(resolvedPath, logicalSegments(virtualSegments));
      try {
        const children = await readdir(resolvedPath, { withFileTypes: true });
        children.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
        for (const child of children) {
          if (child.name === '.fireflyignore') {
            if (child.isSymbolicLink()) {
              throw new Error(`Unsafe hidden content link: ${safeDiagnosticPath([...virtualSegments, child.name], collection)}`);
            }
            continue;
          }
          if (child.name.startsWith('.')) {
            if (child.isSymbolicLink()) {
              throw new Error(`Unsafe hidden content link: ${safeDiagnosticPath([...virtualSegments, child.name], collection)}`);
            }
            continue;
          }
          validateSegment(child.name, virtualSegments, collection);
          await walk(
            path.join(resolvedPath, child.name),
            [...virtualSegments, child.name],
            nextAncestors,
            directoryBlocked
          );
        }
      } finally {
        policyChain.length = previousPolicyCount;
      }
      return;
    }

    if (!nodeStat.isFile()) {
      throw new Error(`Unsupported content node: ${safeDiagnosticPath(virtualSegments, collection)}`);
    }
    const filename = virtualSegments.at(-1) ?? '';
    if (path.extname(filename).toLowerCase() !== '.md') {
      if (linked) throw new Error(`Content link target is not Markdown: ${safeDiagnosticPath(virtualSegments, collection)}`);
      return;
    }
    if (linked && path.extname(path.basename(resolvedPath)).toLowerCase() !== '.md') {
      throw new Error(`Content link target is not Markdown: ${safeDiagnosticPath(virtualSegments, collection)}`);
    }
    if (nodeStat.size === 0) {
      return;
    }
    const decision = policyDecision(virtualSegments, { blockedByIgnoredParent });
    if (decision.ignored) {
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
  let sourceBlocked = false;
  if (policyEnabled) {
    const context = options.policyContext;
    const contextRoot = context?.rootPath === undefined ? undefined : path.resolve(context.rootPath);
    const rootPolicy = contextRoot === policyRoot && Object.hasOwn(context ?? {}, 'rootPolicy')
      ? context.rootPolicy
      : policyPrefix.length === 0 && path.resolve(policyRoot) === source
        ? await loadFireflyIgnorePolicy(source, [])
        : await loadFireflyIgnorePolicy(policyRoot, []);
    if (policyPrefix.length === 0 && path.resolve(policyRoot) === source) {
      await appendPolicy(source, [], { rootPolicy });
    } else {
      if (rootPolicy !== null) {
        policyChain.push({ baseSegments: [], policy: rootPolicy });
      }
      await appendPolicy(source, policyPrefix);
    }
    // A policy rooted at the scan source cannot ignore that source directory
    // itself. Only a blog-root policy can block the collection root.
    if (policyPrefix.length > 0) {
      const sourceDecision = policyDecision([], { directory: true });
      sourceBlocked = sourceDecision.ignored;
    }
  }
  const children = await readdir(source, { withFileTypes: true });
  children.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
  for (const child of children) {
    if (child.name === '.fireflyignore') {
      if (child.isSymbolicLink()) {
        throw new Error(`Unsafe hidden content link: ${safeDiagnosticPath([child.name], collection)}`);
      }
      continue;
    }
    if (child.name.startsWith('.')) {
      if (child.isSymbolicLink()) {
        throw new Error(`Unsafe hidden content link: ${safeDiagnosticPath([child.name], collection)}`);
      }
      continue;
    }
    validateSegment(child.name, [], collection);
    await walk(path.join(source, child.name), [child.name], new Set([rootRealPath]), sourceBlocked);
  }
  return Object.freeze(files);
}

async function copyFiles(files, targetRoot) {
  for (const file of files) {
    const destination = path.join(targetRoot, ...file.virtualPath.split('/'));
    await mkdir(path.dirname(destination), { recursive: true });
    let sourceHandle;
    try {
      sourceHandle = await open(file.sourcePath, constants.O_RDONLY | constants.O_NOFOLLOW);
      const currentStat = await sourceHandle.stat();
      if (!currentStat.isFile() || currentStat.dev !== file.device || currentStat.ino !== file.inode) {
        throw new Error(`Content source changed during materialization: ${safeDiagnosticPath(file.virtualPath.split('/'), file.collection ?? 'posts')}`);
      }
        const sourceBytes = await sourceHandle.readFile();
        const sourceText = sourceBytes.toString('utf8');
        const normalizedText = normalizeLegacyBodyHeadings(sourceText);
        await writeFile(destination, normalizedText === sourceText ? sourceBytes : normalizedText);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Content source changed during materialization:')) {
        throw error;
      }
      throw new Error(`Content source changed during materialization: ${safeDiagnosticPath(file.virtualPath.split('/'), file.collection ?? 'posts')}`, { cause: error });
    } finally {
      await sourceHandle?.close();
    }
  }
}

function normalizeLegacyBodyHeadings(markdown) {
  const lines = markdown.split('\n');
  let frontmatter = lines[0]?.trim() === '---';
  let fenced = false;
  let changed = false;
  const normalized = lines.map((line, index) => {
    if (frontmatter) {
      if (index > 0 && line.trim() === '---') {
        frontmatter = false;
      }
      return line;
    }
    if (/^\s*(```|~~~)/u.test(line)) {
      fenced = !fenced;
      return line;
    }
    if (!fenced && /^# /u.test(line)) {
      changed = true;
      return `#${line}`;
    }
    return line;
  });
  return changed ? normalized.join('\n') : markdown;
}

async function replaceStage(targetRoot, { beforeCopy, beforePromote, copy }) {
  const target = path.resolve(targetRoot);
  const parent = path.dirname(target);
  if (target === parent || path.basename(target).length === 0) {
    throw new Error('Generated content target is unsafe.');
  }
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
    await copy(candidate);
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
}

export async function materializeMarkdownWorkspace({
  sourceRoot = process.env.FIREFLY_CONTENT_ROOT ?? path.join(defaultContentRoot, 'posts'),
  targetRoot = generatedPostsRoot,
  policyRoot,
  policyContext,
  beforeCopy,
  beforePromote
} = {}) {
  const files = await scanMarkdownWorkspace(sourceRoot, {
    collection: 'posts',
    ...(policyRoot === null ? {} : { policyRoot: policyRoot ?? sourceRoot }),
    ...(policyContext === undefined ? {} : { policyContext })
  });
  await replaceStage(targetRoot, {
    beforeCopy,
    beforePromote,
    copy: (candidate) => copyFiles(files, candidate)
  });
  return files.map(({ virtualPath }) => virtualPath);
}

export async function scanContentWorkspace(sourceRoot = process.env.FIREFLY_CONTENT_ROOT ?? defaultContentRoot) {
  const root = await requireSourceRoot(sourceRoot);
  const rootPolicy = await loadFireflyIgnorePolicy(root, []);
  const policyContext = Object.freeze({ rootPath: root, rootPolicy });
  const inventory = {};
  for (const collection of collections) {
    const collectionRoot = path.join(root, collection);
    const scanned = await scanMarkdownWorkspace(collectionRoot, {
      collection,
      policyRoot: root,
      policyContext
    });
    inventory[collection] = Object.freeze(scanned.map((file) => Object.freeze({ ...file, collection })));
  }
  return Object.freeze(inventory);
}

export async function materializeContentWorkspace({
  sourceRoot = process.env.FIREFLY_CONTENT_ROOT ?? defaultContentRoot,
  targetRoot = generatedContentRoot,
  beforeCopy,
  beforePromote
} = {}) {
  const inventory = await scanContentWorkspace(sourceRoot);
  await replaceStage(targetRoot, {
    beforeCopy,
    beforePromote,
    copy: async (candidate) => {
      for (const collection of collections) {
        const collectionTarget = path.join(candidate, collection);
        await mkdir(collectionTarget, { recursive: true });
        await copyFiles(inventory[collection], collectionTarget);
      }
    }
  });
  return Object.freeze({
    pages: inventory.pages.map(({ virtualPath }) => virtualPath),
    posts: inventory.posts.map(({ virtualPath }) => virtualPath)
  });
}

export const materializeMarkdownCollections = materializeContentWorkspace;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const inventory = await materializeContentWorkspace();
  process.stdout.write(`[content] materialized ${inventory.posts.length} posts and ${inventory.pages.length} pages\n`);
}
