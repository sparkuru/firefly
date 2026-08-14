import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { terminalHomeAssetsInlineLimit } from '../src/lib/assets-inline-limit.mjs';

const siteRoot = path.resolve(import.meta.dirname, '..');
const distRoot = path.join(siteRoot, 'dist');
const sourceRoot = path.join(siteRoot, 'src');

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

test('static build emits only the implemented route surface', async () => {
  const files = await listFiles(distRoot);
  const htmlFiles = files.filter((file) => file.endsWith('.html'));

  assert.deepEqual(htmlFiles, [
    '404.html',
    'index.html',
    'lab/index.html',
    'pages/about/index.html',
    'pages/index.html',
    'posts/characters/index.html',
    'posts/characters/nahida/index.html',
    'posts/hello-static-foundation/index.html',
    'posts/index.html',
    'posts/llm-workflow-with-trellis/index.html'
  ]);
  const scripts = files.filter((file) => /\.[cm]?js$/u.test(file));
  assert.equal(scripts.length, 2);
  assert.ok(scripts.some((file) => /^_astro\/TerminalHome\.astro_astro_type_script_index_0_lang\.[A-Za-z0-9_-]+\.js$/u.test(file)));
  assert.ok(scripts.some((file) => /^_astro\/TerminalDocument\.astro_astro_type_script_index_0_lang\.[A-Za-z0-9_-]+\.js$/u.test(file)));
  assert.equal(files.filter((file) => file.endsWith('.css')).length, 1);
  assert.deepEqual(files.filter((file) => !/\.(?:css|html|js)$/u.test(file)), [
    'fonts/JetBrainsMono-Medium-v2.304.woff2',
    'fonts/JetBrainsMono-Regular-v2.304.woff2',
    'licenses/JetBrainsMono-OFL-1.1.txt',
    'licenses/JetBrainsMono-PROVENANCE.txt'
  ]);
  assert.equal(files.some((file) => file.endsWith('.map')), false);
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
  const forbidden = [
    /astro-island/iu,
    /client:(?:load|idle|visible|only)/iu,
    /fonts\.(?:googleapis|gstatic)\.com/iu,
    /@import\s+(?:url\()?\s*["']?https?:/iu,
    /url\(\s*["']?https?:/iu,
    /hidden draft/iu,
    /this should remain private/iu,
    /PRIVATE_(?:TITLE|BODY)_M5_7f2a/u,
    /private-owner|owner-fixture|hidden-draft/iu,
    /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/u,
    /AKIA[0-9A-Z]{16}/u,
    /gh[oprsu]_[A-Za-z0-9]{36,}/u,
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

  for (const pattern of forbidden) {
    assert.doesNotMatch(artifacts, pattern);
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
    /["']@f1refly\/[^"']*nerv[^"']*["']/iu,
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

  assert.doesNotMatch(semanticGraph, /["'](?:@f1refly\/presentation-terminal|(?:\.\.\/)*(?:presentations\/)?terminal(?:\/|["']))/u);
  assert.doesNotMatch(terminalGraph, /["'](?:@f1refly\/presentation-semantic|(?:\.\.\/)*(?:presentations\/)?semantic(?:\/|["']))/u);
  for (const graph of [semanticGraph, terminalGraph]) {
    assert.doesNotMatch(graph, /["'](?:\.\.\/)*(?:apps\/site|experiments\/nerv|prototypes\/typecho-terminal)(?:\/[^"']*)?["']/u);
  }
});

test('route closures isolate semantic CSS, Terminal styles, and home JavaScript', async () => {
  const files = await listFiles(distRoot);
  const homeScript = files.find((file) => /TerminalHome.*\.js$/u.test(file));
  const readerScript = files.find((file) => /TerminalDocument.*\.js$/u.test(file));
  const stylesheet = files.find((file) => file.endsWith('.css'));
  assert.ok(homeScript);
  assert.ok(readerScript);
  assert.ok(stylesheet);

  const routes = {
    home: await readFile(path.join(distRoot, 'index.html'), 'utf8'),
    lab: await readFile(path.join(distRoot, 'lab/index.html'), 'utf8'),
    notFound: await readFile(path.join(distRoot, '404.html'), 'utf8'),
    about: await readFile(path.join(distRoot, 'pages/about/index.html'), 'utf8'),
    semantic: await readFile(path.join(distRoot, 'posts/hello-static-foundation/index.html'), 'utf8'),
    terminal: await readFile(path.join(distRoot, 'posts/llm-workflow-with-trellis/index.html'), 'utf8')
  };
  const semanticRoutes = [routes.notFound, routes.about, routes.semantic, routes.lab];

  assert.match(routes.home, /data-terminal-home/u);
  assert.match(routes.home, /data-terminal-experiment-id="nerv"/u);
  assert.match(routes.home, /data-terminal-experiment-href="\/lab\/nerv\/"/u);
  assert.match(routes.home, /data-terminal-theme="phosphor"/u);
  assert.match(routes.home, /--terminal-color-canvas/u);
  assert.match(routes.home, /font-family:\s*'JetBrains Mono'/u);
  assert.match(routes.home, /url\('\/fonts\/JetBrainsMono-Regular-v2\.304\.woff2'\)/u);
  assert.match(routes.home, new RegExp(`src="/${homeScript.replaceAll('.', '\\.')}`));
  assert.doesNotMatch(routes.home, new RegExp(readerScript.replaceAll('.', '\\.')));
  assert.doesNotMatch(routes.home, new RegExp(stylesheet.replaceAll('.', '\\.')));
  assert.doesNotMatch(routes.home, /class="terminal-titlebar"/u);
  assert.match(routes.terminal, /data-terminal-wide/u);
  assert.match(routes.terminal, /data-terminal-theme="phosphor"/u);
  assert.match(routes.terminal, /--terminal-color-canvas/u);
  assert.match(routes.terminal, /class="terminal-titlebar"/u);
  assert.match(routes.terminal, new RegExp(`src="/${readerScript.replaceAll('.', '\\.')}`));
  assert.doesNotMatch(routes.terminal, new RegExp(homeScript.replaceAll('.', '\\.')));
  assert.doesNotMatch(routes.terminal, new RegExp(stylesheet.replaceAll('.', '\\.')));
  assert.match(routes.lab, /<h1[^>]*>Experiments<\/h1>/u);
  assert.match(routes.lab, /href="\/lab\/nerv\/"/u);
  assert.doesNotMatch(routes.lab, /<script\b|logo-container|warning-stripe/iu);

  for (const html of semanticRoutes) {
    assert.match(html, new RegExp(stylesheet.replaceAll('.', '\\.')));
    assert.doesNotMatch(html, /data-terminal-(?:home|entry|wide)/u);
    assert.doesNotMatch(html, /--terminal-color-canvas/u);
    assert.doesNotMatch(html, /<script\b/iu);
    assert.doesNotMatch(html, new RegExp(homeScript.replaceAll('.', '\\.')));
    assert.doesNotMatch(html, new RegExp(readerScript.replaceAll('.', '\\.')));
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
  const theme = /\.terminal-root\[data-terminal-theme='phosphor'\]\s*\{[\s\S]*?\n\}/u.exec(css);
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
  const files = await listFiles(distRoot);
  const scriptPath = files.find((file) => /TerminalHome.*\.js$/u.test(file));
  assert.ok(scriptPath);
  const home = await readFile(path.join(distRoot, 'index.html'), 'utf8');
  const script = await readFile(path.join(distRoot, scriptPath), 'utf8');
  const terminalArticle = await readFile(path.join(distRoot, 'posts/llm-workflow-with-trellis/index.html'), 'utf8');
  const nestedArticle = await readFile(path.join(distRoot, 'posts/characters/nahida/index.html'), 'utf8');
  assert.match(home, /data-terminal-entry-filename="llm-workflow-with-trellis\.md"/u);
  assert.match(home, /data-terminal-entry-href="\/posts\/llm-workflow-with-trellis\/"/u);
  assert.match(home, /data-terminal-entry-date="2026-05-28"/u);
  assert.doesNotMatch(home, /data-terminal-entry-(?:description|body|draft|source|presentation)/u);
  assert.match(home, /data-terminal-experiment-id="nerv"/u);
  assert.match(home, /data-terminal-experiment-title="NERV"/u);
  assert.match(home, /data-terminal-experiment-href="\/lab\/nerv\/"/u);
  assert.doesNotMatch(home, /data-terminal-experiment-(?:build|command|output|license|manifest|tags|kind)/u);
  const entryPaths = [...home.matchAll(/data-terminal-entry-virtual-path="([^"]+)"/gu)].map((match) => match[1]);
  const templatePaths = [...home.matchAll(/data-terminal-template-path="([^"]+)"/gu)].map((match) => match[1]);
  assert.deepEqual([...templatePaths].sort(), [...entryPaths].sort());
  assert.deepEqual(templatePaths, [
    'pages/about.md',
    'posts/characters/nahida.md',
    'posts/hello-static-foundation.md',
    'posts/llm-workflow-with-trellis.md'
  ]);
  const templateBodies = [...home.matchAll(/<template\b[^>]*data-terminal-template[^>]*>([\s\S]*?)<\/template>/gu)].map((match) => match[1] ?? '');
  assert.equal(templateBodies.length, 4);
  assert.match(templateBodies.join('\n'), /No browser-side parser/u);
  assert.match(templateBodies.join('\n'), /data-language="mermaid"/u);
  assert.match(templateBodies.join('\n'), /Future presentations can change how the site looks/u);
  const withoutTemplates = home.replace(/<template\b[^>]*>[\s\S]*?<\/template>/gu, '');
  assert.doesNotMatch(withoutTemplates, /No browser-side parser|data-language="mermaid"|Future presentations can change how the site looks/u);
  assert.doesNotMatch(script, /No browser-side parser|data-language="mermaid"|Future presentations can change how the site looks/u);
  assert.match(home, /<section\b[^>]*data-terminal-fallback[^>]*>/u);
  assert.doesNotMatch(home.match(/<section\b[^>]*data-terminal-fallback[^>]*>/u)?.[0] ?? '', /\bhidden\b/u);
  assert.match(home, /<section\b[^>]*data-terminal-session[^>]*\bhidden\b[^>]*>/u);
  assert.match(home, /<h1 class="terminal-visually-hidden">f1refly content terminal<\/h1>/u);
  assert.match(home, /enterkeyhint="send"/u);
  assert.doesNotMatch(home, /<button\b/iu);
  assert.match(terminalArticle, /<h1>llm workflow with trellis<\/h1>/u);
  assert.match(terminalArticle, /data-language="mermaid"/u);
  assert.match(terminalArticle, /data-terminal-reader-region/u);
  assert.match(terminalArticle, /data-reader-search-form/u);
  assert.doesNotMatch(terminalArticle, /id="terminal-command"/iu);
  assert.match(nestedArticle, /guest@f1refly:~\/blog \$/u);
  assert.ok(nestedArticle.includes('<li data-breadcrumb-token="root"><span class="terminal-breadcrumb-gap" aria-hidden="true">&nbsp;</span><a href="/">/</a></li><li data-breadcrumb-token="posts"><span class="terminal-breadcrumb-gap" aria-hidden="true">&nbsp;</span><a href="/posts/">posts</a>'));
  assert.match(nestedArticle, /data-breadcrumb-token="current"><span class="terminal-breadcrumb-gap" aria-hidden="true">&nbsp;<\/span><span class="terminal-breadcrumb-separator" aria-hidden="true">\/<\/span><span class="terminal-breadcrumb-gap" aria-hidden="true">&nbsp;<\/span><span class="terminal-document-current" aria-current="page">nahida\.md<\/span>/u);
  assert.doesNotMatch(nestedArticle, />cd\s|\/ \/posts|<a[^>]*>nahida\.md<\/a>/u);
});

test('ordinary routes contain no Experiment runtime or asset edge', async () => {
  const ordinaryRoutes = [
    '404.html',
    'pages/about/index.html',
    'posts/hello-static-foundation/index.html',
    'posts/llm-workflow-with-trellis/index.html'
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
    /F1REFLY_CONTENT_ROOT|\.generated-content|memos\.private|comment-handoff|migration\.sqlite/u
  ];
  for (const text of [sourceScript, builtScript]) {
    for (const pattern of prohibited) {
      assert.doesNotMatch(text, pattern);
    }
  }
});

test('semantic output contains outline targets and localized wide regions', async () => {
  const post = await readFile(
    path.join(distRoot, 'posts/hello-static-foundation/index.html'),
    'utf8'
  );

  assert.match(post, /aria-labelledby="document-outline-title"/u);
  assert.match(post, /href="#markdown-to-durable-html"/u);
  assert.match(post, /id="markdown-to-durable-html"/u);
  assert.match(post, /data-wide-content="code"/u);
  assert.match(post, /data-wide-content="table"/u);
  assert.doesNotMatch(post, /<script\b/iu);
});
