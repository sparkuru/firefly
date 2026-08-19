import type {
  ProcessContext as ShellProcessContext,
  ProcessResult as ShellProcessResult,
  ReadonlyShellScratchFile,
  ReadonlyShellSession,
  ShellCommandMetadata
} from './shell/contracts.js';
import { textStream } from './shell/streams.js';
import { expandStageWords } from './shell/expansion.js';
import { parseRshell } from './shell/parser.js';
import type { RshellStage } from './shell/parser.js';
import { resolveSessionCommand, runRshell } from './shell/runner.js';
import type { ParsedCommandArguments } from './commands/arguments.js';
import { NEUTRAL_COMMAND_REGISTRY, NEUTRAL_COMMAND_SPECS } from './commands/registry.js';
import { createPublicIndex } from './vfs/public-index.js';
import type { PublicDocument, ReadonlyVirtualFs } from './vfs/contracts.js';
import { displayVirtualPath as displayVfsPath, virtualPathFromDisplay as virtualPathFromVfsDisplay } from './vfs/paths.js';

export type TerminalEntryKind = 'post' | 'page';

export interface TerminalEntry {
  readonly kind: TerminalEntryKind;
  readonly virtualPath: `${'posts' | 'pages'}/${string}.md`;
  readonly relativePath: `${string}.md`;
  readonly filename: `${string}.md`;
  readonly title: string;
  readonly href: string;
  readonly date: string;
}

export interface TerminalExperiment {
  readonly id: string;
  readonly title: string;
  readonly href: `/lab/${string}/`;
}

export interface TerminalIdentity {
  readonly user: string;
  readonly host: string;
  readonly workingDirectory: string;
  readonly about: string;
}

export interface TerminalTextDocument {
  readonly virtualPath: TerminalEntry['virtualPath'];
  readonly lines: readonly string[];
}

export interface TerminalScratchFile {
  readonly name: string;
  readonly lines: readonly string[];
}

export interface TerminalAlias {
  readonly name: string;
  readonly target: string;
}

export interface TerminalState {
  readonly history: readonly string[];
  readonly historyCursor: number | null;
  readonly draftInput: string;
  readonly cwd: string;
  readonly scratch: readonly TerminalScratchFile[];
  readonly aliases: readonly TerminalAlias[];
}

export type TerminalTone = 'normal' | 'muted' | 'error';

export type TerminalCommandGroup =
  | 'Explore'
  | 'Read & navigate'
  | 'Identity & time'
  | 'Session'
  | 'Other';

export interface TerminalHelpCommand {
  readonly name: string;
  readonly aliases: readonly string[];
  readonly summary: string;
  readonly usage: string;
}

export interface TerminalHelpGroup {
  readonly name: TerminalCommandGroup;
  readonly commands: readonly TerminalHelpCommand[];
}

export interface TerminalGrepMatch {
  readonly path: string;
  readonly lineNumber?: number;
  readonly line: string;
  readonly ranges: readonly (readonly [number, number])[];
}

export type TerminalEffect =
  | { readonly kind: 'lines'; readonly tone: TerminalTone; readonly lines: readonly string[] }
  | { readonly kind: 'help'; readonly groups: readonly TerminalHelpGroup[] }
  | {
      readonly kind: 'grep';
      readonly pattern: string;
      readonly matches: readonly TerminalGrepMatch[];
      readonly noResults: boolean;
      readonly truncated: boolean;
    }
  | {
      readonly kind: 'entries';
      readonly directories: readonly string[];
      readonly entries: readonly TerminalEntry[];
      readonly label: string;
      readonly directory: string;
    }
  | { readonly kind: 'experiments'; readonly experiments: readonly TerminalExperiment[] }
  | { readonly kind: 'navigation'; readonly experiment: TerminalExperiment }
  | { readonly kind: 'document'; readonly entry: TerminalEntry }
  | { readonly kind: 'document-navigation'; readonly entry: TerminalEntry }
  | { readonly kind: 'tree'; readonly root: string; readonly lines: readonly string[]; readonly nodes: readonly import('./vfs/contracts.js').TreeLine[] }
  | { readonly kind: 'clear' };

export interface CommandResult {
  readonly state: TerminalState;
  readonly effect: TerminalEffect | null;
  readonly announcement: string;
}

export type TokenizeResult =
  | { readonly ok: true; readonly tokens: readonly string[] }
  | { readonly ok: false; readonly message: string };

export type CompletionResult =
  | { readonly kind: 'unique'; readonly value: string; readonly candidates: readonly string[] }
  | { readonly kind: 'ambiguous'; readonly candidates: readonly string[]; readonly ownsTab: boolean }
  | { readonly kind: 'no-match'; readonly candidates: readonly []; readonly ownsTab: true }
  | { readonly kind: 'none'; readonly candidates: readonly [] };

export interface TerminalCommandContext {
  readonly state: TerminalState;
  readonly entries: readonly TerminalEntry[];
  readonly documents: readonly TerminalTextDocument[];
  readonly experiments: readonly TerminalExperiment[];
  readonly fs: ReadonlyVirtualFs;
  readonly identity: TerminalIdentity;
  readonly now: () => Date;
  readonly registry: TerminalCommandRegistry;
  readonly stdin: readonly string[];
  readonly stdinProvided: boolean;
  readonly piped: boolean;
}

export interface TerminalCommandExecution {
  readonly state: TerminalState;
  readonly effect: TerminalEffect;
}

export type CommandHandlerResult = TerminalEffect | TerminalCommandExecution;

export type CommandHandler = (
  operands: readonly string[],
  context: TerminalCommandContext
) => CommandHandlerResult;

export type CompletionHandler = (
  operand: string,
  context: Pick<TerminalCommandContext, 'entries' | 'experiments'> & { readonly cwd: string },
  invokedName: string
) => CompletionResult;

export interface TerminalCommandDefinition {
  readonly name: string;
  readonly aliases: readonly string[];
  readonly group?: TerminalCommandGroup;
  readonly order?: number;
  readonly summary: string;
  readonly usage: string;
  readonly execute: CommandHandler;
  readonly complete?: CompletionHandler;
  readonly pureText?: boolean;
  readonly standalone?: boolean;
  readonly redirect?: 'text' | 'forbidden';
  readonly recoverable?: boolean;
}

export interface TerminalCommandRegistry {
  readonly definitions: readonly TerminalCommandDefinition[];
  resolve(name: string): TerminalCommandDefinition | undefined;
}

export const DEFAULT_TERMINAL_IDENTITY: TerminalIdentity = Object.freeze({
  user: 'guest',
  host: 'firefly',
  workingDirectory: '~/blog/posts',
  about: 'A personal space for notes, experiments, and technical things I don\'t want to figure out twice.\nMostly about things I\'ve worked on, broken, fixed, or found interesting.\nSource: https://github.com/sparkuru/f1refly.git'
});

function terminalPrompt(identity: TerminalIdentity, cwd: string): string {
  return `${identity.user}(.ᗜ ᴗ ᗜ.)${identity.host}:${cwd} #`;
}

export const DEFAULT_TERMINAL_PROMPT = terminalPrompt(
  DEFAULT_TERMINAL_IDENTITY,
  DEFAULT_TERMINAL_IDENTITY.workingDirectory
);

const commandToken = /^[a-z][a-z0-9-]*$/u;
const unsafePathSegment = /[\\/?#%\u0000-\u001f\u007f]/u;

const terminalCommandGroups: readonly TerminalCommandGroup[] = Object.freeze([
  'Explore',
  'Read & navigate',
  'Identity & time',
  'Session',
  'Other'
]);

function isTerminalCommandGroup(value: unknown): value is TerminalCommandGroup {
  return typeof value === 'string' && terminalCommandGroups.includes(value as TerminalCommandGroup);
}

export function createTerminalState(identity: TerminalIdentity = DEFAULT_TERMINAL_IDENTITY): TerminalState {
  return Object.freeze({
    history: Object.freeze([]),
    historyCursor: null,
    draftInput: '',
    cwd: identity.workingDirectory,
    scratch: Object.freeze([]),
    aliases: Object.freeze([])
  });
}

export function formatTerminalPrompt(
  identity: TerminalIdentity,
  state: Pick<TerminalState, 'cwd'>
): string {
  return terminalPrompt(identity, state.cwd);
}

function ownDataDescriptors(value: object): ReadonlyMap<PropertyKey, PropertyDescriptor> {
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const result = new Map<PropertyKey, PropertyDescriptor>();
  for (const key of Reflect.ownKeys(descriptors)) {
    const descriptor = descriptors[key as keyof typeof descriptors];
    if (descriptor === undefined || 'get' in descriptor || 'set' in descriptor) {
      throw new TypeError('Terminal index must contain data properties only.');
    }
    result.set(key, descriptor);
  }
  return result;
}

function readDataField(descriptors: ReadonlyMap<PropertyKey, PropertyDescriptor>, key: string): unknown {
  const descriptor = descriptors.get(key);
  if (descriptor === undefined || !('value' in descriptor)) throw new TypeError(`Terminal entry is missing "${key}".`);
  return descriptor.value;
}

function requireSafeText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0 || value !== value.trim() || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new TypeError(`Terminal entry "${field}" must be non-empty safe text.`);
  }
  return value;
}

function requireIdentityText(value: unknown, field: string, multiline = false): string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value !== value.trim() ||
    (multiline
      ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)
      : /[\u0000-\u001f\u007f]/u.test(value))
  ) {
    throw new TypeError('Terminal identity "' + field + '" must be safe text.');
  }
  return value;
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function pathCollisionKey(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replaceAll('\u00df', 'ss')
    .replaceAll('\u03c2', '\u03c3');
}

function isSafePathSegment(segment: string): boolean {
  return segment.length > 0 &&
    segment !== '.' &&
    segment !== '..' &&
    !segment.startsWith('.') &&
    segment.normalize('NFC') === segment &&
    !unsafePathSegment.test(segment);
}

export function decodeTerminalIdentity(value: unknown): TerminalIdentity {
  if (
    typeof value !== 'object' ||
    value === null ||
    (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
  ) {
    throw new TypeError('Terminal identity must be a plain object.');
  }
  const descriptors = ownDataDescriptors(value);
  const expected = ['user', 'host', 'workingDirectory', 'about'];
  const keys = [...descriptors.keys()];
  if (
    keys.some((key) => typeof key !== 'string' || !expected.includes(key)) ||
    expected.some((key) => !descriptors.has(key)) ||
    keys.length !== expected.length
  ) {
    throw new TypeError('Terminal identity contains unknown or missing fields.');
  }
  const user = requireIdentityText(readDataField(descriptors, 'user'), 'user');
  const host = requireIdentityText(readDataField(descriptors, 'host'), 'host');
  const workingDirectory = requireIdentityText(readDataField(descriptors, 'workingDirectory'), 'workingDirectory');
  if (
    !/^[^\\/?#%\s\u0000-\u001f\u007f]+$/u.test(user) ||
    !/^[^\\/?#%\s\u0000-\u001f\u007f]+$/u.test(host)
  ) {
    throw new TypeError('Terminal identity user and host must be safe prompt tokens.');
  }
  if (
    !workingDirectory.startsWith('~/blog') ||
    (workingDirectory.length > '~/blog'.length && !workingDirectory.startsWith('~/blog/')) ||
    workingDirectory.slice('~/blog'.length).split('/').some((segment) => segment.length > 0 && !isSafePathSegment(segment))
  ) {
    throw new TypeError('Terminal identity workingDirectory must be a safe ~/blog path.');
  }
  const about = requireIdentityText(readDataField(descriptors, 'about'), 'about', true);
  return Object.freeze({ user, host, workingDirectory, about });
}

function isSafeCommandToken(value: string): boolean {
  return value === '?' || commandToken.test(value);
}

function isCanonicalVirtualPath(value: string, kind: TerminalEntryKind): boolean {
  const segments = value.split('/');
  const expectedMount = kind === 'post' ? 'posts' : 'pages';
  if (segments.length < 2 || segments.shift() !== expectedMount || !segments.every(isSafePathSegment)) return false;
  const filename = segments.at(-1);
  return filename !== undefined && filename.endsWith('.md') && filename.length > 3;
}

function isCanonicalRoute(value: string, kind: TerminalEntryKind): boolean {
  if (!value.startsWith('/') || !value.endsWith('/') || value.includes('?') || value.includes('#')) return false;
  const segments = value.slice(1, -1).split('/');
  const expectedMount = kind === 'post' ? 'posts' : 'pages';
  return segments.length >= 2 && segments.shift() === expectedMount && segments.every(isSafePathSegment);
}

function decodeEntry(value: unknown, index: number): TerminalEntry {
  if (typeof value !== 'object' || value === null || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    throw new TypeError(`Terminal entry ${index} must be a plain object.`);
  }
  const descriptors = ownDataDescriptors(value);
  const expected = ['kind', 'virtualPath', 'relativePath', 'filename', 'title', 'href', 'date'];
  const keys = [...descriptors.keys()];
  if (keys.some((key) => typeof key !== 'string' || !expected.includes(key)) || expected.some((key) => !descriptors.has(key)) || keys.length !== expected.length) {
    throw new TypeError(`Terminal entry ${index} contains unknown or missing fields.`);
  }
  const kindValue = readDataField(descriptors, 'kind');
  if (kindValue !== 'post' && kindValue !== 'page') throw new TypeError(`Terminal entry ${index} has an invalid kind.`);
  const kind: TerminalEntryKind = kindValue;
  const virtualPath = requireSafeText(readDataField(descriptors, 'virtualPath'), 'virtualPath');
  if (!isCanonicalVirtualPath(virtualPath, kind)) {
    throw new TypeError(`Terminal entry ${index} has an unsafe virtual path.`);
  }
  const relativePath = requireSafeText(readDataField(descriptors, 'relativePath'), 'relativePath');
  if (virtualPath !== `${kind === 'post' ? 'posts' : 'pages'}/${relativePath}`) throw new TypeError(`Terminal entry ${index} has a non-canonical relative path.`);
  const filename = requireSafeText(readDataField(descriptors, 'filename'), 'filename');
  if (filename !== relativePath.split('/').at(-1)) throw new TypeError(`Terminal entry ${index} has a non-canonical filename.`);
  const href = requireSafeText(readDataField(descriptors, 'href'), 'href');
  if (!isCanonicalRoute(href, kind)) throw new TypeError(`Terminal entry ${index} has a non-canonical href.`);
  const date = requireSafeText(readDataField(descriptors, 'date'), 'date');
  if (!isCalendarDate(date)) throw new TypeError(`Terminal entry ${index} has an invalid date.`);
  return Object.freeze({
    kind,
    virtualPath: virtualPath as TerminalEntry['virtualPath'],
    relativePath: relativePath as `${string}.md`,
    filename: filename as `${string}.md`,
    title: requireSafeText(readDataField(descriptors, 'title'), 'title'),
    href,
    date
  });
}

function decodePlainArray<T>(value: unknown, label: string, decode: (item: unknown, index: number) => T): readonly T[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) throw new TypeError(`${label} must be a plain array.`);
  const descriptors = ownDataDescriptors(value);
  const length = readDataField(descriptors, 'length');
  if (typeof length !== 'number' || !Number.isSafeInteger(length) || length < 0) throw new TypeError(`${label} has an invalid length.`);
  const allowed = new Set(['length']);
  const result = [];
  for (let index = 0; index < length; index += 1) {
    const key = String(index);
    allowed.add(key);
    if (!descriptors.has(key)) throw new TypeError(`${label} must be dense.`);
    result.push(decode(readDataField(descriptors, key), index));
  }
  if ([...descriptors.keys()].some((key) => typeof key !== 'string' || !allowed.has(key))) throw new TypeError(`${label} contains unexpected properties.`);
  return Object.freeze(result);
}

export function decodeTerminalEntries(value: unknown): readonly TerminalEntry[] {
  const entries = decodePlainArray(value, 'Terminal index', decodeEntry);
  const virtualPaths = new Set<string>();
  const hrefs = new Set<string>();
  for (const entry of entries) {
    const virtualPathKey = pathCollisionKey(entry.virtualPath);
    const hrefKey = pathCollisionKey(entry.href);
    if (virtualPaths.has(virtualPathKey) || hrefs.has(hrefKey)) throw new TypeError('Terminal index contains duplicate paths or hrefs.');
    virtualPaths.add(virtualPathKey);
    hrefs.add(hrefKey);
  }
  return entries;
}

function decodeExperiment(value: unknown, index: number): TerminalExperiment {
  if (typeof value !== 'object' || value === null || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) throw new TypeError(`Terminal experiment ${index} must be a plain object.`);
  const descriptors = ownDataDescriptors(value);
  const expected = ['id', 'title', 'href'];
  const keys = [...descriptors.keys()];
  if (keys.some((key) => typeof key !== 'string' || !expected.includes(key)) || expected.some((key) => !descriptors.has(key)) || keys.length !== expected.length) throw new TypeError(`Terminal experiment ${index} contains unknown or missing fields.`);
  const id = requireSafeText(readDataField(descriptors, 'id'), 'id');
  if (!commandToken.test(id)) throw new TypeError(`Terminal experiment ${index} has an unsafe id.`);
  const href = requireSafeText(readDataField(descriptors, 'href'), 'href');
  if (href !== `/lab/${id}/`) throw new TypeError(`Terminal experiment ${index} has a non-canonical href.`);
  return Object.freeze({ id, title: requireSafeText(readDataField(descriptors, 'title'), 'title'), href: href as `/lab/${string}/` });
}

export function decodeTerminalExperiments(value: unknown): readonly TerminalExperiment[] {
  const experiments = decodePlainArray(value, 'Terminal experiment index', decodeExperiment);
  const ids = new Set<string>();
  for (const experiment of experiments) {
    if (ids.has(experiment.id)) throw new TypeError('Terminal experiment index contains duplicate IDs or hrefs.');
    ids.add(experiment.id);
  }
  return experiments;
}

/**
 * Compatibility adapter for consumers that only need one quote-aware command
 * stage. Full rshell execution uses parseRshell directly.
 */
export function tokenizeCommand(input: string): TokenizeResult {
  if (input.trim().length === 0) return { ok: true, tokens: Object.freeze([]) };
  const parsed = parseRshell(input);
  if (!parsed.ok) return parsed;
  if (parsed.stages.length !== 1 || parsed.stages[0]?.redirect !== undefined) {
    return { ok: false, message: 'Tokenizer accepts one command stage without pipelines or redirects.' };
  }
  return {
    ok: true,
    tokens: Object.freeze(parsed.stages[0]!.words.map((word) => word.segments.map(({ value }) => value).join('')))
  };
}

function lines(tone: TerminalTone, ...values: string[]): TerminalEffect {
  return Object.freeze({ kind: 'lines', tone, lines: Object.freeze(values) });
}

function completeFrom(
  prefix: string,
  candidates: readonly string[],
  render: (candidate: string) => string,
  ownsAmbiguousTab = false
): CompletionResult {
  const matches = [...new Set(candidates)].filter((candidate) => candidate.startsWith(prefix)).sort();
  const exact = matches.find((candidate) => candidate === prefix);
  if (exact !== undefined) return { kind: 'unique', value: render(exact), candidates: Object.freeze([exact]) };
  if (matches.length === 1 && matches[0] !== undefined) return { kind: 'unique', value: render(matches[0]), candidates: Object.freeze(matches) };
  return matches.length > 1
    ? { kind: 'ambiguous', candidates: Object.freeze(matches), ownsTab: ownsAmbiguousTab }
    : { kind: 'none', candidates: Object.freeze([]) };
}

function virtualPathFromCwd(cwd: string): string {
  return cwd === rshellRoot
    ? '/'
    : cwd.startsWith(`${rshellRoot}/`)
      ? cwd.slice(rshellRoot.length)
      : '/posts';
}

function pathCompletion(operand: string, entries: readonly TerminalEntry[], invokedName: string, cwd: string): CompletionResult {
  const absolute = operand.startsWith('/');
  const dotted = operand.startsWith('./');
  const prefix = absolute ? operand.slice(1) : dotted ? operand.slice(2) : operand;
  if (prefix.normalize('NFC') !== prefix || prefix.includes('%') || prefix.includes('\\') || prefix.includes('?') || prefix.includes('#') || prefix.includes('://') || /[\u0000-\u001f\u007f]/u.test(prefix) || prefix.split('/').some((segment, index, values) => (segment === '' && index < values.length - 1) || segment === '..' || segment === '.' || segment.startsWith('.'))) return { kind: 'none', candidates: Object.freeze([]) };
  if (
    absolute &&
    prefix.length > 0 &&
    !['posts', 'pages'].some((mount) => mount.startsWith(prefix) || prefix.startsWith(`${mount}/`))
  ) {
    return { kind: 'none', candidates: Object.freeze([]) };
  }
  const cwdPath = virtualPathFromCwd(cwd);
  const candidatePaths = entries.flatMap((entry) => {
    if (absolute) return [entry.virtualPath];
    const fullPath = `/${entry.virtualPath}`;
    const prefixPath = cwdPath === '/' ? '/' : `${cwdPath}/`;
    return fullPath.startsWith(prefixPath) ? [fullPath.slice(prefixPath.length)] : [];
  });
  const slash = prefix.lastIndexOf('/');
  const parent = slash === -1 ? '' : prefix.slice(0, slash + 1);
  const segmentPrefix = prefix.slice(slash + 1);
  const candidates = candidatePaths.flatMap((candidate) => {
    if (!candidate.startsWith(parent)) return [];
    const remaining = candidate.slice(parent.length);
    const nextSlash = remaining.indexOf('/');
    const next = nextSlash === -1 ? remaining : `${remaining.slice(0, nextSlash)}/`;
    return next.startsWith(segmentPrefix) ? [`${parent}${next}`] : [];
  });
  const displayPrefix = absolute ? '/' : dotted ? './' : '';
  const completion = completeFrom(
    prefix,
    candidates,
    (candidate) => `${invokedName} ${displayPrefix}${candidate}`,
    true
  );
  if (completion.kind === 'none') {
    return Object.freeze({
      kind: 'no-match',
      candidates: Object.freeze([]) as readonly [],
      ownsTab: true
    });
  }
  if (completion.kind !== 'ambiguous') return completion;
  return Object.freeze({
    ...completion,
    candidates: Object.freeze(completion.candidates.map((candidate) => `${displayPrefix}${candidate}`))
  });
}

function wildcardSegmentMatches(pattern: string, value: string): boolean {
  let patternIndex = 0;
  let valueIndex = 0;
  let starIndex = -1;
  let starValueIndex = -1;
  while (valueIndex < value.length) {
    if (patternIndex < pattern.length && pattern[patternIndex] === value[valueIndex]) {
      patternIndex += 1;
      valueIndex += 1;
    } else if (patternIndex < pattern.length && pattern[patternIndex] === '*') {
      starIndex = patternIndex;
      starValueIndex = valueIndex;
      patternIndex += 1;
    } else if (starIndex !== -1) {
      patternIndex = starIndex + 1;
      starValueIndex += 1;
      valueIndex = starValueIndex;
    } else {
      return false;
    }
  }
  while (patternIndex < pattern.length && pattern[patternIndex] === '*') patternIndex += 1;
  return patternIndex === pattern.length;
}

function lsCompletion(
  operand: string,
  entries: readonly TerminalEntry[],
  experiments: readonly TerminalExperiment[],
  invokedName: string,
  cwd: string
): CompletionResult {
  const absolute = operand.startsWith('/');
  const dotted = operand.startsWith('./');
  const prefix = absolute ? operand.slice(1) : dotted ? operand.slice(2) : operand;
  if (
    prefix.includes('*') ||
    prefix.normalize('NFC') !== prefix ||
    prefix.includes('%') ||
    prefix.includes('\\') ||
    prefix.includes('?') ||
    prefix.includes('#') ||
    prefix.includes('://') ||
    /[\u0000-\u001f\u007f]/u.test(prefix) ||
    prefix.split('/').some((segment, index, values) => (segment === '' && index < values.length - 1) || segment === '..' || segment === '.' || segment.startsWith('.'))
  ) {
    return { kind: 'none', candidates: Object.freeze([]) };
  }
  if (absolute && prefix.length > 0 && !['posts', 'pages', 'lab'].some((mount) => mount.startsWith(prefix) || prefix.startsWith(`${mount}/`))) {
    return { kind: 'none', candidates: Object.freeze([]) };
  }

  const directoryPaths = new Set(
    [...knownDirectories(entries, Object.freeze([])), ...experiments.map(({ id }) => `/lab/${id}`)]
      .filter((path) => !path.startsWith('/.rshell'))
  );
  const paths = [
    ...directoryPaths,
    ...entries.map(({ virtualPath }) => `/${virtualPath}`)
  ];
  const cwdPath = virtualPathFromCwd(cwd);
  const candidatePaths = paths.flatMap((path) => {
    const candidate = directoryPaths.has(path) && path !== '/' ? `${path}/` : path;
    if (absolute) return [candidate === '/' ? '/' : candidate.slice(1)];
    const prefixPath = cwdPath === '/' ? '/' : `${cwdPath}/`;
    return path.startsWith(prefixPath) && path !== cwdPath ? [candidate.slice(prefixPath.length)] : [];
  });
  const slash = prefix.lastIndexOf('/');
  const parent = slash === -1 ? '' : prefix.slice(0, slash + 1);
  const segmentPrefix = prefix.slice(slash + 1);
  const candidates = candidatePaths.flatMap((candidate) => {
    if (!candidate.startsWith(parent)) return [];
    const remaining = candidate.slice(parent.length);
    const nextSlash = remaining.indexOf('/');
    const next = nextSlash === -1 ? remaining : `${remaining.slice(0, nextSlash)}/`;
    return next.startsWith(segmentPrefix) ? [`${parent}${next}`] : [];
  });
  const displayPrefix = absolute ? '/' : dotted ? './' : '';
  if (!absolute && !dotted) candidates.push('posts/', 'pages/', 'lab/');
  if (!absolute && !dotted) candidates.push('-h', '--help');
  const completion = completeFrom(
    prefix,
    candidates,
    (candidate) => `${invokedName} ${displayPrefix}${candidate}`,
    operand.length === 0
  );
  if (completion.kind === 'none') {
    return Object.freeze({ kind: 'no-match', candidates: Object.freeze([]) as readonly [], ownsTab: true });
  }
  if (completion.kind !== 'ambiguous') return completion;
  return Object.freeze({
    ...completion,
    candidates: Object.freeze(completion.candidates.map((candidate) => `${displayPrefix}${candidate}`))
  });
}

function directoryCompletion(
  operand: string,
  entries: readonly TerminalEntry[],
  invokedName: string,
  cwd: string,
  includeMountAliases = false,
  includeHelpOptions = false,
  experiments: readonly TerminalExperiment[] = Object.freeze([])
): CompletionResult {
  const absolute = operand.startsWith('/');
  const dotted = operand.startsWith('./');
  const prefix = absolute ? operand.slice(1) : dotted ? operand.slice(2) : operand;
  if (
    prefix.includes('*') ||
    prefix.normalize('NFC') !== prefix ||
    prefix.includes('%') ||
    prefix.includes('\\') ||
    prefix.includes('?') ||
    prefix.includes('#') ||
    prefix.includes('://') ||
    /[\u0000-\u001f\u007f]/u.test(prefix) ||
    prefix.split('/').some((segment, index, values) => (segment === '' && index < values.length - 1) || segment === '..' || segment === '.' || segment.startsWith('.'))
  ) {
    return { kind: 'none', candidates: Object.freeze([]) };
  }

  const directories = [...new Set([
    ...knownDirectories(entries, Object.freeze([])),
    ...experiments.map(({ id }) => `/lab/${id}`)
  ])]
    .filter((path) => !path.startsWith('/.rshell'))
    .sort();
  const cwdPath = virtualPathFromCwd(cwd);
  const candidatePaths = directories.flatMap((path) => {
    if (absolute) return [path === '/' ? '/' : `${path.slice(1)}/`];
    const prefixPath = cwdPath === '/' ? '/' : `${cwdPath}/`;
    return path.startsWith(prefixPath) && path !== cwdPath ? [`${path.slice(prefixPath.length)}/`] : [];
  });
  const slash = prefix.lastIndexOf('/');
  const parent = slash === -1 ? '' : prefix.slice(0, slash + 1);
  const segmentPrefix = prefix.slice(slash + 1);
  const candidates = candidatePaths.flatMap((candidate) => {
    if (!candidate.startsWith(parent)) return [];
    const remaining = candidate.slice(parent.length);
    const nextSlash = remaining.indexOf('/');
    const next = nextSlash === -1 ? remaining : `${remaining.slice(0, nextSlash)}/`;
    return next.startsWith(segmentPrefix) ? [`${parent}${next}`] : [];
  });
  const displayPrefix = absolute ? '/' : dotted ? './' : '';
  if (includeMountAliases && !absolute && !dotted) candidates.push('posts', 'pages', 'lab');
  if (includeHelpOptions && !absolute && !dotted) candidates.push('-h', '--help');
  const completion = completeFrom(
    prefix,
    candidates,
    (candidate) => `${invokedName} ${displayPrefix}${candidate}`,
    true
  );
  if (completion.kind === 'none') {
    return Object.freeze({ kind: 'no-match', candidates: Object.freeze([]) as readonly [], ownsTab: true });
  }
  if (completion.kind !== 'ambiguous') return completion;
  return Object.freeze({
    ...completion,
    candidates: Object.freeze(completion.candidates.map((candidate) => `${displayPrefix}${candidate}`))
  });
}

export function formatDocumentOperand(entry: TerminalEntry): string {
  return entry.kind === 'post' ? entry.relativePath : `/${entry.virtualPath}`;
}

export function createTerminalCommandRegistry(definitions: readonly TerminalCommandDefinition[]): TerminalCommandRegistry {
  const lookup = new Map<string, TerminalCommandDefinition>();
  const frozen = definitions.map((definition) => {
    if (
      !commandToken.test(definition.name) ||
      !Array.isArray(definition.aliases) ||
      definition.aliases.some((alias) => !isSafeCommandToken(alias))
    ) {
      throw new TypeError('Terminal command names and aliases must be safe tokens.');
    }
    if (requireSafeText(definition.summary, 'summary') !== definition.summary ||
      requireSafeText(definition.usage, 'usage') !== definition.usage ||
      (definition.usage !== definition.name && !definition.usage.startsWith(`${definition.name} `)) ||
      typeof definition.execute !== 'function' ||
      (definition.complete !== undefined && typeof definition.complete !== 'function') ||
      (definition.pureText !== undefined && typeof definition.pureText !== 'boolean') ||
      (definition.standalone !== undefined && typeof definition.standalone !== 'boolean') ||
      (definition.redirect !== undefined && definition.redirect !== 'text' && definition.redirect !== 'forbidden') ||
      (definition.recoverable !== undefined && typeof definition.recoverable !== 'boolean') ||
      (definition.group !== undefined && !isTerminalCommandGroup(definition.group)) ||
      (definition.order !== undefined && (!Number.isSafeInteger(definition.order) || definition.order < 0))) {
      throw new TypeError('Terminal command definitions must have safe metadata and handlers.');
    }
    const clone = Object.freeze({ ...definition, aliases: Object.freeze([...definition.aliases]) });
    for (const token of [clone.name, ...clone.aliases]) {
      if (lookup.has(token)) throw new TypeError(`Terminal command token collision: ${token}`);
      lookup.set(token, clone);
    }
    return clone;
  });
  return Object.freeze({ definitions: Object.freeze(frozen), resolve: (name: string) => lookup.get(name) });
}

function neutralDefinition(
  spec: typeof NEUTRAL_COMMAND_SPECS[number],
  complete: CompletionHandler | undefined
): TerminalCommandDefinition {
  return {
    name: spec.name,
    aliases: Object.freeze([...spec.aliases]),
    group: spec.group,
    order: spec.order,
    summary: spec.summary,
    usage: spec.usage,
    execute: (operands, context) => {
      const parsed = spec.parse(operands);
      return parsed.ok
        ? executeNeutralCommand(spec.execute, parsed.arguments, context)
        : lines('error', parsed.message);
    },
    pureText: spec.policy.substitution === 'allowed',
    standalone: spec.policy.pipeline === 'forbidden',
    redirect: spec.policy.redirect,
    recoverable: false,
    ...(complete === undefined ? {} : { complete })
  };
}

function neutralCompletion(name: string): CompletionHandler | undefined {
  if (name === 'ls') return (operand, context, invoked) => lsCompletion(operand, context.entries, context.experiments, invoked, context.cwd);
  if (name === 'cat' || name === 'vim') return (operand, context, invoked) => pathCompletion(operand, context.entries, invoked, context.cwd);
  if (name === 'cd') return (operand, context, invoked) => directoryCompletion(operand, context.entries, invoked, context.cwd);
  if (name === 'open') return (operand, context, invoked) => completeFrom(operand, context.experiments.map(({ id }) => `lab/${id}`), (candidate) => `${invoked} ${candidate}`);
  if (name === 'tree') return (operand, _context, invoked) => completeFrom(operand, ['/', '/posts', '/pages', '/lab'], (candidate) => `${invoked} ${candidate}`);
  return undefined;
}

const definitions = [
  ...NEUTRAL_COMMAND_SPECS.map((spec) => neutralDefinition(spec, neutralCompletion(spec.name)))
];

export const DEFAULT_TERMINAL_COMMAND_REGISTRY = createTerminalCommandRegistry(definitions);
export const TERMINAL_COMMANDS = Object.freeze(definitions.map(({ name }) => name));

function withSubmission(state: TerminalState, input: string): TerminalState {
  return Object.freeze({
    ...state,
    history: Object.freeze([...state.history, input].slice(-50)),
    historyCursor: null,
    draftInput: ''
  });
}

export function formatUtcDate(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.valueOf())) throw new TypeError('The Terminal clock returned an invalid date.');
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 19)} UTC`;
}

const rshellRoot = '~/blog';
const maxRshellLines = 240;
const maxRshellText = 24_000;
const maxScratchFiles = 16;
const maxScratchBytes = 12_000;
const maxGrepResources = 256;
const maxGrepLines = 50_000;

interface RshellOutput {
  readonly state: TerminalState;
  readonly effect: TerminalEffect;
  readonly stdout: readonly string[];
  readonly error: boolean;
}

function rshellError(state: TerminalState, message: string): RshellOutput {
  return { state, effect: lines('error', message), stdout: Object.freeze([]), error: true };
}

function boundedLines(values: readonly string[]): readonly string[] {
  const result: string[] = [];
  let size = 0;
  for (const value of values) {
    const line = value.replaceAll('\u0000', '');
    if (result.length >= maxRshellLines || size + line.length > maxRshellText) {
      result.push('[rshell: output truncated]');
      break;
    }
    result.push(line);
    size += line.length;
  }
  return Object.freeze(result);
}

function safeRshellLine(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 4_000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) return undefined;
  return value.normalize('NFC');
}

function normaliseVirtualPath(
  operand: string,
  cwd: string,
  allowParentTraversal = false
): string | undefined {
  if (
    operand.length === 0 ||
    operand.normalize('NFC') !== operand ||
    operand.includes('\\') ||
    operand.includes('%') ||
    operand.includes('?') ||
    operand.includes('#') ||
    /[\u0000-\u001f\u007f]/u.test(operand)
  ) {
    return undefined;
  }

  let base: string;
  if (operand === '~' || operand === '~/blog') {
    base = '/';
  } else if (operand.startsWith('~/')) {
    if (!operand.startsWith('~/blog/')) return undefined;
    base = `/${operand.slice('~/blog/'.length)}`;
  } else if (operand.startsWith('/')) {
    base = operand;
  } else {
    if (!cwd.startsWith(rshellRoot)) return undefined;
    base = `${cwd.slice(rshellRoot.length)}/${operand}`;
  }

  const segments: string[] = [];
  const rawSegments = base.split('/');
  for (const [index, segment] of rawSegments.entries()) {
    const isLeadingOrTrailingSlash = segment === '' && (index === 0 || index === rawSegments.length - 1);
    if (isLeadingOrTrailingSlash) continue;
    if (segment === '') return undefined;
    if (segment === '.') continue;
    if (segment === '..') {
      if (!allowParentTraversal || segments.length === 0) return undefined;
      segments.pop();
      continue;
    }
    if (segment === '.rshell' && segments.length === 0) {
      segments.push(segment);
      continue;
    }
    if (!isSafePathSegment(segment)) return undefined;
    segments.push(segment);
  }
  return `/${segments.join('/')}` || '/';
}

function entryAt(path: string, entries: readonly TerminalEntry[]): TerminalEntry | undefined {
  return entries.find((entry) => `/${entry.virtualPath}` === path);
}

function knownDirectories(entries: readonly TerminalEntry[], scratch: readonly TerminalScratchFile[]): ReadonlySet<string> {
  const directories = new Set<string>(['/', '/posts', '/pages', '/lab', '/.rshell', '/.rshell/tmp']);
  for (const entry of entries) {
    const segments = entry.virtualPath.split('/');
    segments.pop();
    while (segments.length > 0) {
      directories.add(`/${segments.join('/')}`);
      segments.pop();
    }
  }
  if (scratch.length === 0) directories.add('/.rshell/tmp');
  return directories;
}

function scratchName(path: string): string | undefined {
  const prefix = '/.rshell/tmp/';
  if (!path.startsWith(prefix)) return undefined;
  const name = path.slice(prefix.length);
  return name.length > 0 && !name.includes('/') && isSafePathSegment(name) ? name : undefined;
}

function freezeScratch(files: readonly TerminalScratchFile[]): readonly TerminalScratchFile[] {
  return Object.freeze(files.map((file) => Object.freeze({ name: file.name, lines: Object.freeze([...file.lines]) })).sort((left, right) => left.name.localeCompare(right.name)));
}

function formatHelpCommand(command: TerminalHelpCommand): string {
  const aliases = command.aliases.length === 0 ? '' : ` (${command.aliases.join(', ')})`;
  return `  ${command.usage}${aliases} — ${command.summary}`;
}

function formatGrepMatch(match: TerminalGrepMatch): string {
  if (match.path === '-') return match.lineNumber === undefined ? match.line : `${match.lineNumber}:${match.line}`;
  return `${match.path}${match.lineNumber === undefined ? '' : `:${match.lineNumber}`}:${match.line}`;
}

function stdoutForEffect(effect: TerminalEffect): readonly string[] {
  if (effect.kind === 'lines') return effect.lines;
  if (effect.kind === 'help') return Object.freeze(effect.groups.flatMap((group) => [group.name, ...group.commands.map(formatHelpCommand)]));
  if (effect.kind === 'grep') return Object.freeze(effect.matches.map(formatGrepMatch));
  if (effect.kind === 'entries') return Object.freeze([
    ...effect.directories,
    ...effect.entries.map((entry) => `${formatDocumentOperand(entry)} — ${entry.date} — ${entry.title}`)
  ]);
  if (effect.kind === 'experiments') return Object.freeze(effect.experiments.map((experiment) => `${experiment.id}/ — ${experiment.title}`));
  if (effect.kind === 'tree') return Object.freeze([effect.root, ...effect.lines]);
  return Object.freeze([]);
}

function announcementFor(effect: TerminalEffect): string {
  if (effect.kind === 'document') return `Rendered ${effect.entry.title}.`;
  if (effect.kind === 'document-navigation') return `Opening ${effect.entry.title}.`;
  if (effect.kind === 'navigation') return `Opening ${effect.experiment.title}.`;
  if (effect.kind === 'clear') return 'Command transcript cleared.';
  if (effect.kind === 'experiments') return `${effect.experiments.length} experiments listed.`;
  if (effect.kind === 'entries') return `${effect.directories.length + effect.entries.length} ${effect.label} listed.`;
  if (effect.kind === 'tree') return `${effect.lines.length} tree entries listed.`;
  if (effect.kind === 'help') return `${effect.groups.reduce((total, group) => total + group.commands.length, 0)} commands listed.`;
  if (effect.kind === 'grep') return effect.noResults ? `No matches for "${effect.pattern}".` : `${effect.matches.length} grep match${effect.matches.length === 1 ? '' : 'es'} listed.`;
  return effect.lines.at(-1) ?? '';
}

function isTextEffect(effect: TerminalEffect): boolean {
  return effect.kind === 'lines' || effect.kind === 'help' || effect.kind === 'grep' || effect.kind === 'entries' || effect.kind === 'experiments' || effect.kind === 'tree';
}

function publicDocumentFromEntry(entry: TerminalEntry): PublicDocument {
  return Object.freeze({
    kind: entry.kind,
    path: `/${entry.virtualPath}`,
    relativePath: entry.relativePath,
    filename: entry.filename,
    title: entry.title,
    href: entry.href,
    date: entry.date
  });
}

function createTerminalVirtualFs(
  state: TerminalState,
  entries: readonly TerminalEntry[],
  experiments: readonly TerminalExperiment[],
  documents: readonly TerminalTextDocument[]
): ReadonlyVirtualFs {
  return createPublicIndex({
    documents: Object.freeze(entries.map(publicDocumentFromEntry)),
    experiments: Object.freeze(experiments.map((experiment) => Object.freeze({ ...experiment }))),
    textDocuments: Object.freeze(documents.map((document) => Object.freeze({
      path: `/${document.virtualPath}`,
      lines: Object.freeze(document.lines.map(safeRshellLine).filter((line): line is string => line !== undefined))
    }))),
    scratch: Object.freeze(state.scratch.map((file) => Object.freeze({
      name: file.name,
      lines: Object.freeze(file.lines.map(safeRshellLine).filter((line): line is string => line !== undefined))
    })))
  });
}

function shellSessionFromState(state: TerminalState): ReadonlyShellSession {
  const scratch: readonly ReadonlyShellScratchFile[] = Object.freeze(state.scratch.map((file) => Object.freeze({
    name: file.name,
    lines: Object.freeze([...file.lines])
  })));
  const aliases = Object.freeze(state.aliases.map((alias) => Object.freeze({ ...alias })));
  return Object.freeze({ history: Object.freeze([...state.history]), scratch, aliases });
}

function shellCommandMetadata(
  registry: TerminalCommandRegistry,
  session: ReadonlyShellSession
): readonly ShellCommandMetadata[] {
  return Object.freeze(registry.definitions.map((spec): ShellCommandMetadata => {
    const aliases = (session.aliases ?? [])
      .filter((alias) => {
        const resolved = resolveSessionCommand(alias.target, session);
        return resolved !== undefined && registry.resolve(resolved)?.name === spec.name;
      })
      .map(({ name }) => name);
    return Object.freeze({
      name: spec.name,
      aliases: Object.freeze([...spec.aliases, ...aliases]),
      usage: spec.usage,
      summary: spec.summary,
      group: spec.group ?? 'Other',
      order: spec.order ?? Number.MAX_SAFE_INTEGER
    });
  }));
}

function shellProcessContext(context: TerminalCommandContext): ShellProcessContext {
  return Object.freeze({
    ...(context.stdinProvided ? { stdin: textStream(context.stdin) } : {}),
    cwd: virtualPathFromVfsDisplay(context.state.cwd),
    fs: context.fs,
    session: shellSessionFromState(context.state),
    clock: context.now,
    signal: Object.freeze({ aborted: false }),
    commands: shellCommandMetadata(context.registry, shellSessionFromState(context.state)),
    identity: Object.freeze({ ...context.identity })
  });
}

function stateFromShellPatch(state: TerminalState, patch: ShellProcessResult['statePatch']): TerminalState {
  if (patch === undefined) return state;
  if (patch.kind === 'cwd') return Object.freeze({ ...state, cwd: displayVfsPath(patch.cwd) });
  return Object.freeze({
    ...state,
    history: Object.freeze([...patch.session.history]),
    scratch: freezeScratch(patch.session.scratch),
    aliases: Object.freeze((patch.session.aliases ?? state.aliases).map((alias) => Object.freeze({ ...alias })))
  });
}

function adaptShellValue(value: NonNullable<ShellProcessResult['value']>, context: TerminalCommandContext): TerminalEffect | undefined {
  if (value.kind === 'help') {
    return {
      kind: 'help',
      groups: Object.freeze(value.groups.map((group) => Object.freeze({
        name: group.name,
        commands: Object.freeze(group.commands.map((command) => Object.freeze({ ...command })))
      })))
    };
  }
  if (value.kind === 'tree') {
    return {
      kind: 'tree',
      root: value.root,
      lines: Object.freeze([...value.lines]),
      nodes: Object.freeze([...value.nodes])
    };
  }
  if (value.kind === 'document') {
    const entry = entryAt(value.document.path, context.entries);
    return entry === undefined ? undefined : { kind: 'document', entry };
  }
  if (value.kind === 'grep-report') {
    return {
      kind: 'grep',
      pattern: value.report.pattern,
      matches: Object.freeze([...value.report.matches]),
      noResults: value.report.noResults,
      truncated: value.report.truncated
    };
  }
  if (value.kind !== 'directory-listing') return undefined;
  const listing = value.listing;
  if (listing.path === '/lab') {
    const experiments = listing.experiments
      .map(({ id }) => context.experiments.find((experiment) => experiment.id === id))
      .filter((experiment): experiment is TerminalExperiment => experiment !== undefined);
    return { kind: 'experiments', experiments: Object.freeze(experiments) };
  }
  if (listing.path === '/' || listing.path.startsWith('/posts') || listing.path.startsWith('/pages')) {
    const entries = listing.documents
      .map((document) => entryAt(document.path, context.entries))
      .filter((entry): entry is TerminalEntry => entry !== undefined);
    const label = listing.path === '/'
      ? 'root entries'
      : listing.path.startsWith('/pages') ? 'pages' : 'posts';
    return {
      kind: 'entries',
      directories: Object.freeze([...listing.directories]),
      entries: Object.freeze(entries),
      label,
      directory: listing.path
    };
  }
  return undefined;
}

function adaptShellControls(
  controls: NonNullable<ShellProcessResult['controls']>,
  context: TerminalCommandContext
): TerminalEffect | undefined {
  const control = controls[0];
  if (control === undefined || controls.length !== 1) return undefined;
  if (control.kind === 'clear-transcript') return { kind: 'clear' };
  if (control.kind === 'open-document') {
    const entry = entryAt(control.path, context.entries);
    return entry === undefined ? undefined : { kind: 'document-navigation', entry };
  }
  const experiment = context.experiments.find(({ id }) => id === control.id);
  return experiment === undefined ? undefined : { kind: 'navigation', experiment };
}

function adaptShellResult(result: ShellProcessResult, context: TerminalCommandContext, pure: boolean): CommandHandlerResult {
  const nextState = stateFromShellPatch(context.state, result.statePatch);
  if (result.status !== 0) {
    const errorLines = result.stderr.lines.length > 0 ? result.stderr.lines : ['Command failed.'];
    const effect = lines('error', ...errorLines);
    return nextState === context.state ? effect : { state: nextState, effect };
  }
  const structured = result.controls !== undefined && !context.piped && !pure
    ? adaptShellControls(result.controls, context)
    : result.value?.kind === 'grep-report'
    ? adaptShellValue(result.value, context)
    : !context.piped && !pure && result.value !== undefined
      ? adaptShellValue(result.value, context)
      : undefined;
  const effect = structured ?? lines('normal', ...boundedLines(result.stdout.lines));
  return nextState === context.state ? effect : { state: nextState, effect };
}

function executeNeutralCommand(
  command: (context: ShellProcessContext, args: ParsedCommandArguments) => ShellProcessResult,
  args: ParsedCommandArguments,
  context: TerminalCommandContext
): CommandHandlerResult {
  return adaptShellResult(command(shellProcessContext(context), args), context, false);
}

function executeRegisteredStage(
  definition: TerminalCommandDefinition,
  operands: readonly string[],
  stdin: readonly string[],
  stdinProvided: boolean,
  state: TerminalState,
  entries: readonly TerminalEntry[],
  experiments: readonly TerminalExperiment[],
  documents: readonly TerminalTextDocument[],
  identity: TerminalIdentity,
  now: () => Date,
  registry: TerminalCommandRegistry,
  piped: boolean,
  pure: boolean
): RshellOutput {
  const fs = createTerminalVirtualFs(state, entries, experiments, documents);
  const context: TerminalCommandContext = Object.freeze({
    state,
    entries,
    documents,
    experiments,
    fs,
    identity,
    now,
    registry,
    stdin,
    stdinProvided,
    piped
  });
  let result: CommandHandlerResult;
  try {
    result = definition.execute(Object.freeze([...operands]), context);
  } catch {
    if (definition.recoverable === false) throw new Error(`Command "${definition.name}" failed.`);
    return rshellError(state, `Command "${definition.name}" failed.`);
  }
  const nextState = 'effect' in result ? result.state : state;
  const effect = 'effect' in result ? result.effect : result;
  if ((piped || pure) && !isTextEffect(effect)) {
    return rshellError(state, `"${definition.name}" does not produce text for this rshell operation.`);
  }
  const output = boundedLines(stdoutForEffect(effect));
  if (effect.kind === 'lines') {
    return { state: nextState, effect: lines(effect.tone, ...output), stdout: output, error: effect.tone === 'error' };
  }
  if (effect.kind === 'grep') {
    return { state: nextState, effect, stdout: output, error: false };
  }
  if (piped || pure) return { state: nextState, effect: lines('normal', ...output), stdout: output, error: false };
  return { state: nextState, effect, stdout: output, error: false };
}

function executeRshellStage(
  words: readonly string[],
  stageRedirect: RshellStage['redirect'],
  stdin: readonly string[],
  stdinProvided: boolean,
  state: TerminalState,
  entries: readonly TerminalEntry[],
  experiments: readonly TerminalExperiment[],
  documents: readonly TerminalTextDocument[],
  identity: TerminalIdentity,
  now: () => Date,
  registry: TerminalCommandRegistry,
  piped: boolean,
  pure: boolean
): RshellOutput {
  const [command, ...operands] = words;
  if (command === undefined) return rshellError(state, 'A pipeline stage cannot be empty.');
  const resolvedCommand = resolveSessionCommand(command, shellSessionFromState(state));
  const definition = resolvedCommand === undefined ? undefined : registry.resolve(resolvedCommand);
  if (definition === undefined) return rshellError(state, `Unknown command: ${command}. Type "help" for commands.`);
  if (pure && definition.pureText !== true) {
    return rshellError(state, `"${command}" is not allowed in command substitution.`);
  }
  if (piped && definition.standalone === true) {
    return rshellError(state, `"${command}" is a standalone command and cannot be piped.`);
  }
  if (stageRedirect !== undefined && definition.redirect === 'forbidden') {
    return rshellError(state, `"${command}" does not support redirect.`);
  }
  return executeRegisteredStage(
    definition,
    operands,
    stdin,
    stdinProvided,
    state,
    entries,
    experiments,
    documents,
    identity,
    now,
    registry,
    piped,
    pure
  );
}

function canUseNeutralStages(stages: readonly RshellStage[], registry: TerminalCommandRegistry, session: ReadonlyShellSession): boolean {
  if (registry !== DEFAULT_TERMINAL_COMMAND_REGISTRY || stages.length === 0) return false;
  return stages.every((stage) => {
    if (stage.redirect !== undefined) return false;
    const command = stage.words[0];
    if (command === undefined || command.segments.some((segment) => segment.expandSubstitution)) return false;
    const name = command.segments.map(({ value }) => value).join('');
    const resolved = resolveSessionCommand(name, session);
    return resolved !== undefined && NEUTRAL_COMMAND_REGISTRY.resolve(resolved) !== undefined;
  });
}

function executeNeutralStages(
  stages: readonly RshellStage[],
  initialState: TerminalState,
  entries: readonly TerminalEntry[],
  experiments: readonly TerminalExperiment[],
  documents: readonly TerminalTextDocument[],
  identity: TerminalIdentity,
  now: () => Date,
  registry: TerminalCommandRegistry,
  piped: boolean,
  pure: boolean,
  depth: number
): RshellOutput {
  const fs = createTerminalVirtualFs(initialState, entries, experiments, documents);
  const process = runRshell({
    stages,
    cwd: virtualPathFromVfsDisplay(initialState.cwd),
    fs,
    session: shellSessionFromState(initialState),
    clock: now,
    signal: Object.freeze({ aborted: false }),
    registry: NEUTRAL_COMMAND_REGISTRY,
    identity: Object.freeze({ ...identity }),
    pure,
    depth
  });
  const context: TerminalCommandContext = Object.freeze({
    state: initialState,
    entries,
    documents,
    experiments,
    fs,
    identity,
    now,
    registry,
    stdin: Object.freeze([]),
    stdinProvided: false,
    piped
  });
  const adapted = adaptShellResult(process, context, pure);
  const state = 'effect' in adapted ? adapted.state : initialState;
  const effect = 'effect' in adapted ? adapted.effect : adapted;
  if (process.status !== 0) return { state, effect, stdout: Object.freeze([]), error: true };
  if ((piped || pure) && !isTextEffect(effect)) return rshellError(state, 'The command does not produce text for this rshell operation.');
  return { state, effect, stdout: boundedLines(process.stdout.lines), error: false };
}

function executeRshellStages(
  stages: readonly RshellStage[],
  initialState: TerminalState,
  entries: readonly TerminalEntry[],
  experiments: readonly TerminalExperiment[],
  documents: readonly TerminalTextDocument[],
  identity: TerminalIdentity,
  now: () => Date,
  registry: TerminalCommandRegistry,
  pure: boolean,
  depth: number
): RshellOutput {
  if (canUseNeutralStages(stages, registry, shellSessionFromState(initialState))) {
    return executeNeutralStages(stages, initialState, entries, experiments, documents, identity, now, registry, stages.length > 1, pure, depth);
  }
  let state = initialState;
  let stdin: readonly string[] = Object.freeze([]);
  let output: RshellOutput | undefined;
  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index]!;
    const expanded = expandStageWords(stage.words, depth, {
      executeSubstitution: (nestedStages, nestedDepth) => {
        const nested = executeRshellStages(
          nestedStages,
          state,
          entries,
          experiments,
          documents,
          identity,
          now,
          registry,
          true,
          nestedDepth
        );
        return { stdout: nested.stdout, error: nested.error };
      }
    });
    if (!expanded.ok) return rshellError(state, expanded.message);
    output = executeRshellStage(expanded.words, stage.redirect, stdin, index > 0, state, entries, experiments, documents, identity, now, registry, stages.length > 1, pure);
    if (output.error) return output;
    state = output.state;
    stdin = output.stdout;
    if (stage.redirect !== undefined) {
      if (pure || index !== stages.length - 1 || output.effect.kind !== 'lines') return rshellError(state, 'Only final text output can be redirected to rshell scratch.');
      const target = stage.target === undefined ? undefined : normaliseVirtualPath(stage.target, state.cwd);
      const name = target === undefined ? undefined : scratchName(target);
      if (name === undefined) return rshellError(state, 'Redirect only targets /.rshell/tmp/<safe-name>.');
      const existing = state.scratch.find((file) => file.name === name);
      if (existing === undefined && state.scratch.length >= maxScratchFiles) return rshellError(state, `Scratch is limited to ${maxScratchFiles} files.`);
      const written = stage.redirect === 'append' && existing !== undefined ? [...existing.lines, ...output.stdout] : [...output.stdout];
      const bytes = written.reduce((total, line) => total + line.length + 1, 0);
      if (written.length > maxRshellLines || bytes > maxScratchBytes) return rshellError(state, 'Scratch output exceeds the session file limit.');
      state = Object.freeze({ ...state, scratch: freezeScratch([...state.scratch.filter((file) => file.name !== name), { name, lines: Object.freeze(written) }]) });
      output = { state, effect: lines('muted', `Wrote ${written.length} line${written.length === 1 ? '' : 's'} to /.rshell/tmp/${name}.`), stdout: Object.freeze([]), error: false };
    }
  }
  return output ?? rshellError(initialState, 'A pipeline stage cannot be empty.');
}

export function executeCommand(options: {
  readonly state: TerminalState;
  readonly input: string;
  readonly entries: readonly TerminalEntry[];
  readonly experiments?: readonly TerminalExperiment[];
  readonly documents?: readonly TerminalTextDocument[];
  readonly identity?: TerminalIdentity;
  readonly now?: () => Date;
  readonly registry?: TerminalCommandRegistry;
}): CommandResult {
  const input = options.input.trim();
  if (input.length === 0) return { state: options.state, effect: null, announcement: '' };
  const state = withSubmission(options.state, input);
  const parsed = parseRshell(input);
  if (!parsed.ok) return { state, effect: lines('error', parsed.message), announcement: parsed.message };
  const registry = options.registry ?? DEFAULT_TERMINAL_COMMAND_REGISTRY;
  const documents = options.documents ?? Object.freeze([]);
  const effect = executeRshellStages(
    parsed.stages,
    state,
    options.entries,
    options.experiments ?? Object.freeze([]),
    documents,
    options.identity ?? DEFAULT_TERMINAL_IDENTITY,
    options.now ?? (() => new Date()),
    registry,
    false,
    0
  );
  return { state: effect.state, effect: effect.effect, announcement: announcementFor(effect.effect) };
}

export function navigateHistory(state: TerminalState, direction: 'up' | 'down', currentInput: string): { readonly state: TerminalState; readonly input: string } {
  if (state.history.length === 0) return { state, input: currentInput };
  if (direction === 'up') {
    const cursor = state.historyCursor === null ? state.history.length - 1 : Math.max(0, state.historyCursor - 1);
    return { state: Object.freeze({ ...state, historyCursor: cursor, draftInput: state.historyCursor === null ? currentInput : state.draftInput }), input: state.history[cursor] ?? currentInput };
  }
  if (state.historyCursor === null) return { state, input: currentInput };
  if (state.historyCursor >= state.history.length - 1) return { state: Object.freeze({ ...state, historyCursor: null }), input: state.draftInput };
  const cursor = state.historyCursor + 1;
  return { state: Object.freeze({ ...state, historyCursor: cursor }), input: state.history[cursor] ?? currentInput };
}

export function cancelCommandInput(state: TerminalState): TerminalState {
  return Object.freeze({ ...state, historyCursor: null, draftInput: '' });
}

export function completeCommand(
  input: string,
  entries: readonly TerminalEntry[],
  experiments: readonly TerminalExperiment[] = Object.freeze([]),
  registry: TerminalCommandRegistry = DEFAULT_TERMINAL_COMMAND_REGISTRY,
  cwd = DEFAULT_TERMINAL_IDENTITY.workingDirectory,
  aliases: readonly TerminalAlias[] = Object.freeze([])
): CompletionResult {
  if (!input.includes(' ')) {
    const tokens = registry.definitions.flatMap(({ name, aliases: builtInAliases }) => [name, ...builtInAliases]);
    tokens.push(...aliases.map(({ name }) => name));
    return completeFrom(input, tokens, (candidate) => `${candidate} `);
  }
  const match = /^(\S+)\s+([^\s]*)$/u.exec(input);
  if (match === null) return { kind: 'none', candidates: Object.freeze([]) };
  const invokedName = match[1]!;
  const resolvedName = resolveSessionCommand(invokedName, { aliases });
  const definition = resolvedName === undefined ? undefined : registry.resolve(resolvedName);
  if (definition?.complete === undefined) return { kind: 'none', candidates: Object.freeze([]) };
  return definition.complete(match[2] ?? '', { entries, experiments, cwd }, invokedName);
}
