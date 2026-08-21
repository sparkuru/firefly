import { expect, test, type Page } from '@playwright/test';

async function openReader(page: Page) {
  await page.goto('/posts/ai/llm-workflow-with-trellis/#terminal-reader');
  const region = page.getByRole('region', { name: /Read-only Vim reader for llm-workflow-with-trellis/u });
  await region.focus();
  await expect(region).toBeFocused();
  return region;
}

async function readerSearchMetrics(page: Page) {
  return page.evaluate(() => {
    const status = document.querySelector<HTMLElement>('[data-terminal-reader-status]');
    const form = document.querySelector<HTMLFormElement>('[data-reader-search-form]');
    const prefix = document.querySelector<HTMLElement>('[data-reader-search-prefix]');
    const input = document.querySelector<HTMLInputElement>('#terminal-reader-search');
    if (status === null || form === null || prefix === null || input === null) {
      throw new Error('Missing reader search controls.');
    }
    const article = document.querySelector<HTMLElement>('.terminal-document, .semantic-document');
    if (article === null) throw new Error('Missing reader article.');
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
      statusReserve: articleStyle.getPropertyValue('--reader-status-reserve').trim(),
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    };
  });
}

test('reader moves by semantic units and honors reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const region = await openReader(page);
  const position = page.locator('[data-reader-position]');
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

test('reader status stays fixed at the viewport bottom, opaque, contained, and reports reader actions', async ({ page }) => {
  const region = await openReader(page);
  const statusSection = page.locator('[data-terminal-reader-status]');
  const mode = page.locator('[data-reader-mode]');
  const message = page.locator('[data-reader-message]');
  await expect(statusSection).toBeVisible();

  const metrics = await readerSearchMetrics(page);
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
  const command = page.getByRole('textbox', { name: 'Reader command' });
  await expect(message).toHaveText('Reader command mode. Type q to exit.');
  await command.fill('write');
  await command.press('Enter');
  await expect(message).toHaveText('Unsupported reader command: :write. Only :q is available.');
  await command.press('Escape');
  await expect(mode).toHaveText('-- NORMAL --');
  await expect(message).toHaveText('Cancelled.');
});

test('reader keeps the active unit visible above the fixed status after movement', async ({ page }) => {
  const region = await openReader(page);
  await region.press('G');

  await expect.poll(
    () => page.evaluate(() => {
      const status = document.querySelector<HTMLElement>('[data-terminal-reader-status]');
      const active = document.querySelector<HTMLElement>('[data-reader-active]');
      if (status === null || active === null) return false;
      return active.getBoundingClientRect().bottom <= status.getBoundingClientRect().top + 1;
    }),
    { timeout: 2_000 }
  ).toBe(true);

  const geometry = await page.evaluate(() => {
    const status = document.querySelector<HTMLElement>('[data-terminal-reader-status]');
    const active = document.querySelector<HTMLElement>('[data-reader-active]');
    if (status === null || active === null) throw new Error('Missing reader geometry nodes.');
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

test('reader search, repeat, visual Range, Escape, and unsupported commands are bounded', async ({ page }) => {
  const region = await openReader(page);
  await region.press('/');
  const search = page.getByRole('searchbox', { name: /Search document forward/u });
  await expect(search).toBeFocused();
  await search.fill('trellis');
  await search.press('Enter');
  await expect(page.locator('[data-reader-search-status]')).toContainText('matches for “trellis”');
  await expect(page.locator('[data-reader-message]')).toBeHidden();
  await expect(page.locator('[data-reader-announcer]')).toHaveAttribute('aria-live', 'polite');
  expect(await page.evaluate(() => !('highlights' in CSS) || CSS.highlights.has('terminal-reader-search'))).toBe(true);
  await region.press('n');
  await region.press('N');
  await region.press('?');
  const backwardSearch = page.getByRole('searchbox', { name: /Search document backward/u });
  await expect(backwardSearch).toHaveAttribute('placeholder', 'Search backward…');
  await backwardSearch.fill('missing literal query');
  await backwardSearch.press('Enter');
  await expect(page.locator('[data-reader-search-status]')).toHaveText('No results for “missing literal query”.');
  await expect(page.locator('[data-reader-message]')).toBeHidden();

  await region.press('v');
  await expect(page.locator('[data-reader-mode]')).toHaveText('-- VISUAL --');
  await region.press('j');
  expect(await page.evaluate(() => window.getSelection()?.isCollapsed)).toBe(false);
  await region.press('Escape');
  await expect(page.locator('[data-reader-mode]')).toHaveText('-- NORMAL --');
  expect(await page.evaluate(() => window.getSelection()?.isCollapsed)).toBe(true);

  await region.press(':');
  const command = page.getByRole('textbox', { name: 'Reader command' });
  await command.fill('write');
  await command.press('Enter');
  await expect(page.locator('[data-reader-message]')).toContainText('Only :q is available');
  await command.press('Escape');
  await expect(region).toBeFocused();
});

test('reader searches exact repeated occurrences from the canonical fragment entry', async ({ page }) => {
  await page.goto('/posts/ai/llm-workflow-with-trellis/#terminal-reader');
  const region = page.getByRole('region', { name: /Read-only Vim reader for llm-workflow-with-trellis/u });
  await expect(region).toBeFocused();

  await region.press('?');
  const search = page.getByRole('searchbox', { name: /Search document backward/u });
  await expect(search).toHaveAttribute('placeholder', 'Search backward…');
  await expect(page.locator('[data-reader-search-prefix]')).toHaveText('?');
  await search.fill('trellis');
  await search.press('Enter');

  const status = page.locator('[data-reader-search-status]');
  const statusSection = page.locator('[data-terminal-reader-status]');
  await expect(statusSection).toHaveAttribute('data-reader-search-active', '');
  await expect(status).toHaveText(/^\d+\/\d+ matches for “trellis”\.$/u);
  const state = await page.evaluate(() => {
    const all = CSS.highlights.get('terminal-reader-search');
    const active = CSS.highlights.get('terminal-reader-search-active');
    const ranges = [...(all ?? [])].map((range) => {
      const container = range.startContainer.nodeType === Node.ELEMENT_NODE
        ? range.startContainer as Element
        : range.startContainer.parentElement;
      return {
        text: range.toString(),
        unit: container?.closest<HTMLElement>('[data-reader-unit]')?.dataset.readerUnit ?? ''
      };
    });
    return {
      ranges,
      activeText: [...(active ?? [])][0]?.toString() ?? '',
      status: document.querySelector<HTMLElement>('[data-reader-search-status]')?.textContent ?? ''
    };
  });
  expect(state.ranges.length).toBeGreaterThan(1);
  expect(state.ranges.every(({ text }) => text.toLocaleLowerCase() === 'trellis')).toBe(true);
  const rangesByUnit = state.ranges.reduce<Record<string, number>>((counts, { unit }) => ({
    ...counts,
    [unit]: (counts[unit] ?? 0) + 1
  }), {});
  expect(Object.values(rangesByUnit).some((count) => count > 1)).toBe(true);
  expect(state.activeText.toLocaleLowerCase()).toBe('trellis');
  const initialStatus = state.status;

  await region.press('n');
  await expect(status).not.toHaveText(initialStatus);
  const nextActiveText = await page.evaluate(() => [...(CSS.highlights.get('terminal-reader-search-active') ?? [])][0]?.toString() ?? '');
  expect(nextActiveText.toLocaleLowerCase()).toBe('trellis');

  await region.press('N');
  await expect(status).toHaveText(initialStatus);
});

test('reader keeps committed search status visible while scrolling and clears it on cancellation', async ({ page }) => {
  await page.goto('/posts/ai/llm-workflow-with-trellis/#terminal-reader');
  const region = page.getByRole('region', { name: /Read-only Vim reader for llm-workflow-with-trellis/u });
  await region.focus();
  await region.press('/');
  const search = page.getByRole('searchbox', { name: /Search document forward/u });
  await search.fill('trellis');
  await search.press('Enter');

  const statusSection = page.locator('[data-terminal-reader-status]');
  const status = page.locator('[data-reader-search-status]');
  await expect(statusSection).toHaveAttribute('data-reader-search-active', '');
  await expect(statusSection).toHaveCSS('position', 'fixed');
  const initialStatus = await status.textContent();
  await expect(status).toBeVisible();
  await expect(page.locator('[data-reader-message]')).toBeHidden();
  await expect(page.locator('[data-reader-announcer]')).toHaveAttribute('aria-live', 'polite');

  const viewportStatus = await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight / 2);
    const section = document.querySelector<HTMLElement>('[data-terminal-reader-status]');
    if (section === null) throw new Error('Missing reader status section.');
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
  await expect(statusSection).toHaveAttribute('data-reader-search-active', '');
  await page.keyboard.press('N');
  await expect(status).toHaveText(initialStatus ?? '');

  await page.keyboard.press('/');
  await expect(statusSection).not.toHaveAttribute('data-reader-search-active');
  await expect(status).toHaveText(initialStatus ?? '');
  await page.keyboard.press('Enter');
  await expect(statusSection).not.toHaveAttribute('data-reader-search-active');
  await expect(status).toBeHidden();

  await page.keyboard.press('/');
  const cancelledSearch = page.getByRole('searchbox', { name: /Search document forward/u });
  await cancelledSearch.fill('trellis');
  await cancelledSearch.press('Enter');
  await expect(statusSection).toHaveAttribute('data-reader-search-active', '');
  await page.keyboard.press('/');
  await page.getByRole('searchbox', { name: /Search document forward/u }).press('Escape');
  await expect(statusSection).not.toHaveAttribute('data-reader-search-active');
});

test('reader search cycles keep transient prompt chrome separate in both directions', async ({ page }) => {
  const routes = [
    {
      path: '/posts/ai/llm-workflow-with-trellis/#terminal-reader',
      regionName: /Read-only Vim reader for llm-workflow-with-trellis/u,
      query: 'trellis'
    },
    {
      path: '/pages/about/#terminal-reader',
      regionName: /Read-only Vim reader for About this foundation/u,
      query: 'foundation'
    }
  ];

  for (const route of routes) {
    await page.goto(route.path);
    const region = page.getByRole('region', { name: route.regionName });
    await region.focus();
    const statusSection = page.locator('[data-terminal-reader-status]');
    const status = page.locator('[data-reader-search-status]');
    let committedStatus: string | null = null;

    for (const direction of [
      { key: '/', prefix: '/', label: /Search document forward/u, placeholder: 'Search forward…' },
      { key: '?', prefix: '?', label: /Search document backward/u, placeholder: 'Search backward…' }
    ]) {
      await region.press(direction.key);
      const input = page.getByRole('searchbox', { name: direction.label });
      await expect(input).toBeFocused();
      const metrics = await readerSearchMetrics(page);
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
      await expect(page.locator('[data-reader-search-prefix]')).toHaveText(direction.prefix);
      await expect(input).toHaveAttribute('placeholder', direction.placeholder);
      await expect(statusSection).not.toHaveAttribute('data-reader-search-active');
      if (committedStatus === null) await expect(status).toBeHidden();
      else await expect(status).toHaveText(committedStatus);

      await input.fill(route.query);
      await input.press('Enter');
      await expect(statusSection).toHaveAttribute('data-reader-search-active', '');
      await expect(status).toContainText(`matches for “${route.query}”.`);
      await expect(statusSection).toHaveCSS('position', 'fixed');
      const activeMetrics = await page.evaluate(() => {
        const statusNode = document.querySelector<HTMLElement>('[data-terminal-reader-status]');
        if (statusNode === null) throw new Error('Missing reader status section.');
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
      await expect(statusSection).not.toHaveAttribute('data-reader-search-active');
      await expect(status).toHaveText(committedStatus ?? '');
      const reopenedMetrics = await readerSearchMetrics(page);
      expect(reopenedMetrics.formDisplay).toBe('flex');
      expect(reopenedMetrics.gap).toBeGreaterThanOrEqual(8);
      expect(reopenedMetrics.inputHeight).toBeGreaterThanOrEqual(44);
      expect(reopenedMetrics.focusWithin).toBe(true);
      expect(reopenedMetrics.documentWidth).toBeLessThanOrEqual(reopenedMetrics.viewportWidth);
      await reopened.press('Escape');
      await expect(region).toBeFocused();
      await expect(statusSection).not.toHaveAttribute('data-reader-search-active');
      await expect(status).toBeHidden();
      committedStatus = null;
    }

    await region.press(':');
    const command = page.getByRole('textbox', { name: 'Reader command' });
    await expect(command).toBeFocused();
    const commandMetrics = await page.evaluate(() => {
      const form = document.querySelector<HTMLFormElement>('[data-reader-command-form]');
      const prefix = form === null ? null : form.querySelector<HTMLElement>(':scope > span');
      const input = document.querySelector<HTMLInputElement>('#terminal-reader-command');
      if (form === null || prefix === null || input === null) throw new Error('Missing reader command controls.');
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

test('reader command input also leaves committed search chrome while editing', async ({ page }) => {
  const region = await openReader(page);
  await region.press('/');
  const search = page.getByRole('searchbox', { name: /Search document forward/u });
  await search.fill('reader');
  await search.press('Enter');

  const statusSection = page.locator('[data-terminal-reader-status]');
  const status = page.locator('[data-reader-search-status]');
  await expect(statusSection).toHaveAttribute('data-reader-search-active', '');
  const committedStatus = await status.textContent();

  await region.press(':');
  const command = page.getByRole('textbox', { name: 'Reader command' });
  await expect(command).toBeFocused();
  await expect(statusSection).not.toHaveAttribute('data-reader-search-active');
  await expect(status).toHaveText(committedStatus ?? '');
  await command.press('Escape');
  await expect(region).toBeFocused();
  await expect(statusSection).not.toHaveAttribute('data-reader-search-active');
  await expect(status).toBeHidden();
});

test('reader search prefixes keep native labels, direction text, spacing, and target size', async ({ page }) => {
  const routes = [
    {
      path: '/posts/ai/llm-workflow-with-trellis/#terminal-reader',
      regionName: /Read-only Vim reader for llm-workflow-with-trellis/u
    },
    {
      path: '/pages/about/#terminal-reader',
      regionName: /Read-only Vim reader for About this foundation/u
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
        const prefix = document.querySelector<HTMLElement>('[data-reader-search-prefix]');
        const searchInput = document.querySelector<HTMLInputElement>('#terminal-reader-search');
        if (prefix === null || searchInput === null) throw new Error('Missing reader search controls.');
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
        path: testInfo.outputPath('reader-frame-3840.png'),
        animations: 'disabled'
      });
    }
  }
});

test('Terminal reader keeps committed search status visible while scrolling', async ({ page }) => {
  await page.goto('/pages/about/#terminal-reader');
  const region = page.getByRole('region', { name: /Read-only Vim reader for About this foundation/u });
  await expect(region).toBeFocused();
  const initialMetrics = await readerSearchMetrics(page);
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

  const statusSection = page.locator('[data-terminal-reader-status]');
  const status = page.locator('[data-reader-search-status]');
  await expect(statusSection).toHaveAttribute('data-reader-search-active', '');
  await expect(statusSection).toHaveCSS('position', 'fixed');
  await expect(status).toBeVisible();
  await expect(page.locator('[data-reader-message]')).toBeHidden();
  await expect(page.locator('[data-reader-announcer]')).toHaveAttribute('aria-live', 'polite');

  const viewportStatus = await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight / 2);
    const section = document.querySelector<HTMLElement>('[data-terminal-reader-status]');
    if (section === null) throw new Error('Missing Terminal reader status section.');
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

test('reader preserves links, local-scroll regions, modifier keys, IME, and manual selection', async ({ page }) => {
  const region = await openReader(page);
  const initialPosition = await page.locator('[data-reader-position]').textContent();
  const link = page.getByRole('link', { name: 'https://github.com/mindfold-ai/Trellis.git' });
  await link.focus();
  await page.keyboard.press('j');
  await expect(link).toBeFocused();
  const code = page.getByRole('region', { name: /^Code content:/u }).first();
  await code.focus();
  await page.keyboard.press('j');
  await expect(code).toBeFocused();
  await region.focus();
  await region.press('Control+j');
  await expect(page.locator('[data-reader-position]')).toHaveText(initialPosition ?? '');

  const ariaControl = page.locator('[data-reader-aria-control]');
  await region.evaluate((element) => {
    const control = document.createElement('div');
    control.dataset.readerAriaControl = '';
    control.setAttribute('role', 'checkbox');
    control.setAttribute('aria-checked', 'false');
    control.tabIndex = 0;
    element.append(control);
  });
  await ariaControl.focus();
  await page.keyboard.press('j');
  await expect(ariaControl).toBeFocused();
  await expect(page.locator('[data-reader-position]')).toHaveText(initialPosition ?? '');

  const imeResult = await region.evaluate((element) => element.dispatchEvent(new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    isComposing: true,
    key: 'j'
  })));
  expect(imeResult).toBe(true);

  await page.evaluate(() => {
    const paragraph = document.querySelector<HTMLElement>('[data-terminal-reader-region] p');
    const selection = window.getSelection();
    if (paragraph === null || selection === null) throw new Error('Missing manual selection fixture.');
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await region.press('j');
  await expect(page.locator('[data-reader-position]')).toHaveText(initialPosition ?? '');
});

test('reader never treats a user-replaced visual Range as its owned selection', async ({ page }) => {
  const region = await openReader(page);
  const position = page.locator('[data-reader-position]');
  await region.press('v');
  await region.press('j');
  const visualPosition = await position.textContent();

  await page.evaluate(() => {
    const paragraph = document.querySelector<HTMLElement>('[data-terminal-reader-region] p');
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

test('vim resolves a closed canonical destination and :q exits directly to home', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: /Command for guest\(\.ᗜ ᴗ ᗜ\.\)firefly:~\/blog\/posts #$/u });
  await input.fill('vim ./ai/llm-workflow-with-trellis.md');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/posts\/ai\/llm-workflow-with-trellis\/#terminal-reader$/u);
  const region = page.getByRole('region', { name: /Read-only Vim reader for llm-workflow-with-trellis/u });
  await expect(region).toBeFocused();
  await region.press('G');
  await expect(page.locator('[data-reader-position]')).not.toHaveText(/^1\//u);
  await region.press(':');
  const command = page.getByRole('textbox', { name: 'Reader command' });
  await command.fill('q');
  await command.press('Enter');
  await expect(page).toHaveURL(/\/$/u);
});

test('vim opens a Terminal document reader with the unified presentation', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: /Command for guest\(\.ᗜ ᴗ ᗜ\.\)firefly:~\/blog\/posts #$/u });
  await input.fill('vim ~/blog/pages/about.md');
  await input.press('Enter');

  await expect(page).toHaveURL(/\/pages\/about\/#terminal-reader$/u);
  await expect(page.locator('.terminal-document')).toHaveCount(1);
  await expect(page.locator('.semantic-document')).toHaveCount(0);
  const region = page.getByRole('region', { name: /Read-only Vim reader for About this foundation/u });
  await expect(region).toBeFocused();
  await expect(page.locator('[data-terminal-reader-status]')).toBeVisible();
  await region.press('G');
  await expect(page.locator('[data-reader-position]')).not.toHaveText(/^1\//u);

  await region.press(':');
  const command = page.getByRole('textbox', { name: 'Reader command' });
  await command.fill('q');
  await command.press('Enter');
  await expect(page).toHaveURL(/\/$/u);
});

test('reader fragment focus does not perform a second programmatic scroll', async ({ page }) => {
  await page.addInitScript(() => {
    const nativeScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (...args: Parameters<typeof nativeScrollIntoView>) {
      const windowWithCounter = window as typeof window & { __readerScrollCount?: number };
      windowWithCounter.__readerScrollCount = (windowWithCounter.__readerScrollCount ?? 0) + 1;
      return nativeScrollIntoView.apply(this, args);
    };
  });

  await page.goto('/posts/ai/llm-workflow-with-trellis/#terminal-reader');
  await expect.poll(() => page.evaluate(() => document.activeElement?.id ?? '')).toBe('terminal-reader');
  const result = await page.evaluate(() => ({
    active: document.activeElement?.id,
    hash: window.location.hash,
    scrollCount: (window as typeof window & { __readerScrollCount?: number }).__readerScrollCount ?? 0
  }));
  expect(result.active).toBe('terminal-reader');
  expect(result.hash).toBe('#terminal-reader');
  expect(result.scrollCount).toBe(0);
});

test('direct canonical permalinks keep reader focus and key ownership idle', async ({ page }) => {
  await page.goto('/posts/ai/llm-workflow-with-trellis/');
  const foundationRegion = page.getByRole('region', { name: /Read-only Vim reader for llm-workflow-with-trellis/u });
  await expect(foundationRegion).not.toBeFocused();
  await expect(page.locator('[data-terminal-reader-status]')).toBeVisible();
  const foundationPosition = page.locator('[data-reader-position]');
  await page.keyboard.press('G');
  await expect(foundationPosition).toHaveText(/^1\//u);

  await page.goto('/pages/about/');
  const terminalRegion = page.getByRole('region', { name: /Read-only Vim reader for About this foundation/u });
  await expect(terminalRegion).not.toBeFocused();
  await expect(page.locator('[data-terminal-reader-status]')).toBeVisible();
  const terminalPosition = page.locator('[data-reader-position]');
  await page.keyboard.press('G');
  await expect(terminalPosition).toHaveText(/^1\//u);

  await page.goto('/pages/about/#terminal-reader');
  await expect(page.getByRole('region', { name: /Read-only Vim reader for About this foundation/u })).toBeFocused();
});

test('reader entry keeps native Back and Forward route boundaries', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: /Command for guest\(\.ᗜ ᴗ ᗜ\.\)firefly:~\/blog\/posts #$/u });
  await input.fill('vim ~/blog/pages/about.md');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/pages\/about\/#terminal-reader$/u);

  await page.goBack();
  await expect(page).toHaveURL(/\/$/u);
  await expect(page.getByRole('textbox', { name: /Command for guest\(\.ᗜ ᴗ ᗜ\.\)firefly:~\/blog\/posts #$/u })).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL(/\/pages\/about\/#terminal-reader$/u);
  await expect(page.getByRole('region', { name: /Read-only Vim reader for About this foundation/u })).toBeFocused();
});
