import { expect, test, type Page } from '@playwright/test';

const promptName = /Command for guest@f1refly:~\/blog\/posts \$/u;

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

test('successful startup reveals only the shell stream and prompt', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: promptName });

  await expect(input).toBeVisible();
  await expect(input).not.toBeFocused();
  await expect(input).toHaveAttribute('enterkeyhint', 'send');
  await expect(input).toHaveAttribute('aria-controls', 'terminal-transcript');
  await expect(page.locator('[data-terminal-fallback]')).toBeHidden();
  await expect(page.locator('[data-terminal-transcript]')).toBeEmpty();
  await expect(page.locator('.terminal-titlebar')).toHaveCount(0);
  await expect(page.getByRole('button')).toHaveCount(0);
  await expect(page.getByText('Browse public documents')).toBeHidden();
  const markup = await page.locator('body').innerHTML();
  expect(markup).not.toMatch(/PRIVATE_(?:TITLE|BODY)_M5_7f2a|hidden-draft|owner-fixture/u);
  await expect(page.locator('.terminal-command-row .terminal-prompt')).toHaveText('guest@f1refly:~/blog/posts $');
  expect(await page.locator('.terminal-command-row').evaluate((row) => row.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await expectNoHorizontalOverflow(page);
});

test('commands render continuous typed results, lab discovery, and latest announcements', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: promptName });
  const transcript = page.locator('[data-terminal-transcript]');
  const announcer = page.locator('[data-terminal-announcer]');

  await submit(page, 'help');
  await expect(transcript.getByRole('heading', { level: 2, name: 'Explore' })).toBeVisible();
  await expect(transcript.getByRole('heading', { level: 2, name: 'Read & navigate' })).toBeVisible();
  await expect(transcript.getByText('list a public or session virtual directory')).toBeVisible();
  await expect(transcript.getByText('filter stdin or public text')).toBeVisible();
  await expect(transcript.getByText('change the virtual directory')).toBeVisible();
  await expect(transcript.getByText('open a listed experiment')).toBeVisible();
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

  await submit(page, 'alias l');
  await expect(transcript.locator('.terminal-record').last()).toContainText('l=ls');
  await submit(page, 'l');
  await expect(transcript.locator('.terminal-entry-list').last().locator('.terminal-entry-row--document')).toHaveCount(2);
  await submit(page, 'll');
  await expect(transcript.locator('.terminal-entry-list').last().locator('.terminal-entry-row--document')).toHaveCount(2);

  await input.fill('ls he');
  await input.press('Tab');
  await expect(input).toHaveValue('ls hello-static-foundation.md');
  await expect(input).toBeFocused();
  await input.press('Enter');
  await expect(transcript.locator('.terminal-record').last()).toContainText('Hello, static foundation');

  await input.fill('ls charac');
  await input.press('Tab');
  await expect(input).toHaveValue('ls characters/');
  await expect(input).toBeFocused();
  await input.press('Enter');
  await expect(transcript.locator('.terminal-record').last()).toContainText('nahida.md');

  await submit(page, 'ls cha');
  await expect(transcript.locator('.terminal-record').last()).toContainText('Did you mean "characters/"? Press Tab to complete.');
  await submit(page, 'ls cha*');
  await expect(transcript.locator('.terminal-record').last()).toContainText('nahida.md');
  await submit(page, 'ls *cha*');
  await expect(transcript.locator('.terminal-record').last()).toContainText('nahida.md');
  await submit(page, 'ls characters/');
  await expect(transcript.locator('.terminal-record').last()).toContainText('Notes on Nahida');
  await submit(page, 'ls --help');
  await expect(transcript.locator('.terminal-record').last()).toContainText('Usage: ls [path|pattern]');

  await submit(page, 'ls lab/');
  const labListing = transcript.locator('.terminal-record').last();
  await expect(labListing.locator('.terminal-experiment-list')).toHaveCSS('list-style-type', 'none');
  await expect(labListing.locator('[data-terminal-entry-kind="experiment"]')).toHaveCount(1);
  await expect(labListing.getByRole('link', { name: 'nerv/' })).toHaveAttribute('href', '/lab/nerv/');
  await submit(page, 'ls /');
  await expect(transcript.locator('.terminal-record').last()).toContainText('lab/');
  await submit(page, 'ls /lab/nerv/');
  await expect(transcript.locator('.terminal-record').last()).toContainText('Use "open lab/nerv" to enter this experiment.');

  await input.fill('cd charac');
  await input.press('Tab');
  await expect(input).toHaveValue('cd characters/');
  await expect(input).toBeFocused();
  await input.press('Enter');
  await expect(page.locator('.terminal-command-row .terminal-prompt')).toHaveText('guest@f1refly:~/blog/posts/characters $');
  await expect(page.getByRole('textbox', { name: /Command for guest@f1refly:~\/blog\/posts\/characters \$/u })).toBeFocused();
  await submit(page, 'ls');
  const nestedListing = transcript.locator('.terminal-entry-list').last();
  await expect(nestedListing.locator('.terminal-entry-row')).toHaveCount(1);
  await expect(nestedListing.locator('[data-terminal-entry-kind="directory"]')).toHaveCount(0);
  await expect(nestedListing.locator('[data-terminal-entry-kind="document"]')).toHaveCount(1);
  await expect(nestedListing.locator('.terminal-entry-group-heading')).toHaveCount(0);
  await expect(nestedListing).toContainText('2026-08-13');
  const nestedInput = page.getByRole('textbox', { name: /Command for guest@f1refly:~\/blog\/posts\/characters \$/u });
  await nestedInput.fill('cat n');
  await nestedInput.press('Tab');
  await expect(nestedInput).toHaveValue('cat nahida.md');
  await expect(nestedInput).toBeFocused();
  await nestedInput.press('Enter');
  await expect(transcript).toContainText('Notes on Nahida');
  await submit(page, 'cd /posts');
  await submit(page, 'ls *.md');
  const wildcardListing = transcript.locator('.terminal-entry-list').last();
  await expect(wildcardListing.locator('.terminal-entry-row--document')).toHaveCount(2);
  await expect(wildcardListing).toContainText('Hello, static foundation');
  await expect(wildcardListing).toContainText('llm workflow with trellis');

  await submit(page, 'cd ../');
  await expect(page.locator('.terminal-command-row .terminal-prompt')).toHaveText('guest@f1refly:~/blog $');
  await submit(page, 'ls');
  await expect(transcript.locator('.terminal-record').last()).toContainText('lab/');
  await submit(page, 'cd /posts');

  await submit(page, 'cd /');
  const rootInput = page.locator('#terminal-command');
  await expect(page.locator('.terminal-command-row .terminal-prompt')).toHaveText('guest@f1refly:~/blog $');
  await rootInput.fill('cd ');
  await rootInput.press('Tab');
  await expect(rootInput).toBeFocused();
  await expect(page.locator('[data-terminal-completion]')).toContainText('Matches: lab/, pages/, posts/');
  await expect(page.locator('.terminal-completion-note')).toHaveText('input unchanged by design; type more to complete.');
  await rootInput.fill('cd la');
  await rootInput.press('Tab');
  await expect(rootInput).toHaveValue('cd lab/');
  await expect(rootInput).toBeFocused();

  await submit(page, 'ls posts');
  const postsListing = transcript.locator('.terminal-entry-list').last();
  await expect(postsListing.locator('.terminal-entry-row')).toHaveCount(3);
  await expect(postsListing.locator('[data-terminal-entry-kind="directory"]')).toHaveCount(1);
  await expect(postsListing.getByRole('link', { name: 'characters/' })).toHaveAttribute('href', '/posts/characters/');
  await expect(postsListing.locator('[data-terminal-entry-kind="document"]')).toHaveCount(2);
  await expect(postsListing.locator('.terminal-entry-group-heading')).toHaveCount(0);
  await expect(postsListing).toHaveCSS('padding-left', '0px');
  await expect(postsListing.getByRole('link', { name: 'hello-static-foundation.md' })).toHaveAttribute('href', '/posts/hello-static-foundation/');
  await expect(postsListing.getByRole('link', { name: 'characters/nahida.md' })).toHaveCount(0);
  await expect(postsListing).toContainText('2026-05-28');
  const listingColumns = await postsListing.locator('[data-terminal-entry-kind="document"]').evaluateAll((rows) => rows.map((row) => getComputedStyle(row).gridTemplateColumns));
  expect(new Set(listingColumns).size).toBe(1);
  await expect(announcer).toHaveText('3 posts listed.');

  await submit(page, 'ls pages');
  await expect(transcript.getByRole('link', { name: '/pages/about.md' })).toHaveAttribute('href', '/pages/about/');
  await rootInput.fill('ls /pages/ab');
  await rootInput.press('Tab');
  await expect(rootInput).toHaveValue('ls /pages/about.md');
  await expect(rootInput).toBeFocused();
  await rootInput.press('Enter');
  await expect(transcript.locator('.terminal-record').last()).toContainText('About this foundation');
  await submit(page, 'cat pages/about.md');
  await expect(transcript.locator('.terminal-record').last()).toContainText('About this foundation');
  await submit(page, 'cat ./pages/about.md');
  await expect(transcript.locator('.terminal-record').last()).toContainText('About this foundation');
  await submit(page, 'cat posts/hello-static-foundation.md');
  await expect(transcript.locator('.terminal-record').last()).toContainText('Hello, static foundation');
  await submit(page, 'grep -i about pages/about.md');
  await expect(transcript.locator('.terminal-record').last()).toContainText('/pages/about.md:');
  await submit(page, 'cat /pages/about.md');
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

test('ls and tree entries expose document links and safe directory cd links', async ({ page }) => {
  await page.goto('/');
  const transcript = page.locator('[data-terminal-transcript]');

  await submit(page, 'ls posts');
  const lsListing = transcript.locator('.terminal-record').last().locator('.terminal-entry-list');
  const lsDirectory = lsListing.getByRole('link', { name: 'characters/' });
  await expect(lsDirectory).toHaveAttribute('href', '/posts/characters/');
  await expect(lsDirectory).toHaveAttribute('data-terminal-cd-path', '/posts/characters');
  await lsDirectory.click();
  await expect(page.locator('.terminal-command-row .terminal-prompt')).toHaveText('guest@f1refly:~/blog/posts/characters $');
  await expect(transcript.locator('.terminal-command-line').last()).toContainText('cd /posts/characters/');
  await expect(page).toHaveURL(/\/$/u);

  await submit(page, 'cd /');
  await submit(page, 'tree /');
  const tree = transcript.locator('.terminal-record').last().locator('.terminal-tree');
  await expect(tree.getByRole('link', { name: 'posts/' })).toHaveAttribute('href', '/posts/');
  await expect(tree.getByRole('link', { name: 'hello-static-foundation.md' })).toHaveAttribute('href', '/posts/hello-static-foundation/');
  const treeDirectory = tree.getByRole('link', { name: 'characters/' });
  await treeDirectory.focus();
  await treeDirectory.press('Enter');
  await expect(page.locator('.terminal-command-row .terminal-prompt')).toHaveText('guest@f1refly:~/blog/posts/characters $');
  await expect(transcript.locator('.terminal-command-line').last()).toContainText('cd /posts/characters/');
});

test('user aliases are session-local and disappear after refresh', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: promptName });
  const transcript = page.locator('[data-terminal-transcript]');

  await submit(page, 'alias la=ls');
  await expect(transcript.locator('.terminal-record').last()).toContainText('la=ls');
  await submit(page, 'la');
  await expect(transcript.locator('.terminal-entry-list').last().locator('.terminal-entry-row--document')).toHaveCount(2);
  await submit(page, 'help');
  await expect(transcript.locator('.terminal-record').last()).toContainText('la');

  await page.reload();
  await submit(page, 'la');
  await expect(transcript.locator('.terminal-record').last()).toContainText('Unknown command: la');
  await expect(input).toBeFocused();
});

test('open navigates only to the validated listed experiment destination', async ({ page }) => {
  await page.goto('/');
  await submit(page, 'open lab/nerv');
  await expect(page).toHaveURL(/\/lab\/nerv\/$/u);
});

test('rshell updates its prompt and keeps pipes, scratch, and grep inside public session resources', async ({ page }) => {
  await page.goto('/');
  const input = page.locator('#terminal-command');
  const transcript = page.locator('[data-terminal-transcript]');

  await submit(page, 'cd /pages');
  await expect(page.getByRole('textbox', { name: /Command for guest@f1refly:~\/blog\/pages \$/u })).toBeVisible();
  await expect(page.locator('.terminal-command-row .terminal-prompt')).toHaveText('guest@f1refly:~/blog/pages $');

  await submit(page, 'cat about.md | grep -in about');
  await expect(transcript.locator('.terminal-record').last()).toContainText('About');
  await expect(transcript.locator('[data-terminal-stream-document]')).toHaveCount(0);
  await submit(page, 'cd /posts');
  await submit(page, 'cat characters/nahida.md | grep a');
  const pipedGrep = transcript.locator('.terminal-record').last();
  await expect(pipedGrep.locator('.terminal-grep-line mark').first()).toHaveText('a');
  await submit(page, 'grep -inF about /pages/about.md');
  await expect(transcript.locator('.terminal-grep-match').last()).toContainText('/pages/about.md:');
  await expect(transcript.locator('.terminal-grep-line mark').last()).toHaveText('About');
  await submit(page, 'grep about -i /pages/about.md');
  await expect(transcript.locator('.terminal-grep-line mark').last()).toHaveText('About');
  await submit(page, 'grep -F definitely-not-in-the-public-corpus');
  await expect(transcript.locator('.terminal-grep-summary').last()).toHaveText('No matches for "definitely-not-in-the-public-corpus".');
  await submit(page, 'grep -nF "# " /posts/llm-workflow-with-trellis.md');
  const sourceMatches = transcript.locator('.terminal-record').last().locator('.terminal-grep-line');
  await expect.poll(async () => sourceMatches.count()).toBeGreaterThan(1);
  expect((await sourceMatches.allTextContents()).every((line) => line.length < 5000)).toBe(true);

  await submit(page, 'whoami > /.rshell/tmp/identity.txt');
  await expect(transcript.locator('.terminal-record').last()).toContainText('Wrote 1 line to /.rshell/tmp/identity.txt.');
  await submit(page, 'cat /.rshell/tmp/identity.txt');
  await expect(transcript.locator('.terminal-record').last()).toContainText('guest');

  await submit(page, 'grep secret /etc/passwd');
  await expect(transcript.locator('.terminal-record').last()).toContainText('grep can search only listed public documents or /.rshell/tmp scratch files.');
  await expect(page.locator('[data-terminal-failure]')).toBeHidden();
  await expect(input).toBeFocused();
});

test('history preserves a draft and clear returns a fresh prompt with history intact', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: promptName });
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

  await input.fill('ls p');
  await input.press('Tab');
  await expect(completion).toContainText('Matches: pages/, posts/');
  await expect(completion.locator('.terminal-completion-note')).toHaveText('input unchanged by design; type more to complete.');
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

test('Ctrl+L clears the transcript without consuming command history and cls aliases clear', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: promptName });
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
  const input = page.getByRole('textbox', { name: promptName });
  const transcript = page.locator('[data-terminal-transcript]');
  const completion = page.locator('[data-terminal-completion]');
  await submit(page, 'pwd');
  await submit(page, 'whoami');
  await input.fill('unfinished');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('whoami');
  await input.fill('vim ./');
  await input.press('Tab');
  await expect(completion).toContainText('Matches: ./characters/');
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
  await expect(completion).toContainText('Matches: ./characters/');
  await input.press('Control+c');
  await expect(input).toHaveValue('');
  await expect(input).toBeFocused();
  await expect(completion).toBeEmpty();
  await expect(page.locator('[data-terminal-announcer]')).toHaveText('Command cancelled.');
  await expect(transcript.locator('.terminal-record')).toHaveCount(2);
  await input.press('ArrowUp');
  await expect(input).toHaveValue('whoami');
  await input.press('ArrowDown');
  await expect(input).toHaveValue('');
});

test('the prompt owns every Tab while completion only rewrites safe unmodified matches', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: promptName });
  await input.focus();
  await input.fill('hel');
  await input.press('Tab');
  await expect(input).toHaveValue('help ');
  await expect(input).toBeFocused();

  await input.fill('ls ');
  await input.press('Tab');
  await expect(input).toHaveValue('ls ');
  await expect(input).toBeFocused();
  await expect(page.locator('[data-terminal-completion]')).toContainText('Matches:');

  await input.fill('ls p');
  await input.press('Tab');
  await expect(input).toHaveValue('ls p');
  await expect(page.locator('[data-terminal-completion]')).toContainText('Matches: pages/, posts/');
  await expect(page.locator('[data-terminal-completion] .terminal-completion-note')).toHaveText('input unchanged by design; type more to complete.');
  await expect(input).toBeFocused();

  await input.focus();
  for (const ambiguous of ['cat ./', 'vim ./', 'cat /', 'vim /']) {
    await input.fill(ambiguous);
    await input.press('Tab');
    await expect(input).toHaveValue(ambiguous);
    await expect(input).toBeFocused();
    await expect(page.locator('[data-terminal-completion]')).toContainText('Matches:');
  }

  for (const noMatch of ['cat 1', 'vim ./does-not-exist', 'cat /posts/does-not-exist']) {
    await input.fill(noMatch);
    await input.press('Tab');
    await expect(input).toHaveValue(noMatch);
    await expect(input).toBeFocused();
    await expect(page.locator('[data-terminal-completion]')).toHaveText('No matches.');
  }

  await input.fill('cat llm-w');
  await input.press('Tab');
  await expect(input).toHaveValue('cat llm-workflow-with-trellis.md');

  await input.fill('cat cha');
  await input.press('Tab');
  await expect(input).toHaveValue('cat characters/');
  await input.fill('vim /pages/abo');
  await input.press('Tab');
  await expect(input).toHaveValue('vim /pages/about.md');

  await input.fill('cat ./llm-w');
  await input.press('Tab');
  await expect(input).toHaveValue('cat ./llm-workflow-with-trellis.md');
  await expect(input).toBeFocused();

  for (const unsafe of ['cat ../llm-w', 'cat ./nested/../llm-w', 'cat /llm-w', 'cat https://example.com/llm-w', 'cat /etc/pass', 'cat cafe\u0301.md', 'cat control\u0001path']) {
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
  expect(modifiedTabResults).toEqual([false, false, false, false]);

  await input.fill('open lab/n');
  await input.press('Tab');
  await expect(input).toHaveValue('open lab/nerv');
});

test('IME composition leaves text controls native while prompt Tab remains owned', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: promptName });
  await submit(page, 'pwd');
  await input.fill('about');

  const dispatchResults = await input.evaluate((element) => {
    element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    const results = ['Enter', 'ArrowUp', 'ArrowDown', 'Tab', 'c'].map((key) =>
      element.dispatchEvent(new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        ctrlKey: key === 'c',
        isComposing: true,
        key
      }))
    );
    return results;
  });
  expect(dispatchResults).toEqual([true, true, true, false, true]);
  await expect(input).toHaveValue('about');
  await expect(page.locator('[data-terminal-transcript] .terminal-record')).toHaveCount(1);

  await input.dispatchEvent('compositionend');
  await input.press('Enter');
  await expect(page.locator('[data-terminal-transcript]')).toContainText('A static garden');
});

test('native Enter submission works at desktop and mobile viewport contracts', async ({ page }) => {
  await page.goto('/');
  await submit(page, 'about');
  await expect(page.locator('[data-terminal-transcript]')).toContainText('A static garden');
  await expect(page.getByRole('textbox', { name: promptName })).toBeFocused();
});

test('short output settles the active prompt and document output settles its reading start', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: promptName });
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

  await submit(page, 'cat ./llm-workflow-with-trellis.md');
  const title = page
    .locator('[data-terminal-stream-document]')
    .last()
    .getByRole('heading', { level: 2, name: 'llm workflow with trellis' });
  await expect(title).toBeFocused();
  await expectInViewport(title, 0, 0.35);
});

test('eligible printable typing returns to the prompt while protected interactions stay native', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: promptName });
  await submit(page, 'cat llm-workflow-with-trellis.md');
  const streamedDocument = page.locator('[data-terminal-stream-document]').last();
  const title = streamedDocument.getByRole('heading', { level: 2, name: 'llm workflow with trellis' });
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

test('phosphor theme and official JetBrains Mono assets stay same-origin', async ({ page }) => {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== 'http://127.0.0.1:4321') {
      externalRequests.push(request.url());
    }
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-terminal-theme', 'phosphor');
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
      .find((candidate) => candidate.dataset.terminalTemplatePath === 'posts/llm-workflow-with-trellis.md');
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
    externalFragment.href = '/posts/llm-workflow-with-trellis/#install';
    externalFragment.textContent = 'external install fragment';
    firstHeader.id = 'scoped-column';
    firstCell.dataset.scopedCell = '';
    firstCell.setAttribute('headers', 'scoped-column');
    article.append(localLink, label, field, labelled, externalFragment);
  });
  await submit(page, 'cat llm-workflow-with-trellis.md');

  await expect(page).toHaveURL(/\/$/u);
  const documents = page.locator('[data-terminal-stream-document]');
  await expect(documents).toHaveCount(1);
  const first = documents.first();
  const title = first.getByRole('heading', { level: 2, name: 'llm workflow with trellis' });
  await expect(title).toBeVisible();
  await expect(title).toBeFocused();
  await expect(first.getByRole('link', { name: 'permalink' })).toHaveAttribute('href', '/posts/llm-workflow-with-trellis/');
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
    '/posts/llm-workflow-with-trellis/#install'
  );
  await expect(first.getByRole('region', { name: /^Code content:/u }).first()).toHaveAttribute('tabindex', '0');
  await expect(first.getByRole('region', { name: /^Table content:/u }).first()).toHaveAttribute('tabindex', '0');
  await expect(page.locator('[data-terminal-announcer]')).toHaveText('Rendered llm workflow with trellis.');
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

  await submit(page, 'cat llm-workflow-with-trellis.md');
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
    '/posts/llm-workflow-with-trellis/',
    '/posts/llm-workflow-with-trellis/'
  ]);
  await expectNoHorizontalOverflow(page);
});

test('cat respects semantic and page adapter output in the home stream', async ({ page }) => {
  await page.goto('/');
  await submit(page, 'cat hello-static-foundation.md');
  const semanticDocument = page.locator('[data-terminal-stream-document]').first();
  await expect(semanticDocument.getByRole('heading', { level: 2, name: 'Hello, static foundation' })).toBeFocused();
  await expect(semanticDocument.getByRole('heading', { level: 2, name: 'Markdown to durable HTML' })).toBeVisible();
  await expect(semanticDocument.getByRole('region', { name: /^Code content:/u })).toBeVisible();
  await submit(page, 'cat /pages/about.md');
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
  await expect(page.getByRole('textbox', { name: promptName })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 2, name: 'Browse public documents' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'hello-static-foundation.md' })).toBeVisible();
  await expect(page.locator('[data-terminal-failure]')).toBeHidden();
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
  await expect(page.getByRole('textbox', { name: promptName })).toHaveCount(0);
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
  await expect(page.getByRole('textbox', { name: promptName })).toHaveCount(0);
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
  await expect(page.getByRole('textbox', { name: promptName })).toHaveCount(0);
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
  await submit(page, 'cat /pages/about.md');
  await expect(page.locator('[data-terminal-session]')).toBeHidden();
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
  await expect(page.locator('[data-terminal-failure]')).toBeVisible();
  await expect(page.locator('[data-terminal-failure] .terminal-status-label')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'hello-static-foundation.md' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: promptName })).toHaveCount(0);
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
  await expect(page.locator('[data-terminal-failure]')).toBeVisible();
  await expect(page.getByRole('link', { name: 'hello-static-foundation.md' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Browse public documents' })).toBeFocused();
});

test('reduced motion and responsive checkpoints preserve full-page containment', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const input = page.getByRole('textbox', { name: promptName });
  expect(await input.evaluate((element) => getComputedStyle(element).animationDuration)).toBe('1e-06s');
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
