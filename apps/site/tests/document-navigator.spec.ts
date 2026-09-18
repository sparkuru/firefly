import { expect, test, type Page } from '@playwright/test';
import { terminalPromptName } from './terminal-prompt';

async function openDocumentNavigator(page: Page) {
  await page.goto('/posts/ai/llm-workflow-with-trellis/#document-navigator');
  const region = page.getByRole('region', { name: /Document navigator for llm-workflow-with-trellis/u });
  await region.focus();
  await expect(region).toBeFocused();
  return region;
}

async function documentNavigatorSearchMetrics(page: Page) {
  return page.evaluate(() => {
    const status = document.querySelector<HTMLElement>('[data-document-navigator-status]');
    const form = document.querySelector<HTMLFormElement>('[data-navigation-search-form]');
    const prefix = document.querySelector<HTMLElement>('[data-navigation-search-prefix]');
    const input = document.querySelector<HTMLInputElement>('#document-navigation-search');
    if (status === null || form === null || prefix === null || input === null) {
      throw new Error('Missing document navigation search controls.');
    }
    const article = document.querySelector<HTMLElement>('.terminal-document, .semantic-document');
    if (article === null) throw new Error('Missing document navigator article.');
    const formStyle = getComputedStyle(form);
    const inputStyle = getComputedStyle(input);
    const statusStyle = getComputedStyle(status);
    const articleStyle = getComputedStyle(article);
    const terminalRoot = document.querySelector<HTMLElement>('.terminal-root');
    const canvas = terminalRoot === null
      ? getComputedStyle(document.documentElement).backgroundColor
      : getComputedStyle(terminalRoot).backgroundColor;
    const formRect = form.getBoundingClientRect();
    const prefixRect = prefix.getBoundingClientRect();
    const inputRect = input.getBoundingClientRect();
    const statusRect = status.getBoundingClientRect();
    return {
      formDisplay: formStyle.display,
      formWidth: formRect.width,
      formHeight: formRect.height,
      formBoxShadow: formStyle.boxShadow,
      prefixWidth: prefixRect.width,
      inputWidth: inputRect.width,
      gap: inputRect.left - prefixRect.right,
      inputHeight: inputRect.height,
      inputOutline: inputStyle.outlineStyle,
      focusWithin: form.matches(':focus-within'),
      statusBackground: statusStyle.backgroundColor,
      statusColor: statusStyle.color,
      inputColor: inputStyle.color,
      canvasBackground: canvas,
      statusBorder: statusStyle.borderBlockStartColor,
      statusPosition: statusStyle.position,
      statusZIndex: statusStyle.zIndex,
      statusLeft: statusRect.left,
      statusRight: statusRect.right,
      statusTop: statusRect.top,
      statusBottom: statusRect.bottom,
      statusHeight: statusRect.height,
      articlePaddingBottom: Number.parseFloat(articleStyle.paddingBlockEnd),
      statusReserve: articleStyle.getPropertyValue('--navigation-status-reserve').trim(),
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    };
  });
}

test('document navigator moves by semantic units and honors reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const region = await openDocumentNavigator(page);
  const position = page.locator('[data-navigation-position]');
  await expect(position).toHaveText(/^1\//u);
  await region.press('j');
  await expect(position).toHaveText(/^2\//u);
  await region.press('G');
  await expect(position).not.toHaveText(/^1\//u);
  await region.press('g');
  await expect(position).toHaveText(/^1\//u);
  await region.press('k');
  await expect(position).toHaveText(/^1\//u);
});

test('document navigator status stays fixed at the viewport bottom, opaque, contained, and reports navigation actions', async ({ page }) => {
  const region = await openDocumentNavigator(page);
  const statusSection = page.locator('[data-document-navigator-status]');
  const mode = page.locator('[data-navigation-mode]');
  const message = page.locator('[data-navigation-message]');
  await expect(statusSection).toBeVisible();

  const metrics = await documentNavigatorSearchMetrics(page);
  expect(metrics.statusPosition).toBe('fixed');
  expect(metrics.statusZIndex).not.toBe('auto');
  expect(metrics.statusBackground).not.toBe('rgba(0, 0, 0, 0)');
  expect(metrics.statusBackground).not.toBe(metrics.canvasBackground);
  expect(metrics.statusColor).not.toBe(metrics.statusBackground);
  expect(metrics.inputColor).not.toBe(metrics.statusBackground);
  expect(metrics.statusBorder).not.toBe('rgba(0, 0, 0, 0)');
  expect(metrics.statusHeight).toBeGreaterThan(0);
  expect(metrics.statusBottom).toBeCloseTo(metrics.viewportHeight, 0);
  expect(metrics.articlePaddingBottom).toBeGreaterThanOrEqual(metrics.statusHeight - 1);
  expect(metrics.statusReserve).toMatch(/px$/u);
  expect(metrics.statusLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.statusRight).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.statusLeft).toBeCloseTo(0, 0);
  expect(metrics.statusRight).toBeCloseTo(metrics.viewportWidth, 0);
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);

  await expect(mode).toHaveText('-- NORMAL --');
  await expect(message).toContainText('j/k move');
  await region.press('j');
  await expect(message).toHaveText(/Reading unit 2 of \d+\./u);
  await region.press('k');
  await expect(message).toHaveText(/Reading unit 1 of \d+\./u);
  await region.press('G');
  await expect(message).toHaveText(/Reading unit \d+ of \d+\./u);
  await region.press('g');
  await expect(message).toHaveText(/Reading unit 1 of \d+\./u);

  await region.press('v');
  await expect(mode).toHaveText('-- VISUAL --');
  await expect(message).toHaveText('Visual selection: units 1 through 1.');
  await region.press('j');
  await expect(message).toHaveText(/Visual selection: units 1 through 2\./u);
  await region.press('Escape');
  await expect(mode).toHaveText('-- NORMAL --');
  await expect(message).toHaveText('Normal mode.');

  await region.press('n');
  await expect(message).toHaveText('No search query.');
  await region.press('N');
  await expect(message).toHaveText('No search query.');
  await region.press('/');
  await expect(message).toHaveText('Forward search.');
  await page.getByRole('searchbox', { name: /Search document forward/u }).press('Escape');
  await expect(message).toHaveText('Cancelled.');
  await region.press('?');
  await expect(message).toHaveText('Backward search.');
  await page.getByRole('searchbox', { name: /Search document backward/u }).press('Escape');
  await expect(message).toHaveText('Cancelled.');

  await region.press(':');
  const command = page.getByRole('textbox', { name: 'Navigation command' });
  await expect(message).toHaveText('Document navigation command mode. Type q to exit.');
  await command.fill('write');
  await command.press('Enter');
  await expect(message).toHaveText('Unsupported navigation command: :write. Only :q is available.');
  await command.press('Escape');
  await expect(mode).toHaveText('-- NORMAL --');
  await expect(message).toHaveText('Cancelled.');
});

test('document navigator keeps the active unit visible above the fixed status after movement', async ({ page }) => {
  const region = await openDocumentNavigator(page);
  await region.press('G');

  await expect.poll(
    () => page.evaluate(() => {
      const status = document.querySelector<HTMLElement>('[data-document-navigator-status]');
      const active = document.querySelector<HTMLElement>('[data-navigation-active]');
      if (status === null || active === null) return false;
      return active.getBoundingClientRect().bottom <= status.getBoundingClientRect().top + 1;
    }),
    { timeout: 2_000 }
  ).toBe(true);

  const geometry = await page.evaluate(() => {
    const status = document.querySelector<HTMLElement>('[data-document-navigator-status]');
    const active = document.querySelector<HTMLElement>('[data-navigation-active]');
    if (status === null || active === null) throw new Error('Missing document navigation geometry nodes.');
    const statusRect = status.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    return {
      statusPosition: getComputedStyle(status).position,
      statusTop: statusRect.top,
      statusBottom: statusRect.bottom,
      activeTop: activeRect.top,
      activeBottom: activeRect.bottom,
      viewportHeight: window.innerHeight,
    };
  });

  expect(geometry.statusPosition).toBe('fixed');
  expect(geometry.statusTop).toBeGreaterThanOrEqual(0);
  expect(geometry.statusBottom).toBeCloseTo(geometry.viewportHeight, 0);
  expect(geometry.activeTop).toBeGreaterThanOrEqual(-1);
  expect(geometry.activeBottom).toBeLessThanOrEqual(geometry.statusTop + 1);
});

test('document navigation search, repeat, visual Range, Escape, and unsupported commands are bounded', async ({ page }) => {
  const region = await openDocumentNavigator(page);
  await region.press('/');
  const search = page.getByRole('searchbox', { name: /Search document forward/u });
  await expect(search).toBeFocused();
  await search.fill('trellis');
  await search.press('Enter');
  await expect(page.locator('[data-navigation-search-status]')).toContainText('matches for “trellis”');
  await expect(page.locator('[data-navigation-message]')).toBeHidden();
  await expect(page.locator('[data-navigation-announcer]')).toHaveAttribute('aria-live', 'polite');
  expect(await page.evaluate(() => !('highlights' in CSS) || CSS.highlights.has('document-navigation-search'))).toBe(true);
  await region.press('n');
  await region.press('N');
  await region.press('?');
  const backwardSearch = page.getByRole('searchbox', { name: /Search document backward/u });
  await expect(backwardSearch).toHaveAttribute('placeholder', 'Search backward…');
  await backwardSearch.fill('missing literal query');
  await backwardSearch.press('Enter');
  await expect(page.locator('[data-navigation-search-status]')).toHaveText('No results for “missing literal query”.');
  await expect(page.locator('[data-navigation-message]')).toBeHidden();

  await region.press('v');
  await expect(page.locator('[data-navigation-mode]')).toHaveText('-- VISUAL --');
  await region.press('j');
  expect(await page.evaluate(() => window.getSelection()?.isCollapsed)).toBe(false);
  await region.press('Escape');
  await expect(page.locator('[data-navigation-mode]')).toHaveText('-- NORMAL --');
  expect(await page.evaluate(() => window.getSelection()?.isCollapsed)).toBe(true);

  await region.press(':');
  const command = page.getByRole('textbox', { name: 'Navigation command' });
  await command.fill('write');
  await command.press('Enter');
  await expect(page.locator('[data-navigation-message]')).toContainText('Only :q is available');
  await command.press('Escape');
  await expect(region).toBeFocused();
});

test('document navigation searches exact repeated occurrences from the canonical fragment entry', async ({ page }) => {
  await page.goto('/posts/ai/llm-workflow-with-trellis/#document-navigator');
  const region = page.getByRole('region', { name: /Document navigator for llm-workflow-with-trellis/u });
  await expect(region).toBeFocused();

  await region.press('?');
  const search = page.getByRole('searchbox', { name: /Search document backward/u });
  await expect(search).toHaveAttribute('placeholder', 'Search backward…');
  await expect(page.locator('[data-navigation-search-prefix]')).toHaveText('?');
  await search.fill('the');
  await search.press('Enter');

  const status = page.locator('[data-navigation-search-status]');
  const statusSection = page.locator('[data-document-navigator-status]');
  await expect(statusSection).toHaveAttribute('data-navigation-search-active', '');
  await expect(status).toHaveText(/^\d+\/\d+ matches for “the”\.$/u);
  const state = await page.evaluate(() => {
    const all = CSS.highlights.get('document-navigation-search');
    const active = CSS.highlights.get('document-navigation-search-active');
    const ranges = [...(all ?? [])].map((range) => {
      const container = range.startContainer.nodeType === Node.ELEMENT_NODE
        ? range.startContainer as Element
        : range.startContainer.parentElement;
      return {
        text: range.toString(),
        unit: container?.closest<HTMLElement>('[data-navigation-unit]')?.dataset.navigationUnit ?? ''
      };
    });
    return {
      ranges,
      activeText: [...(active ?? [])][0]?.toString() ?? '',
      status: document.querySelector<HTMLElement>('[data-navigation-search-status]')?.textContent ?? ''
    };
  });
  expect(state.ranges.length).toBeGreaterThan(1);
  expect(state.ranges.every(({ text }) => text.toLocaleLowerCase() === 'the')).toBe(true);
  const rangesByUnit = state.ranges.reduce<Record<string, number>>((counts, { unit }) => ({
    ...counts,
    [unit]: (counts[unit] ?? 0) + 1
  }), {});
  expect(Object.values(rangesByUnit).some((count) => count > 1)).toBe(true);
  expect(state.activeText.toLocaleLowerCase()).toBe('the');
  const initialStatus = state.status;

  await region.press('n');
  await expect(status).not.toHaveText(initialStatus);
  const nextActiveText = await page.evaluate(() => [...(CSS.highlights.get('document-navigation-search-active') ?? [])][0]?.toString() ?? '');
  expect(nextActiveText.toLocaleLowerCase()).toBe('the');

  await region.press('N');
  await expect(status).toHaveText(initialStatus);
});

test('document navigator keeps committed search status visible while scrolling and clears it on cancellation', async ({ page }) => {
  await page.goto('/posts/ai/llm-workflow-with-trellis/#document-navigator');
  const region = page.getByRole('region', { name: /Document navigator for llm-workflow-with-trellis/u });
  await region.focus();
  await region.press('/');
  const search = page.getByRole('searchbox', { name: /Search document forward/u });
  await search.fill('the');
  await search.press('Enter');

  const statusSection = page.locator('[data-document-navigator-status]');
  const status = page.locator('[data-navigation-search-status]');
  await expect(statusSection).toHaveAttribute('data-navigation-search-active', '');
  await expect(statusSection).toHaveCSS('position', 'fixed');
  const initialStatus = await status.textContent();
  await expect(status).toBeVisible();
  await expect(page.locator('[data-navigation-message]')).toBeHidden();
  await expect(page.locator('[data-navigation-announcer]')).toHaveAttribute('aria-live', 'polite');

  const viewportStatus = await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight / 2);
    const section = document.querySelector<HTMLElement>('[data-document-navigator-status]');
    if (section === null) throw new Error('Missing document navigation status section.');
    const rect = section.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
      viewportHeight: window.innerHeight,
      scrollY: window.scrollY
    };
  });
  expect(viewportStatus.scrollY).toBeGreaterThan(0);
  expect(viewportStatus.top).toBeGreaterThanOrEqual(0);
  expect(viewportStatus.bottom).toBeCloseTo(viewportStatus.viewportHeight, 0);
  expect(viewportStatus.height).toBeGreaterThan(0);

  await page.keyboard.press('n');
  await expect(status).not.toHaveText(initialStatus ?? '');
  await expect(statusSection).toHaveAttribute('data-navigation-search-active', '');
  await page.keyboard.press('N');
  await expect(status).toHaveText(initialStatus ?? '');

  await page.keyboard.press('/');
  await expect(statusSection).not.toHaveAttribute('data-navigation-search-active');
  await expect(status).toHaveText(initialStatus ?? '');
  await page.keyboard.press('Enter');
  await expect(statusSection).not.toHaveAttribute('data-navigation-search-active');
  await expect(status).toBeHidden();

  await page.keyboard.press('/');
  const cancelledSearch = page.getByRole('searchbox', { name: /Search document forward/u });
  await cancelledSearch.fill('the');
  await cancelledSearch.press('Enter');
  await expect(statusSection).toHaveAttribute('data-navigation-search-active', '');
  await page.keyboard.press('/');
  await page.getByRole('searchbox', { name: /Search document forward/u }).press('Escape');
  await expect(statusSection).not.toHaveAttribute('data-navigation-search-active');
});

test('document navigation search cycles keep transient prompt chrome separate in both directions', async ({ page }) => {
  const routes = [
    {
      path: '/posts/ai/llm-workflow-with-trellis/#document-navigator',
      regionName: /Document navigator for llm-workflow-with-trellis/u,
      query: 'the'
    },
    {
      path: '/pages/about/#document-navigator',
      regionName: /Document navigator for About this foundation/u,
      query: 'the'
    }
  ];

  for (const route of routes) {
    await page.goto(route.path);
    const region = page.getByRole('region', { name: route.regionName });
    await region.focus();
    const statusSection = page.locator('[data-document-navigator-status]');
    const status = page.locator('[data-navigation-search-status]');
    let committedStatus: string | null = null;

    for (const direction of [
      { key: '/', prefix: '/', label: /Search document forward/u, placeholder: 'Search forward…' },
      { key: '?', prefix: '?', label: /Search document backward/u, placeholder: 'Search backward…' }
    ]) {
      await region.press(direction.key);
      const input = page.getByRole('searchbox', { name: direction.label });
      await expect(input).toBeFocused();
      const metrics = await documentNavigatorSearchMetrics(page);
      expect(metrics.formDisplay).toBe('flex');
      expect(metrics.formWidth).toBeGreaterThan(0);
      expect(metrics.formHeight).toBeGreaterThanOrEqual(44);
      expect(metrics.prefixWidth).toBeGreaterThan(0);
      expect(metrics.inputWidth).toBeGreaterThan(0);
      expect(metrics.gap).toBeGreaterThanOrEqual(8);
      expect(metrics.inputHeight).toBeGreaterThanOrEqual(44);
      expect(metrics.inputOutline).toBe('none');
      expect(metrics.focusWithin).toBe(true);
      expect(metrics.formBoxShadow).not.toBe('none');
      expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
      expect(metrics.statusBorder).not.toBe('rgba(0, 0, 0, 0)');
      await expect(page.locator('[data-navigation-search-prefix]')).toHaveText(direction.prefix);
      await expect(input).toHaveAttribute('placeholder', direction.placeholder);
      await expect(statusSection).not.toHaveAttribute('data-navigation-search-active');
      if (committedStatus === null) await expect(status).toBeHidden();
      else await expect(status).toHaveText(committedStatus);

      await input.fill(route.query);
      await input.press('Enter');
      await expect(statusSection).toHaveAttribute('data-navigation-search-active', '');
      await expect(status).toContainText(`matches for “${route.query}”.`);
      await expect(statusSection).toHaveCSS('position', 'fixed');
      const activeMetrics = await page.evaluate(() => {
        const statusNode = document.querySelector<HTMLElement>('[data-document-navigator-status]');
        if (statusNode === null) throw new Error('Missing document navigation status section.');
        const style = getComputedStyle(statusNode);
        const terminalRoot = document.querySelector<HTMLElement>('.terminal-root');
        const canvas = terminalRoot === null
          ? getComputedStyle(document.documentElement).backgroundColor
          : getComputedStyle(terminalRoot).backgroundColor;
        return {
          background: style.backgroundColor,
          canvas,
          border: style.borderBlockStartColor
        };
      });
      expect(activeMetrics.background).not.toBe('rgba(0, 0, 0, 0)');
      expect(activeMetrics.background).not.toBe(activeMetrics.canvas);
      expect(activeMetrics.border).not.toBe('rgba(0, 0, 0, 0)');
      committedStatus = await status.textContent();

      await region.press(direction.key);
      const reopened = page.getByRole('searchbox', { name: direction.label });
      await expect(reopened).toBeFocused();
      await expect(statusSection).not.toHaveAttribute('data-navigation-search-active');
      await expect(status).toHaveText(committedStatus ?? '');
      const reopenedMetrics = await documentNavigatorSearchMetrics(page);
      expect(reopenedMetrics.formDisplay).toBe('flex');
      expect(reopenedMetrics.gap).toBeGreaterThanOrEqual(8);
      expect(reopenedMetrics.inputHeight).toBeGreaterThanOrEqual(44);
      expect(reopenedMetrics.focusWithin).toBe(true);
      expect(reopenedMetrics.documentWidth).toBeLessThanOrEqual(reopenedMetrics.viewportWidth);
      await reopened.press('Escape');
      await expect(region).toBeFocused();
      await expect(statusSection).not.toHaveAttribute('data-navigation-search-active');
      await expect(status).toBeHidden();
      committedStatus = null;
    }

    await region.press(':');
    const command = page.getByRole('textbox', { name: 'Navigation command' });
    await expect(command).toBeFocused();
    const commandMetrics = await page.evaluate(() => {
      const form = document.querySelector<HTMLFormElement>('[data-navigation-command-form]');
      const prefix = form === null ? null : form.querySelector<HTMLElement>(':scope > span');
      const input = document.querySelector<HTMLInputElement>('#document-navigation-command');
      if (form === null || prefix === null || input === null) throw new Error('Missing document navigation command controls.');
      const formRect = form.getBoundingClientRect();
      const prefixRect = prefix.getBoundingClientRect();
      const inputRect = input.getBoundingClientRect();
      return {
        display: getComputedStyle(form).display,
        height: formRect.height,
        gap: inputRect.left - prefixRect.right,
        inputHeight: inputRect.height,
        inputOutline: getComputedStyle(input).outlineStyle,
        boxShadow: getComputedStyle(form).boxShadow,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth
      };
    });
    expect(commandMetrics.display).toBe('flex');
    expect(commandMetrics.height).toBeGreaterThanOrEqual(44);
    expect(commandMetrics.gap).toBeGreaterThanOrEqual(8);
    expect(commandMetrics.inputHeight).toBeGreaterThanOrEqual(44);
    expect(commandMetrics.inputOutline).toBe('none');
    expect(commandMetrics.boxShadow).not.toBe('none');
    expect(commandMetrics.documentWidth).toBeLessThanOrEqual(commandMetrics.viewportWidth);
    await command.press('Escape');
    await expect(region).toBeFocused();
  }
});

test('document navigator command input also leaves committed search chrome while editing', async ({ page }) => {
  const region = await openDocumentNavigator(page);
  await region.press('/');
  const search = page.getByRole('searchbox', { name: /Search document forward/u });
  await search.fill('reader');
  await search.press('Enter');

  const statusSection = page.locator('[data-document-navigator-status]');
  const status = page.locator('[data-navigation-search-status]');
  await expect(statusSection).toHaveAttribute('data-navigation-search-active', '');
  const committedStatus = await status.textContent();

  await region.press(':');
  const command = page.getByRole('textbox', { name: 'Navigation command' });
  await expect(command).toBeFocused();
  await expect(statusSection).not.toHaveAttribute('data-navigation-search-active');
  await expect(status).toHaveText(committedStatus ?? '');
  await command.press('Escape');
  await expect(region).toBeFocused();
  await expect(statusSection).not.toHaveAttribute('data-navigation-search-active');
  await expect(status).toBeHidden();
});

test('document navigation search prefixes keep native labels, direction text, spacing, and target size', async ({ page }) => {
  const routes = [
    {
      path: '/posts/ai/llm-workflow-with-trellis/#document-navigator',
      regionName: /Document navigator for llm-workflow-with-trellis/u
    },
    {
      path: '/pages/about/#document-navigator',
      regionName: /Document navigator for About this foundation/u
    }
  ];

  for (const route of routes) {
    await page.goto(route.path);
    const region = page.getByRole('region', { name: route.regionName });
    await region.focus();

    for (const direction of [
      { key: '/', prefix: '/', label: /Search document forward/u, placeholder: 'Search forward…' },
      { key: '?', prefix: '?', label: /Search document backward/u, placeholder: 'Search backward…' }
    ]) {
      await region.press(direction.key);
      const input = page.getByRole('searchbox', { name: direction.label });
      const metrics = await page.evaluate(() => {
        const prefix = document.querySelector<HTMLElement>('[data-navigation-search-prefix]');
        const searchInput = document.querySelector<HTMLInputElement>('#document-navigation-search');
        if (prefix === null || searchInput === null) throw new Error('Missing document navigation search controls.');
        const prefixRect = prefix.getBoundingClientRect();
        const inputRect = searchInput.getBoundingClientRect();
        return {
          gap: inputRect.left - prefixRect.right,
          inputHeight: inputRect.height,
          prefixText: prefix.textContent,
          labelText: searchInput.labels?.[0]?.textContent ?? '',
          placeholder: searchInput.getAttribute('placeholder'),
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth
        };
      });
      await expect(input).toBeFocused();
      expect(metrics.prefixText).toBe(direction.prefix);
      expect(metrics.labelText).toMatch(direction.label);
      expect(metrics.placeholder).toBe(direction.placeholder);
      expect(metrics.gap).toBeGreaterThanOrEqual(8);
      expect(metrics.inputHeight).toBeGreaterThanOrEqual(44);
      expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
      await input.press('Escape');
      await expect(region).toBeFocused();
    }
  }
});

test('Terminal document frame keeps its baseline, grows fluidly, and contains the page at wide widths', async ({ page }, testInfo) => {
  const viewports = [1440, 2560, 3840];
  const oldFrameCap = 78 * 16;

  for (const width of viewports) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/pages/about/');
    const metrics = await page.evaluate(() => {
      const shell = document.querySelector<HTMLElement>('.terminal-shell');
      const article = document.querySelector<HTMLElement>('.terminal-document');
      if (shell === null || article === null) throw new Error('Missing Terminal frame.');
      return {
        shellWidth: shell.getBoundingClientRect().width,
        articleWidth: article.getBoundingClientRect().width,
        frameMaxWidth: Number.parseFloat(getComputedStyle(article).maxWidth),
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth
      };
    });
    const expectedMeasure = Math.min(180 * 16, Math.max(oldFrameCap, width * 0.86));
    expect(metrics.frameMaxWidth).toBeCloseTo(expectedMeasure, 0);
    expect(metrics.shellWidth).toBeCloseTo(expectedMeasure, 0);
    expect(metrics.articleWidth).toBeGreaterThan(0);
    expect(metrics.articleWidth).toBeLessThanOrEqual(metrics.shellWidth);
    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
    if (width === 3840) expect(metrics.shellWidth).toBeGreaterThan(oldFrameCap);
    if (width === 3840 && testInfo.project.name === 'chromium-desktop-interactive') {
      await page.screenshot({
        path: testInfo.outputPath('document-navigator-frame-3840.png'),
        animations: 'disabled'
      });
    }
  }
});

test('Terminal document navigator keeps committed search status visible while scrolling', async ({ page }) => {
  await page.goto('/pages/about/#document-navigator');
  const region = page.getByRole('region', { name: /Document navigator for About this foundation/u });
  await expect(region).toBeFocused();
  const initialMetrics = await documentNavigatorSearchMetrics(page);
  expect(initialMetrics.statusPosition).toBe('fixed');
  expect(initialMetrics.statusBackground).not.toBe(initialMetrics.canvasBackground);
  expect(initialMetrics.statusColor).not.toBe(initialMetrics.statusBackground);
  expect(initialMetrics.inputColor).not.toBe(initialMetrics.statusBackground);
  expect(initialMetrics.statusLeft).toBeCloseTo(0, 0);
  expect(initialMetrics.statusRight).toBeCloseTo(initialMetrics.viewportWidth, 0);
  expect(initialMetrics.statusBottom).toBeCloseTo(initialMetrics.viewportHeight, 0);
  expect(initialMetrics.articlePaddingBottom).toBeGreaterThanOrEqual(initialMetrics.statusHeight - 1);
  expect(initialMetrics.documentWidth).toBeLessThanOrEqual(initialMetrics.viewportWidth);
  await region.press('/');
  const search = page.getByRole('searchbox', { name: /Search document forward/u });
  await search.fill('foundation');
  await search.press('Enter');

  const statusSection = page.locator('[data-document-navigator-status]');
  const status = page.locator('[data-navigation-search-status]');
  await expect(statusSection).toHaveAttribute('data-navigation-search-active', '');
  await expect(statusSection).toHaveCSS('position', 'fixed');
  await expect(status).toBeVisible();
  await expect(page.locator('[data-navigation-message]')).toBeHidden();
  await expect(page.locator('[data-navigation-announcer]')).toHaveAttribute('aria-live', 'polite');

  const viewportStatus = await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight / 2);
    const section = document.querySelector<HTMLElement>('[data-document-navigator-status]');
    if (section === null) throw new Error('Missing Terminal navigation status section.');
    const rect = section.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
      viewportHeight: window.innerHeight,
      scrollY: window.scrollY
    };
  });
  expect(viewportStatus.scrollY).toBeGreaterThan(0);
  expect(viewportStatus.top).toBeGreaterThanOrEqual(0);
  expect(viewportStatus.bottom).toBeCloseTo(viewportStatus.viewportHeight, 0);
  expect(viewportStatus.height).toBeGreaterThan(0);
});

test('document navigator preserves links, local-scroll regions, modifier keys, IME, and manual selection', async ({ page }) => {
  const region = await openDocumentNavigator(page);
  const initialPosition = await page.locator('[data-navigation-position]').textContent();
  const link = page.getByRole('link', { name: 'Trellis repository' });
  await link.focus();
  await page.keyboard.press('j');
  await expect(link).toBeFocused();
  const code = page.getByRole('region', { name: /^Code content:/u }).first();
  await code.focus();
  await page.keyboard.press('j');
  await expect(code).toBeFocused();
  await region.focus();
  await region.press('Control+j');
  await expect(page.locator('[data-navigation-position]')).toHaveText(initialPosition ?? '');

  const ariaControl = page.locator('[data-navigation-aria-control]');
  await region.evaluate((element) => {
    const control = document.createElement('div');
    control.dataset.navigationAriaControl = '';
    control.setAttribute('role', 'checkbox');
    control.setAttribute('aria-checked', 'false');
    control.tabIndex = 0;
    element.append(control);
  });
  await ariaControl.focus();
  await page.keyboard.press('j');
  await expect(ariaControl).toBeFocused();
  await expect(page.locator('[data-navigation-position]')).toHaveText(initialPosition ?? '');

  const imeResult = await region.evaluate((element) => element.dispatchEvent(new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    isComposing: true,
    key: 'j'
  })));
  expect(imeResult).toBe(true);

  await page.evaluate(() => {
    const paragraph = document.querySelector<HTMLElement>('[data-document-navigator-region] p');
    const selection = window.getSelection();
    if (paragraph === null || selection === null) throw new Error('Missing manual selection fixture.');
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await region.press('j');
  await expect(page.locator('[data-navigation-position]')).toHaveText(initialPosition ?? '');
});

test('document navigator never treats a user-replaced visual Range as its owned selection', async ({ page }) => {
  const region = await openDocumentNavigator(page);
  const position = page.locator('[data-navigation-position]');
  await region.press('v');
  await region.press('j');
  const visualPosition = await position.textContent();

  await page.evaluate(() => {
    const paragraph = document.querySelector<HTMLElement>('[data-document-navigator-region] p');
    const selection = window.getSelection();
    if (paragraph === null || selection === null) throw new Error('Missing replacement selection fixture.');
    const replacement = document.createRange();
    replacement.selectNodeContents(paragraph);
    selection.removeAllRanges();
    selection.addRange(replacement);
  });
  const allowed = await region.evaluate((element) => element.dispatchEvent(new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key: 'j'
  })));
  expect(allowed).toBe(true);
  await expect(position).toHaveText(visualPosition ?? '');
  expect(await page.evaluate(() => window.getSelection()?.isCollapsed)).toBe(false);
});

test('open resolves a canonical destination and :q exits directly to home', async ({ page }) => {
  await page.goto('/');
  const workflowEntry = page.locator('[data-terminal-entry][data-terminal-entry-href="/posts/ai/llm-workflow-with-trellis/"]');
  const workflowRelativePath = await workflowEntry.getAttribute('data-terminal-entry-relative-path');
  if (workflowRelativePath === null) {
    throw new Error('Workflow document entry does not expose a relative path.');
  }
  const input = page.getByRole('textbox', { name: terminalPromptName() });
  await input.fill(`open ./${workflowRelativePath}`);
  await input.press('Enter');
  await expect(page).toHaveURL(/\/posts\/ai\/llm-workflow-with-trellis\/#document-navigator$/u);
  const region = page.getByRole('region', { name: /Document navigator for llm-workflow-with-trellis/u });
  await expect(region).toBeFocused();
  await region.press('G');
  await expect(page.locator('[data-navigation-position]')).not.toHaveText(/^1\//u);
  await region.press(':');
  const command = page.getByRole('textbox', { name: 'Navigation command' });
  await command.fill('q');
  await command.press('Enter');
  await expect(page).toHaveURL(/\/$/u);
});

test('open opens a Terminal document navigator with the unified presentation', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: terminalPromptName() });
  await input.fill('open ~/blog/pages/about.md');
  await input.press('Enter');

  await expect(page).toHaveURL(/\/pages\/about\/#document-navigator$/u);
  await expect(page.locator('.terminal-document')).toHaveCount(1);
  await expect(page.locator('.semantic-document')).toHaveCount(0);
  const region = page.getByRole('region', { name: /Document navigator for About this foundation/u });
  await expect(region).toBeFocused();
  await expect(page.locator('[data-document-navigator-status]')).toBeVisible();
  await region.press('G');
  await expect(page.locator('[data-navigation-position]')).not.toHaveText(/^1\//u);

  await region.press(':');
  const command = page.getByRole('textbox', { name: 'Navigation command' });
  await command.fill('q');
  await command.press('Enter');
  await expect(page).toHaveURL(/\/$/u);
});

test('document navigator fragment focus does not perform a second programmatic scroll', async ({ page }) => {
  await page.addInitScript(() => {
    const nativeScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (...args: Parameters<typeof nativeScrollIntoView>) {
      const windowWithCounter = window as typeof window & { __documentNavigatorScrollCount?: number };
      windowWithCounter.__documentNavigatorScrollCount = (windowWithCounter.__documentNavigatorScrollCount ?? 0) + 1;
      return nativeScrollIntoView.apply(this, args);
    };
  });

  await page.goto('/posts/ai/llm-workflow-with-trellis/#document-navigator');
  await expect.poll(() => page.evaluate(() => document.activeElement?.id ?? '')).toBe('document-navigator');
  const result = await page.evaluate(() => ({
    active: document.activeElement?.id,
    hash: window.location.hash,
    scrollCount: (window as typeof window & { __documentNavigatorScrollCount?: number }).__documentNavigatorScrollCount ?? 0
  }));
  expect(result.active).toBe('document-navigator');
  expect(result.hash).toBe('#document-navigator');
  expect(result.scrollCount).toBe(0);
});

test('direct canonical permalinks keep document navigator focus and key ownership idle', async ({ page }) => {
  await page.goto('/posts/ai/llm-workflow-with-trellis/');
  const foundationRegion = page.getByRole('region', { name: /Document navigator for llm-workflow-with-trellis/u });
  await expect(foundationRegion).not.toBeFocused();
  await expect(page.locator('[data-document-navigator-status]')).toBeVisible();
  const foundationPosition = page.locator('[data-navigation-position]');
  await page.keyboard.press('G');
  await expect(foundationPosition).toHaveText(/^1\//u);

  await page.goto('/pages/about/');
  const terminalRegion = page.getByRole('region', { name: /Document navigator for About this foundation/u });
  await expect(terminalRegion).not.toBeFocused();
  await expect(page.locator('[data-document-navigator-status]')).toBeVisible();
  const terminalPosition = page.locator('[data-navigation-position]');
  await page.keyboard.press('G');
  await expect(terminalPosition).toHaveText(/^1\//u);

  await page.goto('/pages/about/#document-navigator');
  await expect(page.getByRole('region', { name: /Document navigator for About this foundation/u })).toBeFocused();
});

const semanticDocumentPath = '/posts/infra/connect-to-windows-via-terminal/';
const semanticDocumentName = /Document navigator for Connect to windows via terminal/u;

test('semantic document navigation stays inactive until its visible native entry is used', async ({ page }) => {
  await page.goto(semanticDocumentPath);

  const article = page.locator('.semantic-document');
  const entry = page.getByRole('link', { name: 'Read document', exact: true });
  const region = page.getByRole('region', { name: semanticDocumentName });
  const status = page.locator('[data-document-navigator-status]');

  await expect(article).toHaveAttribute('data-document-navigator-entry', 'fragment');
  await expect(entry).toHaveAttribute('href', '#document-navigator');
  await expect(entry).toBeVisible();
  await expect(region).toHaveAttribute('tabindex', '-1');
  await expect(region).not.toBeFocused();
  await expect(region).not.toHaveAttribute('aria-activedescendant');
  await expect(status).toBeHidden();
  await expect(page.locator('[data-navigation-active]')).toHaveCount(0);
  await expect(article.getByRole('heading', { level: 1, name: 'Connect to windows via terminal' })).toBeVisible();
  await expect(article.locator('.document-outline')).toBeVisible();
});

test('semantic document entry replaces only the fragment, preserves viewport/history, and is repeat-safe', async ({ page }) => {
  await page.goto(`${semanticDocumentPath}?source=entry`);
  const entry = page.getByRole('link', { name: 'Read document', exact: true });
  const region = page.getByRole('region', { name: semanticDocumentName });
  const status = page.locator('[data-document-navigator-status]');
  const before = await page.evaluate(() => ({
    historyLength: window.history.length,
    historyState: window.history.state,
    scrollY: window.scrollY
  }));

  await page.evaluate(() => window.scrollTo(0, 240));
  const scrollBeforeEntry = await page.evaluate(() => window.scrollY);
  await entry.evaluate((element) => (element as HTMLAnchorElement).click());

  await expect(page).toHaveURL(/\/posts\/infra\/connect-to-windows-via-terminal\/\?source=entry#document-navigator$/u);
  await expect(region).toBeFocused();
  await expect(status).toBeVisible();
  await expect(page.locator('[data-navigation-exit-control]')).toBeVisible();
  await expect(region).toHaveAttribute('tabindex', '0');
  const afterEntry = await page.evaluate(() => ({
    historyLength: window.history.length,
    historyState: window.history.state,
    scrollY: window.scrollY
  }));
  expect(afterEntry.historyLength).toBe(before.historyLength);
  expect(afterEntry.historyState).toEqual(before.historyState);
  expect(afterEntry.scrollY).toBe(scrollBeforeEntry);

  const position = page.locator('[data-navigation-position]');
  await region.press('j');
  const positionAfterMove = await position.textContent();
  await entry.evaluate((element) => (element as HTMLAnchorElement).click());
  await expect(region).toBeFocused();
  await expect(position).toHaveText(positionAfterMove ?? '');
  await expect(page).toHaveURL(/\/posts\/infra\/connect-to-windows-via-terminal\/\?source=entry#document-navigator$/u);
  expect(await page.evaluate(() => window.history.length)).toBe(before.historyLength);
});

test('semantic local exit restores the remembered heading fragment without scrolling or creating history', async ({ page }) => {
  await page.goto(`${semanticDocumentPath}#openssh-server`);
  await expect(page.locator('#openssh-server')).toBeVisible();
  await page.evaluate(() => (document.querySelector('[data-document-navigator-entry-control]') as HTMLAnchorElement).click());
  const region = page.getByRole('region', { name: semanticDocumentName });
  await expect(region).toBeFocused();
  const beforeExit = await page.evaluate(() => ({
    historyLength: window.history.length,
    scrollY: window.scrollY
  }));

  await page.getByRole('button', { name: 'Exit navigation', exact: true }).click();

  await expect(page).toHaveURL(/\/posts\/infra\/connect-to-windows-via-terminal\/#openssh-server$/u);
  await expect(page.getByRole('link', { name: 'Read document', exact: true })).toBeFocused();
  await expect(page.locator('[data-document-navigator-status]')).toBeHidden();
  await expect(region).toHaveAttribute('tabindex', '-1');
  await expect(page.locator('[data-navigation-active]')).toHaveCount(0);
  const afterExit = await page.evaluate(() => ({
    historyLength: window.history.length,
    scrollY: window.scrollY
  }));
  expect(afterExit.historyLength).toBe(beforeExit.historyLength);
  expect(afterExit.scrollY).toBe(beforeExit.scrollY);
});

test('semantic direct fragment exit clears the fragment and semantic q stays local', async ({ page }) => {
  await page.goto(`${semanticDocumentPath}#document-navigator`);
  const region = page.getByRole('region', { name: semanticDocumentName });
  await expect(region).toBeFocused();
  await region.press(':');
  const command = page.getByRole('textbox', { name: 'Navigation command' });
  await command.fill('q');
  await command.press('Enter');

  await expect(page).toHaveURL(/\/posts\/infra\/connect-to-windows-via-terminal\/$/u);
  await expect(page.getByRole('link', { name: 'Read document', exact: true })).toBeFocused();
  await expect(page.locator('[data-document-navigator-status]')).toBeHidden();
});

test('semantic browser fragment changes synchronize without stealing ordinary heading focus', async ({ page }) => {
  await page.goto(`${semanticDocumentPath}#document-navigator`);
  const region = page.getByRole('region', { name: semanticDocumentName });
  await expect(region).toBeFocused();
  const headingLink = page.getByRole('link', { name: 'OpenSSH Server', exact: true }).first();
  await headingLink.click();

  await expect(page).toHaveURL(/#openssh-server$/u);
  await expect(page.locator('[data-document-navigator-status]')).toBeHidden();
  expect(await page.evaluate(() => document.activeElement?.matches('[data-document-navigator-entry-control], [data-document-navigator-region], [data-navigation-exit-control]') ?? false)).toBe(false);

  await page.goBack();
  await expect(page).toHaveURL(/#document-navigator$/u);
  await expect(page.locator('[data-document-navigator-status]')).toBeVisible();
  await expect(region).toBeFocused();

  await page.goForward();
  await expect(page).toHaveURL(/#openssh-server$/u);
  await expect(page.locator('[data-document-navigator-status]')).toBeHidden();
  await expect(page.getByRole('link', { name: 'Read document', exact: true })).not.toBeFocused();
});

test('semantic entry leaves modified clicks native', async ({ page }) => {
  await page.goto(semanticDocumentPath);
  const entry = page.locator('[data-document-navigator-entry-control]');
  const result = await entry.evaluate((element) => {
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
      ctrlKey: true
    });
    const allowed = element.dispatchEvent(event);
    return { allowed, defaultPrevented: event.defaultPrevented, hash: window.location.hash };
  });
  expect(result.allowed).toBe(true);
  expect(result.defaultPrevented).toBe(false);
  expect(result.hash).toBe('');
  await expect(page.locator('[data-document-navigator-status]')).toBeHidden();
});

test('document navigator entry keeps native Back and Forward route boundaries', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: terminalPromptName() });
  await input.fill('open ~/blog/pages/about.md');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/pages\/about\/#document-navigator$/u);

  await page.goBack();
  await expect(page).toHaveURL(/\/$/u);
  await expect(page.getByRole('textbox', { name: terminalPromptName() })).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL(/\/pages\/about\/#document-navigator$/u);
  await expect(page.getByRole('region', { name: /Document navigator for About this foundation/u })).toBeFocused();
});
