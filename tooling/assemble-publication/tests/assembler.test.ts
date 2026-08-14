import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { decodeExperimentManifest } from '@f1refly/validate-experiments';
import { assemblePublication, validateRelease, walkSafeTree } from '../src/index.js';

async function fixture(context: test.TestContext) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'f1refly-publication-'));
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

test('release validation rejects missing references, escaping mount URLs, and prohibited text', async (context) => {
  const { root, manifest } = await fixture(context);
  const release = path.join(root, 'release');
  await mkdir(path.join(release, 'lab/alpha/assets'), { recursive: true });
  await writeFile(path.join(release, 'index.html'), '<h1>Home</h1>');
  await writeFile(path.join(release, '404.html'), '<h1>Missing</h1>');
  await writeFile(path.join(release, 'lab/index.html'), '<h1>Lab</h1>');
  await writeFile(path.join(release, 'lab/alpha/index.html'), '<img src="missing.svg">');
  await writeFile(path.join(release, 'lab/alpha/404.html'), '<h1>Missing</h1>');
  await writeFile(path.join(release, 'lab/alpha/license'), 'fixture');
  await assert.rejects(validateRelease(release, [manifest]), /does not resolve/u);
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
  const authoredBody = '<img src="asset.txt">\n/srv/typecho/public-example.txt';
  await mkdir(path.join(release, 'posts/example/article'), { recursive: true });
  await mkdir(path.join(release, 'pages/about'), { recursive: true });
  await mkdir(path.join(release, 'lab/alpha'), { recursive: true });
  await writeFile(path.join(release, 'index.html'), '<h1>Home</h1>');
  await writeFile(path.join(release, '404.html'), '<h1>Missing</h1>');
  await writeFile(path.join(release, 'lab/index.html'), '<h1>Lab</h1>');
  await writeFile(path.join(release, 'posts/example/article/index.html'), authoredBody);
  await writeFile(path.join(release, 'pages/about/index.html'), authoredBody);
  await writeFile(path.join(release, 'posts/example/article/asset.txt'), 'public asset');
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
  await assert.rejects(validateRelease(release, [manifest]), /does not resolve/u);
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
  await assert.rejects(assemblePublication({ repositoryRoot: root, discovery }), /does not resolve/u);
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
