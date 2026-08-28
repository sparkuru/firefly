import { expect, test, type Page } from '@playwright/test';
import { SITE_CONFIG } from '../src/lib/site-config.mjs';
import { terminalPromptName } from './terminal-prompt';

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

async function expectTerminalDocument(page: Page, expectedPath: string) {
  await expect(page.locator('html.terminal-root[data-terminal-theme="firefly"]')).toHaveCount(1);
  await expect(page.locator('.terminal-document')).toHaveCount(1);
  await expect(page.locator('.semantic-document')).toHaveCount(0);
  await expect(page.locator('.terminal-titlebar')).toBeVisible();
  await expect(page.locator('.terminal-titlebar span')).toHaveCount(2);
  await expect(page.locator('.terminal-titlebar span').nth(1)).toHaveText(expectedPath);
  await expect(page.locator('.terminal-document-nav')).toHaveCount(0);
  await expect(page.locator('.terminal-path')).toHaveCount(0);
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
    name: `${SITE_CONFIG.site.name} content terminal`
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
  await expect(page.getByRole('link', { name: 'ai/llm-workflow-with-trellis.md' })).toHaveAttribute(
    'href',
    '/posts/ai/llm-workflow-with-trellis/'
  );
  await expect(page.getByRole('link', { name: 'about.md' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'nerv/' })).toHaveAttribute('href', '/lab/nerv/');
  await expect(main.getByRole('heading', { level: 3, name: 'friend links' })).toBeVisible();
  if (SITE_CONFIG.terminal.friends.length === 0) {
    await expect(main.getByText('No friend links.')).toBeVisible();
    await expect(page.locator('[data-terminal-friend]')).toHaveCount(0);
  } else {
    const friendRows = page.locator('[data-terminal-fallback] [data-terminal-friend]');
    await expect(friendRows).toHaveCount(SITE_CONFIG.terminal.friends.length);
    await expect(friendRows.first().locator('a')).toHaveText(SITE_CONFIG.terminal.friends[0].name);
    await expect(friendRows.first().locator('a')).toHaveAttribute('href', SITE_CONFIG.terminal.friends[0].url);
  }
  await expect(page.locator('[data-terminal-session]')).toHaveAttribute('hidden', '');
  await expect(page.getByRole('textbox', { name: terminalPromptName() })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'ai/Learning-with-LLM.md' })).toBeVisible();
  await expect(
    page.locator('template[data-terminal-template][data-terminal-template-path="posts/ai/llm-workflow-with-trellis.md"]')
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

test('post deep link uses the firefly default with a reader fragment', async ({ page }) => {
  await page.goto('/posts/ai/llm-workflow-with-trellis/');

  await expect(page).toHaveURL(/\/posts\/ai\/llm-workflow-with-trellis\/$/);
  await expectTerminalDocument(page, '~/blog/posts/ai/llm-workflow-with-trellis.md');
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
  await expect(outline.locator('li')).toHaveCount(21);
  await expect(outline.getByRole('link', { name: 'install' })).toHaveAttribute('href', '#install');
  await expect(outline.getByRole('link', { name: 'usage' })).toHaveAttribute('href', '#usage');
  await outline.getByRole('link', { name: 'usage' }).click();
  await expect(page).toHaveURL(/#usage$/u);
  await expectHeadingLevels(page, [1, 2, 2, 2, 2, 3, 3, 4, 4, 4, 4, 4, 4, 3, 4, 4, 3, 4, 4, 4, 4, 4]);
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

test('firefly article remains complete and exposes one canonical route', async ({ page }) => {
  await page.goto('/posts/ai/llm-workflow-with-trellis/');

  await expectTerminalDocument(page, '~/blog/posts/ai/llm-workflow-with-trellis.md');
  const article = page.getByRole('article');
  await expect(article.getByRole('heading', { level: 1, name: 'llm-workflow-with-trellis' })).toBeVisible();
  await expect(article.getByRole('heading', { level: 2, name: 'install' })).toBeVisible();
  await expect(article.getByRole('heading', { level: 2, name: 'usage' })).toBeVisible();
  await expect(article.getByRole('link', { name: 'Trellis repository' })).toHaveAttribute(
    'href',
    'https://github.com/mindfold-ai/Trellis.git'
  );
  await expect(article.getByRole('table').first()).toBeVisible();
  await expect(article.getByText('flowchart TD')).toBeVisible();
  const outline = page.getByRole('navigation', { name: 'Document outline' });
  await expect(outline.locator('li')).toHaveCount(21);
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
  await expect(article.locator('.terminal-path')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Document path' })).toHaveCount(0);
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expectHeadingLevels(page, [1, 2, 2, 2, 2, 3, 3, 4, 4, 4, 4, 4, 4, 3, 4, 4, 3, 4, 4, 4, 4, 4]);
  await expectNoHorizontalOverflow(page);
});

test('nested post and directory indexes use canonical native links', async ({ page }) => {
  await page.goto('/posts/');
  await expect(page.getByRole('heading', { level: 1, name: 'posts/' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'ai/' })).toHaveAttribute('href', '/posts/ai/');
  await expect(page.getByRole('link', { name: 'ai/llm-workflow-with-trellis.md' })).toHaveCount(0);
  await expect(page.getByText(/Hidden draft|PRIVATE_TITLE_FIREFLY_7f2a|private-handoff|source-ledger/u)).toHaveCount(0);
  await expect(page.locator('script')).toHaveCount(0);

  await page.goto('/posts/ai/');
  await expect(page.getByRole('heading', { level: 1, name: 'posts/ai/' })).toBeVisible();
  await expect(page.locator('.terminal-titlebar')).toBeVisible();
  await expect(page.locator('.terminal-titlebar span')).toHaveCount(2);
  await expect(page.locator('.terminal-titlebar span').nth(1)).toHaveText('~/blog/posts/ai');
  await expect(page.getByRole('link', { name: 'llm-workflow-with-trellis.md' })).toHaveAttribute(
    'href',
    '/posts/ai/llm-workflow-with-trellis/'
  );
  await expect(page.locator('script')).toHaveCount(0);

  await page.goto('/posts/ai/llm-workflow-with-trellis/');
  await expectTerminalDocument(page, '~/blog/posts/ai/llm-workflow-with-trellis.md');
  await expect(page.getByRole('heading', { level: 1, name: 'llm-workflow-with-trellis' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Document path' })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.goto('/pages/');
  await expect(page.getByRole('heading', { level: 1, name: 'pages/' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'about.md' })).toHaveAttribute('href', '/pages/about/');
  await expect(page.locator('script')).toHaveCount(0);
});

test('page deep link renders readable Markdown', async ({ page }) => {
  await page.goto('/pages/about/');

  await expectTerminalDocument(page, '~/blog/pages/about.md');
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
  await page.goto('/posts/ai/llm-workflow-with-trellis/#usage');

  await expect(page).toHaveURL(/\/posts\/ai\/llm-workflow-with-trellis\/#usage$/u);
  await expect(page.locator('#usage')).toHaveText('usage');
  await expect(page.getByText('usage like this')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('reader entry fragment remains a native location without browser JavaScript', async ({ page }) => {
  await page.goto('/posts/ai/llm-workflow-with-trellis/#terminal-reader');

  await expect(page).toHaveURL(/\/posts\/ai\/llm-workflow-with-trellis\/#terminal-reader$/u);
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
