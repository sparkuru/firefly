/** One observer owns every live stream region; clear releases all retained nodes. */
export function createStreamOverflowController() {
  const regions = new Map<HTMLElement, HTMLElement>();
  const articles = new Set<HTMLElement>();
  const update = (region: HTMLElement, hint: HTMLElement): void => {
    const remaining = region.scrollWidth - region.clientWidth;
    const left = remaining > 1 && region.scrollLeft > 1;
    const right = remaining > 1 && region.scrollLeft < remaining - 1;
    region.toggleAttribute('data-scroll-left', left);
    region.toggleAttribute('data-scroll-right', right);
    hint.hidden = !left && !right;
    hint.textContent = left && right ? '← Scroll horizontally →' : left ? '← Scroll left' : 'Scroll right →';
    const table = region.querySelector('table');
    const firstCell = table?.rows[0]?.cells[0];
    const simple = table !== null && !table.querySelector('[colspan], [rowspan]');
    region.toggleAttribute('data-sticky-column', Boolean(simple && firstCell &&
      firstCell.offsetWidth <= region.clientWidth * 0.4));
  };
  const refresh = (): void => {
    for (const article of articles) {
      const toolbar = article.querySelector<HTMLElement>('.terminal-stream-actions');
      if (toolbar) article.style.setProperty('--terminal-stream-toolbar-height', `${toolbar.offsetHeight}px`);
    }
    for (const [region, hint] of regions) update(region, hint);
  };
  const observer = new ResizeObserver(refresh);
  const onScroll = (event: Event): void => {
    const region = event.currentTarget;
    if (!(region instanceof HTMLElement)) return;
    const hint = regions.get(region);
    if (hint) update(region, hint);
  };
  return {
    add(root: HTMLElement): void {
      for (const article of root.querySelectorAll<HTMLElement>('[data-terminal-stream-document]')) {
        articles.add(article);
        const toolbar = article.querySelector('.terminal-stream-actions');
        if (toolbar) observer.observe(toolbar);
      }
      for (const region of root.querySelectorAll<HTMLElement>('.terminal-stream-prose :is(.terminal-wide, .wide-content)')) {
        const frame = document.createElement('div');
        frame.className = 'terminal-stream-wide-frame';
        const hint = document.createElement('p');
        hint.className = 'terminal-stream-scroll-hint';
        hint.setAttribute('aria-hidden', 'true');
        region.before(frame);
        frame.append(hint, region);
        regions.set(region, hint);
        region.addEventListener('scroll', onScroll, { passive: true });
        observer.observe(region);
        if (region.firstElementChild) observer.observe(region.firstElementChild);
        update(region, hint);
      }
    },
    refresh,
    clear(): void {
      observer.disconnect();
      for (const region of regions.keys()) region.removeEventListener('scroll', onScroll);
      regions.clear();
      articles.clear();
    }
  };
}
