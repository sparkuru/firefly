import { expect, test, type Page } from '@playwright/test';

const search = '[data-home-search]';
const input = '#home-search-query';
const results = '[data-home-search-results]';
const status = '[data-home-search-status]';

async function query(page: Page, value: string) {
  await page.locator(input).fill(value);
  await page.locator(input).press('Enter');
}

function escapeAttribute(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function syntheticDocument(index: number, body: string, fields: Record<string, unknown> = {}) {
  const metadata = {
    title: '同名文章', filename: `fixture-${index}.md`, virtualPath: `posts/fixture-${index}.md`,
    href: `/posts/fixture-${index}/`, date: '2026-09-26', description: 'Fixture description', tags: [], ...fields
  };
  const path = escapeAttribute(String(metadata.virtualPath));
  const href = escapeAttribute(String(metadata.href));
  const kind = String(metadata.virtualPath).startsWith('pages/') ? 'page' : 'post';
  const relative = path.slice(path.indexOf('/') + 1);
  const titleId = `fixture-${index}-title`;
  return `<li hidden data-terminal-entry data-terminal-entry-kind="${kind}" data-terminal-entry-virtual-path="${path}" data-terminal-entry-relative-path="${relative}" data-terminal-entry-filename="${metadata.filename}" data-terminal-entry-title="${escapeAttribute(String(metadata.title))}" data-terminal-entry-href="${href}" data-terminal-entry-date="${metadata.date}"><a href="${href}">${escapeAttribute(String(metadata.title))}</a></li>
    <template data-terminal-template data-terminal-template-path="${path}" data-home-search-metadata="${escapeAttribute(JSON.stringify(metadata))}"><article data-terminal-stream-document aria-labelledby="${titleId}"><h2 id="${titleId}" data-terminal-stream-title>${escapeAttribute(String(metadata.title))}</h2><button type="button" data-terminal-return>Command</button><button type="button" data-terminal-collapse aria-controls="fixture-${index}-body" aria-expanded="true">Collapse</button><a href="${href}" data-terminal-open>Open document</a><div id="fixture-${index}-body" class="terminal-stream-prose">${body}</div></article></template>`;
}

async function withSyntheticArticles(page: Page, html: string) {
  await page.route('**/', async (route) => {
    if (new URL(route.request().url()).pathname !== '/') return route.continue();
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('<section class="terminal-startup"', `${html}<section class="terminal-startup"`) });
  });
}

test('static homepage retains complete ordinary article links and hides search controls', async ({ page }, info) => {
  test.skip(!info.project.name.endsWith('-static'));
  await page.goto('/');
  await expect(page.locator(search)).toBeHidden();
  const entries = page.locator('[data-terminal-entry]');
  expect(await entries.count()).toBeGreaterThan(10);
  for (const entry of await entries.all()) await expect(entry.locator('a')).toBeVisible();
  await page.locator('[data-terminal-entry-href="/pages/about/"] a').click();
  await expect(page).toHaveURL(/\/pages\/about\/$/u);
});

test('desktop retains Terminal ownership and has no visible mobile search', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-desktop-interactive');
  await page.goto('/');
  await expect(page.locator('[data-terminal-home]')).toHaveAttribute('data-terminal-startup-state', 'ready');
  await expect(page.locator(search)).toBeHidden();
  await page.locator('#terminal-command').fill('help');
  await page.locator('#terminal-command').press('Enter');
  await expect(page.locator('[data-terminal-transcript]')).toContainText('grep');
});

test.describe('touch homepage search', () => {
  test.beforeEach(async ({}, info) => {
    test.skip(info.project.name !== 'chromium-mobile-interactive');
  });

  test('finds public body/pages without initializing Terminal', async ({ page }, info) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await page.goto('/');
    await expect(page.locator(search)).toBeVisible();
    await expect(page.locator(input)).not.toBeFocused();
    await expect(page.locator('[data-terminal-home]')).not.toHaveAttribute('data-terminal-controller-initialized', 'true');
    expect(await page.locator(input).evaluate((element) => {
      const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      element.dispatchEvent(escape);
      return escape.defaultPrevented;
    })).toBe(false);
    await query(page, 'Future presentations can change how the site looks');
    await expect(page.locator(status)).toHaveText('找到 1 篇文章');
    await expect(page.locator('[data-terminal-home]')).not.toHaveAttribute('data-terminal-controller-initialized', 'true');
    const transcript = await page.locator('[data-terminal-transcript]').textContent();
    const requestCount = requests.length;
    await query(page, 'Future presentations can change how the site looks');
    await expect(page.locator(status)).toHaveText('找到 1 篇文章');
    await expect(page.locator(`${results} li`)).toHaveCount(1);
    await expect(page.locator(results)).toContainText('Future presentations');
    await expect(page.locator(`${results} a`)).toHaveAttribute('href', '/pages/about/');
    await expect(page.locator(input)).toBeFocused();
    await page.locator(input).press('Control+l');
    await expect(page.locator('[data-terminal-transcript]')).toHaveText(transcript ?? '');
    await expect(page.locator('#terminal-command')).toHaveValue('');
    expect(requests.length).toBe(requestCount);
    await page.screenshot({ path: info.outputPath('mobile-search-portrait.png') });
    await page.setViewportSize({ width: 812, height: 375 });
    await expect(page.locator(search)).toBeVisible();
    await page.screenshot({ path: info.outputPath('mobile-search-landscape.png') });
    await page.locator(`${results} a`).click();
    await expect(page).toHaveURL(/\/pages\/about\/$/u);
    expect(new URL(page.url()).hash).toBe('');
  });

  test('search projection contains only public posts/pages and no private/draft or other groups', async ({ page }) => {
    await page.goto('/');
    const projection = await page.locator('[data-terminal-template]').evaluateAll((templates) => templates.map((template) =>
      JSON.parse(template.getAttribute('data-home-search-metadata') ?? '{}')));
    const publicPaths = await page.locator('[data-terminal-entry]').evaluateAll((entries) => entries.map((entry) => entry.getAttribute('data-terminal-entry-virtual-path')));
    expect(projection.map((entry) => entry.virtualPath).sort()).toEqual(publicPaths.sort());
    expect(projection.every((entry) => /^(posts|pages)\//u.test(entry.virtualPath))).toBe(true);
    for (const needle of ['PRIVATE_TITLE_FIREFLY_7f2a', 'PRIVATE_BODY_FIREFLY_7f2a', 'OWNER_BODY_FIREFLY', 'Hidden draft']) {
      await query(page, needle);
      await expect(page.locator(status)).toHaveText('没有找到匹配的文章。');
    }
    expect(JSON.stringify(projection)).not.toMatch(/hidden-draft|private-owner|lab\/|friend/u);
  });

  test('clear, blank, no-results, native submit, debounce and Chinese composition are predictable', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(search)).toBeVisible();
    await query(page, 'about');
    await expect(page.locator(`${results} li`)).not.toHaveCount(0);
    const previous = await page.locator(status).textContent();
    await page.locator(input).dispatchEvent('compositionstart');
    await page.locator(input).fill('没有这篇文章🪲');
    await page.locator(input).dispatchEvent('input');
    await page.waitForTimeout(220);
    await expect(page.locator(status)).toHaveText(previous ?? '');
    await page.locator(search).locator('form').dispatchEvent('submit');
    await expect(page.locator(status)).toHaveText(previous ?? '');
    await page.locator(input).dispatchEvent('compositionend');
    await expect(page.locator(status)).toHaveText('没有找到匹配的文章。');
    await page.locator('[data-home-search-clear]').click();
    await expect(page.locator(input)).toHaveValue('');
    await expect(page.locator(status)).toBeEmpty();
    await expect(page.locator(results)).toBeHidden();
    await page.locator(input).fill('   ');
    await expect(page.locator(status)).toBeEmpty();
    await page.locator(input).fill('Trellis');
    await expect(page.locator(`${results} li`)).not.toHaveCount(0);
    await expect(page.locator(input)).toBeFocused();
  });

  test('safe block extraction includes code/table/inline text and avoids controls or invented phrases', async ({ page }) => {
    await withSyntheticArticles(page, syntheticDocument(1, `<p>萤<strong>火</strong>虫是连续文本</p><p>first-block</p><p>second-block</p><pre><code>literal [a.*]();</code></pre><table><tr><td>cell-needle</td><td>other-cell</td></tr></table><p hidden>hidden-needle</p><button>control-needle</button><figure class="document-diagram">diagram-needle</figure><p>&lt;img src=x onerror=alert(1)&gt; safe-text</p>`));
    await page.goto('/');
    for (const text of ['萤火虫', '[a.*]();', 'cell-needle', '<img src=x onerror=alert(1)>']) {
      await query(page, text);
      await expect(page.locator(status)).toHaveText('找到 1 篇文章');
    }
    await expect(page.locator(`${results} img`)).toHaveCount(0);
    await expect(page.locator(results)).toContainText('<img src=x onerror=alert(1)>');
    for (const text of ['first-block second-block', 'hidden-needle', 'control-needle', 'diagram-needle', 'cell-needle other-cell']) {
      await query(page, text);
      await expect(page.locator(status)).toHaveText('没有找到匹配的文章。');
    }
  });

  test('metadata-first results are unique, ordered and disambiguated across posts and pages', async ({ page }) => {
    await withSyntheticArticles(page,
      syntheticDocument(1, '<p>unique-order-needle</p>') +
      syntheticDocument(2, '<p>unique-order-needle</p>', { tags: ['unique-order-needle'] }) +
      syntheticDocument(3, '<p>unrelated</p>', { virtualPath: 'pages/fixture-3.md', href: '/pages/fixture-3/', description: 'unique-order-needle' }));
    await page.goto('/');
    await query(page, 'unique-order-needle');
    await expect(page.locator(status)).toHaveText('找到 3 篇文章');
    expect(await page.locator(`${results} a`).evaluateAll((links) => links.map((link) => link.getAttribute('href'))))
      .toEqual(['/posts/fixture-2/', '/pages/fixture-3/', '/posts/fixture-1/']);
    await expect(page.locator(results)).toContainText('~/blog/pages/fixture-3.md');
    await expect(page.locator(results)).toContainText('~/blog/posts/fixture-1.md');
  });

  test('mobile layouts preserve targets, focus and wrapping on phone and tablet', async ({ page }) => {
    await withSyntheticArticles(page, syntheticDocument(1, '<p>layout-needle</p>', {
      title: '很长的标题'.repeat(30), filename: '长文件名'.repeat(20) + '.md',
      virtualPath: 'posts/' + '长文件名'.repeat(20) + '.md', href: '/posts/' + '长文件名'.repeat(20) + '/'
    }));
    await page.goto('/');
    await query(page, 'layout-needle');
    for (const viewport of [{ width: 375, height: 812 }, { width: 812, height: 375 }, { width: 1024, height: 768 }]) {
      await page.setViewportSize(viewport);
      await expect(page.locator(search)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      for (const control of await page.locator(`${search} input, ${search} button, ${results} a`).all()) {
        const box = await control.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(44);
        expect(box?.width).toBeGreaterThanOrEqual(44);
      }
      await page.locator(input).focus();
      expect(await page.locator(input).evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');
    }
  });

  test('clearing search retains complete native browsing on phone and tablet', async ({ page }) => {
    await page.goto('/');
    for (const viewport of [{ width: 375, height: 812 }, { width: 812, height: 375 }, { width: 1024, height: 768 }]) {
      await page.setViewportSize(viewport);
      await query(page, 'about');
      await expect(page.locator(`${results} li`)).not.toHaveCount(0);
      await page.locator('[data-home-search-clear]').click();
      await expect(page.locator(input)).toBeFocused();
      await expect(page.locator('[data-terminal-fallback]')).toBeVisible();
      await expect(page.locator('[data-terminal-session]')).toBeHidden();
      for (const link of await page.locator('[data-terminal-entry] a').all()) await expect(link).toBeVisible();
    }
  });

  test('search is independent of Terminal failure and contains its own lazy body failure', async ({ page }) => {
    await page.route('**/', async (route) => {
      if (new URL(route.request().url()).pathname !== '/') return route.continue();
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace(/data-terminal-boot-duration="\d+"/u, 'data-terminal-boot-duration="invalid"') });
    });
    await page.goto('/');
    await expect(page.locator('[data-terminal-home]')).not.toHaveAttribute('data-terminal-controller-initialized', 'true');
    await query(page, 'Future presentations can change how the site looks');
    await expect(page.locator(status)).toHaveText('找到 1 篇文章');
    await page.unroute('**/');
    await page.goto('/');
    await expect(page.locator('[data-terminal-home]')).not.toHaveAttribute('data-terminal-controller-initialized', 'true');
    await page.evaluate(() => {
      const template = document.querySelector<HTMLTemplateElement>('[data-terminal-template]');
      template?.content.querySelector('.terminal-stream-prose')?.remove();
    });
    await query(page, 'about');
    await expect(page.locator(search)).toBeHidden();
    await expect(page.locator('[data-home-search-error]')).toBeVisible();
    await expect(page.locator('[data-terminal-fallback]')).toBeVisible();
    await expect(page.locator('[data-terminal-entry-href="/pages/about/"] a')).toBeVisible();
  });

  test('invalid search metadata exposes native recovery even without starting a shell', async ({ page }) => {
    await page.route('**/', async (route) => {
      if (new URL(route.request().url()).pathname !== '/') return route.continue();
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace(/data-home-search-metadata="[^"]+"/u, 'data-home-search-metadata="invalid"') });
    });
    await page.goto('/');
    await expect(page.locator('[data-terminal-home]')).not.toHaveAttribute('data-terminal-controller-initialized', 'true');
    await expect(page.locator('[data-home-search-error]')).toBeVisible();
    await expect(page.locator('[data-terminal-fallback]')).toBeVisible();
    await expect(page.locator('[data-terminal-home]')).not.toHaveAttribute('data-terminal-controller-initialized', 'true');
    await expect(page.locator(search)).toBeHidden();
    await expect(page.locator('[data-home-search-error]')).toBeVisible();
    await expect(page.locator('[data-terminal-fallback]')).toBeVisible();
  });

  test('incomplete search controls fail into native browsing without shell startup', async ({ page }) => {
    for (const selector of ['[data-home-search-clear]', '[data-home-search]']) {
      await page.route('**/', async (route) => {
        if (new URL(route.request().url()).pathname !== '/') return route.continue();
        const response = await route.fetch();
        const html = await response.text();
        const body = selector === '[data-home-search-clear]'
          ? html.replace('data-home-search-clear', 'data-omitted-search-clear')
          : html.replace(/<section\b[^>]*data-home-search\b[^>]*>[\s\S]*?<\/section>/u, '');
        await route.fulfill({ response, body });
      });
      await page.goto('/');
      await expect(page.locator('[data-terminal-home]')).toHaveAttribute('data-home-search-failed', 'true');
      await expect(page.locator('[data-terminal-home]')).not.toHaveAttribute('data-terminal-controller-initialized', 'true');
      await expect(page.locator('[data-terminal-fallback]')).toBeVisible();
      await expect(page.locator('[data-terminal-home]')).not.toHaveAttribute('data-terminal-controller-initialized', 'true');
      await expect(page.locator('[data-home-search-error]')).toBeVisible();
      await expect(page.locator('[data-terminal-entry-href="/pages/about/"] a')).toBeVisible();
      await page.unroute('**/');
    }
  });

  test('input-mode changes cancel pending input and release hidden focus without stale results', async ({ page }) => {
    await page.goto('/');
    await query(page, 'about');
    await page.locator(input).fill('definitely-no-results-needle');
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await expect(page.locator(search)).toBeHidden();
    await expect(page.locator(input)).not.toBeFocused();
    await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await expect(page.locator(search)).toBeVisible();
    await expect(page.locator(status)).toHaveText('没有找到匹配的文章。');
    await expect(page.locator(input)).not.toBeFocused();
  });

  test('expanded public fixture returns all articles and records first/cached search cost', async ({ page }, info) => {
    await withSyntheticArticles(page, Array.from({ length: 400 }, (_, index) => syntheticDocument(index,
      `<p>${'long public body '.repeat(600)}expanded-fixture-needle</p>`)).join(''));
    await page.goto('/');
    await expect(page.locator(search)).toBeVisible();
    const timing = await page.locator(input).evaluate((element: HTMLInputElement) => {
      element.value = 'expanded-fixture-needle';
      const start = performance.now();
      element.form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      const first = performance.now();
      element.form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      return { first: first - start, cached: performance.now() - first };
    });
    await expect(page.locator(status)).toHaveText('找到 400 篇文章');
    await expect(page.locator(`${results} li`)).toHaveCount(400);
    expect(timing.first).toBeLessThan(1000);
    expect(timing.cached).toBeLessThan(500);
    await info.attach('public-fixture-search-timing', { body: JSON.stringify(timing), contentType: 'application/json' });
    console.log(`400 public articles / ~4 MB, extraction+search+render=${timing.first.toFixed(1)}ms, cached search+render=${timing.cached.toFixed(1)}ms`);
  });
});
