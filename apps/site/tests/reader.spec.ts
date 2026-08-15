import { expect, test, type Page } from '@playwright/test';

async function openReader(page: Page) {
  await page.goto('/posts/characters/nahida/');
  const region = page.getByRole('region', { name: /Read-only Vim reader for Notes on Nahida/u });
  await region.focus();
  await expect(region).toBeFocused();
  return region;
}

test('reader moves by semantic units and honors reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const region = await openReader(page);
  const position = page.locator('[data-reader-position]');
  await expect(position).toHaveText(/^1\//u);
  await region.press('j');
  await expect(position).toHaveText(/^2\//u);
  await region.press('G');
  await expect(position).not.toHaveText(/^1\//u);
  await region.press('g');
  await expect(position).toHaveText(/^1\//u);
  await region.press('k');
  await expect(position).toHaveText(/^1\//u);
});

test('reader search, repeat, visual Range, Escape, and unsupported commands are bounded', async ({ page }) => {
  const region = await openReader(page);
  await region.press('/');
  const search = page.getByRole('searchbox', { name: 'Search document' });
  await expect(search).toBeFocused();
  await search.fill('reader');
  await search.press('Enter');
  await expect(page.locator('[data-reader-message]')).toContainText('matches for “reader”');
  expect(await page.evaluate(() => !('highlights' in CSS) || CSS.highlights.has('terminal-reader-search'))).toBe(true);
  await region.press('n');
  await region.press('N');
  await region.press('?');
  await search.fill('missing literal query');
  await search.press('Enter');
  await expect(page.locator('[data-reader-message]')).toHaveText('No results for “missing literal query”.');

  await region.press('v');
  await expect(page.locator('[data-reader-mode]')).toHaveText('-- VISUAL --');
  await region.press('j');
  expect(await page.evaluate(() => window.getSelection()?.isCollapsed)).toBe(false);
  await region.press('Escape');
  await expect(page.locator('[data-reader-mode]')).toHaveText('-- NORMAL --');
  expect(await page.evaluate(() => window.getSelection()?.isCollapsed)).toBe(true);

  await region.press(':');
  const command = page.getByRole('textbox', { name: 'Reader command' });
  await command.fill('write');
  await command.press('Enter');
  await expect(page.locator('[data-reader-message]')).toContainText('Only :q is available');
  await command.press('Escape');
  await expect(region).toBeFocused();
});

test('reader preserves links, local-scroll regions, modifier keys, IME, and manual selection', async ({ page }) => {
  const region = await openReader(page);
  const initialPosition = await page.locator('[data-reader-position]').textContent();
  const link = page.getByRole('link', { name: 'posts' });
  await link.focus();
  await page.keyboard.press('j');
  await expect(link).toBeFocused();
  const code = page.getByRole('region', { name: /^Code content:/u });
  await code.focus();
  await page.keyboard.press('j');
  await expect(code).toBeFocused();
  await region.focus();
  await region.press('Control+j');
  await expect(page.locator('[data-reader-position]')).toHaveText(initialPosition ?? '');

  const ariaControl = page.locator('[data-reader-aria-control]');
  await region.evaluate((element) => {
    const control = document.createElement('div');
    control.dataset.readerAriaControl = '';
    control.setAttribute('role', 'checkbox');
    control.setAttribute('aria-checked', 'false');
    control.tabIndex = 0;
    element.append(control);
  });
  await ariaControl.focus();
  await page.keyboard.press('j');
  await expect(ariaControl).toBeFocused();
  await expect(page.locator('[data-reader-position]')).toHaveText(initialPosition ?? '');

  const imeResult = await region.evaluate((element) => element.dispatchEvent(new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    isComposing: true,
    key: 'j'
  })));
  expect(imeResult).toBe(true);

  await page.evaluate(() => {
    const paragraph = document.querySelector<HTMLElement>('[data-terminal-reader-region] p');
    const selection = window.getSelection();
    if (paragraph === null || selection === null) throw new Error('Missing manual selection fixture.');
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await region.press('j');
  await expect(page.locator('[data-reader-position]')).toHaveText(initialPosition ?? '');
});

test('reader never treats a user-replaced visual Range as its owned selection', async ({ page }) => {
  const region = await openReader(page);
  const position = page.locator('[data-reader-position]');
  await region.press('v');
  await region.press('j');
  const visualPosition = await position.textContent();

  await page.evaluate(() => {
    const paragraph = document.querySelector<HTMLElement>('[data-terminal-reader-region] p');
    const selection = window.getSelection();
    if (paragraph === null || selection === null) throw new Error('Missing replacement selection fixture.');
    const replacement = document.createRange();
    replacement.selectNodeContents(paragraph);
    selection.removeAllRanges();
    selection.addRange(replacement);
  });
  const allowed = await region.evaluate((element) => element.dispatchEvent(new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key: 'j'
  })));
  expect(allowed).toBe(true);
  await expect(position).toHaveText(visualPosition ?? '');
  expect(await page.evaluate(() => window.getSelection()?.isCollapsed)).toBe(false);
});

test('vim resolves a closed canonical destination and :q exits directly to home', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: /Command for guest@f1refly:~\/blog\/posts \$/u });
  await input.fill('vim ./characters/nahida.md');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/posts\/characters\/nahida\/$/u);
  const region = page.getByRole('region', { name: /Read-only Vim reader/u });
  await region.focus();
  await region.press(':');
  const command = page.getByRole('textbox', { name: 'Reader command' });
  await command.fill('q');
  await command.press('Enter');
  await expect(page).toHaveURL(/\/$/u);
});
