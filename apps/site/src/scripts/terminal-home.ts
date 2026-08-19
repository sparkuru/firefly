import {
  DEFAULT_TERMINAL_IDENTITY,
  DEFAULT_TERMINAL_COMMAND_REGISTRY,
  cancelCommandInput,
  completeCommand,
  createTerminalState,
  decodeTerminalEntries,
  decodeTerminalExperiments,
  executeCommand,
  formatTerminalPrompt,
  formatDocumentOperand,
  navigateHistory,
  type TerminalEffect,
  type TerminalEntry,
  type TerminalExperiment,
  type TerminalGrepMatch,
  type TerminalState,
  type TerminalTextDocument
} from '@f1refly/presentation-terminal/runtime';

interface TerminalNodes {
  readonly root: HTMLElement;
  readonly startup: HTMLElement;
  readonly bootLog: HTMLElement;
  readonly bootPrompt: HTMLElement;
  readonly fallback: HTMLElement;
  readonly session: HTMLElement;
  readonly form: HTMLFormElement;
  readonly input: HTMLInputElement;
  readonly commandLabel: HTMLLabelElement;
  readonly prompt: HTMLElement;
  readonly transcript: HTMLElement;
  readonly completion: HTMLElement;
  readonly announcer: HTMLElement;
  readonly failure: HTMLElement;
  readonly fallbackHeading: HTMLElement;
}

type TerminalStartupState = 'connecting' | 'ready' | 'failed';

interface TerminalTemplates {
  readonly byPath: ReadonlyMap<string, HTMLTemplateElement>;
  readonly documents: readonly TerminalTextDocument[];
}

interface RenderContext {
  readonly templates: TerminalTemplates;
  readonly instance: number;
}

interface RenderResult {
  readonly focusTarget: HTMLElement | null;
  readonly navigationHref?: string;
}

type TerminalTreeNode = Extract<TerminalEffect, { kind: 'tree' }>['nodes'][number]['node'];

const protectedTypingTargetSelector = [
  'a',
  'button',
  'input',
  'textarea',
  'select',
  'option',
  'summary',
  'label',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="link"]',
  '[role="textbox"]',
  '[role="searchbox"]',
  '[role="combobox"]',
  '[role="gridcell"]',
  '[role="columnheader"]',
  '[role="rowheader"]',
  '[role="listbox"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="option"]',
  '[role="radio"]',
  '[role="scrollbar"]',
  '[role="separator"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="treeitem"]',
  '[role="application"]',
  '[role="grid"]',
  '[role="menu"]',
  '[role="radiogroup"]',
  '[role="tablist"]',
  '[role="toolbar"]',
  '[role="tree"]',
  '[role="treegrid"]',
  '.terminal-wide',
  '.wide-content',
  '[data-terminal-wide]',
  '[data-wide-content]'
].join(',');

function readerDestinationHref(href: string): string {
  const destination = new URL(href, window.location.href);
  if (
    destination.origin !== window.location.origin ||
    destination.pathname.length === 0 ||
    !destination.pathname.startsWith('/')
  ) {
    throw new TypeError('Reader destinations must be same-origin canonical routes.');
  }
  destination.hash = 'terminal-reader';
  return `${destination.pathname}${destination.search}${destination.hash}`;
}

export interface TerminalControllerSeams {
  readonly execute?: typeof executeCommand;
  readonly render?: (
    effect: TerminalEffect,
    record: HTMLElement,
    context: RenderContext
  ) => RenderResult;
}

function requireElement<T extends Element>(
  root: ParentNode,
  selector: string,
  constructor: new (...args: never[]) => T
): T {
  const matches = root.querySelectorAll(selector);
  if (matches.length !== 1 || !(matches[0] instanceof constructor)) {
    throw new TypeError(`Expected exactly one Terminal node: ${selector}`);
  }
  return matches[0];
}

function readNodes(root: HTMLElement): TerminalNodes {
  return {
    root,
    startup: requireElement(root, '[data-terminal-startup]', HTMLElement),
    bootLog: requireElement(root, '[data-terminal-boot-log]', HTMLElement),
    bootPrompt: requireElement(root, '[data-terminal-boot-prompt]', HTMLElement),
    fallback: requireElement(root, '[data-terminal-fallback]', HTMLElement),
    session: requireElement(root, '[data-terminal-session]', HTMLElement),
    form: requireElement(root, '[data-terminal-form]', HTMLFormElement),
    input: requireElement(root, '#terminal-command', HTMLInputElement),
    commandLabel: requireElement(root, '[data-terminal-command-label]', HTMLLabelElement),
    prompt: requireElement(root, '[data-terminal-prompt]', HTMLElement),
    transcript: requireElement(root, '[data-terminal-transcript]', HTMLElement),
    completion: requireElement(root, '[data-terminal-completion]', HTMLElement),
    announcer: requireElement(root, '[data-terminal-announcer]', HTMLElement),
    failure: requireElement(root, '[data-terminal-failure]', HTMLElement),
    fallbackHeading: requireElement(root, '#terminal-recovery-heading', HTMLElement)
  };
}

function setStartupState(root: HTMLElement, state: TerminalStartupState): void {
  root.dataset.terminalStartupState = state;
}

function markSessionEmpty(nodes: TerminalNodes): void {
  nodes.session.dataset.terminalSessionEmpty = '';
}

function clearSessionEmpty(nodes: TerminalNodes): void {
  delete nodes.session.dataset.terminalSessionEmpty;
}

function preserveBootLog(nodes: TerminalNodes): void {
  const record = document.createElement('section');
  record.className = 'terminal-record terminal-boot-record';
  record.setAttribute('aria-labelledby', 'terminal-startup-heading');
  nodes.bootPrompt.remove();
  record.append(nodes.bootLog);
  nodes.transcript.append(record);
  nodes.startup.remove();
}

function readEntries(root: HTMLElement): readonly TerminalEntry[] {
  const elements = root.querySelectorAll<HTMLElement>('[data-terminal-entry]');
  const raw: unknown[] = [];
  for (const element of elements) {
    raw.push({
      kind: element.dataset.terminalEntryKind,
      virtualPath: element.dataset.terminalEntryVirtualPath,
      relativePath: element.dataset.terminalEntryRelativePath,
      filename: element.dataset.terminalEntryFilename,
      title: element.dataset.terminalEntryTitle,
      href: element.dataset.terminalEntryHref,
      date: element.dataset.terminalEntryDate
    });
  }
  return decodeTerminalEntries(raw);
}

function readExperiments(root: HTMLElement): readonly TerminalExperiment[] {
  const elements = root.querySelectorAll<HTMLElement>('[data-terminal-experiment]');
  const raw: unknown[] = [];
  for (const element of elements) {
    raw.push({
      id: element.dataset.terminalExperimentId,
      title: element.dataset.terminalExperimentTitle,
      href: element.dataset.terminalExperimentHref
    });
  }
  return decodeTerminalExperiments(raw);
}

function readTemplateTextLines(node: HTMLElement): readonly string[] {
  const value = node.textContent ?? '';
  if (node.tagName === 'PRE') {
    return Object.freeze(value.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n').map((line) => line.normalize('NFC')));
  }
  const line = value.replaceAll(/\s+/gu, ' ').trim();
  return line.length === 0 ? Object.freeze([]) : Object.freeze([line.normalize('NFC')]);
}

function readTemplates(
  root: HTMLElement,
  entries: readonly TerminalEntry[]
): TerminalTemplates {
  const expected = new Set<string>(entries.map((entry) => entry.virtualPath));
  const byPath = new Map<string, HTMLTemplateElement>();
  const documents: TerminalTextDocument[] = [];

  for (const template of root.querySelectorAll<HTMLTemplateElement>('[data-terminal-template]')) {
    if (!(template instanceof HTMLTemplateElement)) {
      throw new TypeError('Terminal document templates must use native template elements.');
    }
    const virtualPath = template.getAttribute('data-terminal-template-path');
    const streamDocument = template.content.children.length === 1
      ? template.content.firstElementChild
      : null;
    const streamTitles = streamDocument instanceof HTMLElement
      ? streamDocument.querySelectorAll<HTMLElement>('[data-terminal-stream-title]')
      : [];
    const streamTitle = streamTitles.length === 1 ? streamTitles[0] : null;
    const proseNodes = streamDocument instanceof HTMLElement
      ? streamDocument.querySelectorAll<HTMLElement>('.terminal-stream-prose')
      : [];
    const prose = proseNodes.length === 1 ? proseNodes[0] : null;
    if (
      virtualPath === null ||
      !expected.has(virtualPath) ||
      byPath.has(virtualPath) ||
      !(streamDocument instanceof HTMLElement) ||
      !streamDocument.matches('[data-terminal-stream-document]') ||
      template.content.querySelectorAll('[data-terminal-stream-document]').length !== 1 ||
      streamTitle === null ||
      prose === null ||
      streamTitle.id.length === 0 ||
      streamDocument.getAttribute('aria-labelledby') !== streamTitle.id ||
      template.content.querySelector('script') !== null
    ) {
      throw new TypeError('Terminal document templates must exactly match the public index.');
    }
    byPath.set(virtualPath, template);
    const textNodes = [
      streamDocument.querySelector<HTMLElement>('.terminal-stream-meta'),
      streamTitle,
      ...prose.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, td, th')
    ];
    const lines = textNodes.flatMap((node) => node === null ? [] : readTemplateTextLines(node));
    documents.push(Object.freeze({ virtualPath: virtualPath as TerminalEntry['virtualPath'], lines: Object.freeze(lines) }));
  }

  if (byPath.size !== expected.size) {
    throw new TypeError('Terminal document templates must exactly match the public index.');
  }
  return { byPath, documents: Object.freeze(documents) };
}

function appendTextLine(parent: HTMLElement, value: string): void {
  const paragraph = document.createElement('p');
  paragraph.textContent = value;
  parent.append(paragraph);
}

function rewriteTokenReferences(
  element: Element,
  attribute: string,
  scopedIds: ReadonlyMap<string, string>
): void {
  const value = element.getAttribute(attribute);
  if (value === null) {
    return;
  }
  const rewritten = value
    .split(/\s+/u)
    .map((token) => scopedIds.get(token) ?? token)
    .join(' ');
  if (rewritten !== value) {
    element.setAttribute(attribute, rewritten);
  }
}

function scopeDocumentClone(fragment: DocumentFragment, instance: number): void {
  const scopedIds = new Map<string, string>();
  for (const element of fragment.querySelectorAll<HTMLElement>('[id]')) {
    if (scopedIds.has(element.id)) {
      throw new TypeError(`Duplicate ID in Terminal document template: ${element.id}`);
    }
    scopedIds.set(element.id, `terminal-output-${instance}-${element.id}`);
  }
  for (const element of fragment.querySelectorAll<HTMLElement>('[id]')) {
    const scoped = scopedIds.get(element.id);
    if (scoped === undefined) {
      throw new TypeError('Unable to scope a Terminal document ID.');
    }
    element.id = scoped;
  }

  const tokenAttributes = [
    'for',
    'form',
    'headers',
    'list',
    'aria-activedescendant',
    'aria-controls',
    'aria-describedby',
    'aria-details',
    'aria-errormessage',
    'aria-flowto',
    'aria-labelledby',
    'aria-owns'
  ] as const;
  for (const element of fragment.querySelectorAll('*')) {
    const href = element.getAttribute('href');
    if (href?.startsWith('#')) {
      const target = href.slice(1);
      const scoped = scopedIds.get(target);
      if (scoped !== undefined) {
        element.setAttribute('href', `#${scoped}`);
      }
    }
    for (const attribute of tokenAttributes) {
      rewriteTokenReferences(element, attribute, scopedIds);
    }
  }
}

function appendHighlightedText(parent: HTMLElement, value: string, ranges: readonly (readonly [number, number])[]): void {
  let cursor = 0;
  for (const [rawStart, rawEnd] of ranges) {
    const start = Math.max(cursor, Math.min(value.length, rawStart));
    const end = Math.max(start, Math.min(value.length, rawEnd));
    if (start > cursor) parent.append(document.createTextNode(value.slice(cursor, start)));
    if (end > start) {
      const mark = document.createElement('mark');
      mark.textContent = value.slice(start, end);
      parent.append(mark);
    }
    cursor = end;
  }
  if (cursor < value.length) parent.append(document.createTextNode(value.slice(cursor)));
}

function appendGrepMatch(parent: HTMLElement, match: TerminalGrepMatch): void {
  const item = document.createElement('li');
  item.className = 'terminal-grep-match';
  const location = document.createElement('span');
  location.className = 'terminal-grep-location';
  location.textContent = match.path === '-'
    ? (match.lineNumber === undefined ? '' : `${match.lineNumber}:`)
    : `${match.path}${match.lineNumber === undefined ? '' : `:${match.lineNumber}`}:`;
  const line = document.createElement('span');
  line.className = 'terminal-grep-line';
  appendHighlightedText(line, match.line, match.ranges);
  item.append(location, line);
  parent.append(item);
}

function childDirectoryPath(parent: string, directory: string): string {
  const name = directory.endsWith('/') ? directory.slice(0, -1) : directory;
  if (name.length === 0) {
    throw new TypeError('Terminal directory links require a non-empty child name.');
  }
  return parent === '/' ? `/${name}` : `${parent}/${name}`;
}

function directoryHref(path: string): string {
  return path === '/' ? '/' : `${path}/`;
}

function createDirectoryLink(path: string, label: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = directoryHref(path);
  link.dataset.terminalCdPath = path;
  link.textContent = label;
  return link;
}

function renderEntryListing(effect: Extract<TerminalEffect, { kind: 'entries' }>, record: HTMLElement): void {
  if (effect.directories.length === 0 && effect.entries.length === 0) {
    appendTextLine(record, `No public ${effect.label}.`);
    return;
  }
  const listing = document.createElement('ul');
  listing.className = 'terminal-entry-list';
  for (const directory of effect.directories) {
    const row = document.createElement('li');
    row.className = 'terminal-entry-row terminal-entry-row--directory';
    row.dataset.terminalEntryKind = 'directory';
    const label = document.createElement('code');
    label.className = 'terminal-entry-directory';
    label.append(createDirectoryLink(childDirectoryPath(effect.directory, directory), directory));
    row.append(label);
    listing.append(row);
  }
  for (const entry of effect.entries) {
    const row = document.createElement('li');
    row.className = 'terminal-entry-row terminal-entry-row--document';
    row.dataset.terminalEntryKind = 'document';
    const link = document.createElement('a');
    link.href = entry.href;
    link.textContent = entry.filename;
    link.setAttribute('aria-label', formatDocumentOperand(entry));
    const date = document.createElement('time');
    date.dateTime = entry.date;
    date.textContent = entry.date;
    const title = document.createElement('span');
    title.className = 'terminal-entry-title';
    title.textContent = entry.title;
    row.append(link, date, title);
    listing.append(row);
  }
  record.append(listing);
}

function renderHelpEffect(effect: Extract<TerminalEffect, { kind: 'help' }>, record: HTMLElement): void {
  const help = document.createElement('div');
  help.className = 'terminal-help';
  for (const group of effect.groups) {
    const section = document.createElement('section');
    section.className = 'terminal-help-group';
    const heading = document.createElement('h2');
    heading.textContent = group.name;
    section.append(heading);
    const list = document.createElement('ul');
    list.className = 'terminal-help-list';
    for (const command of group.commands) {
      const item = document.createElement('li');
      item.className = 'terminal-help-command';
      const usage = document.createElement('code');
      usage.textContent = command.usage;
      const detail = document.createElement('span');
      detail.className = 'terminal-help-detail';
      const summary = document.createElement('span');
      summary.className = 'terminal-help-summary';
      summary.textContent = command.summary;
      detail.append(summary);
      if (command.aliases.length > 0) {
        const aliases = document.createElement('span');
        aliases.className = 'terminal-help-aliases';
        aliases.textContent = `alias ${command.aliases.join(', ')}`;
        detail.append(aliases);
      }
      item.append(usage, detail);
      list.append(item);
    }
    section.append(list);
    help.append(section);
  }
  record.append(help);
}

function renderGrepEffect(effect: Extract<TerminalEffect, { kind: 'grep' }>, record: HTMLElement): void {
  const grep = document.createElement('div');
  grep.className = 'terminal-grep';
  const summary = document.createElement('p');
  summary.className = 'terminal-grep-summary';
  summary.textContent = effect.noResults ? `No matches for "${effect.pattern}".` : `${effect.matches.length} match${effect.matches.length === 1 ? '' : 'es'}`;
  grep.append(summary);
  if (effect.matches.length > 0) {
    const list = document.createElement('ul');
    list.className = 'terminal-grep-list';
    for (const match of effect.matches) appendGrepMatch(list, match);
    grep.append(list);
  }
  if (effect.truncated) {
    const notice = document.createElement('p');
    notice.className = 'terminal-grep-truncated';
    notice.textContent = 'Output truncated at the session limit.';
    grep.append(notice);
  }
  record.append(grep);
}

function appendTreeNode(parent: HTMLElement, node: TerminalTreeNode): void {
  if (node.kind === 'directory') {
    parent.append(createDirectoryLink(node.path, node.name));
    return;
  }
  if (node.kind === 'document') {
    const link = document.createElement('a');
    link.href = node.document.href;
    link.textContent = node.name;
    parent.append(link);
    return;
  }
  if (node.kind === 'experiment') {
    const link = document.createElement('a');
    link.href = node.experiment.href;
    link.textContent = node.name;
    parent.append(link);
    return;
  }
  parent.append(document.createTextNode(node.name));
}

function renderEffect(
  effect: TerminalEffect,
  record: HTMLElement,
  context: RenderContext
): RenderResult {
  switch (effect.kind) {
    case 'lines':
      record.dataset.tone = effect.tone;
      if (effect.tone === 'error') {
        const label = document.createElement('span');
        label.className = 'terminal-status-label';
        label.textContent = 'Error: ';
        record.append(label);
      }
      for (const line of effect.lines) {
        appendTextLine(record, line);
      }
      return { focusTarget: null };
    case 'help':
      renderHelpEffect(effect, record);
      return { focusTarget: null };
    case 'grep':
      renderGrepEffect(effect, record);
      return { focusTarget: null };
    case 'entries': {
      renderEntryListing(effect, record);
      return { focusTarget: null };
    }
    case 'experiments': {
      if (effect.experiments.length === 0) {
        appendTextLine(record, 'No listed experiments.');
        return { focusTarget: null };
      }
      const list = document.createElement('ul');
      list.className = 'terminal-entry-list terminal-experiment-list';
      for (const experiment of effect.experiments) {
        const item = document.createElement('li');
        item.className = 'terminal-entry-row terminal-entry-row--experiment';
        item.dataset.terminalEntryKind = 'experiment';
        const link = document.createElement('a');
        link.href = experiment.href;
        link.textContent = `${experiment.id}/`;
        const title = document.createElement('span');
        title.className = 'terminal-entry-title';
        title.textContent = experiment.title;
        item.append(link, title);
        list.append(item);
      }
      record.append(list);
      return { focusTarget: null };
    }
    case 'navigation': {
      const link = document.createElement('a');
      link.href = effect.experiment.href;
      link.textContent = `Open ${effect.experiment.title}`;
      record.append(link);
      return { focusTarget: null, navigationHref: effect.experiment.href };
    }
    case 'document-navigation': {
      const navigationHref = readerDestinationHref(effect.entry.href);
      const link = document.createElement('a');
      link.href = navigationHref;
      link.textContent = `Open ${effect.entry.title} in the reader`;
      record.append(link);
      return { focusTarget: null, navigationHref };
    }
    case 'document': {
      const template = context.templates.byPath.get(effect.entry.virtualPath);
      if (template === undefined) {
        throw new TypeError(`Missing Terminal template for ${effect.entry.filename}.`);
      }
      const fragment = template.content.cloneNode(true);
      if (!(fragment instanceof DocumentFragment)) {
        throw new TypeError('Terminal template cloning did not produce a document fragment.');
      }
      scopeDocumentClone(fragment, context.instance);
      const title = requireElement(
        fragment,
        '[data-terminal-stream-title]',
        HTMLElement
      );
      record.append(fragment);
      return { focusTarget: title };
    }
    case 'tree': {
      const pre = document.createElement('pre');
      pre.className = 'terminal-tree';
      if (effect.nodes.length !== effect.lines.length) {
        throw new TypeError('Terminal tree lines and nodes must remain aligned.');
      }
      pre.append(document.createTextNode(effect.root));
      effect.nodes.forEach(({ prefix, node }) => {
        pre.append(document.createTextNode(`\n${prefix}`));
        appendTreeNode(pre, node);
      });
      record.append(pre);
      return { focusTarget: null };
    }
    case 'clear':
      return { focusTarget: null };
    default: {
      const exhaustive: never = effect;
      throw new TypeError(`Unsupported Terminal effect: ${String(exhaustive)}`);
    }
  }
}

function appendCommandLine(record: HTMLElement, command: string, promptValue: string): void {
  const line = document.createElement('p');
  line.className = 'terminal-command-line';
  const prompt = document.createElement('span');
  prompt.className = 'terminal-prompt';
  prompt.textContent = promptValue;
  line.append(prompt, document.createTextNode(` ${command}`));
  record.append(line);
}

function showFatalFailure(nodes: TerminalNodes): void {
  setStartupState(nodes.root, 'failed');
  nodes.session.hidden = true;
  nodes.failure.hidden = false;
  nodes.fallback.hidden = false;
  nodes.fallbackHeading.focus();
}

function clearTranscript(nodes: TerminalNodes, announcement: string): void {
  nodes.transcript.replaceChildren();
  markSessionEmpty(nodes);
  nodes.input.value = '';
  nodes.completion.textContent = '';
  nodes.announcer.textContent = announcement;
  settleViewport(nodes.input, 'center');
}

function settleViewport(target: HTMLElement, block: ScrollLogicalPosition): void {
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth';
  target.focus({ preventScroll: true });
  target.scrollIntoView({ behavior, block, inline: 'nearest' });
}

function settleCommandOutput(record: HTMLElement, input: HTMLInputElement): void {
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth';
  input.focus({ preventScroll: true });
  const margin = Math.min(24, window.innerHeight * 0.05);
  const recordTop = record.getBoundingClientRect().top;
  const inputBottom = input.getBoundingClientRect().bottom;
  if (inputBottom - recordTop <= window.innerHeight - margin * 2) {
    window.scrollBy({
      behavior,
      left: 0,
      top: recordTop - margin
    });
    return;
  }
  input.scrollIntoView({ behavior, block: 'end', inline: 'nearest' });
}

function isEligibleTypingTarget(event: KeyboardEvent): boolean {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.ctrlKey ||
    event.altKey ||
    event.metaKey ||
    event.shiftKey ||
    event.key === ' ' ||
    [...event.key].length !== 1 ||
    /[\p{C}\s]/u.test(event.key)
  ) {
    return false;
  }
  const target = event.target;
  if (target instanceof Element && target.closest(protectedTypingTargetSelector) !== null) {
    return false;
  }
  const selection = window.getSelection();
  return selection === null || selection.isCollapsed;
}

function isUnmodifiedPrimaryClick(event: MouseEvent): boolean {
  return !event.defaultPrevented &&
    event.button === 0 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey;
}

function renderAmbiguousCompletion(node: HTMLElement, candidates: readonly string[]): void {
  node.textContent = `Matches: ${candidates.join(', ')}`;
  const note = document.createElement('span');
  note.className = 'terminal-completion-note';
  note.textContent = 'input unchanged by design; type more to complete.';
  node.append(document.createElement('br'), note);
}

function insertAtPromptSelection(input: HTMLInputElement, value: string): void {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  input.focus({ preventScroll: true });
  input.setRangeText(value, start, end, 'end');
}

export function startTerminalHome(
  root: HTMLElement,
  seams: TerminalControllerSeams = {}
): void {
  let nodes: TerminalNodes;
  let entries: readonly TerminalEntry[];
  let experiments: readonly TerminalExperiment[];
  let templates: TerminalTemplates;
  try {
    nodes = readNodes(root);
    entries = readEntries(root);
    experiments = readExperiments(root);
    templates = readTemplates(root, entries);
  } catch {
    setStartupState(root, 'failed');
    return;
  }

  let state: TerminalState = createTerminalState();
  let composing = false;
  let failed = false;
  let outputInstance = 0;
  const execute = seams.execute ?? executeCommand;
  const render = seams.render ?? renderEffect;
  const updatePrompt = (): void => {
    const prompt = formatTerminalPrompt(DEFAULT_TERMINAL_IDENTITY, state);
    nodes.prompt.textContent = prompt;
    nodes.commandLabel.textContent = `Command for ${prompt}`;
  };

  const fail = (): void => {
    if (failed) {
      return;
    }
    failed = true;
    showFatalFailure(nodes);
  };

  const submit = (): void => {
    try {
      const command = nodes.input.value;
      const submittedPrompt = formatTerminalPrompt(DEFAULT_TERMINAL_IDENTITY, state);
      const result = execute({ state, input: command, entries, experiments, documents: templates.documents });
      state = result.state;
      updatePrompt();
      nodes.completion.textContent = '';
      if (result.effect === null) {
        return;
      }
      if (result.effect.kind === 'clear') {
        clearTranscript(nodes, result.announcement);
        return;
      }

      const record = document.createElement('section');
      record.className = 'terminal-record';
      appendCommandLine(record, command.trim(), submittedPrompt);
      outputInstance += 1;
      const rendered = render(result.effect, record, {
        templates,
        instance: outputInstance
      });
      nodes.transcript.append(record);
      clearSessionEmpty(nodes);
      nodes.input.value = '';
      nodes.announcer.textContent = result.announcement;
      if (rendered.navigationHref !== undefined) {
        window.location.assign(rendered.navigationHref);
        return;
      }
      if (rendered.focusTarget === null) {
        settleCommandOutput(record, nodes.input);
      } else {
        settleViewport(rendered.focusTarget, 'start');
      }
    } catch {
      fail();
    }
  };

  nodes.form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!composing) {
      submit();
    }
  });
  nodes.transcript.addEventListener('click', (event) => {
    if (!isUnmodifiedPrimaryClick(event)) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest('a[data-terminal-cd-path]');
    if (!(link instanceof HTMLAnchorElement) || !nodes.transcript.contains(link)) return;
    const path = link.dataset.terminalCdPath;
    if (path === undefined) return;
    event.preventDefault();
    nodes.input.value = `cd ${path === '/' ? '/' : `${path}/`}`;
    submit();
  });
  document.addEventListener('compositionstart', () => {
    composing = true;
  });
  document.addEventListener('compositionend', () => {
    composing = false;
  });
  nodes.input.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      nodes.input.focus({ preventScroll: true });
      if (
        composing ||
        event.isComposing ||
        event.shiftKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }
      const completion = completeCommand(
        nodes.input.value,
        entries,
        experiments,
        DEFAULT_TERMINAL_COMMAND_REGISTRY,
        state.cwd,
        state.aliases
      );
      switch (completion.kind) {
        case 'unique':
          nodes.input.value = completion.value;
          nodes.input.setSelectionRange(nodes.input.value.length, nodes.input.value.length);
          nodes.completion.textContent = '';
          break;
        case 'ambiguous':
          renderAmbiguousCompletion(nodes.completion, completion.candidates);
          break;
        case 'no-match':
          nodes.completion.textContent = 'No matches.';
          break;
        case 'none':
          nodes.completion.textContent = '';
          break;
        default: {
          const exhaustive: never = completion;
          throw new TypeError(`Unsupported completion result: ${String(exhaustive)}`);
        }
      }
      return;
    }
    if (composing || event.isComposing) return;
    if (
      event.key.toLocaleLowerCase('en-US') === 'c' &&
      event.ctrlKey &&
      !event.altKey &&
      !event.metaKey &&
      !event.shiftKey
    ) {
      event.preventDefault();
      state = cancelCommandInput(state);
      nodes.input.value = '';
      nodes.completion.textContent = '';
      nodes.announcer.textContent = 'Command cancelled.';
      settleViewport(nodes.input, 'center');
      return;
    }
    if (
      event.key.toLocaleLowerCase('en-US') === 'l' &&
      event.ctrlKey &&
      !event.altKey &&
      !event.metaKey &&
      !event.shiftKey
    ) {
      event.preventDefault();
      state = cancelCommandInput(state);
      updatePrompt();
      clearTranscript(nodes, 'Command transcript cleared.');
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const navigation = navigateHistory(
        state,
        event.key === 'ArrowUp' ? 'up' : 'down',
        nodes.input.value
      );
      state = navigation.state;
      nodes.input.value = navigation.input;
      nodes.input.setSelectionRange(nodes.input.value.length, nodes.input.value.length);
      return;
    }
  });
  nodes.input.addEventListener('input', () => {
    nodes.completion.textContent = '';
  });

  document.addEventListener('keydown', (event) => {
    if (failed || composing || !isEligibleTypingTarget(event)) {
      return;
    }
    event.preventDefault();
    insertAtPromptSelection(nodes.input, event.key);
    nodes.completion.textContent = '';
    settleViewport(nodes.input, 'center');
  });

  try {
    preserveBootLog(nodes);
    nodes.fallback.hidden = true;
    nodes.session.hidden = false;
    updatePrompt();
  } catch {
    fail();
    return;
  }
  setStartupState(nodes.root, 'ready');
}
