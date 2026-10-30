import { expect, test, type Locator, type Page, type Route } from '@playwright/test';

const audioPath = new URL('./fixtures/firefly-test-tone.mp3', import.meta.url).pathname;
const videoPath = new URL('./fixtures/firefly-test-clip.mp4', import.meta.url).pathname;
const gifPath = new URL('./fixtures/firefly-test-animation.gif', import.meta.url).pathname;
const documentPath = '/pages/markdown-template/';
const compositionText = 'Left composition paragraph one.';

async function mediaResponse(route: Route, assetPath: string, contentType: string) {
  await route.fulfill({ contentType, path: assetPath });
}

async function expectReadable(paragraph: Locator) {
  await paragraph.scrollIntoViewIfNeeded();
  await expect(paragraph).toBeVisible();
  expect(await paragraph.evaluate((element) => {
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) > 0 &&
      element.getBoundingClientRect().height > 0 && Boolean(element.textContent?.trim());
  })).toBe(true);
}

test('native audio and video decode real media and advance playback', async ({ page }, info) => {
  test.skip(info.project.name.includes('static'), 'Starting playback is an interactive check.');
  await page.route('https://example.invalid/recording.mp3', (route) => mediaResponse(route, audioPath, 'audio/mpeg'));
  await page.route('https://example.invalid/clip.mp4', (route) => mediaResponse(route, videoPath, 'video/mp4'));
  await page.goto(documentPath);
  for (const type of ['audio', 'video']) {
    const media = page.locator(`[data-article-content] .firefly-block-${type} ${type}`);
    await media.scrollIntoViewIfNeeded();
    await expect(media).toBeVisible();
    await media.evaluate((element) => {
      const player = element as HTMLMediaElement;
      player.muted = true;
      void player.play().catch(() => {});
    });
    await expect.poll(() => media.evaluate((element) => (element as HTMLMediaElement).currentTime)).toBeGreaterThan(0.05);
    expect(await media.evaluate((element) => (element as HTMLMediaElement).error)).toBeNull();
    await media.evaluate((element) => (element as HTMLMediaElement).pause());
  }
});

test('failed native media keeps a usable resource link and readable prose', async ({ page }, info) => {
  await page.route('https://example.invalid/**', (route) => route.abort());
  await page.goto(documentPath);
  for (const type of ['audio', 'video']) {
    const figure = page.locator(`[data-article-content] .firefly-block-${type}`);
    await figure.scrollIntoViewIfNeeded();
    const link = figure.getByRole('link', { name: `Open ${type}` });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', type === 'audio'
      ? 'https://example.invalid/recording.mp3' : 'https://example.invalid/clip.mp4');
    if (!info.project.name.includes('static')) {
      const media = figure.locator(type);
      await media.evaluate((element) => (element as HTMLMediaElement).load());
      await expect.poll(() => media.evaluate((element) => (element as HTMLMediaElement).error?.code ?? 0)).toBeGreaterThan(0);
      await expect(link).toBeVisible();
    }
  }
  await expectReadable(page.locator('.firefly-block-composition--image-left > p').first());
});

test('image elements decode and display an animated GIF resource', async ({ page }) => {
  await page.route('**/favicon.png', (route) => route.fulfill({ contentType: 'image/gif', path: gifPath }));
  await page.route('https://example.invalid/**', (route) => route.abort());
  await page.goto('/pages/firefly-display-semantic/');
  const figure = page.locator('.firefly-block-image');
  await figure.scrollIntoViewIfNeeded();
  const image = figure.getByAltText('Synthetic standalone image');
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((element) => {
    const image = element as HTMLImageElement;
    return image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
  })).toBe(true);
  await expect(figure.locator('figcaption')).toHaveText('A standalone image');
});

test('rapid scrolling keeps composition text readable while images are delayed or fail', async ({ page }, info) => {
  let release: () => void = () => {};
  const imageGate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/favicon.png', async (route) => {
    await imageGate;
    await route.abort();
  });
  await page.route('https://example.invalid/**', (route) => route.abort());
  try {
    await page.goto('/pages/firefly-display-semantic/', { waitUntil: 'domcontentloaded' });
    const paragraph = page.locator('.firefly-block-composition--image-left > p').first();
    await expectReadable(paragraph);
    await page.screenshot({ path: info.outputPath('delayed-image-readable.png') });
    for (const delta of [1800, -1800, 2600, -2600]) await page.mouse.wheel(0, delta);
    for (const side of ['right', 'top', 'left']) {
      await expectReadable(page.locator(`.firefly-block-composition--image-${side} > p`).first());
    }
    release();
    await expect.poll(() => page.getByAltText('Synthetic left image').evaluate((element) => {
      const image = element as HTMLImageElement;
      return image.complete && image.naturalWidth === 0;
    })).toBe(true);
    await expectReadable(paragraph);
    const after = page.getByText('After the left composition, this ordinary paragraph uses the full width.', { exact: true });
    await expectReadable(after);
    await page.screenshot({ path: info.outputPath('failed-image-readable.png') });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally {
    release();
  }
});

async function touchPrimary(page: Page) {
  return page.evaluate(() => matchMedia('(hover: none) and (pointer: coarse)').matches);
}

test('Terminal cat retains the generated composition and its prose', async ({ page }, info) => {
  test.skip(info.project.name.includes('static'), 'Terminal is an interactive enhancement.');
  await page.goto('/');
  test.skip(await touchPrimary(page), 'Touch-primary home uses native browsing.');
  await expect(page.locator('[data-terminal-home]')).toHaveAttribute('data-terminal-startup-state', 'ready');
  const command = page.locator('#terminal-command');
  await command.fill('cat ~/blog/pages/markdown-template.md');
  await command.press('Enter');
  const stream = page.locator('[data-terminal-transcript] [data-terminal-stream-document]').last();
  await expect(stream.locator('.firefly-block-composition')).toHaveCount(3);
  await expect(stream).toContainText(compositionText);
  await expectReadable(stream.locator('.firefly-block-composition--image-left > p').first());
});

test('touch homepage search finds prose inside a composition', async ({ page }, info) => {
  test.skip(info.project.name.includes('static'), 'Search is an interactive enhancement.');
  await page.goto('/');
  test.skip(!(await touchPrimary(page)), 'Homepage search is exposed on touch-primary clients.');
  const input = page.locator('#home-search-query');
  await expect(input).toBeVisible();
  await input.fill(compositionText);
  await input.press('Enter');
  const results = page.locator('[data-home-search-results]');
  await expect(results.locator('li')).toHaveCount(2);
  await expect(results).toContainText(compositionText);
  await expect(results.locator('a[href="/pages/markdown-template/"]')).toHaveCount(1);
  await expect(results.locator('a[href="/pages/firefly-display-semantic/"]')).toHaveCount(1);
  await expect(page.locator('[data-terminal-home]')).not.toHaveAttribute('data-terminal-controller-initialized', 'true');
});
