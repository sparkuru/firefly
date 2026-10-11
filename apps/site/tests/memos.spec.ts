import { expect, test } from '@playwright/test';

test('unified static feed, full details, publication policy and Pages discovery', async ({ page }, info) => {
  await page.goto('/pages/');
  await page.getByRole('link', { name: '~/blog/pages/memos.md', exact: true }).click();
  await expect(page).toHaveURL(/\/pages\/memos\/$/u);
  await expect(page.getByRole('heading', { name: 'Memos', exact: true })).toHaveCount(1);
  await expect(page.locator('[data-memo-entry]')).toHaveCount(20);
  await expect(page.locator('#m_fixture_recent .memo-body')).toContainText('An intentional second line.');
  await expect(page.locator('#m_fixture_recent br')).toHaveCount(1);
  await expect(page.locator('[data-content-marker="featured"]')).toHaveText('Featured');
  await expect(page.locator('#m_fixture_recent .memo-tags')).toHaveText('#reading');
  await expect(page.locator('form,input,textarea,[data-document-navigator]')).toHaveCount(0);
  await expect(page.locator('#m_fixture_draft,#m_fixture_private')).toHaveCount(0);
  expect((await page.request.get('/pages/memos/m_fixture_draft/')).status()).toBe(404);
  expect((await page.request.get('/pages/memos/assets/orphan.png')).status()).toBe(404);
  await page.screenshot({ path: info.outputPath('integrated-memo-reading.png') });
  const preview = page.locator('#m_fixture_middle');
  await expect(preview).not.toContainText('The final line survives in full.');
  await preview.getByRole('link', { name: /Read full entry/u }).click();
  await expect(page).toHaveURL(/\/pages\/memos\/m_fixture_middle\/$/u);
  await expect(page.getByRole('heading', { name: 'A longer note', exact: true })).toBeVisible();
  await expect(page.locator('.memo-body')).toContainText('The final line survives in full.');
  await expect(page.locator('pre code').filter({ hasText: 'code indentation' })).toContainText('  code indentation');
  await expect(page.getByAltText('Synthetic pixel')).toBeVisible();
  await expect(page.locator('.memo-body script')).toHaveCount(0);
  expect((await page.request.get('/pages/memos/assets/pixel.png')).status()).toBe(200);
  expect((await page.request.get('/pages/memos/assets/%E5%9B%BE%E5%83%8F.png')).status()).toBe(200);
  await expect(page.getByAltText('Encoded Unicode image')).toBeVisible();
  await expect(page.locator('[data-memo-header],.memo-primary-nav,.memo-intro,.memo-tags,.memo-marker,.memo-updated')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Return to timeline/u })).toHaveCount(1);
  await expect(page.locator('.memo-detail')).toHaveCSS('box-shadow', 'none');
  await expect(page.locator('.memo-detail')).toHaveCSS('border-top-width', '0px');
  expect(await page.locator('.memo-return').evaluate((link) => link.previousElementSibling?.matches('.memo-entry-detail'))).toBe(true);
  await expect(page.locator('.memo-entry-detail')).toHaveCSS('border-bottom-width', '1px');
  await page.screenshot({ path: info.outputPath('integrated-memo-detail.png') });
  await page.getByRole('link', { name: /Return to timeline/u }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('integrated-memo-detail-return.png') });
  await page.getByRole('link', { name: /Return to timeline/u }).click();
  await expect(page).toHaveURL(/\/pages\/memos\/#m_fixture_middle$/u);
  await expect(page.locator('#m_fixture_middle')).toBeVisible();
});

test('empty/single timelines, keyboard links, zoom and local overflow stay readable', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/pages/memos/m_fixture_middle/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await expect(page.locator('pre code').filter({ hasText: 'code indentation' })).toContainText('code indentation');
  await page.screenshot({ path: info.outputPath('integrated-memo-zoom.png') });
  await page.goto('/fixture-empty/pages/memos/');
  await expect(page.locator('.memo-empty')).toHaveText('No Memo entries have been published yet.');
  await expect(page.getByRole('slider', { name: 'Historical time' })).toBeHidden();
  await expect(page.getByText('Browse months', { exact: true })).toHaveCount(0);
  await page.goto('/fixture-single/pages/memos/');
  await expect(page.locator('[data-memo-entry]')).toHaveCount(1);
  await expect(page.getByRole('slider', { name: 'Historical time', includeHidden: true })).toHaveAttribute('aria-disabled', 'true');
});

test('scrub, natural scroll, equal months and detail return synchronize in both orientations', async ({ page }, info) => {
  test.skip(!info.project.use.javaScriptEnabled, 'Static time navigation uses month links.');
  await page.goto('/pages/memos/');
  const root = page.locator('[data-memo-timeline]');
  const slider = page.getByRole('slider', { name: 'Historical time' });
  await expect(root).toHaveAttribute('data-memo-ready', 'true');
  const horizontal = info.project.name.includes('mobile');
  await expect(slider).toHaveAttribute('aria-orientation', horizontal ? 'horizontal' : 'vertical');
  const intervals = await page.locator('[data-memo-month-tick]').evaluateAll((ticks) => ticks.map((tick) => Number((tick as HTMLElement).dataset.memoSegmentEnd) - Number((tick as HTMLElement).dataset.memoSegmentStart)));
  expect(intervals).toEqual([.25, .25, .25, .25]);
  const historyBefore = await page.evaluate(() => history.length);
  await slider.focus();
  await page.keyboard.press('PageDown');
  await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_middle');
  await expect(root).toHaveAttribute('data-memo-interaction', 'browsing');
  await expect(slider).toHaveAttribute('aria-valuetext', '2024-08-04 18:20');
  await page.waitForTimeout(150);
  await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_middle');
  await page.keyboard.press('End');
  await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_oldest');
  await expect.poll(() => page.locator('#m_fixture_oldest').evaluate((entry) => {
    const rail = document.querySelector('[data-memo-time-control]')!.getBoundingClientRect();
    const clearance = matchMedia('(max-width:48rem)').matches ? rail.bottom : 0;
    return entry.getBoundingClientRect().top >= clearance - 1;
  })).toBe(true);
  await page.keyboard.press('Home');
  await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_recent');
  const box = await slider.boundingBox();
  expect(box).not.toBeNull();
  const coordinate = (fraction: number) => ({ x: box!.x + box!.width * (horizontal ? fraction : .85), y: box!.y + box!.height * (horizontal ? .5 : fraction) });
  const start = coordinate(.02);
  const end = coordinate(.65);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 6 });
  await expect(root).toHaveAttribute('data-memo-interaction', 'dragging');
  await page.mouse.up();
  await expect(root).toHaveAttribute('data-memo-interaction', 'browsing');
  await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_old');
  await expect(slider).toHaveAttribute('aria-valuetext', '2022-03-21 19:59');
  expect(await page.evaluate(() => history.length)).toBe(historyBefore);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await expect(root).not.toHaveAttribute('data-memo-active-id', 'm_fixture_old');
  await page.locator('#m_fixture_middle').scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const card = document.querySelector('#m_fixture_middle')!;
    const offset = matchMedia('(max-width:48rem)').matches ? document.querySelector('[data-memo-time-control]')!.getBoundingClientRect().height : 0;
    scrollTo({ top: scrollY + card.getBoundingClientRect().top - offset - 20, behavior: 'instant' });
  });
  await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_middle');
  await page.locator('#m_fixture_middle .memo-date').click();
  await expect(page).toHaveURL(/\/m_fixture_middle\/$/u);
  await page.goBack();
  await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_middle');
  await page.goto('/pages/memos/#m_fixture_old');
  await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_old');
  await page.setViewportSize({ width: horizontal ? 900 : 375, height: 812 });
  await expect(slider).toHaveAttribute('aria-orientation', horizontal ? 'vertical' : 'horizontal');
  await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_old');
});

test('missing controller keeps native month/detail navigation', async ({ page }, info) => {
  test.skip(!info.project.use.javaScriptEnabled, 'Static reading covers unavailable JavaScript.');
  await page.route('**/MemoTimeline*.js', (route) => route.abort());
  await page.goto('/pages/memos/');
  await expect(page.getByRole('slider', { name: 'Historical time' })).toBeHidden();
  await page.getByText('Browse months', { exact: true }).click();
  await page.getByRole('link', { name: '2022-03', exact: true }).click();
  await expect(page).toHaveURL(/#m_fixture_old$/u);
  await expect(page.locator('#m_fixture_old')).toBeVisible();
  await page.locator('#m_fixture_old .memo-date').click();
  await expect(page).toHaveURL(/\/m_fixture_old\/$/u);
});

test('mobile touch scrubs the rail while content keeps native vertical scrolling', async ({ page }, info) => {
  test.skip(info.project.name !== 'memos-mobile-interactive', 'Touch gestures use the maintained mobile interactive project.');
  await page.goto('/pages/memos/');
  const root = page.locator('[data-memo-timeline]');
  await expect(root).toHaveAttribute('data-memo-ready', 'true');
  const box = await page.getByRole('slider', { name: 'Historical time' }).boundingBox();
  expect(box).not.toBeNull();
  const session = await page.context().newCDPSession(page);
  const touch = (x: number, y: number) => [{ x, y, id: 1 }];
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touch(box!.x + box!.width * .05, box!.y + box!.height * .5) });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touch(box!.x + box!.width * .65, box!.y + box!.height * .5) });
  await expect(root).toHaveAttribute('data-memo-interaction', 'dragging');
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_old');
  await expect(root).toHaveAttribute('data-memo-interaction', 'browsing');
  await page.goto('/pages/memos/');
  await page.getByRole('slider', { name: 'Historical time' }).focus();
  await page.keyboard.press('Home');
  await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_recent');
  const before = await page.evaluate(() => scrollY);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touch(190, 650) });
  for (let y = 600; y >= 350; y -= 50) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touch(190, y) });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 100);
  await expect(root).not.toHaveAttribute('data-memo-active-id', 'm_fixture_recent');
  await expect(root).toHaveAttribute('data-memo-interaction', 'browsing');
  await session.detach();
});

test('month disclosure is touch-sized and native month navigation stays available', async ({ page }) => {
  await page.goto('/pages/memos/');
  const initialHistory = await page.evaluate(() => history.length);
  const disclosure = page.getByText('Browse months', { exact: true });
  expect((await disclosure.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await disclosure.click();
  const month = page.getByRole('link', { name: '2022-03', exact: true });
  expect((await month.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await month.click();
  await expect(page).toHaveURL(/#m_fixture_old$/u);
  expect(await page.evaluate(() => history.length)).toBe(initialHistory + 1);
  await expect(page.locator('#m_fixture_old')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect.poll(() => page.locator('#m_fixture_old').evaluate((entry) => {
    const rail = document.querySelector('[data-memo-time-control]')!.getBoundingClientRect();
    return entry.getBoundingClientRect().top >= (matchMedia('(max-width:48rem)').matches ? rail.bottom : 0) - 1;
  })).toBe(true);
  await page.getByRole('link', { name: '2022-02', exact: true }).click();
  await expect.poll(() => page.locator('#m_fixture_oldest').evaluate((entry) => {
    const rail = document.querySelector('[data-memo-time-control]')!.getBoundingClientRect();
    return entry.getBoundingClientRect().top >= (matchMedia('(max-width:48rem)').matches ? rail.bottom : 0) - 1;
  })).toBe(true);
  expect(await page.evaluate(() => history.length)).toBe(initialHistory + 2);
});

test('minimal light feed and detail retain left history and responsive readable measures', async ({ page }, info) => {
  await page.goto('/pages/memos/');
  const feed = page.locator('[data-memo-feed]');
  const rail = page.locator('[data-memo-time-control]');
  if (info.project.name.includes('desktop')) {
    const feedBox = (await feed.boundingBox())!;
    const railBox = (await rail.boundingBox())!;
    expect(feedBox.width).toBeGreaterThanOrEqual(760);
    expect(railBox.x + railBox.width).toBeLessThan(feedBox.x);
  }
  expect(await page.locator('body').evaluate((body) => getComputedStyle(body).backgroundColor)).toBe('rgb(245, 245, 247)');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('[data-memo-header],.memo-primary-nav,.memo-intro,.memo-site-name')).toHaveCount(0);
  for (const viewport of [{ width: 900, height: 900 }, { width: 768, height: 1024 }, { width: 667, height: 375 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const feedBox = (await feed.boundingBox())!;
    const railBox = (await rail.boundingBox())!;
    if (viewport.width > 768) expect(railBox.x + railBox.width).toBeLessThan(feedBox.x);
    else expect(Math.abs(feedBox.x - railBox.x)).toBeLessThan(2);
    if (info.project.name === 'memos-desktop-interactive') await page.screenshot({ path: info.outputPath('integrated-memo-feed-' + viewport.width + '.png') });
    await page.goto('/pages/memos/m_fixture_middle/');
    await expect(page.getByRole('heading', { name: 'A longer note', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /Return to timeline/u }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    if (info.project.name === 'memos-desktop-interactive') await page.screenshot({ path: info.outputPath('integrated-memo-detail-' + viewport.width + '.png') });
    await page.goto('/pages/memos/');
  }
});

test('time feedback identifies discrete seeks without introducing header chrome', async ({ page }, info) => {
  test.skip(!info.project.use.javaScriptEnabled, 'Seek feedback progressively enhances static reading.');
  await page.goto('/pages/memos/');
  const root = page.locator('[data-memo-timeline]');
  const slider = page.getByRole('slider', { name: 'Historical time' });
  const bubble = page.locator('[data-memo-date-bubble]');
  await expect(root).toHaveAttribute('data-memo-ready', 'true');
  await slider.focus();
  await page.keyboard.press('End');
  await expect(page.locator('[data-memo-header]')).toHaveCount(0);
  await expect(bubble).toHaveText('2022-02-01 08:00');
  await expect(root).toHaveAttribute('data-memo-feedback', '');
  await expect(page.locator('#m_fixture_oldest')).toHaveAttribute('data-memo-seek', '');
  const bubbleBox = (await bubble.boundingBox())!;
  expect(bubbleBox.x).toBeGreaterThanOrEqual(0);
  expect(bubbleBox.x + bubbleBox.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(bubbleBox.y).toBeGreaterThanOrEqual(0);
  await expect(bubble).toHaveCSS('opacity', '1');
  await page.screenshot({ path: info.outputPath('integrated-memo-seek.png') });
  await expect(root).not.toHaveAttribute('data-memo-feedback', '');
  await expect(page.locator('#m_fixture_oldest')).not.toHaveAttribute('data-memo-seek', '');
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await expect(root).not.toHaveAttribute('data-memo-active-id', 'm_fixture_oldest');
  await expect(root).not.toHaveAttribute('data-memo-feedback', '');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await slider.focus();
  await page.keyboard.press('End');
  await expect(page.locator('#m_fixture_oldest')).toHaveAttribute('data-memo-active', '');
  expect(await page.locator('.memo-time-cursor span').evaluate((cursor) => getComputedStyle(cursor).transitionDuration)).toBe('0s');
});

test('short landscape at enlarged text keeps historical navigation operable', async ({ page }, info) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await page.goto('/pages/memos/');
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  const disclosure = page.getByText('Browse months', { exact: true });
  expect(await page.locator('[data-memo-time-control]').evaluate((rail) => {
    const style = getComputedStyle(rail);
    return rail.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  })).toBeGreaterThanOrEqual(44);
  if (info.project.use.javaScriptEnabled) {
    const slider = page.getByRole('slider', { name: 'Historical time' });
    await slider.scrollIntoViewIfNeeded();
    await expect(slider).toBeInViewport();
    await slider.focus();
    await page.keyboard.press('End');
    const bubble = page.locator('[data-memo-date-bubble]');
    await expect(bubble).toHaveCSS('opacity', '1');
    const bubbleBox = (await bubble.boundingBox())!;
    expect(bubbleBox.x).toBeGreaterThanOrEqual(0);
    expect(bubbleBox.x + bubbleBox.width).toBeLessThanOrEqual(667);
    expect(bubbleBox.y).toBeGreaterThanOrEqual(0);
    expect(bubbleBox.y + bubbleBox.height).toBeLessThanOrEqual(375);
  }
  await disclosure.click();
  await page.getByRole('link', { name: '2022-02', exact: true }).click();
  await expect(page).toHaveURL(/#m_fixture_oldest$/u);
  await expect.poll(() => page.locator('#m_fixture_oldest').evaluate((entry) => {
    const rail = document.querySelector('[data-memo-time-control]')!.getBoundingClientRect();
    const target = entry.getBoundingClientRect();
    return target.top >= rail.bottom - 1 && target.top <= innerHeight - 44;
  })).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath('integrated-memo-landscape-enlarged-text.png') });
});

test('reading center chooses the middle full entry, nearest gaps and sustained long content', async ({ page }, info) => {
  test.skip(!info.project.use.javaScriptEnabled, 'Static reading has no automatic active-entry feedback.');
  await page.goto('/pages/memos/');
  const root = page.locator('[data-memo-timeline]');
  await expect(root).toHaveAttribute('data-memo-ready', 'true');
  const layout = await page.evaluate(() => {
    const rail = document.querySelector('[data-memo-time-control]')!.getBoundingClientRect();
    const top = matchMedia('(max-width:48rem)').matches ? rail.bottom : 0;
    const height = (innerHeight - top) / 4;
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-memo-entry]')).slice(0, 5);
    for (const card of cards) { card.style.height = height + 'px'; card.style.overflow = 'hidden'; }
    scrollTo({ top: scrollY + cards[0]!.getBoundingClientRect().top + height / 2 - top, behavior: 'instant' });
    return { top, height };
  });
  await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_dense_01');
  const visibleFractions = await page.locator('[data-memo-entry]').evaluateAll((cards, top) => cards.slice(0, 5).map((card) => {
    const box = card.getBoundingClientRect();
    return Math.max(0, Math.min(innerHeight, box.bottom) - Math.max(top, box.top)) / box.height;
  }), layout.top);
  expect(visibleFractions[0]).toBeCloseTo(.5, 1);
  expect(visibleFractions.slice(1, 4)).toEqual([1, 1, 1]);
  expect(visibleFractions[4]).toBeCloseTo(.5, 1);
  await page.screenshot({ path: info.outputPath('integrated-memo-reading-center.png') });
  await page.evaluate((top) => {
    const third = document.querySelector<HTMLElement>('#m_fixture_dense_01')!;
    third.style.marginBottom = '80px';
    const line = (top + innerHeight) / 2;
    scrollTo({ top: scrollY + third.getBoundingClientRect().bottom + 30 - line, behavior: 'instant' });
  }, layout.top);
  await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_dense_01');
  await page.evaluate((top) => {
    const third = document.querySelector('#m_fixture_dense_01')!;
    const line = (top + innerHeight) / 2;
    scrollTo({ top: scrollY + third.getBoundingClientRect().bottom + 50 - line, behavior: 'instant' });
  }, layout.top);
  await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_dense_02');
  await page.evaluate((top) => {
    const long = document.querySelector<HTMLElement>('#m_fixture_middle')!;
    long.style.minHeight = innerHeight * 3 + 'px';
    scrollTo({ top: scrollY + long.getBoundingClientRect().top + innerHeight / 2 - top, behavior: 'instant' });
  }, layout.top);
  await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_middle');
  await page.mouse.move(info.project.name.includes('mobile') ? 200 : 800, 500);
  await page.mouse.wheel(0, 300);
  await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_middle');
  await page.mouse.wheel(0, 300);
  await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_middle');
});

test('explicit seeks survive scroll and geometry callbacks until browsing resumes', async ({ page }, info) => {
  test.skip(!info.project.use.javaScriptEnabled, 'Explicit seek ownership belongs to the progressive controller.');
  await page.goto('/pages/memos/#m_fixture_recent');
  const root = page.locator('[data-memo-timeline]');
  const slider = page.getByRole('slider', { name: 'Historical time' });
  await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_recent');
  await page.evaluate(async () => {
    for (const card of Array.from(document.querySelectorAll<HTMLElement>('[data-memo-entry]')).slice(0, 5)) {
      card.style.height = '160px';
      card.style.overflow = 'hidden';
    }
    dispatchEvent(new Event('scroll'));
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  await expect(root).not.toHaveAttribute('data-memo-feedback', '');
  await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_recent');
  const stillY = await page.evaluate(() => scrollY);
  await page.locator('#m_fixture_recent .memo-body').click();
  await page.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', ctrlKey: true })));
  expect(await page.evaluate(() => scrollY)).toBe(stillY);
  await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_recent');
  if (info.project.name === 'memos-mobile-interactive') {
    const contact = await page.context().newCDPSession(page);
    const body = (await page.locator('#m_fixture_recent .memo-body').boundingBox())!;
    await contact.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: body.x + 20, y: body.y + 10, id: 1 }] });
    await contact.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    expect(await page.evaluate(() => scrollY)).toBe(stillY);
    await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_recent');
    await contact.detach();
  }
  await slider.focus();
  await page.keyboard.press('Home');
  await page.evaluate(() => { document.querySelector<HTMLElement>('#m_fixture_dense_02')!.style.height = '180px'; });
  await expect(root).not.toHaveAttribute('data-memo-feedback', '');
  await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_recent');
  await page.mouse.move(info.project.name.includes('mobile') ? 200 : 800, 500);
  const beforeWheel = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 1);
  await expect.poll(() => page.evaluate(() => scrollY)).not.toBe(beforeWheel);
  await expect(root).not.toHaveAttribute('data-memo-active-id', 'm_fixture_recent');
  await slider.focus();
  await page.keyboard.press('Home');
  await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_recent');
  // A viewport-only scroll without wheel/touch/key events exercises scrollbar takeover.
  await expect(root).toHaveAttribute('data-memo-interaction', 'browsing');
  await page.evaluate(() => scrollBy({ top: 100, behavior: 'instant' }));
  await expect(root).not.toHaveAttribute('data-memo-active-id', 'm_fixture_recent');
  await slider.focus();
  await page.keyboard.press('Home');
  await page.locator('main').evaluate((main) => (main as HTMLElement).focus({ preventScroll: true }));
  await page.keyboard.press('ArrowDown');
  await expect(root).not.toHaveAttribute('data-memo-active-id', 'm_fixture_recent');
  await page.getByText('Browse months', { exact: true }).click();
  await page.getByRole('link', { name: '2026-06', exact: true }).click();
  await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_recent');
  await page.evaluate(async () => {
    dispatchEvent(new Event('scroll'));
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_recent');
  await expect(root).toHaveAttribute('data-memo-interaction', 'browsing');
  await page.evaluate(() => scrollBy({ top: 300, behavior: 'instant' }));
  await expect(root).not.toHaveAttribute('data-memo-active-id', 'm_fixture_recent');
  const sameHash = page.url();
  const sameHashHistory = await page.evaluate(() => history.length);
  await page.getByRole('link', { name: '2026-06', exact: true }).click();
  expect(page.url()).toBe(sameHash);
  expect(await page.evaluate(() => history.length)).toBe(sameHashHistory);
  await expect(root).not.toHaveAttribute('data-memo-feedback', '');
  await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_recent');
});

test('minimal untitled detail and Back restore the clicked entry without stale history', async ({ page }, info) => {
  await page.goto('/pages/memos/');
  const root = page.locator('[data-memo-timeline]');
  if (info.project.use.javaScriptEnabled) {
    await expect(root).toHaveAttribute('data-memo-ready', 'true');
    await page.evaluate(() => history.replaceState({ otherOwner: 'preserved' }, ''));
  }
  await page.locator('#m_fixture_recent .memo-date').click();
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('.memo-entry-title,.memo-marker,.memo-tags,.memo-updated,[data-memo-header]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Return to timeline/u })).toHaveCount(1);
  await expect(page.locator('.memo-detail-date')).toHaveText('2026-06-18 09:30');
  await page.goBack();
  await expect(page).toHaveURL(/\/pages\/memos\/$/u);
  if (info.project.use.javaScriptEnabled) {
    await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_recent');
    expect(await page.evaluate(() => history.state)).toEqual({ otherOwner: 'preserved' });
    await page.evaluate(() => history.replaceState(null, ''));
    await page.locator('#m_fixture_recent .memo-date').click();
    await expect(page).toHaveURL(/\/m_fixture_recent\/$/u);
    await page.goBack();
    await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_recent');
    expect(await page.evaluate(() => history.state)).toBeNull();
  }
});

// Keep the cache lifecycle free of tracing instrumentation; preserve failure screenshots below.
const cachedTest = test.extend({ trace: 'off' });
cachedTest('BFCache Back consumes return context and preserves the clicked short entry', async ({ browser }, info) => {
  test.skip(!info.project.use.javaScriptEnabled, 'Static Back relies on native scroll restoration.');
  // Headless shell's delegate disables BFCache; the bundled full Chromium supports it.
  const cachedBrowser = await browser.browserType().launch({ channel: 'chromium', ignoreDefaultArgs: ['--disable-back-forward-cache'] });
  try {
    const context = await cachedBrowser.newContext({ baseURL: info.project.use.baseURL, viewport: info.project.use.viewport, hasTouch: info.project.use.hasTouch });
    const page = await context.newPage();
    try {
      await page.goto('/pages/memos/#m_fixture_old');
      const root = page.locator('[data-memo-timeline]');
      await expect(root).toHaveAttribute('data-memo-ready', 'true');
      await page.evaluate(() => {
        history.replaceState({ otherOwner: 'preserved' }, '');
        document.body.dataset.memoBfcacheSentinel = 'original-document';
        addEventListener('pageshow', (event) => { document.body.dataset.memoBfcacheReturn = String(event.persisted); });
      });
      await page.locator('#m_fixture_recent .memo-date').click();
      await expect(page).toHaveURL(/\/m_fixture_recent\/$/u);
      await page.goBack();
      await expect(page).toHaveURL(/\/pages\/memos\/#m_fixture_old$/u);
      await expect(page.locator('body')).toHaveAttribute('data-memo-bfcache-sentinel', 'original-document');
      await expect(page.locator('body')).toHaveAttribute('data-memo-bfcache-return', 'true');
      await expect(root).toHaveAttribute('data-memo-active-id', 'm_fixture_recent');
      expect(await page.evaluate(() => history.state)).toEqual({ otherOwner: 'preserved' });
    } catch (error) {
      await page.screenshot({ path: info.outputPath('bfcache-failure.png') });
      throw error;
    } finally {
      await context.close();
    }
  } finally { await cachedBrowser.close(); }
});
