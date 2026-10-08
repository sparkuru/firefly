import { createMemoTimeIndex, nearestMemo, type MemoTimeRecord } from '../lib/memo-time.mjs';

export function startMemoTimeline(root: HTMLElement) {
  if (root.dataset.memoReady) return;
  const slider = root.querySelector<HTMLElement>('[data-memo-slider]');
  const output = root.querySelector<HTMLElement>('[data-memo-current-date]');
  const header = document.querySelector<HTMLElement>('[data-memo-header]');
  const control = root.querySelector<HTMLElement>('[data-memo-time-control]');
  const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-memo-entry]'));
  const records: MemoTimeRecord[] = cards.map((card) => ({ id: card.id, date: card.dataset.memoDate ?? '' }));
  const index = createMemoTimeIndex(records);
  if (!slider || !output || !control || index.entries.length !== cards.length) return;
  const byId = new Map(cards.map((card) => [card.id, card]));
  const narrow = window.matchMedia('(max-width: 48rem)');
  let owner: 'browsing' | 'dragging' | 'settling' = 'browsing';
  let active = 0;
  let pointer: number | null = null;
  let frame = 0;
  let releaseFrame = 0;
  let requested = 0;

  const reference = () => Math.ceil(header?.getBoundingClientRect().bottom ?? 0) + (narrow.matches ? control.getBoundingClientRect().height : 0) + 20;
  const measure = () => {
    root.style.setProperty('--memo-header-height', (header?.getBoundingClientRect().height ?? 64) + 'px');
    const feed = root.querySelector<HTMLElement>('[data-memo-feed]');
    const last = cards.at(-1);
    if (feed && last) feed.style.paddingBottom = Math.max(0, innerHeight - reference() - last.getBoundingClientRect().height + 32) + 'px';
  };
  const setOwner = (value: typeof owner) => { owner = value; root.dataset.memoInteraction = value; };
  const display = (entryIndex: number, position = index.entries[entryIndex]?.position ?? 0) => {
    const entry = index.entries[entryIndex];
    if (!entry) return;
    const previous = index.entries[active]?.id;
    active = entryIndex;
    if (previous && previous !== entry.id) byId.get(previous)?.removeAttribute('data-memo-active');
    byId.get(entry.id)?.setAttribute('data-memo-active', '');
    root.dataset.memoActiveId = entry.id;
    slider.style.setProperty('--memo-position', String(position));
    slider.setAttribute('aria-valuenow', String(entryIndex));
    slider.setAttribute('aria-valuetext', entry.label);
    slider.setAttribute('aria-orientation', narrow.matches ? 'horizontal' : 'vertical');
    output.textContent = entry.label;
    const trackHeight = slider.getBoundingClientRect().height;
    for (const tick of root.querySelectorAll<HTMLElement>('[data-memo-month-tick]')) {
      const current = tick.dataset.memoMonthTick === index.months[entry.month]?.key;
      tick.toggleAttribute('data-memo-active', current);
      const center = Number(tick.dataset.memoSegmentStart) + .5 / index.months.length;
      const activeCenter = (entry.month + .5) / index.months.length;
      tick.toggleAttribute('data-memo-near', !current && Math.abs(center - activeCenter) * trackHeight < 32);
    }
  };
  const align = (entryIndex: number) => {
    const entry = index.entries[entryIndex];
    const card = entry && byId.get(entry.id);
    if (!card) return;
    display(entryIndex);
    window.scrollTo({ top: Math.max(0, window.scrollY + card.getBoundingClientRect().top - reference()), behavior: 'instant' });
  };
  const browse = () => {
    frame = 0;
    if (owner !== 'browsing' || !cards.length) return;
    const line = reference();
    let next = cards.findIndex((card) => card.getBoundingClientRect().bottom > line + 1);
    if (next < 0) next = cards.length - 1;
    display(next);
  };
  const scheduleBrowse = () => { if (!frame) frame = requestAnimationFrame(browse); };
  const settle = (entryIndex: number) => {
    cancelAnimationFrame(releaseFrame);
    setOwner('settling');
    align(entryIndex);
    // Keep induced scroll events from taking ownership of a seek.
    releaseFrame = requestAnimationFrame(() => {
      releaseFrame = requestAnimationFrame(() => { setOwner('browsing'); });
    });
  };
  const interrupt = () => {
    if (owner === 'dragging') {
      cancelAnimationFrame(frame); frame = 0;
      const captured = pointer; pointer = null;
      if (captured !== null && slider.hasPointerCapture(captured)) slider.releasePointerCapture(captured);
    }
    cancelAnimationFrame(releaseFrame);
    setOwner('browsing');
    scheduleBrowse();
  };
  const positionFor = (event: PointerEvent) => {
    const box = slider.getBoundingClientRect();
    return Math.max(0, Math.min(1, narrow.matches ? (event.clientX - box.left) / box.width : (event.clientY - box.top) / box.height));
  };
  const seekFrame = () => {
    frame = 0;
    if (owner !== 'dragging') return;
    const next = nearestMemo(index, requested);
    if (next !== active) align(next);
    display(next, requested);
  };
  slider.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || index.entries.length < 2) return;
    event.preventDefault();
    cancelAnimationFrame(frame);
    cancelAnimationFrame(releaseFrame);
    pointer = event.pointerId;
    setOwner('dragging');
    slider.setPointerCapture(pointer);
    slider.focus({ preventScroll: true });
    requested = positionFor(event);
    frame = requestAnimationFrame(seekFrame);
  });
  slider.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointer || owner !== 'dragging') return;
    requested = positionFor(event);
    if (!frame) frame = requestAnimationFrame(seekFrame);
  });
  const release = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    cancelAnimationFrame(frame);
    frame = 0;
    const selected = nearestMemo(index, requested);
    pointer = null;
    settle(selected);
  };
  slider.addEventListener('pointerup', release);
  slider.addEventListener('pointercancel', release);
  slider.addEventListener('lostpointercapture', release);
  slider.addEventListener('keydown', (event) => {
    if (index.entries.length < 2 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return;
    let next: number | undefined;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = active + 1;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = active - 1;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = index.entries.length - 1;
    if (event.key === 'PageDown' || event.key === 'PageUp') {
      const month = index.entries[active]?.month ?? 0;
      const target = Math.max(0, Math.min(index.months.length - 1, month + (event.key === 'PageDown' ? 1 : -1)));
      next = index.months[target]?.indices[0];
    }
    if (next === undefined || !cards.length) return;
    event.preventDefault();
    settle(Math.max(0, Math.min(cards.length - 1, next)));
  });
  window.addEventListener('scroll', scheduleBrowse, { passive: true });
  window.addEventListener('wheel', interrupt, { passive: true });
  window.addEventListener('touchstart', (event) => { if (!(event.target instanceof Node) || !slider.contains(event.target)) interrupt(); }, { passive: true });
  window.addEventListener('keydown', (event) => { if (event.target !== slider && ['PageDown', 'PageUp', 'Home', 'End', 'ArrowDown', 'ArrowUp', ' '].includes(event.key)) interrupt(); });
  const resize = () => {
    slider.setAttribute('aria-orientation', narrow.matches ? 'horizontal' : 'vertical');
    if (owner !== 'dragging') { measure(); settle(active); }
  };
  narrow.addEventListener('change', resize);
  window.addEventListener('resize', resize, { passive: true });
  const observer = new ResizeObserver(() => { measure(); scheduleBrowse(); });
  if (header) observer.observe(header);
  observer.observe(control);
  for (const card of cards) observer.observe(card);
  const targetFromHash = () => {
    const id = window.location.hash.slice(1);
    const found = index.entries.findIndex((entry) => entry.id === id);
    if (found >= 0) settle(found);
    else scheduleBrowse();
  };
  window.addEventListener('hashchange', targetFromHash);
  window.addEventListener('pageshow', scheduleBrowse);
  slider.setAttribute('aria-valuemax', String(Math.max(0, cards.length - 1)));
  slider.setAttribute('aria-disabled', String(cards.length < 2));
  root.dataset.memoReady = 'true';
  measure();
  setOwner('browsing');
  display(0);
  requestAnimationFrame(targetFromHash);
}

for (const root of document.querySelectorAll<HTMLElement>('[data-memo-timeline]')) {
  try { startMemoTimeline(root); } catch { /* Keep native static reading on initialization failure. */ }
}
