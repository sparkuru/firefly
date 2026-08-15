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

export interface TerminalState {
  readonly history: readonly string[];
  readonly historyCursor: number | null;
  readonly draftInput: string;
  readonly cwd: string;
  readonly scratch: readonly TerminalScratchFile[];
}

export type TerminalTone = 'normal' | 'muted' | 'error';

export type TerminalEffect =
  | { readonly kind: 'lines'; readonly tone: TerminalTone; readonly lines: readonly string[] }
  | { readonly kind: 'entries'; readonly entries: readonly TerminalEntry[]; readonly label: string }
  | { readonly kind: 'experiments'; readonly experiments: readonly TerminalExperiment[] }
  | { readonly kind: 'navigation'; readonly experiment: TerminalExperiment }
  | { readonly kind: 'document'; readonly entry: TerminalEntry }
  | { readonly kind: 'document-navigation'; readonly entry: TerminalEntry }
  | { readonly kind: 'tree'; readonly root: string; readonly lines: readonly string[] }
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
  readonly experiments: readonly TerminalExperiment[];
  readonly identity: TerminalIdentity;
  readonly now: () => Date;
  readonly registry: TerminalCommandRegistry;
  readonly stdin: readonly string[];
  readonly stdinProvided: boolean;
  readonly piped: boolean;
}

export type CommandHandler = (
  operands: readonly string[],
  context: TerminalCommandContext
) => TerminalEffect;

export type CompletionHandler = (
  operand: string,
  context: Pick<TerminalCommandContext, 'entries' | 'experiments'>,
  invokedName: string
) => CompletionResult;

export interface TerminalCommandDefinition {
  readonly name: string;
  readonly aliases: readonly string[];
  readonly summary: string;
  readonly usage: string;
  readonly execute: CommandHandler;
  readonly complete?: CompletionHandler;
  readonly pureText?: boolean;
}

export interface TerminalCommandRegistry {
  readonly definitions: readonly TerminalCommandDefinition[];
  resolve(name: string): TerminalCommandDefinition | undefined;
}

export const DEFAULT_TERMINAL_IDENTITY: TerminalIdentity = Object.freeze({
  user: 'guest',
  host: 'f1refly',
  workingDirectory: '~/blog/posts',
  about: 'A static garden for notes, experiments, and durable web writing.'
});

export const DEFAULT_TERMINAL_PROMPT =
  `${DEFAULT_TERMINAL_IDENTITY.user}@${DEFAULT_TERMINAL_IDENTITY.host}:${DEFAULT_TERMINAL_IDENTITY.workingDirectory} $`;

const commandToken = /^[a-z][a-z0-9-]*$/u;
const unsafePathSegment = /[\\/?#%\u0000-\u001f\u007f]/u;
const standaloneRshellCommands = new Set(['cd', 'clear', 'open', 'vim']);
const pureTextRshellCommands = new Set([
  'help',
  '?',
  'ls',
  'cat',
  'tree',
  'about',
  'pwd',
  'whoami',
  'id',
  'date',
  'history',
  'alias',
  'grep'
]);

export function createTerminalState(): TerminalState {
  return Object.freeze({
    history: Object.freeze([]),
    historyCursor: null,
    draftInput: '',
    cwd: DEFAULT_TERMINAL_IDENTITY.workingDirectory,
    scratch: Object.freeze([])
  });
}

export function formatTerminalPrompt(
  identity: TerminalIdentity,
  state: Pick<TerminalState, 'cwd'>
): string {
  return `${identity.user}@${identity.host}:${state.cwd} $`;
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
  if (href !== `/${virtualPath.slice(0, -3)}/`) throw new TypeError(`Terminal entry ${index} has a non-canonical href.`);
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

export function tokenizeCommand(input: string): TokenizeResult {
  const tokens = [];
  let token = '';
  let quote: "'" | '"' | null = null;
  let started = false;
  for (const character of input) {
    if (quote !== null) {
      if (character === quote) quote = null;
      else token += character;
      started = true;
    } else if (character === "'" || character === '"') {
      quote = character;
      started = true;
    } else if (/\s/u.test(character)) {
      if (started) { tokens.push(token); token = ''; started = false; }
    } else { token += character; started = true; }
  }
  if (quote !== null) return { ok: false, message: 'Unbalanced quote. Close the quote and try again.' };
  if (started) tokens.push(token);
  return { ok: true, tokens: Object.freeze(tokens) };
}

function lines(tone: TerminalTone, ...values: string[]): TerminalEffect {
  return Object.freeze({ kind: 'lines', tone, lines: Object.freeze(values) });
}

function usage(definition: TerminalCommandDefinition): TerminalEffect {
  return lines('error', `Usage: ${definition.usage}`);
}

function completeFrom(
  prefix: string,
  candidates: readonly string[],
  render: (candidate: string) => string,
  ownsAmbiguousTab = false
): CompletionResult {
  const matches = [...new Set(candidates)].filter((candidate) => candidate.startsWith(prefix)).sort();
  if (matches.length === 1 && matches[0] !== undefined) return { kind: 'unique', value: render(matches[0]), candidates: Object.freeze(matches) };
  return matches.length > 1
    ? { kind: 'ambiguous', candidates: Object.freeze(matches), ownsTab: ownsAmbiguousTab }
    : { kind: 'none', candidates: Object.freeze([]) };
}

function validPathOperand(operand: string): boolean {
  return operand.length > 0 && operand.normalize('NFC') === operand && !operand.includes('%') && !operand.includes('\\') && !operand.includes('?') && !operand.includes('#') && !operand.includes('://') && !/[\u0000-\u001f\u007f]/u.test(operand) && !operand.split('/').some((segment, index) => (segment === '' && index !== 0) || segment === '.' || segment === '..' || segment.startsWith('.'));
}

function resolveDocumentOperand(operand: string, entries: readonly TerminalEntry[]): TerminalEntry | undefined {
  let virtualPath: string;
  if (operand.startsWith('/')) {
    const candidate = operand.slice(1);
    if (!validPathOperand(candidate) || (!candidate.startsWith('posts/') && !candidate.startsWith('pages/'))) return undefined;
    virtualPath = candidate;
  } else {
    const candidate = operand.startsWith('./') ? operand.slice(2) : operand;
    if (!validPathOperand(candidate) || operand.startsWith('././')) return undefined;
    virtualPath = `posts/${candidate}`;
  }
  return entries.find((entry) => entry.virtualPath === virtualPath);
}

function pathCompletion(operand: string, entries: readonly TerminalEntry[], invokedName: string): CompletionResult {
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
  const candidatePaths = entries
    .filter((entry) => absolute || entry.kind === 'post')
    .map((entry) => absolute ? entry.virtualPath : entry.relativePath);
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

export function formatDocumentOperand(entry: TerminalEntry): string {
  return entry.kind === 'post' ? entry.relativePath : `/${entry.virtualPath}`;
}

interface TreeNode { readonly directories: Map<string, TreeNode>; readonly files: string[] }

function renderTree(entries: readonly TerminalEntry[], operand: string | undefined): { root: string; lines: readonly string[] } | undefined {
  const mount = operand === undefined ? 'posts' : operand === '/' ? '' : operand === '/posts' ? 'posts' : operand === '/pages' ? 'pages' : null;
  if (mount === null) return undefined;
  const root: TreeNode = { directories: new Map(), files: [] };
  for (const entry of entries) {
    const segments = entry.virtualPath.split('/');
    if (mount !== '' && segments.shift() !== mount) continue;
    let node = root;
    const filename = segments.pop();
    if (filename === undefined) continue;
    for (const segment of segments) {
      let child = node.directories.get(segment);
      if (child === undefined) { child = { directories: new Map(), files: [] }; node.directories.set(segment, child); }
      node = child;
    }
    node.files.push(filename);
  }
  if (mount === '') {
    for (const collection of ['posts', 'pages'] as const) {
      const collectionNode: TreeNode = { directories: new Map(), files: [] };
      for (const entry of entries.filter(({ kind }) => kind === (collection === 'posts' ? 'post' : 'page'))) {
        const segments = entry.relativePath.split('/');
        const filename = segments.pop();
        let node = collectionNode;
        for (const segment of segments) {
          let child = node.directories.get(segment);
          if (child === undefined) { child = { directories: new Map(), files: [] }; node.directories.set(segment, child); }
          node = child;
        }
        if (filename) node.files.push(filename);
      }
      root.directories.set(collection, collectionNode);
    }
  }
  const output: string[] = [];
  const visit = (node: TreeNode, prefix: string) => {
    const children = [
      ...[...node.directories].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([name, child]) => ({ name: `${name}/`, child })),
      ...node.files.sort().map((name) => ({ name, child: undefined }))
    ];
    children.forEach((child, index) => {
      const last = index === children.length - 1;
      output.push(`${prefix}${last ? '└──' : '├──'} ${child.name}`);
      if (child.child) visit(child.child, `${prefix}${last ? '    ' : '│   '}`);
    });
  };
  visit(root, '');
  return { root: operand ?? '~/blog/posts', lines: Object.freeze(output) };
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
      (definition.pureText !== undefined && typeof definition.pureText !== 'boolean')) {
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

type DefaultCommandHandler = (
  operands: readonly string[],
  context: TerminalCommandContext,
  invalidUsage: () => TerminalEffect
) => TerminalEffect;

function define(name: string, summary: string, usageText: string, handler: DefaultCommandHandler, complete?: CompletionHandler, aliases: readonly string[] = Object.freeze([])): TerminalCommandDefinition {
  let definition: TerminalCommandDefinition;
  const execute: CommandHandler = (operands, context) => handler(operands, context, () => usage(definition));
  definition = {
    name,
    aliases: Object.freeze([...aliases]),
    summary,
    usage: usageText,
    execute,
    pureText: pureTextRshellCommands.has(name),
    ...(complete ? { complete } : {})
  };
  return definition;
}

const definitions = [
  define('help', 'show this command list', 'help', (operands, context, invalidUsage) => operands.length === 0
    ? lines('normal', ...context.registry.definitions.map((item) => `${item.usage}${item.aliases.length ? ` (${item.aliases.join(', ')})` : ''} — ${item.summary}`))
    : invalidUsage(), undefined, Object.freeze(['?'])),
  define('ls', 'list a public or session virtual directory', 'ls [path]', (operands, context, invalidUsage) => {
    if (operands.length > 1 || (operands[0] !== undefined && !['posts', 'pages', 'lab'].includes(operands[0]))) return invalidUsage();
    if (operands[0] === 'lab') return { kind: 'experiments', experiments: Object.freeze([...context.experiments]) };
    const kind = operands[0] === 'posts' ? 'post' : operands[0] === 'pages' ? 'page' : null;
    return { kind: 'entries', entries: Object.freeze(context.entries.filter((entry) => kind === null || entry.kind === kind)), label: operands[0] ?? 'all documents' };
  }, (operand, _context, invoked) => completeFrom(operand, ['posts', 'pages', 'lab'], (candidate) => `${invoked} ${candidate}`)),
  define('open', 'open a listed experiment', 'open lab/<id>', (operands, context, invalidUsage) => {
    if (operands.length !== 1 || !operands[0]?.startsWith('lab/')) return invalidUsage();
    const experiment = context.experiments.find(({ id }) => operands[0] === `lab/${id}`);
    return experiment ? { kind: 'navigation', experiment } : lines('error', `No listed experiment named "${operands[0]}". Try "ls lab".`);
  }, (operand, context, invoked) => completeFrom(operand, context.experiments.map(({ id }) => `lab/${id}`), (candidate) => `${invoked} ${candidate}`)),
  define('cat', 'render a public document or stream a readable rshell resource', 'cat [path]', (operands, context, invalidUsage) => {
    if (operands.length !== 1) return invalidUsage();
    const entry = resolveDocumentOperand(operands[0]!, context.entries);
    return entry ? { kind: 'document', entry } : lines('error', `No public document named "${operands[0]}". Relative paths resolve under posts; pages require /pages/<path>.md. Try "tree" or "tree /".`);
  }, (operand, context, invoked) => pathCompletion(operand, context.entries, invoked)),
  define('vim', 'open a listed public document reader', 'vim <path>', (operands, context, invalidUsage) => {
    if (operands.length !== 1) return invalidUsage();
    const entry = resolveDocumentOperand(operands[0]!, context.entries);
    return entry ? { kind: 'document-navigation', entry } : lines('error', `No public document named "${operands[0]}". Relative paths resolve under posts; pages require /pages/<path>.md. Try "tree" or "tree /".`);
  }, (operand, context, invoked) => pathCompletion(operand, context.entries, invoked)),
  define('tree', 'show a public content subtree', 'tree [path]', (operands, context, invalidUsage) => {
    if (operands.length > 1) return invalidUsage();
    const tree = renderTree(context.entries, operands[0]);
    return tree ? { kind: 'tree', root: tree.root, lines: tree.lines } : invalidUsage();
  }, (operand, _context, invoked) => completeFrom(operand, ['/', '/posts', '/pages'], (candidate) => `${invoked} ${candidate}`)),
  define('about', 'describe this site', 'about', (operands, context, invalidUsage) => operands.length === 0 ? lines('normal', context.identity.about) : invalidUsage()),
  define('cd', 'change the read-only virtual directory', 'cd [path]', (operands, _context, invalidUsage) => operands.length <= 1 ? lines('normal', 'cd is available in the rshell session.') : invalidUsage()),
  define('pwd', 'print the current path', 'pwd', (operands, context, invalidUsage) => operands.length === 0 ? lines('normal', context.identity.workingDirectory) : invalidUsage()),
  define('whoami', 'print the current user', 'whoami', (operands, context, invalidUsage) => operands.length === 0 ? lines('normal', context.identity.user) : invalidUsage()),
  define('id', 'show the guest identity and read-only capability boundary', 'id', (operands, context, invalidUsage) => operands.length === 0 ? lines('normal', `${context.identity.user} (read-only public posts, pages, and lab)`) : invalidUsage()),
  define('date', 'print the UTC clock', 'date', (operands, context, invalidUsage) => operands.length === 0 ? lines('normal', formatUtcDate(context.now())) : invalidUsage()),
  define('history', 'show recent commands', 'history', (operands, context, invalidUsage) => operands.length === 0 ? lines('muted', ...context.state.history.map((item, index) => `${index + 1}  ${item}`)) : invalidUsage()),
  define('alias', 'list or query built-in aliases', 'alias [name]', (operands, context, invalidUsage) => operands.length <= 1 ? lines('normal', ...context.registry.definitions.flatMap((item) => item.aliases.map((alias) => `${alias}=${item.name}`))) : invalidUsage()),
  define('grep', 'filter stdin or public text with a safe regular subset', 'grep [-inF] <pattern> [path ...]', (operands, _context, invalidUsage) => operands.length >= 1 ? lines('normal', 'grep is available in the rshell session.') : invalidUsage()),
  define('clear', 'clear the screen', 'clear', (operands, _context, invalidUsage) => operands.length === 0 ? { kind: 'clear' } : invalidUsage())
];

export const DEFAULT_TERMINAL_COMMAND_REGISTRY = createTerminalCommandRegistry(definitions);
export const TERMINAL_COMMANDS = Object.freeze(definitions.map(({ name }) => name));
const defaultRshellHandlers: ReadonlyMap<string, CommandHandler> = new Map(
  definitions.map((definition) => [definition.name, definition.execute])
);

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
const maxRshellInput = 8_000;
const maxRshellStages = 8;
const maxRshellLines = 240;
const maxRshellText = 24_000;
const maxScratchFiles = 16;
const maxScratchBytes = 12_000;
const maxSubstitutionDepth = 4;
const maxGrepResources = 256;
const maxGrepLines = 50_000;

interface RshellWordSegment {
  readonly value: string;
  readonly expandSubstitution: boolean;
}

interface RshellWord {
  readonly segments: readonly RshellWordSegment[];
}

interface RshellStage {
  readonly words: readonly RshellWord[];
  readonly redirect?: 'replace' | 'append';
  readonly target?: string;
}

interface RshellParseSuccess { readonly ok: true; readonly stages: readonly RshellStage[] }
interface RshellParseFailure { readonly ok: false; readonly message: string }
type RshellParseResult = RshellParseSuccess | RshellParseFailure;

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

function readSubstitution(source: string, start: number): { readonly end: number; readonly value: string } | undefined {
  let depth = 1;
  let quote: "'" | '"' | null = null;
  for (let index = start + 2; index < source.length; index += 1) {
    const character = source[index]!;
    if (quote !== null) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') { quote = character; continue; }
    if (character === '$' && source[index + 1] === '(') { depth += 1; index += 1; continue; }
    if (character === ')') {
      depth -= 1;
      if (depth === 0) return { end: index + 1, value: source.slice(start + 2, index) };
    }
  }
  return undefined;
}

function parseRshell(input: string): RshellParseResult {
  if (input.length > maxRshellInput) return { ok: false, message: `Command input is limited to ${maxRshellInput} characters.` };
  const stages: RshellStage[] = [];
  let words: RshellWord[] = [];
  let segments: RshellWordSegment[] = [];
  let word = '';
  let wordExpands = true;
  let started = false;
  let quote: "'" | '"' | null = null;
  let redirect: 'replace' | 'append' | undefined;
  let target: string | undefined;
  const append = (value: string, expandSubstitution: boolean): void => {
    if (word.length > 0 && wordExpands !== expandSubstitution) {
      segments.push(Object.freeze({ value: word, expandSubstitution: wordExpands }));
      word = '';
    }
    wordExpands = expandSubstitution;
    word += value;
  };
  const flush = (): string | undefined => {
    if (!started) return undefined;
    if (word.length > 0) {
      segments.push(Object.freeze({ value: word, expandSubstitution: wordExpands }));
    }
    const value = segments.map(({ value: segment }) => segment).join('');
    const parsedWord = Object.freeze({ segments: Object.freeze([...segments]) });
    segments = [];
    word = '';
    wordExpands = true;
    started = false;
    if (redirect !== undefined && target === undefined) target = value;
    else if (redirect !== undefined) return 'A redirect accepts exactly one target.';
    else words.push(parsedWord);
    return undefined;
  };
  const finishStage = (): string | undefined => {
    const failure = flush();
    if (failure !== undefined) return failure;
    if (words.length === 0) return 'A pipeline stage cannot be empty.';
    if (redirect !== undefined && target === undefined) return 'A redirect needs a scratch target.';
    stages.push(Object.freeze({ words: Object.freeze(words), ...(redirect ? { redirect, target } : {}) }));
    words = [];
    redirect = undefined;
    target = undefined;
    return undefined;
  };
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]!;
    if (quote === "'") {
      if (character === quote) {
        if (word.length > 0) {
          segments.push(Object.freeze({ value: word, expandSubstitution: false }));
          word = '';
        }
        quote = null;
        wordExpands = true;
      } else append(character, false);
      started = true;
      continue;
    }
    if (quote === '"') {
      if (character === quote) {
        if (word.length > 0) {
          segments.push(Object.freeze({ value: word, expandSubstitution: true }));
          word = '';
        }
        quote = null;
      } else if (character === '$' && input[index + 1] === '(') {
        const substitution = readSubstitution(input, index);
        if (substitution === undefined) return { ok: false, message: 'Unbalanced command substitution. Close $(...) and try again.' };
        append(input.slice(index, substitution.end), true);
        index = substitution.end - 1;
      } else {
        append(character, true);
      }
      started = true;
      continue;
    }
    if (character === "'" || character === '"') {
      if (word.length > 0) {
        segments.push(Object.freeze({ value: word, expandSubstitution: true }));
        word = '';
      }
      quote = character;
      wordExpands = character === '"';
      started = true;
      continue;
    }
    if (character === '$' && input[index + 1] === '(') {
      const substitution = readSubstitution(input, index);
      if (substitution === undefined) return { ok: false, message: 'Unbalanced command substitution. Close $(...) and try again.' };
      append(input.slice(index, substitution.end), true);
      started = true;
      index = substitution.end - 1;
      continue;
    }
    if (/\s/u.test(character)) {
      const failure = flush();
      if (failure !== undefined) return { ok: false, message: failure };
      continue;
    }
    if (character === '|') {
      if (redirect !== undefined) return { ok: false, message: 'Redirection is allowed only on the final pipeline stage.' };
      const failure = finishStage();
      if (failure !== undefined) return { ok: false, message: failure };
      continue;
    }
    if (character === '>') {
      const failure = flush();
      if (failure !== undefined) return { ok: false, message: failure };
      if (words.length === 0 || redirect !== undefined) return { ok: false, message: 'Redirection follows a command and has one target.' };
      redirect = input[index + 1] === '>' ? 'append' : 'replace';
      if (redirect === 'append') index += 1;
      continue;
    }
    append(character, true);
    started = true;
  }
  if (quote !== null) return { ok: false, message: 'Unbalanced quote. Close the quote and try again.' };
  const failure = finishStage();
  if (failure !== undefined) return { ok: false, message: failure };
  if (stages.length > maxRshellStages) return { ok: false, message: `At most ${maxRshellStages} pipeline stages are allowed.` };
  return { ok: true, stages: Object.freeze(stages) };
}

function safeRshellLine(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 4_000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) return undefined;
  return value.normalize('NFC').replaceAll(/\s+/gu, ' ').trim();
}

function publicTextByPath(
  documents: readonly TerminalTextDocument[] | undefined,
  entries: readonly TerminalEntry[]
): ReadonlyMap<string, readonly string[]> {
  const paths = new Set(entries.map(({ virtualPath }) => virtualPath));
  const result = new Map<string, readonly string[]>();
  for (const document of documents ?? []) {
    if (!paths.has(document.virtualPath) || result.has(document.virtualPath)) continue;
    const normalized = document.lines.map(safeRshellLine).filter((line): line is string => line !== undefined && line.length > 0);
    result.set(document.virtualPath, Object.freeze(normalized));
  }
  for (const entry of entries) {
    if (!result.has(entry.virtualPath)) {
      const title = safeRshellLine(entry.title);
      result.set(entry.virtualPath, title === undefined ? Object.freeze([]) : Object.freeze([title]));
    }
  }
  return result;
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

function displayVirtualPath(path: string): string {
  return path === '/' ? rshellRoot : `${rshellRoot}${path}`;
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

function listDirectory(path: string, entries: readonly TerminalEntry[], experiments: readonly TerminalExperiment[], scratch: readonly TerminalScratchFile[]): readonly string[] | undefined {
  const directories = knownDirectories(entries, scratch);
  if (!directories.has(path)) return undefined;
  if (path === '/lab') return Object.freeze(experiments.map(({ id }) => `${id}/`).sort());
  const prefix = path === '/' ? '/' : `${path}/`;
  const children = new Set<string>();
  for (const directory of directories) {
    if (!directory.startsWith(prefix) || directory === path) continue;
    const remaining = directory.slice(prefix.length);
    if (!remaining.includes('/') && !(path === '/' && remaining === '.rshell')) children.add(`${remaining}/`);
  }
  for (const entry of entries) {
    const full = `/${entry.virtualPath}`;
    if (!full.startsWith(prefix)) continue;
    const remaining = full.slice(prefix.length);
    if (!remaining.includes('/')) children.add(remaining);
  }
  if (path === '/.rshell/tmp') for (const file of scratch) children.add(file.name);
  return Object.freeze([...children].sort());
}

interface RshellTreeNode {
  readonly directories: Map<string, RshellTreeNode>;
  readonly files: Set<string>;
}

function renderRshellTree(
  path: string,
  entries: readonly TerminalEntry[],
  experiments: readonly TerminalExperiment[]
): { readonly root: string; readonly lines: readonly string[] } | undefined {
  if (path.startsWith('/.rshell') || !knownDirectories(entries, Object.freeze([])).has(path)) return undefined;
  const root: RshellTreeNode = { directories: new Map(), files: new Set() };
  const addDirectory = (segments: readonly string[]): void => {
    let node = root;
    for (const segment of segments) {
      let child = node.directories.get(segment);
      if (child === undefined) {
        child = { directories: new Map(), files: new Set() };
        node.directories.set(segment, child);
      }
      node = child;
    }
  };
  const addResource = (resourcePath: string): void => {
    const prefix = path === '/' ? '/' : `${path}/`;
    if (!resourcePath.startsWith(prefix) || resourcePath === path) return;
    const segments = resourcePath.slice(prefix.length).split('/');
    const filename = segments.pop();
    if (filename === undefined || filename.length === 0) return;
    let node = root;
    for (const segment of segments) {
      let child = node.directories.get(segment);
      if (child === undefined) {
        child = { directories: new Map(), files: new Set() };
        node.directories.set(segment, child);
      }
      node = child;
    }
    node.files.add(filename);
  };

  if (path === '/') {
    addDirectory(['posts']);
    addDirectory(['pages']);
    addDirectory(['lab']);
  }
  for (const entry of entries) addResource(`/${entry.virtualPath}`);
  if (path === '/lab' || path === '/') {
    for (const experiment of experiments) {
      const segments = path === '/' ? ['lab', experiment.id] : [experiment.id];
      addDirectory(segments);
    }
  }

  const output: string[] = [];
  const compare = (left: string, right: string): number => left < right ? -1 : left > right ? 1 : 0;
  const visit = (node: RshellTreeNode, prefix: string): void => {
    const children = [
      ...[...node.directories].sort(([left], [right]) => compare(left, right)).map(([name, child]) => ({ name: `${name}/`, child })),
      ...[...node.files].sort(compare).map((name) => ({ name, child: undefined }))
    ];
    children.forEach((child, index) => {
      const last = index === children.length - 1;
      output.push(`${prefix}${last ? '└──' : '├──'} ${child.name}`);
      if (child.child !== undefined) visit(child.child, `${prefix}${last ? '    ' : '│   '}`);
    });
  };
  visit(root, '');
  return Object.freeze({ root: displayVirtualPath(path), lines: Object.freeze(output) });
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

function readTextResource(path: string, entries: readonly TerminalEntry[], corpus: ReadonlyMap<string, readonly string[]>, scratch: readonly TerminalScratchFile[]): readonly string[] | undefined {
  const entry = entryAt(path, entries);
  if (entry !== undefined) return corpus.get(entry.virtualPath);
  const name = scratchName(path);
  return name === undefined ? undefined : scratch.find((file) => file.name === name)?.lines;
}

function resourcePaths(path: string, entries: readonly TerminalEntry[], scratch: readonly TerminalScratchFile[]): readonly string[] | undefined {
  const entry = entryAt(path, entries);
  if (entry !== undefined || scratchName(path) !== undefined) return Object.freeze([path]);
  const directories = knownDirectories(entries, scratch);
  if (!directories.has(path)) return undefined;
  const prefix = path === '/' ? '/' : `${path}/`;
  const publicPaths = entries.map((item) => `/${item.virtualPath}`).filter((item) => item.startsWith(prefix));
  const scratchPaths = scratch.map((item) => `/.rshell/tmp/${item.name}`).filter((item) => item.startsWith(prefix));
  return Object.freeze([...publicPaths, ...scratchPaths].sort());
}

type RegexAtom =
  | { readonly type: 'literal'; readonly value: string }
  | { readonly type: 'any' }
  | { readonly type: 'class'; readonly inverted: boolean; readonly items: readonly (readonly [string, string])[] }
  | { readonly type: 'start' }
  | { readonly type: 'end' }
  | { readonly type: 'concat'; readonly values: readonly RegexAtom[] }
  | { readonly type: 'alt'; readonly values: readonly RegexAtom[] }
  | { readonly type: 'repeat'; readonly value: RegexAtom; readonly minimum: number; readonly maximum: number | null };

interface RegexParser { readonly characters: readonly string[]; index: number; depth: number; readonly insensitive: boolean }

function escapedAtom(character: string): RegexAtom | undefined {
  const range = (first: string, last: string): readonly [string, string] => Object.freeze([first, last]);
  if (character === 'd') return { type: 'class', inverted: false, items: Object.freeze([range('0', '9')]) };
  if (character === 'D') return { type: 'class', inverted: true, items: Object.freeze([range('0', '9')]) };
  if (character === 'w') return { type: 'class', inverted: false, items: Object.freeze([range('0', '9'), range('A', 'Z'), range('a', 'z'), range('_', '_')]) };
  if (character === 'W') return { type: 'class', inverted: true, items: Object.freeze([range('0', '9'), range('A', 'Z'), range('a', 'z'), range('_', '_')]) };
  if (character === 's') return { type: 'class', inverted: false, items: Object.freeze([range(' ', ' '), range('\t', '\t')]) };
  if (character === 'S') return { type: 'class', inverted: true, items: Object.freeze([range(' ', ' '), range('\t', '\t')]) };
  if ('123456789'.includes(character)) return undefined;
  return { type: 'literal', value: character };
}

function parseClass(parser: RegexParser): RegexAtom | undefined {
  let inverted = false;
  if (parser.characters[parser.index] === '^') { inverted = true; parser.index += 1; }
  const items: (readonly [string, string])[] = [];
  while (parser.index < parser.characters.length && parser.characters[parser.index] !== ']') {
    let first = parser.characters[parser.index++]!;
    if (first === '\\') {
      const escaped = parser.characters[parser.index++];
      if (escaped === undefined) return undefined;
      const special = escapedAtom(escaped);
      if (special?.type === 'class' && !special.inverted) { items.push(...special.items); continue; }
      if (special === undefined || special.type !== 'literal') return undefined;
      first = special.value;
    }
    let last = first;
    if (parser.characters[parser.index] === '-' && parser.characters[parser.index + 1] !== ']' && parser.characters[parser.index + 1] !== undefined) {
      parser.index += 1;
      last = parser.characters[parser.index++]!;
      if (last === '\\') return undefined;
      if (first.codePointAt(0)! > last.codePointAt(0)!) return undefined;
    }
    items.push(Object.freeze([first, last] as [string, string]));
  }
  if (parser.characters[parser.index] !== ']' || items.length === 0) return undefined;
  parser.index += 1;
  return { type: 'class', inverted, items: Object.freeze(items) };
}

function parseRegexAtom(parser: RegexParser): RegexAtom | undefined {
  const character = parser.characters[parser.index++];
  if (character === undefined) return { type: 'concat', values: Object.freeze([]) };
  if (character === '.') return { type: 'any' };
  if (character === '^') return { type: 'start' };
  if (character === '$') return { type: 'end' };
  if (character === '[') return parseClass(parser);
  if (character === '\\') {
    const escaped = parser.characters[parser.index++];
    return escaped === undefined ? undefined : escapedAtom(escaped);
  }
  if (character === '(') {
    if (parser.characters[parser.index] === '?') return undefined;
    if (parser.depth >= 16) return undefined;
    parser.depth += 1;
    const inner = parseRegexAlternation(parser);
    parser.depth -= 1;
    if (parser.characters[parser.index] !== ')') return undefined;
    parser.index += 1;
    return inner;
  }
  if (character === ')' || character === '|' || character === '*' || character === '+' || character === '?' || character === '{' || character === '}') return undefined;
  return { type: 'literal', value: character };
}

function parseRepeat(parser: RegexParser): RegexAtom | undefined {
  let value = parseRegexAtom(parser);
  if (value === undefined) return undefined;
  const marker = parser.characters[parser.index];
  if (marker === '*') { parser.index += 1; return { type: 'repeat', value, minimum: 0, maximum: null }; }
  if (marker === '+') { parser.index += 1; return { type: 'repeat', value, minimum: 1, maximum: null }; }
  if (marker === '?') { parser.index += 1; return { type: 'repeat', value, minimum: 0, maximum: 1 }; }
  if (marker !== '{') return value;
  parser.index += 1;
  const digits = (): number | undefined => {
    let raw = '';
    while (parser.characters[parser.index] !== undefined && '0123456789'.includes(parser.characters[parser.index]!)) raw += parser.characters[parser.index++]!;
    return raw.length === 0 ? undefined : Number(raw);
  };
  const minimum = digits();
  if (minimum === undefined || minimum > 64) return undefined;
  let maximum: number | null = minimum;
  if (parser.characters[parser.index] === ',') { parser.index += 1; maximum = parser.characters[parser.index] === '}' ? null : digits() ?? -1; }
  if (parser.characters[parser.index] !== '}' || maximum === -1 || (maximum !== null && (maximum < minimum || maximum > 64))) return undefined;
  parser.index += 1;
  value = { type: 'repeat', value, minimum, maximum };
  return value;
}

function parseRegexSequence(parser: RegexParser): RegexAtom | undefined {
  const values: RegexAtom[] = [];
  while (parser.index < parser.characters.length && parser.characters[parser.index] !== ')' && parser.characters[parser.index] !== '|') {
    const value = parseRepeat(parser);
    if (value === undefined) return undefined;
    values.push(value);
  }
  return { type: 'concat', values: Object.freeze(values) };
}

function parseRegexAlternation(parser: RegexParser): RegexAtom | undefined {
  const values: RegexAtom[] = [];
  const first = parseRegexSequence(parser);
  if (first === undefined) return undefined;
  values.push(first);
  while (parser.characters[parser.index] === '|') {
    parser.index += 1;
    const next = parseRegexSequence(parser);
    if (next === undefined) return undefined;
    values.push(next);
  }
  return values.length === 1 ? values[0] : { type: 'alt', values: Object.freeze(values) };
}

type RegexState =
  | { readonly kind: 'char'; readonly value: string; to: number }
  | { readonly kind: 'any'; to: number }
  | { readonly kind: 'class'; readonly inverted: boolean; readonly items: readonly (readonly [string, string])[]; to: number }
  | { readonly kind: 'start'; to: number }
  | { readonly kind: 'end'; to: number }
  | { readonly kind: 'epsilon'; to: number }
  | { readonly kind: 'split'; to: number; alternate: number }
  | { readonly kind: 'match' };

interface Fragment { readonly start: number; readonly outs: readonly (readonly [number, 'to' | 'alternate'])[] }

function compileSafeRegex(pattern: string, insensitive: boolean): { readonly test: (line: string) => boolean } | undefined {
  if (pattern.length === 0 || pattern.length > 256) return undefined;
  const parser: RegexParser = { characters: Object.freeze([...pattern]), index: 0, depth: 0, insensitive };
  const ast = parseRegexAlternation(parser);
  if (ast === undefined || parser.index !== parser.characters.length) return undefined;
  const states: RegexState[] = [];
  const add = (state: RegexState): number => { states.push(state); return states.length - 1; };
  const out = (index: number, key: 'to' | 'alternate'): readonly [number, 'to' | 'alternate'] => Object.freeze([index, key]);
  const patch = (outs: readonly (readonly [number, 'to' | 'alternate'])[], target: number): void => {
    for (const [index, key] of outs) {
      const state = states[index]!;
      if (key === 'alternate') {
        if (state.kind !== 'split') throw new TypeError('Invalid regular-expression branch.');
        state.alternate = target;
      } else {
        if (!('to' in state)) throw new TypeError('Invalid regular-expression transition.');
        state.to = target;
      }
    }
  };
  const join = (values: readonly RegexAtom[]): Fragment => {
    if (values.length === 0) { const start = add({ kind: 'epsilon', to: -1 }); return { start, outs: Object.freeze([out(start, 'to')]) }; }
    let fragment = compile(values[0]!);
    for (const value of values.slice(1)) { const next = compile(value); patch(fragment.outs, next.start); fragment = { start: fragment.start, outs: next.outs }; }
    return fragment;
  };
  const compile = (node: RegexAtom): Fragment => {
    if (node.type === 'literal') { const start = add({ kind: 'char', value: node.value, to: -1 }); return { start, outs: Object.freeze([out(start, 'to')]) }; }
    if (node.type === 'any') { const start = add({ kind: 'any', to: -1 }); return { start, outs: Object.freeze([out(start, 'to')]) }; }
    if (node.type === 'class') { const start = add({ kind: 'class', inverted: node.inverted, items: node.items, to: -1 }); return { start, outs: Object.freeze([out(start, 'to')]) }; }
    if (node.type === 'start' || node.type === 'end') { const start = add({ kind: node.type, to: -1 }); return { start, outs: Object.freeze([out(start, 'to')]) }; }
    if (node.type === 'concat') return join(node.values);
    if (node.type === 'alt') {
      const values = node.values.map(compile);
      let start = values[0]!.start;
      let outs = [...values[0]!.outs];
      for (const value of values.slice(1)) { const split = add({ kind: 'split', to: start, alternate: value.start }); start = split; outs = [...outs, ...value.outs]; }
      return { start, outs: Object.freeze(outs) };
    }
    const repeated: RegexAtom[] = [];
    for (let index = 0; index < node.minimum; index += 1) repeated.push(node.value);
    let fragment = join(repeated);
    if (node.maximum === null) {
      const body = compile(node.value);
      const split = add({ kind: 'split', to: body.start, alternate: -1 });
      patch(fragment.outs, split);
      patch(body.outs, split);
      return { start: fragment.start, outs: Object.freeze([out(split, 'alternate')]) };
    }
    for (let index = node.minimum; index < node.maximum; index += 1) {
      const body = compile(node.value);
      const split = add({ kind: 'split', to: body.start, alternate: -1 });
      patch(fragment.outs, split);
      fragment = { start: fragment.start, outs: Object.freeze([...body.outs, out(split, 'alternate')]) };
    }
    return fragment;
  };
  const fragment = compile(ast);
  if (states.length > 2_048) return undefined;
  const match = add({ kind: 'match' });
  patch(fragment.outs, match);
  const fold = (value: string): string => insensitive ? value.toLocaleLowerCase('en-US') : value;
  const addClosure = (set: Set<number>, index: number, position: number, length: number, seen: Set<number>): void => {
    if (seen.has(index)) return;
    seen.add(index);
    const state = states[index]!;
    if (state.kind === 'epsilon') addClosure(set, state.to, position, length, seen);
    else if (state.kind === 'split') { addClosure(set, state.to, position, length, seen); addClosure(set, state.alternate, position, length, seen); }
    else if (state.kind === 'start') { if (position === 0) addClosure(set, state.to, position, length, seen); }
    else if (state.kind === 'end') { if (position === length) addClosure(set, state.to, position, length, seen); }
    else set.add(index);
  };
  const charMatches = (state: RegexState, character: string): boolean => {
    const folded = fold(character);
    if (state.kind === 'char') return folded === fold(state.value);
    if (state.kind === 'any') return true;
    if (state.kind !== 'class') return false;
    const point = folded.codePointAt(0)!;
    const inside = state.items.some(([first, last]) => point >= fold(first).codePointAt(0)! && point <= fold(last).codePointAt(0)!);
    return state.inverted ? !inside : inside;
  };
  return {
    test: (line: string): boolean => {
      const characters = [...line];
      let current = new Set<number>();
      addClosure(current, fragment.start, 0, characters.length, new Set());
      for (let position = 0; position <= characters.length; position += 1) {
        if (current.has(match)) return true;
        if (position === characters.length) break;
        const next = new Set<number>();
        for (const index of current) {
          const state = states[index]!;
          if ((state.kind === 'char' || state.kind === 'any' || state.kind === 'class') && charMatches(state, characters[position]!)) addClosure(next, state.to, position + 1, characters.length, new Set());
        }
        addClosure(next, fragment.start, position + 1, characters.length, new Set());
        current = next;
      }
      return current.has(match);
    }
  };
}

function stdoutForEffect(effect: TerminalEffect): readonly string[] {
  if (effect.kind === 'lines') return effect.lines;
  if (effect.kind === 'entries') return Object.freeze(effect.entries.map((entry) => `${formatDocumentOperand(entry)} — ${entry.date} — ${entry.title}`));
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
  if (effect.kind === 'entries') return `${effect.entries.length} ${effect.label} listed.`;
  if (effect.kind === 'tree') return `${effect.lines.length} tree entries listed.`;
  return effect.lines.at(-1) ?? '';
}

function expandStageWords(
  words: readonly RshellWord[],
  state: TerminalState,
  entries: readonly TerminalEntry[],
  experiments: readonly TerminalExperiment[],
  corpus: ReadonlyMap<string, readonly string[]>,
  identity: TerminalIdentity,
  now: () => Date,
  registry: TerminalCommandRegistry,
  depth: number
): { readonly ok: true; readonly words: readonly string[] } | { readonly ok: false; readonly message: string } {
  if (depth > maxSubstitutionDepth) return { ok: false, message: 'Command substitution nesting is too deep.' };
  const expanded: string[] = [];
  for (const parsedWord of words) {
    let value = '';
    for (const segment of parsedWord.segments) {
      if (!segment.expandSubstitution) {
        value += segment.value;
        continue;
      }
      for (let index = 0; index < segment.value.length;) {
        if (segment.value[index] !== '$' || segment.value[index + 1] !== '(') {
          value += segment.value[index]!;
          index += 1;
          continue;
        }
        const substitution = readSubstitution(segment.value, index);
        if (substitution === undefined) return { ok: false, message: 'Unbalanced command substitution.' };
        const parsed = parseRshell(substitution.value);
        if (!parsed.ok || parsed.stages.some((stage) => stage.redirect !== undefined)) return { ok: false, message: 'Command substitution accepts only pure text commands.' };
        const nested = executeRshellStages(parsed.stages, state, entries, experiments, corpus, identity, now, registry, true, depth + 1);
        if (nested.error) return { ok: false, message: 'Command substitution did not produce text.' };
        value += nested.stdout.join(' ').trim();
        index = substitution.end;
      }
    }
    if (value.length > 2_000) return { ok: false, message: 'Command substitution output is too large.' };
    expanded.push(value);
  }
  return { ok: true, words: Object.freeze(expanded) };
}

function executeGrep(
  words: readonly string[],
  stdin: readonly string[],
  stdinProvided: boolean,
  cwd: string,
  entries: readonly TerminalEntry[],
  corpus: ReadonlyMap<string, readonly string[]>,
  scratch: readonly TerminalScratchFile[],
  state: TerminalState
): RshellOutput {
  let index = 0;
  let insensitive = false;
  let number = false;
  let literal = false;
  while (words[index]?.startsWith('-') && words[index] !== '-') {
    const flags = words[index]!.slice(1);
    if (flags.length === 0 || [...flags].some((flag) => !'inF'.includes(flag))) return rshellError(state, 'Usage: grep [-inF] <pattern> [path ...]');
    insensitive ||= flags.includes('i');
    number ||= flags.includes('n');
    literal ||= flags.includes('F');
    index += 1;
  }
  const pattern = words[index++];
  if (
    pattern === undefined ||
    pattern.length === 0 ||
    pattern.length > 256 ||
    /[\u0000-\u001f\u007f]/u.test(pattern)
  ) {
    return rshellError(state, 'Usage: grep [-inF] <pattern> [path ...]');
  }
  const matcher = literal
    ? { test: (line: string) => insensitive ? line.toLocaleLowerCase('en-US').includes(pattern.toLocaleLowerCase('en-US')) : line.includes(pattern) }
    : compileSafeRegex(pattern, insensitive);
  if (matcher === undefined) return rshellError(state, 'grep pattern is outside the safe regular-language subset.');
  if (stdinProvided && index < words.length) return rshellError(state, 'grep accepts stdin or named public resources, not both.');
  if (stdinProvided) {
    if (stdin.length > maxGrepLines) return rshellError(state, 'grep input exceeds the session work limit.');
    const values: string[] = [];
    for (const [lineIndex, line] of stdin.entries()) {
      if (matcher.test(line)) values.push(number ? `${lineIndex + 1}:${line}` : line);
    }
    const bounded = boundedLines(values);
    return { state, effect: lines('normal', ...bounded), stdout: bounded, error: false };
  }
  const operands = words.slice(index);
  const sourcePaths: string[] = [];
  if (operands.length === 0) {
    sourcePaths.push(...entries.map((entry) => `/${entry.virtualPath}`));
  } else {
    for (const operand of operands) {
      const path = normaliseVirtualPath(operand, cwd, false);
      if (path === undefined) return rshellError(state, 'grep can search only listed public documents or /.rshell/tmp scratch files.');
      const resources = resourcePaths(path, entries, scratch);
      if (resources === undefined) return rshellError(state, 'grep can search only listed public documents or /.rshell/tmp scratch files.');
      sourcePaths.push(...resources);
    }
  }
  const uniqueSourcePaths = [...new Set(sourcePaths)];
  if (uniqueSourcePaths.length > maxGrepResources) return rshellError(state, 'grep resource scope exceeds the session work limit.');
  if (uniqueSourcePaths.length === 0) return rshellError(state, 'grep can search only listed public documents or /.rshell/tmp scratch files.');
  const values: string[] = [];
  let scannedLines = 0;
  for (const path of uniqueSourcePaths) {
    const source = readTextResource(path, entries, corpus, scratch);
    if (source === undefined) return rshellError(state, `No readable rshell resource named "${path}".`);
    for (const [lineIndex, line] of source.entries()) {
      scannedLines += 1;
      if (scannedLines > maxGrepLines) return rshellError(state, 'grep input exceeds the session work limit.');
      if (matcher.test(line)) values.push(number ? `${path}:${lineIndex + 1}:${line}` : `${path}:${line}`);
    }
  }
  const bounded = boundedLines(values);
  return { state, effect: lines('normal', ...bounded), stdout: bounded, error: false };
}

function isTextEffect(effect: TerminalEffect): boolean {
  return effect.kind === 'lines' || effect.kind === 'entries' || effect.kind === 'experiments' || effect.kind === 'tree';
}

function executeRegisteredStage(
  definition: TerminalCommandDefinition,
  operands: readonly string[],
  stdin: readonly string[],
  stdinProvided: boolean,
  state: TerminalState,
  entries: readonly TerminalEntry[],
  experiments: readonly TerminalExperiment[],
  identity: TerminalIdentity,
  now: () => Date,
  registry: TerminalCommandRegistry,
  piped: boolean,
  pure: boolean
): RshellOutput {
  const context: TerminalCommandContext = Object.freeze({
    state,
    entries,
    experiments,
    identity,
    now,
    registry,
    stdin,
    stdinProvided,
    piped
  });
  let effect: TerminalEffect;
  try {
    effect = definition.execute(Object.freeze([...operands]), context);
  } catch {
    return rshellError(state, `Command "${definition.name}" failed.`);
  }
  if ((piped || pure) && !isTextEffect(effect)) {
    return rshellError(state, `"${definition.name}" does not produce text for this rshell operation.`);
  }
  const output = boundedLines(stdoutForEffect(effect));
  if (effect.kind === 'lines') {
    return { state, effect: lines(effect.tone, ...output), stdout: output, error: effect.tone === 'error' };
  }
  if (piped || pure) return { state, effect: lines('normal', ...output), stdout: output, error: false };
  return { state, effect, stdout: output, error: false };
}

function executeRshellStage(
  words: readonly string[],
  stdin: readonly string[],
  stdinProvided: boolean,
  state: TerminalState,
  entries: readonly TerminalEntry[],
  experiments: readonly TerminalExperiment[],
  corpus: ReadonlyMap<string, readonly string[]>,
  identity: TerminalIdentity,
  now: () => Date,
  registry: TerminalCommandRegistry,
  piped: boolean,
  pure: boolean
): RshellOutput {
  const [command, ...operands] = words;
  if (command === undefined) return rshellError(state, 'A pipeline stage cannot be empty.');
  const definition = registry.resolve(command);
  if (definition === undefined) return rshellError(state, `Unknown command: ${command}. Type "help" for commands.`);
  const canonicalCommand = definition.name;
  const builtIn = defaultRshellHandlers.get(canonicalCommand) === definition.execute;
  if (pure && ((builtIn && standaloneRshellCommands.has(canonicalCommand)) || (!builtIn && definition.pureText !== true))) {
    return rshellError(state, `"${command}" is not allowed in command substitution.`);
  }
  if (piped && builtIn && standaloneRshellCommands.has(canonicalCommand)) {
    return rshellError(state, `"${command}" is a standalone command and cannot be piped.`);
  }
  const text = (tone: TerminalTone, values: readonly string[]): RshellOutput => {
    const output = boundedLines(values);
    return { state, effect: lines(tone, ...output), stdout: output, error: tone === 'error' };
  };
  const single = (): boolean => operands.length === 0;
  if (builtIn && canonicalCommand === 'help') {
    if (!single()) return rshellError(state, 'Usage: help');
    return text('normal', registry.definitions.map((definition) => `${definition.usage}${definition.aliases.length > 0 ? ` (${definition.aliases.join(', ')})` : ''} — ${definition.summary}`));
  }
  if (builtIn && canonicalCommand === 'about') return single() ? text('normal', [identity.about]) : rshellError(state, 'Usage: about');
  if (builtIn && canonicalCommand === 'pwd') return single() ? text('normal', [state.cwd]) : rshellError(state, 'Usage: pwd');
  if (builtIn && canonicalCommand === 'whoami') return single() ? text('normal', [identity.user]) : rshellError(state, 'Usage: whoami');
  if (builtIn && canonicalCommand === 'id') return single() ? text('normal', [`uid=${identity.user} gid=${identity.user} groups=public-read`, 'capabilities: read public posts/pages/lab; deny private, draft, host, network, and persistence']) : rshellError(state, 'Usage: id');
  if (builtIn && canonicalCommand === 'date') return single() ? text('normal', [formatUtcDate(now())]) : rshellError(state, 'Usage: date');
  if (builtIn && canonicalCommand === 'history') return single() ? text('muted', state.history.map((item, itemIndex) => `${itemIndex + 1}  ${item}`)) : rshellError(state, 'Usage: history');
  if (builtIn && canonicalCommand === 'alias') {
    if (operands.length > 1) return rshellError(state, 'Usage: alias [name]');
    const aliases = registry.definitions.flatMap((definition) => definition.aliases.map((alias) => `${alias}=${definition.name}`));
    if (operands[0] === undefined) return text('normal', aliases);
    const value = aliases.find((alias) => alias.startsWith(`${operands[0]}=`));
    return value === undefined ? rshellError(state, `No built-in alias named "${operands[0]}".`) : text('normal', [value]);
  }
  if (builtIn && canonicalCommand === 'clear') return single() ? { state, effect: { kind: 'clear' }, stdout: Object.freeze([]), error: false } : rshellError(state, 'Usage: clear');
  if (builtIn && canonicalCommand === 'cd') {
    if (operands.length > 1) return rshellError(state, 'Usage: cd [path]');
    const path = normaliseVirtualPath(operands[0] ?? '~', state.cwd, true);
    if (path === undefined || !knownDirectories(entries, state.scratch).has(path) || path.startsWith('/.rshell')) return rshellError(state, 'cd accepts only listed public directories.');
    const next = Object.freeze({ ...state, cwd: displayVirtualPath(path) });
    return { state: next, effect: lines('normal'), stdout: Object.freeze([]), error: false };
  }
  if (builtIn && canonicalCommand === 'ls') {
    if (operands.length > 1) return rshellError(state, 'Usage: ls [path]');
    const path = operands[0] !== undefined && ['posts', 'pages', 'lab'].includes(operands[0])
      ? `/${operands[0]}`
      : normaliseVirtualPath(operands[0] ?? '.', state.cwd, true);
    if (path === undefined) return rshellError(state, 'ls accepts only rshell virtual paths.');
    const listing = listDirectory(path, entries, experiments, state.scratch);
    if (listing === undefined) return rshellError(state, `No rshell directory named "${operands[0] ?? state.cwd}".`);
    const postEntries = path === '/posts' ? entries.filter((entry) => entry.kind === 'post') : undefined;
    const pageEntries = path === '/pages' ? entries.filter((entry) => entry.kind === 'page') : undefined;
    if (!piped && postEntries !== undefined) return { state, effect: { kind: 'entries', entries: Object.freeze(postEntries), label: 'posts' }, stdout: stdoutForEffect({ kind: 'entries', entries: postEntries, label: 'posts' }), error: false };
    if (!piped && pageEntries !== undefined) return { state, effect: { kind: 'entries', entries: Object.freeze(pageEntries), label: 'pages' }, stdout: stdoutForEffect({ kind: 'entries', entries: pageEntries, label: 'pages' }), error: false };
    if (!piped && path === '/lab') return { state, effect: { kind: 'experiments', experiments: Object.freeze([...experiments]) }, stdout: stdoutForEffect({ kind: 'experiments', experiments }), error: false };
    return text('normal', listing);
  }
  if (builtIn && canonicalCommand === 'tree') {
    if (operands.length > 1) return rshellError(state, 'Usage: tree [path]');
    const path = normaliseVirtualPath(operands[0] ?? '.', state.cwd, true);
    if (path === undefined) return rshellError(state, 'Usage: tree [public virtual path]');
    const tree = renderRshellTree(path, entries, experiments);
    if (tree === undefined) return rshellError(state, 'Usage: tree [public virtual path]');
    const effect: TerminalEffect = { kind: 'tree', root: tree.root, lines: tree.lines };
    return { state, effect: piped ? lines('normal', ...stdoutForEffect(effect)) : effect, stdout: stdoutForEffect(effect), error: false };
  }
  if (builtIn && (canonicalCommand === 'cat' || canonicalCommand === 'vim')) {
    if (canonicalCommand === 'cat' && operands.length === 0 && stdinProvided) return text('normal', stdin);
    if (operands.length !== 1) return rshellError(state, `Usage: ${command} <path>`);
    const noResource = (): RshellOutput => rshellError(
      state,
      `No readable rshell resource named "${operands[0]}". Relative paths resolve under posts; pages require /pages/<path>.md.`
    );
    const path = normaliseVirtualPath(operands[0]!, state.cwd, false);
    if (path === undefined) return noResource();
    const entry = entryAt(path, entries);
    if (canonicalCommand === 'vim') return entry === undefined ? noResource() : { state, effect: { kind: 'document-navigation', entry }, stdout: Object.freeze([]), error: false };
    const resource = readTextResource(path, entries, corpus, state.scratch);
    if (resource === undefined) return noResource();
    if (!piped && !stdinProvided && entry !== undefined) return { state, effect: { kind: 'document', entry }, stdout: resource, error: false };
    return text('normal', resource);
  }
  if (builtIn && canonicalCommand === 'open') {
    if (operands.length !== 1 || !operands[0]?.startsWith('lab/')) return rshellError(state, 'Usage: open lab/<id>');
    const experiment = experiments.find((item) => `lab/${item.id}` === operands[0]);
    return experiment === undefined ? rshellError(state, `No listed experiment named "${operands[0]}".`) : { state, effect: { kind: 'navigation', experiment }, stdout: Object.freeze([]), error: false };
  }
  if (builtIn && canonicalCommand === 'grep') return executeGrep(operands, stdin, stdinProvided, state.cwd, entries, corpus, state.scratch, state);
  return executeRegisteredStage(definition, operands, stdin, stdinProvided, state, entries, experiments, identity, now, registry, piped, pure);
}

function executeRshellStages(
  stages: readonly RshellStage[],
  initialState: TerminalState,
  entries: readonly TerminalEntry[],
  experiments: readonly TerminalExperiment[],
  corpus: ReadonlyMap<string, readonly string[]>,
  identity: TerminalIdentity,
  now: () => Date,
  registry: TerminalCommandRegistry,
  pure: boolean,
  depth: number
): RshellOutput {
  let state = initialState;
  let stdin: readonly string[] = Object.freeze([]);
  let output: RshellOutput | undefined;
  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index]!;
    const expanded = expandStageWords(stage.words, state, entries, experiments, corpus, identity, now, registry, depth);
    if (!expanded.ok) return rshellError(state, expanded.message);
    output = executeRshellStage(expanded.words, stdin, index > 0, state, entries, experiments, corpus, identity, now, registry, stages.length > 1, pure);
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
  const effect = executeRshellStages(
    parsed.stages,
    state,
    options.entries,
    options.experiments ?? Object.freeze([]),
    publicTextByPath(options.documents, options.entries),
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

export function completeCommand(input: string, entries: readonly TerminalEntry[], experiments: readonly TerminalExperiment[] = Object.freeze([]), registry: TerminalCommandRegistry = DEFAULT_TERMINAL_COMMAND_REGISTRY): CompletionResult {
  if (!input.includes(' ')) {
    const tokens = registry.definitions.flatMap(({ name, aliases }) => [name, ...aliases]);
    return completeFrom(input, tokens, (candidate) => `${candidate} `);
  }
  const match = /^(\S+)\s+([^\s]*)$/u.exec(input);
  if (match === null) return { kind: 'none', candidates: Object.freeze([]) };
  const invokedName = match[1]!;
  const definition = registry.resolve(invokedName);
  if (definition?.complete === undefined) return { kind: 'none', candidates: Object.freeze([]) };
  return definition.complete(match[2] ?? '', { entries, experiments }, invokedName);
}
