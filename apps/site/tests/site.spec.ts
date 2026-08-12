import { expect, test, type Page } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page) {
  const documentWidth = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));

  expect(documentWidth.scrollWidth).toBeLessThanOrEqual(documentWidth.clientWidth);
}

async function expectContainedInViewport(
  page: Page,
  locator: ReturnType<Page['locator']>
) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();

  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
    viewport?.width ?? 0
  );
}

async function expectHeadingLevels(page: Page, levels: number[]) {
  const actual = await page
    .getByRole('article')
    .locator('h1, h2, h3, h4, h5, h6')
    .evaluateAll((headings) =>
      headings.map((heading) => Number(heading.tagName.slice(1)))
    );

  expect(actual).toEqual(levels);
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
  await expect(
    article.getByRole('heading', { level: 3, name: 'Stable boundaries' })
  ).toBeVisible();
  await expect(article).toContainText('No browser-side parser');

  const outline = page.getByRole('navigation', { name: 'On this page' });
  await expect(outline).toBeVisible();
  await expect(
    outline.getByRole('link', { name: 'Markdown to durable HTML' })
  ).toHaveAttribute('href', '#markdown-to-durable-html');
  await expect(outline.getByRole('link', { name: 'Stable boundaries' })).toHaveAttribute(
    'href',
    '#stable-boundaries'
  );
  await outline.getByRole('link', { name: 'Stable boundaries' }).click();
  await expect(page).toHaveURL(/#stable-boundaries$/u);
  await expectHeadingLevels(page, [1, 2, 3]);

  const codeRegion = page.getByRole('region', { name: /^Code content:/u });
  const tableRegion = page.getByRole('region', { name: /^Table content:/u });
  await expect(codeRegion).toHaveAttribute('tabindex', '0');
  await expect(tableRegion.getByRole('table')).toBeVisible();
  await expectContainedInViewport(page, codeRegion);
  await expectContainedInViewport(page, tableRegion);
  expect(
    await codeRegion.evaluate((element) => ({
      clientWidth: element.clientWidth,
      overflowX: getComputedStyle(element).overflowX,
      scrollWidth: element.scrollWidth
    }))
  ).toEqual(
    expect.objectContaining({
      overflowX: 'auto'
    })
  );
  expect(await codeRegion.evaluate((element) => element.scrollWidth)).toBeGreaterThan(
    await codeRegion.evaluate((element) => element.clientWidth)
  );
  await codeRegion.focus();
  await expect(codeRegion).toBeFocused();
  expect(await codeRegion.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe(
    'none'
  );

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
  await expect(
    article.getByRole('heading', { level: 2, name: 'What remains constant' })
  ).toBeVisible();
  await expect(article).toContainText('Future presentations can change how the site looks');
  await expect(page.getByRole('navigation', { name: 'On this page' })).toBeVisible();
  await expectHeadingLevels(page, [1, 2, 2]);

  await expectNoHorizontalOverflow(page);
});

test('document fragment deep link resolves without browser JavaScript', async ({ page }) => {
  await page.goto('/posts/hello-static-foundation/#stable-boundaries');

  await expect(page).toHaveURL(/#stable-boundaries$/u);
  await expect(page.locator('#stable-boundaries')).toHaveText('Stable boundaries');
  await expect(page.getByText('Presentation changes should preserve')).toBeVisible();
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
