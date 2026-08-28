import { expect, test, type Page } from '@playwright/test';
import { SITE_CONFIG } from '../src/lib/site-config.mjs';
import { terminalPrompt, terminalPromptName } from './terminal-prompt';

async function expectNoHorizontalOverflow(page: Page) {
  const width = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);
}

async function expectInViewport(
  locator: ReturnType<Page['locator']>,
  minTopRatio = 0,
  maxTopRatio = 1
) {
  await expect.poll(async () => locator.evaluate((element, ratios) => {
    const rect = element.getBoundingClientRect();
    return rect.top >= window.innerHeight * ratios.min &&
      rect.top <= window.innerHeight * ratios.max &&
      rect.bottom <= window.innerHeight;
  }, { min: minTopRatio, max: maxTopRatio })).toBe(true);
}

async function submit(page: Page, command: string) {
  const input = page.locator('#terminal-command');
  await input.fill(command);
  await input.press('Enter');
}

async function readBootGeometry(page: Page) {
  return page.locator('[data-terminal-boot-log]').evaluate((log) => {
    return {
      lineTops: [...log.querySelectorAll<HTMLElement>('.terminal-boot-line')]
        .map((line) => line.getBoundingClientRect().top),
      logTop: log.getBoundingClientRect().top
    };
  });
}

async function readCommandBandGeometry(page: Page) {
  return page.evaluate(() => {
    const records = document.querySelectorAll<HTMLElement>(
      '[data-terminal-transcript] .terminal-record:not(.terminal-boot-record)'
    );
    const record = records[records.length - 1];
    const row = document.querySelector<HTMLElement>('[data-terminal-session] .terminal-command-row');
    if (record === undefined || row === null) {
      throw new Error('Missing Terminal command band geometry targets.');
    }
    const recordRect = record.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    return {
      bandCenter: (recordRect.top + rowRect.bottom) / 2,
      recordTop: recordRect.top,
      rowBottom: rowRect.bottom,
      rowTop: rowRect.top,
      scrollHeight: document.documentElement.scrollHeight,
      sessionInitial: document.querySelector('[data-terminal-session]')?.hasAttribute('data-terminal-session-initial') ?? false,
      viewportHeight: window.innerHeight
    };
  });
}

async function expectCenteredEmptySession(page: Page) {
  await expect.poll(async () => page.evaluate(() => {
    const row = document.querySelector<HTMLElement>('[data-terminal-session] .terminal-command-row');
    if (row === null) {
      return false;
    }
    const rect = row.getBoundingClientRect();
    const viewportCenter = window.innerHeight / 2;
    const rowCenter = (rect.top + rect.bottom) / 2;
    return Math.abs(rowCenter - viewportCenter) <= 2 &&
      document.documentElement.scrollHeight <= document.documentElement.clientHeight + 1;
  })).toBe(true);
}

test('successful startup preserves the boot log before the shell prompt', async ({ page }) => {
  await page.goto('/');
  const input = page.locator('#terminal-command');

  await expect(input).toBeVisible();
  await expect(input).not.toBeFocused();
  await expect(input).toHaveAttribute('enterkeyhint', 'send');
  await expect(input).toHaveAttribute('aria-controls', 'terminal-transcript');
  await expect(page.locator('[data-terminal-home]')).toHaveAttribute('data-terminal-startup-state', 'ready');
  await expect(page.locator('[data-terminal-home]')).toHaveAttribute(
    'data-terminal-identity-prompt-marker',
    SITE_CONFIG.terminal.promptMarker
  );
  await expect(page.locator('[data-terminal-startup]')).toHaveCount(0);
  await expect(page.locator('[data-terminal-transcript] .terminal-boot-record')).toHaveCount(1);
  await expect(page.locator('[data-terminal-boot-log] .terminal-boot-line')).toHaveCount(12);
  await expect(page.locator('[data-terminal-boot-separator]')).toHaveCount(0);
  await expect(page.locator('[data-terminal-boot-status]')).toHaveCount(0);
  await expect(page.locator('[data-terminal-fallback]')).toBeHidden();
  await expect(page.locator('.terminal-titlebar')).toHaveCount(0);
  await expect(page.getByRole('button')).toHaveCount(0);
  await expect(page.getByText('Browse public documents')).toBeHidden();
  const markup = await page.locator('body').innerHTML();
  expect(markup).not.toMatch(/PRIVATE_(?:TITLE|BODY)_FIREFLY_7f2a|hidden-draft|owner-fixture/u);
  await expect(page.locator('.terminal-command-row .terminal-prompt')).toHaveText(terminalPrompt());
  expect(await page.locator('.terminal-command-row').evaluate((row) => row.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await expectNoHorizontalOverflow(page);
});

test('connecting startup prevents Escape from stopping the home controller load', async ({ page }) => {
  await page.addInitScript(() => {
    const tracker = window as Window & { __terminalEscapeDefaultPrevented?: boolean[] };
    tracker.__terminalEscapeDefaultPrevented = [];
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        tracker.__terminalEscapeDefaultPrevented?.push(event.defaultPrevented);
      }
    });
  });
  await page.route(/TerminalHome.*\.js$/u, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'commit' });

  const root = page.locator('[data-terminal-home]');
  await expect(root).toHaveAttribute('data-terminal-startup-state', 'connecting');
  for (let index = 0; index < 3; index += 1) {
    await page.keyboard.press('Escape');
  }
  await expect.poll(() => page.evaluate(() => {
    const tracker = window as Window & { __terminalEscapeDefaultPrevented?: boolean[] };
    return tracker.__terminalEscapeDefaultPrevented ?? [];
  })).toEqual([true, true, true]);
  await expect(root).toHaveAttribute('data-terminal-startup-state', 'connecting');

  await expect(root).toHaveAttribute('data-terminal-startup-state', 'ready');
  const input = page.locator('#terminal-command');
  await input.focus();
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => {
    const tracker = window as Window & { __terminalEscapeDefaultPrevented?: boolean[] };
    return tracker.__terminalEscapeDefaultPrevented ?? [];
  })).toEqual([true, true, true, false]);
});

test('pending startup exposes the direct boot log before the shell is ready', async ({ page }) => {
  await page.setViewportSize({ width: 2048, height: 1244 });
  await page.route(/TerminalHome.*\.js$/u, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'commit' });

  const root = page.locator('[data-terminal-home]');
  await expect(root).toHaveAttribute('data-terminal-startup-state', 'connecting');
  await expect(page.locator('[data-terminal-startup]')).toBeVisible();
  const bootLines = page.locator('[data-terminal-boot-log] .terminal-boot-line');
  await expect(bootLines).toHaveCount(12);
  await expect(bootLines.first()).toHaveCSS('animation-name', 'terminal-boot-line-reveal');
  await expect(bootLines.first()).toHaveCSS('animation-duration', '0.18s');
  expect(await bootLines.evaluateAll((lines) => lines.map((line) => ({
    delay: line instanceof HTMLElement ? line.style.getPropertyValue('--terminal-boot-delay') : '',
    animationName: getComputedStyle(line).animationName
  })))).toEqual(Array.from({ length: 12 }, (_, index) => ({
    delay: `${index * 100}ms`,
    animationName: 'terminal-boot-line-reveal'
  })));
  await expect(page.locator('[data-terminal-boot-separator]')).toHaveCount(0);
  await expect(page.locator('[data-terminal-boot-status]')).toHaveCount(0);
  const bootPrompt = page.locator('[data-terminal-boot-prompt]');
  await expect(bootPrompt).toHaveText(terminalPrompt());
  expect(await bootPrompt.evaluate((prompt) => {
    const style = getComputedStyle(prompt);
    return {
      animationDuration: style.animationDuration,
      animationName: style.animationName,
      opacity: style.opacity,
      promptDelay: prompt instanceof HTMLElement
        ? prompt.style.getPropertyValue('--terminal-boot-prompt-delay')
        : '',
      visibility: style.visibility
    };
  })).toEqual({
    animationDuration: '0.18s',
    animationName: 'terminal-boot-prompt-reveal',
    opacity: '0',
    promptDelay: '1400ms',
    visibility: 'hidden'
  });
  await expect.poll(() => bootPrompt.evaluate((prompt) => getComputedStyle(prompt).visibility)).toBe('visible');
  await expect.poll(() => bootPrompt.evaluate((prompt) => Number.parseFloat(getComputedStyle(prompt).opacity))).toBeGreaterThan(0.9);
  await expect(page.locator('[data-terminal-fallback]')).toBeHidden();
  await expect(page.locator('[data-terminal-session]')).toBeHidden();
  const pendingGeometry = await readBootGeometry(page);
  const pendingPromptHeight = await page.locator('[data-terminal-boot-prompt]').evaluate((prompt) => prompt.getBoundingClientRect().height);
  expect(pendingPromptHeight).toBeGreaterThanOrEqual(44);
  await expect(root).toHaveAttribute('data-terminal-startup-state', 'ready');
  await expect(page.locator('[data-terminal-startup]')).toHaveCount(0);
  await expect(page.locator('[data-terminal-transcript] .terminal-boot-record')).toHaveCount(1);
  const readyGeometry = await readBootGeometry(page);
  expect(readyGeometry.lineTops).toHaveLength(pendingGeometry.lineTops.length);
  readyGeometry.lineTops.forEach((top, index) => {
    expect(Math.abs(top - pendingGeometry.lineTops[index])).toBeLessThanOrEqual(1);
  });
  expect(Math.abs(readyGeometry.logTop - pendingGeometry.logTop)).toBeLessThanOrEqual(1);
  await expect(page.locator('.terminal-command-row')).toHaveCount(1);
  expect(await page.locator('.terminal-command-row').evaluate((row) => row.getBoundingClientRect().height)).toBeCloseTo(pendingPromptHeight, 4);
});

test('reduced motion reveals the connecting boot surface immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route(/TerminalHome.*\.js$/u, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'commit' });

  const root = page.locator('[data-terminal-home]');
  await expect(root).toHaveAttribute('data-terminal-startup-state', 'connecting');
  await expect(page.locator('[data-terminal-boot-log] .terminal-boot-line').first()).toHaveCSS('opacity', '1');
  await expect(page.locator('[data-terminal-boot-log] .terminal-boot-line').first()).toHaveCSS('animation-name', 'none');
  await expect(page.locator('[data-terminal-boot-prompt]')).toHaveCSS('opacity', '1');
  await expect(page.locator('[data-terminal-boot-prompt]')).toHaveCSS('visibility', 'visible');
  await expect(page.locator('[data-terminal-boot-prompt]')).toHaveCSS('animation-name', 'none');
  await expect(root).toHaveAttribute('data-terminal-startup-state', 'ready');
});

test('boot animation does not restart when the log becomes transcript history', async ({ page }) => {
  await page.addInitScript(() => {
    const tracker = window as Window & { __terminalBootAnimationStarts?: number };
    tracker.__terminalBootAnimationStarts = 0;
    document.addEventListener('animationstart', (event) => {
      if ((event as AnimationEvent).animationName === 'terminal-boot-line-reveal') {
        tracker.__terminalBootAnimationStarts = (tracker.__terminalBootAnimationStarts ?? 0) + 1;
      }
    }, true);
  });
  await page.route(/TerminalHome.*\.js$/u, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1800));
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'commit' });

  const root = page.locator('[data-terminal-home]');
  await expect(root).toHaveAttribute('data-terminal-startup-state', 'connecting');
  await expect(root).toHaveAttribute('data-terminal-startup-state', 'ready');
  await page.waitForTimeout(700);

  expect(await page.evaluate(() => {
    const tracker = window as Window & { __terminalBootAnimationStarts?: number };
    return tracker.__terminalBootAnimationStarts ?? 0;
  })).toBe(12);
  const bootLine = page.locator('[data-terminal-transcript] .terminal-boot-record .terminal-boot-line').first();
  await expect(bootLine).toHaveCSS('opacity', '1');
  await expect(bootLine).toHaveCSS('animation-name', 'none');
});

test('refresh starts a fresh session with the boot log as its first record', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-terminal-transcript] .terminal-boot-record')).toHaveCount(1);

  await page.reload();

  await expect(page.getByRole('textbox', { name: terminalPromptName() })).toBeVisible();
  await expect(page.locator('[data-terminal-startup]')).toHaveCount(0);
  await expect(page.locator('[data-terminal-transcript] .terminal-record')).toHaveCount(1);
  await expect(page.locator('[data-terminal-transcript] .terminal-boot-record')).toHaveCount(1);
  await expect(page.locator('[data-terminal-boot-log] .terminal-boot-line')).toHaveCount(12);
});

test('commands render continuous typed results, lab discovery, and latest announcements', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: terminalPromptName() });
  const transcript = page.locator('[data-terminal-transcript]');
  const announcer = page.locator('[data-terminal-announcer]');

  await submit(page, 'help');
  await expect(transcript.getByRole('heading', { level: 2, name: 'Explore' })).toBeVisible();
  await expect(transcript.getByRole('heading', { level: 2, name: 'Read & navigate' })).toBeVisible();
  await expect(transcript.getByText('list a public or session virtual directory')).toBeVisible();
  await expect(transcript.getByText('filter stdin or public text')).toBeVisible();
  await expect(transcript.getByText('change the virtual directory')).toBeVisible();
  await expect(transcript.getByText('open a listed experiment')).toBeVisible();
  await expect(transcript.getByText('list curated friend links')).toBeVisible();
  await expect(transcript.getByText('clear the screen')).toBeVisible();
  await expect(transcript).toContainText('alias l, ll');
  const grepUsage = transcript.locator('.terminal-help-command code').filter({ hasText: 'grep [-inF] <pattern> [path ...]' });
  await expect(grepUsage).toHaveCount(1);
  if (await page.evaluate(() => window.innerWidth >= 768)) {
    const usageGeometry = await grepUsage.evaluate((element) => {
      const style = getComputedStyle(element);
      return { height: element.getBoundingClientRect().height, lineHeight: Number.parseFloat(style.lineHeight) };
    });
    expect(usageGeometry.height).toBeLessThanOrEqual(usageGeometry.lineHeight * 1.25);
  }
  await expect(input).toBeFocused();

  await submit(page, 'friends');
  const friendRecord = transcript.locator('.terminal-record').last();
  if (SITE_CONFIG.terminal.friends.length === 0) {
    await expect(friendRecord).toContainText('No friend links.');
    await expect(announcer).toHaveText('No friend links.');
  } else {
    await expect(friendRecord.locator('.terminal-entry-row--friend')).toHaveCount(SITE_CONFIG.terminal.friends.length);
    await expect(announcer).toHaveText(`${SITE_CONFIG.terminal.friends.length} friend links listed.`);
  }

  await submit(page, 'alias l');
  await expect(transcript.locator('.terminal-record').last()).toContainText('l=ls');
  await submit(page, 'l ai/llm-workflow-with-trellis.md');
  await expect(transcript.locator('.terminal-entry-list').last().locator('.terminal-entry-row--document')).toHaveCount(1);
  await submit(page, 'll ai/llm-workflow-with-trellis.md');
  await expect(transcript.locator('.terminal-entry-list').last().locator('.terminal-entry-row--document')).toHaveCount(1);

  await input.fill('ls ai/llm-w');
  await input.press('Tab');
  await expect(input).toHaveValue('ls ai/llm-workflow-with-trellis.md');
  await expect(input).toBeFocused();
  await input.press('Enter');
  await expect(transcript.locator('.terminal-record').last()).toContainText('llm-workflow-with-trellis');

  await input.fill('ls ai');
  await input.press('Tab');
  await expect(input).toHaveValue('ls ai/');
  await expect(input).toBeFocused();
  await input.press('Enter');
  await expect(transcript.locator('.terminal-record').last()).toContainText('llm-workflow-with-trellis.md');

  await submit(page, 'ls sec');
  await expect(transcript.locator('.terminal-record').last()).toContainText('Did you mean "security/"? Press Tab to complete.');
  await submit(page, 'ls ai*');
  await expect(transcript.locator('.terminal-record').last()).toContainText('llm-workflow-with-trellis.md');
  await submit(page, 'ls *ai*');
  await expect(transcript.locator('.terminal-record').last()).toContainText('llm-workflow-with-trellis.md');
  await submit(page, 'ls ai/');
  await expect(transcript.locator('.terminal-record').last()).toContainText('llm-workflow-with-trellis');
  await submit(page, 'ls --help');
  await expect(transcript.locator('.terminal-record').last()).toContainText('Usage: ls [path|pattern]');

  await submit(page, 'ls ~/blog/lab/');
  const labListing = transcript.locator('.terminal-record').last();
  await expect(labListing.locator('.terminal-experiment-list')).toHaveCSS('list-style-type', 'none');
  await expect(labListing.locator('[data-terminal-entry-kind="experiment"]')).toHaveCount(1);
  await expect(labListing.getByRole('link', { name: 'nerv/' })).toHaveAttribute('href', '/lab/nerv/');
  await submit(page, 'ls ~/blog');
  await expect(transcript.locator('.terminal-record').last()).toContainText('lab/');
  await submit(page, 'ls ~/blog/lab/nerv/');
  await expect(transcript.locator('.terminal-record').last()).toContainText('Use "open ~/blog/lab/nerv" to enter this experiment.');

  await input.fill('cd ai');
  await input.press('Tab');
  await expect(input).toHaveValue('cd ai/');
  await expect(input).toBeFocused();
  await input.press('Enter');
  await expect(page.locator('.terminal-command-row .terminal-prompt')).toHaveText(terminalPrompt('~/blog/posts/ai'));
  await expect(page.getByRole('textbox', { name: terminalPromptName('~/blog/posts/ai') })).toBeFocused();
  await submit(page, 'ls');
  const nestedListing = transcript.locator('.terminal-entry-list').last();
  await expect(nestedListing.locator('.terminal-entry-row--document')).toHaveCount(4);
  await expect(nestedListing.locator('[data-terminal-entry-kind="directory"]')).toHaveCount(0);
  await expect(nestedListing.locator('[data-terminal-entry-kind="document"]')).toHaveCount(4);
  await expect(nestedListing.locator('.terminal-entry-group-heading')).toHaveCount(0);
  await expect(nestedListing).toContainText('2026-05-28');
  const nestedInput = page.getByRole('textbox', { name: terminalPromptName('~/blog/posts/ai') });
  await nestedInput.fill('cat ll');
  await nestedInput.press('Tab');
  await expect(nestedInput).toHaveValue('cat llm-workflow-with-trellis.md');
  await expect(nestedInput).toBeFocused();
  await nestedInput.press('Enter');
  await expect(transcript).toContainText('llm-workflow-with-trellis');
  await submit(page, 'cd ~/blog/posts/ai');
  await submit(page, 'ls *.md');
  const wildcardListing = transcript.locator('.terminal-entry-list').last();
  await expect(wildcardListing.locator('.terminal-entry-row--document')).toHaveCount(4);
  await expect(wildcardListing).toContainText('llm-workflow-with-trellis.md');
  await expect(wildcardListing).toContainText('llm-workflow-with-trellis');

  await submit(page, 'cd ../../');
  await expect(page.locator('.terminal-command-row .terminal-prompt')).toHaveText(terminalPrompt('~/blog'));
  await submit(page, 'ls');
  await expect(transcript.locator('.terminal-record').last()).toContainText('lab/');
  await submit(page, 'cd ~/blog/posts');

  await submit(page, 'cd ~/blog');
  const rootInput = page.locator('#terminal-command');
  await expect(page.locator('.terminal-command-row .terminal-prompt')).toHaveText(terminalPrompt('~/blog'));
  await rootInput.fill('cd ');
  await rootInput.press('Tab');
  await expect(rootInput).toBeFocused();
  await expect(page.getByRole('listbox', { name: 'Completion candidates' })).toBeVisible();
  await expect(page.getByRole('option')).toHaveText(['lab/', 'pages/', 'posts/']);
  await rootInput.fill('cd la');
  await rootInput.press('Tab');
  await expect(rootInput).toHaveValue('cd lab/');
  await expect(rootInput).toBeFocused();

  await submit(page, 'ls ~/blog/posts');
  const postsListing = transcript.locator('.terminal-entry-list').last();
  await expect(postsListing.locator('.terminal-entry-row')).toHaveCount(9);
  await expect(postsListing.locator('[data-terminal-entry-kind="directory"]')).toHaveCount(9);
  await expect(postsListing.getByRole('link', { name: 'ai/' })).toHaveAttribute('href', '/posts/ai/');
  await expect(postsListing.locator('[data-terminal-entry-kind="document"]')).toHaveCount(0);
  await expect(postsListing.locator('.terminal-entry-group-heading')).toHaveCount(0);
  await expect(postsListing).toHaveCSS('padding-left', '0px');
  await expect(postsListing.getByRole('link', { name: 'ai/llm-workflow-with-trellis.md' })).toHaveCount(0);
  const listingColumns = await postsListing.locator('.terminal-entry-row').evaluateAll((rows) => rows.map((row) => getComputedStyle(row).gridTemplateColumns));
  expect(new Set(listingColumns).size).toBe(1);
  await expect(announcer).toHaveText('9 posts listed.');

  await submit(page, 'ls pages');
  await expect(transcript.getByRole('link', { name: '~/blog/pages/about.md' })).toHaveAttribute('href', '/pages/about/');
  await rootInput.fill('ls ~/blog/pages/ab');
  await rootInput.press('Tab');
  await expect(rootInput).toHaveValue('ls ~/blog/pages/about.md');
  await expect(rootInput).toBeFocused();
  await rootInput.press('Enter');
  await expect(transcript.locator('.terminal-record').last()).toContainText('About this foundation');
  await submit(page, 'cat pages/about.md');
  await expect(transcript.locator('.terminal-record').last()).toContainText('About this foundation');
  await submit(page, 'cat ./pages/about.md');
  await expect(transcript.locator('.terminal-record').last()).toContainText('About this foundation');
  await submit(page, 'cat posts/ai/llm-workflow-with-trellis.md');
  await expect(transcript.locator('.terminal-record').last()).toContainText('llm-workflow-with-trellis');
  await submit(page, 'grep -i about pages/about.md');
  await expect(transcript.locator('.terminal-record').last()).toContainText('/pages/about.md:');
  await submit(page, 'cat ~/blog/pages/about.md');
  await expect(transcript.locator('.terminal-record').last().getByRole('heading', { level: 2, name: 'About' })).toBeVisible();
  await submit(page, 'cat lab/nerv');
  await expect(transcript.locator('.terminal-record').last()).toContainText('Try "open lab/nerv".');

  await submit(page, 'ls lab');
  await expect(transcript.locator('.terminal-record').last().getByRole('link', { name: 'nerv/' })).toHaveAttribute('href', '/lab/nerv/');
  await expect(transcript).toContainText('NERV');
  await expect(announcer).toHaveText('1 experiments listed.');
  await submit(page, 'open lab/unlisted');
  await expect(transcript).toContainText('No listed experiment named "lab/unlisted"');
  await expect(page.locator('[data-terminal-failure]')).toBeHidden();
  await expect(rootInput).toBeFocused();
});

test('help keeps the long find row readable across responsive layouts', async ({ page }) => {
  await page.goto('/');
  const transcript = page.locator('[data-terminal-transcript]');
  await submit(page, 'help');

  const findRow = transcript.locator('.terminal-help-command').filter({ hasText: 'find [--path <directory>]' });
  await expect(findRow).toHaveCount(1);
  await expect(findRow.locator('code')).toHaveText('find [--path <directory>] [--after YYYY-MM-DD] [--before YYYY-MM-DD] <keyword>');
  await expect(findRow.locator('.terminal-help-summary')).toHaveText('find public documents by filename substring');

  const geometry = await findRow.evaluate((row) => {
    const usage = row.querySelector<HTMLElement>('code');
    const detail = row.querySelector<HTMLElement>('.terminal-help-detail');
    const summary = row.querySelector<HTMLElement>('.terminal-help-summary');
    if (usage === null || detail === null || summary === null) throw new Error('Missing find help layout targets.');
    const usageRect = usage.getBoundingClientRect();
    const detailRect = detail.getBoundingClientRect();
    const summaryRect = summary.getBoundingClientRect();
    const usageLineHeight = Number.parseFloat(getComputedStyle(usage).lineHeight);
    const summaryLineHeight = Number.parseFloat(getComputedStyle(summary).lineHeight);
    const rowRect = row.getBoundingClientRect();
    return {
      columnCount: getComputedStyle(row).gridTemplateColumns.trim().split(/\s+/u).length,
      detailWidth: detailRect.width,
      rowLeft: rowRect.left,
      rowRight: rowRect.right,
      rowWidth: rowRect.width,
      summaryLines: Math.ceil(summaryRect.height / summaryLineHeight),
      usageLines: Math.ceil(usageRect.height / usageLineHeight),
      viewportWidth: document.documentElement.clientWidth
    };
  });

  expect(geometry.rowLeft).toBeGreaterThanOrEqual(-1);
  expect(geometry.rowRight).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  if (await page.evaluate(() => window.innerWidth >= 768)) {
    expect(geometry.columnCount).toBe(2);
    expect(geometry.usageLines).toBeGreaterThan(1);
    expect(geometry.detailWidth).toBeGreaterThan(120);
    expect(geometry.summaryLines).toBeLessThanOrEqual(3);
  } else {
    expect(geometry.columnCount).toBe(1);
    expect(geometry.detailWidth).toBeGreaterThanOrEqual(geometry.rowWidth - 1);
  }
  await expectNoHorizontalOverflow(page);
});

test('friends renders validated configuration records as native anchors', async ({ page }) => {
  let releaseScript = () => {};
  let markScriptStarted = () => {};
  const scriptStarted = new Promise<void>((resolve) => {
    markScriptStarted = resolve;
  });
  const release = new Promise<void>((resolve) => {
    releaseScript = resolve;
  });
  await page.route(/TerminalHome.*\.js$/u, async (route) => {
    markScriptStarted();
    await release;
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'commit' });
  await scriptStarted;

  const friendWithDescription = {
    name: 'Example <docs>',
    desc: 'A useful <description>',
    url: 'https://example.test/?from=terminal'
  };
  const friendWithoutDescription = {
    name: 'Plain example',
    url: 'https://plain.example.test/'
  };
  const friendLinks: Array<{ name: string; desc?: string; url: string }> = [friendWithDescription, friendWithoutDescription];
  await page.locator('[data-terminal-fallback] nav').evaluate((nav, friends) => {
    const group = nav.querySelector<HTMLElement>('[aria-labelledby="terminal-friends-heading"]');
    if (group === null) throw new Error('friend recovery group is missing');
    for (const existing of group.querySelectorAll('[data-terminal-friend]')) existing.remove();
    const list = document.createElement('ul');
    list.className = 'terminal-entry-list';
    for (const friend of friends) {
      const item = document.createElement('li');
      item.className = 'terminal-entry-row terminal-entry-row--friend';
      item.dataset.terminalFriend = '';
      item.dataset.terminalFriendName = friend.name;
      if (friend.desc !== undefined) item.dataset.terminalFriendDesc = friend.desc;
      item.dataset.terminalFriendUrl = friend.url;
      const link = document.createElement('a');
      link.href = friend.url;
      link.textContent = friend.name;
      const desc = document.createElement('span');
      desc.className = 'terminal-entry-title';
      desc.textContent = friend.desc ?? '';
      const url = document.createElement('span');
      url.className = 'terminal-link-url';
      url.textContent = friend.url;
      item.append(link, desc, url);
      list.append(item);
    }
    group.append(list);
  }, friendLinks);
  const recoveryRows = page.locator('[data-terminal-fallback] [data-terminal-friend]');
  await expect(recoveryRows).toHaveCount(friendLinks.length);
  await expect(recoveryRows.nth(0).locator('a')).toHaveText(friendWithDescription.name);
  await expect(recoveryRows.nth(0).locator('a')).toHaveAttribute('href', friendWithDescription.url);
  await expect(recoveryRows.nth(0).locator('.terminal-entry-title')).toHaveText(friendWithDescription.desc);
  await expect(recoveryRows.nth(0).locator('.terminal-link-url')).toHaveText(friendWithDescription.url);
  await expect(recoveryRows.nth(1).locator('a')).toHaveText(friendWithoutDescription.name);
  await expect(recoveryRows.nth(1).locator('a')).toHaveAttribute('href', friendWithoutDescription.url);
  expect(await recoveryRows.nth(1).locator('.terminal-entry-title').textContent()).toBe('');
  await expect(recoveryRows.nth(1).locator('.terminal-link-url')).toHaveText(friendWithoutDescription.url);
  releaseScript();

  await expect(page.getByRole('textbox', { name: terminalPromptName() })).toBeVisible();
  const transcript = page.locator('[data-terminal-transcript]');
  await submit(page, 'friends');
  const record = transcript.locator('.terminal-record').last();
  const friendRows = record.locator('.terminal-entry-row--friend');
  await expect(friendRows).toHaveCount(friendLinks.length);
  const friendGrid = await friendRows.evaluateAll((rows) => rows.map((row) => ({
    display: getComputedStyle(row).display,
    columns: getComputedStyle(row).gridTemplateColumns
  })));
  expect(new Set(friendGrid.map(({ display }) => display))).toEqual(new Set(['grid']));
  expect(new Set(friendGrid.map(({ columns }) => columns)).size).toBe(1);
  expect(friendGrid[0].columns.split(/\s+/u)).toHaveLength(await page.evaluate(() => window.innerWidth <= 640 ? 1 : 3));
  await expect(friendRows.nth(0).locator('a')).toHaveText(friendWithDescription.name);
  await expect(friendRows.nth(0).locator('a')).toHaveAttribute('href', friendWithDescription.url);
  await expect(friendRows.nth(0).locator('.terminal-entry-title')).toHaveText(friendWithDescription.desc);
  await expect(friendRows.nth(0).locator('.terminal-link-url')).toHaveText(friendWithDescription.url);
  await expect(friendRows.nth(1).locator('a')).toHaveText(friendWithoutDescription.name);
  await expect(friendRows.nth(1).locator('a')).toHaveAttribute('href', friendWithoutDescription.url);
  expect(await friendRows.nth(1).locator('.terminal-entry-title').textContent()).toBe('');
  await expect(friendRows.nth(1).locator('.terminal-link-url')).toHaveText(friendWithoutDescription.url);
  await expectNoHorizontalOverflow(page);
});

test('ls and tree entries expose document links and safe directory cd links', async ({ page }) => {
  await page.goto('/');
  const transcript = page.locator('[data-terminal-transcript]');

  await submit(page, 'ls ~/blog/posts');
  const lsListing = transcript.locator('.terminal-record').last().locator('.terminal-entry-list');
  const lsDirectory = lsListing.getByRole('link', { name: 'ai/' });
  await expect(lsDirectory).toHaveAttribute('href', '/posts/ai/');
  await expect(lsDirectory).toHaveAttribute('data-terminal-cd-path', '/posts/ai');
  await lsDirectory.click();
  await expect(page.locator('.terminal-command-row .terminal-prompt')).toHaveText(terminalPrompt('~/blog/posts/ai'));
  await expect(transcript.locator('.terminal-command-line').last()).toContainText('cd ~/blog/posts/ai/');
  await expect(page).toHaveURL(/\/$/u);

  await submit(page, 'cd ~/blog');
  await submit(page, 'tree ~/blog');
  const tree = transcript.locator('.terminal-record').last().locator('.terminal-tree');
  await expect(tree.getByRole('link', { name: 'posts/' })).toHaveAttribute('href', '/posts/');
  const treeDirectory = tree.getByRole('link', { name: 'ai/' });
  await treeDirectory.focus();
  await treeDirectory.press('Enter');
  await expect(page.locator('.terminal-command-row .terminal-prompt')).toHaveText(terminalPrompt('~/blog/posts/ai'));
  await expect(transcript.locator('.terminal-command-line').last()).toContainText('cd ~/blog/posts/ai/');
});

test('find results expose canonical keyboard-accessible document links while pipes stay text', async ({ page }) => {
  await page.goto('/');
  const transcript = page.locator('[data-terminal-transcript]');

  await submit(page, 'find llm-workflow');
  const postRecord = transcript.locator('.terminal-record').last();
  const postLink = postRecord.getByRole('link', { name: 'ai/llm-workflow-with-trellis.md' });
  await expect(postLink).toHaveAttribute('href', '/posts/ai/llm-workflow-with-trellis/');
  await expect(postRecord).toContainText('ai/llm-workflow-with-trellis.md');
  await expect(postRecord).toContainText('2026-05-28');
  await expect(postRecord).toContainText('llm-workflow-with-trellis');
  await postLink.focus();
  await expect(postLink).toBeFocused();
  await postLink.press('Enter');
  await expect(page).toHaveURL(/\/posts\/ai\/llm-workflow-with-trellis\/$/u);

  await page.goto('/');
  await submit(page, 'find about');
  const pageRecord = transcript.locator('.terminal-record').last();
  const pageLink = pageRecord.getByRole('link', { name: '/pages/about.md' });
  await expect(pageLink).toHaveAttribute('href', '/pages/about/');
  await pageLink.focus();
  await expect(pageLink).toBeFocused();

  await page.goto('/');
  await submit(page, 'find llm-workflow | cat');
  const pipedRecord = transcript.locator('.terminal-record').last();
  await expect(pipedRecord.getByRole('link')).toHaveCount(0);
  await expect(pipedRecord).toContainText('ai/llm-workflow-with-trellis.md — 2026-05-28 — llm-workflow-with-trellis');
});

test('user aliases are session-local and disappear after refresh', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: terminalPromptName() });
  const transcript = page.locator('[data-terminal-transcript]');

  await submit(page, 'alias la=ls');
  await expect(transcript.locator('.terminal-record').last()).toContainText('la=ls');
  await submit(page, 'la ai/llm-workflow-with-trellis.md');
  await expect(transcript.locator('.terminal-entry-list').last().locator('.terminal-entry-row--document')).toHaveCount(1);
  await submit(page, 'help');
  await expect(transcript.locator('.terminal-record').last()).toContainText('la');

  await page.reload();
  await submit(page, 'la');
  await expect(transcript.locator('.terminal-record').last()).toContainText('Unknown command: la');
  await expect(input).toBeFocused();
});

test('open navigates only to the validated listed experiment destination', async ({ page }) => {
  await page.goto('/');
  const input = page.locator('#terminal-command');
  await submit(page, 'cd ~/blog/lab');
  await submit(page, 'ls');
  await input.fill('open n');
  await input.press('Tab');
  await expect(input).toHaveValue('open nerv');
  await expect(input).toBeFocused();
  await input.fill('open /lab/nerv');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/$/u);
  await expect(input).toBeFocused();
  await input.fill('open lab/nerv');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/$/u);
  await expect(input).toBeFocused();
  await input.fill('open nerv');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/lab\/nerv\/$/u);

  await page.goto('/');
  await submit(page, 'cd ~/blog/lab');
  await submit(page, 'open ./nerv');
  await expect(page).toHaveURL(/\/lab\/nerv\/$/u);

  await page.goto('/');
  await submit(page, 'cd ~/blog/pages');
  await submit(page, 'open ~/blog/lab/nerv');
  await expect(page).toHaveURL(/\/lab\/nerv\/$/u);
});

test('rshell updates its prompt and keeps pipes, scratch, and grep inside public session resources', async ({ page }) => {
  await page.goto('/');
  const input = page.locator('#terminal-command');
  const transcript = page.locator('[data-terminal-transcript]');

  await submit(page, 'cd ~/blog/pages');
  await expect(page.getByRole('textbox', { name: terminalPromptName('~/blog/pages') })).toBeVisible();
  await expect(page.locator('.terminal-command-row .terminal-prompt')).toHaveText(terminalPrompt('~/blog/pages'));

  await submit(page, 'cat about.md | grep -in about');
  await expect(transcript.locator('.terminal-record').last()).toContainText('About');
  await expect(transcript.locator('[data-terminal-stream-document]')).toHaveCount(0);
  await submit(page, 'cd ~/blog/posts');
  await submit(page, 'cat ai/llm-workflow-with-trellis.md | grep a');
  const pipedGrep = transcript.locator('.terminal-record').last();
  await expect(pipedGrep.locator('.terminal-grep-line mark').first()).toHaveText('a');
  await submit(page, 'grep -inF about ~/blog/pages/about.md');
  await expect(transcript.locator('.terminal-grep-match').last()).toContainText('/pages/about.md:');
  await expect(transcript.locator('.terminal-grep-line mark').last()).toHaveText('About');
  await submit(page, 'grep about -i ~/blog/pages/about.md');
  await expect(transcript.locator('.terminal-grep-line mark').last()).toHaveText('About');
  await submit(page, 'grep -F definitely-not-in-the-public-corpus');
  await expect(transcript.locator('.terminal-grep-summary').last()).toHaveText('No matches for "definitely-not-in-the-public-corpus".');
  await submit(page, 'grep -nF "build" ~/blog/posts/ai/llm-workflow-with-trellis.md');
  const sourceMatches = transcript.locator('.terminal-record').last().locator('.terminal-grep-line');
  await expect.poll(async () => sourceMatches.count()).toBeGreaterThan(1);
  expect((await sourceMatches.allTextContents()).every((line) => line.length < 5000)).toBe(true);

  await submit(page, 'whoami > ~/blog/.rshell/tmp/identity.txt');
  await expect(transcript.locator('.terminal-record').last()).toContainText('Wrote 1 line to ~/blog/.rshell/tmp/identity.txt.');
  await submit(page, 'cat ~/blog/.rshell/tmp/identity.txt');
  await expect(transcript.locator('.terminal-record').last()).toContainText('guest');

  await submit(page, 'grep secret /etc/passwd');
  await expect(transcript.locator('.terminal-record').last()).toContainText('grep can search only listed public documents or ~/blog/.rshell/tmp scratch files.');
  await expect(page.locator('[data-terminal-failure]')).toBeHidden();
  await expect(input).toBeFocused();
});

test('history preserves a draft and clear returns a fresh prompt with history intact', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: terminalPromptName() });
  const transcript = page.locator('[data-terminal-transcript]');
  const completion = page.locator('[data-terminal-completion]');

  await submit(page, 'pwd');
  await submit(page, 'whoami');
  await input.fill('unfinished');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('whoami');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('pwd');
  await input.press('ArrowDown');
  await input.press('ArrowDown');
  await expect(input).toHaveValue('unfinished');

  await input.fill('ls ~/blog/p');
  await input.press('Tab');
  await expect(completion.getByRole('option')).toHaveText(['~/blog/pages/', '~/blog/posts/']);
  await input.focus();
  await submit(page, 'history');
  await expect(transcript).toContainText('history');
  await submit(page, 'clear');
  await expect(transcript).toBeEmpty();
  await expect(completion).toBeEmpty();
  await expect(input).toHaveValue('');
  await expect(input).toBeFocused();
  await input.press('ArrowUp');
  await expect(input).toHaveValue('clear');
  await expect(page.locator('[data-terminal-fallback]')).toBeHidden();
});

test('clear, cls, and Ctrl+L center the empty-session prompt without overflow', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: terminalPromptName() });
  const session = page.locator('[data-terminal-session]');
  const transcript = page.locator('[data-terminal-transcript]');

  for (const clearAction of ['clear', 'cls'] as const) {
    await submit(page, 'pwd');
    await submit(page, clearAction);
    await expect(transcript).toBeEmpty();
    await expect(session).toHaveAttribute('data-terminal-session-empty', '');
    await expectCenteredEmptySession(page);
  }

  await submit(page, 'pwd');
  await input.press('Control+L');
  await expect(transcript).toBeEmpty();
  await expect(session).toHaveAttribute('data-terminal-session-empty', '');
  await expectCenteredEmptySession(page);

  await submit(page, 'pwd');
  await expect(session).not.toHaveAttribute('data-terminal-session-empty');
  await expect(transcript).not.toBeEmpty();
});

test('tall desktop keeps startup, output, and clear in one reading band', async ({ page }) => {
  await page.setViewportSize({ width: 2048, height: 1244 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const input = page.getByRole('textbox', { name: terminalPromptName() });
  const session = page.locator('[data-terminal-session]');
  await expect(input).toBeVisible();
  await expect(session).toHaveAttribute('data-terminal-session-initial', '');
  const startup = await page.locator('[data-terminal-session] .terminal-command-row').evaluate((row) => {
    const rect = row.getBoundingClientRect();
    return { center: (rect.top + rect.bottom) / 2, viewportHeight: window.innerHeight };
  });
  expect(Math.abs(startup.center - startup.viewportHeight / 2)).toBeLessThan(96);

  await submit(page, 'pwd');
  const short = await readCommandBandGeometry(page);
  expect(short.sessionInitial).toBe(false);
  expect(short.recordTop).toBeGreaterThanOrEqual(0);
  expect(short.rowBottom).toBeLessThanOrEqual(short.viewportHeight);
  expect(Math.abs(short.bandCenter - short.viewportHeight / 2)).toBeLessThan(48);

  await submit(page, 'grep -nF a ~/blog/posts/ai/llm-workflow-with-trellis.md');
  const long = await readCommandBandGeometry(page);
  expect(long.sessionInitial).toBe(false);
  expect(long.scrollHeight).toBeGreaterThan(long.viewportHeight);
  expect(long.rowTop).toBeGreaterThanOrEqual(0);
  expect(long.rowBottom).toBeLessThanOrEqual(long.viewportHeight);
  expect(long.recordTop).toBeLessThan(long.rowTop);

  await submit(page, 'clear');
  await expect(session).toHaveAttribute('data-terminal-session-empty', '');
  await expect(session).not.toHaveAttribute('data-terminal-session-initial');
  await expectCenteredEmptySession(page);
});

test('Ctrl+L clears the transcript without consuming command history and cls aliases clear', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: terminalPromptName() });
  const transcript = page.locator('[data-terminal-transcript]');

  await submit(page, 'pwd');
  await input.press('Control+L');
  await expect(transcript).toBeEmpty();
  await expect(input).toHaveValue('');
  await expect(input).toBeFocused();
  await input.press('ArrowUp');
  await expect(input).toHaveValue('pwd');
  await input.fill('cls');
  await input.press('Enter');
  await expect(transcript).toBeEmpty();
  await expect(input).toBeFocused();
});

test('Control+C cancels only the current prompt and completion state', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: terminalPromptName() });
  const transcript = page.locator('[data-terminal-transcript]');
  const completion = page.locator('[data-terminal-completion]');
  await submit(page, 'pwd');
  await submit(page, 'whoami');
  await input.fill('unfinished');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('whoami');
  await input.fill('vim ./');
  await input.press('Tab');
  await expect(completion.getByRole('option')).toHaveText(['./acg/', './ai/', './android/', './apps/', './dev/', './essays/', './infra/', './learning/', './security/']);
  await expect(input).toBeFocused();
  const modifiedVariants = await input.evaluate((element) => [
    { altKey: true, ctrlKey: true },
    { ctrlKey: true, metaKey: true },
    { ctrlKey: true, shiftKey: true }
  ].map((modifiers) => element.dispatchEvent(new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key: 'c',
    ...modifiers
  }))));
  expect(modifiedVariants).toEqual([true, true, true]);
  await expect(input).toHaveValue('vim ./');
  await expect(completion.getByRole('option')).toHaveText(['./acg/', './ai/', './android/', './apps/', './dev/', './essays/', './infra/', './learning/', './security/']);
  await input.press('Control+c');
  await expect(input).toHaveValue('');
  await expect(input).toBeFocused();
  await expect(completion).toBeEmpty();
  await expect(page.locator('[data-terminal-announcer]')).toHaveText('Command cancelled.');
  await expect(transcript.locator('.terminal-record')).toHaveCount(3);
  await input.press('ArrowUp');
  await expect(input).toHaveValue('whoami');
  await input.press('ArrowDown');
  await expect(input).toHaveValue('');
});

test('the prompt owns unmodified Tab while completion only rewrites safe matches', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: terminalPromptName() });
  await input.focus();
  await input.fill('hel');
  await input.press('Tab');
  await expect(input).toHaveValue('help ');
  await expect(input).toBeFocused();

  await input.fill('ls ');
  await input.press('Tab');
  await expect(input).toHaveValue('ls ');
  await expect(input).toBeFocused();
  await expect(page.getByRole('listbox', { name: 'Completion candidates' })).toBeVisible();

  await input.fill('ls ~/blog/p');
  await input.press('Tab');
  await expect(input).toHaveValue('ls ~/blog/p');
  await expect(page.getByRole('option')).toHaveText(['~/blog/pages/', '~/blog/posts/']);
  await expect(input).toBeFocused();

  await input.focus();
  for (const ambiguous of ['cat ./', 'vim ./', 'cat ~/blog/', 'vim ~/blog/']) {
    await input.fill(ambiguous);
    await input.press('Tab');
    await expect(input).toBeFocused();
    await expect(page.getByRole('listbox', { name: 'Completion candidates' })).toBeVisible();
  }

  for (const noMatch of ['cat 1', 'vim ./does-not-exist']) {
    await input.fill(noMatch);
    await input.press('Tab');
    await expect(input).toHaveValue(noMatch);
    await expect(input).toBeFocused();
    await expect(page.locator('[data-terminal-completion]')).toHaveText('No matches.');
  }

  await input.fill('cat ai/llm-w');
  await input.press('Tab');
  await expect(input).toHaveValue('cat ai/llm-workflow-with-trellis.md');

  await input.fill('cat ai');
  await input.press('Tab');
  await expect(input).toHaveValue('cat ai/');
  await input.fill('vim ~/blog/pages/abo');
  await input.press('Tab');
  await expect(input).toHaveValue('vim ~/blog/pages/about.md');

  await input.fill('cat ./ai/llm-w');
  await input.press('Tab');
  await expect(input).toHaveValue('cat ./ai/llm-workflow-with-trellis.md');
  await expect(input).toBeFocused();

  for (const unsafe of ['cat ../ai/llm-w', 'cat ./nested/../ai/llm-w', 'cat /ai/llm-w', 'cat /posts/does-not-exist', 'cat https://example.com/llm-w', 'cat /etc/pass', 'cat ~', 'cat ~/', 'cat cafe\u0301.md', 'cat control\u0001path']) {
    await input.fill(unsafe);
    await input.press('Tab');
    await expect(input).toHaveValue(unsafe);
    await expect(input).toBeFocused();
  }

  const modifiedTabResults = await input.evaluate((element) => [
    { shiftKey: true },
    { ctrlKey: true },
    { metaKey: true },
    { altKey: true }
  ].map((modifiers) => element.dispatchEvent(new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key: 'Tab',
    ...modifiers
  }))));
  expect(modifiedTabResults).toEqual([true, true, true, true]);

  await input.fill('open ~/blog/lab/n');
  await input.press('Tab');
  await expect(input).toHaveValue('open ~/blog/lab/nerv');
});

test('ambiguous completion exposes a vertical active list and commits before submission', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: terminalPromptName() });
  const transcript = page.locator('[data-terminal-transcript]');

  await input.fill('c');
  await input.press('Tab');
  await expect(input).toHaveValue('c');
  const list = page.getByRole('listbox', { name: 'Completion candidates' });
  await expect(list).toBeVisible();
  await expect(list.getByRole('option')).toHaveText(['cat', 'cd', 'clear', 'cls']);
  await expect(input).toHaveAttribute('aria-controls', 'terminal-transcript terminal-completion-list');
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await expect(input).not.toHaveAttribute('aria-activedescendant');
  expect(await list.evaluate((element) => getComputedStyle(element).display)).toBe('grid');

  await input.press('ArrowDown');
  await expect(input).toHaveValue('c');
  await expect(list.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
  await input.press('ArrowUp');
  await expect(list.getByRole('option').last()).toHaveAttribute('aria-selected', 'true');
  await input.press('ArrowDown');
  await expect(list.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');

  await input.fill('c');
  await input.press('Tab');
  await expect(input).not.toHaveAttribute('aria-activedescendant');
  const modifiedArrowResults = await input.evaluate((element) => [
    { ctrlKey: true },
    { altKey: true },
    { metaKey: true },
    { shiftKey: true }
  ].map((modifiers) => element.dispatchEvent(new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key: 'ArrowDown',
    ...modifiers
  }))));
  expect(modifiedArrowResults).toEqual([true, true, true, true]);
  await expect(input).toHaveValue('c');
  await expect(input).not.toHaveAttribute('aria-activedescendant');
  await expect(list).toBeVisible();
  await input.press('Tab');
  await expect(list.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
  await expect(input).toHaveAttribute('aria-activedescendant', 'terminal-completion-option-0');
  await input.press('Tab');
  await expect(list.getByRole('option').nth(1)).toHaveAttribute('aria-selected', 'true');
  await input.press('Tab');
  await input.press('Tab');
  await input.press('Tab');
  await expect(list.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
  await input.press('Enter');
  await expect(input).toHaveValue('cat ');
  await expect(list).toHaveCount(0);
  await expect(transcript.locator('.terminal-record')).toHaveCount(1);
  await input.press('Enter');
  await expect(transcript.locator('.terminal-record')).toHaveCount(2);

  await input.fill('cd ');
  await input.press('Tab');
  await input.press('Tab');
  const firstDirectory = await page.getByRole('option').first().textContent();
  expect(firstDirectory).not.toBeNull();
  await input.press(' ');
  await expect(input).toHaveValue(`cd ${firstDirectory ?? ''}`);
  await expect(page.getByRole('listbox', { name: 'Completion candidates' })).toHaveCount(0);
  await expect(transcript.locator('.terminal-record')).toHaveCount(2);

  await input.fill('c');
  await input.press('Tab');
  await input.press('Escape');
  await expect(input).toHaveValue('c');
  await expect(input).toHaveAttribute('aria-controls', 'terminal-transcript');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('listbox', { name: 'Completion candidates' })).toHaveCount(0);

  await input.fill('abcdef');
  await input.press('Control+a');
  expect(await input.evaluate((element) => {
    const control = element as HTMLInputElement;
    return [control.selectionStart, control.selectionEnd];
  })).toEqual([0, 6]);
  await input.press('Control+e');
  expect(await input.evaluate((element) => {
    const control = element as HTMLInputElement;
    return [control.selectionStart, control.selectionEnd];
  })).toEqual([6, 6]);
  await input.evaluate((element) => (element as HTMLInputElement).setSelectionRange(3, 3));
  await input.press('Control+u');
  await expect(input).toHaveValue('def');
  await expect(input).toBeFocused();
  expect(await input.evaluate((element) => {
    const control = element as HTMLInputElement;
    return [control.selectionStart, control.selectionEnd];
  })).toEqual([0, 0]);

  await input.fill('native-boundary');
  const nativeShortcutResults = await input.evaluate((element) => [
    { key: 'a', ctrlKey: true, altKey: true },
    { key: 'e', ctrlKey: true, metaKey: true },
    { key: 'u', ctrlKey: true, shiftKey: true },
    { key: 'w', ctrlKey: true },
    { key: 'r', ctrlKey: true },
    { key: 't', ctrlKey: true },
    { key: 'Escape', altKey: true },
    { key: 'Enter', metaKey: true },
    { key: ' ', shiftKey: true }
  ].map((init) => element.dispatchEvent(new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init
  }))));
  expect(nativeShortcutResults).toEqual([true, true, true, true, true, true, true, true, true]);
  await expect(input).toHaveValue('native-boundary');
  await expectNoHorizontalOverflow(page);
});

test('IME composition leaves text controls native while prompt Tab remains owned', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: terminalPromptName() });
  await submit(page, 'pwd');
  await input.fill('about');

  const dispatchResults = await input.evaluate((element) => {
    element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    const results = ['Enter', ' ', 'Escape', 'ArrowUp', 'ArrowDown', 'Tab', 'c', 'a', 'e', 'u'].map((key) =>
      element.dispatchEvent(new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        ctrlKey: ['c', 'a', 'e', 'u'].includes(key),
        isComposing: true,
        key
      }))
    );
    return results;
  });
  expect(dispatchResults).toEqual([true, true, true, true, true, true, true, true, true, true]);
  await expect(input).toHaveValue('about');
  await expect(page.locator('[data-terminal-transcript] .terminal-record')).toHaveCount(2);

  await input.dispatchEvent('compositionend');
  await input.press('Enter');
  await expect(page.locator('[data-terminal-transcript]')).toContainText('A personal space for notes, experiments, and technical things I don\'t want to figure out twice.');
});

test('native Enter submission works at desktop and mobile viewport contracts', async ({ page }) => {
  await page.goto('/');
  await submit(page, 'about');
  await expect(page.locator('[data-terminal-transcript]')).toContainText('A personal space for notes, experiments, and technical things I don\'t want to figure out twice.');
  await expect(page.getByRole('textbox', { name: terminalPromptName() })).toBeFocused();
});

test('short output settles the active prompt and document output settles its reading start', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: terminalPromptName() });
  for (let index = 0; index < 12; index += 1) {
    await submit(page, 'help');
  }
  await expect(input).toBeFocused();
  const lastHelp = page.locator('[data-terminal-transcript] .terminal-record').last();
  await expect(lastHelp.getByRole('heading', { level: 2, name: 'Session' })).toBeVisible();
  await expect(lastHelp.getByText('show this command list')).toBeVisible();
  await expectInViewport(input, 0, 1);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await submit(page, 'help');
  const reducedHelp = page.locator('[data-terminal-transcript] .terminal-record').last();
  await expect(reducedHelp.getByRole('heading', { level: 2, name: 'Session' })).toBeVisible();
  await expect(reducedHelp.getByText('show this command list')).toBeVisible();
  await expectInViewport(input, 0, 1);

  await submit(page, 'cat ./ai/llm-workflow-with-trellis.md');
  const title = page
    .locator('[data-terminal-stream-document]')
    .last()
    .getByRole('heading', { level: 2, name: 'llm-workflow-with-trellis' });
  await expect(title).toBeFocused();
  await expectInViewport(title, 0, 0.35);
});

test('eligible printable typing returns to the prompt while protected interactions stay native', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: terminalPromptName() });
  await submit(page, 'cat ai/llm-workflow-with-trellis.md');
  const streamedDocument = page.locator('[data-terminal-stream-document]').last();
  const title = streamedDocument.getByRole('heading', { level: 2, name: 'llm-workflow-with-trellis' });
  await expect(title).toBeFocused();

  await page.keyboard.press('x');
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('x');

  for (const key of ['Space', 'Tab', 'Enter', 'Escape', 'ArrowDown', 'Control+k', 'Meta+k', 'Shift+x']) {
    await input.fill('safe');
    await title.focus();
    await page.keyboard.press(key);
    await expect(input).toHaveValue('safe');
  }

  const link = streamedDocument.getByRole('link', { name: 'permalink' });
  await input.fill('link-safe');
  await link.focus();
  await page.keyboard.press('q');
  await expect(link).toBeFocused();
  await expect(input).toHaveValue('link-safe');

  const wide = streamedDocument.getByRole('region', { name: /^Code content:/u }).first();
  await wide.focus();
  await page.keyboard.press('z');
  await expect(wide).toBeFocused();
  await expect(input).toHaveValue('link-safe');

  await streamedDocument.evaluate((document) => {
    const control = document.ownerDocument.createElement('div');
    control.dataset.testAriaControl = '';
    control.setAttribute('role', 'checkbox');
    control.setAttribute('aria-label', 'Test ARIA control');
    control.setAttribute('aria-checked', 'false');
    control.tabIndex = 0;
    document.append(control);
  });
  const ariaControl = streamedDocument.getByRole('checkbox', { name: 'Test ARIA control' });
  await ariaControl.focus();
  await page.keyboard.press('c');
  await expect(ariaControl).toBeFocused();
  await expect(input).toHaveValue('link-safe');

  await title.focus();
  await page.evaluate(() => {
    const paragraph = document.querySelector<HTMLElement>('.terminal-stream-prose p');
    const selection = window.getSelection();
    if (paragraph === null || selection === null || paragraph.firstChild === null) {
      throw new Error('Missing selection fixture.');
    }
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.keyboard.press('r');
  await expect(input).toHaveValue('link-safe');
  await page.evaluate(() => window.getSelection()?.removeAllRanges());

  const compositionDispatch = await title.evaluate((element) => {
    element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    const result = element.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      isComposing: true,
      key: '文'
    }));
    element.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    return result;
  });
  expect(compositionDispatch).toBe(true);
  await expect(input).toHaveValue('link-safe');
});

test('firefly theme and official JetBrains Mono assets stay same-origin', async ({ page }) => {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== 'http://127.0.0.1:4321') {
      externalRequests.push(request.url());
    }
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-terminal-theme', 'firefly');
  const styles = await page.locator('.terminal-root').evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      canvas: computed.getPropertyValue('--terminal-color-canvas').trim(),
      command: computed.getPropertyValue('--terminal-color-command').trim(),
      family: computed.fontFamily
    };
  });
  expect(styles.canvas).not.toBe('');
  expect(styles.command).not.toBe('');
  expect(styles.family).toContain('JetBrains Mono');
  const loadedFaces = await page.evaluate(async () => {
    const regular = await document.fonts.load('400 16px "JetBrains Mono"');
    const medium = await document.fonts.load('500 16px "JetBrains Mono"');
    return { regular: regular.length, medium: medium.length };
  });
  expect(loadedFaces.regular).toBeGreaterThan(0);
  expect(loadedFaces.medium).toBeGreaterThan(0);
  expect(externalRequests).toEqual([]);
  expect((await page.request.get('/fonts/JetBrainsMono-Regular-v2.304.woff2')).status()).toBe(200);
  expect((await page.request.get('/fonts/JetBrainsMono-Medium-v2.304.woff2')).status()).toBe(200);
  expect((await page.request.get('/licenses/JetBrainsMono-OFL-1.1.txt')).status()).toBe(200);
  expect((await page.request.get('/licenses/JetBrainsMono-PROVENANCE.txt')).status()).toBe(200);
});

test('cat appends trusted inline documents without navigation and scopes repeated IDs', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const template = [...document.querySelectorAll<HTMLTemplateElement>('[data-terminal-template]')]
      .find((candidate) => candidate.dataset.terminalTemplatePath === 'posts/ai/llm-workflow-with-trellis.md');
    const article = template?.content.querySelector<HTMLElement>('[data-terminal-stream-document]');
    const firstHeading = article?.querySelector<HTMLElement>('[id="install"]');
    const firstHeader = article?.querySelector<HTMLElement>('th');
    const firstCell = article?.querySelector<HTMLElement>('td');
    if (
      article === undefined ||
      article === null ||
      firstHeading === undefined ||
      firstHeading === null ||
      firstHeader === undefined ||
      firstHeader === null ||
      firstCell === undefined ||
      firstCell === null
    ) {
      throw new Error('Missing scoping fixture targets.');
    }
    const localLink = document.createElement('a');
    localLink.dataset.scopedLink = '';
    localLink.href = '#install';
    localLink.textContent = 'local install section';
    const label = document.createElement('label');
    label.dataset.scopedLabel = '';
    label.htmlFor = 'scoped-field';
    label.textContent = 'Scoped field';
    const field = document.createElement('input');
    field.id = 'scoped-field';
    field.dataset.scopedField = '';
    const labelled = document.createElement('div');
    labelled.dataset.scopedLabelled = '';
    labelled.setAttribute('aria-labelledby', 'install scoped-field external-label');
    const externalFragment = document.createElement('a');
    externalFragment.dataset.externalFragment = '';
    externalFragment.href = '/posts/ai/llm-workflow-with-trellis/#install';
    externalFragment.textContent = 'external install fragment';
    firstHeader.id = 'scoped-column';
    firstCell.dataset.scopedCell = '';
    firstCell.setAttribute('headers', 'scoped-column');
    article.append(localLink, label, field, labelled, externalFragment);
  });
  await submit(page, 'cat ai/llm-workflow-with-trellis.md');

  await expect(page).toHaveURL(/\/$/u);
  const documents = page.locator('[data-terminal-stream-document]');
  await expect(documents).toHaveCount(1);
  const first = documents.first();
  const title = first.getByRole('heading', { level: 2, name: 'llm-workflow-with-trellis' });
  await expect(title).toBeVisible();
  await expect(title).toBeFocused();
  await expect(first.getByRole('link', { name: 'permalink' })).toHaveAttribute('href', '/posts/ai/llm-workflow-with-trellis/');
  await expect(first.getByRole('link', { name: 'Return to prompt' })).toHaveCount(0);
  await expect(first.locator('[data-scoped-link]')).toHaveAttribute('href', '#terminal-output-1-install');
  await expect(first.locator('[data-scoped-label]')).toHaveAttribute('for', 'terminal-output-1-scoped-field');
  await expect(first.locator('[data-scoped-field]')).toHaveAttribute('id', 'terminal-output-1-scoped-field');
  await expect(first.locator('[data-scoped-cell]')).toHaveAttribute('headers', 'terminal-output-1-scoped-column');
  await expect(first.locator('[data-scoped-labelled]')).toHaveAttribute(
    'aria-labelledby',
    'terminal-output-1-install terminal-output-1-scoped-field external-label'
  );
  await expect(first.locator('[data-external-fragment]')).toHaveAttribute(
    'href',
    '/posts/ai/llm-workflow-with-trellis/#install'
  );
  await expect(first.getByRole('region', { name: /^Code content:/u }).first()).toHaveAttribute('tabindex', '0');
  await expect(first.getByRole('region', { name: /^Table content:/u }).first()).toHaveAttribute('tabindex', '0');
  await expect(page.locator('[data-terminal-announcer]')).toHaveText('Rendered llm-workflow-with-trellis.');
  const longDocumentGeometry = await page.evaluate(() => {
    window.scrollTo(0, 0);
    const record = document.querySelector<HTMLElement>('[data-terminal-transcript] .terminal-record');
    const article = document.querySelector<HTMLElement>('[data-terminal-stream-document]');
    return {
      articleRight: article?.getBoundingClientRect().right ?? Number.POSITIVE_INFINITY,
      recordTop: record?.getBoundingClientRect().top ?? -1,
      scrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth
    };
  });
  expect(longDocumentGeometry.recordTop).toBeGreaterThanOrEqual(0);
  expect(longDocumentGeometry.articleRight).toBeLessThanOrEqual(longDocumentGeometry.viewportWidth);
  expect(longDocumentGeometry.scrollHeight).toBeGreaterThan(longDocumentGeometry.viewportHeight);

  await submit(page, 'cat ai/llm-workflow-with-trellis.md');
  await expect(documents).toHaveCount(2);
  const identityEvidence = await page.evaluate(() => {
    const ids = [...document.querySelectorAll<HTMLElement>('[id]')].map((element) => element.id);
    const articles = [...document.querySelectorAll<HTMLElement>('[data-terminal-stream-document]')];
    return {
      ids,
      labelledBy: articles.map((article) => article.getAttribute('aria-labelledby')),
      returnControls: articles.map((article) => article.querySelectorAll('[data-terminal-return]').length),
      permalinks: articles.map((article) => article.querySelector('.terminal-stream-permalink')?.getAttribute('href'))
    };
  });
  expect(new Set(identityEvidence.ids).size).toBe(identityEvidence.ids.length);
  expect(identityEvidence.labelledBy).toHaveLength(2);
  expect(new Set(identityEvidence.labelledBy).size).toBe(2);
  for (const id of identityEvidence.labelledBy) {
    expect(id).not.toBeNull();
    expect(identityEvidence.ids).toContain(id ?? '');
  }
  expect(identityEvidence.returnControls).toEqual([0, 0]);
  expect(identityEvidence.permalinks).toEqual([
    '/posts/ai/llm-workflow-with-trellis/',
    '/posts/ai/llm-workflow-with-trellis/'
  ]);
  await expectNoHorizontalOverflow(page);
});

test('cat respects semantic and page adapter output in the home stream', async ({ page }) => {
  await page.goto('/');
  await submit(page, 'cat ai/llm-workflow-with-trellis.md');
  const semanticDocument = page.locator('[data-terminal-stream-document]').first();
  await expect(semanticDocument.getByRole('heading', { level: 2, name: 'llm-workflow-with-trellis' })).toBeFocused();
  await expect(semanticDocument.getByRole('heading', { level: 2, name: 'install' })).toBeVisible();
  await expect(semanticDocument.getByRole('region', { name: /^Code content:/u }).first()).toBeVisible();
  await submit(page, 'cat ~/blog/pages/about.md');
  await expect(page.getByRole('heading', { level: 2, name: 'About this foundation' })).toBeFocused();
  await expect(page.getByText('Future presentations can change how the site looks')).toBeVisible();
  const ids = await page.locator('[id]').evaluateAll((elements) =>
    elements.map((element) => element.id)
  );
  expect(new Set(ids).size).toBe(ids.length);
  await expect(page).toHaveURL(/\/$/u);
});

test('malformed startup preserves the untouched native recovery product', async ({ page }) => {
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const template = document.querySelector<HTMLTemplateElement>('[data-terminal-template]');
      if (template !== null) {
        template.dataset.terminalTemplatePath = 'posts/unknown.md';
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.goto('/');
  await expect(page.locator('[data-terminal-home]')).toHaveAttribute('data-terminal-startup-state', 'failed');
  await expect(page.getByRole('textbox', { name: terminalPromptName() })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 2, name: 'Browse public documents' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'ai/llm-workflow-with-trellis.md' })).toBeVisible();
  await expect(page.locator('[data-terminal-failure]')).toBeHidden();
});

test('a missing home controller restores recovery at DOM ready', async ({ page }) => {
  await page.addInitScript(() => {
    const tracker = window as Window & { __terminalEscapeDefaultPrevented?: boolean[] };
    tracker.__terminalEscapeDefaultPrevented = [];
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        tracker.__terminalEscapeDefaultPrevented?.push(event.defaultPrevented);
      }
    });
  });
  await page.route(/TerminalHome.*\.js$/u, (route) => route.abort());
  await page.goto('/');

  await expect(page.locator('[data-terminal-home]')).toHaveAttribute('data-terminal-startup-state', 'failed');
  await expect(page.locator('[data-terminal-startup]')).toBeHidden();
  await expect(page.getByRole('heading', { level: 2, name: 'Browse public documents' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'ai/llm-workflow-with-trellis.md' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => {
    const tracker = window as Window & { __terminalEscapeDefaultPrevented?: boolean[] };
    return tracker.__terminalEscapeDefaultPrevented ?? [];
  })).toEqual([false]);
});

test('an executable document template prevents startup without disturbing recovery', async ({ page }) => {
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const template = document.querySelector<HTMLTemplateElement>('[data-terminal-template]');
      if (template !== null) {
        template.content.append(document.createElement('script'));
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: terminalPromptName() })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 2, name: 'Browse public documents' })).toBeVisible();
  await expect(page.locator('[data-terminal-failure]')).toBeHidden();
});

test('an extra template element prevents startup without disturbing recovery', async ({ page }) => {
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const template = document.querySelector<HTMLTemplateElement>('[data-terminal-template]');
      if (template !== null) {
        template.content.append(document.createElement('aside'));
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: terminalPromptName() })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 2, name: 'Browse public documents' })).toBeVisible();
  await expect(page.locator('[data-terminal-failure]')).toBeHidden();
});

test('a template title not owned by its article prevents startup', async ({ page }) => {
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const template = document.querySelector<HTMLTemplateElement>(
        'template[data-terminal-template]'
      );
      const article = template?.content.querySelector<HTMLElement>(
        '[data-terminal-stream-document]'
      );
      if (article !== null && article !== undefined) {
        article.setAttribute('aria-labelledby', 'external-title');
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: terminalPromptName() })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 2, name: 'Browse public documents' })).toBeVisible();
  await expect(page.locator('[data-terminal-failure]')).toBeHidden();
});

test('post-start clone-scoping failure restores one focused recovery target', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const template = [...document.querySelectorAll<HTMLTemplateElement>('[data-terminal-template]')]
      .find((candidate) => candidate.dataset.terminalTemplatePath === 'pages/about.md');
    const article = template?.content.querySelector<HTMLElement>('[data-terminal-stream-document]');
    if (article === undefined || article === null) {
      throw new Error('Missing clone-scoping failure fixture.');
    }
    const first = document.createElement('span');
    const second = document.createElement('span');
    first.id = 'duplicate-clone-id';
    second.id = 'duplicate-clone-id';
    article.append(first, second);
  });
  await submit(page, 'cat ~/blog/pages/about.md');
  await expect(page.locator('[data-terminal-session]')).toBeHidden();
  await expect(page.locator('[data-terminal-home]')).toHaveAttribute('data-terminal-startup-state', 'failed');
  await expect(page.locator('[data-terminal-failure]')).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Browse public documents' })).toBeFocused();
  await expect(page.locator('[data-terminal-stream-document]')).toHaveCount(0);
});

test('post-start renderer failure restores one focused recovery target', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const original = document.createElement.bind(document);
    document.createElement = ((name: string, options?: ElementCreationOptions) => {
      if (name === 'section') {
        throw new Error('Injected renderer failure');
      }
      return original(name, options);
    }) as typeof document.createElement;
  });
  await submit(page, 'help');
  await expect(page.locator('[data-terminal-session]')).toBeHidden();
  await expect(page.locator('[data-terminal-home]')).toHaveAttribute('data-terminal-startup-state', 'failed');
  await expect(page.locator('[data-terminal-failure]')).toBeVisible();
  await expect(page.locator('[data-terminal-failure] .terminal-status-label')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'ai/llm-workflow-with-trellis.md' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: terminalPromptName() })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 2, name: 'Browse public documents' })).toBeFocused();
});

test('post-start executor failure restores the same native recovery product', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    Date.prototype.toISOString = () => {
      throw new Error('Injected executor failure');
    };
  });
  await submit(page, 'date');
  await expect(page.locator('[data-terminal-session]')).toBeHidden();
  await expect(page.locator('[data-terminal-home]')).toHaveAttribute('data-terminal-startup-state', 'failed');
  await expect(page.locator('[data-terminal-failure]')).toBeVisible();
  await expect(page.getByRole('link', { name: 'ai/llm-workflow-with-trellis.md' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Browse public documents' })).toBeFocused();
});

test('reduced motion and responsive checkpoints preserve full-page containment', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const input = page.getByRole('textbox', { name: terminalPromptName() });
  expect(await input.evaluate((element) => getComputedStyle(element).animationDuration)).toBe('1e-06s');
  const bootLine = page.locator('[data-terminal-boot-log] .terminal-boot-line').first();
  await expect(bootLine).toHaveCSS('opacity', '1');
  await expect(bootLine).toHaveCSS('animation-name', 'none');
  await submit(page, 'help');
  await expect(input).toBeFocused();
  const reducedPromptGeometry = await input.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, height: window.innerHeight };
  });
  expect(reducedPromptGeometry.top).toBeGreaterThanOrEqual(0);
  expect(reducedPromptGeometry.bottom).toBeLessThanOrEqual(reducedPromptGeometry.height);
  for (const width of [768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await expectNoHorizontalOverflow(page);
    expect(await page.locator('.terminal-command-row').evaluate((row) => row.getBoundingClientRect().width)).toBeLessThanOrEqual(width);
  }
  const desktopWidth = await page.locator('.terminal-home').evaluate((element) => ({
    actual: element.getBoundingClientRect().width,
    viewport: window.innerWidth
  }));
  expect(desktopWidth.actual).toBeGreaterThan(desktopWidth.viewport * 0.75);
  expect(desktopWidth.actual).toBeLessThanOrEqual(desktopWidth.viewport * 0.81);
});
