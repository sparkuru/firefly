import { expect, test } from '@playwright/test';

test('canonical diagrams and native source remain usable at every viewport', async ({ page }, testInfo) => {
  const external: string[] = [];
  page.on('request', (request) => { if (!request.url().startsWith('http://127.0.0.1:4321/')) external.push(request.url()); });
  await page.goto('/pages/mermaid-diagrams/');
  const figures = page.locator('[data-diagram="rendered"]');
  await expect(figures).toHaveCount(2);
  await expect(figures.first().locator('a')).toHaveAttribute('href', /\/diagrams\/[a-f0-9]{64}\.svg#[^\s]+/u);
  await expect(page.locator('[data-diagram="fallback"]')).toHaveCount(2);
  for (const figure of await figures.all()) {
    const image = figure.locator('img');
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
    await expect(image).toHaveAttribute('alt', /.+/u);
    const fullSizeHref = await figure.locator('a').getAttribute('href') as string;
    const fullSizeUrl = new URL(fullSizeHref, page.url());
    expect(fullSizeUrl.pathname).toBe(await image.getAttribute('src'));
    const fullSize = await page.context().newPage();
    try {
      await fullSize.goto(fullSizeHref);
      const dimensions = await fullSize.locator('svg').evaluate((node) => {
        const svg = node as SVGSVGElement;
        return { width: svg.getBoundingClientRect().width, height: svg.getBoundingClientRect().height,
          sourceWidth: svg.viewBox.baseVal.width, sourceHeight: svg.viewBox.baseVal.height };
      });
      expect(dimensions.width).toBeCloseTo(dimensions.sourceWidth, 0);
      expect(dimensions.height).toBeCloseTo(dimensions.sourceHeight, 0);
      if (fullSizeUrl.hash) {
        const target = await fullSize.evaluate((id) => {
          const rect = document.getElementById(id)?.getBoundingClientRect();
          return rect && rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1;
        }, decodeURIComponent(fullSizeUrl.hash.slice(1)));
        expect(target).toBe(true);
      }
    } finally { await fullSize.close(); }
    await figure.locator('summary').click();
    await expect(figure.locator('pre')).toBeVisible();
    await figure.locator('summary').click();
  }
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
  expect(external).toEqual([]);
  expect(testInfo.project.use.javaScriptEnabled).toBeDefined();
});

test('desktop repeated cat keeps isolated SVG assets and disclosures intact', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop-interactive', 'Command rendering requires the available desktop Terminal; native diagrams are covered at every viewport.');
  await page.goto('/');
  const command = page.locator('#terminal-command');
  for (let index = 0; index < 2; index += 1) {
    await command.fill('cat ~/blog/pages/mermaid-diagrams.md');
    await command.press('Enter');
  }
  const figures = page.locator('[data-terminal-stream-document] [data-diagram="rendered"]');
  await expect(figures).toHaveCount(4);
  const firstDetails = figures.first().locator('details');
  await firstDetails.locator('summary').click();
  await expect(firstDetails).toHaveAttribute('open', '');
  await expect(figures.nth(2).locator('details')).not.toHaveAttribute('open', '');
  const ids = await page.locator('[id]').evaluateAll((elements) => elements.map((element) => element.id));
  expect(new Set(ids).size).toBe(ids.length);
  for (const figure of await figures.all()) {
    const image = figure.locator('img');
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  await command.fill('clear'); await command.press('Enter');
  await expect(figures).toHaveCount(0);
  await command.fill('cat ~/blog/pages/mermaid-diagrams.md'); await command.press('Enter');
  await expect(figures).toHaveCount(2);
});
