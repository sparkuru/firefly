import { expect, test } from '@playwright/test';
import { SITE_CONFIG } from '../src/lib/site-config.mjs';

const post = '/posts/ai/llm-workflow-with-trellis/';

test('standalone metadata uses source bytes and ordered date, license and enhanced Share', async ({ page }, info) => {
  await page.goto(post);
  const row = page.locator('[data-document-file-metadata]');
  const bytes = await row.locator('[data-terminal-source-bytes]').getAttribute('data-terminal-source-bytes');
  expect(Number(bytes)).toBeGreaterThan(0);
  await expect(row.locator('time')).toHaveText('2026-05-28');
  await expect(row.locator('[data-terminal-source-bytes]')).toHaveText(`${bytes} bytes`);
  await expect(row.locator('[data-terminal-license]')).toHaveText('CC BY-NC 4.0');
  await expect(row.locator('[data-terminal-license]')).toHaveAttribute('href', 'https://creativecommons.org/licenses/by-nc/4.0/');
  expect(await row.evaluate(root => [...root.querySelectorAll('time,[data-terminal-source-bytes],[data-terminal-license],[data-document-share]')].map(node => node.textContent))).toEqual(['2026-05-28', `${bytes} bytes`, 'CC BY-NC 4.0', 'Share']);
  const share = row.locator('[data-document-share]');
  if (info.project.use.javaScriptEnabled === false) {
    await expect(share).toBeHidden();
    await expect(row.locator('[data-document-share-group]')).toBeHidden();
  } else {
    await expect(share).toBeVisible();
    if (info.project.name.includes('mobile')) expect((await share.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    const separator = await row.locator('[data-document-share-group] > span').boundingBox();
    const button = await share.boundingBox();
    expect(separator!.y).toBeLessThan(button!.y + button!.height);
    expect(separator!.y + separator!.height).toBeGreaterThan(button!.y);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (info.project.use.javaScriptEnabled !== false) {
    const geometry = await row.evaluate(root => ({
      row: root.getBoundingClientRect().toJSON(),
      button: root.querySelector('[data-document-share]')!.getBoundingClientRect().toJSON(),
      titleBottom: root.previousElementSibling!.getBoundingClientRect().bottom,
      viewport: { width: innerWidth, height: innerHeight }
    }));
    await info.attach('standalone-metadata-geometry', { body: JSON.stringify(geometry), contentType: 'application/json' });
    await page.screenshot({ path: info.outputPath('standalone-metadata.png') });
  }
  await page.goto('/pages/about/');
  await expect(page.locator('[data-document-file-metadata] time')).toHaveText(/\d{4}-\d{2}-\d{2}/u);
  await expect(page.locator('[data-document-file-metadata] [data-terminal-license]')).toHaveCount(0);
});

test('standalone Share keeps its separator on the same line at 375px with enlarged text', async ({ page }, info) => {
  test.skip(info.project.use.javaScriptEnabled === false, 'Share is progressively enhanced.');
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto(post);
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  const row = page.locator('[data-document-file-metadata]');
  const button = row.locator('[data-document-share]');
  await expect(button).toBeVisible();
  await row.evaluate(root => root.scrollIntoView({ block: 'center' }));
  const geometry = await row.evaluate(root => {
    const group = root.querySelector('[data-document-share-group]')!;
    return {
      row: root.getBoundingClientRect().toJSON(),
      group: group.getBoundingClientRect().toJSON(),
      separator: group.querySelector('span')!.getBoundingClientRect().toJSON(),
      button: group.querySelector('button')!.getBoundingClientRect().toJSON(),
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth
    };
  });
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.group.x).toBeGreaterThanOrEqual(geometry.row.x - 0.5);
  expect(geometry.group.right).toBeLessThanOrEqual(geometry.row.right + 0.5);
  expect(geometry.separator.y).toBeLessThan(geometry.button.bottom);
  expect(geometry.separator.bottom).toBeGreaterThan(geometry.button.y);
  if (info.project.name.includes('mobile')) expect(geometry.button.height).toBeGreaterThanOrEqual(44);
  await info.attach('standalone-metadata-enlarged-geometry', { body: JSON.stringify(geometry), contentType: 'application/json' });
  await page.screenshot({ path: info.outputPath('standalone-metadata-enlarged.png') });
});

test('Share reports actual clipboard results without moving focus or feedback width', async ({ page }, info) => {
  test.skip(info.project.use.javaScriptEnabled === false, 'Share is progressively enhanced.');
  await page.addInitScript(() => {
    const state = { writes: [] as string[], reject: false };
    Object.assign(window, { shareClipboard: state });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => {
      state.writes.push(text);
      if (state.reject) throw new Error('Denied');
    } } });
  });
  await page.goto(`${post}#document-navigator`);
  const button = page.locator('[data-document-share]');
  await expect(button).toBeVisible();
  const width = (await button.boundingBox())!.width;
  await page.clock.install();
  await button.click();
  await expect(button).toHaveText('Copied');
  await expect(button).toBeFocused();
  expect((await button.boundingBox())!.width).toBeCloseTo(width, 3);
  expect(await page.evaluate(() => (window as any).shareClipboard.writes)).toEqual([new URL(post, SITE_CONFIG.site.url ?? page.url()).href]);
  await button.press('j');
  await expect(button).toBeFocused();
  await expect(page.locator('[data-document-share-announcer]')).toHaveText('Document link copied.');
  await page.clock.fastForward(2001);
  await expect(button).toHaveText('Share');
  await page.evaluate(() => { (window as any).shareClipboard.reject = true; document.execCommand = () => false; });
  await button.click();
  await expect(button).toHaveText('Failed');
  expect((await button.boundingBox())!.width).toBeCloseTo(width, 3);
  await expect(page.locator('[data-document-share-announcer]')).toHaveText('Could not copy document link.');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }));
  await button.click();
  await expect(button).toHaveText('Failed');
  await expect(button).toBeFocused();
});

test('pending Share serializes clicks and retires old lifecycle promises', async ({ page }, info) => {
  test.skip(info.project.use.javaScriptEnabled === false, 'Share is progressively enhanced.');
  await page.addInitScript(() => {
    const writes: string[] = [];
    const resolve: Array<() => void> = [];
    const reject: Array<() => void> = [];
    const state = { writes, resolve, reject, nativeCalls: 0 };
    Object.assign(window, { sharePending: state });
    document.execCommand = () => { state.nativeCalls += 1; return false; };
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: (text: string) => {
      writes.push(text); return new Promise<void>((done, fail) => { resolve.push(done); reject.push(() => fail(new Error('Denied'))); });
    } } });
  });
  await page.goto('/pages/about/');
  const button = page.locator('[data-document-share]');
  await expect(button).toBeVisible();
  await page.clock.install();
  await button.click(); await button.click();
  expect(await page.evaluate(() => (window as any).sharePending.writes.length)).toBe(1);
  await page.evaluate(() => { dispatchEvent(new PageTransitionEvent('pagehide')); dispatchEvent(new PageTransitionEvent('pageshow')); });
  await button.click();
  expect(await page.evaluate(() => (window as any).sharePending.writes.length)).toBe(2);
  await page.evaluate(() => (window as any).sharePending.reject[0]());
  await expect(button).toHaveText('Share');
  expect(await page.evaluate(() => (window as any).sharePending.nativeCalls)).toBe(0);
  await button.click();
  expect(await page.evaluate(() => (window as any).sharePending.writes.length)).toBe(2);
  await page.evaluate(() => (window as any).sharePending.resolve[1]());
  await expect(button).toHaveText('Copied');
  await page.clock.fastForward(2001);
  await expect(button).toHaveText('Share');
});

test('Share starts independently when no document navigator is emitted', async ({ page }, info) => {
  test.skip(info.project.use.javaScriptEnabled === false, 'Share is progressively enhanced.');
  await page.route('**/pages/about/', async route => {
    const response = await route.fetch();
    const html = (await response.text()).replace(/<script\b[^>]*src="[^"]*DocumentNavigationStatus[^"]*"[^>]*><\/script>/gu, '')
      .replace(/\sdata-document-navigator(?:-[a-z-]+)?(?:="[^"]*")?/gu, '');
    await route.fulfill({ response, body: html });
  });
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} } }));
  await page.goto('/pages/about/');
  await expect(page.locator('[data-document-navigator]')).toHaveCount(0);
  const button = page.locator('[data-document-share]');
  await button.click();
  await expect(button).toHaveText('Copied');
});

test('HTTP Share copies through the real native clipboard and preserves reading state', async ({ page }, info) => {
  test.skip(info.project.use.javaScriptEnabled === false, 'Share is progressively enhanced.');
  await page.route('http://firefly-preview.test/**', async route => {
    const requested = new URL(route.request().url());
    const response = await route.fetch({ url: `http://127.0.0.1:4321${requested.pathname}${requested.search}`,
      headers: { ...route.request().headers(), host: '127.0.0.1:4321' } });
    await route.fulfill({ response });
  });
  const cases = [{ inline: false, rejected: false }, { inline: false, rejected: true }];
  if (!info.project.name.includes('mobile')) cases.push({ inline: true, rejected: false });
  for (const { inline, rejected } of cases) {
    await page.goto(`http://firefly-preview.test${inline ? '/' : '/pages/markdown-template/#document-navigator'}`);
    expect(await page.evaluate(() => ({ secure: isSecureContext, clipboard: typeof navigator.clipboard }))).toEqual({ secure: false, clipboard: 'undefined' });
    if (rejected) await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('Denied'); } } }));
    const input = page.locator('#terminal-command');
    if (inline) {
      await expect(input).toBeVisible();
      await input.fill('cat ~/blog/pages/markdown-template.md'); await input.press('Enter');
      await input.fill('unfinished draft');
      await input.evaluate((element: HTMLInputElement) => element.setSelectionRange(2, 8, 'backward'));
    }
    const button = page.locator(inline ? '[data-terminal-share]' : '[data-document-share]');
    const prose = page.locator(inline ? '.terminal-stream-prose' : '.terminal-prose');
    await button.scrollIntoViewIfNeeded();
    await button.evaluate(button => button.addEventListener('click', () => {
      const code = button.closest('article')!.querySelector<HTMLElement>('[data-terminal-wide="code"]')!;
      code.style.maxWidth = '120px';
      const textNodes = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
      let text = textNodes.nextNode()!;
      while ((text.textContent?.length ?? 0) < 8) text = textNodes.nextNode()!;
      window.getSelection()!.setBaseAndExtent(text, 8, text, 2);
      code.scrollLeft = 35;
      (window as any).copyBaseline = { selection: window.getSelection()!.toString(), anchor: window.getSelection()!.anchorOffset,
        focus: window.getSelection()!.focusOffset, y: scrollY, local: code.scrollLeft };
    }, { capture: true, once: true }));
    await button.click();
    await expect(button).toHaveText('Copied');
    await expect(button).toBeFocused();
    const baseline = await page.evaluate(() => (window as any).copyBaseline);
    expect(baseline.anchor).toBeGreaterThan(baseline.focus);
    expect(baseline.local).toBeGreaterThan(0);
    expect(await page.evaluate(() => ({ selection: window.getSelection()!.toString(), anchor: window.getSelection()!.anchorOffset,
      focus: window.getSelection()!.focusOffset, y: scrollY,
      local: document.querySelector('[data-terminal-wide="code"]')!.scrollLeft }))).toEqual(baseline);
    await expect(page.locator('[data-clipboard-copy-buffer]')).toHaveCount(0);
    if (inline) {
      await expect(input).toHaveValue('unfinished draft');
      expect(await input.evaluate((element: HTMLInputElement) => [element.selectionStart, element.selectionEnd, element.selectionDirection])).toEqual([2, 8, 'backward']);
    }
    await expect(prose).toBeVisible();
    const expected = new URL('/pages/markdown-template/', SITE_CONFIG.site.url ?? page.url()).href;
    await page.evaluate(() => {
      const paste = document.createElement('textarea'); paste.setAttribute('aria-label', 'Clipboard paste verification'); document.body.append(paste);
    });
    const paste = page.getByRole('textbox', { name: 'Clipboard paste verification' });
    await paste.focus(); await paste.press('Control+V');
    await expect(paste).toHaveValue(expected);
    await paste.evaluate(element => element.remove());
  }
});

test('native copy false and throwing results remain honest failures without temporary state', async ({ page }, info) => {
  test.skip(info.project.use.javaScriptEnabled === false, 'Share is progressively enhanced.');
  await page.goto('/pages/about/');
  const button = page.locator('[data-document-share]');
  for (const throws of [false, true]) {
    await page.evaluate(throws => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
      document.execCommand = () => { if (throws) throw new Error('Denied'); return false; };
    }, throws);
    await button.click();
    await expect(button).toHaveText('Failed');
    await expect(button).toBeFocused();
    await expect(page.locator('[data-clipboard-copy-buffer]')).toHaveCount(0);
  }
});
