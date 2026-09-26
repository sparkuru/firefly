import { MOBILE_DOCUMENT_NAVIGATION_QUERY } from '../lib/document-navigation';
import {
  createHomeSearchDocument, decodeHomeSearchMetadata, extractHomeSearchBody,
  normalizeSearchText, searchHomeDocuments, type HomeSearchDocument, type HomeSearchMetadata
} from '../lib/home-search';

interface SearchSource {
  readonly metadata: HomeSearchMetadata;
  readonly template: HTMLTemplateElement;
}

function readSources(root: HTMLElement): readonly SearchSource[] {
  const entries = new Map<string | null, string | null>();
  for (const entry of root.querySelectorAll('[data-terminal-entry]')) {
    const path = entry.getAttribute('data-terminal-entry-virtual-path');
    if (path === null || entries.has(path)) throw new TypeError('Invalid public search index.');
    entries.set(path, entry.getAttribute('data-terminal-entry-href'));
  }
  const sources: SearchSource[] = [];
  const paths = new Set<string>();
  const hrefs = new Set<string>();
  for (const node of root.querySelectorAll('[data-terminal-template]')) {
    if (!(node instanceof HTMLTemplateElement)) throw new TypeError('Invalid search template.');
    const metadata = decodeHomeSearchMetadata(JSON.parse(node.dataset.homeSearchMetadata ?? ''));
    if (paths.has(metadata.virtualPath) || hrefs.has(metadata.href) ||
      node.dataset.terminalTemplatePath !== metadata.virtualPath ||
      entries.get(metadata.virtualPath) !== metadata.href) {
      throw new TypeError('Search templates must match the complete public index.');
    }
    paths.add(metadata.virtualPath);
    hrefs.add(metadata.href);
    sources.push({ metadata, template: node });
  }
  if (sources.length !== entries.size) throw new TypeError('Incomplete search index.');
  return sources;
}

export function startHomeSearch(root: HTMLElement): void {
  const section = root.querySelector<HTMLElement>('[data-home-search]');
  const form = section?.querySelector<HTMLFormElement>('form');
  const input = section?.querySelector<HTMLInputElement>('input');
  const clear = section?.querySelector<HTMLButtonElement>('[data-home-search-clear]');
  const status = section?.querySelector<HTMLElement>('[data-home-search-status]');
  const results = section?.querySelector<HTMLUListElement>('[data-home-search-results]');
  const error = root.querySelector<HTMLElement>('[data-home-search-error]');
  if (section?.dataset.homeSearchReady === 'true') return;
  let failed = false;
  let timer: number | undefined;
  const cancel = (): void => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
  };
  const fail = (): void => {
    failed = true;
    cancel();
    if (section?.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
    if (section) {
      section.hidden = true;
      section.dataset.homeSearchReady = 'false';
    }
    if (error) error.hidden = false;
    root.dataset.homeSearchFailed = 'true';
    const fallback = root.querySelector<HTMLElement>('[data-terminal-fallback]');
    if (fallback) fallback.hidden = false;
  };
  if (!section || !form || !input || !clear || !status || !results || !error) {
    fail();
    return;
  }
  try {
    const sources = readSources(root);
    const media = window.matchMedia(MOBILE_DOCUMENT_NAVIGATION_QUERY);
    let documents: readonly HomeSearchDocument[] | undefined;
    let composing = false;
    const synchronize = (): void => {
      cancel();
      if (!media.matches && section.contains(document.activeElement)) {
        (document.activeElement as HTMLElement).blur();
      }
      section.hidden = failed || !media.matches;
      if (media.matches && !failed) schedule();
    };
    const resetResults = (): void => {
      results.replaceChildren();
      status.textContent = '';
      results.hidden = true;
      clear.disabled = input.value === '';
    };
    const search = (): void => {
      cancel();
      if (failed || composing || !media.matches) return;
      if (normalizeSearchText(input.value) === '') {
        resetResults();
        return;
      }
      try {
        documents ??= sources.map(({ metadata, template }) => {
          const prose = template.content.querySelectorAll('.terminal-stream-prose');
          if (prose.length !== 1 || template.content.querySelector('script') !== null) {
            throw new TypeError('Invalid homepage search body.');
          }
          return createHomeSearchDocument(metadata, extractHomeSearchBody(prose[0]!));
        });
        const matches = searchHomeDocuments(documents, input.value);
        const fragment = document.createDocumentFragment();
        for (const { metadata, context } of matches) {
          const item = document.createElement('li');
          const link = document.createElement('a');
          link.href = metadata.href;
          link.textContent = metadata.title;
          const date = document.createElement('time');
          date.dateTime = metadata.date;
          date.textContent = metadata.date;
          const path = document.createElement('p');
          path.className = 'home-search-path';
          path.textContent = `~/blog/${metadata.virtualPath}`;
          const excerpt = document.createElement('p');
          excerpt.textContent = context;
          item.append(link, date, path, excerpt);
          fragment.append(item);
        }
        results.replaceChildren(fragment);
        results.hidden = matches.length === 0;
        status.textContent = matches.length === 0 ? '没有找到匹配的文章。' : `找到 ${matches.length} 篇文章`;
        clear.disabled = false;
      } catch {
        fail();
      }
    };
    const schedule = (): void => {
      cancel();
      clear.disabled = input.value === '';
      if (failed || composing || !media.matches) return;
      if (normalizeSearchText(input.value) === '') resetResults();
      else timer = window.setTimeout(search, 150);
    };
    input.addEventListener('compositionstart', () => { composing = true; cancel(); });
    input.addEventListener('compositionend', () => { composing = false; schedule(); });
    input.addEventListener('input', schedule);
    form.addEventListener('submit', (event) => { event.preventDefault(); search(); });
    clear.addEventListener('click', () => {
      cancel();
      composing = false;
      input.value = '';
      resetResults();
      input.focus({ preventScroll: true });
      root.dispatchEvent(new CustomEvent('firefly:home-search-clear'));
    });
    media.addEventListener('change', synchronize);
    section.dataset.homeSearchReady = 'true';
    synchronize();
  } catch {
    fail();
  }
}
