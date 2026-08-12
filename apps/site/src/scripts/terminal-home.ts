import {
  DEFAULT_TERMINAL_PROMPT,
  completeCommand,
  createTerminalState,
  decodeTerminalEntries,
  executeCommand,
  navigateHistory,
  type TerminalEffect,
  type TerminalEntry,
  type TerminalState
} from '@f1refly/presentation-terminal/runtime';

interface TerminalNodes {
  readonly fallback: HTMLElement;
  readonly session: HTMLElement;
  readonly form: HTMLFormElement;
  readonly input: HTMLInputElement;
  readonly transcript: HTMLElement;
  readonly completion: HTMLElement;
  readonly announcer: HTMLElement;
  readonly failure: HTMLElement;
  readonly fallbackHeading: HTMLElement;
}

interface TerminalTemplates {
  readonly byFilename: ReadonlyMap<string, HTMLTemplateElement>;
}

interface RenderContext {
  readonly templates: TerminalTemplates;
  readonly instance: number;
}

interface RenderResult {
  readonly focusTarget: HTMLElement | null;
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
    fallback: requireElement(root, '[data-terminal-fallback]', HTMLElement),
    session: requireElement(root, '[data-terminal-session]', HTMLElement),
    form: requireElement(root, '[data-terminal-form]', HTMLFormElement),
    input: requireElement(root, '#terminal-command', HTMLInputElement),
    transcript: requireElement(root, '[data-terminal-transcript]', HTMLElement),
    completion: requireElement(root, '[data-terminal-completion]', HTMLElement),
    announcer: requireElement(root, '[data-terminal-announcer]', HTMLElement),
    failure: requireElement(root, '[data-terminal-failure]', HTMLElement),
    fallbackHeading: requireElement(root, '#terminal-recovery-heading', HTMLElement)
  };
}

function readEntries(root: HTMLElement): readonly TerminalEntry[] {
  const elements = root.querySelectorAll<HTMLElement>('[data-terminal-entry]');
  const raw: unknown[] = [];
  for (const element of elements) {
    raw.push({
      kind: element.dataset.terminalEntryKind,
      slug: element.dataset.terminalEntrySlug,
      filename: element.dataset.terminalEntryFilename,
      title: element.dataset.terminalEntryTitle,
      href: element.dataset.terminalEntryHref,
      date: element.dataset.terminalEntryDate
    });
  }
  return decodeTerminalEntries(raw);
}

function readTemplates(
  root: HTMLElement,
  entries: readonly TerminalEntry[]
): TerminalTemplates {
  const expected = new Set<string>(entries.map((entry) => entry.filename));
  const byFilename = new Map<string, HTMLTemplateElement>();

  for (const template of root.querySelectorAll<HTMLTemplateElement>('[data-terminal-template]')) {
    if (!(template instanceof HTMLTemplateElement)) {
      throw new TypeError('Terminal document templates must use native template elements.');
    }
    const filename = template.getAttribute('data-terminal-template-filename');
    const streamDocument = template.content.children.length === 1
      ? template.content.firstElementChild
      : null;
    const streamTitles = streamDocument instanceof HTMLElement
      ? streamDocument.querySelectorAll<HTMLElement>('[data-terminal-stream-title]')
      : [];
    const streamTitle = streamTitles.length === 1 ? streamTitles[0] : null;
    if (
      filename === null ||
      !expected.has(filename) ||
      byFilename.has(filename) ||
      !(streamDocument instanceof HTMLElement) ||
      !streamDocument.matches('[data-terminal-stream-document]') ||
      template.content.querySelectorAll('[data-terminal-stream-document]').length !== 1 ||
      streamTitle === null ||
      streamTitle.id.length === 0 ||
      streamDocument.getAttribute('aria-labelledby') !== streamTitle.id ||
      template.content.querySelector('script') !== null
    ) {
      throw new TypeError('Terminal document templates must exactly match the public index.');
    }
    byFilename.set(filename, template);
  }

  if (byFilename.size !== expected.size) {
    throw new TypeError('Terminal document templates must exactly match the public index.');
  }
  return { byFilename };
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
    case 'entries': {
      if (effect.entries.length === 0) {
        appendTextLine(record, `No public ${effect.label}.`);
        return { focusTarget: null };
      }
      const list = document.createElement('ul');
      for (const entry of effect.entries) {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = entry.href;
        link.textContent = entry.filename;
        item.append(link, document.createTextNode(` — ${entry.date} — ${entry.title}`));
        list.append(item);
      }
      record.append(list);
      return { focusTarget: null };
    }
    case 'document': {
      const template = context.templates.byFilename.get(effect.entry.filename);
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
    case 'clear':
      return { focusTarget: null };
    default: {
      const exhaustive: never = effect;
      throw new TypeError(`Unsupported Terminal effect: ${String(exhaustive)}`);
    }
  }
}

function appendCommandLine(record: HTMLElement, command: string): void {
  const line = document.createElement('p');
  line.className = 'terminal-command-line';
  const prompt = document.createElement('span');
  prompt.className = 'terminal-prompt';
  prompt.textContent = DEFAULT_TERMINAL_PROMPT;
  line.append(prompt, document.createTextNode(` ${command}`));
  record.append(line);
}

function showFatalFailure(nodes: TerminalNodes): void {
  nodes.session.hidden = true;
  nodes.failure.hidden = false;
  nodes.fallback.hidden = false;
  nodes.fallbackHeading.focus();
}

export function startTerminalHome(
  root: HTMLElement,
  seams: TerminalControllerSeams = {}
): void {
  let nodes: TerminalNodes;
  let entries: readonly TerminalEntry[];
  let templates: TerminalTemplates;
  try {
    nodes = readNodes(root);
    entries = readEntries(root);
    templates = readTemplates(root, entries);
  } catch {
    return;
  }

  let state: TerminalState = createTerminalState();
  let composing = false;
  let failed = false;
  let outputInstance = 0;
  const execute = seams.execute ?? executeCommand;
  const render = seams.render ?? renderEffect;

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
      const result = execute({ state, input: command, entries });
      state = result.state;
      nodes.completion.textContent = '';
      if (result.effect === null) {
        return;
      }
      if (result.effect.kind === 'clear') {
        nodes.transcript.replaceChildren();
        nodes.input.value = '';
        nodes.announcer.textContent = result.announcement;
        nodes.input.focus();
        return;
      }

      const record = document.createElement('section');
      record.className = 'terminal-record';
      appendCommandLine(record, command.trim());
      outputInstance += 1;
      const rendered = render(result.effect, record, {
        templates,
        instance: outputInstance
      });
      nodes.transcript.append(record);
      nodes.input.value = '';
      nodes.announcer.textContent = result.announcement;
      if (rendered.focusTarget === null) {
        nodes.input.focus();
      } else {
        rendered.focusTarget.focus();
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
  nodes.input.addEventListener('compositionstart', () => {
    composing = true;
  });
  nodes.input.addEventListener('compositionend', () => {
    composing = false;
  });
  nodes.input.addEventListener('keydown', (event) => {
    if (composing || event.isComposing) {
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
    if (
      event.key === 'Tab' &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      const completion = completeCommand(nodes.input.value, entries);
      if (completion.kind === 'unique') {
        event.preventDefault();
        nodes.input.value = completion.value;
        nodes.completion.textContent = '';
      } else if (completion.kind === 'ambiguous') {
        nodes.completion.textContent = `Matches: ${completion.candidates.join(', ')}`;
      } else {
        nodes.completion.textContent = '';
      }
    }
  });

  nodes.fallback.hidden = true;
  nodes.session.hidden = false;
}
