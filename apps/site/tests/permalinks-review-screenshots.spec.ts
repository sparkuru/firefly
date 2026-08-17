import { expect, test } from '@playwright/test';

const screenshotRoot = '../../.trellis/tasks/08-17-permalinks-vim-single-page/research/screenshots';

test('capture canonical reader entry and idle states', async ({ page }, testInfo) => {
  const viewport = testInfo.project.name;
  const capture = (name: string) => page.screenshot({
    path: `${screenshotRoot}/${name}-${viewport}.png`,
    animations: 'disabled'
  });

  await page.goto('/posts/hello-static-foundation/#terminal-reader');
  const semanticReader = page.getByRole('region', { name: /Read-only Vim reader for Hello, static foundation/u });
  await expect(semanticReader).toBeFocused();
  await expect(page.locator('[data-terminal-reader-status]')).toBeVisible();
  await capture('semantic-reader-entry');

  await semanticReader.press('/');
  await page.getByRole('searchbox', { name: /Search document forward/u }).fill('reader');
  await capture('semantic-reader-search');

  await page.goto('/posts/characters/nahida/');
  const terminalReader = page.getByRole('region', { name: /Read-only Vim reader for Notes on Nahida/u });
  await expect(page.locator('[data-terminal-reader-status]')).toBeVisible();
  await expect(terminalReader).not.toBeFocused();
  await capture('terminal-reader-idle');

  await page.goto('/posts/characters/nahida/#terminal-reader');
  await expect(terminalReader).toBeFocused();
  await capture('terminal-reader-entry');
});
