import type { Page } from '@playwright/test';

function escapeAttribute(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function syntheticDocument(index: number, body: string, fields: Record<string, unknown> = {}) {
  const metadata = {
    title: '同名文章', filename: `fixture-${index}.md`, virtualPath: `posts/fixture-${index}.md`,
    href: `/posts/fixture-${index}/`, date: '2026-09-26', description: 'Fixture description', tags: [], ...fields
  };
  const path = escapeAttribute(String(metadata.virtualPath));
  const href = escapeAttribute(String(metadata.href));
  const kind = String(metadata.virtualPath).startsWith('pages/') ? 'page' : 'post';
  const relative = path.slice(path.indexOf('/') + 1);
  const titleId = `fixture-${index}-title`;
  return `<li hidden data-terminal-entry data-terminal-entry-kind="${kind}" data-terminal-entry-virtual-path="${path}" data-terminal-entry-relative-path="${relative}" data-terminal-entry-filename="${metadata.filename}" data-terminal-entry-title="${escapeAttribute(String(metadata.title))}" data-terminal-entry-href="${href}" data-terminal-entry-date="${metadata.date}"><a href="${href}">${escapeAttribute(String(metadata.title))}</a></li>
    <template data-terminal-template data-terminal-template-path="${path}" data-home-search-metadata="${escapeAttribute(JSON.stringify(metadata))}"><article data-terminal-stream-document aria-labelledby="${titleId}"><h2 id="${titleId}" data-terminal-stream-title>${escapeAttribute(String(metadata.title))}</h2><button type="button" data-terminal-return>Command</button><button type="button" data-terminal-collapse aria-controls="fixture-${index}-body" aria-expanded="true">Collapse</button><a href="${href}" data-terminal-open>Open document</a><div id="fixture-${index}-body" class="terminal-stream-prose">${body}</div></article></template>`;
}

export async function withSyntheticArticles(page: Page, html: string, transform: (html: string) => string = (html) => html) {
  await page.route('**/', async (route) => {
    if (new URL(route.request().url()).pathname !== '/') return route.continue();
    const response = await route.fetch();
    await route.fulfill({ response, body: transform((await response.text()).replace('<section class="terminal-startup"', `${html}<section class="terminal-startup"`)) });
  });
}
