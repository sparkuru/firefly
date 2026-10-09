import { expect, test, type Page } from '@playwright/test';

async function expectContainedPage(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

async function readingGeometry(page: Page, selector: string) {
  return page.locator(selector).evaluate((root) => {
    const paragraph = root.querySelector(':scope > p');
    const wide = root.querySelector<HTMLElement>('[role="region"]');
    if (paragraph === null || wide === null) throw new Error('Missing reading fixture blocks.');
    return {
      paragraph: paragraph.getBoundingClientRect().width,
      root: root.getBoundingClientRect().width,
      wide: wide.getBoundingClientRect().width,
      overflow: getComputedStyle(wide).overflowX,
      text: paragraph.textContent
    };
  });
}

test('default reading follows page width and keeps native wide and paper regions independent', async ({ page }) => {
  await page.goto('/pages/markdown-template/');
  const prose = page.locator('.terminal-prose');
  const geometry = await readingGeometry(page, '.terminal-prose');
  expect(geometry.text).toContain('Write the page in Markdown');
  await expect(prose).toContainText('这是一段合成的中文排版样本');
  expect(geometry.overflow).toBe('auto');
  expect(geometry.paragraph).toBeCloseTo(geometry.root, 0);
  expect(geometry.wide).toBeLessThanOrEqual(geometry.root);
  await prose.evaluate((root) => root.setAttribute('data-content-theme', 'paper'));
  const paper = await readingGeometry(page, '.terminal-prose');
  const paperPadding = await prose.evaluate((root) => Number.parseFloat(getComputedStyle(root).paddingLeft));
  expect(paper.paragraph).toBeCloseTo(paper.root - paperPadding * 2 - 2, 0);
  await expectContainedPage(page);
});

test('touch directory and outline targets navigate with non-overlapping hit areas', async ({ page }, info) => {
  test.skip(!info.project.name.includes('mobile'), 'Touch policy uses the maintained touch projects.');
  for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 812, height: 375 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/pages/');
    const directoryLinks = page.locator('.terminal-directory a');
    await directoryLinks.last().evaluate((anchor) => {
      anchor.textContent = `目录_${'long_unbroken_label_中文'.repeat(12)}.md`;
    });
    const directoryTargets = await directoryLinks.evaluateAll((anchors) => anchors.map((anchor) => {
      const { top, bottom, left, right, height } = anchor.getBoundingClientRect();
      return { top, bottom, left, right, height };
    }));
    for (const [index, target] of directoryTargets.entries()) {
      expect(target.left).toBeGreaterThanOrEqual(0);
      expect(target.right).toBeLessThanOrEqual(viewport.width);
      for (const other of directoryTargets.slice(index + 1)) {
        const overlapWidth = Math.min(target.right, other.right) - Math.max(target.left, other.left);
        const overlapHeight = Math.min(target.bottom, other.bottom) - Math.max(target.top, other.top);
        expect(overlapWidth > 0.5 && overlapHeight > 0.5).toBe(false);
      }
    }
    for (const link of await directoryLinks.all()) {
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole('link', { name: '~/blog/pages/about.md', exact: true }).click();
    await expect(page).toHaveURL(/\/pages\/about\/$/u);
    const links = page.locator('.terminal-outline a');
    const targets = await links.evaluateAll((anchors) => anchors.map((anchor) => {
      const rect = anchor.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, height: rect.height };
    }));
    for (const [index, target] of targets.entries()) {
      expect(target.height).toBeGreaterThanOrEqual(44);
      if (index > 0) expect(target.top).toBeGreaterThanOrEqual(targets[index - 1].bottom);
    }
    await links.last().click();
    await expect(page).toHaveURL(/#what-remains-constant$/u);
    await expect(page.locator('#what-remains-constant')).toBeVisible();
    await expectContainedPage(page);
  }
});

test('wide code keeps keyboard scrolling local to its native region', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/pages/markdown-template/');
  const code = page.locator('.terminal-prose').getByRole('region', { name: /^Code content:/u }).last();
  expect(await code.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await code.focus();
  await expect(code).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => code.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollX)).toBe(0);
  await expectContainedPage(page);
});

test('reading, long paths and focused native controls survive enlarged text and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ['/pages/', '/posts/ai/', '/pages/markdown-template/']) {
    await page.goto(route);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await expectContainedPage(page);
    const link = page.locator('.terminal-directory a, .terminal-outline a').first();
    await link.focus();
    await expect(link).toBeFocused();
    expect(await link.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');
    expect(await link.evaluate((element) => Number.parseFloat(getComputedStyle(element).transitionDuration))).toBeLessThan(.001);
  }
});

test('empty command hint preserves native input, help/history and streamed reading', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-desktop-interactive', 'Command sessions belong to interactive fine-pointer desktop.');
  await page.goto('/');
  const input = page.locator('#terminal-command');
  await expect(input).toHaveAttribute('placeholder', 'help');
  await expect(input).toHaveValue('');
  await input.press('Enter');
  await expect(input).not.toHaveAttribute('placeholder');
  await expect(page.locator('.terminal-help')).toHaveCount(0);
  await input.fill('help');
  await input.press('Enter');
  await expect(page.locator('.terminal-help')).toBeVisible();
  await expect(input).toHaveValue('');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('help');
  await input.fill('cat ~/blog/pages/markdown-template.md');
  await input.press('Enter');
  await expect(page.locator('.terminal-stream-prose')).toBeVisible();
  const streamed = await readingGeometry(page, '.terminal-stream-prose');
  expect(streamed.paragraph).toBeCloseTo(streamed.root, 0);
  expect(streamed.wide).toBeLessThanOrEqual(streamed.root);
  await expect(page.locator('.terminal-stream-prose')).toContainText('这是一段合成的中文排版样本');
  await expectContainedPage(page);
});

test('first-index hint retires on use and does not recur after reload or return', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-desktop-interactive', 'Desktop interactive hint lifecycle.');
  await page.goto('/');
  const input = page.locator('#terminal-command');
  await expect(input).toBeVisible();
  await expect(input).toHaveAttribute('placeholder', 'help');
  await expect(input).toHaveValue('');
  await input.fill('help');
  await input.fill('');
  await expect(input).not.toHaveAttribute('placeholder');
  await page.reload();
  await expect(input).toBeVisible();
  await expect(input).not.toHaveAttribute('placeholder');
  await page.goto('/pages/about/');
  await page.goBack();
  await expect(input).toBeVisible();
  await expect(input).not.toHaveAttribute('placeholder');
});

test('a restored first index visit retires its hint even without command use', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-desktop-interactive', 'Desktop persisted-page hint lifecycle.');
  await page.goto('/');
  const input = page.locator('#terminal-command');
  await expect(input).toHaveAttribute('placeholder', 'help');
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(input).not.toHaveAttribute('placeholder');
  await expect(input).toHaveValue('');
  await page.reload();
  await expect(input).toBeVisible();
  await expect(input).not.toHaveAttribute('placeholder');
});

test('blocked storage retains operational commands and mobile does not consume a desktop hint', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'chromium-desktop-interactive', 'Desktop interactive and fresh touch contexts.');
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get: () => { throw new DOMException('Blocked', 'SecurityError'); } });
  });
  await page.goto('/');
  const input = page.locator('#terminal-command');
  await expect(input).toBeVisible();
  await expect(input).toHaveAttribute('placeholder', 'help');
  await input.fill('help');
  await input.press('Enter');
  await expect(page.locator('.terminal-help')).toBeVisible();
  await expect(input).not.toHaveAttribute('placeholder');

  const touchContext = await context.browser()!.newContext({
    baseURL: 'http://127.0.0.1:4321/', hasTouch: true, viewport: { width: 375, height: 812 }
  });
  try {
    const phone = await touchContext.newPage();
    await phone.goto('/');
    await expect(phone.locator('#terminal-command')).toBeHidden();
    expect(await phone.evaluate(() => localStorage.getItem('firefly.terminal.help-seen'))).toBeNull();
    const freshDesktop = await context.browser()!.newContext({
      baseURL: 'http://127.0.0.1:4321/', storageState: await touchContext.storageState(),
      viewport: { width: 1440, height: 900 }
    });
    try {
      const desktop = await freshDesktop.newPage();
      await desktop.goto('/');
      await expect(desktop.locator('#terminal-command')).toBeVisible();
      await expect(desktop.locator('#terminal-command')).toHaveAttribute('placeholder', 'help');
    } finally { await freshDesktop.close(); }
  } finally { await touchContext.close(); }
});

async function prepareLongTranscript(page: Page) {
  await page.goto('/');
  const input = page.locator('#terminal-command');
  await expect(input).toBeVisible();
  for (let index = 0; index < 4; index += 1) {
    await input.fill('ls ~/blog/posts/');
    await input.press('Enter');
  }
  await expect(page.locator('.terminal-record:not(.terminal-boot-record)')).toHaveCount(4);
  return input;
}

async function completionGeometry(page: Page) {
  return page.evaluate(() => {
    const row = document.querySelector('.terminal-command-row')!.getBoundingClientRect();
    const panel = document.querySelector('[data-terminal-completion]')!.getBoundingClientRect();
    const list = document.querySelector<HTMLElement>('.terminal-completion-list');
    const active = list?.querySelector('[data-active]')?.getBoundingClientRect();
    const listRect = list?.getBoundingClientRect();
    return {
      height: innerHeight, rowTop: row.top, rowBottom: row.bottom, rowCenter: (row.top + row.bottom) / 2,
      center: (row.top + panel.bottom) / 2, panelBottom: panel.bottom,
      activeVisible: active !== undefined && listRect !== undefined &&
        active.top >= listRect.top - 1 && active.bottom <= listRect.bottom + 1,
      localScroll: list?.scrollTop ?? 0, horizontalScroll: scrollX, pageScroll: scrollY
    };
  });
}

test('Tab centers fitting completion after long output while preserving selection and ignored keys', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-desktop-interactive', 'Desktop completion viewport ownership.');
  const input = await prepareLongTranscript(page);
  await input.fill('cat ~/blog/p');
  await page.evaluate(() => {
    const row = document.querySelector('.terminal-command-row')!.getBoundingClientRect();
    window.scrollTo({ top: scrollY + row.top - 830, behavior: 'instant' });
  });
  await input.press('Tab');
  await expect(page.getByRole('option')).toHaveCount(2);
  await expect.poll(async () => Math.abs((await completionGeometry(page)).center - 450)).toBeLessThan(3);
  await input.press('Tab');
  await expect(input).toHaveAttribute('aria-activedescendant', 'terminal-completion-option-0');
  await input.press('ArrowDown');
  await expect(input).toHaveAttribute('aria-activedescendant', 'terminal-completion-option-1');
  expect((await completionGeometry(page)).activeVisible).toBe(true);
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('cat ~/blog/p');
  const guarded = await input.evaluate((element) => {
    const before = window.scrollY;
    for (const flags of [{ shiftKey: true }, { ctrlKey: true }, { altKey: true }, { metaKey: true }, { isComposing: true }]) {
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true, ...flags }));
    }
    return { before, after: window.scrollY, value: (element as HTMLInputElement).value };
  });
  expect(guarded.after).toBe(guarded.before);
  expect(guarded.value).toBe('cat ~/blog/p');
  await page.screenshot({ path: 'artifacts/design-refinement/owner-revision/completion-fitting.png' });
  await input.press('Enter');
  await expect(input).toHaveValue('cat ~/blog/posts/');
  await expect(page.getByRole('option')).toHaveCount(0);

  for (const command of ['hel', 'cat ./does-not-exist']) {
    await input.fill(command);
    await input.press('Tab');
    await expect.poll(async () => {
      const geometry = await completionGeometry(page);
      return geometry.rowTop >= 0 && geometry.rowBottom <= geometry.height && geometry.panelBottom <= geometry.height;
    }).toBe(true);
    await expect(input).toBeFocused();
  }
  await expectContainedPage(page);
});

test('fully visible completion stays off-center through first Tab and repeated selection', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-desktop-interactive', 'Desktop completion viewport ownership.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const input = await prepareLongTranscript(page);
  await input.fill('theme firefly');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => {
    const row = document.querySelector('.terminal-command-row')!.getBoundingClientRect();
    window.scrollTo({ top: scrollY + row.top - 620, behavior: 'instant' });
    const tracker = window as Window & { completionScrollCalls?: number };
    tracker.completionScrollCalls = 0;
    const nativeScrollBy = window.scrollBy;
    window.scrollBy = (...args: unknown[]) => {
      tracker.completionScrollCalls = (tracker.completionScrollCalls ?? 0) + 1;
      Reflect.apply(nativeScrollBy, window, args);
    };
  });
  const before = await completionGeometry(page);
  expect(before.rowTop).toBeCloseTo(620, 0);
  await input.press('Tab');
  await expect(page.getByRole('option')).toHaveText(['firefly-dark', 'firefly-white']);
  const first = await completionGeometry(page);
  expect(first.panelBottom).toBeLessThan(900);
  expect(first.rowTop).toBe(before.rowTop);
  expect(first.pageScroll).toBe(before.pageScroll);
  const draft = await input.inputValue();
  for (const key of ['Tab', 'Tab', 'ArrowDown', 'ArrowUp', 'Tab', 'ArrowDown']) {
    await input.press(key);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const geometry = await completionGeometry(page);
    expect(geometry.rowTop).toBe(before.rowTop);
    expect(geometry.pageScroll).toBe(before.pageScroll);
    expect(geometry.activeVisible).toBe(true);
    await expect(input).toBeFocused();
    await expect(input).toHaveValue(draft);
  }
  expect(await page.evaluate(() => (window as Window & { completionScrollCalls?: number }).completionScrollCalls)).toBe(0);
});

test('visible completion at page end retains settlement space and selection placement', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-desktop-interactive', 'Desktop completion viewport ownership.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const input = await prepareLongTranscript(page);
  await input.fill('theme firefly');
  await page.evaluate(() => {
    const row = document.querySelector('.terminal-command-row')!.getBoundingClientRect();
    window.scrollTo({ top: scrollY + row.top - 830, behavior: 'instant' });
  });
  await input.press('Tab');
  await expect(page.locator('[data-terminal-form]')).toHaveAttribute('data-terminal-completion-settled', '');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const before = await completionGeometry(page);
  expect(before.rowTop).toBeGreaterThanOrEqual(0);
  expect(before.panelBottom).toBeLessThan(900);
  for (const key of ['Tab', 'ArrowDown', 'Tab', 'ArrowUp']) {
    await input.press(key);
    const after = await completionGeometry(page);
    expect(after.pageScroll).toBe(before.pageScroll);
    expect(after.rowTop).toBe(before.rowTop);
    expect(after.activeVisible).toBe(true);
    await expect(page.locator('[data-terminal-form]')).toHaveAttribute('data-terminal-completion-settled', '');
  }
});

test('oversized completion caps the prompt at midpoint and scrolls selected options locally', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-desktop-interactive', 'Desktop completion viewport ownership.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 350 });
  const input = await prepareLongTranscript(page);
  await input.fill('cat ~/blog/posts/');
  await input.press('Tab');
  const count = await page.getByRole('option').count();
  expect(count).toBeGreaterThan(5);
  let geometry = await completionGeometry(page);
  expect(geometry.rowCenter).toBeCloseTo(175, 0);
  expect(geometry.panelBottom).toBeLessThanOrEqual(333);
  for (let index = 0; index < count; index += 1) {
    await input.press('Tab');
    geometry = await completionGeometry(page);
    expect(geometry.activeVisible).toBe(true);
    expect(geometry.rowCenter).toBeCloseTo(175, 0);
    expect(geometry.horizontalScroll).toBe(0);
  }
  expect(geometry.localScroll).toBeGreaterThan(0);
  await page.screenshot({ path: 'artifacts/design-refinement/owner-revision/completion-oversized.png' });
  await input.press('ArrowDown');
  await expect(input).toHaveAttribute('aria-activedescendant', 'terminal-completion-option-0');
  expect((await completionGeometry(page)).activeVisible).toBe(true);
  await input.press('ArrowUp');
  expect((await completionGeometry(page)).activeVisible).toBe(true);
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('cat ~/blog/posts/');
  await page.setViewportSize({ width: 768, height: 260 });
  await input.press('Tab');
  geometry = await completionGeometry(page);
  expect(geometry.rowCenter).toBeCloseTo(130, 0);
  expect(geometry.panelBottom).toBeLessThanOrEqual(geometry.height - Math.min(24, geometry.height * .05) + .5);
  expect(geometry.activeVisible).toBe(true);
  await input.press('ArrowUp');
  expect((await completionGeometry(page)).activeVisible).toBe(true);
  await expect(input).toBeFocused();
  await input.press('Space');
  await expect(input).not.toHaveValue('cat ~/blog/posts/');
  await expect(page.getByRole('option')).toHaveCount(0);
  await expectContainedPage(page);
});
