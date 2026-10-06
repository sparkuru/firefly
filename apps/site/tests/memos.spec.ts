import { expect, test } from '@playwright/test';

test('native discovery opens an independent static Markdown stream without a write surface', async ({ page }, testInfo) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/');
  const link = page.locator('[data-terminal-fallback] a[href="/memos/"]:visible').first();
  await expect(link).toBeVisible();
  await expect(link).not.toHaveAttribute('data-home-browse-directory');
  await link.click();
  await expect(page).toHaveURL(/\/memos\/$/u);
  await expect(page.getByRole('heading', { name: 'Memo', exact: true })).toBeVisible();
  await expect(page.locator('article header strong')).toHaveText('Fixture Owner');
  await expect(page.locator('.memo-body strong')).toHaveText('Markdown');
  await expect(page.locator('.memo-body ul li')).toHaveCount(2);
  await expect(page.locator('pre code')).toBeVisible();
  await expect(page.locator('table')).toBeVisible();
  await expect(page.getByAltText('Synthetic pixel')).toBeVisible();
  await expect(page.locator('form,input,textarea,script')).toHaveCount(0);
  await expect(page.locator('[data-memo-id="m_fixture_draft"]')).toHaveCount(0);
  expect(requests.some((url) => /\/v1\/memos\//u.test(url))).toBe(false);
  const asset = await page.request.get('/memos/assets/media/%E5%9B%BE%E5%83%8F.png');
  expect(asset.status()).toBe(200);
  expect((await page.request.get('/memos/receipt.json')).status()).toBe(404);
  await page.getByRole('link', { name: /Permanent link to Memo/u }).click();
  await expect(page).toHaveURL(/#m_fixture_owner$/u);
  await page.screenshot({ path: testInfo.outputPath('memos-reading.png'), fullPage: true });
});

test('static reading supports keyboard, enlarged text, reduced motion and bounded overflow', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/memos/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await expect(page.locator('.memo-body')).toContainText('First list item');
  await page.screenshot({ path: testInfo.outputPath('memos-enlarged.png'), fullPage: true });
  await page.goto('/fixture-empty/');
  await expect(page.locator('[data-memos-empty]')).toHaveText('No Memo has been published.');
  await expect(page.getByRole('link', { name: 'Blog', exact: true })).toHaveAttribute('href', '/posts/');
  await expect(page.locator('form')).toHaveCount(0);
});
