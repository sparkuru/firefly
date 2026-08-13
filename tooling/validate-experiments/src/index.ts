import { readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';

export interface ExperimentBuild {
  readonly tool?: string;
  readonly command: string;
  readonly outputDir: string;
}

export interface ExperimentEntry {
  readonly id: string;
  readonly title: string;
  readonly path: `/${string}`;
  readonly role: string;
}

export interface ExperimentManifest {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly title: string;
  readonly kind: string;
  readonly visibility: 'listed' | 'unlisted';
  readonly mountPath: `/lab/${string}`;
  readonly entryPath: `/${string}`;
  readonly build: ExperimentBuild;
  readonly entries: readonly ExperimentEntry[];
  readonly licenseFile?: string;
  readonly tags: readonly string[];
  readonly directory: string;
  readonly manifestPath: string;
}

export interface PublicExperiment {
  readonly id: string;
  readonly title: string;
  readonly kind: string;
  readonly href: string;
  readonly entryHref: string;
  readonly tags: readonly string[];
}

export interface ExperimentDiscovery {
  readonly manifests: readonly ExperimentManifest[];
  readonly catalog: readonly PublicExperiment[];
}

const TOP_LEVEL_FIELDS = new Set([
  'schemaVersion',
  'id',
  'title',
  'kind',
  'visibility',
  'mountPath',
  'entryPath',
  'build',
  'entries',
  'licenseFile',
  'tags'
]);
const BUILD_FIELDS = new Set(['tool', 'command', 'outputDir']);
const ENTRY_FIELDS = new Set(['id', 'title', 'path', 'role']);
const TOKEN_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const ENCODED_SEPARATOR_PATTERN = /%(?:2f|5c)/iu;

function contained(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function fail(owner: string, field: string, message: string): never {
  throw new TypeError(`${owner}: ${field} ${message}`);
}

function dataDescriptors(value: object, owner: string): ReadonlyMap<PropertyKey, PropertyDescriptor> {
  const result = new Map<PropertyKey, PropertyDescriptor>();
  for (const key of Reflect.ownKeys(Object.getOwnPropertyDescriptors(value))) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !('value' in descriptor)) {
      fail(owner, String(key), 'must be a data property.');
    }
    result.set(key, descriptor);
  }
  return result;
}

function plainObject(value: unknown, owner: string): ReadonlyMap<PropertyKey, PropertyDescriptor> {
  if (
    typeof value !== 'object' ||
    value === null ||
    (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
  ) {
    fail(owner, 'value', 'must be a plain object.');
  }
  return dataDescriptors(value, owner);
}

function exactFields(
  descriptors: ReadonlyMap<PropertyKey, PropertyDescriptor>,
  allowed: ReadonlySet<string>,
  required: readonly string[],
  owner: string
): void {
  for (const key of descriptors.keys()) {
    if (typeof key !== 'string' || !allowed.has(key)) {
      fail(owner, String(key), 'is unknown.');
    }
  }
  for (const key of required) {
    if (!descriptors.has(key)) {
      fail(owner, key, 'is required.');
    }
  }
}

function field(
  descriptors: ReadonlyMap<PropertyKey, PropertyDescriptor>,
  key: string,
  owner: string
): unknown {
  const descriptor = descriptors.get(key);
  if (descriptor === undefined || !('value' in descriptor)) {
    fail(owner, key, 'is required.');
  }
  return descriptor.value;
}

function safeText(value: unknown, owner: string, name: string): string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value !== value.trim() ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    fail(owner, name, 'must be non-empty trimmed control-free text.');
  }
  return value;
}

function token(value: unknown, owner: string, name: string): string {
  const result = safeText(value, owner, name);
  if (!TOKEN_PATTERN.test(result)) {
    fail(owner, name, 'must be a lowercase kebab-case token.');
  }
  return result;
}

function denseArray(value: unknown, owner: string, name: string): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    fail(owner, name, 'must be a plain array.');
  }
  const descriptors = dataDescriptors(value, `${owner}: ${name}`);
  const lengthValue = field(descriptors, 'length', `${owner}: ${name}`);
  if (typeof lengthValue !== 'number' || !Number.isSafeInteger(lengthValue) || lengthValue < 0) {
    fail(owner, name, 'has an invalid length.');
  }
  const values: unknown[] = [];
  const allowed = new Set(['length']);
  for (let index = 0; index < lengthValue; index += 1) {
    const key = String(index);
    allowed.add(key);
    if (!descriptors.has(key)) {
      fail(owner, name, 'must be dense.');
    }
    values.push(field(descriptors, key, `${owner}: ${name}`));
  }
  for (const key of descriptors.keys()) {
    if (typeof key !== 'string' || !allowed.has(key)) {
      fail(owner, name, 'contains an unexpected property.');
    }
  }
  return values;
}

function rejectUnsafePath(value: string, owner: string, name: string): void {
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    fail(owner, name, 'contains malformed percent encoding.');
  }
  if (
    value.includes('\\') ||
    value.includes('\0') ||
    value.includes('?') ||
    value.includes('#') ||
    value.includes('//') ||
    /^(?:[a-z][a-z0-9+.-]*:|[a-z]:)/iu.test(value) ||
    ENCODED_SEPARATOR_PATTERN.test(value) ||
    decoded.includes('\\')
  ) {
    fail(owner, name, 'contains an unsafe path form.');
  }
  if (
    decoded.includes('\0') ||
    decoded.includes('?') ||
    decoded.includes('#') ||
    decoded.includes('//') ||
    /^(?:[a-z][a-z0-9+.-]*:|[a-z]:)/iu.test(decoded) ||
    decoded.split('/').some((part) => part === '.' || part === '..')
  ) {
    fail(owner, name, 'contains an encoded unsafe path form.');
  }
}

function relativePath(value: unknown, owner: string, name: string): string {
  const result = safeText(value, owner, name);
  rejectUnsafePath(result, owner, name);
  if (
    result.startsWith('/') ||
    path.posix.normalize(result) !== result ||
    result.split('/').some((part) => part === '' || part === '.' || part === '..')
  ) {
    fail(owner, name, 'must be a normalized relative descendant path.');
  }
  return result;
}

function mountedPath(value: unknown, owner: string, name: string): `/${string}` {
  const result = safeText(value, owner, name);
  rejectUnsafePath(result, owner, name);
  if (
    !result.startsWith('/') ||
    result === '/' ||
    path.posix.normalize(result) !== result ||
    result.endsWith('/') ||
    result.slice(1).split('/').some((part) => part === '' || part === '.' || part === '..')
  ) {
    fail(owner, name, 'must be a normalized root-relative file path.');
  }
  return result as `/${string}`;
}

function decodeBuild(value: unknown, owner: string): ExperimentBuild {
  const descriptors = plainObject(value, `${owner}: build`);
  exactFields(descriptors, BUILD_FIELDS, ['command', 'outputDir'], `${owner}: build`);
  const toolValue = descriptors.has('tool') ? token(field(descriptors, 'tool', owner), owner, 'build.tool') : undefined;
  return Object.freeze({
    ...(toolValue === undefined ? {} : { tool: toolValue }),
    command: safeText(field(descriptors, 'command', owner), owner, 'build.command'),
    outputDir: relativePath(field(descriptors, 'outputDir', owner), owner, 'build.outputDir')
  });
}

function decodeEntry(value: unknown, owner: string, index: number): ExperimentEntry {
  const entryOwner = `${owner}: entries[${index}]`;
  const descriptors = plainObject(value, entryOwner);
  exactFields(descriptors, ENTRY_FIELDS, ['id', 'title', 'path', 'role'], entryOwner);
  return Object.freeze({
    id: token(field(descriptors, 'id', entryOwner), entryOwner, 'id'),
    title: safeText(field(descriptors, 'title', entryOwner), entryOwner, 'title'),
    path: mountedPath(field(descriptors, 'path', entryOwner), entryOwner, 'path'),
    role: token(field(descriptors, 'role', entryOwner), entryOwner, 'role')
  });
}

export function decodeExperimentManifest(
  value: unknown,
  options: { readonly directory: string; readonly manifestPath?: string }
): ExperimentManifest {
  const directory = path.resolve(options.directory);
  const manifestPath = path.resolve(options.manifestPath ?? path.join(directory, 'experiment.json'));
  const owner = manifestPath;
  const descriptors = plainObject(value, owner);
  exactFields(
    descriptors,
    TOP_LEVEL_FIELDS,
    ['schemaVersion', 'id', 'title', 'kind', 'visibility', 'mountPath', 'entryPath', 'build', 'entries'],
    owner
  );
  if (field(descriptors, 'schemaVersion', owner) !== 1) {
    fail(owner, 'schemaVersion', 'must equal 1.');
  }
  const id = token(field(descriptors, 'id', owner), owner, 'id');
  if (path.basename(directory) !== id) {
    fail(owner, 'id', `must match directory name "${path.basename(directory)}".`);
  }
  const decodedMountPath = mountedPath(field(descriptors, 'mountPath', owner), owner, 'mountPath');
  if (decodedMountPath !== `/lab/${id}`) {
    fail(owner, 'mountPath', `must equal "/lab/${id}".`);
  }
  const mountPath = decodedMountPath as `/lab/${string}`;
  const visibilityValue = field(descriptors, 'visibility', owner);
  if (visibilityValue !== 'listed' && visibilityValue !== 'unlisted') {
    fail(owner, 'visibility', 'must be "listed" or "unlisted".');
  }
  const entries = denseArray(field(descriptors, 'entries', owner), owner, 'entries')
    .map((entry, index) => decodeEntry(entry, owner, index));
  if (entries.length === 0) {
    fail(owner, 'entries', 'must contain at least one entry.');
  }
  const entryPath = mountedPath(field(descriptors, 'entryPath', owner), owner, 'entryPath');
  const entryIds = new Set<string>();
  const entryPaths = new Set<string>();
  for (const entry of entries) {
    if (entryIds.has(entry.id)) {
      fail(owner, 'entries', `contains duplicate id "${entry.id}".`);
    }
    if (entryPaths.has(entry.path)) {
      fail(owner, 'entries', `contains duplicate path "${entry.path}".`);
    }
    entryIds.add(entry.id);
    entryPaths.add(entry.path);
  }
  if (!entryPaths.has(entryPath)) {
    fail(owner, 'entryPath', 'must name exactly one declared entry.');
  }
  const tags = descriptors.has('tags')
    ? denseArray(field(descriptors, 'tags', owner), owner, 'tags').map((value, index) => token(value, owner, `tags[${index}]`))
    : [];
  if (new Set(tags).size !== tags.length) {
    fail(owner, 'tags', 'must not contain duplicates.');
  }
  const licenseFile = descriptors.has('licenseFile')
    ? relativePath(field(descriptors, 'licenseFile', owner), owner, 'licenseFile')
    : undefined;

  return Object.freeze({
    schemaVersion: 1,
    id,
    title: safeText(field(descriptors, 'title', owner), owner, 'title'),
    kind: token(field(descriptors, 'kind', owner), owner, 'kind'),
    visibility: visibilityValue,
    mountPath,
    entryPath,
    build: decodeBuild(field(descriptors, 'build', owner), owner),
    entries: Object.freeze(entries),
    ...(licenseFile === undefined ? {} : { licenseFile }),
    tags: Object.freeze(tags),
    directory,
    manifestPath
  });
}

export function publicExperiment(manifest: ExperimentManifest): PublicExperiment {
  const href = `${manifest.mountPath}/`;
  const entryHref = manifest.entryPath === '/index.html'
    ? href
    : `${manifest.mountPath}${manifest.entryPath}`;
  return Object.freeze({
    id: manifest.id,
    title: manifest.title,
    kind: manifest.kind,
    href,
    entryHref,
    tags: Object.freeze([...manifest.tags])
  });
}

function validateOwnership(manifests: readonly ExperimentManifest[]): void {
  const ids = new Set<string>();
  const mounts = new Set<string>();
  const routes = new Set<string>();
  for (const manifest of manifests) {
    if (ids.has(manifest.id)) {
      fail(manifest.manifestPath, 'id', `duplicates "${manifest.id}".`);
    }
    ids.add(manifest.id);
    for (const existing of mounts) {
      if (manifest.mountPath === existing || manifest.mountPath.startsWith(`${existing}/`) || existing.startsWith(`${manifest.mountPath}/`)) {
        fail(manifest.manifestPath, 'mountPath', `overlaps "${existing}".`);
      }
    }
    mounts.add(manifest.mountPath);
    for (const entry of manifest.entries) {
      const route = `${manifest.mountPath}${entry.path}`;
      if (routes.has(route)) {
        fail(manifest.manifestPath, 'entries', `duplicates public route "${route}".`);
      }
      routes.add(route);
    }
  }
}

export async function discoverExperiments(options: {
  readonly repositoryRoot: string;
  readonly experimentsRoot?: string;
}): Promise<ExperimentDiscovery> {
  const repositoryRoot = path.resolve(options.repositoryRoot);
  const experimentsRoot = path.resolve(options.experimentsRoot ?? path.join(repositoryRoot, 'experiments'));
  const repositoryRealRoot = await realpath(repositoryRoot);
  const experimentsRealRoot = await realpath(experimentsRoot);
  if (!contained(repositoryRealRoot, experimentsRealRoot)) {
    throw new TypeError('Experiments root must be contained by the repository root.');
  }
  const directories = (await readdir(experimentsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'en'));
  const manifests: ExperimentManifest[] = [];
  for (const name of directories) {
    const directory = path.join(experimentsRoot, name);
    const realDirectory = await realpath(directory);
    if (!contained(experimentsRealRoot, realDirectory)) {
      throw new TypeError(`${directory}: Experiment directory escapes the experiments root.`);
    }
    const manifestPath = path.join(directory, 'experiment.json');
    let source: string;
    try {
      source = await readFile(manifestPath, 'utf8');
    } catch (error) {
      throw new Error(`${manifestPath}: exactly one experiment.json is required.`, { cause: error });
    }
    let value: unknown;
    try {
      value = JSON.parse(source);
    } catch (error) {
      throw new SyntaxError(`${manifestPath}: invalid JSON.`, { cause: error });
    }
    manifests.push(decodeExperimentManifest(value, { directory, manifestPath }));
  }
  manifests.sort((left, right) => left.id.localeCompare(right.id, 'en'));
  validateOwnership(manifests);
  const catalog = manifests
    .filter((manifest) => manifest.visibility === 'listed')
    .map(publicExperiment);
  return Object.freeze({
    manifests: Object.freeze(manifests),
    catalog: Object.freeze(catalog)
  });
}
