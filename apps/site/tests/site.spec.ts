import { expect, test, type Page } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page) {
  const documentWidth = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));

  expect(documentWidth.scrollWidth).toBeLessThanOrEqual(documentWidth.clientWidth);
}

test('home exposes public content and visible keyboard focus', async ({ page }) => {
  await page.goto('/');

  const main = page.getByRole('main');
  await expect(main).toBeVisible();
  await expect(
    main.getByRole('heading', {
      level: 1,
      name: 'Content that works before anything else does.'
    })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Hello, static foundation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'About this foundation' })).toBeVisible();
  await expect(page.getByText('Hidden draft')).toHaveCount(0);

  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  expect(await skipLink.evaluate((link) => getComputedStyle(link).outlineStyle)).not.toBe(
    'none'
  );

  await expectNoHorizontalOverflow(page);
});

test('post deep link renders Markdown as semantic HTML', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Hello, static foundation' }).click();

  await expect(page).toHaveURL(/\/posts\/hello-static-foundation\/$/);
  const article = page.getByRole('article');
  await expect(
    article.getByRole('heading', { level: 1, name: 'Hello, static foundation' })
  ).toBeVisible();
  await expect(
    article.getByRole('heading', { level: 2, name: 'Markdown to durable HTML' })
  ).toBeVisible();
  await expect(article).toContainText('No browser-side parser');

  await expectNoHorizontalOverflow(page);
});

test('page deep link renders readable Markdown', async ({ page }) => {
  await page.goto('/pages/about/');

  const article = page.getByRole('article');
  await expect(
    article.getByRole('heading', { level: 1, name: 'About this foundation' })
  ).toBeVisible();
  await expect(
    article.getByRole('heading', { level: 2, name: 'A deliberately small beginning' })
  ).toBeVisible();
  await expect(article).toContainText('Future presentations can change how the site looks');

  await expectNoHorizontalOverflow(page);
});

test('unknown route renders the static 404 recovery path', async ({ page }) => {
  const response = await page.goto('/missing-route/');

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Page not found.' })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return home' })).toHaveAttribute('href', '/');

  await expectNoHorizontalOverflow(page);
});
