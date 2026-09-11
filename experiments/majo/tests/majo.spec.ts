import { expect, test } from '@playwright/test';

const imagePaths = [
  '/lab/majo/media/images/slide-01.jpg',
  '/lab/majo/media/images/slide-02.jpg',
  '/lab/majo/media/images/slide-03.jpg',
  '/lab/majo/media/images/preload-04.jpg',
  '/lab/majo/media/images/preload-05.png'
];

const trackLabels = [
  '陈致逸,HOYO-MiX - Reminiscence (Genshin Impact Main Theme Var.) 追忆',
  '陈致逸,HOYO-MiX - Faraway Solicitude 遥远的嘱托',
  '陈致逸,HOYO-MiX - The Fading Stories (Qingce Night) 不再年轻的村庄 (轻策夜间)'
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

test('matches the reference copy, metadata, and visual composition contract', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await openMajo(page);

  await expect(page).toHaveTitle('魔女之旅');
  await expect(page.locator('[data-majo-slide]').nth(0)).toContainText('“ 请别在意。');
  await expect(page.locator('[data-majo-slide]').nth(0)).toContainText('我是旅人，得继续旅行才行… ”');
  await expect(page.locator('[data-majo-quote]').first().locator('b')).toHaveText('“ 请别在意。');

  await expect(page.locator('[data-majo-slide]').nth(1)).toContainText('身为魔女的她的至今为止与从今以后。');
  await expect(page.locator('[data-majo-slide]').nth(1)).toContainText('和莫名其妙、滑稽可笑的人们相遇，');
  await expect(page.locator('[data-majo-slide]').nth(1)).toContainText('接触某人美丽的日常生活，');
  await expect(page.locator('[data-majo-slide]').nth(1)).toContainText('日复一日，编织出相逢与离别的故事。');

  const thirdSlideCopy = page.locator('[data-majo-slide]').nth(2);
  for (const line of [
    '凡事只要以负面的角度思考，不论什么都会变得悲观',
    '然而若是一味地以自己喜欢的方式解释',
    '也可能会看不清四周，在不知不觉间断送生命',
    '「……」',
    '结果，凡事还是适可而止最好',
    '偏向极端的心情有可能会使自己迎向崩毁',
    '所以，暂且放下是非对错',
    '我的旅途依然平淡地持续着',
    '一如既往。'
  ]) {
    await expect(thirdSlideCopy).toContainText(line);
  }

  await expect(page.locator('[data-majo-track-title]')).toHaveText(trackLabels[0]);
  await expect(page.locator('[data-majo-bginfo]')).toHaveText('Background by Cost');
  await expect(page.locator('[data-majo-bginfo-link]')).toHaveAttribute('href', 'https://www.pixiv.net/artworks/98156405');
  await expect(page.locator('.majo-kicker, .majo-scene-note, .majo-scene-meta, [data-majo-counter], [data-majo-track-subtitle]')).toHaveCount(0);
  await expect(page.locator('.majo-pagination__button').first()).toHaveText('');
  expect(requests.some((request) => new URL(request).origin !== new URL(page.url()).origin)).toBe(false);

  const visual = await page.locator('[data-majo-page]').evaluate((pageElement) => {
    const page = pageElement as HTMLElement;
    const slide = page.querySelector<HTMLElement>('[data-majo-slide]');
    const background = page.querySelector<HTMLElement>('[data-majo-background]');
    const progress = page.querySelector<HTMLElement>('.majo-footer__track');
    const footer = page.querySelector<HTMLElement>('.majo-footer');
    const bullet = page.querySelector<HTMLElement>('.majo-pagination__button');
    if (slide === null || background === null || progress === null || footer === null || bullet === null) {
      throw new Error('majo visual contract nodes are missing');
    }
    return {
      fade: getComputedStyle(slide).transitionDuration,
      zoom: getComputedStyle(background).transitionDuration,
      progressMaxWidth: getComputedStyle(progress).maxWidth,
      progressMinWidth: getComputedStyle(progress).minWidth,
      footerGradient: getComputedStyle(footer).backgroundImage,
      bulletWidth: getComputedStyle(bullet, '::after').width,
      bulletRadius: getComputedStyle(bullet, '::after').borderRadius
    };
  });
  expect(visual.fade.split(',')[0]).toBe('1.5s');
  expect(visual.zoom).toBe('10s');
  expect(visual.progressMaxWidth).toBe('30%');
  expect(visual.progressMinWidth).toBe('200px');
  expect(visual.footerGradient).toContain('linear-gradient');
  expect(visual.bulletWidth).toBe('10px');
  expect(visual.bulletRadius).toBe('50%');

  await expectNoHorizontalOverflow(page);
});

test('pagination, keyboard navigation, fade state, and local track metadata stay in sync', async ({ page }) => {
  await openMajo(page);
  await expect(page.locator('[data-majo-page]')).toHaveAttribute('data-majo-active-slide', '0');
  await expect(page.locator('[data-majo-page]')).toHaveAttribute('data-majo-current-track', '0');
  await expect(page.locator('[data-majo-track-title]')).toHaveText(trackLabels[0]);

  await page.locator('[data-majo-pagination-button][data-majo-slide-to="1"]').click();
  await expect(page.locator('[data-majo-page]')).toHaveAttribute('data-majo-active-slide', '1');
  await expect(page.locator('[data-majo-page]')).toHaveAttribute('data-majo-current-track', '1');
  await expect(page.locator('[data-majo-page]')).toHaveAttribute('data-majo-transition', 'running');
  await expect(page.locator('[data-majo-pagination-button][data-majo-slide-to="1"]')).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('[data-majo-track-title]')).toHaveText(trackLabels[1]);
  await expect(page.locator('[data-majo-bginfo]')).toHaveText('Background by _');
  await expect(page.locator('[data-majo-bginfo-link]')).toHaveAttribute('href', '#');

  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-majo-page]')).toHaveAttribute('data-majo-active-slide', '2');
  await expect(page.locator('[data-majo-track-title]')).toHaveText(trackLabels[2]);
  await page.keyboard.press('Home');
  await expect(page.locator('[data-majo-page]')).toHaveAttribute('data-majo-active-slide', '0');
  await expectNoHorizontalOverflow(page);
});

test('first-slide text reveals on the observed cadence', async ({ page }) => {
  await openMajo(page);
  const quotes = page.locator('[data-majo-quote]');
  await expect(quotes.nth(0)).toHaveClass(/is-visible/u);
  await expect(quotes.nth(1)).not.toHaveClass(/is-visible/u);
  await expect(quotes.nth(1)).toHaveCSS('opacity', '0');
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
  await expect(page.locator('[data-majo-track-title]')).toHaveText(trackLabels[1]);
});

test('autoplay rejection leaves the page usable and paused', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      return Promise.reject(new DOMException('autoplay blocked', 'NotAllowedError'));
    };
  });
  await openMajo(page);
  await expect(page.locator('[data-majo-page]')).toHaveAttribute('data-majo-player-state', 'paused');
  await page.locator('[data-majo-play]').click();
  await expect(page.locator('[data-majo-page]')).toHaveAttribute('data-majo-player-state', 'paused');
  await expect(page.locator('[data-majo-play]')).toHaveAttribute('aria-label', '播放当前曲目');
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
    await expect(page.locator('[data-majo-slide].is-active [data-majo-quote]').first()).toBeVisible();
    await expect(page.locator('[data-majo-quote]').first().locator('b')).toHaveText('“ 请别在意。');
    await expect(page.locator('[data-majo-quote]').nth(1)).toHaveCSS('opacity', '0');
    await expect(page.locator('[data-majo-loading]')).toHaveAttribute('hidden', '');
    await expect(page.locator('[data-majo-background]').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
