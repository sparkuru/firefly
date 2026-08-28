import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { decodeExperimentManifest } from '@firefly/validate-experiments';
import { assemblePublication, validateRelease, walkSafeTree, type CommentsPublicationMetadata } from '../src/index.js';

async function fixture(context: test.TestContext) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-publication-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const site = path.join(root, 'apps/site/dist');
  const experiment = path.join(root, 'experiments/alpha');
  await mkdir(path.join(site, 'lab'), { recursive: true });
  await mkdir(path.join(experiment, 'dist/assets'), { recursive: true });
  await writeFile(path.join(site, 'index.html'), '<a href="/lab/">Lab</a>');
  await writeFile(path.join(site, '404.html'), '<h1>Missing</h1>');
  await writeFile(path.join(site, 'lab/index.html'), '<a href="/lab/alpha/">Alpha</a>');
  await writeFile(path.join(experiment, 'dist/index.html'), '<link href="/lab/alpha/assets/app.css">');
  await writeFile(path.join(experiment, 'dist/404.html'), '<h1>Alpha missing</h1>');
  await writeFile(path.join(experiment, 'dist/assets/app.css'), 'body{background:url(../favicon.svg)}');
  await writeFile(path.join(experiment, 'dist/favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  await writeFile(path.join(experiment, 'license'), 'fixture license');
  const manifest = decodeExperimentManifest({
    schemaVersion: 1,
    id: 'alpha',
    title: 'Alpha',
    kind: 'landing',
    visibility: 'listed',
    mountPath: '/lab/alpha',
    entryPath: '/index.html',
    build: { command: 'npm run build', outputDir: 'dist' },
    entries: [{ id: 'landing', title: 'Alpha', path: '/index.html', role: 'landing' }],
    licenseFile: 'license',
    tags: ['fixture']
  }, { directory: experiment });
  return { root, manifest };
}

async function captureWarnings(action: () => Promise<void>): Promise<readonly string[]> {
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: Parameters<typeof console.warn>) => {
    warnings.push(args.map((argument) => String(argument)).join(' '));
  };
  try {
    await action();
  } finally {
    console.warn = originalWarn;
  }
  return warnings;
}

test('comments publication adapter consumes the repository public contract', async () => {
  const testDirectory = path.dirname(fileURLToPath(import.meta.url));
  const sourcePath = testDirectory.endsWith(`${path.sep}dist${path.sep}tests`)
    ? path.resolve(testDirectory, '../../src/plugins/comments.ts')
    : path.resolve(testDirectory, '../src/plugins/comments.ts');
  const source = await readFile(sourcePath, 'utf8');
  assert.match(source, /plugins\/comments\/public\.mjs/u);
  assert.match(source, /commentsPostPathFromSiteHref/u);
  assert.doesNotMatch(source, /apps\/site\/src/u);
});

test('safe walker rejects symlinks and source maps', async (context) => {
  const { root } = await fixture(context);
  const tree = path.join(root, 'tree');
  await mkdir(tree);
  await writeFile(path.join(tree, 'ok.txt'), 'ok');
  assert.deepEqual((await walkSafeTree(tree)).files, ['ok.txt']);
  await symlink(path.join(tree, 'ok.txt'), path.join(tree, 'link.txt'));
  await assert.rejects(walkSafeTree(tree), /symbolic links/u);
  await rm(path.join(tree, 'link.txt'));
  await writeFile(path.join(tree, 'app.js.map'), '{}');
  await assert.rejects(walkSafeTree(tree), /source maps/u);
  await rm(path.join(tree, 'app.js.map'));
  await writeFile(path.join(tree, '.env.production'), 'SECRET=value');
  await assert.rejects(walkSafeTree(tree), /development or source artifacts/u);
  await rm(path.join(tree, '.env.production'));
  await writeFile(path.join(tree, 'unsafe\\name.txt'), 'unsafe');
  await assert.rejects(walkSafeTree(tree), /unsafe segment/u);
});

test('release validation warns for missing references but rejects escapes and prohibited text', async (context) => {
  const { root, manifest } = await fixture(context);
  const release = path.join(root, 'release');
  await mkdir(path.join(release, 'lab/alpha/assets'), { recursive: true });
  await writeFile(path.join(release, 'index.html'), '<h1>Home</h1>');
  await writeFile(path.join(release, '404.html'), '<h1>Missing</h1>');
  await writeFile(path.join(release, 'lab/index.html'), '<h1>Lab</h1>');
  await writeFile(path.join(release, 'lab/alpha/index.html'), '<img src="missing.svg">');
  await writeFile(path.join(release, 'lab/alpha/404.html'), '<h1>Missing</h1>');
  await writeFile(path.join(release, 'lab/alpha/license'), 'fixture');
  const missingWarnings = await captureWarnings(async () => {
    await assert.doesNotReject(validateRelease(release, [manifest]));
  });
  assert.equal(missingWarnings.length, 1);
  assert.match(missingWarnings[0] ?? '', /lab\/alpha\/index\.html.*missing\.svg.*does not resolve/u);
  await writeFile(path.join(release, 'lab/alpha/index.html'), '<a href="../../../../outside.html">escape</a>');
  await assert.rejects(validateRelease(release, [manifest]), /escapes the release/u);
  await writeFile(path.join(release, 'lab/alpha/index.html'), '<img src="//cdn.example.test/image.svg">');
  await assert.rejects(validateRelease(release, [manifest]), /protocol-relative/u);
  await writeFile(path.join(release, 'lab/alpha/index.html'), '<img src="%E0%A4%A">');
  await assert.rejects(validateRelease(release, [manifest]), /malformed reference/u);
  await writeFile(path.join(release, 'lab/alpha/index.html'), '<img src="../unsafe\\name.svg">');
  await assert.rejects(validateRelease(release, [manifest]), /unsafe reference/u);
  await writeFile(path.join(release, 'lab/alpha/index.html'), '<a href="/posts/private/">escape</a>');
  await assert.rejects(validateRelease(release, [manifest]), /escapes \/lab\/alpha/u);
  await writeFile(path.join(release, 'lab/alpha/index.html'), '<a href="../../index.html">escape</a>');
  await assert.rejects(validateRelease(release, [manifest]), /escapes \/lab\/alpha/u);
  await writeFile(path.join(release, 'lab/alpha/index.html'), '-----BEGIN PRIVATE KEY-----');
  await assert.rejects(validateRelease(release, [manifest]), /prohibited/u);
  await writeFile(path.join(release, 'lab/alpha/index.html'), '<h1>Alpha</h1>');
  await writeFile(path.join(release, 'lab/alpha/secret'), '-----BEGIN PRIVATE KEY-----');
  await assert.rejects(validateRelease(release, [manifest]), /prohibited/u);
});

test('allows path-like authored post/page bodies but rejects the same text in an Experiment', async (context) => {
  const { root, manifest } = await fixture(context);
  const release = path.join(root, 'release');
  const authoredBody = '<img src="asset.txt">\n/srv/uploads/public-example.txt';
  await mkdir(path.join(release, 'posts/example/article'), { recursive: true });
  await mkdir(path.join(release, 'posts/security/binary/article'), { recursive: true });
  await mkdir(path.join(release, 'pages/about'), { recursive: true });
  await mkdir(path.join(release, 'lab/alpha'), { recursive: true });
  await writeFile(path.join(release, 'index.html'), '<h1>Home</h1>');
  await writeFile(path.join(release, '404.html'), '<h1>Missing</h1>');
  await writeFile(path.join(release, 'lab/index.html'), '<h1>Lab</h1>');
  await writeFile(path.join(release, 'posts/example/article/index.html'), authoredBody);
  await writeFile(path.join(release, 'posts/security/binary/article/index.html'), authoredBody);
  await writeFile(path.join(release, 'pages/about/index.html'), authoredBody);
  await writeFile(path.join(release, 'posts/example/article/asset.txt'), 'public asset');
  await writeFile(path.join(release, 'posts/security/binary/article/asset.txt'), 'public asset');
  await writeFile(path.join(release, 'pages/about/asset.txt'), 'public asset');
  await writeFile(path.join(release, 'lab/alpha/index.html'), authoredBody);
  await writeFile(path.join(release, 'lab/alpha/404.html'), '<h1>Missing</h1>');
  await writeFile(path.join(release, 'lab/alpha/license'), 'fixture');

  await assert.rejects(validateRelease(release, [manifest]), /prohibited/u);
  await writeFile(path.join(release, 'lab/alpha/index.html'), '<h1>Alpha</h1>');
  await writeFile(path.join(release, 'posts/index.html'), authoredBody);
  await assert.rejects(validateRelease(release, [manifest]), /prohibited/u);
  await rm(path.join(release, 'posts/index.html'));
  await writeFile(path.join(release, 'index.html'), authoredBody);
  await assert.rejects(validateRelease(release, [manifest]), /prohibited/u);
  await writeFile(path.join(release, 'index.html'), '<h1>Home</h1>');
  await assert.doesNotReject(validateRelease(release, [manifest]));
  await rm(path.join(release, 'pages/about/asset.txt'));
  const missingWarnings = await captureWarnings(async () => {
    await assert.doesNotReject(validateRelease(release, [manifest]));
  });
  assert.equal(missingWarnings.length, 1);
  assert.match(missingWarnings[0] ?? '', /pages\/about\/index\.html.*asset\.txt.*does not resolve/u);
});

test('fresh assembly is deterministic, excludes stale files, and preserves a prior release on failure', async (context) => {
  const { root, manifest } = await fixture(context);
  await mkdir(path.join(root, 'dist'));
  await writeFile(path.join(root, 'dist/sentinel.txt'), 'prior release');
  const discovery = Object.freeze({
    manifests: Object.freeze([manifest]),
    catalog: Object.freeze([Object.freeze({
      id: 'alpha', title: 'Alpha', kind: 'landing', href: '/lab/alpha/', entryHref: '/lab/alpha/', tags: Object.freeze(['fixture'])
    })])
  });
  const first = await assemblePublication({ repositoryRoot: root, discovery });
  assert.equal(first.inventory.includes('sentinel.txt'), false);
  assert.equal(await readFile(path.join(root, 'dist/lab/alpha/license'), 'utf8'), 'fixture license');
  const second = await assemblePublication({ repositoryRoot: root, discovery });
  assert.deepEqual(second.inventory, first.inventory);

  await writeFile(path.join(root, 'dist/sentinel.txt'), 'preserve me');
  await writeFile(path.join(root, 'artifacts/sentinel.txt'), 'preserve artifacts');
  await writeFile(path.join(root, 'experiments/alpha/dist/index.html'), '<img src="missing.svg">');
  const missingWarnings = await captureWarnings(async () => {
    await assert.doesNotReject(assemblePublication({ repositoryRoot: root, discovery }));
  });
  assert.equal(missingWarnings.length, 1);
  assert.match(missingWarnings[0] ?? '', /\/lab\/alpha\/index\.html.*missing\.svg.*does not resolve/u);
  assert.equal(await readFile(path.join(root, 'dist/lab/alpha/index.html'), 'utf8'), '<img src="missing.svg">');

  await writeFile(path.join(root, 'dist/sentinel.txt'), 'preserve me');
  await writeFile(path.join(root, 'artifacts/sentinel.txt'), 'preserve artifacts');
  await writeFile(path.join(root, 'experiments/alpha/dist/index.html'), '<a href="/posts/private/">escape</a>');
  await assert.rejects(assemblePublication({ repositoryRoot: root, discovery }), /escapes \/lab\/alpha/u);
  assert.equal(await readFile(path.join(root, 'dist/sentinel.txt'), 'utf8'), 'preserve me');
  assert.equal(await readFile(path.join(root, 'artifacts/sentinel.txt'), 'utf8'), 'preserve artifacts');
});

test('assembly rejects Experiment outputs and licenses reached through symlinked parents', async (context) => {
  const { root, manifest } = await fixture(context);
  const external = path.join(root, 'external');
  await mkdir(path.join(external, 'dist'), { recursive: true });
  await writeFile(path.join(external, 'dist/index.html'), '<h1>External</h1>');
  await symlink(external, path.join(root, 'experiments/alpha/linked'));

  const escapedOutput = decodeExperimentManifest({
    schemaVersion: 1,
    id: 'alpha',
    title: 'Alpha',
    kind: 'landing',
    visibility: 'listed',
    mountPath: '/lab/alpha',
    entryPath: '/index.html',
    build: { command: 'npm run build', outputDir: 'linked/dist' },
    entries: [{ id: 'landing', title: 'Alpha', path: '/index.html', role: 'landing' }],
    tags: []
  }, { directory: manifest.directory });
  await assert.rejects(
    assemblePublication({
      repositoryRoot: root,
      discovery: Object.freeze({ manifests: Object.freeze([escapedOutput]), catalog: Object.freeze([]) })
    }),
    /resolves outside/u
  );

  await writeFile(path.join(external, 'license'), 'external license');
  const escapedLicense = decodeExperimentManifest({
    schemaVersion: 1,
    id: 'alpha',
    title: 'Alpha',
    kind: 'landing',
    visibility: 'listed',
    mountPath: '/lab/alpha',
    entryPath: '/index.html',
    build: { command: 'npm run build', outputDir: 'dist' },
    entries: [{ id: 'landing', title: 'Alpha', path: '/index.html', role: 'landing' }],
    licenseFile: 'linked/license',
    tags: []
  }, { directory: manifest.directory });
  await assert.rejects(
    assemblePublication({
      repositoryRoot: root,
      discovery: Object.freeze({ manifests: Object.freeze([escapedLicense]), catalog: Object.freeze([]) })
    }),
    /resolves outside/u
  );
});

test('release validation rejects private or unsafe comment surfaces in authored documents', async (context) => {
  const { root, manifest } = await fixture(context);
  const release = path.join(root, 'release');
  await mkdir(path.join(release, 'lab/alpha'), { recursive: true });
  await mkdir(path.join(release, 'posts/example/article'), { recursive: true });
  await writeFile(path.join(release, 'index.html'), '<h1>Home</h1>');
  await writeFile(path.join(release, '404.html'), '<h1>Missing</h1>');
  await writeFile(path.join(release, 'lab/index.html'), '<h1>Lab</h1>');
  await writeFile(path.join(release, 'lab/alpha/index.html'), '<h1>Alpha</h1>');
  await writeFile(path.join(release, 'lab/alpha/404.html'), '<h1>Missing</h1>');
  await writeFile(path.join(release, 'lab/alpha/license'), 'fixture');
  await writeFile(path.join(release, 'posts/example/article/index.html'), '<section class="comment-section"><p class="comment-body">privateEmail reader@example.test</p></section>');
  await assert.rejects(validateRelease(release, [manifest]), /private data|unsafe markup/u);
  await writeFile(path.join(release, 'posts/example/article/index.html'), '<section class="comment-section"><script>alert(1)</script></section>');
  await assert.rejects(validateRelease(release, [manifest]), /private data|unsafe markup/u);
});

test('publication evidence records comment tombstones and refuses an older rollback', async (context) => {
  const { root, manifest } = await fixture(context);
  const discovery = Object.freeze({ manifests: Object.freeze([manifest]), catalog: Object.freeze([]) });
  const current: CommentsPublicationMetadata = {
    enabled: true,
    schemaVersion: 1,
    sourceRevision: 'export-3',
    generatedAt: '2026-08-20T00:00:00.000Z',
    digest: 'a'.repeat(64),
    tombstoneEpoch: 3
  };
  const result = await assemblePublication({ repositoryRoot: root, discovery, comments: current });
  assert.deepEqual(result.comments, current);
  const publication = JSON.parse(await readFile(path.join(root, 'artifacts/publication.json'), 'utf8')) as { comments: CommentsPublicationMetadata };
  assert.deepEqual(publication.comments, current);
  await assert.rejects(
    assemblePublication({ repositoryRoot: root, discovery, comments: { ...current, sourceRevision: 'export-2', tombstoneEpoch: 2 } }),
    /predates the published epoch 3/u
  );
  assert.equal(await readFile(path.join(root, 'dist/lab/alpha/index.html'), 'utf8'), '<link href="/lab/alpha/assets/app.css">');
});
