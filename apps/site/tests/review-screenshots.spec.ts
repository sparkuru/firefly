import { expect, test } from '@playwright/test';

const screenshotRoot = '../../.trellis/tasks/08-13-m5-content-filesystem-vim-reader/research/screenshots';

test('capture the approved M5 Terminal review states', async ({ page }, testInfo) => {
  const viewport = testInfo.project.name;
  const capture = (name: string) => page.screenshot({
    path: `${screenshotRoot}/${name}-${viewport}.png`,
    animations: 'disabled'
  });

  await page.goto('/');
  const prompt = page.getByRole('textbox', { name: /Command for guest@f1refly:~\/blog\/posts \$/u });
  await prompt.fill('tree /');
  await prompt.press('Enter');
  await expect(page.locator('.terminal-tree')).toBeVisible();
  await capture('tree');

  await page.goto('/');
  await prompt.fill('help');
  await prompt.press('Enter');
  await expect(page.getByRole('heading', { level: 2, name: 'Explore' })).toBeVisible();
  await expect(page.getByText('show this command list')).toBeVisible();
  await expect(prompt).toBeFocused();
  await capture('help-settlement');

  await page.goto('/');
  await prompt.fill('cat 1');
  await prompt.press('Tab');
  await expect(prompt).toBeFocused();
  await expect(page.locator('[data-terminal-completion]')).toHaveText('No matches.');
  await capture('path-completion');

  await page.goto('/posts/characters/');
  await expect(page.getByRole('heading', { name: 'posts/characters/' })).toBeVisible();
  await capture('nested-directory');

  await page.goto('/posts/characters/nahida/');
  const reader = page.getByRole('region', { name: /Read-only Vim reader/u });
  await expect(page.getByRole('navigation', { name: 'Document path' })).toContainText('nahida.md');
  await capture('breadcrumb');

  await reader.focus();
  await reader.press('j');
  await expect(page.locator('[data-reader-position]')).toHaveText(/^2\//u);
  await capture('reader-normal');

  await reader.press('/');
  const search = page.getByRole('searchbox', { name: /Search document forward/u });
  await search.fill('reader');
  await capture('reader-search');
  await search.press('Escape');

  await reader.press('v');
  await reader.press('j');
  await expect(page.locator('[data-reader-mode]')).toHaveText('-- VISUAL --');
  await capture('reader-visual');
});
