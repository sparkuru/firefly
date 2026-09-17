import { expect, test } from '@playwright/test';

const screenshotRoot = 'test-results/review-screenshots/permalinks';

test('capture canonical document navigator entry and idle states', async ({ page }, testInfo) => {
  const viewport = testInfo.project.name;
  const capture = (name: string) => page.screenshot({
    path: `${screenshotRoot}/${name}-${viewport}.png`,
    animations: 'disabled'
  });

  await page.goto('/posts/ai/llm-workflow-with-trellis/#document-navigator');
  const semanticNavigator = page.getByRole('region', { name: /Document navigator for llm-workflow-with-trellis/u });
  await expect(semanticNavigator).toBeFocused();
  await expect(page.locator('[data-document-navigator-status]')).toBeVisible();
  await capture('semantic-document-navigator-entry');

  await semanticNavigator.press('/');
  await page.getByRole('searchbox', { name: /Search document forward/u }).fill('reader');
  await capture('semantic-document-navigator-search');

  await page.goto('/pages/about/');
  const terminalNavigator = page.getByRole('region', { name: /Document navigator for About this foundation/u });
  await expect(page.locator('[data-document-navigator-status]')).toBeVisible();
  await expect(terminalNavigator).not.toBeFocused();
  await capture('terminal-document-navigator-idle');

  await page.goto('/pages/about/#document-navigator');
  await expect(terminalNavigator).toBeFocused();
  await capture('terminal-document-navigator-entry');
});
