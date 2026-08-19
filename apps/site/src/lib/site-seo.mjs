import { writeFile } from 'node:fs/promises';
import { SITE_CONFIG } from './site-config.mjs';
import { absoluteSiteUrl } from './site-meta.mjs';

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

export function normalizePublicPath(pathname) {
  if (typeof pathname !== 'string') return undefined;
  const withLeadingSlash = pathname.length === 0 ? '/' : pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (withLeadingSlash === '/') return '/';
  const withoutHtml = withLeadingSlash.endsWith('/index.html') ? withLeadingSlash.slice(0, -'index.html'.length) : withLeadingSlash;
  const withoutExtension = withoutHtml.endsWith('.html') ? withoutHtml.slice(0, -'.html'.length) : withoutHtml;
  return withoutExtension.endsWith('/') ? withoutExtension : `${withoutExtension}/`;
}

export function publicSitemapPaths(pages) {
  const paths = [...new Set(pages
    .map(({ pathname }) => normalizePublicPath(pathname))
    .filter((pathname) => pathname !== undefined && pathname !== '/404/' && pathname !== '/404' && (pathname === '/lab/' || !pathname.startsWith('/lab/'))))].sort();
  return Object.freeze(paths);
}

export function createRobotsText(config = SITE_CONFIG) {
  const lines = ['User-agent: *', config.seo.robots.startsWith('noindex') ? 'Disallow: /' : 'Allow: /'];
  if (config.site.url !== null) lines.push(`Sitemap: ${new URL('/sitemap.xml', `${config.site.url}/`).toString()}`);
  return `${lines.join('\n')}\n`;
}

export function createSitemapXml(paths, origin) {
  if (origin === null || origin === undefined) return undefined;
  const urls = paths.map((pathname) => `  <url><loc>${escapeXml(absoluteSiteUrl(origin, pathname))}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function createSiteSeoIntegration(config = SITE_CONFIG) {
  return {
    name: 'f1refly-site-seo',
    hooks: {
      'astro:build:done': async ({ dir, pages, logger }) => {
        await writeFile(new URL('robots.txt', dir), createRobotsText(config), 'utf8');
        if (config.site.url === null) {
          logger.info('Wrote robots.txt; sitemap omitted because site.url is unset.');
          return;
        }
        const paths = publicSitemapPaths(pages);
        const sitemap = createSitemapXml(paths, config.site.url);
        if (sitemap === undefined) return;
        await writeFile(new URL('sitemap.xml', dir), sitemap, 'utf8');
        logger.info(`Wrote robots.txt and sitemap.xml for ${paths.length} public routes.`);
      }
    }
  };
}
