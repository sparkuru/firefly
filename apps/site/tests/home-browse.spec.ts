import { expect, test, type Page } from '@playwright/test';
import { expectHomeBrowseTree, expectMobileBaseTypography, expectMobileRootBrowsing } from './mobile-home-assertions';
import { syntheticDocument, withSyntheticArticles } from './home-search-fixtures';

const panel = '[data-home-browse-panel]';
const list = '[data-home-browse-list]';
const breadcrumbs = '[data-home-browse-breadcrumbs]';

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== 'chromium-mobile-interactive');
});

async function openSection(page: Page, section: string) {
  await page.locator(`[data-home-root-navigation] a[href="/${section}/"]`).click();
  await expect(page.locator('[data-home-browse-breadcrumbs]')).toHaveText(`~/blogs/${section}`);
}

test('section and post folder browsing keeps one document with no requests and local history', async ({ page }, info) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/');
  await expect(page.locator('[data-terminal-home]')).toHaveAttribute('data-home-browse-ready', 'true');
  await page.evaluate(() => { (window as Window & { browseDocument?: Document }).browseDocument = document; });
  const initialRequests = requests.length;
  const initialHistory = await page.evaluate(() => history.length);
  for (const section of ['pages', 'lab', 'posts']) {
    await openSection(page, section);
    await expectHomeBrowseTree(page, `${list} ul`);
    await expectMobileBaseTypography(page);
    await expect(page).toHaveURL(/\/$/u);
    await expect(page.locator('[data-home-friends]')).toBeHidden();
    if (section === 'pages') await expect(page.locator(`${list} a[href="/pages/about/"]`)).toBeVisible();
    if (section === 'lab') await expect(page.locator(`${list} a[href="/lab/nerv/"]`)).toHaveText('Open NERV');
    if (section === 'lab') await page.screenshot({ path: info.outputPath('mobile-inline-lab.png') });
    if (section === 'pages') await page.screenshot({ path: info.outputPath('mobile-inline-pages.png') });
    if (section === 'posts') {
      await expect(page.locator(`${list} [data-kind="file"]`)).toHaveCount(0);
      await page.locator(`${list} a[href="/posts/ai/"]`).focus();
      await page.locator(`${list} a[href="/posts/ai/"]`).press('Enter');
      await expect(page.locator('[data-home-browse-breadcrumbs]')).toHaveText('~/blogs/posts/ai');
      await expect(page.locator('[data-home-browse-breadcrumbs]')).toBeFocused();
      await expectHomeBrowseTree(page, `${list} ul`);
      await expectMobileBaseTypography(page);
      await expect(page.locator(`${breadcrumbs} a`)).toHaveText(['blogs', 'posts', 'ai']);
      expect(await page.locator(`${breadcrumbs} a`).evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual(['/', '/posts/', '/posts/ai/']);
      await expect(page.locator(`${breadcrumbs} [aria-current="page"]`)).toHaveText('ai');
      expect(await page.locator(`${breadcrumbs} a`).evaluateAll((links) => links.every((link) => getComputedStyle(link).textDecorationLine.includes('underline')))).toBe(true);
      const sameDirectoryHistory = await page.evaluate(() => history.length);
      await page.locator(`${breadcrumbs} [aria-current="page"]`).tap();
      expect(await page.evaluate(() => history.length)).toBe(sameDirectoryHistory);
      await expect(page.locator(`${list} a[href="/posts/ai/llm-workflow-with-trellis/"]`)).toBeVisible();
      await page.screenshot({ path: info.outputPath('mobile-inline-posts.png') });
      await page.goBack();
      await expect(page.locator('[data-home-browse-breadcrumbs]')).toHaveText('~/blogs/posts');
      await page.goForward();
      await expect(page.locator('[data-home-browse-breadcrumbs]')).toHaveText('~/blogs/posts/ai');
      await page.locator('[data-home-browse-breadcrumbs] a[href="/posts/"]').click();
      await expect(page.locator('[data-home-browse-breadcrumbs]')).toHaveText('~/blogs/posts');
    }
    for (const link of await page.locator(`${panel} a`).all()) {
      const box = await link.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(await link.evaluate((element) => getComputedStyle(element).borderWidth)).toBe('0px');
    }
    await page.locator('[data-home-browse-breadcrumbs] a[href="/"]').click();
    await expectMobileRootBrowsing(page);
  }
  expect(requests.length).toBe(initialRequests);
  expect(await page.evaluate(() => (window as Window & { browseDocument?: Document }).browseDocument === document)).toBe(true);
  expect(await page.evaluate(() => history.length)).toBe(initialHistory + 8);
});

test('global body/page search inside a folder and Clear restore root without stealing search focus', async ({ page }, info) => {
  await page.goto('/');
  await openSection(page, 'posts');
  await page.locator(`${list} a[href="/posts/ai/"]`).tap();
  await page.screenshot({ path: info.outputPath('mobile-inline-posts-touch.png') });
  await page.locator('#home-search-query').fill('Future presentations can change how the site looks');
  await page.locator('#home-search-query').press('Enter');
  await expect(page.locator('[data-home-search-results] a')).toHaveAttribute('href', '/pages/about/');
  await expectMobileBaseTypography(page);
  await expect(page.locator('[data-home-search-results] [data-home-browse-tree-prefix]')).toHaveCount(0);
  await expect(page.locator('[data-home-browse-breadcrumbs]')).toHaveText('~/blogs/posts/ai');
  await page.locator('[data-home-search-clear]').click();
  await expectMobileRootBrowsing(page);
  await expect(page.locator('#home-search-query')).toBeFocused();
  expect(await page.evaluate(() => history.state.fireflyHomeBrowse)).toEqual({ version: 1, href: '/' });
  expect(await page.evaluate(() => JSON.stringify(history.state))).not.toContain('Future presentations');
});

test('article Back restores the directory and invalid or stale local state resolves to root', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => history.replaceState({ component: { value: 42 } }, ''));
  await openSection(page, 'pages');
  expect(await page.evaluate(() => history.state.component)).toEqual({ value: 42 });
  await page.locator(`${list} a[href="/pages/about/"]`).click();
  await expect(page).toHaveURL(/\/pages\/about\/$/u);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/u);
  await expect(page.locator('[data-home-browse-breadcrumbs]')).toHaveText('~/blogs/pages');
  await page.reload();
  await expect(page.locator('[data-home-browse-breadcrumbs]')).toHaveText('~/blogs/pages');
  for (const href of ['/posts/stale/', 'https://example.test/', '/private/']) {
    await page.evaluate((value) => {
      history.replaceState({ component: 42, fireflyHomeBrowse: { version: 1, href: value } }, '');
      dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
    }, href);
    await expectMobileRootBrowsing(page);
    expect(await page.evaluate(() => history.state)).toEqual({ component: 42, fireflyHomeBrowse: { version: 1, href: '/' } });
  }
});

test('browse and search failures recover independently with canonical fallback', async ({ page }) => {
  await page.route('**/', async (route) => {
    if (new URL(route.request().url()).pathname !== '/') return route.continue();
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('data-home-browse-parent="/"', 'data-home-browse-parent="/missing/"') });
  });
  await page.goto('/');
  await expect(page.locator('[data-terminal-home]')).toHaveAttribute('data-home-browse-failed', 'true');
  await expectMobileRootBrowsing(page);
  await page.locator('#home-search-query').fill('Future presentations can change how the site looks');
  await page.locator('#home-search-query').press('Enter');
  await expect(page.locator('[data-home-search-results] a')).toHaveAttribute('href', '/pages/about/');
  await page.locator('[data-home-root-navigation] a[href="/posts/"]').click();
  await expect(page).toHaveURL(/\/posts\/$/u);
  await page.unroute('**/');
  await page.goto('/');
  await openSection(page, 'pages');
  await page.evaluate(() => document.querySelector<HTMLTemplateElement>('[data-terminal-template]')?.content.querySelector('.terminal-stream-prose')?.remove());
  await page.locator('#home-search-query').fill('about');
  await page.locator('#home-search-query').press('Enter');
  await expect(page.locator('[data-home-search]')).toBeHidden();
  await expect(page.locator(panel)).toBeVisible();
  await page.locator('[data-home-browse-breadcrumbs] a[href="/"]').click();
  await expectMobileRootBrowsing(page);
});

test('modified and new-tab directories retain native destinations', async ({ page, context }) => {
  await page.goto('/');
  const link = page.locator('[data-home-root-navigation] a[href="/pages/"]');
  const modifiedPage = context.waitForEvent('page');
  await link.click({ modifiers: ['Control'] });
  const modified = await modifiedPage;
  await modified.waitForLoadState();
  await expect(modified).toHaveURL(/\/pages\/$/u);
  await modified.close();
  await expectMobileRootBrowsing(page);
  await link.evaluate((element) => element.setAttribute('target', '_blank'));
  const newPage = context.waitForEvent('page');
  await link.click();
  const opened = await newPage;
  await opened.waitForLoadState();
  await expect(opened).toHaveURL(/\/pages\/$/u);
  await opened.close();
  await expectMobileRootBrowsing(page);
  await openSection(page, 'posts');
  await page.locator(`${list} a[href="/posts/infra/"]`).tap();
  await expectHomeBrowseTree(page, `${list} ul`);
  await expectMobileBaseTypography(page);
  const current = page.locator(`${breadcrumbs} [aria-current="page"]`);
  const nativePage = context.waitForEvent('page');
  await current.click({ modifiers: ['Control'] });
  const native = await nativePage;
  await native.waitForLoadState();
  await expect(native).toHaveURL(/\/posts\/infra\/$/u);
  await native.close();
  await expect(page.locator(breadcrumbs)).toHaveText('~/blogs/posts/infra');
});

test('friends leave accessibility and focus order within directories and return through history', async ({ page }, info) => {
  await page.goto('/');
  const metadataCount = await page.locator('[data-terminal-friend]').count();
  await openSection(page, 'posts');
  await page.locator(`${list} a[href="/posts/infra/"]`).tap();
  await expect(page.locator('[data-home-friends]')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'friend links', exact: true })).toHaveCount(0);
  expect(await page.locator('[data-terminal-friend]').count()).toBe(metadataCount);
  await page.screenshot({ path: info.outputPath('mobile-breadcrumb-infra-touch.png') });
  await page.locator(`${breadcrumbs} a[href="/"]`).tap();
  await expectMobileRootBrowsing(page);
  const friend = page.locator('[data-home-friends] a').first();
  await friend.focus();
  await page.goBack();
  await expect(page.locator(breadcrumbs)).toHaveText('~/blogs/posts/infra');
  await expect(page.locator(breadcrumbs)).toBeFocused();
  await expect(page.locator('[data-home-friends]')).toBeHidden();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.querySelector('[data-home-friends]')?.contains(document.activeElement))).toBe(false);
  await page.goForward();
  await expectMobileRootBrowsing(page);
});

test('long registered breadcrumb paths wrap without overflow on phone and tablet', async ({ page }, info) => {
  const name = 'very-long-public-folder-name-for-breadcrumb-wrapping-and-touch-target-validation';
  const href = `/posts/${name}/`;
  const leaf = syntheticDocument(1010, '<p>Long path fixture</p>', { title: 'Long path leaf', filename: 'leaf.md', virtualPath: `posts/${name}/leaf.md`, href: `${href}leaf/` });
  const longTitle = 'A long public document title that wraps onto another line underneath its text column';
  const row = (target: string, label: string, directory = false) => `<li class="home-browse-tree-row"><span data-home-browse-tree-prefix aria-hidden="true">└──</span><div class="home-browse-tree-content"><a href="${target}"${directory ? ' data-home-browse-directory' : ''}>${label}</a></div></li>`;
  const snapshot = `<template data-home-browse-template data-home-browse-href="${href}" data-home-browse-path="posts/${name}/" data-home-browse-parent="/posts/"><ul class="terminal-directory-list home-browse-tree">${row(`${href}leaf/`, longTitle)}</ul></template>`;
  await withSyntheticArticles(page, leaf + snapshot, (html) => html.replace(
    /(<template\b[^>]*data-home-browse-href="\/posts\/"[^>]*>)\s*<ul\b[^>]*>[\s\S]*?<\/ul>/u,
    `$1<ul class="terminal-directory-list home-browse-tree">${row(href, `${name}/`, true)}</ul>`
  ));
  await page.goto('/');
  await openSection(page, 'posts');
  await expectHomeBrowseTree(page, `${list} ul`);
  await page.locator(`${list} a[href="${href}"]`).tap();
  await expect(page.locator(breadcrumbs)).toHaveText(`~/blogs/posts/${name}`);
  await expect(page.locator('[data-home-search]')).toBeVisible();
  for (const [label, width, height] of [['phone', 375, 812], ['tablet', 820, 1180]] as const) {
    await page.setViewportSize({ width, height });
    await expectHomeBrowseTree(page, `${list} ul`);
    await expectMobileBaseTypography(page);
    const lines = await page.locator(`${list} a`).evaluate((link) => {
      const range = document.createRange();
      range.selectNodeContents(link);
      return Array.from(range.getClientRects(), (rect) => ({ x: rect.x, y: rect.y }));
    });
    expect(new Set(lines.map((line) => line.y)).size).toBeGreaterThan(1);
    expect(new Set(lines.map((line) => Math.round(line.x))).size).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const link of await page.locator(`${breadcrumbs} a`).all()) {
      const box = (await link.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    await page.screenshot({ path: info.outputPath(`mobile-breadcrumb-long-${label}.png`) });
  }
});

test('media transitions preserve local directory history and release only withdrawn browse focus', async ({ page }) => {
  await page.goto('/');
  await openSection(page, 'posts');
  const client = await page.context().newCDPSession(page);
  const historyLength = await page.evaluate(() => history.length);
  for (let index = 0; index < 3; index += 1) {
    await page.locator('[data-home-browse-breadcrumbs]').focus();
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await expect(page.locator(panel)).toBeHidden();
    await expect(page.locator('[data-home-browse-breadcrumbs]')).not.toBeFocused();
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await expect(page.locator('[data-home-browse-breadcrumbs]')).toHaveText('~/blogs/posts');
    await expect(page.locator(panel)).toBeVisible();
    await expect(page.locator('[data-home-search]')).toBeVisible();
    await expect(page.locator('[data-home-friends]')).toBeHidden();
    await expect(page.locator('[data-terminal-session]')).toBeHidden();
  }
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
});

test('root files and two nested levels remain immediate children and searchable', async ({ page }) => {
  const root = syntheticDocument(1001, '<p>root-file-body-needle</p>', { title: 'Root fixture', filename: 'root-fixture.md', virtualPath: 'posts/root-fixture.md', href: '/posts/root-fixture/' });
  const leaf = syntheticDocument(1002, '<p>nested-leaf-body-needle</p>', { title: 'Leaf fixture', filename: 'leaf-fixture.md', virtualPath: 'posts/fixture/deeper/leaf-fixture.md', href: '/posts/fixture/deeper/leaf-fixture/' });
  const snapshots = `<template data-home-browse-template data-home-browse-href="/posts/fixture/" data-home-browse-path="posts/fixture/" data-home-browse-parent="/posts/"><ul class="terminal-directory-list"><li data-kind="directory"><a href="/posts/fixture/deeper/" data-home-browse-directory>deeper/</a></li></ul></template>
    <template data-home-browse-template data-home-browse-href="/posts/fixture/deeper/" data-home-browse-path="posts/fixture/deeper/" data-home-browse-parent="/posts/fixture/"><ul class="terminal-directory-list"><li data-kind="file"><a href="/posts/fixture/deeper/leaf-fixture/">Leaf fixture</a></li></ul></template>`;
  await withSyntheticArticles(page, root + leaf + snapshots, (html) => html.replace(
    /(<template\b[^>]*data-home-browse-href="\/posts\/"[^>]*>[\s\S]*?)(<\/ul>)/u,
    '$1<li data-kind="directory"><a href="/posts/fixture/" data-home-browse-directory>fixture/</a></li><li data-kind="file"><a href="/posts/root-fixture/">Root fixture</a></li>$2'
  ));
  await page.goto('/');
  await openSection(page, 'posts');
  await expect(page.locator(`${list} [data-kind="file"] a`)).toHaveText('Root fixture');
  await expect(page.locator(`${list} a[href="/posts/fixture/deeper/leaf-fixture/"]`)).toHaveCount(0);
  await page.locator(`${list} a[href="/posts/fixture/"]`).click();
  await expect(page.locator(`${list} a`)).toHaveText(['deeper/']);
  await page.locator(`${list} a`).click();
  await expect(page.locator('[data-home-browse-breadcrumbs]')).toHaveText('~/blogs/posts/fixture/deeper');
  await expect(page.locator(`${list} a`)).toHaveText(['Leaf fixture']);
  for (const [needle, href] of [['root-file-body-needle', '/posts/root-fixture/'], ['nested-leaf-body-needle', '/posts/fixture/deeper/leaf-fixture/']]) {
    await page.locator('#home-search-query').fill(needle);
    await page.locator('#home-search-query').press('Enter');
    await expect(page.locator('[data-home-search-results] a')).toHaveAttribute('href', href);
  }
  await page.locator('[data-home-browse-breadcrumbs] a[href="/posts/fixture/"]').click();
  await expect(page.locator('[data-home-browse-breadcrumbs]')).toHaveText('~/blogs/posts/fixture');
  await page.locator('[data-home-search-clear]').click();
  await expectMobileRootBrowsing(page);
});

test('inline experiment and friend activation remains native and Back restores browse state', async ({ page }) => {
  await page.goto('/');
  await openSection(page, 'lab');
  await page.route('**/lab/nerv/', (route) => route.fulfill({ contentType: 'text/html', body: '<h1>Experiment destination</h1>' }));
  await page.locator(`${list} a[href="/lab/nerv/"]`).click();
  await expect(page).toHaveURL(/\/lab\/nerv\/$/u);
  await page.goBack();
  await expect(page.locator('[data-home-browse-breadcrumbs]')).toHaveText('~/blogs/lab');
  await page.locator('[data-home-browse-breadcrumbs] a[href="/"]').click();
  await expectMobileRootBrowsing(page);
  const friend = page.locator('[data-home-friends] a').first();
  if (await friend.count() > 0) {
    const href = (await friend.getAttribute('href'))!;
    await page.route(href, (route) => route.fulfill({ contentType: 'text/html', body: '<h1>Friend destination</h1>' }));
    await friend.click();
    await expect(page).toHaveURL(href);
    await page.goBack();
    await expectMobileRootBrowsing(page);
  }
});

test('unavailable local history preserves native activation instead of swallowing directory clicks', async ({ page }) => {
  await page.addInitScript(() => {
    history.pushState = () => { throw new Error('Fixture: local history unavailable'); };
  });
  await page.goto('/');
  await expect(page.locator('[data-terminal-home]')).toHaveAttribute('data-home-browse-ready', 'true');
  await page.locator('[data-home-root-navigation] a[href="/pages/"]').click();
  await expect(page).toHaveURL(/\/pages\/$/u);
  await expect(page.getByRole('heading', { name: 'pages/', exact: true })).toBeVisible();
});
