import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

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
    'posts/hello-static-foundation/index.html'
  ]);
  assert.deepEqual(
    files.filter((file) => /\.[cm]?js$/u.test(file)),
    []
  );
  assert.deepEqual(
    files.filter((file) => !/\.(?:css|html)$/u.test(file)),
    []
  );
  assert.equal(files.some((file) => file.endsWith('.map')), false);
});

test('static artifacts preserve the no-runtime and isolation boundary', async () => {
  const files = await listFiles(distRoot);
  const textFiles = files.filter((file) => /\.(?:css|html|js|json|txt)$/u.test(file));
  const artifacts = (
    await Promise.all(
      textFiles.map(async (file) => `${file}\n${await readFile(path.join(distRoot, file), 'utf8')}`)
    )
  ).join('\n');
  const forbidden = [
    /<script\b/iu,
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
    /@f1refly\/presentation-terminal/iu,
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

test('site dependency and source paths remain isolated from later presentations and experiments', async () => {
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
    /["']@f1refly\/presentation-terminal["']/iu,
    /["']@f1refly\/[^"']*nerv[^"']*["']/iu,
    /["'](?:@xterm\/[^"']+|xterm(?:\/[^"']*)?)["']/iu
  ];

  for (const pattern of prohibitedReferences) {
    assert.doesNotMatch(graph, pattern);
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
