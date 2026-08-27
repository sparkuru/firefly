import { randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';

import { isCanonicalCommentsPostRoute } from '../../../plugins/comments/config.mjs';

export const SCHEMA_VERSION = 1;

const SAFE_ROUTE_ASCII_CHARACTER = /^[A-Za-z0-9._~-]$/u;
const HTML_TAG_NAME_START = /^[A-Za-z]$/u;
const HTML_TAG_NAME_CHARACTER = /^[A-Za-z0-9:-]$/u;
const HTML_ATTRIBUTE_NAME_START = /^[A-Za-z_:]$/u;
const HTML_ATTRIBUTE_NAME_CHARACTER = /^[A-Za-z0-9:._-]$/u;
const RAW_HEAD_ELEMENTS = new Set(['noscript', 'script', 'style', 'template', 'textarea', 'title']);

export const FAILURE_MESSAGES = Object.freeze({
  invalidArguments: 'invalid command arguments',
  invalidReleaseTree: 'release tree is unavailable or contains an unsafe entry',
  invalidRoutes: 'release or configured route inventory contains invalid or duplicate routes',
  invalidConfigFile: 'comments configuration is unavailable or is not a regular file',
  invalidConfig: 'comments configuration is not valid TOML',
  invalidConfiguredRoutes: 'comments configuration does not contain a valid runtime post route list',
  routeMismatch: 'configured and emitted post routes do not match',
  invalidOutput: 'route catalog output could not be written safely',
  invalidCandidate: 'candidate comments configuration could not be generated safely'
});

export class RouteCatalogFailure extends Error {
  constructor(code, exitCode = 1) {
    super(code);
    this.name = 'RouteCatalogFailure';
    this.code = code;
    this.exitCode = exitCode;
  }
}

export function failure(code, exitCode = 1) {
  throw new RouteCatalogFailure(code, exitCode);
}

export function createState() {
  return {
    articleDocuments: 0,
    staticRoutes: new Set(),
    configuredEntries: 0,
    configuredRoutes: new Set(),
    invalidStaticRoutes: 0,
    invalidConfiguredRoutes: 0,
    duplicateStaticRoutes: 0,
    duplicateConfiguredRoutes: 0,
    missingRoutes: 0,
    staleRoutes: 0
  };
}

export function summaryFor(state, status) {
  return {
    status,
    articleDocumentCount: state.articleDocuments,
    staticRouteCount: state.staticRoutes.size,
    configuredRouteCount: state.configuredEntries,
    missingRouteCount: state.missingRoutes,
    staleRouteCount: state.staleRoutes,
    invalidRouteCount: state.invalidStaticRoutes + state.invalidConfiguredRoutes,
    duplicateRouteCount: state.duplicateStaticRoutes + state.duplicateConfiguredRoutes
  };
}

export function parseArguments(argumentsList, { requireOutput = false } = {}) {
  const values = { release: null, config: null, output: null };
  const optionNames = new Set(['--release', '--config', '--output']);

  for (let index = 0; index < argumentsList.length; index += 1) {
    const option = argumentsList[index];
    const value = argumentsList[index + 1];
    if (!optionNames.has(option) || value === undefined || value.length === 0 || value.startsWith('--')) {
      failure('invalidArguments', 2);
    }
    const key = option.slice(2);
    if (values[key] !== null) {
      failure('invalidArguments', 2);
    }
    values[key] = value;
    index += 1;
  }

  if (values.release === null || values.config === null || (requireOutput && values.output === null)) {
    failure('invalidArguments', 2);
  }
  return values;
}

async function statOrFail(filePath, code) {
  try {
    return await lstat(filePath);
  } catch {
    failure(code);
  }
}

function isHtmlWhitespace(character) {
  return character === ' ' || character === '\t' || character === '\n' || character === '\f' || character === '\r';
}

function findTagEnd(contents, start) {
  let quote = null;
  for (let index = start + 1; index < contents.length; index += 1) {
    const character = contents[index];
    if (quote !== null) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '>') return index;
  }
  return -1;
}

function parseTagAt(contents, start) {
  if (contents[start] !== '<') return null;
  if (contents.startsWith('<!--', start)) {
    const commentEnd = contents.indexOf('-->', start + 4);
    return commentEnd === -1
      ? { kind: 'invalid', end: contents.length }
      : { kind: 'comment', end: commentEnd + 3 };
  }
  if (contents[start + 1] === '!' || contents[start + 1] === '?') {
    const tagEnd = findTagEnd(contents, start);
    return tagEnd === -1 ? { kind: 'invalid', end: contents.length } : { kind: 'other', end: tagEnd + 1 };
  }

  let cursor = start + 1;
  let kind = 'start';
  if (contents[cursor] === '/') {
    kind = 'end';
    cursor += 1;
  }
  const nameStart = cursor;
  if (!HTML_TAG_NAME_START.test(contents[cursor] ?? '')) return null;
  cursor += 1;
  while (cursor < contents.length && HTML_TAG_NAME_CHARACTER.test(contents[cursor] ?? '')) cursor += 1;
  const boundary = contents[cursor];
  if (boundary !== undefined && !isHtmlWhitespace(boundary) && boundary !== '/' && boundary !== '>') {
    return { kind: 'invalid', end: contents.length };
  }
  const tagEnd = findTagEnd(contents, start);
  if (tagEnd === -1) return { kind: 'invalid', end: contents.length };
  return {
    kind,
    name: contents.slice(nameStart, cursor).toLowerCase(),
    nameEnd: cursor,
    end: tagEnd + 1
  };
}

function findNextTag(contents, offset) {
  let start = contents.indexOf('<', offset);
  while (start !== -1) {
    const token = parseTagAt(contents, start);
    if (token !== null) return token;
    start = contents.indexOf('<', start + 1);
  }
  return null;
}

function readMetaAttributes(contents, token) {
  if (token.kind !== 'start' || token.name !== 'meta') return null;
  const attributes = new Map();
  const end = token.end - 1;
  let cursor = token.nameEnd;
  while (cursor < end) {
    while (cursor < end && isHtmlWhitespace(contents[cursor])) cursor += 1;
    if (cursor >= end) break;
    if (contents[cursor] === '/') {
      cursor += 1;
      while (cursor < end && isHtmlWhitespace(contents[cursor])) cursor += 1;
      if (cursor !== end) return null;
      break;
    }

    const nameStart = cursor;
    if (!HTML_ATTRIBUTE_NAME_START.test(contents[cursor] ?? '')) return null;
    cursor += 1;
    while (cursor < end && HTML_ATTRIBUTE_NAME_CHARACTER.test(contents[cursor] ?? '')) cursor += 1;
    const name = contents.slice(nameStart, cursor).toLowerCase();
    while (cursor < end && isHtmlWhitespace(contents[cursor])) cursor += 1;

    let value = null;
    if (contents[cursor] === '=') {
      cursor += 1;
      while (cursor < end && isHtmlWhitespace(contents[cursor])) cursor += 1;
      const quote = contents[cursor];
      if (quote === '"' || quote === "'") {
        cursor += 1;
        const valueStart = cursor;
        while (cursor < end && contents[cursor] !== quote) cursor += 1;
        if (cursor >= end) return null;
        value = contents.slice(valueStart, cursor);
        cursor += 1;
      } else {
        const valueStart = cursor;
        while (cursor < end && !isHtmlWhitespace(contents[cursor])) {
          if ('"\'=<>`'.includes(contents[cursor] ?? '')) return null;
          cursor += 1;
        }
        if (valueStart === cursor) return null;
        value = contents.slice(valueStart, cursor);
      }
    }
    if (!attributes.has(name)) attributes.set(name, value);
  }
  return attributes;
}

function skipRawHeadElement(contents, token) {
  let cursor = token.end;
  while (cursor < contents.length) {
    const closingStart = contents.indexOf('</', cursor);
    if (closingStart === -1) return null;
    const closing = parseTagAt(contents, closingStart);
    if (closing?.kind === 'end' && closing.name === token.name) return closing.end;
    cursor = closing?.end ?? closingStart + 2;
  }
  return null;
}

function findHeadStart(contents) {
  let cursor = 0;
  while (cursor < contents.length) {
    const token = findNextTag(contents, cursor);
    if (token === null || token.kind === 'invalid') return null;
    if (token.kind === 'start') {
      if (RAW_HEAD_ELEMENTS.has(token.name)) {
        const afterRawElement = skipRawHeadElement(contents, token);
        if (afterRawElement === null) return null;
        cursor = afterRawElement;
        continue;
      }
      if (token.name === 'head') return token.end;
    }
    cursor = token.end;
  }
  return null;
}

function isArticleDocument(contents) {
  const headStart = findHeadStart(contents);
  if (headStart === null) return false;

  let cursor = headStart;
  while (cursor < contents.length) {
    const token = findNextTag(contents, cursor);
    if (token === null || token.kind === 'invalid') return false;
    if (token.kind === 'end' && token.name === 'head') return false;
    if (token.kind === 'start') {
      if (RAW_HEAD_ELEMENTS.has(token.name)) {
        const afterRawElement = skipRawHeadElement(contents, token);
        if (afterRawElement === null) return false;
        cursor = afterRawElement;
        continue;
      }
      const attributes = readMetaAttributes(contents, token);
      if (attributes?.get('property') === 'og:type' && attributes.get('content') === 'article') return true;
    }
    cursor = token.end;
  }
  return false;
}

function isContained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export async function assertSafeExistingPathComponents(targetPath, code) {
  const absoluteTarget = path.resolve(targetPath);
  const root = path.parse(absoluteTarget).root;
  const relative = path.relative(root, absoluteTarget);
  let current = root;
  for (const segment of relative.split(path.sep).filter((value) => value.length > 0)) {
    current = path.join(current, segment);
    let stats;
    try {
      stats = await lstat(current);
    } catch (error) {
      if (error?.code === 'ENOENT') return;
      failure(code);
    }
    if (stats.isSymbolicLink() || !stats.isDirectory()) failure(code);
  }
}

function encodeRouteSegment(segment) {
  let encoded = '';
  for (const byte of Buffer.from(segment, 'utf8')) {
    const character = String.fromCharCode(byte);
    if (byte < 0x80 && SAFE_ROUTE_ASCII_CHARACTER.test(character)) {
      encoded += character;
    } else {
      encoded += `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
    }
  }
  return encoded;
}

function derivePostRoute(directorySegments) {
  const route = `/posts/${directorySegments.map(encodeRouteSegment).join('/')}/`;
  return isCanonicalCommentsPostRoute(route) ? route : null;
}

export async function inspectRelease(releaseRoot, state) {
  await assertSafeExistingPathComponents(releaseRoot, 'invalidReleaseTree');
  const rootStats = await statOrFail(releaseRoot, 'invalidReleaseTree');
  if (rootStats.isSymbolicLink() || !rootStats.isDirectory()) {
    failure('invalidReleaseTree');
  }
  let resolvedRoot;
  try {
    resolvedRoot = await realpath(releaseRoot);
  } catch {
    failure('invalidReleaseTree');
  }

  async function walk(current, segments) {
    let entries;
    try {
      entries = await readdir(current);
    } catch {
      failure('invalidReleaseTree');
    }
    entries.sort((left, right) => left.localeCompare(right));

    for (const entry of entries) {
      const child = path.join(current, entry);
      const childStats = await statOrFail(child, 'invalidReleaseTree');
      if (childStats.isSymbolicLink()) {
        failure('invalidReleaseTree');
      }
      let resolvedChild;
      try {
        resolvedChild = await realpath(child);
      } catch {
        failure('invalidReleaseTree');
      }
      if (!isContained(resolvedRoot, resolvedChild)) {
        failure('invalidReleaseTree');
      }
      if (childStats.isDirectory()) {
        await walk(child, [...segments, entry]);
        continue;
      }
      if (!childStats.isFile()) {
        failure('invalidReleaseTree');
      }

      if (entry !== 'index.html' || segments[0] !== 'posts' || segments.length < 3) {
        continue;
      }

      let contents;
      try {
        contents = await readFile(child, 'utf8');
      } catch {
        failure('invalidReleaseTree');
      }
      if (!isArticleDocument(contents)) continue;

      state.articleDocuments += 1;
      const route = derivePostRoute(segments.slice(1));
      if (route === null) {
        state.invalidStaticRoutes += 1;
        continue;
      }
      if (state.staticRoutes.has(route)) {
        state.duplicateStaticRoutes += 1;
      } else {
        state.staticRoutes.add(route);
      }
    }
  }

  await walk(releaseRoot, []);
  return resolvedRoot;
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export async function inspectConfiguredRoutes(configPath, state) {
  await assertSafeExistingPathComponents(path.dirname(configPath), 'invalidConfigFile');
  const configStats = await statOrFail(configPath, 'invalidConfigFile');
  if (configStats.isSymbolicLink() || !configStats.isFile()) {
    failure('invalidConfigFile');
  }

  let source;
  try {
    source = await readFile(configPath, 'utf8');
  } catch {
    failure('invalidConfigFile');
  }

  let parsed;
  try {
    parsed = parseToml(source);
  } catch {
    failure('invalidConfig');
  }

  const runtime = isObject(parsed) ? parsed.runtime : undefined;
  const postRoutes = isObject(runtime) ? runtime.postRoutes : undefined;
  if (!Array.isArray(postRoutes)) {
    failure('invalidConfiguredRoutes');
  }

  state.configuredEntries = postRoutes.length;
  for (const route of postRoutes) {
    if (!isCanonicalCommentsPostRoute(route)) {
      state.invalidConfiguredRoutes += 1;
      continue;
    }
    if (state.configuredRoutes.has(route)) {
      state.duplicateConfiguredRoutes += 1;
    } else {
      state.configuredRoutes.add(route);
    }
  }

  let resolvedPath;
  try {
    resolvedPath = await realpath(configPath);
  } catch {
    failure('invalidConfigFile');
  }
  return { configStats, parsed, resolvedPath, source };
}

export async function inspectInputs({ releaseRoot, configPath, state = createState() }) {
  const resolvedReleasePath = path.resolve(releaseRoot);
  const resolvedConfigPath = path.resolve(configPath);
  const resolvedReleaseRoot = await inspectRelease(resolvedReleasePath, state);
  const config = await inspectConfiguredRoutes(resolvedConfigPath, state);
  return {
    config,
    configPath: resolvedConfigPath,
    releaseRoot: resolvedReleasePath,
    resolvedReleaseRoot,
    state
  };
}

export function calculateRouteDifferences(state) {
  for (const route of state.staticRoutes) {
    if (!state.configuredRoutes.has(route)) state.missingRoutes += 1;
  }
  for (const route of state.configuredRoutes) {
    if (!state.staticRoutes.has(route)) state.staleRoutes += 1;
  }
  return {
    missing: state.missingRoutes,
    stale: state.staleRoutes
  };
}

export function assertValidInventory(state, { requireExactMatch = false } = {}) {
  if (
    state.invalidStaticRoutes > 0 ||
    state.invalidConfiguredRoutes > 0 ||
    state.duplicateStaticRoutes > 0 ||
    state.duplicateConfiguredRoutes > 0
  ) {
    failure('invalidRoutes');
  }
  if (requireExactMatch && (state.missingRoutes > 0 || state.staleRoutes > 0)) {
    failure('routeMismatch');
  }
}

async function ensureOutputDoesNotReplaceInput(outputPath, inputPath, inputStats) {
  const target = path.resolve(outputPath);
  if (target === path.resolve(inputPath)) failure('invalidOutput');

  const targetStats = await lstat(target).catch(() => null);
  if (targetStats === null) return;
  if (targetStats.isSymbolicLink() || !targetStats.isFile()) failure('invalidOutput');
  if (targetStats.dev === inputStats.dev && targetStats.ino === inputStats.ino) failure('invalidOutput');

  let targetRealPath;
  let inputRealPath;
  try {
    [targetRealPath, inputRealPath] = await Promise.all([realpath(target), realpath(inputPath)]);
  } catch {
    failure('invalidOutput');
  }
  if (targetRealPath === inputRealPath) failure('invalidOutput');
}

async function writeAtomicFile(outputPath, contents, { mode, code }) {
  const target = path.resolve(outputPath);
  const parent = path.dirname(target);
  await assertSafeExistingPathComponents(parent, code);
  let parentStats = await lstat(parent).catch(() => null);
  if (parentStats?.isSymbolicLink() || (parentStats !== null && !parentStats.isDirectory())) {
    failure(code);
  }
  try {
    if (parentStats === null) {
      await mkdir(parent, { recursive: true });
      await assertSafeExistingPathComponents(parent, code);
      parentStats = await lstat(parent);
      if (parentStats.isSymbolicLink() || !parentStats.isDirectory()) failure(code);
    }
  } catch (error) {
    if (error instanceof RouteCatalogFailure) throw error;
    failure(code);
  }

  const existing = await lstat(target).catch(() => null);
  if (existing?.isSymbolicLink() || (existing !== null && !existing.isFile())) {
    failure(code);
  }

  const temporary = path.join(parent, `.${path.basename(target)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, contents, { encoding: 'utf8', flag: 'wx', mode });
    await rename(temporary, target);
  } catch {
    await rm(temporary, { force: true }).catch(() => {});
    failure(code);
  }
}

export async function writeCatalog(outputPath, routes, { inputPath, inputStats, forbiddenRoot } = {}) {
  const target = path.resolve(outputPath);
  if (forbiddenRoot !== undefined && isContained(path.resolve(forbiddenRoot), target)) failure('invalidOutput');
  if (inputPath !== undefined && inputStats !== undefined) {
    await ensureOutputDoesNotReplaceInput(target, inputPath, inputStats);
  }
  const contents = `${JSON.stringify({ schemaVersion: SCHEMA_VERSION, routes: [...routes].sort() }, null, 2)}\n`;
  await writeAtomicFile(target, contents, { mode: 0o644, code: 'invalidOutput' });
}

function validateCandidateSource(source, routes) {
  let parsed;
  try {
    parsed = parseToml(source);
  } catch {
    failure('invalidCandidate');
  }
  const runtime = isObject(parsed) ? parsed.runtime : undefined;
  const candidateRoutes = isObject(runtime) ? runtime.postRoutes : undefined;
  const expectedRoutes = [...routes].sort();
  if (
    !Array.isArray(candidateRoutes) ||
    candidateRoutes.length !== expectedRoutes.length ||
    candidateRoutes.some((route, index) => route !== expectedRoutes[index] || !isCanonicalCommentsPostRoute(route))
  ) {
    failure('invalidCandidate');
  }
}

export async function writeCandidateConfig({ outputPath, configPath, configStats, releaseRoot, parsed, routes }) {
  const target = path.resolve(outputPath);
  if (isContained(path.resolve(releaseRoot), target)) failure('invalidOutput');
  await ensureOutputDoesNotReplaceInput(target, configPath, configStats);

  let source;
  try {
    if (!isObject(parsed.runtime)) failure('invalidCandidate');
    parsed.runtime.postRoutes = [...routes].sort();
    source = stringifyToml(parsed);
    if (!source.endsWith('\n')) source += '\n';
  } catch (error) {
    if (error instanceof RouteCatalogFailure) throw error;
    failure('invalidCandidate');
  }
  validateCandidateSource(source, routes);
  await writeAtomicFile(target, source, { mode: 0o600, code: 'invalidOutput' });
}

export async function reconcileRouteCatalog({ releaseRoot, configPath, outputPath, state = createState() }) {
  const inputs = await inspectInputs({ releaseRoot, configPath, state });
  calculateRouteDifferences(state);
  assertValidInventory(state);
  await writeCandidateConfig({
    configPath: inputs.configPath,
    configStats: inputs.config.configStats,
    outputPath,
    parsed: inputs.config.parsed,
    releaseRoot: inputs.resolvedReleaseRoot,
    routes: state.staticRoutes
  });
  return { inputs, state };
}
