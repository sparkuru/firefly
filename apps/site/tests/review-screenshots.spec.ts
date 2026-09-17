import { expect, test } from '@playwright/test';
import { terminalPromptName } from './terminal-prompt';

const screenshotRoot = 'test-results/review-screenshots/m5';

test('capture the approved M5 Terminal review states', async ({ page }, testInfo) => {
  const viewport = testInfo.project.name;
  const capture = (name: string) => page.screenshot({
    path: `${screenshotRoot}/${name}-${viewport}.png`,
    animations: 'disabled'
  });

  await page.goto('/');
  const prompt = page.getByRole('textbox', { name: terminalPromptName() });
  await prompt.fill('tree ~/blog');
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

  await page.goto('/posts/ai/');
  await expect(page.getByRole('heading', { name: 'posts/ai/' })).toBeVisible();
  await capture('nested-directory');

  await page.goto('/pages/about/');
  const navigator = page.getByRole('region', { name: /Document navigator/u });
  await expect(page.locator('.terminal-titlebar span').nth(1)).toHaveText('~/blog/pages/about.md');
  await expect(page.locator('.terminal-path')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Document path' })).toHaveCount(0);
  await capture('header-path');

  await navigator.focus();
  await navigator.press('j');
  await expect(page.locator('[data-navigation-position]')).toHaveText(/^2\//u);
  await capture('document-navigator-normal');

  await navigator.press('/');
  const search = page.getByRole('searchbox', { name: /Search document forward/u });
  await search.fill('reader');
  await capture('document-navigator-search');
  await search.press('Escape');

  await navigator.press('v');
  await navigator.press('j');
  await expect(page.locator('[data-navigation-mode]')).toHaveText('-- VISUAL --');
  await capture('document-navigator-visual');
});
