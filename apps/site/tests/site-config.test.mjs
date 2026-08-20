import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import test from 'node:test';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadSiteConfig,
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
    about: 'A public about line.\nAnother line.',
    friends: [
      { name: 'Example', desc: 'A useful example site.', url: 'https://example.test/blog' },
      { name: 'Docs', url: 'http://docs.example.test/?from=site' }
    ]
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
  assert.deepEqual(config.terminal.friends, validConfig.terminal.friends);
  assert.equal(Object.hasOwn(config.terminal.friends[0], 'desc'), true);
  assert.equal(Object.hasOwn(config.terminal.friends[1], 'desc'), false);
  assert.equal(config.seo.robots, 'index, follow');
  assert.ok(Object.isFrozen(config));
  assert.ok(Object.isFrozen(config.site));
  assert.ok(Object.isFrozen(config.terminal));
  assert.ok(Object.isFrozen(config.terminal.friends));
  assert.ok(Object.isFrozen(config.terminal.friends[0]));
  assert.deepEqual(terminalIdentityFromConfig(config), {
    user: 'guest',
    host: 'notes',
    workingDirectory: '~/blog/posts',
    about: 'A public about line.\nAnother line.'
  });
});

test('site config defaults omitted friend links to an empty list', () => {
  const { friends: _friends, ...terminalWithoutFriends } = validConfig.terminal;
  const config = parseSiteConfig({
    ...validConfig,
    terminal: terminalWithoutFriends
  }, 'fixture');

  assert.deepEqual(config.terminal.friends, []);
  assert.ok(Object.isFrozen(config.terminal.friends));
});

test('site config rejects unknown keys, unsafe identity text, and malformed origins', () => {
  for (const value of [
    { ...validConfig, unsupported: true },
    { ...validConfig, terminal: { ...validConfig.terminal, about: 'safe\n\u0000' } },
    { ...validConfig, terminal: { ...validConfig.terminal, friends: [{ name: 'Example', url: 'javascript:alert(1)' }] } },
    { ...validConfig, terminal: { ...validConfig.terminal, friends: [{ name: 'Example', url: 'https://user:pass@example.test' }] } },
    { ...validConfig, terminal: { ...validConfig.terminal, friends: [{ name: 'Example', url: 'https://example.test/#fragment' }] } },
    { ...validConfig, terminal: { ...validConfig.terminal, friends: [{ name: 'Example\nsite', url: 'https://example.test' }] } },
    { ...validConfig, terminal: { ...validConfig.terminal, friends: [{ name: 'Example', desc: '', url: 'https://example.test' }] } },
    { ...validConfig, terminal: { ...validConfig.terminal, friends: [{ name: 'Example', desc: ' details', url: 'https://example.test' }] } },
    { ...validConfig, terminal: { ...validConfig.terminal, friends: [{ name: 'Example', desc: 'details ', url: 'https://example.test' }] } },
    { ...validConfig, terminal: { ...validConfig.terminal, friends: [{ name: 'Example', desc: 'details\nmore', url: 'https://example.test' }] } },
    { ...validConfig, terminal: { ...validConfig.terminal, friends: [{ name: 'Example', desc: 'details\u0080', url: 'https://example.test' }] } },
    { ...validConfig, terminal: { ...validConfig.terminal, friends: [{ name: 'Example', desc: 'details\u2028more', url: 'https://example.test' }] } },
    { ...validConfig, terminal: { ...validConfig.terminal, friends: [{ name: 'Example', url: 'https://example.test/\u0080' }] } },
    { ...validConfig, terminal: { ...validConfig.terminal, friends: [{ name: 'Example', description: 'details', url: 'https://example.test' }] } },
    { ...validConfig, terminal: { ...validConfig.terminal, friends: [{ name: 'Example', desc: 42, url: 'https://example.test' }] } },
    { ...validConfig, terminal: { ...validConfig.terminal, friends: [{ name: 'Example', url: 'https://example.test' }, { name: 'Again', url: 'https://example.test' }] } },
    { ...validConfig, terminal: { ...validConfig.terminal, friends: [{ name: 'Example', url: 'https://example.test', extra: true }] } },
    { ...validConfig, terminal: { ...validConfig.terminal, cwd: '~/blog/../private' } },
    { ...validConfig, site: { ...validConfig.site, url: 'javascript:alert(1)' } },
    { ...validConfig, site: { ...validConfig.site, url: 'https://example.test/path' } },
    { ...validConfig, seo: { ...validConfig.seo, twitterCard: 'large' } },
    { ...validConfig, seo: { ...validConfig.seo, image: 'relative.png' } }
  ]) {
    assert.throws(() => parseSiteConfig(value, 'fixture'), /Invalid site configuration/u);
  }
});

test('site config loader uses TOML syntax, preserves multiline about, and rejects malformed TOML', async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'firefly-site-config-'));
  const filePath = path.join(temporaryRoot, 'site.toml');
  const source = [
    '[site]',
    'name = "Example notes"',
    'description = "A public static notebook."',
    'language = "en-GB"',
    '',
    '[terminal]',
    'user = "guest"',
    'host = "notes"',
    'cwd = "~/blog/posts"',
    'about = """',
    'A public about line.',
    'Another line.',
    '"""',
    'friends = []',
    '',
    '[seo]',
    'titleSuffix = " | Example notes"',
    'robots = "index, follow"',
    'twitterCard = "summary"',
    ''
  ].join('\n');
  try {
    await writeFile(filePath, source);
    const config = loadSiteConfig(filePath);
    assert.equal(config.terminal.about, 'A public about line.\nAnother line.');
    assert.deepEqual(config.terminal.friends, []);

    await writeFile(filePath, `${source}site.unknown = true\n`);
    assert.throws(() => loadSiteConfig(filePath), /Invalid site configuration.*(?:Unrecognized key|unknown)/u);

    await writeFile(filePath, '[site]\nname = "first"\nname = "second"\n');
    assert.throws(() => loadSiteConfig(filePath), /Invalid TOML/u);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('the checked-in TOML example loads with documented optional defaults', () => {
  const examplePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../config/site.toml.example');
  const config = loadSiteConfig(examplePath);
  assert.equal(config.site.url, null);
  assert.equal(config.site.author, null);
  assert.equal(config.seo.image, null);
  assert.deepEqual(config.terminal.friends, []);
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
