#!/usr/bin/env node

import { constants } from 'node:fs';
import {
  access,
  chmod,
  link,
  lstat,
  mkdir,
  open,
  realpath,
  rename,
  rm
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import YAML from 'yaml';
import { pageSchema, postSchema } from '../src/lib/content-schema.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultBlogRoot = path.resolve(scriptDirectory, '../../..', 'content');
const collections = Object.freeze(['posts', 'pages']);
const outputKeys = Object.freeze([
  'title',
  'htmlTitle',
  'slug',
  'date',
  'updated',
  'description',
  'canonical',
  'seoImage',
  'noindex',
  'tags',
  'firefly',
  'draft',
  'layout',
  'presentation',
  'aliases',
  'source',
  'access'
]);
const unsafePathSegment = /[\\/?#%:\u0000-\u001f\u007f]/u;
const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

export class BlogMetaError extends Error {
  constructor(message, exitCode = 1, options = undefined) {
    const errorOptions = typeof exitCode === 'object' ? exitCode : options;
    const status = typeof exitCode === 'number' ? exitCode : 1;
    super(message, errorOptions);
    this.name = 'BlogMetaError';
    this.exitCode = status;
  }
}

class UsageError extends BlogMetaError {
  constructor(message) {
    super(message, 2);
    this.name = 'UsageError';
  }
}

function usage() {
  return `Usage: blog-meta <path/to/article.md> [options]

Organize one Markdown document's Firefly YAML front matter. Save-as is the
default; --write-back is required to replace the source file.

Options:
  --blog-root PATH       Blog root containing posts/ and pages/
  --collection NAME      posts or pages (default: inferred, otherwise posts)
  --category PATH        Nested posts category for an inferred save-as target
  --output PATH          Save-as destination, relative to the blog root
  --write-back           Replace the source file atomically
  --overwrite            Allow replacing an existing save-as file
  --preview              Print the normalized document without writing
  --title TEXT           Override title metadata
  --description TEXT     Override description metadata
  --date VALUE           Override publication date
  --updated VALUE        Override updated date
  --draft true|false     Override draft metadata
  --layout VALUE         post, page, timeline, or files
  --slug VALUE           Override route slug
  --tag VALUE            Replace tags; may be repeated
  --access VALUE         public or private:OWNER
  -h, --help             Show this help

FIREFLY_CONTENT_ROOT is used when --blog-root is omitted. Without either,
the repository content/ fixture is used. Build commands keep content mounts
read-only; run this authoring command on the host when a write is intended.`;
}

function splitOption(argument) {
  if (!argument.startsWith('--')) return [argument, undefined];
  const equals = argument.indexOf('=');
  return equals === -1
    ? [argument, undefined]
    : [argument.slice(0, equals), argument.slice(equals + 1)];
}

function parseArguments(arguments_) {
  const options = {
    blogRoot: undefined,
    collection: undefined,
    category: undefined,
    output: undefined,
    writeBack: false,
    overwrite: false,
    preview: false,
    title: undefined,
    description: undefined,
    date: undefined,
    updated: undefined,
    draft: undefined,
    layout: undefined,
    slug: undefined,
    tags: [],
    tagsProvided: false,
    access: undefined,
    positional: undefined,
    help: false
  };
  let endOfOptions = false;

  const requireValue = (name, inlineValue, index) => {
    if (inlineValue !== undefined) return inlineValue;
    const value = arguments_[index + 1];
    if (value === undefined || (!endOfOptions && value.startsWith('--'))) {
      throw new UsageError(`${name} requires a value.`);
    }
    return value;
  };

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (endOfOptions) {
      if (options.positional !== undefined) throw new UsageError('Only one Markdown input path is accepted.');
      options.positional = argument;
      continue;
    }
    if (argument === '--') {
      endOfOptions = true;
      continue;
    }
    if (argument === '-h' || argument === '--help') {
      options.help = true;
      continue;
    }
    if (!argument.startsWith('-')) {
      if (options.positional !== undefined) throw new UsageError('Only one Markdown input path is accepted.');
      options.positional = argument;
      continue;
    }

    const [name, inlineValue] = splitOption(argument);
    const valueOption = (assign) => {
      const value = requireValue(name, inlineValue, index);
      if (inlineValue === undefined) index += 1;
      assign(value);
    };

    switch (name) {
      case '--blog-root':
      case '--root':
        valueOption((value) => { options.blogRoot = value; });
        break;
      case '--collection':
        valueOption((value) => { options.collection = value; });
        break;
      case '--category':
        valueOption((value) => { options.category = value; });
        break;
      case '--output':
        valueOption((value) => { options.output = value; });
        break;
      case '--title':
        valueOption((value) => { options.title = value; });
        break;
      case '--description':
        valueOption((value) => { options.description = value; });
        break;
      case '--date':
        valueOption((value) => { options.date = value; });
        break;
      case '--updated':
        valueOption((value) => { options.updated = value; });
        break;
      case '--draft':
        valueOption((value) => { options.draft = value; });
        break;
      case '--layout':
        valueOption((value) => { options.layout = value; });
        break;
      case '--slug':
        valueOption((value) => { options.slug = value; });
        break;
      case '--tag':
        valueOption((value) => {
          options.tags.push(value);
          options.tagsProvided = true;
        });
        break;
      case '--access':
        valueOption((value) => { options.access = value; });
        break;
      case '--write-back':
        if (inlineValue !== undefined) throw new UsageError('--write-back does not accept a value.');
        options.writeBack = true;
        break;
      case '--overwrite':
        if (inlineValue !== undefined) throw new UsageError('--overwrite does not accept a value.');
        options.overwrite = true;
        break;
      case '--preview':
        if (inlineValue !== undefined) throw new UsageError('--preview does not accept a value.');
        options.preview = true;
        break;
      default:
        throw new UsageError(`Unknown option: ${argument}`);
    }
  }

  return Object.freeze(options);
}

function decodeUtf8(bytes, owner) {
  try {
    return utf8Decoder.decode(bytes);
  } catch (error) {
    throw new BlogMetaError(`Markdown is not valid UTF-8: ${owner}`, { cause: error });
  }
}

function readLine(bytes, start) {
  if (start > bytes.length) return null;
  const newline = bytes.indexOf(0x0a, start);
  const end = newline === -1 ? bytes.length : newline;
  const lineBytes = bytes.subarray(start, end);
  const line = lineBytes[lineBytes.length - 1] === 0x0d
    ? lineBytes.subarray(0, lineBytes.length - 1)
    : lineBytes;
  return {
    text: decodeUtf8(line, 'front matter delimiter'),
    next: newline === -1 ? bytes.length : newline + 1
  };
}

function isDelimiter(line) {
  return line.replace(/[ \t]+$/u, '') === '---';
}

function parseYamlFrontMatter(yamlText, owner) {
  let document;
  try {
    document = YAML.parseDocument(yamlText, {
      version: '1.2',
      uniqueKeys: true,
      strict: true,
      prettyErrors: false
    });
  } catch (error) {
    throw new BlogMetaError(`Invalid YAML front matter in ${owner}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (document.errors.length > 0) {
    throw new BlogMetaError(`Invalid YAML front matter in ${owner}: ${document.errors[0].message}`);
  }
  if (document.contents === null) return {};

  let value;
  try {
    value = document.toJS({ mapAsMap: false });
  } catch (error) {
    throw new BlogMetaError(`Invalid YAML front matter in ${owner}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new BlogMetaError(`Front matter in ${owner} must be a YAML mapping.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new BlogMetaError(`Front matter in ${owner} must be a plain YAML mapping.`);
  }
  return value;
}

export function parseFrontMatter(bytes, owner = 'document') {
  const bom = bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))
    ? bytes.subarray(0, 3)
    : Buffer.alloc(0);
  const firstLine = readLine(bytes, bom.length);
  if (firstLine === null || !isDelimiter(firstLine.text)) {
    return Object.freeze({
      kind: 'none',
      metadata: Object.freeze({}),
      body: bytes.subarray(bom.length),
      bom
    });
  }

  let cursor = firstLine.next;
  while (cursor <= bytes.length) {
    const line = readLine(bytes, cursor);
    if (line === null) break;
    if (isDelimiter(line.text)) {
      const yamlBytes = bytes.subarray(firstLine.next, cursor);
      const yamlText = decodeUtf8(yamlBytes, owner);
      const metadata = parseYamlFrontMatter(yamlText, owner);
      return Object.freeze({
        kind: Object.keys(metadata).length === 0 ? 'empty' : 'present',
        metadata: Object.freeze(metadata),
        body: bytes.subarray(line.next),
        bom
      });
    }
    if (line.next === cursor) break;
    cursor = line.next;
  }
  throw new BlogMetaError(`Front matter in ${owner} has no closing --- delimiter.`);
}

function hasOwn(value, key) {
  return Object.hasOwn(value, key);
}

function blankString(value) {
  return typeof value === 'string' && value.trim().length === 0;
}

function stripOrderingPrefix(stem) {
  return stem.replace(/^\d+[-_]+/u, '');
}

function humanizeStem(stem) {
  const humanized = stripOrderingPrefix(stem)
    .replace(/[-_]+/gu, ' ')
    .trim();
  return humanized.length > 0 ? humanized : stem.trim();
}

function safeSlugFromStem(stem) {
  const normalized = stripOrderingPrefix(stem)
    .normalize('NFC')
    .replace(/[\s_]+/gu, '-')
    .replace(/-{2,}/gu, '-')
    .trim();
  if (normalized.length === 0 || normalized === '.' || normalized === '..' || normalized.startsWith('.') || unsafePathSegment.test(normalized)) {
    throw new BlogMetaError(`Cannot infer a safe slug from Markdown filename: ${stem}.`);
  }
  return normalized;
}

function markdownBodyLines(bodyText) {
  return bodyText.replace(/^\uFEFF/u, '').split(/\r\n|\n|\r/u);
}

function scanMarkdownBody(bodyText) {
  const lines = markdownBodyLines(bodyText);
  let fenced = false;
  let fenceCharacter = undefined;
  let title;
  let description;

  for (const line of lines) {
    const fence = line.match(/^\s*(`{3,}|~{3,})/u);
    if (fence !== null) {
      const character = fence[1][0];
      if (!fenced) {
        fenced = true;
        fenceCharacter = character;
      } else if (character === fenceCharacter) {
        fenced = false;
        fenceCharacter = undefined;
      }
      continue;
    }
    if (fenced) continue;

    if (title === undefined) {
      const heading = line.match(/^\s*#(?!#)[ \t]+(.+?)[ \t]*$/u);
      if (heading !== null) {
        title = heading[1].replace(/[ \t]+#+[ \t]*$/u, '').trim();
        if (title.length === 0) title = undefined;
        continue;
      }
    }

    if (description === undefined) {
      const trimmed = line.trim();
      if (trimmed.length === 0 || /^#{1,6}[ \t]+/u.test(trimmed)) continue;
      description = trimmed;
    }
  }

  return { title, description };
}

function fileStem(sourcePath) {
  const filename = path.basename(sourcePath);
  return filename.toLowerCase().endsWith('.md') ? filename.slice(0, -3) : filename;
}

function inferMetadata(sourcePath, body, existingMetadata, collection, options, now) {
  const bodyText = decodeUtf8(body, sourcePath);
  const bodyHints = scanMarkdownBody(bodyText);
  const stem = fileStem(sourcePath);
  const inferredTitle = bodyHints.title ?? humanizeStem(stem);
  if (inferredTitle.length === 0) throw new BlogMetaError(`Cannot infer a title from ${sourcePath}.`);
  const inferredDescription = bodyHints.description ?? inferredTitle;
  const inferredSlug = safeSlugFromStem(stem);
  const metadata = { ...existingMetadata };

  if (!hasOwn(metadata, 'title') || blankString(metadata.title)) metadata.title = inferredTitle;
  if (!hasOwn(metadata, 'description') || blankString(metadata.description)) metadata.description = inferredDescription;
  if (!hasOwn(metadata, 'date')) metadata.date = now;
  if (!hasOwn(metadata, 'draft')) metadata.draft = true;
  if (!hasOwn(metadata, 'layout')) metadata.layout = collection === 'posts' ? 'post' : 'page';
  if (collection === 'pages' && (!hasOwn(metadata, 'slug') || blankString(metadata.slug))) metadata.slug = inferredSlug;

  if (options.title !== undefined) metadata.title = options.title;
  if (options.description !== undefined) metadata.description = options.description;
  if (options.date !== undefined) metadata.date = options.date;
  if (options.updated !== undefined) metadata.updated = options.updated;
  if (options.draft !== undefined) metadata.draft = parseBoolean(options.draft, '--draft');
  if (options.layout !== undefined) metadata.layout = options.layout;
  if (options.slug !== undefined) metadata.slug = options.slug;
  if (options.tagsProvided) metadata.tags = [...options.tags];
  if (options.access !== undefined) metadata.access = parseAccess(options.access);

  return { metadata, bodyText };
}

function parseBoolean(value, optionName) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new UsageError(`${optionName} must be true or false.`);
}

function parseAccess(value) {
  if (value === 'public') return { visibility: 'public' };
  if (value.startsWith('private:') && value.slice('private:'.length).length > 0) {
    return { visibility: 'private', owner: value.slice('private:'.length) };
  }
  throw new UsageError('--access must be public or private:OWNER.');
}

function validateDateInput(value, optionName) {
  if (typeof value !== 'string') return;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/u.exec(value);
  if (dateOnly === null) return;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new UsageError(`${optionName} must be a valid calendar date or ISO date-time.`);
  }
}

function formatSchemaIssues(result, collection, sourcePath) {
  const issues = result.error.issues.map((issue) => {
    const location = issue.path.length === 0 ? 'front matter' : issue.path.join('.');
    return `${location}: ${issue.message}`;
  });
  return `Front matter for ${collection} is invalid (${sourcePath}): ${issues.join('; ')}`;
}

function calendarDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.valueOf())) {
    throw new BlogMetaError('Schema returned an invalid date.');
  }
  return value.toISOString().slice(0, 10);
}

function normalizeSchemaData(parsed) {
  const metadata = {};
  for (const key of outputKeys) {
    if (!hasOwn(parsed, key) || parsed[key] === undefined) continue;
    const value = parsed[key];
    metadata[key] = key === 'date' || key === 'updated' ? calendarDate(value) : value;
  }
  return metadata;
}

function validateMetadata(metadata, collection, sourcePath) {
  const schema = collection === 'posts' ? postSchema : pageSchema;
  const result = schema.safeParse(metadata);
  if (!result.success) throw new BlogMetaError(formatSchemaIssues(result, collection, sourcePath));
  return normalizeSchemaData(result.data);
}

function assertCollection(value) {
  if (!collections.includes(value)) throw new UsageError(`Unsupported collection: ${value}. Use posts or pages.`);
  return value;
}

function isContained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative.length > 0 && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

function validateSegment(segment, owner) {
  if (
    segment.length === 0 ||
    segment === '.' ||
    segment === '..' ||
    segment.startsWith('.') ||
    segment.normalize('NFC') !== segment ||
    unsafePathSegment.test(segment)
  ) {
    throw new BlogMetaError(`${owner} contains an unsafe path segment: ${segment}.`);
  }
}

function validateRelativeSegments(value, owner) {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\\') || value.includes('\0')) {
    throw new BlogMetaError(`${owner} must be a safe relative path.`);
  }
  const segments = value.split('/');
  for (const segment of segments) validateSegment(segment, owner);
  return segments;
}

function validateOutputArgument(value) {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\0') || value.includes('\\')) {
    throw new BlogMetaError('--output must be a non-empty path without backslashes or NUL bytes.');
  }
  const segments = value.split('/');
  const start = path.isAbsolute(value) ? 1 : 0;
  for (let index = start; index < segments.length; index += 1) {
    const segment = segments[index];
    if (segment.length === 0 || segment === '.' || segment === '..') {
      throw new BlogMetaError('--output must not contain empty, . or .. path segments.');
    }
  }
}

async function requireBlogRoot(requestedRoot, cwd) {
  const candidate = path.resolve(cwd, requestedRoot);
  let root;
  try {
    root = await realpath(candidate);
  } catch (error) {
    throw new BlogMetaError(`Blog root is not readable: ${candidate}.`, { cause: error });
  }
  const rootStat = await lstat(root).catch(() => null);
  if (rootStat === null || !rootStat.isDirectory()) throw new BlogMetaError(`Blog root is not a directory: ${root}.`);
  await access(root, constants.R_OK).catch((error) => {
    throw new BlogMetaError(`Blog root is not readable: ${root}.`, { cause: error });
  });
  for (const collection of collections) {
    const collectionPath = path.join(root, collection);
    const collectionStat = await lstat(collectionPath).catch(() => null);
    if (collectionStat === null || !collectionStat.isDirectory() || collectionStat.isSymbolicLink()) {
      throw new BlogMetaError(`Blog root must contain a regular ${collection}/ directory: ${root}.`);
    }
    await access(collectionPath, constants.R_OK).catch((error) => {
      throw new BlogMetaError(`Blog collection is not readable: ${collectionPath}.`, { cause: error });
    });
  }
  return root;
}

async function requireSource(sourceArgument, cwd) {
  if (typeof sourceArgument !== 'string' || sourceArgument.length === 0 || sourceArgument.includes('\0')) {
    throw new BlogMetaError('A Markdown source path is required.');
  }
  const sourcePath = path.resolve(cwd, sourceArgument);
  if (!sourcePath.toLowerCase().endsWith('.md')) throw new BlogMetaError(`Source must be a Markdown file: ${sourcePath}.`);
  const sourceStat = await lstat(sourcePath).catch(() => null);
  if (sourceStat === null) throw new BlogMetaError(`Source file does not exist: ${sourcePath}.`);
  if (sourceStat.isSymbolicLink()) throw new BlogMetaError(`Source symbolic links are not accepted: ${sourcePath}.`);
  if (!sourceStat.isFile()) throw new BlogMetaError(`Source is not a regular Markdown file: ${sourcePath}.`);
  const resolvedSource = await realpath(sourcePath);
  if (resolvedSource !== sourcePath) throw new BlogMetaError(`Source path traverses a symbolic link: ${sourcePath}.`);
  let handle;
  try {
    handle = await open(sourcePath, constants.O_RDONLY | constants.O_NOFOLLOW);
    const openedStat = await handle.stat();
    if (!openedStat.isFile() || !sameFile(openedStat, sourceStat)) {
      throw new BlogMetaError(`Source changed while it was being read: ${sourcePath}.`);
    }
    const bytes = await handle.readFile();
    return { sourcePath, sourceStat: openedStat, bytes };
  } catch (error) {
    if (error instanceof BlogMetaError) throw error;
    throw new BlogMetaError(`Could not read ${sourcePath}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  } finally {
    await handle?.close();
  }
}

function inferCollection(root, sourcePath, requestedCollection) {
  const relative = path.relative(root, sourcePath);
  const segments = relative.split(path.sep);
  const sourceCollection = collections.includes(segments[0]) ? segments[0] : undefined;
  return {
    collection: assertCollection(requestedCollection ?? sourceCollection ?? 'posts'),
    sourceCollection,
    sourceRelative: sourceCollection === undefined ? undefined : relative
  };
}

function validateSourceRelative(sourceRelative, owner) {
  if (sourceRelative === undefined) return undefined;
  const segments = validateRelativeSegments(sourceRelative.replaceAll(path.sep, '/'), owner);
  const filename = segments.at(-1);
  if (filename === undefined || !filename.toLowerCase().endsWith('.md')) throw new BlogMetaError(`${owner} must end in .md.`);
  return segments;
}

function destinationSlug(metadata, sourcePath, collection) {
  if (typeof metadata.slug === 'string' && metadata.slug.length > 0) return metadata.slug;
  if (collection === 'pages') throw new BlogMetaError('Pages require a safe slug before saving.');
  return safeSlugFromStem(fileStem(sourcePath));
}

function resolveContainedOutput(root, outputArgument) {
  validateOutputArgument(outputArgument);
  const target = path.isAbsolute(outputArgument)
    ? path.resolve(outputArgument)
    : path.resolve(root, outputArgument);
  if (!isContained(root, target)) throw new BlogMetaError(`Save-as output must stay inside the blog root: ${target}.`);
  const relative = path.relative(root, target).replaceAll(path.sep, '/');
  const segments = validateRelativeSegments(relative, '--output');
  const filename = segments.at(-1);
  if (filename === undefined || !filename.toLowerCase().endsWith('.md')) throw new BlogMetaError('--output must name a Markdown file ending in .md.');
  return target;
}

function categorySegments(category, collection) {
  if (category === undefined) return [];
  if (collection === 'pages') throw new UsageError('--category is only supported for posts.');
  return validateRelativeSegments(category, '--category');
}

function resolveDestination({ root, sourcePath, sourceInRoot, sourceRelative, sourceCollection, collection, metadata, options }) {
  if (options.writeBack && options.output !== undefined) {
    throw new UsageError('--write-back and --output are mutually exclusive.');
  }
  if (options.writeBack) return sourcePath;
  if (options.output !== undefined) return resolveContainedOutput(root, options.output);

  const explicitCategory = options.category !== undefined;
  const categories = categorySegments(options.category, collection);
  if (sourceInRoot) {
    const safeSourceSegments = sourceRelative === undefined
      ? validateRelativeSegments(path.relative(root, sourcePath).replaceAll(path.sep, '/'), 'Source path')
      : validateSourceRelative(sourceRelative, 'Source path');
    if (!explicitCategory && sourceCollection === collection) {
      return path.join(root, ...safeSourceSegments);
    }
    const filename = safeSourceSegments.at(-1);
    if (filename === undefined) throw new BlogMetaError(`Cannot infer a destination filename from ${sourcePath}.`);
    return path.join(root, collection, ...categories, filename);
  }

  const slug = destinationSlug(metadata, sourcePath, collection);
  return path.join(root, collection, ...categories, `${slug}.md`);
}

async function assertNoSymlinkComponents(root, target, owner) {
  if (!isContained(root, target)) throw new BlogMetaError(`${owner} must stay inside the blog root.`);
  const relative = path.relative(root, target);
  let current = root;
  for (const segment of relative.split(path.sep)) {
    const currentStat = await lstat(current).catch(() => null);
    if (currentStat?.isSymbolicLink()) throw new BlogMetaError(`${owner} cannot traverse a symbolic link: ${current}.`);
    if (currentStat !== null && !currentStat.isDirectory()) throw new BlogMetaError(`${owner} parent is not a directory: ${current}.`);
    if (currentStat === null) break;
    current = path.join(current, segment);
  }
}

async function inspectTarget(target, owner) {
  const targetStat = await lstat(target).catch(() => null);
  if (targetStat?.isSymbolicLink()) throw new BlogMetaError(`${owner} cannot replace a symbolic link: ${target}.`);
  if (targetStat !== null && !targetStat.isFile()) throw new BlogMetaError(`${owner} is not a regular file: ${target}.`);
  return targetStat;
}

function sameFile(left, right) {
  return left !== null && right !== null && left.dev === right.dev && left.ino === right.ino;
}

async function readTargetBytes(target, owner) {
  let handle;
  try {
    handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
    const targetStat = await handle.stat();
    if (!targetStat.isFile()) throw new BlogMetaError(`${owner} is not a regular file: ${target}.`);
    return { targetStat, bytes: await handle.readFile() };
  } catch (error) {
    if (error instanceof BlogMetaError) throw error;
    throw new BlogMetaError(`${owner} could not be read: ${target}.`, { cause: error });
  } finally {
    await handle?.close();
  }
}

async function assertExpectedSource(target, expectedSource, expectedBytes, owner) {
  const targetStat = await inspectTarget(target, owner);
  if (!sameFile(targetStat, expectedSource)) {
    throw new BlogMetaError('Source changed while it was being organized; no file was written.');
  }
  const current = await readTargetBytes(target, owner);
  if (!sameFile(current.targetStat, expectedSource) || !Buffer.isBuffer(expectedBytes) || !current.bytes.equals(expectedBytes)) {
    throw new BlogMetaError('Source changed while it was being organized; no file was written.');
  }
}

async function ensureContainedParent(root, target, owner, create) {
  const parent = path.dirname(target);
  if (!isContained(root, target)) throw new BlogMetaError(`${owner} must stay inside the blog root.`);
  await assertNoSymlinkComponents(root, target, owner);
  if (create) await mkdir(parent, { recursive: true });
  await assertNoSymlinkComponents(root, target, owner);
  const parentReal = await realpath(parent).catch((error) => {
    throw new BlogMetaError(`${owner} parent could not be resolved: ${parent}.`, { cause: error });
  });
  if (parentReal !== parent || !isContained(root, path.join(parentReal, path.basename(target)))) {
    throw new BlogMetaError(`${owner} parent escapes the blog root: ${parent}.`);
  }
  return parent;
}

async function writeAtomically(target, bytes, { overwrite, mode, expectedSource, expectedBytes, root }) {
  const owner = expectedSource === undefined ? 'Save-as output' : 'Write-back source';
  const parent = expectedSource === undefined
    ? await ensureContainedParent(root, target, owner, true)
    : path.dirname(target);
  if (expectedSource !== undefined) {
    const parentReal = await realpath(parent).catch((error) => {
      throw new BlogMetaError(`Write-back parent could not be resolved: ${parent}.`, { cause: error });
    });
    if (parentReal !== parent) throw new BlogMetaError(`Write-back source path traverses a symbolic link: ${target}.`);
  }

  const current = await inspectTarget(target, owner);
  if (expectedSource !== undefined) await assertExpectedSource(target, expectedSource, expectedBytes, owner);
  if (expectedSource === undefined && current !== null && !overwrite) {
    throw new BlogMetaError(`Save-as target already exists: ${target}. Use --overwrite to replace it.`);
  }

  const temporary = path.join(parent, `.${path.basename(target)}.${process.pid}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, mode ?? 0o644);
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = undefined;

    const latest = await inspectTarget(target, owner);
    if (expectedSource !== undefined) await assertExpectedSource(target, expectedSource, expectedBytes, owner);
    if (expectedSource === undefined && latest !== null && !overwrite) {
      throw new BlogMetaError(`Save-as target already exists: ${target}. Use --overwrite to replace it.`);
    }
    if (overwrite || expectedSource !== undefined) {
      await rename(temporary, target);
    } else {
      try {
        await link(temporary, target);
      } catch (error) {
        if (error?.code === 'EEXIST') throw new BlogMetaError(`Save-as target already exists: ${target}. Use --overwrite to replace it.`);
        throw error;
      }
      await rm(temporary, { force: true });
    }
    if (mode !== undefined) await chmod(target, mode);
  } catch (error) {
    if (handle !== undefined) await handle.close().catch(() => {});
    await rm(temporary, { force: true });
    if (error instanceof BlogMetaError) throw error;
    throw new BlogMetaError(`Could not write ${target}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
}

function renderDocument(metadata, bom, body) {
  const yamlText = YAML.stringify(metadata, {
    lineWidth: 0,
    sortMapEntries: false
  });
  return Buffer.concat([
    bom,
    Buffer.from(`---\n${yamlText}---\n`, 'utf8'),
    body
  ]);
}

export async function organizeDocument({ sourcePath, root, collection, options, now = new Date() }) {
  const source = await requireSource(sourcePath, process.cwd());
  const sourceInRoot = isContained(root, source.sourcePath);
  const sourceRelative = sourceInRoot
    ? path.relative(root, source.sourcePath).replaceAll(path.sep, '/')
    : undefined;
  const sourceInfo = inferCollection(root, source.sourcePath, collection);
  if (sourceInRoot && sourceInfo.sourceCollection !== undefined) validateSourceRelative(sourceRelative, 'Source path');
  validateDateInput(options.date, '--date');
  validateDateInput(options.updated, '--updated');
  const frontMatter = parseFrontMatter(source.bytes, source.sourcePath);
  const inferred = inferMetadata(
    source.sourcePath,
    frontMatter.body,
    frontMatter.metadata,
    sourceInfo.collection,
    options,
    now.toISOString().slice(0, 10)
  );
  const metadata = validateMetadata(inferred.metadata, sourceInfo.collection, source.sourcePath);
  const destination = resolveDestination({
    root,
    sourcePath: source.sourcePath,
    sourceInRoot,
    sourceRelative,
    sourceCollection: sourceInfo.sourceCollection,
    collection: sourceInfo.collection,
    metadata,
    options
  });
  if (!options.writeBack) {
    const targetStat = await inspectTarget(destination, 'Save-as output');
    if (destination === source.sourcePath || sameFile(targetStat, source.sourceStat)) {
      throw new BlogMetaError('Save-as destination is the source. Use --write-back or choose a different --output path.');
    }
    if (targetStat !== null && !options.overwrite && !options.preview) {
      throw new BlogMetaError(`Save-as target already exists: ${destination}. Use --overwrite to replace it.`);
    }
    await assertNoSymlinkComponents(root, destination, 'Save-as output');
  }
  const output = renderDocument(metadata, frontMatter.bom, frontMatter.body);
  return Object.freeze({
    sourcePath: source.sourcePath,
    destination,
    collection: sourceInfo.collection,
    metadata: Object.freeze(metadata),
    output,
    sourceBytes: source.bytes,
    sourceStat: source.sourceStat,
    writeBack: options.writeBack,
    preview: options.preview
  });
}

export async function main(arguments_, io = {}) {
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const cwd = io.cwd ?? process.cwd();
  const env = io.env ?? process.env;
  try {
    const options = parseArguments(arguments_);
    if (options.help) {
      stdout.write(`${usage()}\n`);
      return 0;
    }
    if (options.positional === undefined) throw new UsageError('A Markdown source path is required.');
    if (options.writeBack && options.output !== undefined) throw new UsageError('--write-back and --output are mutually exclusive.');
    const requestedRoot = options.blogRoot ?? env.FIREFLY_CONTENT_ROOT ?? defaultBlogRoot;
    const root = await requireBlogRoot(requestedRoot, cwd);
    const sourceArgument = path.resolve(cwd, options.positional);
    const preliminarySource = await requireSource(sourceArgument, cwd);
    const sourceInfo = inferCollection(root, preliminarySource.sourcePath, options.collection);
    const preparedOptions = Object.freeze({ ...options, collection: sourceInfo.collection });
    const organized = await organizeDocument({
      sourcePath: preliminarySource.sourcePath,
      root,
      collection: options.collection,
      options: preparedOptions,
      now: new Date()
    });

    if (options.preview) {
      stdout.write(`Preview: ${organized.destination}\n`);
      stdout.write(organized.output);
      if (organized.output.at(-1) !== 0x0a) stdout.write('\n');
      return 0;
    }

    if (options.writeBack) {
      await writeAtomically(organized.destination, organized.output, {
        overwrite: true,
        mode: organized.sourceStat.mode & 0o777,
        expectedSource: organized.sourceStat,
        expectedBytes: organized.sourceBytes,
        root
      });
    } else {
      await writeAtomically(organized.destination, organized.output, {
        overwrite: options.overwrite,
        mode: organized.sourceStat.mode & 0o777,
        root
      });
    }
    stdout.write(`Wrote ${organized.destination}\n`);
    return 0;
  } catch (error) {
    const status = typeof error?.exitCode === 'number' ? error.exitCode : 1;
    stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    if (status === 2) stderr.write(`${usage()}\n`);
    return status;
  }
}

const invokedPath = process.argv[1] === undefined ? undefined : pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedPath !== undefined && import.meta.url === invokedPath) {
  main(process.argv.slice(2)).then((status) => {
    process.exitCode = status;
  });
}
