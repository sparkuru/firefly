import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { terminalHomeAssetsInlineLimit } from '../src/lib/assets-inline-limit.mjs';
import {
  resolveContentMarkers,
  supportedContentMarkerIds
} from '../src/lib/content-markers.mjs';
import { SITE_CONFIG } from '../src/lib/site-config.mjs';
import { createRobotsText } from '../src/lib/site-seo.mjs';

const siteRoot = path.resolve(import.meta.dirname, '..');
const distRoot = path.join(siteRoot, 'dist');
const sourceRoot = path.join(siteRoot, 'src');
const generatedPagesRoot = path.join(siteRoot, '.generated-content/pages');
const generatedPostsRoot = path.join(siteRoot, '.generated-content/posts');
const workflowSlug = 'llm-workflow-with-trellis';
const workflowRoute = 'posts/ai/llm-workflow-with-trellis/index.html';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function hasFeaturedMarker(frontmatter) {
  let inFirefly = false;
  let inMarkers = false;

  for (const line of frontmatter.split('\n')) {
    if (/^firefly:\s*$/u.test(line)) {
      inFirefly = true;
      inMarkers = false;
      continue;
    }
    if (inFirefly && /^\S/u.test(line)) {
      inFirefly = false;
      inMarkers = false;
    }
    if (!inFirefly) continue;
    if (/^[ \t]+markers:\s*$/u.test(line)) {
      inMarkers = true;
      continue;
    }
    if (inMarkers && /^[ \t]+-\s*featured\s*$/u.test(line)) return true;
  }

  return false;
}

async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relative = path.posix.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFiles(absolute, relative)));
    } else {
      files.push(relative);
    }
  }

  return files.sort();
}

async function collectContentRoutes(directory, prefix, includeDirectories) {
  const routes = [];

  async function walk(current, relative = '') {
    const entries = await readdir(current, { withFileTypes: true });
    let hasPublicContent = false;
    for (const entry of entries) {
      const childRelative = path.posix.join(relative, entry.name);
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) {
        const childHasPublicContent = await walk(child, childRelative);
        if (includeDirectories && childHasPublicContent) {
          routes.push(`${prefix}/${childRelative}/index.html`);
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const source = await readFile(child, 'utf8');
        const frontmatter = source.match(/^---\n([\s\S]*?)\n---\n/u)?.[1] ?? '';
        if (/^draft:\s*true\s*$/mu.test(frontmatter) || /^\s+visibility:\s*private\s*$/mu.test(frontmatter)) {
          continue;
        }
        const physicalRoute = childRelative.slice(0, -3);
        const slugMatch = /^slug:\s*(?:"([^"]+)"|([^\s]+))\s*$/mu.exec(frontmatter);
        const routeSlug = (slugMatch?.[1] ?? slugMatch?.[2] ?? path.posix.basename(physicalRoute)).replace(/\s+/gu, '-');
        const parent = path.posix.dirname(physicalRoute);
        const route = prefix === 'posts' && parent !== '.' ? `${parent}/${routeSlug}` : routeSlug;
        routes.push(`${prefix}/${route}/index.html`);
        hasPublicContent = true;
      }
    }
    return hasPublicContent || routes.some((route) => route.startsWith(`${prefix}/${relative}/`));
  }

  await walk(directory);
  return routes;
}

let workflowDocumentPromise;

async function findWorkflowDocument() {
  if (workflowDocumentPromise === undefined) {
    workflowDocumentPromise = (async () => {
      async function walk(directory, relative = '') {
        const entries = await readdir(directory, { withFileTypes: true });
        for (const entry of entries) {
          const childRelative = path.posix.join(relative, entry.name);
          const child = path.join(directory, entry.name);
          if (entry.isDirectory()) {
            const result = await walk(child, childRelative);
            if (result !== undefined) return result;
            continue;
          }
          if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
          const source = await readFile(child, 'utf8');
          const frontmatter = source.match(/^---\n([\s\S]*?)\n---\n/u)?.[1] ?? '';
          const slugMatch = /^slug:\s*(?:"([^"]+)"|'([^']+)'|([^\s#]+))\s*$/mu.exec(frontmatter);
          const slug = (slugMatch?.[1] ?? slugMatch?.[2] ?? slugMatch?.[3] ?? entry.name.slice(0, -3)).replace(/\s+/gu, '-');
          if (slug !== workflowSlug) continue;
          const dateMatch = /^date:\s*(?:"([^"]+)"|'([^']+)'|([^\s#]+))\s*$/mu.exec(frontmatter);
          const date = dateMatch?.[1] ?? dateMatch?.[2] ?? dateMatch?.[3];
          if (date === undefined) throw new Error(`Workflow fixture ${childRelative} has no date metadata.`);
          const virtualPath = `posts/${childRelative}`;
          return Object.freeze({
            virtualPath,
            filename: entry.name,
            visiblePath: `~/blog/${virtualPath}`,
            date: date.slice(0, 10),
            hasFeaturedMarker: hasFeaturedMarker(frontmatter)
          });
        }
        return undefined;
      }

      const document = await walk(generatedPostsRoot);
      if (document === undefined) throw new Error(`Could not find post with slug ${workflowSlug}.`);
      return document;
    })();
  }
  return workflowDocumentPromise;
}

test('static build emits only the implemented route surface', async () => {
  const files = await listFiles(distRoot);
  const htmlFiles = files.filter((file) => file.endsWith('.html'));
  const expectedHtmlFiles = [
    '404.html',
    'index.html',
    'lab/index.html',
    'pages/index.html',
    'posts/index.html',
    ...(await collectContentRoutes(generatedPagesRoot, 'pages', false)),
    ...(await collectContentRoutes(generatedPostsRoot, 'posts', true))
  ].sort();

  assert.deepEqual(htmlFiles, expectedHtmlFiles);
  const scripts = files.filter((file) => /\.[cm]?js$/u.test(file));
  assert.equal(scripts.length, 2);
  assert.equal(scripts.filter((file) => /^_astro\/TerminalHome\.astro_astro_type_script_index_0_lang\.[A-Za-z0-9_-]+\.js$/u.test(file)).length, 1);
  assert.equal(scripts.filter((file) => /^_astro\/ReaderStatus\.astro_astro_type_script_index_0_lang\.[A-Za-z0-9_-]+\.js$/u.test(file)).length, 1);
  assert.equal(files.filter((file) => file.endsWith('.css')).length, 1);
  assert.deepEqual(files.filter((file) => !/\.(?:css|html|js)$/u.test(file)), [
    'fonts/JetBrainsMono-Medium-v2.304.woff2',
    'fonts/JetBrainsMono-Regular-v2.304.woff2',
    'licenses/JetBrainsMono-OFL-1.1.txt',
    'licenses/JetBrainsMono-PROVENANCE.txt',
    'robots.txt',
    ...(SITE_CONFIG.site.url === null ? [] : ['sitemap.xml'])
  ]);
  assert.equal(files.includes('sitemap.xml'), SITE_CONFIG.site.url !== null);
  assert.equal(files.some((file) => file.endsWith('.map')), false);
});

test('shared head metadata and public discovery files follow site configuration', async () => {
  const home = await readFile(path.join(distRoot, 'index.html'), 'utf8');
  const article = await readFile(path.join(distRoot, 'posts/ai/llm-workflow-with-trellis/index.html'), 'utf8');
  const robots = await readFile(path.join(distRoot, 'robots.txt'), 'utf8');
  assert.match(home, new RegExp('<html lang="' + SITE_CONFIG.site.language + '"', 'u'));
  assert.match(home, new RegExp('<title>' + SITE_CONFIG.site.name + '</title>', 'u'));
  assert.match(home, /friend links/u);
  if (SITE_CONFIG.terminal.friends.length === 0) {
    assert.match(home, /No friend links\./u);
    assert.doesNotMatch(home, /data-terminal-friend-name=/u);
  } else {
    assert.doesNotMatch(home, /No friend links\./u);
    assert.equal((home.match(/data-terminal-friend-name=/gu) ?? []).length, SITE_CONFIG.terminal.friends.length);
    for (const friend of SITE_CONFIG.terminal.friends) {
      assert.ok(home.includes(friend.name));
      assert.ok(home.includes(friend.url));
    }
  }
  assert.match(home, new RegExp('<meta name="description" content="' + SITE_CONFIG.site.description.replace('.', '\\.') + '">', 'u'));
  assert.match(home, new RegExp('<meta name="robots" content="' + SITE_CONFIG.seo.robots.replace(', ', ',\\s*') + '">', 'u'));
  if (SITE_CONFIG.site.url === null) {
    assert.doesNotMatch(home, /rel="canonical"/u);
    assert.doesNotMatch(home, /property="og:url"/u);
  } else {
    const homeUrl = `${SITE_CONFIG.site.url}/`;
    const articleUrl = `${SITE_CONFIG.site.url}/posts/ai/llm-workflow-with-trellis/`;
    assert.ok(home.includes(`rel="canonical" href="${homeUrl}"`));
    assert.ok(home.includes(`property="og:url" content="${homeUrl}"`));
    assert.ok(article.includes(`property="og:url" content="${articleUrl}"`));
  }
  assert.match(article, /property="og:type" content="article"/u);
  assert.match(article, /property="article:published_time"/u);
  assert.match(article, /property="article:modified_time"/u);
  if (SITE_CONFIG.site.url === null) assert.doesNotMatch(article, /property="og:url"/u);
  if (SITE_CONFIG.seo.image === null) {
    assert.doesNotMatch(home, /property="og:image"/u);
  } else {
    assert.match(home, /property="og:image"/u);
    assert.match(home, /name="twitter:image"/u);
  }
  assert.equal(robots, createRobotsText(SITE_CONFIG));
});

test('supported content markers render correctly on canonical public surfaces when provided', async () => {
  const workflowDocument = await findWorkflowDocument();
  const routes = {
    home: await readFile(path.join(distRoot, 'index.html'), 'utf8'),
    directory: await readFile(path.join(distRoot, 'posts/ai/index.html'), 'utf8'),
    article: await readFile(path.join(distRoot, workflowRoute), 'utf8')
  };

  for (const [route, html] of Object.entries(routes)) {
    const markerIds = [...html.matchAll(/data-content-marker="([^"]+)"/gu)].map(([, markerId]) => markerId);

    for (const markerId of markerIds) {
      assert.ok(supportedContentMarkerIds.includes(markerId), `${route}: unsupported content marker ${markerId}`);
      const marker = resolveContentMarkers([markerId])[0];
      assert.ok(marker, `${route}: no registry descriptor for content marker ${markerId}`);
      const renderedMarkers = [
        ...html.matchAll(
          new RegExp(`<span\\b[^>]*data-content-marker="${escapeRegExp(markerId)}"[^>]*>([\\s\\S]*?)<\\/span>`, 'gu')
        )
      ];
      assert.ok(renderedMarkers.length > 0, `${route}: malformed content marker ${markerId}`);
      for (const [, label] of renderedMarkers) {
        assert.equal(label.trim(), marker.label, route);
      }
    }

    if (workflowDocument.hasFeaturedMarker) {
      assert.match(html, /data-content-marker="featured"/u, route);
      assert.match(html, />Featured<\/span>/u, route);
    }
  }
});

test('comment output is post-only and follows the enabled build contract', async () => {
  const routes = {
    home: await readFile(path.join(distRoot, 'index.html'), 'utf8'),
    postsIndex: await readFile(path.join(distRoot, 'posts/index.html'), 'utf8'),
    pagesIndex: await readFile(path.join(distRoot, 'pages/index.html'), 'utf8'),
    page: await readFile(path.join(distRoot, 'pages/about/index.html'), 'utf8'),
    lab: await readFile(path.join(distRoot, 'lab/index.html'), 'utf8'),
    notFound: await readFile(path.join(distRoot, '404.html'), 'utf8'),
    post: await readFile(path.join(distRoot, 'posts/ai/llm-workflow-with-trellis/index.html'), 'utf8')
  };
  const commentSurface = /<section\b[^>]*\bclass=["'](?:terminal-)?comment-section["']/iu;
  const excluded = [routes.home, routes.postsIndex, routes.pagesIndex, routes.page, routes.lab, routes.notFound];

  if (!SITE_CONFIG.plugins.comments.enabled) {
    assert.doesNotMatch(routes.post, commentSurface);
    for (const html of excluded) assert.doesNotMatch(html, commentSurface);
    return;
  }

  const commentsExportPath = process.env.FIREFLY_COMMENTS_EXPORT;
  assert.ok(commentsExportPath, 'enabled comments require FIREFLY_COMMENTS_EXPORT');
  const commentsExport = JSON.parse(await readFile(commentsExportPath, 'utf8'));
  assert.ok(Array.isArray(commentsExport.comments), 'comments export must contain a comments array');
  const expectedComments = commentsExport.comments.filter(
    (comment) => comment.postPath === '/posts/ai/llm-workflow-with-trellis/'
  );
  const renderedComments = routes.post.match(
    /class="terminal-comment-card(?: terminal-comment-card--reply)?"/gu
  ) ?? [];

  assert.match(routes.post, /class="terminal-comment-section"/u);
  assert.equal(renderedComments.length, expectedComments.length);
  assert.equal(routes.post.includes('class="terminal-comment-empty"'), expectedComments.length === 0);
  const submissionAction = new URL('/v1/comments/submissions', SITE_CONFIG.comments.writeOrigin).toString();
  assert.ok(routes.post.includes(`action="${submissionAction}"`));
  assert.doesNotMatch(routes.post, /emailCiphertext|verificationTokenHash|controlTokenHash|ipHash|userAgentHash|internalId|dedupeKey/iu);
  for (const html of excluded) assert.doesNotMatch(html, commentSurface);
});

test('only the exact generated Terminal home script bypasses asset inlining', () => {
  const generated = '_astro/TerminalHome.astro_astro_type_script_index_0_lang.Abc_123-.js';
  assert.equal(terminalHomeAssetsInlineLimit(generated), false);
  assert.equal(terminalHomeAssetsInlineLimit(generated.replace('/', '\\')), false);
  assert.equal(terminalHomeAssetsInlineLimit(`prefix/${generated}`), undefined);
  assert.equal(terminalHomeAssetsInlineLimit(generated.replace('TerminalHome', 'TerminalDocument')), undefined);
  assert.equal(terminalHomeAssetsInlineLimit(null), undefined);
  assert.equal(terminalHomeAssetsInlineLimit(new Uint8Array()), undefined);
});

test('static artifacts preserve runtime safety and dependency isolation', async () => {
  const files = await listFiles(distRoot);
  const textFiles = files.filter((file) => /\.(?:css|html|js|json)$/u.test(file));
  const artifacts = (
    await Promise.all(
      textFiles.map(async (file) => `${file}\n${await readFile(path.join(distRoot, file), 'utf8')}`)
    )
  ).join('\n');
  const runtimeArtifacts = (
    await Promise.all(
      textFiles
        .filter((file) => file !== 'index.html' && !/^(?:pages|posts)\//u.test(file))
        .map(async (file) => `${file}\n${await readFile(path.join(distRoot, file), 'utf8')}`)
    )
  ).join('\n');
  const forbiddenInAllArtifacts = [
    /hidden draft/iu,
    /this should remain private/iu,
    /PRIVATE_(?:TITLE|BODY)_FIREFLY_7f2a/u,
    /private-owner|owner-fixture|hidden-draft/iu,
    /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/u,
    /AKIA[0-9A-Z]{16}/u,
    /gh[oprsu]_[A-Za-z0-9]{36,}/u,
    /FIREFLY_CONTENT_ROOT|\.generated-content|private-handoff|source-ledger/iu
  ];
  const forbiddenInRuntimeArtifacts = [
    /astro-island/iu,
    /client:(?:load|idle|visible|only)/iu,
    /fonts\.(?:googleapis|gstatic)\.com/iu,
    /@import\s+(?:url\()?\s*["']?https?:/iu,
    /url\(\s*["']?https?:/iu,
    /(?:^|[\s"'./_-])xterm(?:[\s"'./_-]|$)/imu,
    /logo-container/iu,
    /warning-stripe/iu,
    /remark-parse/iu,
    /sourceMappingURL/iu,
    /file:\/\//iu,
    /\/home\/[^/]+\//u,
    /\/Users\/[^/]+\//u,
    /[A-Z]:\\Users\\[^\\]+\\/u,
    /\/app\//u
  ];

  for (const pattern of forbiddenInAllArtifacts) {
    assert.doesNotMatch(artifacts, pattern);
  }
  for (const pattern of forbiddenInRuntimeArtifacts) {
    assert.doesNotMatch(runtimeArtifacts, pattern);
  }
});

test('site dependency and source paths remain isolated from experiments and reference code', async () => {
  const sourceFiles = (await listFiles(sourceRoot)).filter((file) =>
    /\.(?:astro|css|mjs|ts)$/u.test(file)
  );
  const graphFiles = [
    'astro.config.mjs',
    'package.json',
    'package-lock.json',
    ...sourceFiles.map((file) => path.posix.join('src', file))
  ];
  const graph = (
    await Promise.all(
      graphFiles.map(async (file) =>
        `${file}\n${await readFile(path.join(siteRoot, file), 'utf8')}`
      )
    )
  ).join('\n');
  const prohibitedReferences = [
    /["'](?:\.\.\/)*experiments\/nerv(?:\/[^"']*)?["']/iu,
    /["'](?:\.\.\/)*prototypes\/typecho-terminal(?:\/[^"']*)?["']/iu,
    /["']@firefly\/[^"']*nerv[^"']*["']/iu,
    /["'](?:@xterm\/[^"']+|xterm(?:\/[^"']*)?)["']/iu
  ];

  for (const pattern of prohibitedReferences) {
    assert.doesNotMatch(graph, pattern);
  }
});

test('semantic and Terminal presentation packages remain bidirectionally isolated', async () => {
  const repositoryRoot = path.resolve(siteRoot, '../..');
  const packages = {
    semantic: path.join(repositoryRoot, 'presentations/semantic'),
    terminal: path.join(repositoryRoot, 'presentations/terminal')
  };
  const readGraph = async (root) => {
    const sources = (await listFiles(path.join(root, 'src'))).filter((file) => file.endsWith('.ts'));
    const files = ['package.json', ...sources.map((file) => path.posix.join('src', file))];
    return (await Promise.all(files.map((file) => readFile(path.join(root, file), 'utf8')))).join('\n');
  };
  const semanticGraph = await readGraph(packages.semantic);
  const terminalGraph = await readGraph(packages.terminal);

  assert.doesNotMatch(semanticGraph, /["'](?:@firefly\/presentation-terminal|(?:\.\.\/)*(?:presentations\/)?terminal(?:\/|["']))/u);
  assert.doesNotMatch(terminalGraph, /["'](?:@firefly\/presentation-semantic|(?:\.\.\/)*(?:presentations\/)?semantic(?:\/|["']))/u);
  for (const graph of [semanticGraph, terminalGraph]) {
    assert.doesNotMatch(graph, /["'](?:\.\.\/)*(?:apps\/site|experiments\/nerv|prototypes\/typecho-terminal)(?:\/[^"']*)?["']/u);
  }
});

test('route closures keep public documents in Terminal styles and isolate home JavaScript', async () => {
  const files = await listFiles(distRoot);
  const homeScript = files.find((file) => /TerminalHome.*\.js$/u.test(file));
  const readerScript = files.find((file) => /ReaderStatus.*\.js$/u.test(file));
  const stylesheet = files.find((file) => file.endsWith('.css'));
  assert.ok(homeScript);
  assert.ok(readerScript);
  assert.ok(stylesheet);

  const routes = {
    home: await readFile(path.join(distRoot, 'index.html'), 'utf8'),
    lab: await readFile(path.join(distRoot, 'lab/index.html'), 'utf8'),
    notFound: await readFile(path.join(distRoot, '404.html'), 'utf8'),
    about: await readFile(path.join(distRoot, 'pages/about/index.html'), 'utf8'),
    article: await readFile(path.join(distRoot, 'posts/ai/llm-workflow-with-trellis/index.html'), 'utf8'),
    markdown: await readFile(path.join(distRoot, 'pages/markdown-template/index.html'), 'utf8')
  };
  const terminalDocumentRoutes = [routes.about, routes.article, routes.markdown];
  const semanticDocumentRoutes = [];
  const staticRoutes = [routes.notFound, routes.lab];

  assert.match(routes.home, /data-terminal-home/u);
  const startupMarkerIndex = routes.home.indexOf('data-terminal-startup-marker');
  const recoveryIndex = routes.home.indexOf('data-terminal-fallback');
  assert.ok(startupMarkerIndex >= 0);
  assert.ok(startupMarkerIndex < recoveryIndex);
  assert.match(routes.home, /data-terminal-startup/u);
  assert.match(routes.home, /data-terminal-boot-log/u);
  assert.equal((routes.home.match(/class="terminal-boot-line"/gu) ?? []).length, 12);
  assert.doesNotMatch(routes.home, /data-terminal-boot-separator|terminal-boot-separator/u);
  assert.doesNotMatch(routes.home, /data-terminal-boot-status|connecting\.\.\./u);
  assert.match(routes.home, /data-terminal-experiment-id="nerv"/u);
  assert.match(routes.home, /data-terminal-experiment-href="\/lab\/nerv\/"/u);
  assert.match(routes.home, /data-terminal-theme="firefly"/u);
  assert.match(routes.home, /--terminal-color-canvas/u);
  assert.match(routes.home, /font-family:\s*'JetBrains Mono'/u);
  assert.match(routes.home, /font-display:\s*block/u);
  assert.match(routes.home, /<link rel="preload" href="\/fonts\/JetBrainsMono-Regular-v2\.304\.woff2" as="font"/u);
  assert.match(routes.home, /<link rel="preload" href="\/fonts\/JetBrainsMono-Medium-v2\.304\.woff2" as="font"/u);
  assert.match(routes.home, /url\('\/fonts\/JetBrainsMono-Regular-v2\.304\.woff2'\)/u);
  assert.match(routes.home, /url\('\/fonts\/JetBrainsMono-Medium-v2\.304\.woff2'\)/u);
  assert.match(routes.home, /--terminal-boot-delay:\s*1100ms/u);
  assert.match(routes.home, new RegExp(`src="/${homeScript.replaceAll('.', '\\.')}`));
  assert.doesNotMatch(routes.home, new RegExp(readerScript.replaceAll('.', '\\.')));
  assert.doesNotMatch(routes.home, new RegExp(stylesheet.replaceAll('.', '\\.')));
  assert.doesNotMatch(routes.home, /class="terminal-titlebar"/u);
  for (const html of terminalDocumentRoutes) {
    assert.match(html, /class="terminal-root"/u);
    assert.match(html, /data-terminal-theme="firefly"/u);
    assert.match(html, /class="terminal-titlebar"/u);
    assert.match(html, /class="terminal-document"/u);
    assert.doesNotMatch(html, /class="terminal-path"/u);
    assert.doesNotMatch(html, /class="semantic-document"/u);
    assert.match(html, new RegExp(`src="/${readerScript.replaceAll('.', '\\.')}`));
    assert.match(html, new RegExp(readerScript.replaceAll('.', '\\.')));
    assert.doesNotMatch(html, new RegExp(homeScript.replaceAll('.', '\\.')));
    assert.doesNotMatch(html, new RegExp(stylesheet.replaceAll('.', '\\.')));
  }
  for (const html of semanticDocumentRoutes) {
    assert.match(html, /class="semantic-document"/u);
    assert.doesNotMatch(html, /class="terminal-root"/u);
    assert.match(html, new RegExp(`href="/${stylesheet.replaceAll('.', '\\.')}`));
    assert.match(html, new RegExp(`src="/${readerScript.replaceAll('.', '\\.')}`));
    assert.doesNotMatch(html, new RegExp(homeScript.replaceAll('.', '\\.')));
    assert.doesNotMatch(html, /data-terminal-theme="firefly"/u);
  }
  assert.match(routes.lab, /<h1[^>]*>Experiments<\/h1>/u);
  assert.match(routes.lab, /href="\/lab\/nerv\/"/u);
  assert.doesNotMatch(routes.lab, /<script\b|logo-container|warning-stripe/iu);

  for (const html of staticRoutes) {
    assert.match(html, new RegExp(stylesheet.replaceAll('.', '\\.')));
    assert.doesNotMatch(html, /data-terminal-(?:home|entry|wide)/u);
    assert.doesNotMatch(html, /--terminal-color-canvas/u);
    assert.doesNotMatch(html, /<script\b/iu);
    assert.doesNotMatch(html, new RegExp(homeScript.replaceAll('.', '\\.')));
    assert.doesNotMatch(html, new RegExp(readerScript.replaceAll('.', '\\.')));
    assert.doesNotMatch(html, /data-terminal-(?:home|startup|boot-log|startup-marker)/u);
  }
});

test('Terminal document and directory chrome use the visible shell path once', async () => {
  const workflow = await findWorkflowDocument();
  const routes = [
    ['pages/about/index.html', '~/blog/pages/about.md'],
    [workflowRoute, workflow.visiblePath],
    ['posts/ai/index.html', '~/blog/posts/ai']
  ];

  for (const [route, visiblePath] of routes) {
    const html = await readFile(path.join(distRoot, route), 'utf8');
    const titlebar = /<div class="terminal-titlebar"[^>]*>([\s\S]*?)<\/div>/u.exec(html)?.[1] ?? '';
    assert.ok(titlebar.includes(`<span>${visiblePath}</span>`));
    assert.equal((titlebar.match(/<span>/gu) ?? []).length, 2);
    assert.equal(titlebar.split(`<span>${visiblePath}</span>`).length - 1, 1);
    assert.doesNotMatch(titlebar, /<span>~\/posts\//u);
    assert.doesNotMatch(html, /class="terminal-path"/u);
  }
});

test('official JetBrains Mono assets retain pinned license and provenance', async () => {
  const expectedHashes = new Map([
    ['fonts/JetBrainsMono-Regular-v2.304.woff2', 'a9cb1cd82332b23a47e3a1239d25d13c86d16c4220695e34b243effa999f45f2'],
    ['fonts/JetBrainsMono-Medium-v2.304.woff2', '086c48dfbea9ddaff1320f7e09399b8e2924e88ce67453721255db3bdbb5a353']
  ]);
  for (const [file, expected] of expectedHashes) {
    const contents = await readFile(path.join(distRoot, file));
    assert.equal(createHash('sha256').update(contents).digest('hex'), expected);
  }

  const license = await readFile(path.join(distRoot, 'licenses/JetBrainsMono-OFL-1.1.txt'), 'utf8');
  const provenance = await readFile(path.join(distRoot, 'licenses/JetBrainsMono-PROVENANCE.txt'), 'utf8');
  assert.equal(
    createHash('sha256').update(license).digest('hex'),
    '30f0c136e3c88e422d0791acd97238870f9054a9729bc34cf2ff0d4ed8cac4ad'
  );
  assert.match(license, /SIL OPEN FONT LICENSE Version 1\.1 - 26 February 2007/u);
  assert.match(provenance, /Release: v2\.304/u);
  assert.match(provenance, /Release commit: cd5227b/u);
  for (const expected of expectedHashes.values()) {
    assert.match(provenance, new RegExp(expected, 'u'));
  }
});

test('Terminal components consume the root semantic theme contract', async () => {
  const css = await readFile(path.join(sourceRoot, 'styles/terminal.css'), 'utf8');
  const theme = /\.terminal-root\[data-terminal-theme='firefly'\]\s*\{[\s\S]*?\n\}/u.exec(css);
  assert.ok(theme);

  const componentCss = css.replace(theme[0], '');
  const semanticTokens = [
    '--terminal-color-scheme',
    '--terminal-color-canvas',
    '--terminal-color-surface',
    '--terminal-color-surface-subtle',
    '--terminal-color-text',
    '--terminal-color-muted',
    '--terminal-color-command',
    '--terminal-color-link',
    '--terminal-color-warning',
    '--terminal-color-error',
    '--terminal-color-border',
    '--terminal-color-focus',
    '--terminal-color-shadow',
    '--terminal-font-family',
    '--terminal-font-size',
    '--terminal-line-height',
    '--terminal-measure',
    '--terminal-measure-recovery',
    '--terminal-measure-stream',
    '--terminal-space-record',
    '--terminal-space-prompt-settlement'
  ];
  for (const token of semanticTokens) {
    assert.match(theme[0], new RegExp(`${token}:`, 'u'));
    assert.match(componentCss, new RegExp(`var\\(${token}\\)`, 'u'));
  }
  assert.doesNotMatch(componentCss, /#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(/iu);
});

test('home emits an exact safe entry/template map with inert build-rendered bodies', async () => {
  const workflow = await findWorkflowDocument();
  const files = await listFiles(distRoot);
  const scriptPath = files.find((file) => /TerminalHome.*\.js$/u.test(file));
  assert.ok(scriptPath);
  const home = await readFile(path.join(distRoot, 'index.html'), 'utf8');
  const script = await readFile(path.join(distRoot, scriptPath), 'utf8');
  const terminalArticle = await readFile(path.join(distRoot, 'pages/about/index.html'), 'utf8');
  const article = await readFile(path.join(distRoot, workflowRoute), 'utf8');
  assert.match(home, new RegExp(`data-terminal-entry-virtual-path="${escapeRegExp(workflow.virtualPath)}"`, 'u'));
  assert.match(home, new RegExp(`data-terminal-entry-filename="${escapeRegExp(workflow.filename)}"`, 'u'));
  assert.match(home, /data-terminal-entry-href="\/posts\/ai\/llm-workflow-with-trellis\/"/u);
  assert.match(home, new RegExp(`data-terminal-entry-date="${escapeRegExp(workflow.date)}(?:T[^"]+)?"`, 'u'));
  assert.doesNotMatch(home, /data-terminal-entry-(?:description|body|draft|source|presentation)/u);
  assert.match(home, /data-terminal-experiment-id="nerv"/u);
  assert.match(home, /data-terminal-experiment-title="NERV"/u);
  assert.match(home, /data-terminal-experiment-href="\/lab\/nerv\/"/u);
  assert.doesNotMatch(home, /data-terminal-experiment-(?:build|command|output|license|manifest|tags|kind)/u);
  const entryPaths = [...home.matchAll(/data-terminal-entry-virtual-path="([^"]+)"/gu)].map((match) => match[1]);
  const templatePaths = [...home.matchAll(/data-terminal-template-path="([^"]+)"/gu)].map((match) => match[1]);
  assert.deepEqual([...templatePaths].sort(), [...entryPaths].sort());
  assert.ok(templatePaths.includes('pages/about.md'));
  assert.ok(templatePaths.includes(workflow.virtualPath));
  const templateBodies = [...home.matchAll(/<template\b[^>]*data-terminal-template[^>]*>([\s\S]*?)<\/template>/gu)].map((match) => match[1] ?? '');
  assert.equal(templateBodies.length, entryPaths.length);
  assert.match(templateBodies.join('\n'), /data-language="mermaid"/u);
  assert.match(templateBodies.join('\n'), /Future presentations can change how the site looks/u);
  const withoutTemplates = home.replace(/<template\b[^>]*>[\s\S]*?<\/template>/gu, '');
  assert.doesNotMatch(withoutTemplates, /data-language="mermaid"|Future presentations can change how the site looks/u);
  assert.doesNotMatch(script, /data-language="mermaid"|Future presentations can change how the site looks/u);
  assert.match(home, /<section\b[^>]*data-terminal-fallback[^>]*>/u);
  const marker = /<script\b[^>]*data-terminal-startup-marker[^>]*>[\s\S]*?<\/script>/u.exec(home)?.[0] ?? '';
  assert.match(marker, /terminalStartupState\s*=\s*['"]connecting['"]/u);
  assert.doesNotMatch(marker, /type=["']module["']/u);
  assert.ok(home.indexOf('data-terminal-startup-marker') < home.indexOf('data-terminal-fallback'));
  assert.match(home, /<section\b[^>]*data-terminal-startup[^>]*>/u);
  assert.match(home, /data-terminal-boot-log/u);
  assert.equal((home.match(/class="terminal-boot-line"/gu) ?? []).length, 12);
  assert.doesNotMatch(home, /data-terminal-boot-separator|terminal-boot-separator/u);
  assert.doesNotMatch(home, /data-terminal-boot-status|connecting\.\.\./u);
  assert.doesNotMatch(home.match(/<section\b[^>]*data-terminal-fallback[^>]*>/u)?.[0] ?? '', /\bhidden\b/u);
  assert.match(home, /<section\b[^>]*data-terminal-session[^>]*\bhidden\b[^>]*>/u);
  assert.match(home, new RegExp('<h1 class="terminal-visually-hidden">' + SITE_CONFIG.site.name + ' content terminal<\\/h1>', 'u'));
  assert.match(home, /enterkeyhint="send"/u);
  assert.doesNotMatch(home, /<button\b/iu);
  assert.match(terminalArticle, /<h1>About this foundation<\/h1>/u);
  assert.match(terminalArticle, /<span>~\/blog\/pages\/about\.md<\/span>/u);
  assert.doesNotMatch(terminalArticle, /class="terminal-path"/u);
  assert.match(terminalArticle, /data-terminal-reader-region/u);
  assert.equal((terminalArticle.match(/id="terminal-reader"/gu) ?? []).length, 1);
  assert.match(terminalArticle, /<p data-reader-search-status hidden><\/p>/u);
  assert.match(terminalArticle, /data-reader-search-form/u);
  assert.doesNotMatch(terminalArticle, /id="terminal-command"/iu);
  assert.match(article, /<h1>llm-workflow-with-trellis<\/h1>/u);
  assert.match(article, /data-language="mermaid"/u);
  assert.match(article, /class="terminal-document"/u);
  assert.match(article, /class="terminal-root"/u);
  assert.match(article, /published/u);
  assert.match(article, new RegExp(`<span>${escapeRegExp(workflow.visiblePath)}<\\/span>`, 'u'));
  assert.doesNotMatch(article, /class="terminal-path"/u);
});

test('ordinary routes contain no Experiment runtime or asset edge', async () => {
  const ordinaryRoutes = [
    '404.html',
    'pages/about/index.html',
    'posts/ai/llm-workflow-with-trellis/index.html',
    'pages/markdown-template/index.html'
  ];
  for (const route of ordinaryRoutes) {
    const html = await readFile(path.join(distRoot, route), 'utf8');
    assert.doesNotMatch(html, /\/lab\/nerv\/(?:_astro\/|favicon|nerv-logo)|logo-container|warning-stripe/iu);
    assert.doesNotMatch(html, /rel=["'](?:preload|prefetch)["'][^>]*\/lab\/nerv\//iu);
  }
});

test('home controller avoids browser content loading, parsing, and unsafe insertion APIs', async () => {
  const files = await listFiles(distRoot);
  const scriptPath = files.find((file) => /TerminalHome.*\.js$/u.test(file));
  assert.ok(scriptPath);
  const builtScript = await readFile(path.join(distRoot, scriptPath), 'utf8');
  const sourceScript = await readFile(path.join(sourceRoot, 'scripts/terminal-home.ts'), 'utf8');
  const prohibited = [
    /\bfetch\s*\(/u,
    /\bDOMParser\b/u,
    /\binnerHTML\b/u,
    /\binsertAdjacentHTML\b/u,
    /\bcreateContextualFragment\b/u,
    /\beval\s*\(/u,
    /FIREFLY_CONTENT_ROOT|\.generated-content|private-handoff|source-ledger/u
  ];
  for (const text of [sourceScript, builtScript]) {
    for (const pattern of prohibited) {
      assert.doesNotMatch(text, pattern);
    }
  }
});

test('default firefly output contains reader boundaries and localized wide regions', async () => {
  const workflow = await findWorkflowDocument();
  const post = await readFile(
    path.join(distRoot, workflowRoute),
    'utf8'
  );

  const statusIndex = post.indexOf('data-terminal-reader-status');
  const readerIndex = post.indexOf('data-terminal-reader-region');
  assert.ok(statusIndex >= 0);
  assert.ok(statusIndex > readerIndex);
  assert.equal((post.match(/id="terminal-reader"/gu) ?? []).length, 1);
  assert.match(post, /data-terminal-reader-entry="always"/u);
  assert.doesNotMatch(post, /data-terminal-reader-status[^>]*hidden/u);
  assert.match(post, /class="terminal-outline"/u);
  assert.match(post, /<ul\b/u);
  assert.doesNotMatch(post, /class="document-outline"/u);
  assert.match(post, /data-terminal-wide="code"/u);
  assert.match(post, /data-terminal-wide="table"/u);
  assert.match(post, /data-language="mermaid"/u);
  assert.match(post, /<h1>llm-workflow-with-trellis<\/h1>/u);
  assert.match(post, new RegExp(`<span>${escapeRegExp(workflow.visiblePath)}<\\/span>`, 'u'));
  assert.doesNotMatch(post, /class="terminal-path"/u);
});

test('both reader presentations keep status after content and fixed to the viewport bottom', async () => {
  const semanticComponent = await readFile(
    path.join(sourceRoot, 'components/SemanticDocument.astro'),
    'utf8'
  );
  const terminalComponent = await readFile(
    path.join(sourceRoot, 'components/TerminalDocument.astro'),
    'utf8'
  );
  const semanticStyles = await readFile(path.join(sourceRoot, 'styles/global.css'), 'utf8');
  const terminalStyles = await readFile(path.join(sourceRoot, 'styles/terminal.css'), 'utf8');

  for (const [component, variant] of [
    [semanticComponent, 'semantic'],
    [terminalComponent, 'terminal']
  ]) {
    const readerIndex = component.indexOf('data-terminal-reader-region');
    const statusIndex = component.indexOf(`<ReaderStatus variant="${variant}"`);
    assert.ok(readerIndex >= 0);
    assert.ok(statusIndex > readerIndex);
  }

  for (const [styles, selector] of [
    [semanticStyles, '.reader-status'],
    [terminalStyles, '.terminal-reader-status']
  ]) {
    const block = new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([\\s\\S]*?)\\n\\}`, 'u').exec(styles)?.[1] ?? '';
    assert.match(block, /position:\s*fixed;/u);
    assert.match(block, /inset-inline:\s*0;/u);
    assert.match(block, /inset-block-end:\s*0;/u);
    assert.match(block, /env\(safe-area-inset-bottom\)/u);
  }
});
