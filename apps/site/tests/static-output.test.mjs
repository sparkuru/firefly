import assert from 'node:assert/strict';
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
    'pages/about/index.html',
    'posts/hello-static-foundation/index.html',
    'posts/llm-workflow-with-trellis/index.html'
  ]);
  const scripts = files.filter((file) => /\.[cm]?js$/u.test(file));
  assert.equal(scripts.length, 1);
  assert.match(scripts[0], /^_astro\/TerminalHome\.astro_astro_type_script_index_0_lang\.[A-Za-z0-9_-]+\.js$/u);
  assert.equal(files.filter((file) => file.endsWith('.css')).length, 1);
  assert.deepEqual(
    files.filter((file) => !/\.(?:css|html|js)$/u.test(file)),
    []
  );
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
  const textFiles = files.filter((file) => /\.(?:css|html|js|json|txt)$/u.test(file));
  const artifacts = (
    await Promise.all(
      textFiles.map(async (file) => `${file}\n${await readFile(path.join(distRoot, file), 'utf8')}`)
    )
  ).join('\n');
  const forbidden = [
    /astro-island/iu,
    /client:(?:load|idle|visible|only)/iu,
    /fonts\.(?:googleapis|gstatic)\.com/iu,
    /@font-face/iu,
    /@import\s+(?:url\()?\s*["']?https?:/iu,
    /url\(\s*["']?https?:/iu,
    /hidden draft/iu,
    /this should remain private/iu,
    /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/u,
    /AKIA[0-9A-Z]{16}/u,
    /gh[oprsu]_[A-Za-z0-9]{36,}/u,
    /(?:^|[\s"'./_-])xterm(?:[\s"'./_-]|$)/imu,
    /\/lab\/nerv\//iu,
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
  const script = files.find((file) => file.endsWith('.js'));
  const stylesheet = files.find((file) => file.endsWith('.css'));
  assert.ok(script);
  assert.ok(stylesheet);

  const routes = {
    home: await readFile(path.join(distRoot, 'index.html'), 'utf8'),
    notFound: await readFile(path.join(distRoot, '404.html'), 'utf8'),
    about: await readFile(path.join(distRoot, 'pages/about/index.html'), 'utf8'),
    semantic: await readFile(path.join(distRoot, 'posts/hello-static-foundation/index.html'), 'utf8'),
    terminal: await readFile(path.join(distRoot, 'posts/llm-workflow-with-trellis/index.html'), 'utf8')
  };
  const semanticRoutes = [routes.notFound, routes.about, routes.semantic];

  assert.match(routes.home, /data-terminal-home/u);
  assert.match(routes.home, /--terminal-background/u);
  assert.match(routes.home, new RegExp(`src="/${script.replaceAll('.', '\\.')}`));
  assert.doesNotMatch(routes.home, new RegExp(stylesheet.replaceAll('.', '\\.')));
  assert.doesNotMatch(routes.home, /class="terminal-titlebar"/u);
  assert.match(routes.terminal, /data-terminal-wide/u);
  assert.match(routes.terminal, /--terminal-background/u);
  assert.match(routes.terminal, /class="terminal-titlebar"/u);
  assert.doesNotMatch(routes.terminal, /<script\b/iu);
  assert.doesNotMatch(routes.terminal, new RegExp(stylesheet.replaceAll('.', '\\.')));

  for (const html of semanticRoutes) {
    assert.match(html, new RegExp(stylesheet.replaceAll('.', '\\.')));
    assert.doesNotMatch(html, /data-terminal-(?:home|entry|wide)/u);
    assert.doesNotMatch(html, /--terminal-background/u);
    assert.doesNotMatch(html, /<script\b/iu);
    assert.doesNotMatch(html, new RegExp(script.replaceAll('.', '\\.')));
  }
});

test('home emits an exact safe entry/template map with inert build-rendered bodies', async () => {
  const files = await listFiles(distRoot);
  const scriptPath = files.find((file) => file.endsWith('.js'));
  assert.ok(scriptPath);
  const home = await readFile(path.join(distRoot, 'index.html'), 'utf8');
  const script = await readFile(path.join(distRoot, scriptPath), 'utf8');
  const terminalArticle = await readFile(path.join(distRoot, 'posts/llm-workflow-with-trellis/index.html'), 'utf8');
  assert.match(home, /data-terminal-entry-filename="llm-workflow-with-trellis\.md"/u);
  assert.match(home, /data-terminal-entry-href="\/posts\/llm-workflow-with-trellis\/"/u);
  assert.match(home, /data-terminal-entry-date="2026-05-28"/u);
  assert.doesNotMatch(home, /data-terminal-entry-(?:description|body|draft|source|presentation)/u);
  const entryFilenames = [...home.matchAll(/data-terminal-entry-filename="([^"]+)"/gu)].map((match) => match[1]);
  const templateFilenames = [...home.matchAll(/data-terminal-template-filename="([^"]+)"/gu)].map((match) => match[1]);
  assert.deepEqual(templateFilenames, entryFilenames);
  assert.deepEqual(templateFilenames, [
    'hello-static-foundation.md',
    'llm-workflow-with-trellis.md',
    'about.md'
  ]);
  const templateBodies = [...home.matchAll(/<template\b[^>]*data-terminal-template[^>]*>([\s\S]*?)<\/template>/gu)].map((match) => match[1] ?? '');
  assert.equal(templateBodies.length, 3);
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
  assert.doesNotMatch(terminalArticle, /<form\b|id="terminal-command"/iu);
});

test('home controller avoids browser content loading, parsing, and unsafe insertion APIs', async () => {
  const files = await listFiles(distRoot);
  const scriptPath = files.find((file) => file.endsWith('.js'));
  assert.ok(scriptPath);
  const builtScript = await readFile(path.join(distRoot, scriptPath), 'utf8');
  const sourceScript = await readFile(path.join(sourceRoot, 'scripts/terminal-home.ts'), 'utf8');
  const prohibited = [
    /\bfetch\s*\(/u,
    /\bDOMParser\b/u,
    /\binnerHTML\b/u,
    /\binsertAdjacentHTML\b/u,
    /\bcreateContextualFragment\b/u,
    /\beval\s*\(/u
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
