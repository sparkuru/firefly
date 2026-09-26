import { expect, type Page } from '@playwright/test';
import { SITE_CONFIG } from '../src/lib/site-config.mjs';

export async function expectMobileBaseTypography(page: Page) {
  const sizes = await page.locator('[data-home-search], [data-home-search-error], [data-terminal-fallback]').evaluateAll((roots) => {
    const expected = getComputedStyle(document.body).fontSize;
    return roots.flatMap((root) => [root, ...root.querySelectorAll('*')])
      .filter((node) => node instanceof HTMLElement && node.getClientRects().length > 0)
      .map((node) => ({ tag: node.tagName, size: getComputedStyle(node).fontSize, expected }));
  });
  expect(sizes.length).toBeGreaterThan(0);
  for (const { tag, size, expected } of sizes) expect(size, `${tag} shares the base size`).toBe(expected);
}

export async function expectHomeBrowseTree(page: Page, selector: string) {
  const tree = page.locator(selector);
  const rows = tree.locator(':scope > li');
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
  await expect(tree.getByRole('listitem')).toHaveCount(count);
  await expect(rows.locator('[data-home-browse-tree-prefix]')).toHaveText(Array.from({ length: count }, (_, index) => index === count - 1 ? '└──' : '├──'));
  expect(await tree.evaluate((node) => getComputedStyle(node).listStyleType)).toBe('none');
  expect(await tree.ariaSnapshot()).not.toMatch(/[├└]──/u);
  for (const row of await rows.all()) {
    const prefix = row.locator('[data-home-browse-tree-prefix]');
    await expect(prefix).toHaveAttribute('aria-hidden', 'true');
    await expect(row.locator('a [data-home-browse-tree-prefix]')).toHaveCount(0);
    const prefixBox = (await prefix.boundingBox())!;
    const linkBox = (await row.locator('a').boundingBox())!;
    expect(linkBox.x).toBeGreaterThan(prefixBox.x + prefixBox.width);
    expect(linkBox.height).toBeGreaterThanOrEqual(44);
    expect(linkBox.width).toBeGreaterThanOrEqual(44);
  }
}

export async function expectMobileRootBrowsing(page: Page) {
  const navigation = page.locator('[data-home-root-navigation]');
  await expect(navigation).toBeVisible();
  await expect(navigation.locator('a')).toHaveText(['pages/', 'lab/', 'posts/']);
  expect(await navigation.locator('a').evaluateAll((links) => links.map((link) => link.getAttribute('href'))))
    .toEqual(['/pages/', '/lab/', '/posts/']);
  await expectHomeBrowseTree(page, '[data-home-root-navigation] ul');
  await expectMobileBaseTypography(page);
  for (const group of await page.locator('[data-home-expanded-group]').all()) await expect(group).toBeHidden();
  for (const link of await page.locator('[data-terminal-entry] a, [data-terminal-experiment] a').all()) await expect(link).toBeHidden();
  const friends = page.locator('[data-home-friends]');
  await expect(friends).toBeVisible();
  await expect(friends.getByRole('heading', { name: 'friend links' })).toBeVisible();
  await expect(page.locator('[data-terminal-friend]')).toHaveCount(SITE_CONFIG.terminal.friends.length);
  if (SITE_CONFIG.terminal.friends.length === 0) {
    await expect(friends.getByText('No friend links.')).toBeVisible();
  } else {
    for (const [index, friend] of SITE_CONFIG.terminal.friends.entries()) {
      const row = friends.locator('[data-terminal-friend]').nth(index);
      await expect(row.locator('a')).toBeVisible();
      await expect(row.locator('a')).toHaveText(friend.name);
      await expect(row.locator('a')).toHaveAttribute('href', friend.url);
      await expect(row.locator('.terminal-entry-title')).toHaveText(friend.desc ?? '');
    }
  }
  const rootBox = await navigation.boundingBox();
  const friendBox = await friends.boundingBox();
  expect(friendBox!.y).toBeGreaterThanOrEqual(rootBox!.y + rootBox!.height);
}
