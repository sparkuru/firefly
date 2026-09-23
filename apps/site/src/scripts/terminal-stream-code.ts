/** Add controls to a cloned, trusted article without changing the code text. */
export function decorateStreamCodeBlocks(root: HTMLElement): void {
  for (const code of root.querySelectorAll<HTMLElement>('.terminal-stream-prose pre > code')) {
    const pre = code.parentElement;
    if (!(pre instanceof HTMLPreElement)) continue;

    const parent = pre.parentElement;
    const standalone = parent instanceof HTMLElement &&
      parent.matches('.terminal-wide, .wide-content') && parent.children.length === 1;
    const block = document.createElement('div');
    block.className = standalone ? 'terminal-code-block' : 'terminal-code-block terminal-code-block--nested';
    const toolbar = document.createElement('div');
    toolbar.className = 'terminal-code-toolbar';
    const label = document.createElement('span');
    label.className = 'terminal-code-language';
    const language = pre.dataset.language ?? code.className.match(/(?:^|\s)language-([a-z0-9+._-]+)/iu)?.[1];
    label.textContent = language && language !== 'plaintext' ? language : 'code';
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.terminalCopyCode = '';
    button.textContent = 'Copy code';
    toolbar.append(label, button);

    const body = document.createElement('div');
    body.className = 'terminal-code-body';
    const gutter = document.createElement('span');
    gutter.className = 'terminal-code-gutter';
    gutter.setAttribute('aria-hidden', 'true');
    const text = code.textContent ?? '';
    const lines = text.split('\n').length;
    for (let index = 0; index < lines; index += 1) {
      const number = document.createElement('span');
      number.textContent = String(index + 1);
      gutter.append(number);
    }

    if (standalone && parent) {
      parent.before(block);
      block.append(toolbar, parent);
      parent.append(body);
    } else {
      pre.before(block);
      block.append(toolbar, body);
    }
    body.append(gutter, pre);
  }
}
