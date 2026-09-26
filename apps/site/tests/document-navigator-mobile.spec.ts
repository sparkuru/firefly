import { test, expect } from '@playwright/test';

const semanticPath = '/pages/inline-reading-semantic/';
const terminalPath = '/pages/about/';
const navigatorFragment = '#document-navigator';

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile-interactive', 'This suite verifies touch-primary mobile policy.');
});

test('touch-primary documents stay in ordinary reading in portrait, landscape, and tablet sizes', async ({ page }) => {
  for (const viewport of [
    { width: 375, height: 812 },
    { width: 812, height: 375 },
    { width: 820, height: 1180 }
  ]) {
    await page.setViewportSize(viewport);
    for (const path of [semanticPath, terminalPath]) {
      await page.goto(`${path}${navigatorFragment}`);
      expect(await page.evaluate(() => matchMedia('(hover: none) and (pointer: coarse)').matches)).toBe(true);
      const article = page.locator('article[data-document-navigator]');
      await expect(article).toHaveAttribute('data-document-navigator-supports-mobile', 'false');
      await expect(article.locator('[data-article-content]')).toBeVisible();
      await expect(article.locator('[data-document-navigator-status]')).toBeHidden();
      await expect(article.locator('[data-document-navigator-entry-control]')).toBeHidden();
      await expect(article.locator('[data-navigation-unit]')).toHaveCount(0);
      await expect(article.locator('[data-document-navigator-region]')).toHaveAttribute('tabindex', '-1');
      await expect(article.locator('[data-document-navigator-region]')).not.toHaveAttribute('aria-activedescendant', /.+/u);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page).toHaveURL(new RegExp(`${path}${navigatorFragment}$`, 'u'));
    }
  }
  await page.goto(terminalPath);
  await expect(page.locator('[data-document-navigator-region]')).not.toBeFocused();
  await expect(page.locator('[data-document-navigator-status]')).toBeHidden();
});

test('native heading links still work with a direct navigator fragment', async ({ page }) => {
  await page.goto(`${semanticPath}${navigatorFragment}`);
  await page.getByRole('link', { name: 'Reading checkpoint' }).click();
  await expect(page).toHaveURL(/\/pages\/inline-reading-semantic\/#reading-checkpoint$/u);
  await expect(page.locator('#reading-checkpoint')).toBeVisible();
  await expect(page.locator('[data-document-navigator-status]')).toBeHidden();
});

test('homepage section and native article links use ordinary destinations', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-home-root-navigation] a[href="/pages/"]').click();
  await expect(page).toHaveURL(/\/$/u);
  const link = page.locator('[data-home-browse-list]').getByRole('link', { name: '~/blog/pages/about.md', exact: true });
  await expect(link).toHaveAttribute('href', terminalPath);
  await link.click();
  await expect(page).toHaveURL(/\/pages\/about\/$/u);
  await expect(page.locator('[data-document-navigator-status]')).toBeHidden();
});

test('desktop inline document links track changes to touch while shell is suspended', async ({ page }) => {
  const client = await page.context().newCDPSession(page);
  await page.goto('/');
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  const command = page.locator('#terminal-command');
  await command.fill('cat ~/blog/pages/markdown-template.md');
  await command.press('Enter');
  const inline = page.locator('[data-terminal-open]').last();
  const plainHref = '/pages/markdown-template/';
  await expect(inline).toHaveAttribute('href', `${plainHref}${navigatorFragment}`);
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await expect(inline).toHaveAttribute('href', plainHref);
  await expect(page.locator('[data-terminal-session]')).toBeHidden();
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await expect(inline).toHaveAttribute('href', `${plainHref}${navigatorFragment}`);
  await expect(page.locator('[data-terminal-session]')).toBeVisible();
});

test('an explicitly opted-in profile retains semantic navigation on touch devices', async ({ page }) => {
  await page.route(`**${semanticPath}`, async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    expect(html).toContain('data-document-navigator-supports-mobile="false"');
    await route.fulfill({ response, body: html.replace('data-document-navigator-supports-mobile="false"', 'data-document-navigator-supports-mobile="true"') });
  });
  await page.goto(semanticPath);
  const article = page.locator('.semantic-document');
  await expect(article).toHaveAttribute('data-document-navigator-supports-mobile', 'true');
  await article.locator('[data-document-navigator-entry-control]').click();
  await expect(page).toHaveURL(/#document-navigator$/u);
  const region = article.locator('[data-document-navigator-region]');
  await expect(region).toBeFocused();
  await expect(article.locator('[data-document-navigator-status]')).toBeVisible();
  await region.press('j');
  await expect(article.locator('[data-navigation-position]')).not.toHaveText(/^1\//u);
});

test('changing primary input suspends and resumes navigator state without duplicate startup', async ({ page }) => {
  await page.goto(`${terminalPath}${navigatorFragment}`);
  const status = page.locator('[data-document-navigator-status]');
  const region = page.locator('[data-document-navigator-region]');
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await expect.poll(() => page.evaluate(() => matchMedia('(hover: none) and (pointer: coarse)').matches)).toBe(false);
  await expect(status).toBeVisible();
  await expect(region.locator('[data-navigation-unit]')).not.toHaveCount(0);
  await region.focus();
  await region.press('j');
  await expect(page.locator('[data-navigation-position]')).not.toHaveText(/^1\//u);

  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await expect.poll(() => page.evaluate(() => matchMedia('(hover: none) and (pointer: coarse)').matches)).toBe(true);
  await expect(status).toBeHidden();
  await expect(region).toHaveAttribute('tabindex', '-1');
  await expect(region).not.toBeFocused();
  await expect(region).not.toHaveAttribute('aria-activedescendant', /.+/u);
  await expect(page.locator('[data-navigation-active]')).toHaveCount(0);

  await client.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await expect(status).toBeVisible();
  await expect(region.locator('[data-navigation-unit]')).not.toHaveCount(0);
  const positionBefore = await page.locator('[data-navigation-position]').textContent();
  await region.focus();
  await region.press('j');
  const positionAfter = await page.locator('[data-navigation-position]').textContent();
  expect(Number(positionAfter?.split('/')[0])).toBe(Number(positionBefore?.split('/')[0]) + 1);
});

test('mobile CSS hides navigator controls when JavaScript is disabled', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    hasTouch: true,
    viewport: { width: 375, height: 812 }
  });
  try {
    const page = await context.newPage();
    for (const path of [semanticPath, terminalPath]) {
      await page.goto(`http://127.0.0.1:4321${path}${navigatorFragment}`);
      expect(await page.evaluate(() => matchMedia('(hover: none) and (pointer: coarse)').matches)).toBe(true);
      await expect(page.locator('[data-article-content]')).toBeVisible();
      await expect(page.locator('[data-document-navigator-status]')).toBeHidden();
      await expect(page.locator('[data-document-navigator-entry-control]')).toBeHidden();
    }
  } finally {
    await context.close();
  }
});
