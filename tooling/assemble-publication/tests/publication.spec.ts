import { expect, test } from '@playwright/test';

test('assembled release preserves cross-application navigation and mounted 404 ownership', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-terminal-theme', 'firefly');
  expect((await page.request.get('/fonts/JetBrainsMono-Regular-v2.304.woff2')).status()).toBe(200);
  expect((await page.request.get('/fonts/JetBrainsMono-Medium-v2.304.woff2')).status()).toBe(200);
  expect((await page.request.get('/licenses/JetBrainsMono-OFL-1.1.txt')).status()).toBe(200);
  const provenance = await page.request.get('/licenses/JetBrainsMono-PROVENANCE.txt');
  expect(provenance.status()).toBe(200);
  await expect(provenance.text()).resolves.toContain(
    'a9cb1cd82332b23a47e3a1239d25d13c86d16c4220695e34b243effa999f45f2'
  );
  await page.goto('/posts/main/379/');
  await expect(page.getByRole('heading', { level: 1, name: 'llm-workflow-with-trellis' })).toBeVisible();
  await expect(page.locator('[data-terminal-reader]')).toBeVisible();
  const readerScript = await page.locator('script[src*="ReaderStatus"]').getAttribute('src');
  expect(readerScript).toMatch(/^\/_astro\/ReaderStatus[^/]+\.js$/u);
  expect((await page.request.get(readerScript!)).status()).toBe(200);
  await page.goto('/lab/');
  await expect(page.getByRole('heading', { level: 1, name: 'Experiments' })).toBeVisible();
  const nerv = page.getByRole('link', { name: /Open NERV/u });
  await expect(nerv).toHaveAttribute('href', '/lab/nerv/');
  await nerv.click();
  await expect(page).toHaveURL(/\/lab\/nerv\/$/u);
  await expect(page.getByRole('heading', { level: 1, name: /NERV SPECIAL AGENCY/u })).toBeVisible();
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/lab/nerv/favicon.svg');
  expect((await page.request.get('/lab/nerv/favicon.svg')).status()).toBe(200);
  expect((await page.request.get('/lab/nerv/nerv-logo.svg')).status()).toBe(200);
  const width = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);

  const missing = await page.goto('/lab/nerv/missing/');
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: '404' })).toBeVisible();
});

test('assembled NERV retains reduced motion and the native return path', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/lab/nerv/?from=/lab/');
  expect(await page.evaluate(() => ({
    flicker: getComputedStyle(document.body, '::after').animationName,
    scanline: getComputedStyle(document.body, '::before').animationName
  }))).toEqual({ flicker: 'none', scanline: 'none' });

  const logo = page.locator('.logo-container');
  await logo.click();
  await logo.click();
  await logo.click();
  await expect(page).toHaveURL(/\/lab\/$/u);
});
