import { randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { parse as parseToml } from 'smol-toml';

import { isCanonicalCommentsPostRoute } from '../../../plugins/comments/config.mjs';

const SCHEMA_VERSION = 1;
const SAFE_ROUTE_ASCII_CHARACTER = /^[A-Za-z0-9._~-]$/u;
const META_ATTRIBUTE = /\b([A-Za-z_:][A-Za-z0-9:._-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gu;
const META_TAG = /<meta\b[^>]*>/giu;

const FAILURE_MESSAGES = Object.freeze({
  invalidArguments: 'invalid command arguments',
  invalidReleaseTree: 'release tree is unavailable or contains an unsafe entry',
  invalidRoutes: 'release or configured route inventory contains invalid or duplicate routes',
  invalidConfigFile: 'comments configuration is unavailable or is not a regular file',
  invalidConfig: 'comments configuration is not valid TOML',
  invalidConfiguredRoutes: 'comments configuration does not contain a valid runtime post route list',
  routeMismatch: 'configured and emitted post routes do not match',
  invalidOutput: 'route catalog output could not be written safely'
});

class RouteCatalogFailure extends Error {
  constructor(code, exitCode = 1) {
    super(code);
    this.name = 'RouteCatalogFailure';
    this.code = code;
    this.exitCode = exitCode;
  }
}

function failure(code, exitCode = 1) {
  throw new RouteCatalogFailure(code, exitCode);
}

function createState() {
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

function summaryFor(state, status) {
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

function parseArguments(argumentsList) {
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

  if (values.release === null || values.config === null) {
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

function readMetaAttributes(tag) {
  const attributes = new Map();
  for (const match of tag.matchAll(META_ATTRIBUTE)) {
    const name = match[1]?.toLowerCase();
    const value = match[2] ?? match[3] ?? match[4];
    if (name !== undefined && value !== undefined && !attributes.has(name)) {
      attributes.set(name, value);
    }
  }
  return attributes;
}

function isArticleDocument(contents) {
  for (const match of contents.matchAll(META_TAG)) {
    const attributes = readMetaAttributes(match[0] ?? '');
    if (attributes.get('property') === 'og:type' && attributes.get('content') === 'article') {
      return true;
    }
  }
  return false;
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

async function inspectRelease(releaseRoot, state) {
  const rootStats = await statOrFail(releaseRoot, 'invalidReleaseTree');
  if (rootStats.isSymbolicLink() || !rootStats.isDirectory()) {
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
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function inspectConfiguredRoutes(configPath, state) {
  const configStats = await statOrFail(configPath, 'invalidConfigFile');
  if (configStats.isSymbolicLink() || !configStats.isFile()) {
    failure('invalidConfigFile');
  }

  let parsed;
  try {
    parsed = parseToml(await readFile(configPath, 'utf8'));
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
}

function compareRoutes(state) {
  for (const route of state.staticRoutes) {
    if (!state.configuredRoutes.has(route)) state.missingRoutes += 1;
  }
  for (const route of state.configuredRoutes) {
    if (!state.staticRoutes.has(route)) state.staleRoutes += 1;
  }

  if (
    state.invalidStaticRoutes > 0 ||
    state.invalidConfiguredRoutes > 0 ||
    state.duplicateStaticRoutes > 0 ||
    state.duplicateConfiguredRoutes > 0 ||
    state.missingRoutes > 0 ||
    state.staleRoutes > 0
  ) {
    if (
      state.invalidStaticRoutes > 0 ||
      state.invalidConfiguredRoutes > 0 ||
      state.duplicateStaticRoutes > 0 ||
      state.duplicateConfiguredRoutes > 0
    ) {
      failure('invalidRoutes');
    }
    failure('routeMismatch');
  }
}

async function writeCatalog(outputPath, routes) {
  const target = path.resolve(outputPath);
  const parent = path.dirname(target);
  let parentStats = await lstat(parent).catch(() => null);
  if (parentStats?.isSymbolicLink() || (parentStats !== null && !parentStats.isDirectory())) {
    failure('invalidOutput');
  }
  try {
    if (parentStats === null) {
      await mkdir(parent, { recursive: true });
      parentStats = await lstat(parent);
      if (parentStats.isSymbolicLink() || !parentStats.isDirectory()) failure('invalidOutput');
    }
  } catch (error) {
    if (error instanceof RouteCatalogFailure) throw error;
    failure('invalidOutput');
  }

  const existing = await lstat(target).catch(() => null);
  if (existing?.isSymbolicLink() || (existing !== null && !existing.isFile())) {
    failure('invalidOutput');
  }

  const temporary = path.join(parent, `.${path.basename(target)}.${process.pid}.${randomUUID()}.tmp`);
  const contents = `${JSON.stringify({ schemaVersion: SCHEMA_VERSION, routes: [...routes].sort() }, null, 2)}\n`;
  try {
    await writeFile(temporary, contents, { encoding: 'utf8', flag: 'wx', mode: 0o644 });
    await rename(temporary, target);
  } catch {
    await rm(temporary, { force: true }).catch(() => {});
    failure('invalidOutput');
  }
}

async function main() {
  const state = createState();
  let failureCode = null;
  let exitCode = 1;
  try {
    const argumentsValue = parseArguments(process.argv.slice(2));
    await inspectRelease(path.resolve(argumentsValue.release), state);
    await inspectConfiguredRoutes(path.resolve(argumentsValue.config), state);
    compareRoutes(state);
    if (argumentsValue.output !== null) {
      await writeCatalog(argumentsValue.output, state.staticRoutes);
    }
    process.stdout.write(`${JSON.stringify(summaryFor(state, 'pass'))}\n`);
    return;
  } catch (error) {
    if (error instanceof RouteCatalogFailure) {
      failureCode = error.code;
      exitCode = error.exitCode;
    } else {
      failureCode = 'invalidReleaseTree';
    }
  }

  process.stdout.write(`${JSON.stringify(summaryFor(state, 'fail'))}\n`);
  const message = FAILURE_MESSAGES[failureCode] ?? 'validation failed';
  process.stderr.write(`route catalog validation failed: ${message}.\n`);
  process.exitCode = exitCode;
}

await main();
