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

export interface TerminalState {
  readonly history: readonly string[];
  readonly historyCursor: number | null;
  readonly draftInput: string;
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
  `${DEFAULT_TERMINAL_IDENTITY.user}@${DEFAULT_TERMINAL_IDENTITY.host} $`;

const commandToken = /^[a-z][a-z0-9-]*$/u;
const unsafePathSegment = /[\\/?#%\u0000-\u001f\u007f]/u;

export function createTerminalState(): TerminalState {
  return Object.freeze({ history: Object.freeze([]), historyCursor: null, draftInput: '' });
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
    if (!commandToken.test(definition.name) || definition.aliases.some((alias) => !commandToken.test(alias))) throw new TypeError('Terminal command names and aliases must be safe tokens.');
    if (requireSafeText(definition.summary, 'summary') !== definition.summary ||
      requireSafeText(definition.usage, 'usage') !== definition.usage ||
      (definition.usage !== definition.name && !definition.usage.startsWith(`${definition.name} `)) ||
      typeof definition.execute !== 'function' ||
      (definition.complete !== undefined && typeof definition.complete !== 'function')) {
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

function define(name: string, summary: string, usageText: string, handler: DefaultCommandHandler, complete?: CompletionHandler): TerminalCommandDefinition {
  let definition: TerminalCommandDefinition;
  const execute: CommandHandler = (operands, context) => handler(operands, context, () => usage(definition));
  definition = { name, aliases: Object.freeze([]), summary, usage: usageText, execute, ...(complete ? { complete } : {}) };
  return definition;
}

const definitions = [
  define('help', 'show this command list', 'help', (operands, context, invalidUsage) => operands.length === 0
    ? lines('normal', ...context.registry.definitions.map((item) => `${item.usage}${item.aliases.length ? ` (${item.aliases.join(', ')})` : ''} — ${item.summary}`))
    : invalidUsage()),
  define('ls', 'list usable public document operands or experiments', 'ls [posts|pages|lab]', (operands, context, invalidUsage) => {
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
  define('cat', 'render a public document; relative paths resolve under posts', 'cat <post-path.md|/posts/path.md|/pages/path.md>', (operands, context, invalidUsage) => {
    if (operands.length !== 1) return invalidUsage();
    const entry = resolveDocumentOperand(operands[0]!, context.entries);
    return entry ? { kind: 'document', entry } : lines('error', `No public document named "${operands[0]}". Relative paths resolve under posts; pages require /pages/<path>.md. Try "tree" or "tree /".`);
  }, (operand, context, invoked) => pathCompletion(operand, context.entries, invoked)),
  define('vim', 'open a public document reader; relative paths resolve under posts', 'vim <post-path.md|/posts/path.md|/pages/path.md>', (operands, context, invalidUsage) => {
    if (operands.length !== 1) return invalidUsage();
    const entry = resolveDocumentOperand(operands[0]!, context.entries);
    return entry ? { kind: 'document-navigation', entry } : lines('error', `No public document named "${operands[0]}". Relative paths resolve under posts; pages require /pages/<path>.md. Try "tree" or "tree /".`);
  }, (operand, context, invoked) => pathCompletion(operand, context.entries, invoked)),
  define('tree', 'show the public content tree', 'tree [/|/posts|/pages]', (operands, context, invalidUsage) => {
    if (operands.length > 1) return invalidUsage();
    const tree = renderTree(context.entries, operands[0]);
    return tree ? { kind: 'tree', root: tree.root, lines: tree.lines } : invalidUsage();
  }, (operand, _context, invoked) => completeFrom(operand, ['/', '/posts', '/pages'], (candidate) => `${invoked} ${candidate}`)),
  define('about', 'describe this site', 'about', (operands, context, invalidUsage) => operands.length === 0 ? lines('normal', context.identity.about) : invalidUsage()),
  define('pwd', 'print the current path', 'pwd', (operands, context, invalidUsage) => operands.length === 0 ? lines('normal', context.identity.workingDirectory) : invalidUsage()),
  define('whoami', 'print the current user', 'whoami', (operands, context, invalidUsage) => operands.length === 0 ? lines('normal', context.identity.user) : invalidUsage()),
  define('date', 'print the UTC clock', 'date', (operands, context, invalidUsage) => operands.length === 0 ? lines('normal', formatUtcDate(context.now())) : invalidUsage()),
  define('history', 'show recent commands', 'history', (operands, context, invalidUsage) => operands.length === 0 ? lines('muted', ...context.state.history.map((item, index) => `${index + 1}  ${item}`)) : invalidUsage()),
  define('clear', 'clear the screen', 'clear', (operands, _context, invalidUsage) => operands.length === 0 ? { kind: 'clear' } : invalidUsage())
];

export const DEFAULT_TERMINAL_COMMAND_REGISTRY = createTerminalCommandRegistry(definitions);
export const TERMINAL_COMMANDS = Object.freeze(definitions.map(({ name }) => name));

function withSubmission(state: TerminalState, input: string): TerminalState {
  return Object.freeze({ history: Object.freeze([...state.history, input].slice(-50)), historyCursor: null, draftInput: '' });
}

export function formatUtcDate(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.valueOf())) throw new TypeError('The Terminal clock returned an invalid date.');
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 19)} UTC`;
}

export function executeCommand(options: {
  readonly state: TerminalState;
  readonly input: string;
  readonly entries: readonly TerminalEntry[];
  readonly experiments?: readonly TerminalExperiment[];
  readonly identity?: TerminalIdentity;
  readonly now?: () => Date;
  readonly registry?: TerminalCommandRegistry;
}): CommandResult {
  const input = options.input.trim();
  if (input.length === 0) return { state: options.state, effect: null, announcement: '' };
  const state = withSubmission(options.state, input);
  const tokenized = tokenizeCommand(input);
  if (!tokenized.ok) return { state, effect: lines('error', tokenized.message), announcement: tokenized.message };
  const [invokedName, ...operands] = tokenized.tokens;
  const registry = options.registry ?? DEFAULT_TERMINAL_COMMAND_REGISTRY;
  const definition = invokedName ? registry.resolve(invokedName) : undefined;
  const context: TerminalCommandContext = Object.freeze({
    state,
    entries: options.entries,
    experiments: options.experiments ?? Object.freeze([]),
    identity: options.identity ?? DEFAULT_TERMINAL_IDENTITY,
    now: options.now ?? (() => new Date()),
    registry
  });
  const effect = definition === undefined
    ? lines('error', `Unknown command: ${input}. Type "help" for commands.`)
    : definition.execute(Object.freeze(operands), context);
  const announcement = effect.kind === 'document' ? `Rendered ${effect.entry.title}.`
    : effect.kind === 'document-navigation' ? `Opening ${effect.entry.title}.`
    : effect.kind === 'navigation' ? `Opening ${effect.experiment.title}.`
    : effect.kind === 'clear' ? 'Command transcript cleared.'
    : effect.kind === 'experiments' ? `${effect.experiments.length} experiments listed.`
    : effect.kind === 'entries' ? `${effect.entries.length} ${effect.label} listed.`
    : effect.kind === 'tree' ? `${effect.lines.length} tree entries listed.`
    : effect.lines.at(-1) ?? '';
  return { state, effect, announcement };
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
  return Object.freeze({ history: state.history, historyCursor: null, draftInput: '' });
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
