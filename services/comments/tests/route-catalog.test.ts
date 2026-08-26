import { strict as assert } from 'node:assert';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const scriptPath = fileURLToPath(new URL('../../scripts/validate-route-catalog.mjs', import.meta.url));

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
