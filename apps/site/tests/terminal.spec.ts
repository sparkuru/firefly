import { expect, test, type Page } from '@playwright/test';

const promptName = /Command for guest@f1refly \$/u;

async function expectNoHorizontalOverflow(page: Page) {
  const width = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);
}

async function expectInViewport(
  locator: ReturnType<Page['locator']>,
  minTopRatio = 0,
  maxTopRatio = 1
) {
  await expect.poll(async () => locator.evaluate((element, ratios) => {
    const rect = element.getBoundingClientRect();
    return rect.top >= window.innerHeight * ratios.min &&
      rect.top <= window.innerHeight * ratios.max &&
      rect.bottom <= window.innerHeight;
  }, { min: minTopRatio, max: maxTopRatio })).toBe(true);
}

async function submit(page: Page, command: string) {
  const input = page.getByRole('textbox', { name: promptName });
  await input.fill(command);
  await input.press('Enter');
}

test('successful startup reveals only the shell stream and prompt', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: promptName });

  await expect(input).toBeVisible();
  await expect(input).not.toBeFocused();
  await expect(input).toHaveAttribute('enterkeyhint', 'send');
  await expect(input).toHaveAttribute('aria-controls', 'terminal-transcript');
  await expect(page.locator('[data-terminal-fallback]')).toBeHidden();
  await expect(page.locator('[data-terminal-transcript]')).toBeEmpty();
  await expect(page.locator('.terminal-titlebar')).toHaveCount(0);
  await expect(page.getByRole('button')).toHaveCount(0);
  await expect(page.getByText('Browse public documents')).toBeHidden();
  await expect(page.locator('.terminal-command-row .terminal-prompt')).toHaveText('guest@f1refly $');
  expect(await page.locator('.terminal-command-row').evaluate((row) => row.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await expectNoHorizontalOverflow(page);
});

test('commands render continuous typed results, lab discovery, and latest announcements', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: promptName });
  const transcript = page.locator('[data-terminal-transcript]');
  const announcer = page.locator('[data-terminal-announcer]');

  await submit(page, 'help');
  await expect(page.getByText('ls [posts|pages|lab] — list public documents or experiments')).toBeVisible();
  await expect(transcript.getByText('open lab/<id> — open a listed experiment')).toBeVisible();
  await expect(transcript.getByText('clear — clear the screen')).toBeVisible();
  await expect(input).toBeFocused();

  await submit(page, 'ls posts');
  await expect(transcript.getByRole('link', { name: 'hello-static-foundation.md' })).toHaveAttribute('href', '/posts/hello-static-foundation/');
  await expect(transcript).toContainText('2026-05-28');
  await expect(announcer).toHaveText('2 posts listed.');

  await submit(page, 'ls lab');
  await expect(transcript.getByRole('link', { name: 'nerv/' })).toHaveAttribute('href', '/lab/nerv/');
  await expect(transcript).toContainText('NERV');
  await expect(announcer).toHaveText('1 experiments listed.');
  await submit(page, 'open lab/unlisted');
  await expect(transcript).toContainText('No listed experiment named "lab/unlisted"');
  await expect(page.locator('[data-terminal-failure]')).toBeHidden();
  await expect(input).toBeFocused();
});

test('open navigates only to the validated listed experiment destination', async ({ page }) => {
  await page.goto('/');
  await submit(page, 'open lab/nerv');
  await expect(page).toHaveURL(/\/lab\/nerv\/$/u);
});

test('history preserves a draft and clear returns a fresh prompt with history intact', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: promptName });
  const transcript = page.locator('[data-terminal-transcript]');
  const completion = page.locator('[data-terminal-completion]');

  await submit(page, 'pwd');
  await submit(page, 'whoami');
  await input.fill('unfinished');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('whoami');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('pwd');
  await input.press('ArrowDown');
  await input.press('ArrowDown');
  await expect(input).toHaveValue('unfinished');

  await input.fill('ls p');
  await input.press('Tab');
  await expect(completion).toHaveText('Matches: posts, pages');
  await input.focus();
  await submit(page, 'history');
  await expect(transcript).toContainText('history');
  await submit(page, 'clear');
  await expect(transcript).toBeEmpty();
  await expect(completion).toBeEmpty();
  await expect(input).toHaveValue('');
  await expect(input).toBeFocused();
  await input.press('ArrowUp');
  await expect(input).toHaveValue('clear');
  await expect(page.locator('[data-terminal-fallback]')).toBeHidden();
});

test('completion consumes only unique matches and otherwise preserves Tab traversal', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: promptName });
  await input.focus();
  await input.fill('hel');
  await input.press('Tab');
  await expect(input).toHaveValue('help ');
  await expect(input).toBeFocused();

  await input.fill('ls p');
  await input.press('Tab');
  await expect(input).toHaveValue('ls p');
  await expect(page.locator('[data-terminal-completion]')).toHaveText('Matches: posts, pages');
  await expect(input).not.toBeFocused();

  await input.focus();
  await input.fill('cat llm-w');
  await input.press('Tab');
  await expect(input).toHaveValue('cat llm-workflow-with-trellis.md');

  await input.fill('cat ./llm-w');
  await input.press('Tab');
  await expect(input).toHaveValue('cat ./llm-workflow-with-trellis.md');
  await expect(input).toBeFocused();

  for (const unsafe of ['cat ../llm-w', 'cat ./nested/llm-w', 'cat /llm-w', 'cat https://example.com/llm-w']) {
    await input.fill(unsafe);
    await input.press('Tab');
    await expect(input).toHaveValue(unsafe);
    await expect(input).not.toBeFocused();
    await input.focus();
  }

  await input.fill('open lab/n');
  await input.press('Tab');
  await expect(input).toHaveValue('open lab/nerv');
});

test('IME composition leaves Enter, Arrow history, and Tab key events unintercepted', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: promptName });
  await submit(page, 'pwd');
  await input.fill('about');

  const dispatchResults = await input.evaluate((element) => {
    element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    const results = ['Enter', 'ArrowUp', 'ArrowDown', 'Tab'].map((key) =>
      element.dispatchEvent(new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        isComposing: true,
        key
      }))
    );
    return results;
  });
  expect(dispatchResults).toEqual([true, true, true, true]);
  await expect(input).toHaveValue('about');
  await expect(page.locator('[data-terminal-transcript] .terminal-record')).toHaveCount(1);

  await input.dispatchEvent('compositionend');
  await input.press('Enter');
  await expect(page.locator('[data-terminal-transcript]')).toContainText('A static garden');
});

test('native Enter submission works at desktop and mobile viewport contracts', async ({ page }) => {
  await page.goto('/');
  await submit(page, 'about');
  await expect(page.locator('[data-terminal-transcript]')).toContainText('A static garden');
  await expect(page.getByRole('textbox', { name: promptName })).toBeFocused();
});

test('short output settles the active prompt and document output settles its reading start', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: promptName });
  for (let index = 0; index < 12; index += 1) {
    await submit(page, 'help');
  }
  await expect(input).toBeFocused();
  await expectInViewport(input, 0.25, 0.8);

  await submit(page, 'cat ./llm-workflow-with-trellis.md');
  const title = page
    .locator('[data-terminal-stream-document]')
    .last()
    .getByRole('heading', { level: 2, name: 'llm workflow with trellis' });
  await expect(title).toBeFocused();
  await expectInViewport(title, 0, 0.35);
});

test('eligible printable typing returns to the prompt while protected interactions stay native', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: promptName });
  await submit(page, 'cat llm-workflow-with-trellis.md');
  const streamedDocument = page.locator('[data-terminal-stream-document]').last();
  const title = streamedDocument.getByRole('heading', { level: 2, name: 'llm workflow with trellis' });
  await expect(title).toBeFocused();

  await page.keyboard.press('x');
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('x');

  for (const key of ['Space', 'Tab', 'Enter', 'Escape', 'ArrowDown', 'Control+k', 'Meta+k', 'Shift+x']) {
    await input.fill('safe');
    await title.focus();
    await page.keyboard.press(key);
    await expect(input).toHaveValue('safe');
  }

  const link = streamedDocument.getByRole('link', { name: 'permalink' });
  await input.fill('link-safe');
  await link.focus();
  await page.keyboard.press('q');
  await expect(link).toBeFocused();
  await expect(input).toHaveValue('link-safe');

  const wide = streamedDocument.getByRole('region', { name: /^Code content:/u }).first();
  await wide.focus();
  await page.keyboard.press('z');
  await expect(wide).toBeFocused();
  await expect(input).toHaveValue('link-safe');

  await streamedDocument.evaluate((document) => {
    const control = document.ownerDocument.createElement('div');
    control.dataset.testAriaControl = '';
    control.setAttribute('role', 'checkbox');
    control.setAttribute('aria-label', 'Test ARIA control');
    control.setAttribute('aria-checked', 'false');
    control.tabIndex = 0;
    document.append(control);
  });
  const ariaControl = streamedDocument.getByRole('checkbox', { name: 'Test ARIA control' });
  await ariaControl.focus();
  await page.keyboard.press('c');
  await expect(ariaControl).toBeFocused();
  await expect(input).toHaveValue('link-safe');

  await title.focus();
  await page.evaluate(() => {
    const paragraph = document.querySelector<HTMLElement>('.terminal-stream-prose p');
    const selection = window.getSelection();
    if (paragraph === null || selection === null || paragraph.firstChild === null) {
      throw new Error('Missing selection fixture.');
    }
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.keyboard.press('r');
  await expect(input).toHaveValue('link-safe');
  await page.evaluate(() => window.getSelection()?.removeAllRanges());

  const compositionDispatch = await title.evaluate((element) => {
    element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    const result = element.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      isComposing: true,
      key: '文'
    }));
    element.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    return result;
  });
  expect(compositionDispatch).toBe(true);
  await expect(input).toHaveValue('link-safe');
});

test('phosphor theme and official JetBrains Mono assets stay same-origin', async ({ page }) => {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== 'http://127.0.0.1:4321') {
      externalRequests.push(request.url());
    }
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-terminal-theme', 'phosphor');
  const styles = await page.locator('.terminal-root').evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      canvas: computed.getPropertyValue('--terminal-color-canvas').trim(),
      command: computed.getPropertyValue('--terminal-color-command').trim(),
      family: computed.fontFamily
    };
  });
  expect(styles.canvas).not.toBe('');
  expect(styles.command).not.toBe('');
  expect(styles.family).toContain('JetBrains Mono');
  const loadedFaces = await page.evaluate(async () => {
    const regular = await document.fonts.load('400 16px "JetBrains Mono"');
    const medium = await document.fonts.load('500 16px "JetBrains Mono"');
    return { regular: regular.length, medium: medium.length };
  });
  expect(loadedFaces.regular).toBeGreaterThan(0);
  expect(loadedFaces.medium).toBeGreaterThan(0);
  expect(externalRequests).toEqual([]);
  expect((await page.request.get('/fonts/JetBrainsMono-Regular-v2.304.woff2')).status()).toBe(200);
  expect((await page.request.get('/fonts/JetBrainsMono-Medium-v2.304.woff2')).status()).toBe(200);
  expect((await page.request.get('/licenses/JetBrainsMono-OFL-1.1.txt')).status()).toBe(200);
  expect((await page.request.get('/licenses/JetBrainsMono-PROVENANCE.txt')).status()).toBe(200);
});

test('cat appends trusted inline documents without navigation and scopes repeated IDs', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const template = [...document.querySelectorAll<HTMLTemplateElement>('[data-terminal-template]')]
      .find((candidate) => candidate.dataset.terminalTemplateFilename === 'llm-workflow-with-trellis.md');
    const article = template?.content.querySelector<HTMLElement>('[data-terminal-stream-document]');
    const firstHeading = article?.querySelector<HTMLElement>('[id="install"]');
    const firstHeader = article?.querySelector<HTMLElement>('th');
    const firstCell = article?.querySelector<HTMLElement>('td');
    if (
      article === undefined ||
      article === null ||
      firstHeading === undefined ||
      firstHeading === null ||
      firstHeader === undefined ||
      firstHeader === null ||
      firstCell === undefined ||
      firstCell === null
    ) {
      throw new Error('Missing scoping fixture targets.');
    }
    const localLink = document.createElement('a');
    localLink.dataset.scopedLink = '';
    localLink.href = '#install';
    localLink.textContent = 'local install section';
    const label = document.createElement('label');
    label.dataset.scopedLabel = '';
    label.htmlFor = 'scoped-field';
    label.textContent = 'Scoped field';
    const field = document.createElement('input');
    field.id = 'scoped-field';
    field.dataset.scopedField = '';
    const labelled = document.createElement('div');
    labelled.dataset.scopedLabelled = '';
    labelled.setAttribute('aria-labelledby', 'install scoped-field external-label');
    const externalFragment = document.createElement('a');
    externalFragment.dataset.externalFragment = '';
    externalFragment.href = '/posts/llm-workflow-with-trellis/#install';
    externalFragment.textContent = 'external install fragment';
    firstHeader.id = 'scoped-column';
    firstCell.dataset.scopedCell = '';
    firstCell.setAttribute('headers', 'scoped-column');
    article.append(localLink, label, field, labelled, externalFragment);
  });
  await submit(page, 'cat llm-workflow-with-trellis.md');

  await expect(page).toHaveURL(/\/$/u);
  const documents = page.locator('[data-terminal-stream-document]');
  await expect(documents).toHaveCount(1);
  const first = documents.first();
  const title = first.getByRole('heading', { level: 2, name: 'llm workflow with trellis' });
  await expect(title).toBeVisible();
  await expect(title).toBeFocused();
  await expect(first.getByRole('link', { name: 'permalink' })).toHaveAttribute('href', '/posts/llm-workflow-with-trellis/');
  await expect(first.getByRole('link', { name: 'Return to prompt' })).toHaveAttribute('href', '#terminal-command');
  await expect(first.locator('[data-scoped-link]')).toHaveAttribute('href', '#terminal-output-1-install');
  await expect(first.locator('[data-scoped-label]')).toHaveAttribute('for', 'terminal-output-1-scoped-field');
  await expect(first.locator('[data-scoped-field]')).toHaveAttribute('id', 'terminal-output-1-scoped-field');
  await expect(first.locator('[data-scoped-cell]')).toHaveAttribute('headers', 'terminal-output-1-scoped-column');
  await expect(first.locator('[data-scoped-labelled]')).toHaveAttribute(
    'aria-labelledby',
    'terminal-output-1-install terminal-output-1-scoped-field external-label'
  );
  await expect(first.locator('[data-external-fragment]')).toHaveAttribute(
    'href',
    '/posts/llm-workflow-with-trellis/#install'
  );
  await expect(first.getByRole('region', { name: /^Code content:/u }).first()).toHaveAttribute('tabindex', '0');
  await expect(first.getByRole('region', { name: /^Table content:/u }).first()).toHaveAttribute('tabindex', '0');
  await expect(page.locator('[data-terminal-announcer]')).toHaveText('Rendered llm workflow with trellis.');
  const longDocumentGeometry = await page.evaluate(() => {
    window.scrollTo(0, 0);
    const record = document.querySelector<HTMLElement>('[data-terminal-transcript] .terminal-record');
    const article = document.querySelector<HTMLElement>('[data-terminal-stream-document]');
    return {
      articleRight: article?.getBoundingClientRect().right ?? Number.POSITIVE_INFINITY,
      recordTop: record?.getBoundingClientRect().top ?? -1,
      scrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth
    };
  });
  expect(longDocumentGeometry.recordTop).toBeGreaterThanOrEqual(0);
  expect(longDocumentGeometry.articleRight).toBeLessThanOrEqual(longDocumentGeometry.viewportWidth);
  expect(longDocumentGeometry.scrollHeight).toBeGreaterThan(longDocumentGeometry.viewportHeight);

  await submit(page, 'cat llm-workflow-with-trellis.md');
  await expect(documents).toHaveCount(2);
  const identityEvidence = await page.evaluate(() => {
    const ids = [...document.querySelectorAll<HTMLElement>('[id]')].map((element) => element.id);
    const articles = [...document.querySelectorAll<HTMLElement>('[data-terminal-stream-document]')];
    return {
      ids,
      labelledBy: articles.map((article) => article.getAttribute('aria-labelledby')),
      returnHrefs: articles.map((article) => article.querySelector('[data-terminal-return]')?.getAttribute('href')),
      permalinks: articles.map((article) => article.querySelector('.terminal-stream-permalink')?.getAttribute('href'))
    };
  });
  expect(new Set(identityEvidence.ids).size).toBe(identityEvidence.ids.length);
  expect(identityEvidence.labelledBy).toHaveLength(2);
  expect(new Set(identityEvidence.labelledBy).size).toBe(2);
  for (const id of identityEvidence.labelledBy) {
    expect(id).not.toBeNull();
    expect(identityEvidence.ids).toContain(id ?? '');
  }
  expect(identityEvidence.returnHrefs).toEqual(['#terminal-command', '#terminal-command']);
  expect(identityEvidence.permalinks).toEqual([
    '/posts/llm-workflow-with-trellis/',
    '/posts/llm-workflow-with-trellis/'
  ]);
  await expectNoHorizontalOverflow(page);
});

test('cat respects semantic and page adapter output in the home stream', async ({ page }) => {
  await page.goto('/');
  await submit(page, 'cat hello-static-foundation.md');
  const semanticDocument = page.locator('[data-terminal-stream-document]').first();
  await expect(semanticDocument.getByRole('heading', { level: 2, name: 'Hello, static foundation' })).toBeFocused();
  await expect(semanticDocument.getByRole('heading', { level: 2, name: 'Markdown to durable HTML' })).toBeVisible();
  await expect(semanticDocument.getByRole('region', { name: /^Code content:/u })).toBeVisible();
  await submit(page, 'cat about.md');
  await expect(page.getByRole('heading', { level: 2, name: 'About this foundation' })).toBeFocused();
  await expect(page.getByText('Future presentations can change how the site looks')).toBeVisible();
  const ids = await page.locator('[id]').evaluateAll((elements) =>
    elements.map((element) => element.id)
  );
  expect(new Set(ids).size).toBe(ids.length);
  await expect(page).toHaveURL(/\/$/u);
});

test('malformed startup preserves the untouched native recovery product', async ({ page }) => {
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const template = document.querySelector<HTMLTemplateElement>('[data-terminal-template]');
      if (template !== null) {
        template.dataset.terminalTemplateFilename = 'unknown.md';
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: promptName })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 2, name: 'Browse public documents' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'hello-static-foundation.md' })).toBeVisible();
  await expect(page.locator('[data-terminal-failure]')).toBeHidden();
});

test('an executable document template prevents startup without disturbing recovery', async ({ page }) => {
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const template = document.querySelector<HTMLTemplateElement>('[data-terminal-template]');
      if (template !== null) {
        template.content.append(document.createElement('script'));
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: promptName })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 2, name: 'Browse public documents' })).toBeVisible();
  await expect(page.locator('[data-terminal-failure]')).toBeHidden();
});

test('an extra template element prevents startup without disturbing recovery', async ({ page }) => {
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const template = document.querySelector<HTMLTemplateElement>('[data-terminal-template]');
      if (template !== null) {
        template.content.append(document.createElement('aside'));
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: promptName })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 2, name: 'Browse public documents' })).toBeVisible();
  await expect(page.locator('[data-terminal-failure]')).toBeHidden();
});

test('a template title not owned by its article prevents startup', async ({ page }) => {
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const template = document.querySelector<HTMLTemplateElement>(
        'template[data-terminal-template]'
      );
      const article = template?.content.querySelector<HTMLElement>(
        '[data-terminal-stream-document]'
      );
      if (article !== null && article !== undefined) {
        article.setAttribute('aria-labelledby', 'external-title');
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: promptName })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 2, name: 'Browse public documents' })).toBeVisible();
  await expect(page.locator('[data-terminal-failure]')).toBeHidden();
});

test('post-start clone-scoping failure restores one focused recovery target', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const template = [...document.querySelectorAll<HTMLTemplateElement>('[data-terminal-template]')]
      .find((candidate) => candidate.dataset.terminalTemplateFilename === 'about.md');
    const article = template?.content.querySelector<HTMLElement>('[data-terminal-stream-document]');
    if (article === undefined || article === null) {
      throw new Error('Missing clone-scoping failure fixture.');
    }
    const first = document.createElement('span');
    const second = document.createElement('span');
    first.id = 'duplicate-clone-id';
    second.id = 'duplicate-clone-id';
    article.append(first, second);
  });
  await submit(page, 'cat about.md');
  await expect(page.locator('[data-terminal-session]')).toBeHidden();
  await expect(page.locator('[data-terminal-failure]')).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Browse public documents' })).toBeFocused();
  await expect(page.locator('[data-terminal-stream-document]')).toHaveCount(0);
});

test('post-start renderer failure restores one focused recovery target', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const original = document.createElement.bind(document);
    document.createElement = ((name: string, options?: ElementCreationOptions) => {
      if (name === 'section') {
        throw new Error('Injected renderer failure');
      }
      return original(name, options);
    }) as typeof document.createElement;
  });
  await submit(page, 'help');
  await expect(page.locator('[data-terminal-session]')).toBeHidden();
  await expect(page.locator('[data-terminal-failure]')).toBeVisible();
  await expect(page.locator('[data-terminal-failure] .terminal-status-label')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'hello-static-foundation.md' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: promptName })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 2, name: 'Browse public documents' })).toBeFocused();
});

test('post-start executor failure restores the same native recovery product', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    Date.prototype.toISOString = () => {
      throw new Error('Injected executor failure');
    };
  });
  await submit(page, 'date');
  await expect(page.locator('[data-terminal-session]')).toBeHidden();
  await expect(page.locator('[data-terminal-failure]')).toBeVisible();
  await expect(page.getByRole('link', { name: 'hello-static-foundation.md' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Browse public documents' })).toBeFocused();
});

test('reduced motion and responsive checkpoints preserve full-page containment', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const input = page.getByRole('textbox', { name: promptName });
  expect(await input.evaluate((element) => getComputedStyle(element).animationDuration)).toBe('1e-06s');
  await submit(page, 'help');
  await expect(input).toBeFocused();
  const reducedPromptGeometry = await input.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, height: window.innerHeight };
  });
  expect(reducedPromptGeometry.top).toBeGreaterThanOrEqual(reducedPromptGeometry.height * 0.25);
  expect(reducedPromptGeometry.top).toBeLessThanOrEqual(reducedPromptGeometry.height * 0.8);
  expect(reducedPromptGeometry.bottom).toBeLessThanOrEqual(reducedPromptGeometry.height);
  for (const width of [768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await expectNoHorizontalOverflow(page);
    expect(await page.locator('.terminal-command-row').evaluate((row) => row.getBoundingClientRect().width)).toBeLessThanOrEqual(width);
  }
});
