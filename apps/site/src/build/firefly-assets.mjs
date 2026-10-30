import { createHash, randomUUID } from 'node:crypto';
import { constants, createWriteStream } from 'node:fs';
import { lstat, mkdir, open, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';
import { parseDocument } from 'yaml';
import { decideFireflyIgnore, loadFireflyIgnorePolicy } from '../../scripts/firefly-ignore.mjs';
import { postSchema, pageSchema } from '../lib/content-schema.mjs';
import { collectFireflyBlocks, splitFireflyFrontmatter } from './firefly-blocks.mjs';

const defaultStageRoot = fileURLToPath(new URL('../../.generated-content/', import.meta.url));
const mediaDirectory = '.firefly-media';
const manifestFilename = '.firefly-media.json';
const publicPrefix = '/firefly-media/';
const mediaPattern = /^([a-f0-9]{64})\.(png|jpe?g|gif|webp|avif|mp4|webm|ogv|mov|mp3|m4a|ogg|oga|wav|flac)$/u;
const mimeTypes = Object.freeze({
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
  mp4: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', mov: 'video/quicktime',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg', oga: 'audio/ogg', wav: 'audio/wav', flac: 'audio/flac'
});

function mediaError(owner, line, message) {
  return new Error(`[FIREFLY_MEDIA] ${owner}${line ? `:${line}` : ''}: ${message}`);
}

function isRemoteOrRoot(src) {
  return /^(?:https?:\/\/|\/(?!\/))/iu.test(src);
}

function relativePath(src, owner, line) {
  if (typeof src !== 'string' || !src || src.startsWith('/') || /^[a-z][a-z0-9+.-]*:/iu.test(src)) {
    throw mediaError(owner, line, 'invalid document-relative media reference');
  }
  const suffixIndex = src.search(/[?#]/u);
  const pathname = suffixIndex < 0 ? src : src.slice(0, suffixIndex);
  const suffix = suffixIndex < 0 ? '' : src.slice(suffixIndex);
  const segments = owner.split('/').slice(1, -1);
  for (const encoded of pathname.split('/')) {
    let segment;
    try { segment = decodeURIComponent(encoded); }
    catch { throw mediaError(owner, line, 'malformed media reference encoding'); }
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      if (!segments.length) throw mediaError(owner, line, 'media reference escapes its collection');
      segments.pop();
      continue;
    }
    if (segment.startsWith('.') || segment.normalize('NFC') !== segment || /[\\/%?#\p{Cc}\p{Cf}\p{Cs}\u2028\u2029]/u.test(segment)) {
      throw mediaError(owner, line, 'unsafe media path');
    }
    segments.push(segment);
  }
  if (!segments.length) throw mediaError(owner, line, 'media reference does not name a file');
  const extension = path.posix.extname(segments.at(-1)).slice(1).toLowerCase();
  if (!Object.hasOwn(mimeTypes, extension)) throw mediaError(owner, line, 'unsupported media extension');
  return { segments, suffix, extension };
}

function within(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function assertPolicy(sourceRoot, collection, segments, owner, line) {
  const chain = [];
  const rootPolicy = await loadFireflyIgnorePolicy(sourceRoot, []);
  if (rootPolicy) chain.push({ baseSegments: [], policy: rootPolicy });
  const logical = [collection];
  for (const part of [null, ...segments.slice(0, -1)]) {
    if (part !== null) logical.push(part);
    if (decideFireflyIgnore(chain, logical, { directory: true }).ignored) {
      throw mediaError(owner, line, 'media reference is excluded by .fireflyignore');
    }
    const policy = await loadFireflyIgnorePolicy(path.join(sourceRoot, ...logical), logical);
    if (policy) chain.push({ baseSegments: [...logical], policy });
  }
  if (decideFireflyIgnore(chain, [collection, ...segments]).ignored) {
    throw mediaError(owner, line, 'media reference is excluded by .fireflyignore');
  }
}

function publicDocument(markdown, collection, owner) {
  const frontmatter = splitFireflyFrontmatter(markdown);
  if (!frontmatter) throw mediaError(owner, undefined, 'document front matter is missing');
  const document = parseDocument(frontmatter.yaml, { uniqueKeys: true });
  if (document.errors.length) throw mediaError(owner, undefined, 'invalid document front matter');
  let value;
  try { value = document.toJS(); }
  catch { throw mediaError(owner, undefined, 'invalid document front matter'); }
  const result = (collection === 'posts' ? postSchema : pageSchema).safeParse(value);
  if (!result.success) throw mediaError(owner, undefined, 'invalid document front matter');
  return !result.data.draft && result.data.access.visibility === 'public';
}

function dimensions(head) {
  if (head.length >= 24 && head.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
  }
  if (head.length >= 10 && ['GIF87a', 'GIF89a'].includes(head.subarray(0, 6).toString('ascii'))) {
    return { width: head.readUInt16LE(6), height: head.readUInt16LE(8) };
  }
  if (head.length >= 30 && head.subarray(0, 4).toString('ascii') === 'RIFF' && head.subarray(8, 12).toString('ascii') === 'WEBP') {
    const type = head.subarray(12, 16).toString('ascii');
    if (type === 'VP8X') return { width: head.readUIntLE(24, 3) + 1, height: head.readUIntLE(27, 3) + 1 };
    if (type === 'VP8L' && head[20] === 0x2f) {
      const bits = head.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
  }
  if (head.length >= 4 && head[0] === 0xff && head[1] === 0xd8) {
    let offset = 2;
    while (offset + 8 < head.length && head[offset] === 0xff) {
      const marker = head[offset + 1];
      const length = head.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { width: head.readUInt16BE(offset + 7), height: head.readUInt16BE(offset + 5) };
      }
      if (length < 2 || offset + 2 + length > head.length) break;
      offset += 2 + length;
    }
  }
  return undefined;
}

async function copyMedia({ sourceRoot, targetRoot, file, owner, line, src }) {
  const { segments, suffix, extension } = relativePath(src, owner, line);
  const collection = file.collection;
  const collectionRoot = path.join(sourceRoot, collection);
  const ownerDirectory = file.virtualPath.split('/').slice(0, -1);
  const logicalDirectory = path.join(collectionRoot, ...ownerDirectory);
  if (await realpath(logicalDirectory).catch(() => '') !== file.sourceDirectory) {
    throw mediaError(owner, line, 'document directory changed during materialization');
  }
  await assertPolicy(sourceRoot, collection, segments, owner, line);

  const targetDirectory = segments.slice(0, -1);
  let shared = 0;
  while (shared < ownerDirectory.length && shared < targetDirectory.length && ownerDirectory[shared] === targetDirectory[shared]) shared += 1;
  const anchor = await realpath(path.join(collectionRoot, ...ownerDirectory.slice(0, shared))).catch(() => '');
  if (anchor !== file.sourceAncestors[shared]) throw mediaError(owner, line, 'document directory changed during materialization');
  const source = path.join(collectionRoot, ...segments);
  const resolved = await realpath(source).catch(() => '');
  if (!anchor || !resolved || !within(anchor, resolved)) throw mediaError(owner, line, 'missing or unsafe contained media');
  const before = await lstat(source).catch(() => null);
  if (!before?.isFile() || before.isSymbolicLink()) throw mediaError(owner, line, 'media must be a regular file');
  const mediaRoot = path.join(targetRoot, mediaDirectory);
  await mkdir(mediaRoot, { recursive: true });
  const temporary = path.join(mediaRoot, `.candidate-${randomUUID()}`);
  let handle;
  try {
    handle = await open(source, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const current = await handle.stat();
    if (!current.isFile() || current.dev !== before.dev || current.ino !== before.ino) {
      throw mediaError(owner, line, 'media changed during materialization');
    }
    const openedPath = await realpath(`/proc/self/fd/${handle.fd}`).catch(() => '');
    if (!openedPath || openedPath !== resolved || !within(anchor, openedPath)) {
      throw mediaError(owner, line, 'media changed during materialization');
    }
    const head = Buffer.alloc(Math.min(current.size, 262144));
    const read = await handle.read(head, 0, head.length, 0);
    const size = dimensions(head.subarray(0, read.bytesRead));
    const hash = createHash('sha256');
    const input = handle.createReadStream({ start: 0, autoClose: false });
    input.on('data', (chunk) => hash.update(chunk));
    await pipeline(input, createWriteStream(temporary, { flags: 'wx' }));
    const name = `${hash.digest('hex')}.${extension}`;
    await rename(temporary, path.join(mediaRoot, name));
    return {
      src: `${publicPrefix}${name}${suffix}`,
      ...(size && size.width > 0 && size.height > 0 ? size : {})
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('[FIREFLY_MEDIA]')) throw error;
    throw mediaError(owner, line, 'unable to stage referenced media');
  } finally {
    await handle?.close();
    await rm(temporary, { force: true });
  }
}

export async function stageFireflyMedia({ sourceRoot, targetRoot, inventory }) {
  const documents = Object.create(null);
  for (const collection of ['posts', 'pages']) {
    for (const file of inventory[collection] ?? []) {
      const owner = `${collection}/${file.virtualPath}`;
      const markdown = await readFile(path.join(targetRoot, collection, ...file.virtualPath.split('/')), 'utf8');
      if (!markdown.includes('firefly')) continue;
      const blocks = await collectFireflyBlocks(markdown, { documentPath: owner });
      if (!blocks.length || !publicDocument(markdown, collection, owner)) continue;
      const resources = Object.create(null);
      for (const { resources: references, line } of blocks) {
        for (const src of references) {
          if (isRemoteOrRoot(src) || Object.hasOwn(resources, src)) continue;
          resources[src] = await copyMedia({ sourceRoot, targetRoot, file, owner, line, src });
        }
      }
      if (Object.keys(resources).length) documents[owner] = resources;
    }
  }
  await writeFile(path.join(targetRoot, manifestFilename), JSON.stringify({ version: 1, documents }));
}

async function readManifest(stageRoot) {
  let manifest;
  try { manifest = JSON.parse(await readFile(path.join(stageRoot, manifestFilename), 'utf8')); }
  catch { throw new Error('Unable to read staged Firefly media manifest.'); }
  if (manifest?.version !== 1 || !manifest.documents || typeof manifest.documents !== 'object' || Array.isArray(manifest.documents)) {
    throw new Error('Invalid staged Firefly media manifest.');
  }
  return manifest;
}

function ownerFromFile(file) {
  const normalized = String(file?.path ?? '').replaceAll('\\', '/');
  const match = /(?:^|\/)\.generated-content\/(posts|pages)\/(.+\.md)$/u.exec(normalized);
  return match ? `${match[1]}/${match[2]}` : undefined;
}

export async function resolveFireflyMedia({ src, file, stageRoot = defaultStageRoot }) {
  if (isRemoteOrRoot(src)) return src;
  const owner = ownerFromFile(file);
  if (!owner) throw new Error('[FIREFLY_MEDIA] Unable to resolve document-relative media without a staged document.');
  const frontmatter = file?.data?.astro?.frontmatter;
  if (frontmatter?.draft === true || frontmatter?.access?.visibility === 'private') return `${publicPrefix}unavailable`;
  const manifest = await readManifest(stageRoot);
  const resource = Object.hasOwn(manifest.documents, owner) && Object.hasOwn(manifest.documents[owner], src)
    ? manifest.documents[owner][src] : undefined;
  if (!resource || typeof resource.src !== 'string') throw mediaError(owner, undefined, 'referenced media is not staged');
  return resource;
}

function publicName(value) {
  if (typeof value !== 'string' || !value.startsWith(publicPrefix)) return undefined;
  const name = value.slice(publicPrefix.length).split(/[?#]/u, 1)[0];
  return mediaPattern.test(name) ? name : undefined;
}

export function fireflyMediaReferences(html) {
  const references = new Set();
  function visit(node) {
    for (const attribute of node.attrs ?? []) {
      if (attribute.name !== 'src' && attribute.name !== 'href') continue;
      const name = publicName(attribute.value);
      if (name) references.add(name);
    }
    for (const child of node.childNodes ?? []) visit(child);
    if (node.content) visit(node.content);
  }
  visit(parse(html));
  return references;
}

function allowedNames(manifest) {
  const allowed = new Set();
  for (const resources of Object.values(manifest.documents)) {
    if (!resources || typeof resources !== 'object' || Array.isArray(resources)) throw new Error('Invalid staged Firefly media manifest.');
    for (const resource of Object.values(resources)) {
      const name = publicName(resource?.src);
      if (!name) throw new Error('Invalid staged Firefly media manifest.');
      allowed.add(name);
    }
  }
  return allowed;
}

async function openStaged(name, stageRoot) {
  if (!mediaPattern.test(name)) throw new Error('Invalid staged Firefly media name.');
  const root = path.join(stageRoot, mediaDirectory);
  const rootStat = await lstat(root).catch(() => null);
  if (!rootStat?.isDirectory() || rootStat.isSymbolicLink()) throw new Error('Missing staged Firefly media.');
  const filename = path.join(root, name);
  const prior = await lstat(filename).catch(() => null);
  if (!prior?.isFile() || prior.isSymbolicLink()) throw new Error('Missing staged Firefly media.');
  const handle = await open(filename, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  const current = await handle.stat();
  if (!current.isFile() || current.dev !== prior.dev || current.ino !== prior.ino) {
    await handle.close();
    throw new Error('Staged Firefly media changed.');
  }
  return { handle, stat: current };
}

export async function publishFireflyAssets(output, stageRoot = defaultStageRoot) {
  const references = new Set();
  async function scan(directory) {
    for (const child of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, child.name);
      if (child.isDirectory()) await scan(filename);
      else if (child.isFile() && child.name.endsWith('.html')) {
        for (const name of fireflyMediaReferences(await readFile(filename, 'utf8'))) references.add(name);
      }
    }
  }
  await scan(output);
  const allowed = allowedNames(await readManifest(stageRoot));
  for (const name of references) {
    if (!allowed.has(name)) throw new Error('Public HTML references unapproved Firefly media.');
    const { handle } = await openStaged(name, stageRoot);
    const destination = path.join(output, 'firefly-media', name);
    try {
      await mkdir(path.dirname(destination), { recursive: true });
      await pipeline(handle.createReadStream({ start: 0, autoClose: false }), createWriteStream(destination, { flags: 'wx' }));
    } finally { await handle.close(); }
  }
  return references;
}

function byteRange(value, size) {
  if (!value) return undefined;
  const match = /^bytes=(\d*)-(\d*)$/u.exec(value);
  if (!match || (!match[1] && !match[2]) || size === 0) return null;
  let start;
  let end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end) return null;
    end = Math.min(end, size - 1);
  }
  return { start, end };
}

export function createFireflyAssetsIntegration({ stageRoot = defaultStageRoot } = {}) {
  return {
    name: 'firefly-article-media',
    hooks: {
      'astro:build:done': async ({ dir }) => { await publishFireflyAssets(fileURLToPath(dir), stageRoot); },
      'astro:server:setup': ({ server }) => {
        server.middlewares.use(async (request, response, next) => {
          if (!request.url?.startsWith(publicPrefix)) return next();
          const name = publicName(request.url);
          let resource;
          try {
            if (!name || !['GET', 'HEAD'].includes(request.method) || !allowedNames(await readManifest(stageRoot)).has(name)) throw new Error();
            resource = await openStaged(name, stageRoot);
            const range = request.method === 'GET' && !request.headers['if-range']
              ? byteRange(request.headers.range, resource.stat.size)
              : undefined;
            response.setHeader('Accept-Ranges', 'bytes');
            response.setHeader('Content-Type', mimeTypes[name.slice(name.lastIndexOf('.') + 1)]);
            if (range === null) {
              response.statusCode = 416;
              response.setHeader('Content-Range', `bytes */${resource.stat.size}`);
              await resource.handle.close();
              response.end();
              return;
            }
            const start = range?.start ?? 0;
            const end = range?.end ?? resource.stat.size - 1;
            if (range) {
              response.statusCode = 206;
              response.setHeader('Content-Range', `bytes ${start}-${end}/${resource.stat.size}`);
            }
            response.setHeader('Content-Length', Math.max(0, end - start + 1));
            if (request.method === 'HEAD' || resource.stat.size === 0) {
              await resource.handle.close();
              response.end();
              return;
            }
            await pipeline(resource.handle.createReadStream({ start, end, autoClose: false }), response);
            await resource.handle.close();
          } catch {
            await resource?.handle.close().catch(() => {});
            if (!response.headersSent) { response.statusCode = 404; response.end('Not found'); }
            else response.destroy();
          }
        });
      }
    }
  };
}
