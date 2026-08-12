import { expect, test } from '@playwright/test';

test('renders the emergency notice without horizontal overflow', async ({ page }) => {
  await page.goto('./');

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
});
