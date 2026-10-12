import { expect, test } from '@playwright/test';

test('renders the emergency notice without horizontal overflow', async ({ page }) => {
  const response = await page.goto('./');

  expect(response?.status()).toBe(200);

  await expect(page).toHaveTitle('Domain Seized - NERV Special Agency');

  const main = page.getByRole('main');
  await expect(main).toBeVisible();
  await expect(
    main.getByRole('heading', {
      level: 1,
      name: /NERV SPECIAL AGENCY EMERGENCY NOTICE/
    })
  ).toBeVisible();

  const viewportWidth = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));

  expect(viewportWidth.scrollWidth).toBeLessThanOrEqual(viewportWidth.clientWidth);

  const favicon = page.locator('link[rel="icon"]');
  await expect(favicon).toHaveAttribute('href', '/lab/nerv/favicon.svg');
  const faviconResponse = await page.request.get('/lab/nerv/favicon.svg');
  expect(faviconResponse.status()).toBe(200);
  const logoResponse = await page.request.get('/lab/nerv/nerv-logo.svg');
  expect(logoResponse.status()).toBe(200);
});

test('reduced motion freezes continuous and scroll-driven decoration', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');

  expect(await page.evaluate(() => ({
    flicker: getComputedStyle(document.body, '::after').animationName,
    scanline: getComputedStyle(document.body, '::before').animationName
  }))).toEqual({ flicker: 'none', scanline: 'none' });

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(50);
  const positions = await page.locator('.warning-stripe').evaluateAll((stripes) =>
    stripes.map((stripe) => getComputedStyle(stripe).getPropertyValue('--bg-position').trim())
  );
  expect(positions).toEqual(['0px', '0px']);
});

test('keeps the established three-click return contract', async ({ page }) => {
  await page.goto('./?from=/lab/');
  const logo = page.locator('.logo-container');
  await logo.click();
  await logo.click();
  await logo.click();
  await expect(page).toHaveURL(/\/lab\/$/u);
  expect((await page.context().cookies()).find((cookie) => cookie.name === 'has_visited')).toEqual(
    expect.objectContaining({ value: 'true', path: '/', sameSite: 'Strict' })
  );
});

test('serves an independent mounted 404 document', async ({ page }) => {
  const response = await page.goto('/lab/nerv/missing/');
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle('404 - Not Found');
  await expect(page.getByRole('heading', { level: 1, name: '404' })).toBeVisible();
});
