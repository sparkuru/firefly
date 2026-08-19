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

async function expectTerminalDocument(page: Page) {
  await expect(page.locator('html.terminal-root[data-terminal-theme="f1refly"]')).toHaveCount(1);
  await expect(page.locator('.terminal-document')).toHaveCount(1);
  await expect(page.locator('.semantic-document')).toHaveCount(0);
  await expect(page.locator('.terminal-titlebar')).toBeVisible();
  await expect(page.locator('.terminal-document-nav')).toHaveCount(0);
  await expect(page.locator('.terminal-path')).toHaveCount(1);
  await expect(page.locator('[data-terminal-reader-status]')).toBeVisible();
}

test('home exposes Terminal fallback content and visible keyboard focus', async ({ page }) => {
  await page.goto('/');

  const main = page.getByRole('main');
  await expect(main).toBeVisible();
  await expect(page.locator('[data-terminal-home]')).not.toHaveAttribute('data-terminal-startup-state');
  await expect(page.locator('[data-terminal-startup]')).toBeHidden();
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
  await expect(page.getByRole('link', { name: 'main/llm-workflow-with-trellis.md' })).toHaveAttribute(
    'href',
    '/posts/main/379/'
  );
  await expect(page.getByRole('link', { name: 'about.md' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'nerv/' })).toHaveAttribute('href', '/lab/nerv/');
  await expect(page.locator('[data-terminal-session]')).toHaveAttribute('hidden', '');
  await expect(page.getByRole('textbox', { name: /Command for guest@f1refly:~\/blog\/posts \$/u })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'main/Learning-with-LLM.md' })).toBeVisible();
  await expect(
    page.locator('template[data-terminal-template][data-terminal-template-path="posts/main/llm-workflow-with-trellis.md"]')
  ).toHaveCount(1);
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

test('home keeps native recovery without JavaScript and no startup state', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('[data-terminal-home]')).not.toHaveAttribute('data-terminal-startup-state');
  await expect(page.locator('[data-terminal-startup]')).toBeHidden();
  await expect(page.getByRole('heading', { level: 2, name: 'Browse public documents' })).toBeVisible();
  await expect(page.locator('[data-terminal-session]')).toHaveAttribute('hidden', '');
  await expect(page.getByRole('textbox', { name: /Command for /u })).toHaveCount(0);
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

test('migrated post deep link uses the f1refly default with a reader fragment', async ({ page }) => {
  await page.goto('/posts/main/379/');

  await expect(page).toHaveURL(/\/posts\/main\/379\/$/);
  await expectTerminalDocument(page);
  const article = page.getByRole('article');
  await expect(
    article.getByRole('heading', { level: 1, name: 'llm-workflow-with-trellis' })
  ).toBeVisible();
  await expect(article.getByRole('heading', { level: 2, name: 'install' })).toBeVisible();
  await expect(article.getByRole('heading', { level: 2, name: 'usage' })).toBeVisible();
  await expect(article).toContainText('flowchart TD');

  const outline = page.getByRole('navigation', { name: 'Document outline' });
  await expect(outline).toBeVisible();
  await expect(outline.locator('ul')).toHaveCount(1);
  await expect(outline.locator('ol')).toHaveCount(0);
  await expect(outline.locator('li')).toHaveCount(22);
  await expect(outline.getByRole('link', { name: 'install' })).toHaveAttribute('href', '#install');
  await expect(outline.getByRole('link', { name: 'usage' })).toHaveAttribute('href', '#usage');
  await outline.getByRole('link', { name: 'usage' }).click();
  await expect(page).toHaveURL(/#usage$/u);
  await expectHeadingLevels(page, [1, 2, 2, 2, 2, 3, 3, 4, 4, 4, 4, 4, 4, 3, 4, 4, 4, 3, 4, 4, 4, 4, 4]);
  await expect(article.locator('.terminal-document-header')).toBeVisible();
  await expect(outline.locator('ul')).toHaveCSS('list-style-type', 'none');

  const codeRegion = page.getByRole('region', { name: /^Code content:/u }).first();
  const tableRegion = page.getByRole('region', { name: /^Table content:/u }).first();
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
  expect(await codeRegion.evaluate((element) => element.scrollWidth)).toBeGreaterThanOrEqual(
    await codeRegion.evaluate((element) => element.clientWidth)
  );
  await codeRegion.focus();
  await expect(codeRegion).toBeFocused();

  await expectNoHorizontalOverflow(page);
});

test('migrated f1refly article remains complete and exposes one canonical route', async ({ page }) => {
  await page.goto('/posts/main/379/');

  await expectTerminalDocument(page);
  const article = page.getByRole('article');
  await expect(article.getByRole('heading', { level: 1, name: 'llm-workflow-with-trellis' })).toBeVisible();
  await expect(article.getByRole('heading', { level: 2, name: 'install' })).toBeVisible();
  await expect(article.getByRole('heading', { level: 2, name: 'usage' })).toBeVisible();
  await expect(article.getByRole('link', { name: 'https://github.com/mindfold-ai/Trellis.git' })).toHaveAttribute(
    'href',
    'https://github.com/mindfold-ai/Trellis.git'
  );
  await expect(article.getByRole('table').first()).toBeVisible();
  await expect(article.getByText('flowchart TD')).toBeVisible();
  const outline = page.getByRole('navigation', { name: 'Document outline' });
  await expect(outline.locator('li')).toHaveCount(22);
  await expect(outline.locator('ul')).toHaveCount(1);
  const codeRegion = article.getByRole('region', { name: /^Code content:/u }).first();
  const tableRegion = article.getByRole('region', { name: /^Table content:/u }).first();
  await expect(codeRegion).toHaveAttribute('tabindex', '0');
  await expect(tableRegion).toHaveAttribute('tabindex', '0');
  await expectContainedInViewport(page, codeRegion);
  await expectContainedInViewport(page, tableRegion);
  await codeRegion.focus();
  await expect(codeRegion).toBeFocused();
  expect(await codeRegion.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none');
  await expect(article.locator('.terminal-path')).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: 'Document path' })).toHaveCount(0);
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expectHeadingLevels(page, [1, 2, 2, 2, 2, 3, 3, 4, 4, 4, 4, 4, 4, 3, 4, 4, 4, 3, 4, 4, 4, 4, 4]);
  await expectNoHorizontalOverflow(page);
});

test('nested post and directory indexes use canonical native links', async ({ page }) => {
  await page.goto('/posts/');
  await expect(page.getByRole('heading', { level: 1, name: 'posts/' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'main/' })).toHaveAttribute('href', '/posts/main/');
  await expect(page.getByRole('link', { name: 'main/llm-workflow-with-trellis.md' })).toHaveCount(0);
  await expect(page.getByText(/Hidden draft|PRIVATE_TITLE_M5_7f2a|comment-handoff|memos\.private/u)).toHaveCount(0);
  await expect(page.locator('script')).toHaveCount(0);

  await page.goto('/posts/main/');
  await expect(page.getByRole('heading', { level: 1, name: 'posts/main/' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'llm-workflow-with-trellis.md' })).toHaveAttribute(
    'href',
    '/posts/main/379/'
  );
  await expect(page.locator('script')).toHaveCount(0);

  await page.goto('/posts/main/379/');
  await expectTerminalDocument(page);
  await expect(page.getByRole('heading', { level: 1, name: 'llm-workflow-with-trellis' })).toBeVisible();
  await expect(page.locator('.terminal-path')).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: 'Document path' })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.goto('/pages/');
  await expect(page.getByRole('heading', { level: 1, name: 'pages/' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'about.md' })).toHaveAttribute('href', '/pages/about/');
  await expect(page.locator('script')).toHaveCount(0);
});

test('page deep link renders readable Markdown', async ({ page }) => {
  await page.goto('/pages/about/');

  await expectTerminalDocument(page);
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
  await expect(page.getByRole('navigation', { name: 'Document outline' })).toBeVisible();
  await expectHeadingLevels(page, [1, 2, 2]);

  await expectNoHorizontalOverflow(page);
});

test('document fragment deep link resolves without browser JavaScript', async ({ page }) => {
  await page.goto('/posts/main/379/#usage');

  await expect(page).toHaveURL(/\/posts\/main\/379\/#usage$/u);
  await expect(page.locator('#usage')).toHaveText('usage');
  await expect(page.getByText('usage like this')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('reader entry fragment remains a native location without browser JavaScript', async ({ page }) => {
  await page.goto('/posts/main/379/#terminal-reader');

  await expect(page).toHaveURL(/\/posts\/main\/379\/#terminal-reader$/u);
  await expect(page.locator('#terminal-reader')).toBeVisible();
  await expect(page.locator('[data-terminal-reader-status]')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1, name: 'llm-workflow-with-trellis' })).toBeVisible();
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
