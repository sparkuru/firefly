import { expect, test, type Locator, type Page } from '@playwright/test';

const fixtures = [
  { path: '/pages/markdown-template/', label: 'terminal' },
  { path: '/pages/firefly-display-semantic/', label: 'semantic' }
] as const;

async function compositionGeometry(group: Locator) {
  return group.evaluate((element) => {
    const figure = element.querySelector<HTMLElement>(':scope > .firefly-block-media');
    const paragraphs = [...element.querySelectorAll<HTMLElement>(':scope > p')];
    if (!figure || paragraphs.length === 0) throw new Error('Missing composition figure or prose.');
    const figureBox = figure.getBoundingClientRect();
    const groupBox = element.getBoundingClientRect();
    const lines = paragraphs.flatMap((paragraph) => {
      const range = document.createRange();
      range.selectNodeContents(paragraph);
      return [...range.getClientRects()].filter((rectangle) => rectangle.width > 0 && rectangle.height > 0)
        .map(({ left, right, top, bottom, width }) => ({ left, right, top, bottom, width }));
    });
    return {
      float: getComputedStyle(figure).float,
      group: { left: groupBox.left, right: groupBox.right, bottom: groupBox.bottom, width: groupBox.width },
      figure: { left: figureBox.left, right: figureBox.right, top: figureBox.top, bottom: figureBox.bottom, width: figureBox.width },
      lines
    };
  });
}

async function assertDocumentLayout(page: Page, isMobile: boolean) {
  const article = page.locator('[data-article-content]');
  for (const side of ['left', 'right', 'top'] as const) {
    const group = article.locator(`.firefly-block-composition--image-${side}`);
    const figure = group.locator(':scope > .firefly-block-media');
    const image = figure.getByAltText(`Synthetic ${side} image`);
    const paragraph = group.locator(':scope > p').first();
    await expect(group).toHaveCount(1);
    await figure.scrollIntoViewIfNeeded();
    await expect(image).toBeVisible();
    await expect(paragraph).toContainText(`${side[0].toUpperCase()}${side.slice(1)} composition paragraph one.`);
    await expect.poll(() => image.evaluate((element) =>
      element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0 && element.naturalHeight > 0
    )).toBe(true);

    const metrics = await compositionGeometry(group);
    expect(metrics.figure.width).toBeGreaterThan(0);
    expect(metrics.group.bottom).toBeGreaterThanOrEqual(metrics.figure.bottom - 1);
    expect(metrics.lines.length).toBeGreaterThan(0);

    if (isMobile || side === 'top') {
      expect(metrics.float).toBe('none');
      expect(metrics.lines[0]!.top).toBeGreaterThanOrEqual(metrics.figure.bottom - 1);
      if (side === 'top') {
        expect(Math.abs((metrics.figure.left + metrics.figure.right) / 2 -
          (metrics.group.left + metrics.group.right) / 2)).toBeLessThanOrEqual(1);
      }
    } else {
      expect(metrics.float).toBe(side);
      if (side === 'left') expect(metrics.lines[0]!.left).toBeGreaterThanOrEqual(metrics.figure.right - 1);
      else expect(metrics.lines[0]!.right).toBeLessThanOrEqual(metrics.figure.left + 1);
      const fullWidthLines = metrics.lines.filter((line) => line.top >= metrics.figure.bottom - 1);
      expect(fullWidthLines.some((line) => line.width >= metrics.group.width * 0.7)).toBe(true);
    }

    const next = group.locator('xpath=following-sibling::*[1]');
    const followingBox = await next.boundingBox();
    expect(followingBox).not.toBeNull();
    expect(followingBox!.y).toBeGreaterThanOrEqual(metrics.figure.bottom - 1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    (await page.evaluate(() => window.innerWidth)) + 1
  );
}

for (const fixture of fixtures) {
  test(`${fixture.label}: static display blocks preserve content and responsive layout`, async ({ page }, testInfo) => {
    await page.route('https://example.invalid/**', (route) => route.abort());
    await page.goto(fixture.path);
    const article = page.locator('[data-article-content]');
    await expect(article.locator('.firefly-block-composition')).toHaveCount(3);
    const standalone = article.locator('.firefly-block-image');
    await standalone.scrollIntoViewIfNeeded();
    await expect(standalone.getByAltText('Synthetic standalone image')).toBeVisible();
    await expect(article.getByRole('link', { name: 'Synthetic external link' })).toHaveAttribute('href', 'https://example.invalid/firefly-display');
    await expect(article.locator('.firefly-block-audio audio[controls]')).toHaveCount(1);
    await expect(article.locator('.firefly-block-video video[controls]')).toHaveCount(1);
    await expect(article.locator('.firefly-block-audio audio')).not.toHaveAttribute('autoplay');
    await expect(article.locator('.firefly-block-video video')).not.toHaveAttribute('autoplay');
    await expect(article.locator('pre code.language-firefly')).toHaveCount(0);

    for (const theme of ['default', 'paper']) {
      await article.evaluate((element, value) => element.setAttribute('data-content-theme', value), theme);
      await assertDocumentLayout(page, testInfo.project.name.includes('mobile'));
    }
  });

  test(`${fixture.label}: nested composition text participates in reading and search`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.includes('static') || testInfo.project.name.includes('mobile'), 'Navigator interaction is desktop-only.');
    await page.route('https://example.invalid/**', (route) => route.abort());
    await page.goto(`${fixture.path}#document-navigator`);
    const region = page.locator('[data-document-navigator-region]');
    const firstParagraph = region.locator('.firefly-block-composition--image-left > p').first();
    await expect(firstParagraph).toHaveAttribute('data-navigation-unit', /^\d+$/u);
    await expect(region.locator('.firefly-block-composition[data-navigation-unit]')).toHaveCount(0);
    await expect(region.locator('.firefly-block-composition > p[data-navigation-unit]')).toHaveCount(7);
    await region.focus();
    await region.press('/');
    const input = page.getByRole('searchbox', { name: /Search document forward/u });
    await input.fill('Left composition paragraph one.');
    await input.press('Enter');
    await expect(page.locator('[data-navigation-search-status]')).toContainText('1/1 matches for');
    await expect(firstParagraph).toHaveAttribute('data-navigation-active', '');

    const link = region.getByRole('link', { name: 'Synthetic external link' });
    const position = page.locator('[data-navigation-position]');
    const before = await position.textContent();
    await link.focus();
    await link.press('j');
    await expect(position).toHaveText(before ?? '');
  });
}
