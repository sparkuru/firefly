import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseSiteConfig,
  terminalIdentityFromConfig
} from '../src/lib/site-config.mjs';
import {
  absoluteSiteUrl,
  resolveImageUrl,
  resolveSiteMetadata
} from '../src/lib/site-meta.mjs';
import {
  createRobotsText,
  createSitemapXml,
  normalizePublicPath,
  publicSitemapPaths
} from '../src/lib/site-seo.mjs';

const validConfig = {
  site: {
    name: 'Example notes',
    description: 'A public static notebook.',
    language: 'en-GB',
    url: 'https://example.test',
    author: 'Firefly'
  },
  terminal: {
    user: 'guest',
    host: 'notes',
    cwd: '~/blog/posts',
    about: 'A public about line.\nAnother line.'
  },
  seo: {
    titleSuffix: ' | Example notes',
    robots: 'index, follow',
    twitterCard: 'summary',
    image: '/social-card.png'
  }
};

test('site config validates, normalizes, and deeply freezes public values', () => {
  const config = parseSiteConfig(validConfig, 'fixture');
  assert.equal(config.site.url, 'https://example.test');
  assert.equal(config.terminal.about, 'A public about line.\nAnother line.');
  assert.equal(config.seo.robots, 'index, follow');
  assert.ok(Object.isFrozen(config));
  assert.ok(Object.isFrozen(config.site));
  assert.ok(Object.isFrozen(config.terminal));
  assert.deepEqual(terminalIdentityFromConfig(config), {
    user: 'guest',
    host: 'notes',
    workingDirectory: '~/blog/posts',
    about: 'A public about line.\nAnother line.'
  });
});

test('site config rejects unknown keys, unsafe identity text, and malformed origins', () => {
  for (const value of [
    { ...validConfig, unsupported: true },
    { ...validConfig, terminal: { ...validConfig.terminal, about: 'safe\n\u0000' } },
    { ...validConfig, terminal: { ...validConfig.terminal, cwd: '~/blog/../private' } },
    { ...validConfig, site: { ...validConfig.site, url: 'javascript:alert(1)' } },
    { ...validConfig, site: { ...validConfig.site, url: 'https://example.test/path' } },
    { ...validConfig, seo: { ...validConfig.seo, twitterCard: 'large' } },
    { ...validConfig, seo: { ...validConfig.seo, image: 'relative.png' } }
  ]) {
    assert.throws(() => parseSiteConfig(value, 'fixture'), /Invalid site configuration/u);
  }
});

test('site metadata resolves fallback and explicit document overrides', () => {
  const config = parseSiteConfig(validConfig, 'fixture');
  assert.equal(absoluteSiteUrl(config.site.url, '/posts/example/'), 'https://example.test/posts/example/');
  assert.equal(resolveImageUrl('/card.png', config.site.url), 'https://example.test/card.png');
  assert.equal(resolveImageUrl('/card.png', null), '/card.png');

  const fallback = resolveSiteMetadata({
    title: 'Visible title',
    description: 'Document description',
    pathname: '/posts/example/',
    collection: 'posts',
    date: new Date('2026-08-01T00:00:00.000Z'),
    updated: new Date('2026-08-02T00:00:00.000Z')
  }, config);
  assert.equal(fallback.htmlTitle, 'Visible title | Example notes');
  assert.equal(fallback.canonical, 'https://example.test/posts/example/');
  assert.equal(fallback.openGraph.type, 'article');
  assert.equal(fallback.article.publishedTime, '2026-08-01T00:00:00.000Z');
  assert.equal(fallback.article.author, 'Firefly');

  const override = resolveSiteMetadata({
    title: 'Visible title',
    description: 'Document description',
    pathname: '/posts/example/',
    htmlTitle: 'Exact <title>',
    canonical: 'https://canonical.test/article',
    seoImage: '/article.png',
    noindex: true,
    collection: 'posts'
  }, { ...config, site: { ...config.site, url: null } });
  assert.equal(override.htmlTitle, 'Exact <title>');
  assert.equal(override.canonical, 'https://canonical.test/article');
  assert.equal(override.robots, 'noindex, follow');
  assert.equal(override.openGraph.image, '/article.png');
});

test('robots and sitemap helpers only expose final public routes', () => {
  const noOrigin = parseSiteConfig({ ...validConfig, site: { ...validConfig.site, url: null } }, 'fixture');
  assert.equal(createRobotsText(noOrigin), 'User-agent: *\nAllow: /\n');
  assert.equal(createSitemapXml(['/'], null), undefined);
  assert.deepEqual(publicSitemapPaths([
    { pathname: '' },
    { pathname: '/posts/example/index.html' },
    { pathname: '/404.html' },
    { pathname: 'private/' },
    { pathname: '/posts/example/' },
    { pathname: 'lab/' },
    { pathname: 'lab/nerv/' }
  ]), ['/', '/lab/', '/posts/example/', '/private/']);
  assert.equal(normalizePublicPath('/posts/example.html'), '/posts/example/');
  assert.ok(createSitemapXml(['/', '/posts/example/'], 'https://example.test').includes('https://example.test/posts/example/'));
  assert.ok(createRobotsText(validConfig).includes('Sitemap: https://example.test/sitemap.xml'));
});
