import { expect, test } from '@playwright/test';

const imagePaths = [
  '/lab/majo/media/images/slide-01.jpg',
  '/lab/majo/media/images/slide-02.jpg',
  '/lab/majo/media/images/slide-03.jpg',
  '/lab/majo/media/images/preload-04.jpg',
  '/lab/majo/media/images/preload-05.png'
];

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const width = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);
}

async function openMajo(page: import('@playwright/test').Page) {
  const response = await page.goto('./');
  expect(response?.status()).toBe(200);
  await expect(page.locator('[data-majo-page]')).toHaveAttribute('data-majo-ready', 'true', { timeout: 60_000 });
}

test('loads all local media and exposes a ready three-slide page', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await openMajo(page);

  await expect(page.locator('[data-majo-slide]')).toHaveCount(3);
  await expect(page.locator('[data-majo-pagination-button]')).toHaveCount(3);
  await expect(page.locator('[data-majo-page]')).toHaveAttribute('data-majo-preload-errors', '0');
  await expect(page.locator('[data-majo-loading]')).toBeHidden();
  for (const imagePath of imagePaths) {
    expect(requests.some((request) => new URL(request).pathname === imagePath)).toBe(true);
    expect((await page.request.get(imagePath)).status()).toBe(200);
  }
  expect((await page.request.get('/lab/majo/media/music/track-01.mp3')).status()).toBe(200);
  expect((await page.request.get('/lab/majo/media/music/track-02.mp3')).status()).toBe(200);
  expect((await page.request.get('/lab/majo/media/music/track-03.mp3')).status()).toBe(200);

  const pageOrigin = new URL(page.url()).origin;
  expect(requests.every((request) => new URL(request).origin === pageOrigin)).toBe(true);
  await expectNoHorizontalOverflow(page);
});

test('pagination, keyboard navigation, fade state, and local track metadata stay in sync', async ({ page }) => {
  await openMajo(page);
  await expect(page.locator('[data-majo-page]')).toHaveAttribute('data-majo-active-slide', '0');
  await expect(page.locator('[data-majo-page]')).toHaveAttribute('data-majo-current-track', '0');
  await expect(page.locator('[data-majo-track-title]')).toHaveText('Reminiscence (Genshin Impact Main Theme Var.)');

  await page.locator('[data-majo-pagination-button][data-majo-slide-to="1"]').click();
  await expect(page.locator('[data-majo-page]')).toHaveAttribute('data-majo-active-slide', '1');
  await expect(page.locator('[data-majo-page]')).toHaveAttribute('data-majo-current-track', '1');
  await expect(page.locator('[data-majo-page]')).toHaveAttribute('data-majo-transition', 'running');
  await expect(page.locator('[data-majo-pagination-button][data-majo-slide-to="1"]')).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('[data-majo-track-title]')).toHaveText('Faraway Solicitude');
  await expect(page.locator('[data-majo-scene]')).toHaveText('after rain');

  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-majo-page]')).toHaveAttribute('data-majo-active-slide', '2');
  await page.keyboard.press('Home');
  await expect(page.locator('[data-majo-page]')).toHaveAttribute('data-majo-active-slide', '0');
  await expectNoHorizontalOverflow(page);
});

test('first-slide text reveals on the observed cadence', async ({ page }) => {
  await openMajo(page);
  const quotes = page.locator('[data-majo-quote]');
  await expect(quotes.nth(0)).toHaveClass(/is-visible/u);
  await expect(quotes.nth(1)).not.toHaveClass(/is-visible/u);
  await expect(quotes.nth(1)).toHaveClass(/is-visible/u, { timeout: 3_500 });
});

test('native player controls seek, toggle state, and advance on ended', async ({ page }) => {
  await page.addInitScript(() => {
    const mediaStates = new WeakMap<HTMLMediaElement, { paused: boolean; duration: number; currentTime: number }>();
    const stateFor = (media: HTMLMediaElement) => {
      const existing = mediaStates.get(media);
      if (existing !== undefined) return existing;
      const state = { paused: true, duration: 180, currentTime: 0 };
      mediaStates.set(media, state);
      return state;
    };
    Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
      configurable: true,
      get() { return stateFor(this).paused; }
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
      configurable: true,
      get() { return stateFor(this).duration; }
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
      configurable: true,
      get() { return stateFor(this).currentTime; },
      set(value: number) { stateFor(this).currentTime = value; }
    });
    HTMLMediaElement.prototype.load = function () {
      stateFor(this).currentTime = 0;
      this.dispatchEvent(new Event('durationchange'));
    };
    HTMLMediaElement.prototype.play = function () {
      stateFor(this).paused = false;
      this.dispatchEvent(new Event('play'));
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      stateFor(this).paused = true;
      this.dispatchEvent(new Event('pause'));
    };
  });
  await openMajo(page);
  const audio = page.locator('[data-majo-audio]');
  await expect(page.locator('[data-majo-page]')).toHaveAttribute('data-majo-player-state', 'playing');
  await page.locator('[data-majo-play]').click();
  await expect(page.locator('[data-majo-page]')).toHaveAttribute('data-majo-player-state', 'paused');

  await page.locator('[data-majo-progress]').fill('50');
  expect(await audio.evaluate((element) => (element as HTMLAudioElement).currentTime)).toBe(90);
  await audio.dispatchEvent('ended');
  await expect(page.locator('[data-majo-page]')).toHaveAttribute('data-majo-active-slide', '1');
  await expect(page.locator('[data-majo-track-subtitle]')).toHaveText('远方的牵挂');
});

test('reduced motion removes continuous zoom and shortens transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openMajo(page);
  await expect(page.locator('[data-majo-page]')).toHaveAttribute('data-majo-reduced-motion', 'true');
  await expect(page.locator('[data-majo-page]')).toHaveAttribute('data-majo-zoom-state', 'settled');
  await page.locator('[data-majo-pagination-button][data-majo-slide-to="2"]').click();
  await expect(page.locator('[data-majo-page]')).toHaveAttribute('data-majo-transition', 'complete');
  expect(await page.locator('[data-majo-background]').nth(2).evaluate((element) => getComputedStyle(element).transitionDuration)).toBe('0s');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('first slide remains usable', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('[data-majo-slide].is-active h1')).toBeVisible();
    await expect(page.locator('[data-majo-quote]').first()).toBeVisible();
    await expect(page.locator('[data-majo-loading]')).toHaveAttribute('hidden', '');
    await expect(page.locator('[data-majo-background]').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
