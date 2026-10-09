import { copyClipboardText } from './clipboard-text';

const startedDocuments = new WeakSet<HTMLElement>();

export function startDocumentShare(root: HTMLElement): void {
  if (startedDocuments.has(root)) return;
  const button = root.querySelector<HTMLButtonElement>('[data-document-share]');
  const announcer = root.querySelector<HTMLElement>('[data-document-share-announcer]');
  const reference = button?.dataset.documentShareUrl;
  if (button === null || announcer === null || reference === undefined) return;
  let url: URL;
  try { url = new URL(reference, window.location.origin); } catch { return; }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return;
  url.hash = '';
  startedDocuments.add(root);
  let pending: object | null = null;
  let active = true;
  let timer: number | undefined;
  const reset = (): void => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
    button.textContent = 'Share';
    announcer.textContent = '';
  };
  button.hidden = false;
  const group = root.querySelector<HTMLElement>('[data-document-share-group]');
  if (group !== null) group.hidden = false;
  button.addEventListener('click', async () => {
    if (pending !== null || !active) return;
    const request = {};
    pending = request;
    reset();
    const copied = await copyClipboardText(url.href, () => pending === request && active && button.isConnected);
    if (pending !== request) return;
    pending = null;
    if (!active || !button.isConnected) return;
    button.textContent = copied ? 'Copied' : 'Failed';
    announcer.textContent = copied ? 'Document link copied.' : 'Could not copy document link.';
    timer = window.setTimeout(reset, 2000);
  });
  window.addEventListener('pagehide', () => { active = false; pending = null; reset(); });
  window.addEventListener('pageshow', () => { active = true; reset(); });
}
