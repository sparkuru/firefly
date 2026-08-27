import { expect, test, type Page } from '@playwright/test';

const rawPostHref = '/posts/交流/萤火虫/';
const commentsPostPath = '/posts/%E4%BA%A4%E6%B5%81/%E8%90%A4%E7%81%AB%E8%99%AB/';

async function expectNoHorizontalOverflow(page: Page) {
  const width = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);
}

test('Unicode post keeps its readable route and canonical comments payload', async ({ page }) => {
  const serviceRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/v1/comments/')) {
      serviceRequests.push(request.url());
    }
  });

  const response = await page.goto(rawPostHref);
  expect(response?.status()).toBe(200);
  expect(decodeURI(new URL(page.url()).pathname)).toBe(rawPostHref);

  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(canonical).not.toBeNull();
  expect(decodeURI(new URL(canonical ?? '').pathname)).toBe(rawPostHref);

  const section = page.locator('.comment-section');
  await expect(section).toBeVisible();
  await expect(section.getByRole('heading', { level: 2, name: 'Comments' })).toBeVisible();
  await expect(section.getByText('A top-level comment on the Unicode route.')).toBeVisible();
  await expect(section.getByText('A direct reply on the Unicode route.')).toBeVisible();

  const forms = section.locator('form');
  await expect(forms).toHaveCount(2);
  await expect(forms.locator('input[name="postPath"]')).toHaveCount(2);
  for (const form of await forms.all()) {
    await expect(form.locator('input[name="postPath"]')).toHaveValue(commentsPostPath);
    await expect(form.getByLabel('Display name')).toBeVisible();
    await expect(form.getByLabel('Email (private; used for verification)')).toBeVisible();
    await expect(form.getByLabel('Comment', { exact: true })).toBeVisible();
  }
  await expect(section.locator('input[name="parentId"]')).toHaveValue('c_unicode_top');

  const box = await section.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewport?.width ?? 0);
  await expectNoHorizontalOverflow(page);
  expect(serviceRequests).toEqual([]);
});
