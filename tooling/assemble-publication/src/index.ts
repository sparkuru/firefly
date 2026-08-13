import { spawn } from 'node:child_process';
import {
  cp,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  stat,
  writeFile
} from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  discoverExperiments,
  type ExperimentDiscovery,
  type ExperimentManifest
} from '@f1refly/validate-experiments';

export interface PublicationResult {
  readonly manifestCount: number;
  readonly catalog: ExperimentDiscovery['catalog'];
  readonly inventory: readonly string[];
  readonly artifactsRoot: string;
  readonly releaseRoot: string;
}

interface FileTree {
  readonly files: readonly string[];
  readonly directories: readonly string[];
}

const TEXT_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.mjs',
  '.svg',
  '.txt',
  '.xml'
]);
const PROHIBITED_TEXT = [
  /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/u,
  /AKIA[0-9A-Z]{16}/u,
  /gh[oprsu]_[A-Za-z0-9]{36,}/u,
  /(?:^|[\s"'])file:\/\//imu,
  /\/home\/[^/\s"']+\//u,
  /\/Users\/[^/\s"']+\//u,
  /[A-Z]:\\Users\\[^\\\s"']+\\/u,
  /\/app\//u,
  /(?:^|[\\/])\.private(?:[\\/]|$)/imu
];
const PROHIBITED_ARTIFACT_SEGMENTS = new Set(['.git', '.private', 'node_modules']);
const PROHIBITED_ARTIFACT_FILES = new Set([
  'package-lock.json',
  'package.json',
  'tsconfig.json'
]);
const PROHIBITED_SOURCE_EXTENSIONS = new Set(['.astro', '.ts', '.tsx']);
const ENCODED_SEPARATOR_PATTERN = /%(?:2f|5c)/iu;

function contained(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function requireContained(root: string, candidate: string, label: string): void {
  if (!contained(path.resolve(root), path.resolve(candidate))) {
    throw new TypeError(`${label} escapes ${root}.`);
  }
}

async function requireRealContained(root: string, candidate: string, label: string): Promise<void> {
  const resolvedRoot = await realpath(root);
  const resolvedCandidate = await realpath(candidate);
  if (!contained(resolvedRoot, resolvedCandidate)) {
    throw new TypeError(`${label} resolves outside ${root}.`);
  }
}

function validateArtifactPath(relative: string, absolute: string): void {
  const segments = relative.split('/');
  for (const segment of segments) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      throw new TypeError(`${absolute}: artifact path contains malformed percent encoding.`);
    }
    if (
      segment.length === 0 ||
      /[\\?#\u0000-\u001f\u007f]/u.test(segment) ||
      ENCODED_SEPARATOR_PATTERN.test(segment) ||
      decoded.includes('/') ||
      decoded.includes('\\') ||
      decoded === '.' ||
      decoded === '..'
    ) {
      throw new TypeError(`${absolute}: artifact path contains an unsafe segment.`);
    }
    if (PROHIBITED_ARTIFACT_SEGMENTS.has(segment)) {
      throw new TypeError(`${absolute}: development or private artifact paths are prohibited.`);
    }
  }
  const filename = segments.at(-1) ?? '';
  const extension = path.extname(filename).toLowerCase();
  if (
    /^\.env(?:\.|$)/u.test(filename) ||
    PROHIBITED_ARTIFACT_FILES.has(filename) ||
    PROHIBITED_SOURCE_EXTENSIONS.has(extension)
  ) {
    throw new TypeError(`${absolute}: development or source artifacts are prohibited.`);
  }
}

async function pathExists(candidate: string): Promise<boolean> {
  try {
    await lstat(candidate);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

export async function walkSafeTree(root: string): Promise<FileTree> {
  const absoluteRoot = path.resolve(root);
  const rootStats = await lstat(absoluteRoot);
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
    throw new TypeError(`${absoluteRoot}: artifact root must be a real directory.`);
  }
  const resolvedRoot = await realpath(absoluteRoot);
  const files: string[] = [];
  const directories: string[] = [];
  const walk = async (directory: string, relativeDirectory: string): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, 'en'));
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const relative = path.posix.join(relativeDirectory, entry.name);
      validateArtifactPath(relative, absolute);
      const stats = await lstat(absolute);
      if (stats.isSymbolicLink()) {
        throw new TypeError(`${absolute}: symbolic links are prohibited.`);
      }
      const resolved = await realpath(absolute);
      if (!contained(resolvedRoot, resolved)) {
        throw new TypeError(`${absolute}: resolved path escapes the artifact root.`);
      }
      if (stats.isDirectory()) {
        directories.push(relative);
        await walk(absolute, relative);
      } else if (stats.isFile()) {
        if (relative.toLowerCase().endsWith('.map')) {
          throw new TypeError(`${absolute}: source maps are prohibited.`);
        }
        files.push(relative);
      } else {
        throw new TypeError(`${absolute}: only regular files and directories are allowed.`);
      }
    }
  };
  await walk(absoluteRoot, '');
  return Object.freeze({
    files: Object.freeze(files),
    directories: Object.freeze(directories)
  });
}

function publicPathForFile(relative: string): string {
  return `/${relative}`;
}

function decodeReference(reference: string, owner: string): string | null {
  const trimmed = reference.trim();
  if (
    trimmed.length === 0 ||
    trimmed.startsWith('#') ||
    /^(?:data:|mailto:|tel:|https?:)/iu.test(trimmed)
  ) {
    return null;
  }
  if (trimmed.startsWith('//')) {
    throw new TypeError(`${owner}: protocol-relative reference "${trimmed}" is prohibited.`);
  }
  const withoutQuery = trimmed.split(/[?#]/u, 1)[0] ?? '';
  let decoded: string;
  try {
    decoded = decodeURIComponent(withoutQuery);
  } catch {
    throw new TypeError(`${owner}: malformed reference "${trimmed}".`);
  }
  if (decoded.includes('\\') || decoded.includes('\0')) {
    throw new TypeError(`${owner}: unsafe reference "${trimmed}".`);
  }
  if (decoded.startsWith('#')) {
    return null;
  }
  return decoded;
}

function referenceTargets(source: string, contents: string): readonly string[] {
  const targets: string[] = [];
  if (source.endsWith('.html') || source.endsWith('.svg')) {
    const attributePattern = /\b(?:href|src|poster|action)\s*=\s*["']([^"']+)["']/giu;
    for (const match of contents.matchAll(attributePattern)) {
      if (match[1] !== undefined) {
        targets.push(match[1]);
      }
    }
    const srcsetPattern = /\bsrcset\s*=\s*["']([^"']+)["']/giu;
    for (const match of contents.matchAll(srcsetPattern)) {
      for (const candidate of (match[1] ?? '').split(',')) {
        const reference = candidate.trim().split(/\s+/u)[0];
        if (reference !== undefined) {
          targets.push(reference);
        }
      }
    }
  }
  if (source.endsWith('.css') || source.endsWith('.html') || source.endsWith('.svg')) {
    const cssPattern = /url\(\s*["']?([^"')]+)["']?\s*\)/giu;
    for (const match of contents.matchAll(cssPattern)) {
      if (match[1] !== undefined) {
        targets.push(match[1]);
      }
    }
  }
  return targets;
}

function normalizeTarget(sourcePublicPath: string, reference: string): string {
  const target = reference.startsWith('/')
    ? path.posix.normalize(reference)
    : path.posix.resolve(path.posix.dirname(sourcePublicPath), reference);
  return target;
}

function possibleFiles(target: string): readonly string[] {
  const relative = target.replace(/^\//u, '');
  if (target.endsWith('/')) {
    return [path.posix.join(relative, 'index.html')];
  }
  return [relative, path.posix.join(relative, 'index.html')];
}

async function validateTextAndReferences(
  releaseRoot: string,
  files: readonly string[],
  manifests: readonly ExperimentManifest[]
): Promise<void> {
  const fileSet = new Set(files);
  for (const relative of files) {
    const absolute = path.join(releaseRoot, relative);
    const bytes = await readFile(absolute);
    const isText = !bytes.includes(0);
    const contents = isText ? bytes.toString('utf8') : '';
    if (isText) {
      for (const pattern of PROHIBITED_TEXT) {
        if (pattern.test(contents)) {
          throw new TypeError(`${absolute}: prohibited private, credential, or source-path content.`);
        }
      }
    }
    if (!TEXT_EXTENSIONS.has(path.extname(relative).toLowerCase())) {
      continue;
    }
    const sourcePublicPath = publicPathForFile(relative);
    const owner = manifests.find((manifest) => sourcePublicPath.startsWith(`${manifest.mountPath}/`));
    for (const rawReference of referenceTargets(relative, contents)) {
      const reference = decodeReference(rawReference, absolute);
      if (reference === null) {
        continue;
      }
      const target = normalizeTarget(sourcePublicPath, reference);
      if (!target.startsWith('/')) {
        throw new TypeError(`${absolute}: reference "${rawReference}" escapes the release.`);
      }
      if (owner !== undefined && !target.startsWith(`${owner.mountPath}/`) && target !== `${owner.mountPath}`) {
        throw new TypeError(`${absolute}: local reference "${rawReference}" escapes ${owner.mountPath}.`);
      }
      if (!possibleFiles(target).some((candidate) => fileSet.has(candidate))) {
        throw new TypeError(`${absolute}: local reference "${rawReference}" does not resolve to an emitted file.`);
      }
    }
  }
}

function assertNoCaseCollisions(paths: readonly string[]): void {
  const seen = new Map<string, string>();
  for (const candidate of paths) {
    const folded = candidate.toLocaleLowerCase('en');
    const existing = seen.get(folded);
    if (existing !== undefined && existing !== candidate) {
      throw new TypeError(`Release paths "${existing}" and "${candidate}" collide by case.`);
    }
    seen.set(folded, candidate);
  }
}

export async function validateRelease(
  releaseRoot: string,
  manifests: readonly ExperimentManifest[]
): Promise<readonly string[]> {
  const tree = await walkSafeTree(releaseRoot);
  assertNoCaseCollisions([...tree.directories, ...tree.files]);
  const requiredSiteFiles = ['index.html', '404.html', 'lab/index.html'];
  for (const required of requiredSiteFiles) {
    if (!tree.files.includes(required)) {
      throw new TypeError(`${releaseRoot}: missing required site file "${required}".`);
    }
  }
  for (const manifest of manifests) {
    const mount = manifest.mountPath.slice(1);
    for (const entry of manifest.entries) {
      const required = path.posix.join(mount, entry.path.slice(1));
      if (!tree.files.includes(required)) {
        throw new TypeError(`${releaseRoot}: ${manifest.id} is missing declared entry "${entry.path}".`);
      }
    }
    if (manifest.licenseFile !== undefined) {
      const required = path.posix.join(mount, manifest.licenseFile);
      if (!tree.files.includes(required)) {
        throw new TypeError(`${releaseRoot}: ${manifest.id} is missing license evidence "${manifest.licenseFile}".`);
      }
    }
    if (manifest.id === 'nerv' && !tree.files.includes(path.posix.join(mount, '404.html'))) {
      throw new TypeError(`${releaseRoot}: NERV must include its independent 404.html.`);
    }
  }
  await validateTextAndReferences(releaseRoot, tree.files, manifests);
  return tree.files;
}

async function copySafeTree(source: string, destination: string): Promise<void> {
  await walkSafeTree(source);
  await cp(source, destination, {
    recursive: true,
    errorOnExist: true,
    force: false,
    dereference: false
  });
}

interface Promotion {
  readonly candidate: string;
  readonly target: string;
}

async function promoteTogether(promotions: readonly Promotion[]): Promise<void> {
  const prepared: Array<Promotion & { readonly backup: string; readonly hadTarget: boolean }> = [];
  const moved: Array<Promotion & { readonly backup: string; readonly hadTarget: boolean }> = [];
  try {
    for (const promotion of promotions) {
      const backup = `${promotion.target}.previous-${randomUUID()}`;
      const hadTarget = await pathExists(promotion.target);
      if (hadTarget) {
        await rename(promotion.target, backup);
      }
      prepared.push({ ...promotion, backup, hadTarget });
    }
    for (const promotion of prepared) {
      await rename(promotion.candidate, promotion.target);
      moved.push(promotion);
    }
  } catch (error) {
    const rollbackErrors: unknown[] = [];
    for (const promotion of [...moved].reverse()) {
      try {
        await rename(promotion.target, promotion.candidate);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    for (const promotion of [...prepared].reverse()) {
      if (!promotion.hadTarget) {
        continue;
      }
      try {
        await rename(promotion.backup, promotion.target);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    if (rollbackErrors.length > 0) {
      throw new AggregateError([error, ...rollbackErrors], 'Publication promotion and rollback both failed.');
    }
    throw error;
  }
  for (const promotion of prepared) {
    if (promotion.hadTarget) {
      await rm(promotion.backup, { recursive: true, force: true });
    }
  }
}

export async function buildExperiments(manifests: readonly ExperimentManifest[]): Promise<void> {
  const ordered = [...manifests].sort((left, right) => left.id.localeCompare(right.id, 'en'));
  for (const manifest of ordered) {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(manifest.build.command, {
        cwd: manifest.directory,
        shell: true,
        stdio: 'inherit'
      });
      child.on('error', reject);
      child.on('exit', (code, signal) => {
        if (code === 0) {
          resolve();
          return;
        }
        const error = new Error(
          `${manifest.manifestPath}: build command failed with ${signal === null ? `exit ${String(code)}` : `signal ${signal}`}.`
        ) as Error & { exitCode?: number };
        if (typeof code === 'number') {
          error.exitCode = code;
        }
        reject(error);
      });
    });
  }
}

export async function assemblePublication(options: {
  readonly repositoryRoot: string;
  readonly discovery?: ExperimentDiscovery;
}): Promise<PublicationResult> {
  const repositoryRoot = path.resolve(options.repositoryRoot);
  const discovery = options.discovery ?? await discoverExperiments({ repositoryRoot });
  const siteOutput = path.join(repositoryRoot, 'apps/site/dist');
  const artifactsTarget = path.join(repositoryRoot, 'artifacts');
  const releaseTarget = path.join(repositoryRoot, 'dist');
  const transaction = randomUUID();
  const artifactsCandidate = path.join(repositoryRoot, `.artifacts-candidate-${transaction}`);
  const releaseCandidate = path.join(repositoryRoot, `.dist-candidate-${transaction}`);
  requireContained(repositoryRoot, artifactsCandidate, 'Artifact candidate');
  requireContained(repositoryRoot, releaseCandidate, 'Release candidate');
  await mkdir(artifactsCandidate);
  let artifactsPromoted = false;
  let releasePromoted = false;
  try {
    await copySafeTree(siteOutput, path.join(artifactsCandidate, 'site'));
    for (const manifest of discovery.manifests) {
      await requireRealContained(repositoryRoot, manifest.directory, `${manifest.id} directory`);
      const sourceOutput = path.resolve(manifest.directory, manifest.build.outputDir);
      requireContained(manifest.directory, sourceOutput, `${manifest.id} output`);
      await requireRealContained(manifest.directory, sourceOutput, `${manifest.id} output`);
      const stagedOutput = path.join(artifactsCandidate, 'experiments', manifest.id);
      await mkdir(path.dirname(stagedOutput), { recursive: true });
      await copySafeTree(sourceOutput, stagedOutput);
      if (manifest.licenseFile !== undefined) {
        const licenseSource = path.resolve(manifest.directory, manifest.licenseFile);
        requireContained(manifest.directory, licenseSource, `${manifest.id} license`);
        await requireRealContained(manifest.directory, licenseSource, `${manifest.id} license`);
        const licenseStats = await lstat(licenseSource);
        if (!licenseStats.isFile() || licenseStats.isSymbolicLink()) {
          throw new TypeError(`${licenseSource}: license evidence must be a regular file.`);
        }
        const licenseDestination = path.join(stagedOutput, manifest.licenseFile);
        if (await pathExists(licenseDestination)) {
          throw new TypeError(`${licenseDestination}: output collides with license evidence.`);
        }
        await mkdir(path.dirname(licenseDestination), { recursive: true });
        await cp(licenseSource, licenseDestination, { errorOnExist: true, force: false });
      }
    }
    await copySafeTree(path.join(artifactsCandidate, 'site'), releaseCandidate);
    for (const manifest of discovery.manifests) {
      const destination = path.join(releaseCandidate, manifest.mountPath.slice(1));
      if (await pathExists(destination)) {
        throw new TypeError(`${destination}: Experiment mount collides with site output.`);
      }
      await mkdir(path.dirname(destination), { recursive: true });
      await copySafeTree(path.join(artifactsCandidate, 'experiments', manifest.id), destination);
    }
    const inventory = await validateRelease(releaseCandidate, discovery.manifests);
    await writeFile(path.join(artifactsCandidate, 'publication.json'), `${JSON.stringify({
      schemaVersion: 1,
      catalog: discovery.catalog,
      inventory
    }, null, 2)}\n`);
    await promoteTogether([
      { candidate: artifactsCandidate, target: artifactsTarget },
      { candidate: releaseCandidate, target: releaseTarget }
    ]);
    artifactsPromoted = true;
    releasePromoted = true;
    return Object.freeze({
      manifestCount: discovery.manifests.length,
      catalog: discovery.catalog,
      inventory,
      artifactsRoot: artifactsTarget,
      releaseRoot: releaseTarget
    });
  } finally {
    if (!artifactsPromoted) {
      await rm(artifactsCandidate, { recursive: true, force: true });
    }
    if (!releasePromoted) {
      await rm(releaseCandidate, { recursive: true, force: true });
    }
  }
}
