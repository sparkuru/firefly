export type TerminalEntryKind = 'post' | 'page';

export interface TerminalEntry {
  readonly kind: TerminalEntryKind;
  readonly slug: string;
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
  | {
      readonly kind: 'lines';
      readonly tone: TerminalTone;
      readonly lines: readonly string[];
    }
  | {
      readonly kind: 'entries';
      readonly entries: readonly TerminalEntry[];
      readonly label: string;
    }
  | { readonly kind: 'experiments'; readonly experiments: readonly TerminalExperiment[] }
  | { readonly kind: 'navigation'; readonly experiment: TerminalExperiment }
  | { readonly kind: 'document'; readonly entry: TerminalEntry }
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
  | { readonly kind: 'ambiguous'; readonly candidates: readonly string[] }
  | { readonly kind: 'none'; readonly candidates: readonly [] };

export const TERMINAL_COMMANDS = Object.freeze([
  'help',
  'ls',
  'open',
  'cat',
  'about',
  'pwd',
  'whoami',
  'date',
  'history',
  'clear'
] as const);

export const DEFAULT_TERMINAL_IDENTITY: TerminalIdentity = Object.freeze({
  user: 'guest',
  host: 'f1refly',
  workingDirectory: '~/blog',
  about: 'A static garden for notes, experiments, and durable web writing.'
});

export const DEFAULT_TERMINAL_PROMPT =
  `${DEFAULT_TERMINAL_IDENTITY.user}@${DEFAULT_TERMINAL_IDENTITY.host} $`;

export function createTerminalState(): TerminalState {
  return Object.freeze({
    history: Object.freeze([]),
    historyCursor: null,
    draftInput: ''
  });
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

function readDataField(
  descriptors: ReadonlyMap<PropertyKey, PropertyDescriptor>,
  key: string
): unknown {
  const descriptor = descriptors.get(key);
  if (descriptor === undefined || !('value' in descriptor)) {
    throw new TypeError(`Terminal entry is missing "${key}".`);
  }
  return descriptor.value;
}

function requireSafeText(value: unknown, field: string): string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value !== value.trim() ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    throw new TypeError(`Terminal entry "${field}" must be non-empty safe text.`);
  }
  return value;
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function decodeEntry(value: unknown, index: number): TerminalEntry {
  if (
    typeof value !== 'object' ||
    value === null ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    throw new TypeError(`Terminal entry ${index} must be a plain object.`);
  }

  const descriptors = ownDataDescriptors(value);
  const expected = ['kind', 'slug', 'filename', 'title', 'href', 'date'];
  const keys = [...descriptors.keys()];
  if (
    keys.some((key) => typeof key !== 'string' || !expected.includes(key)) ||
    expected.some((key) => !descriptors.has(key)) ||
    keys.length !== expected.length
  ) {
    throw new TypeError(`Terminal entry ${index} contains unknown or missing fields.`);
  }

  const kindValue = readDataField(descriptors, 'kind');
  if (kindValue !== 'post' && kindValue !== 'page') {
    throw new TypeError(`Terminal entry ${index} has an invalid kind.`);
  }
  const kind: TerminalEntryKind = kindValue;
  const slug = requireSafeText(readDataField(descriptors, 'slug'), 'slug');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) {
    throw new TypeError(`Terminal entry ${index} has an unsafe slug.`);
  }
  const filename = requireSafeText(
    readDataField(descriptors, 'filename'),
    'filename'
  );
  if (filename !== `${slug}.md`) {
    throw new TypeError(`Terminal entry ${index} has a non-canonical filename.`);
  }
  const href = requireSafeText(readDataField(descriptors, 'href'), 'href');
  const expectedHref = `/${kind === 'post' ? 'posts' : 'pages'}/${slug}/`;
  if (href !== expectedHref) {
    throw new TypeError(`Terminal entry ${index} has a non-canonical href.`);
  }
  const date = requireSafeText(readDataField(descriptors, 'date'), 'date');
  if (!isCalendarDate(date)) {
    throw new TypeError(`Terminal entry ${index} has an invalid date.`);
  }

  return Object.freeze({
    kind,
    slug,
    filename: filename as `${string}.md`,
    title: requireSafeText(readDataField(descriptors, 'title'), 'title'),
    href,
    date
  });
}

export function decodeTerminalEntries(value: unknown): readonly TerminalEntry[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError('Terminal index must be a plain array.');
  }
  const descriptors = ownDataDescriptors(value);
  const length = readDataField(descriptors, 'length');
  if (typeof length !== 'number' || !Number.isSafeInteger(length) || length < 0) {
    throw new TypeError('Terminal index has an invalid length.');
  }
  const allowedKeys = new Set(['length']);
  const entries: TerminalEntry[] = [];
  for (let index = 0; index < length; index += 1) {
    const key = String(index);
    allowedKeys.add(key);
    if (!descriptors.has(String(index))) {
      throw new TypeError('Terminal index must be dense.');
    }
    entries.push(decodeEntry(readDataField(descriptors, key), index));
  }
  if ([...descriptors.keys()].some((key) => typeof key !== 'string' || !allowedKeys.has(key))) {
    throw new TypeError('Terminal index contains unexpected properties.');
  }

  const slugs = new Set<string>();
  const filenames = new Set<string>();
  for (const entry of entries) {
    if (slugs.has(entry.slug) || filenames.has(entry.filename)) {
      throw new TypeError('Terminal index contains duplicate slugs or filenames.');
    }
    slugs.add(entry.slug);
    filenames.add(entry.filename);
  }
  return Object.freeze(entries);
}

function decodeExperiment(value: unknown, index: number): TerminalExperiment {
  if (
    typeof value !== 'object' ||
    value === null ||
    (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
  ) {
    throw new TypeError(`Terminal experiment ${index} must be a plain object.`);
  }
  const descriptors = ownDataDescriptors(value);
  const expected = ['id', 'title', 'href'];
  const keys = [...descriptors.keys()];
  if (
    keys.some((key) => typeof key !== 'string' || !expected.includes(key)) ||
    expected.some((key) => !descriptors.has(key)) ||
    keys.length !== expected.length
  ) {
    throw new TypeError(`Terminal experiment ${index} contains unknown or missing fields.`);
  }
  const id = requireSafeText(readDataField(descriptors, 'id'), 'id');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(id)) {
    throw new TypeError(`Terminal experiment ${index} has an unsafe id.`);
  }
  const href = requireSafeText(readDataField(descriptors, 'href'), 'href');
  if (href !== `/lab/${id}/`) {
    throw new TypeError(`Terminal experiment ${index} has a non-canonical href.`);
  }
  return Object.freeze({
    id,
    title: requireSafeText(readDataField(descriptors, 'title'), 'title'),
    href: href as `/lab/${string}/`
  });
}

export function decodeTerminalExperiments(value: unknown): readonly TerminalExperiment[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError('Terminal experiment index must be a plain array.');
  }
  const descriptors = ownDataDescriptors(value);
  const length = readDataField(descriptors, 'length');
  if (typeof length !== 'number' || !Number.isSafeInteger(length) || length < 0) {
    throw new TypeError('Terminal experiment index has an invalid length.');
  }
  const allowedKeys = new Set(['length']);
  const experiments: TerminalExperiment[] = [];
  for (let index = 0; index < length; index += 1) {
    const key = String(index);
    allowedKeys.add(key);
    if (!descriptors.has(key)) {
      throw new TypeError('Terminal experiment index must be dense.');
    }
    experiments.push(decodeExperiment(readDataField(descriptors, key), index));
  }
  if ([...descriptors.keys()].some((key) => typeof key !== 'string' || !allowedKeys.has(key))) {
    throw new TypeError('Terminal experiment index contains unexpected properties.');
  }
  const ids = new Set<string>();
  const hrefs = new Set<string>();
  for (const experiment of experiments) {
    if (ids.has(experiment.id) || hrefs.has(experiment.href)) {
      throw new TypeError('Terminal experiment index contains duplicate IDs or hrefs.');
    }
    ids.add(experiment.id);
    hrefs.add(experiment.href);
  }
  return Object.freeze(experiments);
}

export function tokenizeCommand(input: string): TokenizeResult {
  const tokens: string[] = [];
  let token = '';
  let quote: "'" | '"' | null = null;
  let started = false;

  for (const character of input) {
    if (quote !== null) {
      if (character === quote) {
        quote = null;
      } else {
        token += character;
      }
      started = true;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      started = true;
      continue;
    }
    if (/\s/u.test(character)) {
      if (started) {
        tokens.push(token);
        token = '';
        started = false;
      }
      continue;
    }
    token += character;
    started = true;
  }

  if (quote !== null) {
    return { ok: false, message: 'Unbalanced quote. Close the quote and try again.' };
  }
  if (started) {
    tokens.push(token);
  }
  return { ok: true, tokens: Object.freeze(tokens) };
}

function lines(tone: TerminalTone, ...values: string[]): TerminalEffect {
  return { kind: 'lines', tone, lines: Object.freeze(values) };
}

function unknownCommand(input: string): TerminalEffect {
  return lines('error', `Unknown command: ${input}. Type "help" for commands.`);
}

function usage(message: string): TerminalEffect {
  return lines('error', message);
}

function normalizeDocumentOperand(operand: string): string {
  return operand.startsWith('./') && !operand.slice(2).includes('/')
    ? operand.slice(2)
    : operand;
}

function withSubmission(state: TerminalState, input: string): TerminalState {
  const history = [...state.history, input].slice(-50);
  return Object.freeze({
    history: Object.freeze(history),
    historyCursor: null,
    draftInput: ''
  });
}

export function formatUtcDate(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.valueOf())) {
    throw new TypeError('The Terminal clock returned an invalid date.');
  }
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 19)} UTC`;
}

export function executeCommand(options: {
  readonly state: TerminalState;
  readonly input: string;
  readonly entries: readonly TerminalEntry[];
  readonly experiments?: readonly TerminalExperiment[];
  readonly identity?: TerminalIdentity;
  readonly now?: () => Date;
}): CommandResult {
  const input = options.input.trim();
  if (input.length === 0) {
    return { state: options.state, effect: null, announcement: '' };
  }

  const state = withSubmission(options.state, input);
  const experiments = options.experiments ?? Object.freeze([]);
  const identity = options.identity ?? DEFAULT_TERMINAL_IDENTITY;
  const tokenized = tokenizeCommand(input);
  if (!tokenized.ok) {
    return { state, effect: lines('error', tokenized.message), announcement: tokenized.message };
  }
  const [command, ...operands] = tokenized.tokens;
  let effect: TerminalEffect;

  switch (command) {
    case 'help':
      effect = operands.length === 0
        ? lines(
            'normal',
            'help — show this command list',
            'ls [posts|pages|lab] — list public documents or experiments',
            'open lab/<id> — open a listed experiment',
            'cat [./]<slug>.md — render a public document',
            'about — describe this site',
            'pwd — print the current path',
            'whoami — print the current user',
            'date — print the UTC clock',
            'history — show recent commands',
            'clear — clear the screen'
          )
        : usage('Usage: help');
      break;
    case 'ls': {
      if (operands[0] === 'lab') {
        effect = operands.length === 1
          ? { kind: 'experiments', experiments: Object.freeze([...experiments]) }
          : usage('Usage: ls [posts|pages|lab]');
        break;
      }
      if (operands.length > 1 || (operands[0] !== undefined && operands[0] !== 'posts' && operands[0] !== 'pages')) {
        effect = usage('Usage: ls [posts|pages|lab]');
        break;
      }
      const kind = operands[0] === 'posts' ? 'post' : operands[0] === 'pages' ? 'page' : null;
      const entries = kind === null ? options.entries : options.entries.filter((entry) => entry.kind === kind);
      effect = { kind: 'entries', entries: Object.freeze([...entries]), label: operands[0] ?? 'all documents' };
      break;
    }
    case 'open': {
      if (operands.length !== 1 || !operands[0]?.startsWith('lab/')) {
        effect = usage('Usage: open lab/<id>');
        break;
      }
      const id = operands[0].slice('lab/'.length);
      const experiment = experiments.find((candidate) => candidate.id === id);
      effect = experiment === undefined
        ? lines('error', `No listed experiment named "${operands[0]}". Try "ls lab".`)
        : { kind: 'navigation', experiment };
      break;
    }
    case 'cat': {
      if (operands.length !== 1) {
        effect = usage('Usage: cat [./]<slug>.md');
        break;
      }
      const operand = operands[0] ?? '';
      const filename = normalizeDocumentOperand(operand);
      const entry = options.entries.find((candidate) => candidate.filename === filename);
      effect = entry === undefined
        ? lines('error', `No public document named "${operand}". Try "ls".`)
        : { kind: 'document', entry };
      break;
    }
    case 'about':
      effect = operands.length === 0 ? lines('normal', identity.about) : usage('Usage: about');
      break;
    case 'pwd':
      effect = operands.length === 0 ? lines('normal', identity.workingDirectory) : usage('Usage: pwd');
      break;
    case 'whoami':
      effect = operands.length === 0 ? lines('normal', identity.user) : usage('Usage: whoami');
      break;
    case 'date':
      effect = operands.length === 0 ? lines('normal', formatUtcDate((options.now ?? (() => new Date()))())) : usage('Usage: date');
      break;
    case 'history':
      effect = operands.length === 0
        ? lines('muted', ...state.history.map((item, index) => `${index + 1}  ${item}`))
        : usage('Usage: history');
      break;
    case 'clear':
      effect = operands.length === 0 ? { kind: 'clear' } : usage('Usage: clear');
      break;
    default:
      effect = unknownCommand(input);
  }

  const announcement = effect.kind === 'document'
    ? `Rendered ${effect.entry.title}.`
    : effect.kind === 'navigation'
      ? `Opening ${effect.experiment.title}.`
    : effect.kind === 'clear'
      ? 'Command transcript cleared.'
      : effect.kind === 'experiments'
        ? `${effect.experiments.length} experiments listed.`
      : effect.kind === 'entries'
        ? `${effect.entries.length} ${effect.label} listed.`
        : effect.lines.at(-1) ?? '';
  return { state, effect, announcement };
}

export function navigateHistory(
  state: TerminalState,
  direction: 'up' | 'down',
  currentInput: string
): { readonly state: TerminalState; readonly input: string } {
  if (state.history.length === 0) {
    return { state, input: currentInput };
  }
  if (direction === 'up') {
    const cursor = state.historyCursor === null
      ? state.history.length - 1
      : Math.max(0, state.historyCursor - 1);
    const draftInput = state.historyCursor === null ? currentInput : state.draftInput;
    return {
      state: Object.freeze({ ...state, historyCursor: cursor, draftInput }),
      input: state.history[cursor] ?? currentInput
    };
  }
  if (state.historyCursor === null) {
    return { state, input: currentInput };
  }
  if (state.historyCursor >= state.history.length - 1) {
    return {
      state: Object.freeze({ ...state, historyCursor: null }),
      input: state.draftInput
    };
  }
  const cursor = state.historyCursor + 1;
  return {
    state: Object.freeze({ ...state, historyCursor: cursor }),
    input: state.history[cursor] ?? currentInput
  };
}

function completeFrom(prefix: string, candidates: readonly string[], render: (candidate: string) => string): CompletionResult {
  const matches = candidates.filter((candidate) => candidate.startsWith(prefix));
  if (matches.length === 1 && matches[0] !== undefined) {
    return { kind: 'unique', value: render(matches[0]), candidates: Object.freeze(matches) };
  }
  return matches.length > 1
    ? { kind: 'ambiguous', candidates: Object.freeze(matches) }
    : { kind: 'none', candidates: Object.freeze([]) };
}

export function completeCommand(
  input: string,
  entries: readonly TerminalEntry[],
  experiments: readonly TerminalExperiment[] = Object.freeze([])
): CompletionResult {
  if (!input.includes(' ')) {
    return completeFrom(input, TERMINAL_COMMANDS, (candidate) => `${candidate} `);
  }
  const match = /^(ls|cat|open)\s+([^\s]*)$/u.exec(input);
  if (match === null) {
    return { kind: 'none', candidates: Object.freeze([]) };
  }
  const command = match[1];
  const prefix = match[2] ?? '';
  if (command === 'ls') {
    return completeFrom(prefix, ['posts', 'pages', 'lab'], (candidate) => `ls ${candidate}`);
  }
  if (command === 'open') {
    return completeFrom(
      prefix,
      experiments.map((experiment) => `lab/${experiment.id}`),
      (candidate) => `open ${candidate}`
    );
  }
  if (prefix.startsWith('./')) {
    const filenamePrefix = prefix.slice(2);
    if (filenamePrefix.includes('/')) {
      return { kind: 'none', candidates: Object.freeze([]) };
    }
    return completeFrom(
      filenamePrefix,
      entries.map((entry) => entry.filename),
      (candidate) => `cat ./${candidate}`
    );
  }
  return completeFrom(prefix, entries.map((entry) => entry.filename), (candidate) => `cat ${candidate}`);
}
