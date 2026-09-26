import { expect, test, type Page } from '@playwright/test';
import { expectMobileRootBrowsing } from './mobile-home-assertions';

const root = '[data-terminal-home]';
const mobileQuery = '(hover: none) and (pointer: coarse)';

async function expectNativeHome(page: Page) {
  await expect(page.locator('[data-terminal-startup]')).toBeHidden();
  await expect(page.locator('[data-terminal-session]')).toBeHidden();
  await expect(page.locator('[data-terminal-fallback]')).toBeVisible();
  expect(await page.locator('[data-terminal-entry] a').count()).toBe(16);
  expect(await page.locator('[data-terminal-entry-kind="post"] a').count()).toBe(12);
  await expectMobileRootBrowsing(page);
  for (const framing of await page.locator('[data-home-shell-only]').all()) await expect(framing).toBeHidden();
  await expect(page.locator('#terminal-command')).not.toBeFocused();
}

async function nativeKeys(page: Page) {
  const events = await page.evaluate(() => {
    const keys = [new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true }),
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      new KeyboardEvent('keydown', { key: 'l', ctrlKey: true, bubbles: true, cancelable: true })];
    document.body.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    document.body.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    return keys.map((event) => { document.body.dispatchEvent(event); return event.defaultPrevented; });
  });
  expect(events).toEqual([false, false, false]);
  await expect(page.locator('#terminal-command')).not.toBeFocused();
}

test('mobile first paint and later search retain native browsing without Terminal initialization', async ({ page }, info) => {
  test.skip(!info.project.name.startsWith('chromium-mobile'));
  await page.goto('/');
  expect(await page.evaluate((query) => matchMedia(query).matches, mobileQuery)).toBe(true);
  await expectNativeHome(page);
  const headingStyles = await page.locator('#terminal-recovery-heading, #terminal-friends-heading').evaluateAll((headings) => headings.map((heading) => {
    const style = getComputedStyle(heading);
    return { color: style.color, fontSize: style.fontSize, fontWeight: style.fontWeight };
  }));
  expect(headingStyles[0]).toEqual(headingStyles[1]);
  expect(headingStyles[0].fontWeight).toBe('500');
  for (const link of await page.locator('[data-home-root-navigation] a').all()) {
    expect(await link.evaluate((element) => getComputedStyle(element).borderWidth)).toBe('0px');
  }
  await expect(page.locator(root)).not.toHaveAttribute('data-terminal-startup-state', /.+/);
  await expect(page.locator(root)).not.toHaveAttribute('data-terminal-controller-initialized', 'true');
  await expect(page.locator('#home-search-query')).not.toBeFocused();
  if (info.project.name.endsWith('interactive')) {
    await nativeKeys(page);
    await expect(page.locator('[data-home-search]')).toBeVisible();
  } else {
    await expect(page.locator('[data-home-search]')).toBeHidden();
  }
  await page.waitForTimeout(1800);
  await expectNativeHome(page);
  await expect(page.locator('.terminal-boot-record')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('mobile-native-portrait.png') });
  for (const size of [{ width: 812, height: 375 }, { width: 820, height: 1180 }]) {
    await page.setViewportSize(size);
    await expectNativeHome(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const link of await page.locator('[data-home-root-navigation] a, [data-home-friends] a').all()) {
      const box = await link.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({ path: info.outputPath(`mobile-native-${size.width}.png`) });
  }
  await page.locator('[data-home-root-navigation] a[href="/pages/"]').click();
  if (info.project.name.endsWith('interactive')) {
    await expect(page).toHaveURL(/\/$/u);
    await expect(page.locator('[data-home-browse-breadcrumbs]')).toHaveText('~/blogs/pages');
    await page.locator('[data-home-browse-list] a[href="/pages/about/"]').click();
  } else {
    await expect(page).toHaveURL(/\/pages\/$/u);
    await page.getByRole('link', { name: '~/blog/pages/about.md', exact: true }).click();
  }
  await expect(page).toHaveURL(/\/pages\/about\/$/u);
});

test('mobile section entries browse native indexes and retain browser history', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-mobile-static');
  await page.goto('/');
  const friend = page.locator('[data-home-friends] a').first();
  if (await friend.count() > 0) {
    const href = (await friend.getAttribute('href'))!;
    await page.route(href, (route) => route.fulfill({ contentType: 'text/html', body: '<h1>Friend destination fixture</h1>' }));
    await friend.click();
    await expect(page).toHaveURL(href);
    await expect(page.getByRole('heading', { name: 'Friend destination fixture' })).toBeVisible();
    await page.goBack();
    await expectMobileRootBrowsing(page);
    await page.unroute(href);
  }
  await page.locator('[data-home-root-navigation] a[href="/posts/"]').click();
  await expect(page.getByRole('heading', { name: 'posts/', exact: true })).toBeVisible();
  await expect(page.locator('.terminal-directory-list [data-kind="file"]')).toHaveCount(0);
  await page.getByRole('link', { name: 'ai/', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'posts/ai/', exact: true })).toBeVisible();
  await page.locator('.terminal-directory-list a[href="/posts/ai/llm-workflow-with-trellis/"]').click();
  await expect(page.getByRole('heading', { name: 'llm-workflow-with-trellis', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/posts\/ai\/$/u);
  await page.getByRole('navigation', { name: 'Directory navigation' }).getByRole('link', { name: '..', exact: true }).click();
  await expect(page).toHaveURL(/\/posts\/$/u);
  await page.getByRole('navigation', { name: 'Directory navigation' }).getByRole('link', { name: '~/blog', exact: true }).click();
  await expectMobileRootBrowsing(page);
  await page.locator('[data-home-root-navigation] a[href="/lab/"]').click();
  await expect(page.getByRole('heading', { name: 'Experiments', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open NERV', exact: true })).toHaveAttribute('href', '/lab/nerv/');
});

test('mobile delayed and missing modules never flash shell or install early guards', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-mobile-interactive');
  for (const blocked of [false, true]) {
    let release = () => {};
    const delay = new Promise<void>((resolve) => { release = resolve; });
    await page.route('**/_astro/*.js', async (route) => {
      if (blocked) return route.abort();
      await delay;
      await route.continue();
    });
    await page.goto('/', { waitUntil: 'commit' });
    await expectNativeHome(page);
    await nativeKeys(page);
    await expect(page.locator('[data-home-search]')).toBeHidden();
    release();
    if (!blocked) await expect(page.locator('[data-home-search]')).toBeVisible();
    await expectNativeHome(page);
    await expect(page.locator(root)).not.toHaveAttribute('data-terminal-controller-initialized', 'true');
    await page.unroute('**/_astro/*.js');
  }
});

test('connecting desktop suspends boot on touch and resumes one session', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-desktop-interactive');
  await page.goto('/');
  await expect(page.locator(root)).toHaveAttribute('data-terminal-startup-state', 'connecting');
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await expectNativeHome(page);
  await nativeKeys(page);
  await page.waitForTimeout(1800);
  await expect(page.locator('.terminal-boot-record')).toHaveCount(0);
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await expect(page.locator(root)).toHaveAttribute('data-terminal-startup-state', 'ready');
  await expect(page.locator('.terminal-boot-record')).toHaveCount(1);
  await expect(page.locator('[data-terminal-form]')).toBeVisible();
});

test('unavailable desktop modules recover after a touch detour during loading', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-desktop-interactive');
  let release = () => {};
  const delay = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/_astro/*.js', async (route) => {
    await delay;
    await route.abort();
  });
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.locator(root)).toHaveAttribute('data-terminal-startup-state', 'connecting');
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await expectNativeHome(page);
  release();
  await page.waitForLoadState('load');
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await expect(page.locator(root)).toHaveAttribute('data-terminal-startup-state', 'failed');
  await expect(page.locator('[data-terminal-fallback]')).toBeVisible();
  await expect(page.locator('[data-terminal-startup]')).toBeHidden();
  await expect(page.locator('[data-terminal-session]')).toBeHidden();
});

test('delayed desktop modules retain early guards after a touch detour', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-desktop-interactive');
  let release = () => {};
  const delay = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/_astro/*.js', async (route) => {
    await delay;
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.locator(root)).toHaveAttribute('data-terminal-startup-state', 'connecting');
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await nativeKeys(page);
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  expect(await page.evaluate(() => {
    const event = new KeyboardEvent('keydown', { key: 'l', ctrlKey: true, bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    return event.defaultPrevented;
  })).toBe(true);
  release();
  await expect(page.locator(root)).toHaveAttribute('data-terminal-startup-state', 'ready');
  await expect(page.locator('[data-terminal-transcript]')).toBeEmpty();
});

test('repeated ready transitions release focus and preserve exactly one command effect/history', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-mobile-interactive');
  await page.goto('/');
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await expect(page.locator(root)).toHaveAttribute('data-terminal-startup-state', 'ready');
  const command = page.locator('#terminal-command');
  await command.fill('help');
  await command.press('Enter');
  for (let index = 0; index < 3; index += 1) {
    await command.focus();
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await expectNativeHome(page);
    await nativeKeys(page);
    await page.locator('#home-search-query').fill('about');
    await page.locator('#home-search-query').press('Enter');
    await expect(page.locator('[data-home-search-results] li')).not.toHaveCount(0);
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await expect(command).toBeVisible();
    await expect(page.locator('#home-search-query')).not.toBeFocused();
  }
  const before = await page.locator('.terminal-record').count();
  await command.fill('pwd');
  await command.press('Enter');
  await expect(page.locator('.terminal-record')).toHaveCount(before + 1);
  await expect(page.locator('.terminal-boot-record')).toHaveCount(1);
  await command.press('ArrowUp');
  await expect(command).toHaveValue('pwd');
});

test('narrow fine-pointer desktop still has one usable shell', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-desktop-interactive');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.locator(root)).toHaveAttribute('data-terminal-startup-state', 'ready');
  await expect(page.locator('[data-home-search]')).toBeHidden();
  await page.locator('#terminal-command').fill('clear');
  await page.locator('#terminal-command').press('Enter');
  await expect(page.locator('[data-terminal-transcript]')).toBeEmpty();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
