import { copyClipboardText } from './clipboard-text';
import { startDocumentShare } from './document-share';

const startedCopies = new WeakSet<HTMLElement>();

export function startMemoCopy(root: HTMLElement): void {
  if (startedCopies.has(root)) return;
  const button = root.querySelector<HTMLButtonElement>('[data-memo-copy]');
  const body = root.querySelector<HTMLElement>('.memo-body');
  const announcer = root.querySelector<HTMLElement>('[data-memo-copy-announcer]');
  if (!button || !body || !announcer) return;
  startedCopies.add(root);
  let pending: object | null = null;
  let active = true;
  let timer: number | undefined;
  const reset = (): void => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
    button.textContent = 'COPY';
    announcer.textContent = '';
  };
  button.hidden = false;
  const group = root.querySelector<HTMLElement>('[data-memo-copy-group]');
  if (group) group.hidden = false;
  button.addEventListener('click', async () => {
    if (pending !== null || !active) return;
    const request = {};
    pending = request;
    reset();
    // Native rendered text retains prose/verse and code line boundaries without page chrome.
    const text = body.innerText.replace(/\r\n?/gu, '\n').replace(/^\n+|\n+$/gu, '');
    const copied = await copyClipboardText(text, () => pending === request && active && button.isConnected);
    if (pending !== request) return;
    pending = null;
    if (!active || !button.isConnected) return;
    button.textContent = copied ? 'Copied' : 'Failed';
    announcer.textContent = copied ? 'Memo text copied.' : 'Could not copy Memo text.';
    timer = window.setTimeout(reset, 2000);
  });
  window.addEventListener('pagehide', () => { active = false; pending = null; reset(); });
  window.addEventListener('pageshow', () => { active = true; reset(); });
}

for (const root of document.querySelectorAll<HTMLElement>('[data-memo-actions]')) {
  try { startDocumentShare(root); } catch { /* Native reading remains available. */ }
  try { startMemoCopy(root); } catch { /* Native reading remains available. */ }
}
