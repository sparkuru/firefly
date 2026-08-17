type ReaderMode = 'normal' | 'visual' | 'search' | 'command';
type SearchDirection = 1 | -1;
const searchHighlightName = 'terminal-reader-search';
const activeSearchHighlightName = 'terminal-reader-search-active';

type SearchMatch = {
  readonly unitIndex: number;
  readonly range: Range;
};

type SearchTextPoint = readonly [Text, number];

type SearchTextIndex = {
  readonly foldedText: string;
  readonly startPoints: ReadonlyMap<number, SearchTextPoint>;
  readonly endPoints: ReadonlyMap<number, SearchTextPoint>;
};

const readingUnitSelector = [
  ':scope > h2',
  ':scope > h3',
  ':scope > h4',
  ':scope > h5',
  ':scope > h6',
  ':scope > p',
  ':scope > blockquote',
  ':scope > ul > li',
  ':scope > ol > li',
  ':scope > pre',
  ':scope > table',
  ':scope > .terminal-wide'
].join(',');

const protectedReaderTargetSelector = [
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

function requireOne<T extends Element>(root: ParentNode, selector: string, constructor: new (...args: never[]) => T): T {
  const nodes = root.querySelectorAll(selector);
  if (nodes.length !== 1 || !(nodes[0] instanceof constructor)) throw new TypeError(`Expected one reader node: ${selector}`);
  return nodes[0];
}

function buildSearchTextIndex(unit: HTMLElement): SearchTextIndex {
  const startPoints = new Map<number, SearchTextPoint>();
  const endPoints = new Map<number, SearchTextPoint>();
  let foldedText = '';
  const walker = document.createTreeWalker(unit, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node instanceof Text) {
    const value = node.nodeValue ?? '';
    for (let offset = 0; offset < value.length;) {
      const codePoint = value.codePointAt(offset);
      if (codePoint === undefined) break;
      const nextOffset = offset + (codePoint > 0xffff ? 2 : 1);
      const foldedCharacter = String.fromCodePoint(codePoint).toLocaleLowerCase();
      startPoints.set(foldedText.length, [node, offset]);
      foldedText += foldedCharacter;
      endPoints.set(foldedText.length, [node, nextOffset]);
      offset = nextOffset;
    }
    node = walker.nextNode();
  }

  return { foldedText, startPoints, endPoints };
}

function collectSearchMatches(units: readonly HTMLElement[], query: string): SearchMatch[] {
  if (query.length === 0) return [];
  const foldedQuery = query.toLocaleLowerCase();
  if (foldedQuery.length === 0) return [];

  return units.flatMap((unit, unitIndex) => {
    const { foldedText, startPoints, endPoints } = buildSearchTextIndex(unit);
    const matches: SearchMatch[] = [];
    let searchOffset = 0;

    while (searchOffset <= foldedText.length - foldedQuery.length) {
      const matchOffset = foldedText.indexOf(foldedQuery, searchOffset);
      if (matchOffset === -1) break;
      const matchEnd = matchOffset + foldedQuery.length;
      const startPoint = startPoints.get(matchOffset);
      const endPoint = endPoints.get(matchEnd);
      if (startPoint !== undefined && endPoint !== undefined) {
        const range = document.createRange();
        range.setStart(startPoint[0], startPoint[1]);
        range.setEnd(endPoint[0], endPoint[1]);
        if (!range.collapsed) matches.push({ unitIndex, range });
      }
      searchOffset = matchEnd;
    }

    return matches;
  });
}

export function startTerminalReader(root: HTMLElement): void {
  const region = requireOne(root, '[data-terminal-reader-region]', HTMLElement);
  const status = requireOne(root, '[data-terminal-reader-status]', HTMLElement);
  const modeNode = requireOne(root, '[data-reader-mode]', HTMLElement);
  const positionNode = requireOne(root, '[data-reader-position]', HTMLElement);
  const searchStatus = requireOne(root, '[data-reader-search-status]', HTMLElement);
  const messageNode = requireOne(root, '[data-reader-message]', HTMLElement);
  const announcer = requireOne(root, '[data-reader-announcer]', HTMLElement);
  const searchForm = requireOne(root, '[data-reader-search-form]', HTMLFormElement);
  const searchInput = requireOne(root, '#terminal-reader-search', HTMLInputElement);
  const searchLabel = requireOne(root, '[data-reader-search-label]', HTMLLabelElement);
  const searchPrefix = requireOne(root, '[data-reader-search-prefix]', HTMLElement);
  const commandForm = requireOne(root, '[data-reader-command-form]', HTMLFormElement);
  const commandInput = requireOne(root, '#terminal-reader-command', HTMLInputElement);
  const fragmentEntry = root.dataset.terminalReaderEntry === 'fragment';
  const readerFragment = window.location.hash === '#terminal-reader';
  if (fragmentEntry && !readerFragment) return;
  status.hidden = false;
  region.tabIndex = 0;
  const units = [...region.querySelectorAll<HTMLElement>(readingUnitSelector)].filter((unit) => unit.textContent?.trim());
  if (units.length === 0) return;

  const occupiedIds = new Set([...document.querySelectorAll<HTMLElement>('[id]')].map(({ id }) => id));
  units.forEach((unit, index) => {
    if (unit.id.length === 0) {
      const base = `terminal-reader-unit-${index + 1}`;
      let candidate = base;
      let suffix = 2;
      while (occupiedIds.has(candidate)) {
        candidate = `${base}-${suffix}`;
        suffix += 1;
      }
      unit.id = candidate;
      occupiedIds.add(candidate);
    }
    unit.dataset.readerUnit = String(index + 1);
  });

  let mode: ReaderMode = 'normal';
  let activeIndex = 0;
  let visualAnchor: number | null = null;
  let ownedRange: Range | null = null;
  let composing = false;
  let searchDirection: SearchDirection = 1;
  let searchQuery = '';
  let searchMatches: SearchMatch[] = [];
  let searchMatchIndex = -1;
  const highlightRegistry = (CSS as unknown as {
    highlights?: { delete(name: string): void; set(name: string, highlight: unknown): void };
  }).highlights;
  const HighlightConstructor = (globalThis as typeof globalThis & {
    Highlight?: new (...ranges: Range[]) => unknown;
  }).Highlight;

  const motionBehavior = (): ScrollBehavior => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

  const announce = (message: string) => {
    messageNode.textContent = message;
    announcer.textContent = message;
  };

  const searchStatusText = () => searchMatches.length === 0
    ? `No results for “${searchQuery}”.`
    : `${searchMatchIndex + 1}/${searchMatches.length} matches for “${searchQuery}”.`;

  const updateSearchStatus = () => {
    status.toggleAttribute(
      'data-reader-search-active',
      searchQuery.length > 0 && mode !== 'search' && mode !== 'command'
    );
    if (searchQuery.length === 0) {
      searchStatus.hidden = true;
      searchStatus.textContent = '';
      return;
    }
    searchStatus.hidden = false;
    searchStatus.textContent = searchStatusText();
  };

  const clearSearch = () => {
    searchQuery = '';
    searchMatches = [];
    searchMatchIndex = -1;
    renderSearchHighlights();
  };

  const updateStatus = () => {
    modeNode.textContent = `-- ${mode.toUpperCase()} --`;
    positionNode.textContent = `${activeIndex + 1}/${units.length}`;
    region.setAttribute('aria-activedescendant', units[activeIndex]!.id);
    units.forEach((unit, index) => unit.toggleAttribute('data-reader-active', index === activeIndex));
    updateSearchStatus();
  };

  const settleActive = () => {
    units[activeIndex]!.scrollIntoView({ behavior: motionBehavior(), block: 'center', inline: 'nearest' });
  };

  const settleSearchMatch = (range: Range) => {
    const rect = range.getBoundingClientRect();
    const viewportTop = window.innerHeight * 0.25;
    const viewportBottom = window.innerHeight * 0.75;
    const offset = rect.top < viewportTop
      ? rect.top - viewportTop
      : rect.bottom > viewportBottom
        ? rect.bottom - viewportBottom
        : 0;
    if (offset !== 0) window.scrollBy({ top: offset, behavior: motionBehavior() });
  };

  const clearOwnedSelection = () => {
    const selection = window.getSelection();
    if (selection !== null && ownedRange !== null && selection.rangeCount === 1) {
      const current = selection.getRangeAt(0);
      if (current.startContainer === ownedRange.startContainer &&
        current.startOffset === ownedRange.startOffset &&
        current.endContainer === ownedRange.endContainer &&
        current.endOffset === ownedRange.endOffset) {
        selection.removeAllRanges();
      }
    }
    ownedRange = null;
    visualAnchor = null;
  };

  const renderSearchHighlights = () => {
    highlightRegistry?.delete(searchHighlightName);
    highlightRegistry?.delete(activeSearchHighlightName);
    if (highlightRegistry === undefined || HighlightConstructor === undefined || searchMatches.length === 0) return;
    const ranges = searchMatches.map(({ range }) => range.cloneRange());
    highlightRegistry.set(searchHighlightName, new HighlightConstructor(...ranges));
    const activeMatch = searchMatches[searchMatchIndex];
    if (activeMatch !== undefined) {
      highlightRegistry.set(activeSearchHighlightName, new HighlightConstructor(activeMatch.range.cloneRange()));
    }
  };

  const renderVisualSelection = () => {
    if (visualAnchor === null) return;
    const selection = window.getSelection();
    if (selection === null) return;
    const range = document.createRange();
    range.setStartBefore(units[Math.min(visualAnchor, activeIndex)]!);
    range.setEndAfter(units[Math.max(visualAnchor, activeIndex)]!);
    selection.removeAllRanges();
    selection.addRange(range);
    ownedRange = range.cloneRange();
    announce(`Visual selection: units ${Math.min(visualAnchor, activeIndex) + 1} through ${Math.max(visualAnchor, activeIndex) + 1}.`);
  };

  const moveTo = (nextIndex: number) => {
    activeIndex = Math.max(0, Math.min(units.length - 1, nextIndex));
    updateStatus();
    if (mode === 'visual') renderVisualSelection();
    else announce(`Reading unit ${activeIndex + 1} of ${units.length}.`);
    settleActive();
  };

  const moveToSearchMatch = (nextIndex: number) => {
    const match = searchMatches[nextIndex];
    if (match === undefined) return;
    searchMatchIndex = nextIndex;
    activeIndex = match.unitIndex;
    updateStatus();
    renderSearchHighlights();
    announce(searchStatusText());
    settleSearchMatch(match.range);
  };

  const restoreNormal = (message = 'Normal mode.') => {
    clearOwnedSelection();
    clearSearch();
    mode = 'normal';
    searchForm.hidden = true;
    commandForm.hidden = true;
    updateStatus();
    announce(message);
    region.focus({ preventScroll: true });
  };

  const openSearch = (direction: SearchDirection) => {
    clearOwnedSelection();
    mode = 'search';
    searchDirection = direction;
    searchPrefix.textContent = direction === 1 ? '/' : '?';
    const directionLabel = direction === 1 ? 'forward' : 'backward';
    searchLabel.textContent = `Search document ${directionLabel}`;
    searchInput.placeholder = `Search ${directionLabel}…`;
    searchForm.hidden = false;
    commandForm.hidden = true;
    searchInput.value = '';
    updateStatus();
    announce(direction === 1 ? 'Forward search.' : 'Backward search.');
    searchInput.focus();
  };

  const repeatSearch = (direction: SearchDirection) => {
    if (searchMatches.length === 0) {
      announce(searchQuery.length === 0 ? 'No search query.' : `No results for “${searchQuery}”.`);
      return;
    }
    const nextIndex = (searchMatchIndex + direction + searchMatches.length) % searchMatches.length;
    moveToSearchMatch(nextIndex);
  };

  const hasUnownedSelection = () => {
    const selection = window.getSelection();
    if (selection === null || selection.isCollapsed) return false;
    if (ownedRange === null || selection.rangeCount !== 1) return true;
    const current = selection.getRangeAt(0);
    return current.startContainer !== ownedRange.startContainer ||
      current.startOffset !== ownedRange.startOffset ||
      current.endContainer !== ownedRange.endContainer ||
      current.endOffset !== ownedRange.endOffset;
  };

  region.addEventListener('compositionstart', () => { composing = true; });
  region.addEventListener('compositionend', () => { composing = false; });
  searchInput.addEventListener('compositionstart', () => { composing = true; });
  searchInput.addEventListener('compositionend', () => { composing = false; });
  commandInput.addEventListener('compositionstart', () => { composing = true; });
  commandInput.addEventListener('compositionend', () => { composing = false; });

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (composing) return;
    const query = searchInput.value;
    searchForm.hidden = true;
    mode = 'normal';
    region.focus({ preventScroll: true });
    if (query.length === 0) {
      clearSearch();
      updateStatus();
      announce('Search cancelled.');
      return;
    }
    searchQuery = query;
    searchMatches = collectSearchMatches(units, query);
    searchMatchIndex = -1;
    renderSearchHighlights();
    if (searchMatches.length === 0) {
      updateStatus();
      announce(`No results for “${query}”.`);
      return;
    }
    const ordered = searchDirection === 1
      ? searchMatches.findIndex(({ unitIndex }) => unitIndex > activeIndex)
      : searchMatches.findLastIndex(({ unitIndex }) => unitIndex < activeIndex);
    searchMatchIndex = ordered === -1 ? (searchDirection === 1 ? 0 : searchMatches.length - 1) : ordered;
    moveToSearchMatch(searchMatchIndex);
  });

  commandForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (composing) return;
    if (commandInput.value === 'q') {
      window.location.assign('/');
      return;
    }
    announce(`Unsupported reader command: :${commandInput.value}. Only :q is available.`);
    commandInput.select();
  });

  for (const input of [searchInput, commandInput]) {
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !event.isComposing && !composing) {
        event.preventDefault();
        restoreNormal('Cancelled.');
      }
    });
  }

  region.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.isComposing || composing || event.ctrlKey || event.altKey || event.metaKey || hasUnownedSelection()) return;
    const target = event.target;
    if (target instanceof Element && target.closest(protectedReaderTargetSelector) !== null) return;
    const key = event.key;
    const handled = ['j', 'k', 'g', 'G', 'v', '/', '?', 'n', 'N', ':', 'Escape'].includes(key);
    if (!handled || (event.shiftKey && !['G', '?', 'N', ':'].includes(key))) return;
    event.preventDefault();
    if (key === 'Escape') { restoreNormal('Normal mode.'); return; }
    if (key === 'j') { moveTo(activeIndex + 1); return; }
    if (key === 'k') { moveTo(activeIndex - 1); return; }
    if (key === 'g') { moveTo(0); return; }
    if (key === 'G') { moveTo(units.length - 1); return; }
    if (key === 'v') {
      mode = 'visual';
      visualAnchor = activeIndex;
      updateStatus();
      renderVisualSelection();
      return;
    }
    if (key === '/') { openSearch(1); return; }
    if (key === '?') { openSearch(-1); return; }
    if (key === 'n') { repeatSearch(searchDirection); return; }
    if (key === 'N') { repeatSearch(searchDirection === 1 ? -1 : 1); return; }
    clearOwnedSelection();
    mode = 'command';
    commandForm.hidden = false;
    searchForm.hidden = true;
    commandInput.value = '';
    updateStatus();
    announce('Reader command mode. Type q to exit.');
    commandInput.focus();
  });

  updateStatus();
  if (readerFragment) {
    window.requestAnimationFrame(() => {
      if (window.location.hash === '#terminal-reader') {
        region.focus({ preventScroll: true });
      }
    });
  }
}
