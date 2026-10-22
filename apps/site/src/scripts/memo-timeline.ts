import { createMemoTimeIndex, nearestMemo, type MemoTimeRecord } from '../lib/memo-time.mjs';

export function startMemoTimeline(root: HTMLElement) {
  if (root.dataset.memoReady) return;
  const slider = root.querySelector<HTMLElement>('[data-memo-slider]');
  const output = root.querySelector<HTMLElement>('[data-memo-current-date]');
  const bubble = root.querySelector<HTMLElement>('[data-memo-date-bubble]');
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
  let feedbackTimer = 0;
  let emphasized: HTMLElement | undefined;
  let seekLocked = false;
  let browsingIntent = false;
  let lockedScrollY = 0;
  let lockedGeometry: number[] = [];
  let mousePoint: { x: number; y: number } | null = null;
  let mouseIntent = false;

  const geometry = () => [control.getBoundingClientRect().height, ...cards.flatMap((card) => {
    const box = card.getBoundingClientRect();
    return [box.top + window.scrollY, box.height];
  })];
  const rememberSeek = () => { lockedScrollY = window.scrollY; lockedGeometry = geometry(); };

  const clearFeedback = () => {
    window.clearTimeout(feedbackTimer);
    root.removeAttribute('data-memo-feedback');
    emphasized?.removeAttribute('data-memo-seek');
    emphasized = undefined;
  };
  const feedback = (entryIndex?: number) => {
    clearFeedback();
    root.setAttribute('data-memo-feedback', '');
    if (entryIndex !== undefined) {
      emphasized = byId.get(index.entries[entryIndex]?.id ?? '');
      emphasized?.setAttribute('data-memo-seek', '');
    }
    feedbackTimer = window.setTimeout(clearFeedback, 1400);
  };

  const reference = () => (narrow.matches ? (parseFloat(getComputedStyle(control).top) || 0) + control.getBoundingClientRect().height : 0) + 20;
  const measure = () => {
    const feed = root.querySelector<HTMLElement>('[data-memo-feed]');
    const last = cards.at(-1);
    if (feed && last) feed.style.paddingBottom = Math.max(0, innerHeight - reference() - last.getBoundingClientRect().height + 32) + 'px';
    if (seekLocked) rememberSeek();
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
    const track = slider.getBoundingClientRect();
    if (bubble) {
      bubble.textContent = entry.label;
      const size = narrow.matches ? bubble.offsetWidth : bubble.offsetHeight;
      const extent = narrow.matches ? track.width : track.height;
      const coordinate = Math.max(size / 2, Math.min(extent - size / 2, position * extent));
      bubble.style.setProperty('--memo-bubble-position', coordinate + 'px');
    }
    const trackHeight = narrow.matches ? track.width : track.height;
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
    if (owner !== 'browsing' || seekLocked || !cards.length) return;
    if (mouseIntent && mousePoint) {
      const hovered = document.elementFromPoint(mousePoint.x, mousePoint.y)?.closest<HTMLElement>('[data-memo-entry]');
      const entryIndex = hovered ? cards.indexOf(hovered) : -1;
      if (entryIndex >= 0) { display(entryIndex); return; }
    }
    const top = narrow.matches ? Math.max(0, Math.min(innerHeight, control.getBoundingClientRect().bottom)) : 0;
    const line = (top + innerHeight) / 2;
    const boxes = cards.map((card) => card.getBoundingClientRect());
    const visible = boxes.map((box, entryIndex) => ({ box, entryIndex })).filter(({ box }) => box.bottom > top && box.top < innerHeight);
    const candidates = visible.length ? visible : boxes.map((box, entryIndex) => ({ box, entryIndex }));
    let next = 0;
    let nearest = Infinity;
    for (const { box, entryIndex } of candidates) {
      const distance = Math.max(box.top - line, line - box.bottom, 0);
      if (distance < nearest) { next = entryIndex; nearest = distance; }
    }
    display(next);
  };
  const scheduleBrowse = () => { if (!frame) frame = requestAnimationFrame(browse); };
  const settle = (entryIndex: number, emphasize = false) => {
    cancelAnimationFrame(releaseFrame);
    seekLocked = true;
    browsingIntent = false;
    mouseIntent = false;
    setOwner('settling');
    align(entryIndex);
    rememberSeek();
    if (emphasize) feedback(entryIndex);
    let settledScrollY = window.scrollY;
    // A prior native key scroll can finish after the instant seek. Require quiet frames.
    const release = () => {
      if (!seekLocked || browsingIntent) { setOwner('browsing'); return; }
      if (Math.abs(window.scrollY - settledScrollY) > .5) {
        align(entryIndex);
        settledScrollY = window.scrollY;
        rememberSeek();
        releaseFrame = requestAnimationFrame(release);
        return;
      }
      releaseFrame = requestAnimationFrame(() => {
        if (Math.abs(window.scrollY - settledScrollY) > .5) release();
        else { setOwner('browsing'); rememberSeek(); }
      });
    };
    releaseFrame = requestAnimationFrame(release);
  };
  const interrupt = () => {
    browsingIntent = true;
    if (owner === 'dragging') {
      cancelAnimationFrame(frame); frame = 0;
      const captured = pointer; pointer = null;
      if (captured !== null && slider.hasPointerCapture(captured)) slider.releasePointerCapture(captured);
      seekLocked = true;
      rememberSeek();
      setOwner('browsing');
    }
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
    clearFeedback();
    root.setAttribute('data-memo-feedback', '');
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
    settle(selected, true);
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
    settle(Math.max(0, Math.min(cards.length - 1, next)), true);
  });
  window.addEventListener('scroll', () => {
    if (seekLocked && Math.abs(window.scrollY - lockedScrollY) > .5) {
      // Layout anchoring changes document geometry; a scrollbar scroll changes only the viewport.
      const current = geometry();
      if (current.some((value, position) => Math.abs(value - (lockedGeometry[position] ?? value)) > 1)) rememberSeek();
      else if (owner === 'browsing' || browsingIntent) {
        seekLocked = false;
        mouseIntent = mousePoint !== null;
        browsingIntent = false;
        cancelAnimationFrame(releaseFrame);
        setOwner('browsing');
        clearFeedback();
      }
    }
    scheduleBrowse();
  }, { passive: true });
  window.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || (mousePoint?.x === event.clientX && mousePoint.y === event.clientY)) return;
    mousePoint = { x: event.clientX, y: event.clientY };
    if (owner === 'dragging') return;
    mouseIntent = true;
    const hovered = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-memo-entry]');
    if (hovered && root.contains(hovered)) {
      seekLocked = false;
      browsingIntent = false;
      cancelAnimationFrame(releaseFrame);
      setOwner('browsing');
      clearFeedback();
    }
    scheduleBrowse();
  }, { passive: true });
  const clearMouse = () => { mousePoint = null; mouseIntent = false; scheduleBrowse(); };
  document.addEventListener('pointerout', (event) => { if (event.pointerType === 'mouse' && event.relatedTarget === null) clearMouse(); });
  window.addEventListener('pointercancel', clearMouse);
  window.addEventListener('blur', clearMouse);
  window.addEventListener('pagehide', clearMouse);
  window.addEventListener('wheel', interrupt, { passive: true });
  window.addEventListener('touchstart', (event) => { clearMouse(); if (!(event.target instanceof Node) || !slider.contains(event.target)) interrupt(); }, { passive: true });
  window.addEventListener('pointerdown', (event) => { if (!(event.target instanceof Node) || !control.contains(event.target)) interrupt(); }, { passive: true });
  window.addEventListener('keydown', (event) => { if (event.target !== slider && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.isComposing && ['PageDown', 'PageUp', 'Home', 'End', 'ArrowDown', 'ArrowUp', ' '].includes(event.key)) interrupt(); });
  const resize = () => {
    clearMouse();
    slider.setAttribute('aria-orientation', narrow.matches ? 'horizontal' : 'vertical');
    if (owner !== 'dragging') { measure(); settle(active); }
  };
  narrow.addEventListener('change', resize);
  window.addEventListener('resize', resize, { passive: true });
  const observer = new ResizeObserver(() => { measure(); scheduleBrowse(); });
  observer.observe(control);
  for (const card of cards) observer.observe(card);
  const targetFromHash = () => {
    const stored = history.state?.memoTimelineReturn;
    const returned = typeof stored?.id === 'string' ? stored.id : undefined;
    if (stored !== undefined) {
      const state = { ...history.state };
      delete state.memoTimelineReturn;
      history.replaceState(stored?.empty === true && Object.keys(state).length === 0 ? null : state, '');
    }
    const id = index.entries.some((entry) => entry.id === returned) ? returned : window.location.hash.slice(1);
    const found = index.entries.findIndex((entry) => entry.id === id);
    if (found >= 0) settle(found, true);
    else scheduleBrowse();
  };
  window.addEventListener('hashchange', targetFromHash);
  window.addEventListener('pageshow', (event) => { if (event.persisted) targetFromHash(); else scheduleBrowse(); });
  root.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLAnchorElement>('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const destination = new URL(link.href);
    if (link.closest('.memo-month-index') && destination.origin === location.origin && destination.pathname === location.pathname) {
      const selected = index.entries.findIndex((entry) => entry.id === destination.hash.slice(1));
      if (selected >= 0) {
        // Native anchor alignment after this seek would look like a later browsing scroll.
        event.preventDefault();
        if (destination.hash !== location.hash) history.pushState(history.state, '', destination.hash);
        settle(selected, true);
      }
      return;
    }
    const card = link.closest<HTMLElement>('[data-memo-entry]');
    if (!card) return;
    if (destination.origin === location.origin && destination.pathname === '/pages/memos/' + card.id + '/' && byId.has(card.id) && (history.state === null || (typeof history.state === 'object' && Object.getPrototypeOf(history.state) === Object.prototype))) {
      history.replaceState({ ...history.state, memoTimelineReturn: { id: card.id, empty: history.state === null } }, '');
    }
  });
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
