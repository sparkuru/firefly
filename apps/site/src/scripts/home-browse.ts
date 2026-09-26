import { MOBILE_DOCUMENT_NAVIGATION_QUERY } from '../lib/document-navigation';
import { homeBrowseHref, homeBrowseState } from '../lib/home-browse-history';

interface BrowseSnapshot {
  readonly fragment: DocumentFragment;
  readonly path: string;
  readonly parent: string;
}

const started = new WeakSet<HTMLElement>();

function readSnapshots(root: HTMLElement): ReadonlyMap<string, BrowseSnapshot> {
  const snapshots = new Map<string, BrowseSnapshot>();
  const documentHrefs = new Set(Array.from(root.querySelectorAll('[data-terminal-entry]'), (entry) => entry.getAttribute('data-terminal-entry-href')));
  const experimentHrefs = new Set(Array.from(root.querySelectorAll('[data-terminal-experiment]'), (entry) => entry.getAttribute('data-home-browse-experiment-href')));
  for (const node of root.querySelectorAll('[data-home-browse-template]')) {
    if (!(node instanceof HTMLTemplateElement)) throw new TypeError('Invalid browse snapshot.');
    const href = node.dataset.homeBrowseHref;
    const path = node.dataset.homeBrowsePath;
    const parent = node.dataset.homeBrowseParent;
    if (!href || !path || !parent || snapshots.has(href) || href !== `/${path}` ||
      !/^(?:posts(?:\/[^\\/?#%\u0000-\u001f\u007f]+)*|pages|lab)\/$/u.test(path) ||
      path.split('/').some((segment) => segment === '.' || segment === '..') ||
      node.content.querySelector('script, style, iframe, form, template, [id], [data-terminal-entry], [data-terminal-template], [data-terminal-friend]')) {
      throw new TypeError('Invalid browse projection.');
    }
    for (const link of node.content.querySelectorAll('a')) {
      const target = link.getAttribute('href');
      if (link.hasAttribute('data-home-browse-directory')) {
        if (!target?.startsWith(href)) throw new TypeError('Invalid browse child.');
      } else if (!documentHrefs.has(target) && !(href === '/lab/' && experimentHrefs.has(target))) {
        throw new TypeError('Invalid browse destination.');
      }
    }
    snapshots.set(href, { fragment: node.content.cloneNode(true) as DocumentFragment, path, parent });
  }
  for (const href of ['/pages/', '/lab/', '/posts/']) {
    if (!snapshots.has(href)) throw new TypeError('Missing homepage section.');
  }
  for (const [href, snapshot] of snapshots) {
    const segments = snapshot.path.slice(0, -1).split('/');
    const parent = segments.length === 1 ? '/' : `/${segments.slice(0, -1).join('/')}/`;
    if (snapshot.parent !== parent || (parent !== '/' && !snapshots.has(parent))) throw new TypeError('Invalid browse parent.');
    for (const link of snapshot.fragment.querySelectorAll('[data-home-browse-directory]')) {
      const child = link.getAttribute('href');
      // Pages retain their existing native hierarchy; only registered post directories are enhanced.
      if (href !== '/pages/' && (!child || snapshots.get(child)?.parent !== href)) throw new TypeError('Invalid browse hierarchy.');
    }
  }
  return snapshots;
}

export function startHomeBrowse(root: HTMLElement): void {
  if (started.has(root)) return;
  started.add(root);
  const navigation = root.querySelector<HTMLElement>('[data-home-root-navigation]');
  const panel = root.querySelector<HTMLElement>('[data-home-browse-panel]');
  const breadcrumbs = panel?.querySelector<HTMLElement>('[data-home-browse-breadcrumbs]');
  const list = panel?.querySelector<HTMLElement>('[data-home-browse-list]');
  const friends = root.querySelector<HTMLElement>('[data-home-friends]');
  let failed = false;
  const ownsFocus = (): boolean => navigation?.contains(document.activeElement) === true || panel?.contains(document.activeElement) === true;
  const fail = (): void => {
    failed = true;
    if (ownsFocus()) (document.activeElement as HTMLElement).blur();
    if (panel) panel.hidden = true;
    list?.replaceChildren();
    root.dataset.homeBrowseReady = 'false';
    root.dataset.homeBrowseFailed = 'true';
    delete root.dataset.homeBrowseView;
  };
  try {
    if (!navigation || !panel || !breadcrumbs || !list) throw new TypeError('Incomplete browse controls.');
    const snapshots = readSnapshots(root);
    const directories = new Set(snapshots.keys());
    const media = window.matchMedia(MOBILE_DOCUMENT_NAVIGATION_QUERY);
    let current = '/';
    let historyInitialized = false;
    const breadcrumbNodes = (href: string): DocumentFragment => {
      const fragment = document.createDocumentFragment();
      if (href === '/') return fragment;
      fragment.append(document.createTextNode('~/'));
      const chain: { href: string; label: string }[] = [{ href: '/', label: 'blogs' }];
      let ancestor = href;
      while (ancestor !== '/') {
        const snapshot = snapshots.get(ancestor);
        if (!snapshot) throw new TypeError('Unknown browse ancestor.');
        chain.splice(1, 0, { href: ancestor, label: snapshot.path.slice(0, -1).split('/').at(-1)! });
        ancestor = snapshot.parent;
      }
      for (const [index, segment] of chain.entries()) {
        if (index > 0) fragment.append(document.createTextNode('/'));
        const link = document.createElement('a');
        link.href = segment.href;
        link.textContent = segment.label;
        link.dataset.homeBrowseDirectory = '';
        if (segment.href === href) link.setAttribute('aria-current', 'page');
        fragment.append(link);
      }
      return fragment;
    };
    const render = (href: string, focus: boolean, fragment = snapshots.get(href)?.fragment.cloneNode(true)): void => {
      const snapshot = snapshots.get(href);
      if (href !== '/' && !snapshot) throw new TypeError('Unknown browse directory.');
      const focusFriends = href !== '/' && media.matches && friends?.contains(document.activeElement) === true;
      breadcrumbs.replaceChildren(breadcrumbNodes(href));
      list.replaceChildren(...(fragment ? [fragment] : []));
      current = href;
      panel.hidden = !media.matches || href === '/';
      root.dataset.homeBrowseView = media.matches && href !== '/' ? 'directory' : 'root';
      if ((focus || focusFriends) && media.matches) (href === '/' ? navigation.querySelector<HTMLAnchorElement>('a') : breadcrumbs)?.focus({ preventScroll: true });
    };
    const restore = (): void => {
      if (failed || !media.matches) return;
      const href = homeBrowseHref(history.state, directories);
      history.replaceState(homeBrowseState(history.state, href), '');
      const focus = historyInitialized && ownsFocus();
      render(href, focus);
      historyInitialized = true;
    };
    const change = (href: string): void => {
      if (href === current) return;
      const focus = ownsFocus();
      // Prepare the safe snapshot before modifying history or consuming native activation.
      if (href !== '/' && !snapshots.has(href)) throw new TypeError('Unknown browse directory.');
      const fragment = snapshots.get(href)?.fragment.cloneNode(true);
      history.pushState(homeBrowseState(history.state, href), '');
      render(href, focus, fragment);
    };
    const safely = (action: () => void): void => {
      try { action(); } catch { fail(); }
    };
    root.addEventListener('click', (event) => {
      if (failed || !media.matches || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-home-browse-directory]') : null;
      if (!link || (!navigation.contains(link) && !panel.contains(link)) || link.hasAttribute('download') || (link.target && link.target.toLowerCase() !== '_self')) return;
      const href = link.getAttribute('href');
      if (href !== '/' && (!href || !snapshots.has(href))) return;
      safely(() => { change(href!); event.preventDefault(); });
    });
    root.addEventListener('firefly:home-search-clear', () => {
      if (!failed && media.matches) safely(() => change('/'));
    });
    window.addEventListener('popstate', () => safely(restore));
    window.addEventListener('pageshow', () => safely(restore));
    media.addEventListener('change', () => safely(() => {
      if (!media.matches) {
        if (ownsFocus()) (document.activeElement as HTMLElement).blur();
        panel.hidden = true;
        root.dataset.homeBrowseView = 'root';
      } else restore();
    }));
    root.dataset.homeBrowseReady = 'true';
    restore();
  } catch {
    fail();
  }
}
