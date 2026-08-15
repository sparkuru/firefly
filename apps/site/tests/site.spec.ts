import { expect, test, type Page } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page) {
  const documentWidth = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));

  expect(documentWidth.scrollWidth).toBeLessThanOrEqual(documentWidth.clientWidth);
}

async function expectContainedInViewport(
  page: Page,
  locator: ReturnType<Page['locator']>
) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();

  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
    viewport?.width ?? 0
  );
}

async function expectHeadingLevels(page: Page, levels: number[]) {
  const actual = await page
    .getByRole('article')
    .locator('h1, h2, h3, h4, h5, h6')
    .evaluateAll((headings) =>
      headings.map((heading) => Number(heading.tagName.slice(1)))
    );

  expect(actual).toEqual(levels);
}

test('home exposes Terminal fallback content and visible keyboard focus', async ({ page }) => {
  await page.goto('/');

  const main = page.getByRole('main');
  await expect(main).toBeVisible();
  const programmaticHeading = main.getByRole('heading', {
    level: 1,
    name: 'f1refly content terminal'
  });
  await expect(programmaticHeading).toHaveCSS('position', 'absolute');
  expect(await programmaticHeading.evaluate((heading) => ({
    clipPath: getComputedStyle(heading).clipPath,
    height: heading.getBoundingClientRect().height,
    width: heading.getBoundingClientRect().width
  }))).toEqual({ clipPath: 'inset(50%)', height: 1, width: 1 });
  await expect(
    main.getByRole('heading', {
      level: 2,
      name: 'Browse public documents'
    })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'hello-static-foundation.md' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'llm-workflow-with-trellis.md' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'about.md' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'nerv/' })).toHaveAttribute('href', '/lab/nerv/');
  await expect(page.locator('[data-terminal-session]')).toHaveAttribute('hidden', '');
  await expect(page.getByRole('textbox', { name: /Command for guest@f1refly:~\/blog\/posts \$/u })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'characters/nahida.md' })).toBeVisible();
  await expect(page.locator('template[data-terminal-template]')).toHaveCount(4);
  await expect(page.locator('.terminal-titlebar')).toHaveCount(0);
  await expect(page.getByText('Hidden draft')).toHaveCount(0);

  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  expect(await skipLink.evaluate((link) => getComputedStyle(link).outlineStyle)).not.toBe(
    'none'
  );

  await expectNoHorizontalOverflow(page);
});

test('lab index is a JavaScript-free semantic catalog with native navigation', async ({ page }) => {
  await page.goto('/lab/');

  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1, name: 'Experiments' })).toBeVisible();
  await expect(main.getByRole('heading', { level: 2, name: 'NERV' })).toBeVisible();
  await expect(main.locator('.content-meta')).toHaveText('landing · astro · fan-work');
  await expect(main.getByRole('link', { name: 'Open NERV' })).toHaveAttribute('href', '/lab/nerv/');
  await expect(page.locator('script')).toHaveCount(0);

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await expectNoHorizontalOverflow(page);
});

test('post deep link renders Markdown as semantic HTML', async ({ page }) => {
  await page.goto('/posts/hello-static-foundation/');

  await expect(page).toHaveURL(/\/posts\/hello-static-foundation\/$/);
  const article = page.getByRole('article');
  await expect(
    article.getByRole('heading', { level: 1, name: 'Hello, static foundation' })
  ).toBeVisible();
  await expect(
    article.getByRole('heading', { level: 2, name: 'Markdown to durable HTML' })
  ).toBeVisible();
  await expect(
    article.getByRole('heading', { level: 3, name: 'Stable boundaries' })
  ).toBeVisible();
  await expect(article).toContainText('No browser-side parser');

  const outline = page.getByRole('navigation', { name: 'On this page' });
  await expect(outline).toBeVisible();
  await expect(
    outline.getByRole('link', { name: 'Markdown to durable HTML' })
  ).toHaveAttribute('href', '#markdown-to-durable-html');
  await expect(outline.getByRole('link', { name: 'Stable boundaries' })).toHaveAttribute(
    'href',
    '#stable-boundaries'
  );
  await outline.getByRole('link', { name: 'Stable boundaries' }).click();
  await expect(page).toHaveURL(/#stable-boundaries$/u);
  await expectHeadingLevels(page, [1, 2, 3]);

  const codeRegion = page.getByRole('region', { name: /^Code content:/u });
  const tableRegion = page.getByRole('region', { name: /^Table content:/u });
  await expect(codeRegion).toHaveAttribute('tabindex', '0');
  await expect(tableRegion.getByRole('table')).toBeVisible();
  await expectContainedInViewport(page, codeRegion);
  await expectContainedInViewport(page, tableRegion);
  expect(
    await codeRegion.evaluate((element) => ({
      clientWidth: element.clientWidth,
      overflowX: getComputedStyle(element).overflowX,
      scrollWidth: element.scrollWidth
    }))
  ).toEqual(
    expect.objectContaining({
      overflowX: 'auto'
    })
  );
  expect(await codeRegion.evaluate((element) => element.scrollWidth)).toBeGreaterThan(
    await codeRegion.evaluate((element) => element.clientWidth)
  );
  await codeRegion.focus();
  await expect(codeRegion).toBeFocused();
  expect(await codeRegion.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe(
    'none'
  );

  await expectNoHorizontalOverflow(page);
});

test('Terminal article remains complete and exposes a linked canonical breadcrumb', async ({ page }) => {
  await page.goto('/posts/llm-workflow-with-trellis/');

  const article = page.getByRole('article');
  await expect(article.getByRole('heading', { level: 1, name: 'llm workflow with trellis' })).toBeVisible();
  await expect(article.getByRole('heading', { level: 2, name: 'install' })).toBeVisible();
  await expect(article.getByRole('heading', { level: 2, name: 'usage' })).toBeVisible();
  await expect(article.getByRole('link', { name: 'Trellis repository' })).toHaveAttribute('href', 'https://github.com/mindfold-ai/Trellis.git');
  await expect(article.getByRole('table').first()).toBeVisible();
  await expect(article.getByText('flowchart TD')).toBeVisible();
  const outline = page.getByRole('navigation', { name: 'On this page' });
  await expect(outline.locator('li')).toHaveCount(21);
  const codeRegion = article.getByRole('region', { name: /^Code content:/u }).first();
  const tableRegion = article.getByRole('region', { name: /^Table content:/u }).first();
  await expect(codeRegion).toHaveAttribute('tabindex', '0');
  await expect(tableRegion).toHaveAttribute('tabindex', '0');
  await expectContainedInViewport(page, codeRegion);
  await expectContainedInViewport(page, tableRegion);
  await codeRegion.focus();
  await expect(codeRegion).toBeFocused();
  expect(await codeRegion.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none');
  const breadcrumb = page.getByRole('navigation', { name: 'Document path' });
  await expect(breadcrumb.getByRole('link', { name: '/' })).toHaveAttribute('href', '/');
  await expect(breadcrumb.getByRole('link', { name: 'posts' })).toHaveAttribute('href', '/posts/');
  await expect(breadcrumb.getByText('llm-workflow-with-trellis.md')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expectHeadingLevels(page, [1, 2, 2, 2, 3, 3, 4, 4, 4, 4, 4, 4, 3, 4, 4, 4, 3, 4, 4, 4, 4, 4]);
  await expectNoHorizontalOverflow(page);
});

test('nested post and directory indexes use canonical native links', async ({ page }) => {
  await page.goto('/posts/');
  await expect(page.getByRole('heading', { level: 1, name: 'posts/' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'characters/' })).toHaveAttribute('href', '/posts/characters/');
  await expect(page.getByRole('link', { name: 'hello-static-foundation.md' })).toHaveAttribute('href', '/posts/hello-static-foundation/');
  await expect(page.getByRole('link', { name: 'llm-workflow-with-trellis.md' })).toHaveAttribute('href', '/posts/llm-workflow-with-trellis/');
  await expect(page.getByText(/Hidden draft|PRIVATE_TITLE_M5_7f2a|comment-handoff|memos\.private/u)).toHaveCount(0);
  await expect(page.locator('script')).toHaveCount(0);

  await page.goto('/posts/characters/');
  await expect(page.getByRole('heading', { level: 1, name: 'posts/characters/' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'nahida.md' })).toHaveAttribute('href', '/posts/characters/nahida/');
  await expect(page.locator('script')).toHaveCount(0);

  await page.goto('/posts/characters/nahida/');
  await expect(page.getByRole('heading', { level: 1, name: 'Notes on Nahida' })).toBeVisible();
  const breadcrumb = page.getByRole('navigation', { name: 'Document path' });
  expect((await breadcrumb.textContent())?.replace(/\s+/gu, ' ').trim()).toBe(
    'guest@f1refly:~/blog $ / posts / characters / nahida.md'
  );
  await expect(breadcrumb).not.toContainText('cd');
  await expect(breadcrumb).not.toContainText('/ /posts');
  const rootLink = breadcrumb.getByRole('link', { name: '/', exact: true });
  const postsLink = breadcrumb.getByRole('link', { name: 'posts', exact: true });
  const charactersLink = breadcrumb.getByRole('link', { name: 'characters', exact: true });
  await expect(rootLink).toHaveAttribute('href', '/');
  await expect(postsLink).toHaveAttribute('href', '/posts/');
  await expect(charactersLink).toHaveAttribute('href', '/posts/characters/');
  await expect(rootLink).toHaveCSS('text-decoration-line', 'underline');
  await expect(postsLink).toHaveCSS('text-decoration-line', 'underline');
  await expect(charactersLink).toHaveCSS('text-decoration-line', 'underline');
  await rootLink.focus();
  await expect(rootLink).toBeFocused();
  expect(await rootLink.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none');
  const current = breadcrumb.getByText('nahida.md', { exact: true });
  await expect(current).toHaveAttribute('aria-current', 'page');
  await expect(current).toHaveCSS('text-decoration-line', 'underline');
  await expect(breadcrumb.getByRole('link', { name: 'nahida.md', exact: true })).toHaveCount(0);
  await expect(breadcrumb.getByRole('listitem')).toHaveCount(4);
  expect(await breadcrumb.getByRole('link').evaluateAll((links) => links.map((link) => ({
    href: link.getAttribute('href'),
    text: link.textContent
  })))).toEqual([
    { href: '/', text: '/' },
    { href: '/posts/', text: 'posts' },
    { href: '/posts/characters/', text: 'characters' }
  ]);
  const gapWidths = await breadcrumb.locator('.terminal-breadcrumb-gap').evaluateAll(
    (gaps) => gaps.map((gap) => gap.getBoundingClientRect().width)
  );
  expect(gapWidths).toHaveLength(6);
  for (const width of gapWidths) expect(width).toBeGreaterThan(0);
  await expect(breadcrumb.locator('.terminal-breadcrumb-separator')).toHaveCount(2);
  await expectNoHorizontalOverflow(page);

  await page.goto('/pages/');
  await expect(page.getByRole('heading', { level: 1, name: 'pages/' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'about.md' })).toHaveAttribute('href', '/pages/about/');
  await expect(page.locator('script')).toHaveCount(0);
});

test('page deep link renders readable Markdown', async ({ page }) => {
  await page.goto('/pages/about/');

  const article = page.getByRole('article');
  await expect(
    article.getByRole('heading', { level: 1, name: 'About this foundation' })
  ).toBeVisible();
  await expect(
    article.getByRole('heading', { level: 2, name: 'A deliberately small beginning' })
  ).toBeVisible();
  await expect(
    article.getByRole('heading', { level: 2, name: 'What remains constant' })
  ).toBeVisible();
  await expect(article).toContainText('Future presentations can change how the site looks');
  await expect(page.getByRole('navigation', { name: 'On this page' })).toBeVisible();
  await expectHeadingLevels(page, [1, 2, 2]);

  await expectNoHorizontalOverflow(page);
});

test('document fragment deep link resolves without browser JavaScript', async ({ page }) => {
  await page.goto('/posts/hello-static-foundation/#stable-boundaries');

  await expect(page).toHaveURL(/#stable-boundaries$/u);
  await expect(page.locator('#stable-boundaries')).toHaveText('Stable boundaries');
  await expect(page.getByText('Presentation changes should preserve')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('unknown route renders the static 404 recovery path', async ({ page }) => {
  const response = await page.goto('/missing-route/');

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Page not found.' })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return home' })).toHaveAttribute('href', '/');

  await expectNoHorizontalOverflow(page);
});
