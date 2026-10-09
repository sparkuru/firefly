function copyTextNatively(text: string): boolean {
  const focused = document.activeElement;
  const input = focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement ? focused : null;
  const caret = input && input.selectionStart !== null
    ? { start: input.selectionStart, end: input.selectionEnd!, direction: input.selectionDirection }
    : null;
  const selection = window.getSelection();
  const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange()) : [];
  const endpoints = selection && selection.anchorNode && selection.focusNode
    ? { anchor: selection.anchorNode, anchorOffset: selection.anchorOffset, focus: selection.focusNode, focusOffset: selection.focusOffset }
    : null;
  const scroll = new Map<Element, { left: number; top: number }>();
  for (const node of [focused, endpoints?.anchor, endpoints?.focus]) {
    let element = node instanceof Element ? node : node?.parentElement;
    while (element) {
      scroll.set(element, { left: element.scrollLeft, top: element.scrollTop });
      element = element.parentElement;
    }
  }
  const pageScroll = { left: window.scrollX, top: window.scrollY };
  const field = document.createElement('textarea');
  field.value = text;
  field.readOnly = true;
  field.tabIndex = -1;
  field.setAttribute('aria-hidden', 'true');
  field.setAttribute('data-clipboard-copy-buffer', '');
  field.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;';
  try {
    document.body.append(field);
    field.focus({ preventScroll: true });
    field.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
    if (focused instanceof HTMLElement && focused.isConnected) focused.focus({ preventScroll: true });
    if (input && caret) input.setSelectionRange(caret.start, caret.end, caret.direction ?? undefined);
    if (selection) {
      selection.removeAllRanges();
      if (ranges.length === 1 && endpoints) {
        selection.setBaseAndExtent(endpoints.anchor, endpoints.anchorOffset, endpoints.focus, endpoints.focusOffset);
      } else {
        for (const range of ranges) selection.addRange(range);
      }
    }
    for (const [element, position] of scroll) {
      element.scrollLeft = position.left;
      element.scrollTop = position.top;
    }
    window.scrollTo({ left: pageScroll.left, top: pageScroll.top, behavior: 'instant' });
  }
}

export async function copyClipboardText(text: string, eligible: () => boolean): Promise<boolean> {
  if (!eligible()) return false;
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // A retired request must not write through the compatibility path later.
      if (!eligible()) return false;
    }
  }
  return copyTextNatively(text);
}
