import { strict as assert } from 'node:assert';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';

import { parse as parseToml } from 'smol-toml';

const execFileAsync = promisify(execFile);
const scriptPath = fileURLToPath(new URL('../../scripts/validate-route-catalog.mjs', import.meta.url));
const reconcileScriptPath = fileURLToPath(new URL('../../scripts/reconcile-route-catalog.mjs', import.meta.url));

interface CatalogRun {
  readonly status: number;
  readonly stdout: string;
  readonly stderr: string;
}

interface Fixture {
  readonly root: string;
  readonly release: string;
  readonly config: string;
}

async function createFixture(context: { after(callback: () => void | Promise<void>): void }): Promise<Fixture> {
  const root = await mkdtemp(path.join(tmpdir(), 'firefly-comments-route-catalog-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const release = path.join(root, 'release');
  await mkdir(release, { recursive: true });
  return { root, release, config: path.join(root, 'comments.toml') };
}

async function writeDocument(release: string, relativePath: string, type: 'article' | 'website'): Promise<void> {
  const document = path.join(release, relativePath);
  await mkdir(path.dirname(document), { recursive: true });
  await writeFile(document, `<html><head><meta property="og:type" content="${type}"></head><body></body></html>\n`);
}

async function writeRuntimeConfig(config: string, routes: readonly string[]): Promise<void> {
  await writeFile(config, `[runtime]\npostRoutes = ${JSON.stringify(routes)}\n`);
}

async function runCatalog(fixture: Fixture, output?: string): Promise<CatalogRun> {
  const argumentsList = [scriptPath, '--release', fixture.release, '--config', fixture.config];
  if (output !== undefined) argumentsList.push('--output', output);
  try {
    const result = await execFileAsync(process.execPath, argumentsList, { encoding: 'utf8' });
    return { status: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    const result = error as { readonly code?: number; readonly stdout?: string; readonly stderr?: string };
    return {
      status: typeof result.code === 'number' ? result.code : 1,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? ''
    };
  }
}

async function runReconcile(fixture: Fixture, output: string): Promise<CatalogRun> {
  try {
    const result = await execFileAsync(process.execPath, [
      reconcileScriptPath,
      '--release',
      fixture.release,
      '--config',
      fixture.config,
      '--output',
      output
    ], { encoding: 'utf8' });
    return { status: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    const result = error as { readonly code?: number; readonly stdout?: string; readonly stderr?: string };
    return {
      status: typeof result.code === 'number' ? result.code : 1,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? ''
    };
  }
}

test('classifies article documents and excludes shallow directory indexes', async (context) => {
  const fixture = await createFixture(context);
  const route = '/posts/topic/article/';
  await writeDocument(fixture.release, 'posts/index.html', 'article');
  await writeDocument(fixture.release, 'posts/topic/index.html', 'website');
  await writeDocument(fixture.release, 'posts/topic/article/index.html', 'article');
  await writeRuntimeConfig(fixture.config, [route]);

  const output = path.join(fixture.root, 'route-catalog.json');
  const result = await runCatalog(fixture, output);
  assert.equal(result.status, 0);
  const summary = JSON.parse(result.stdout) as Record<string, unknown>;
  assert.equal(summary.status, 'pass');
  assert.equal(summary.articleDocumentCount, 1);
  assert.equal(summary.staticRouteCount, 1);
  assert.equal(summary.configuredRouteCount, 1);
  assert.equal(result.stdout.includes(route), false);
  assert.deepEqual(JSON.parse(await readFile(output, 'utf8')), { schemaVersion: 1, routes: [route] });
});

test('does not classify body or attribute-name lookalikes as article metadata', async (context) => {
  const fixture = await createFixture(context);
  const document = path.join(fixture.release, 'posts/topic/not-an-article/index.html');
  await mkdir(path.dirname(document), { recursive: true });
  await writeFile(document, '<html><head-data><meta property="og:type" content="article"></head-data><head><meta-data property="og:type" content="article"><meta data-property="og:type" content="article"><meta property="og:type" content="website"></head><body><meta property="og:type" content="article"></body></html>\n');
  await writeRuntimeConfig(fixture.config, []);

  const result = await runCatalog(fixture);
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), {
    status: 'pass',
    articleDocumentCount: 0,
    staticRouteCount: 0,
    configuredRouteCount: 0,
    missingRouteCount: 0,
    staleRouteCount: 0,
    invalidRouteCount: 0,
    duplicateRouteCount: 0
  });
});

test('ignores pseudo metadata in comments, scripts, and attribute values', async (context) => {
  const fixture = await createFixture(context);
  const document = path.join(fixture.release, 'posts/topic/pseudo-marker/index.html');
  await mkdir(path.dirname(document), { recursive: true });
  await writeFile(document, [
    '<html><head>',
    '<!-- <meta property="og:type" content="article"> -->',
    '<script>const marker = \'<meta property="og:type" content="article">\';</script>',
    '<meta name="x property=og:type" content="article">',
    '</head><body></body></html>\n'
  ].join(''));
  await writeRuntimeConfig(fixture.config, []);

  const result = await runCatalog(fixture);
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), {
    status: 'pass',
    articleDocumentCount: 0,
    staticRouteCount: 0,
    configuredRouteCount: 0,
    missingRouteCount: 0,
    staleRouteCount: 0,
    invalidRouteCount: 0,
    duplicateRouteCount: 0
  });
});

test('derives canonical uppercase UTF-8 routes for Unicode path segments', async (context) => {
  const fixture = await createFixture(context);
  const slug = '妹妹相随-黑白世界';
  const route = '/posts/acg/%E5%A6%B9%E5%A6%B9%E7%9B%B8%E9%9A%8F-%E9%BB%91%E7%99%BD%E4%B8%96%E7%95%8C/';
  await writeDocument(fixture.release, `posts/acg/${slug}/index.html`, 'article');
  await writeRuntimeConfig(fixture.config, [route]);

  const result = await runCatalog(fixture);
  assert.equal(result.status, 0);
  assert.equal((JSON.parse(result.stdout) as { status: string }).status, 'pass');
  assert.equal(result.stdout.includes(route), false);
});

test('fails closed on a static/configured route mismatch without writing a catalog', async (context) => {
  const fixture = await createFixture(context);
  const emittedRoute = '/posts/main/current/';
  const staleRoute = '/posts/main/stale/';
  await writeDocument(fixture.release, 'posts/main/current/index.html', 'article');
  await writeRuntimeConfig(fixture.config, [staleRoute]);

  const output = path.join(fixture.root, 'route-catalog.json');
  const sentinel = '{"schemaVersion":1,"routes":["sentinel"]}\n';
  await writeFile(output, sentinel);
  const result = await runCatalog(fixture, output);
  assert.notEqual(result.status, 0);
  const summary = JSON.parse(result.stdout) as Record<string, unknown>;
  assert.equal(summary.status, 'fail');
  assert.equal(summary.missingRouteCount, 1);
  assert.equal(summary.staleRouteCount, 1);
  assert.equal(result.stdout.includes(emittedRoute), false);
  assert.equal(result.stdout.includes(staleRoute), false);
  assert.equal(result.stderr.includes(emittedRoute), false);
  assert.equal(result.stderr.includes(staleRoute), false);
  assert.equal(await readFile(output, 'utf8'), sentinel);
});

test('rejects invalid and duplicate configured routes without exposing their values', async (context) => {
  const fixture = await createFixture(context);
  const validRoute = '/posts/main/current/';
  const invalidRoute = '/posts/main/%41/';
  await writeDocument(fixture.release, 'posts/main/current/index.html', 'article');
  await writeRuntimeConfig(fixture.config, [validRoute, validRoute, invalidRoute]);

  const result = await runCatalog(fixture, path.join(fixture.root, 'route-catalog.json'));
  assert.notEqual(result.status, 0);
  const summary = JSON.parse(result.stdout) as Record<string, unknown>;
  assert.equal(summary.status, 'fail');
  assert.equal(summary.duplicateRouteCount, 1);
  assert.equal(summary.invalidRouteCount, 1);
  assert.equal(result.stdout.includes(invalidRoute), false);
  assert.equal(result.stderr.includes(invalidRoute), false);
});

test('rejects an unsafe emitted article route without writing a partial catalog', async (context) => {
  const fixture = await createFixture(context);
  await writeDocument(fixture.release, 'posts/main/bad title/index.html', 'article');
  await writeRuntimeConfig(fixture.config, []);

  const output = path.join(fixture.root, 'route-catalog.json');
  const result = await runCatalog(fixture, output);
  assert.notEqual(result.status, 0);
  const summary = JSON.parse(result.stdout) as Record<string, unknown>;
  assert.equal(summary.status, 'fail');
  assert.equal(summary.invalidRouteCount, 1);
  assert.equal(result.stderr.includes('bad title'), false);
  await assert.rejects(readFile(output, 'utf8'));
});

test('rejects symlinks anywhere in the release tree', async (context) => {
  const fixture = await createFixture(context);
  const outside = path.join(fixture.root, 'outside.html');
  const linked = path.join(fixture.release, 'posts/main/linked/index.html');
  await mkdir(path.dirname(linked), { recursive: true });
  await writeFile(outside, '<meta property="og:type" content="article">\n');
  await symlink(outside, linked);
  await writeRuntimeConfig(fixture.config, []);

  const result = await runCatalog(fixture);
  assert.notEqual(result.status, 0);
  assert.equal((JSON.parse(result.stdout) as { status: string }).status, 'fail');
  assert.equal(result.stdout.includes('linked'), false);
  assert.equal(result.stderr.includes('linked'), false);
});

test('rejects special files anywhere in the release tree', async (context) => {
  const fixture = await createFixture(context);
  const special = path.join(fixture.release, 'posts', 'main', 'pipe');
  await mkdir(path.dirname(special), { recursive: true });
  await execFileAsync('mkfifo', [special]);
  await writeRuntimeConfig(fixture.config, []);

  const result = await runCatalog(fixture);
  assert.notEqual(result.status, 0);
  assert.equal((JSON.parse(result.stdout) as { status: string }).status, 'fail');
  assert.equal(result.stdout.includes('pipe'), false);
  assert.equal(result.stderr.includes('pipe'), false);
});

test('rejects a symlinked catalog output parent without writing outside it', async (context) => {
  const fixture = await createFixture(context);
  const route = '/posts/main/current/';
  await writeDocument(fixture.release, 'posts/main/current/index.html', 'article');
  await writeRuntimeConfig(fixture.config, [route]);

  const outside = path.join(fixture.root, 'outside-output');
  const linkedParent = path.join(fixture.root, 'linked-output');
  await mkdir(outside, { recursive: true });
  await symlink(outside, linkedParent, 'dir');
  const result = await runCatalog(fixture, path.join(linkedParent, 'route-catalog.json'));

  assert.notEqual(result.status, 0);
  assert.equal((JSON.parse(result.stdout) as { status: string }).status, 'fail');
  await assert.rejects(readFile(path.join(outside, 'route-catalog.json'), 'utf8'));
});

test('rejects catalog output that targets the config or immutable release tree', async (context) => {
  const fixture = await createFixture(context);
  const route = '/posts/main/current/';
  await writeDocument(fixture.release, 'posts/main/current/index.html', 'article');
  await writeRuntimeConfig(fixture.config, [route]);
  const originalConfig = await readFile(fixture.config, 'utf8');

  const configResult = await runCatalog(fixture, fixture.config);
  assert.notEqual(configResult.status, 0);
  assert.equal((JSON.parse(configResult.stdout) as { status: string }).status, 'fail');
  assert.equal(await readFile(fixture.config, 'utf8'), originalConfig);

  const releaseOutput = path.join(fixture.release, 'route-catalog.json');
  const releaseResult = await runCatalog(fixture, releaseOutput);
  assert.notEqual(releaseResult.status, 0);
  assert.equal((JSON.parse(releaseResult.stdout) as { status: string }).status, 'fail');
  await assert.rejects(readFile(releaseOutput, 'utf8'));
});

test('rejects a symlinked configuration parent', async (context) => {
  const fixture = await createFixture(context);
  const route = '/posts/main/current/';
  await writeDocument(fixture.release, 'posts/main/current/index.html', 'article');

  const outside = path.join(fixture.root, 'outside-config');
  const linkedParent = path.join(fixture.root, 'linked-config');
  await mkdir(outside, { recursive: true });
  await writeRuntimeConfig(path.join(outside, 'comments.toml'), [route]);
  await symlink(outside, linkedParent, 'dir');

  const result = await runCatalog({ ...fixture, config: path.join(linkedParent, 'comments.toml') });
  assert.notEqual(result.status, 0);
  assert.equal((JSON.parse(result.stdout) as { status: string }).status, 'fail');
});

test('reconciles a candidate while preserving the input and non-route configuration', async (context) => {
  const fixture = await createFixture(context);
  const currentRoute = '/posts/main/current/';
  const unicodeRoute = '/posts/acg/%E5%A6%B9%E5%A6%B9/';
  await writeDocument(fixture.release, 'posts/main/current/index.html', 'article');
  await writeDocument(fixture.release, 'posts/acg/妹妹/index.html', 'article');
  const originalConfig = [
    '[public]',
    'writeOrigin = "https://comments.example.test"',
    'exportPath = "artifacts/comments/comments.public.v1.json"',
    'consentVersion = "m51-v1"',
    '',
    '[runtime]',
    'postRoutes = ["/posts/stale/"]',
    'allowedOrigins = ["https://comments.example.test"]',
    'publicOrigin = "https://comments.example.test"',
    'dataRoot = "/var/lib/firefly-comments"',
    'databasePath = "/var/lib/firefly-comments/core.db"',
    '',
    '[runtime.smtp]',
    'host = "smtp.example.test"',
    'port = 465',
    'secure = true',
    'user = "reader@example.test"',
    'from = "reader@example.test"',
    'passwordEnv = "COMMENTS_SMTP_PASSWORD"',
    ''
  ].join('\n');
  await writeFile(fixture.config, originalConfig);

  const output = path.join(fixture.root, 'candidate.toml');
  const result = await runReconcile(fixture, output);
  assert.equal(result.status, 0);
  const summary = JSON.parse(result.stdout) as Record<string, unknown>;
  assert.deepEqual(summary, {
    status: 'pass',
    articleDocumentCount: 2,
    staticRouteCount: 2,
    configuredRouteCount: 1,
    missingRouteCount: 2,
    staleRouteCount: 1,
    invalidRouteCount: 0,
    duplicateRouteCount: 0,
    candidateRouteCount: 2
  });
  assert.equal(result.stdout.includes(currentRoute), false);
  assert.equal(result.stdout.includes(unicodeRoute), false);
  assert.equal(result.stdout.includes('/posts/stale/'), false);
  assert.equal(result.stderr, '');
  assert.equal(await readFile(fixture.config, 'utf8'), originalConfig);

  const input = parseToml(originalConfig) as Record<string, unknown> & { runtime: Record<string, unknown> };
  const candidateSource = await readFile(output, 'utf8');
  const candidate = parseToml(candidateSource) as Record<string, unknown> & { runtime: Record<string, unknown> };
  assert.deepEqual(candidate.public, input.public);
  assert.deepEqual(candidate.runtime.allowedOrigins, input.runtime.allowedOrigins);
  assert.equal(candidate.runtime.publicOrigin, input.runtime.publicOrigin);
  assert.equal(candidate.runtime.dataRoot, input.runtime.dataRoot);
  assert.equal(candidate.runtime.databasePath, input.runtime.databasePath);
  assert.deepEqual(candidate.runtime.smtp, input.runtime.smtp);
  assert.deepEqual(candidate.runtime.postRoutes, [currentRoute, unicodeRoute].sort());
  assert.equal((await stat(output)).mode & 0o777, 0o600);

  const candidateFixture = { ...fixture, config: output };
  const validation = await runCatalog(candidateFixture);
  assert.equal(validation.status, 0);
  assert.deepEqual(JSON.parse(validation.stdout), {
    status: 'pass',
    articleDocumentCount: 2,
    staticRouteCount: 2,
    configuredRouteCount: 2,
    missingRouteCount: 0,
    staleRouteCount: 0,
    invalidRouteCount: 0,
    duplicateRouteCount: 0
  });
});

test('rejects malformed configuration and preserves an existing candidate', async (context) => {
  const fixture = await createFixture(context);
  await writeDocument(fixture.release, 'posts/main/current/index.html', 'article');
  await writeFile(fixture.config, '[runtime\npostRoutes = ["/posts/main/current/"]\n');
  const output = path.join(fixture.root, 'candidate.toml');
  const sentinel = 'keep this candidate untouched\n';
  await writeFile(output, sentinel);

  const result = await runReconcile(fixture, output);
  assert.notEqual(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), {
    status: 'fail',
    articleDocumentCount: 1,
    staticRouteCount: 1,
    configuredRouteCount: 0,
    missingRouteCount: 0,
    staleRouteCount: 0,
    invalidRouteCount: 0,
    duplicateRouteCount: 0
  });
  assert.equal(result.stdout.includes('/posts/main/current/'), false);
  assert.equal(result.stderr.includes('/posts/main/current/'), false);
  assert.equal(await readFile(output, 'utf8'), sentinel);
});

test('rejects invalid configured route inventories before creating a candidate', async (context) => {
  const fixture = await createFixture(context);
  const route = '/posts/main/current/';
  await writeDocument(fixture.release, 'posts/main/current/index.html', 'article');
  await writeRuntimeConfig(fixture.config, [route, route, '/posts/main/%41/']);
  const output = path.join(fixture.root, 'candidate.toml');

  const result = await runReconcile(fixture, output);
  assert.notEqual(result.status, 0);
  const summary = JSON.parse(result.stdout) as Record<string, unknown>;
  assert.equal(summary.status, 'fail');
  assert.equal(summary.configuredRouteCount, 3);
  assert.equal(summary.invalidRouteCount, 1);
  assert.equal(summary.duplicateRouteCount, 1);
  assert.equal(result.stdout.includes(route), false);
  assert.equal(result.stderr.includes('/posts/main/%41/'), false);
  await assert.rejects(readFile(output, 'utf8'));
});

test('rejects a candidate output path that is the input config', async (context) => {
  const fixture = await createFixture(context);
  const route = '/posts/main/current/';
  await writeDocument(fixture.release, 'posts/main/current/index.html', 'article');
  await writeRuntimeConfig(fixture.config, ['/posts/main/stale/']);
  const originalConfig = await readFile(fixture.config, 'utf8');

  const result = await runReconcile(fixture, fixture.config);
  assert.notEqual(result.status, 0);
  assert.equal((JSON.parse(result.stdout) as { status: string }).status, 'fail');
  assert.equal(await readFile(fixture.config, 'utf8'), originalConfig);
  assert.equal(result.stdout.includes(route), false);
});

test('rejects symlinked candidate and config parents without writing outside them', async (context) => {
  const fixture = await createFixture(context);
  const route = '/posts/main/current/';
  await writeDocument(fixture.release, 'posts/main/current/index.html', 'article');
  await writeRuntimeConfig(fixture.config, [route]);

  const outsideOutput = path.join(fixture.root, 'outside-output');
  const linkedOutput = path.join(fixture.root, 'linked-output');
  await mkdir(outsideOutput, { recursive: true });
  await symlink(outsideOutput, linkedOutput, 'dir');
  const outputResult = await runReconcile(fixture, path.join(linkedOutput, 'candidate.toml'));
  assert.notEqual(outputResult.status, 0);
  await assert.rejects(readFile(path.join(outsideOutput, 'candidate.toml'), 'utf8'));

  const outsideConfig = path.join(fixture.root, 'outside-config');
  const linkedConfig = path.join(fixture.root, 'linked-config');
  await mkdir(outsideConfig, { recursive: true });
  await writeRuntimeConfig(path.join(outsideConfig, 'comments.toml'), [route]);
  await symlink(outsideConfig, linkedConfig, 'dir');
  const configResult = await runReconcile(
    { ...fixture, config: path.join(linkedConfig, 'comments.toml') },
    path.join(fixture.root, 'config-parent-candidate.toml')
  );
  assert.notEqual(configResult.status, 0);
  await assert.rejects(readFile(path.join(fixture.root, 'config-parent-candidate.toml'), 'utf8'));
});

test('rejects a special release entry and leaves an absent output tree untouched', async (context) => {
  const fixture = await createFixture(context);
  const special = path.join(fixture.release, 'posts', 'main', 'pipe');
  await mkdir(path.dirname(special), { recursive: true });
  await execFileAsync('mkfifo', [special]);
  await writeRuntimeConfig(fixture.config, []);
  const output = path.join(fixture.root, 'new-output', 'candidate.toml');

  const result = await runReconcile(fixture, output);
  assert.notEqual(result.status, 0);
  assert.equal((JSON.parse(result.stdout) as { status: string }).status, 'fail');
  await assert.rejects(stat(path.dirname(output)));
  assert.equal(result.stdout.includes('pipe'), false);
  assert.equal(result.stderr.includes('pipe'), false);
});
