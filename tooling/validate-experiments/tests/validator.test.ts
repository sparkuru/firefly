import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  decodeExperimentManifest,
  discoverExperiments,
  publicExperiment
} from '../src/index.js';

function manifest(id = 'alpha') {
  return {
    schemaVersion: 1,
    id,
    title: 'Alpha Lab',
    kind: 'landing',
    visibility: 'listed',
    mountPath: `/lab/${id}`,
    entryPath: '/index.html',
    build: { tool: 'astro', command: 'npm run build', outputDir: 'dist' },
    entries: [{ id: 'landing', title: 'Landing', path: '/index.html', role: 'landing' }],
    licenseFile: 'license',
    tags: ['astro', 'fan-work']
  };
}

test('decodes, freezes, and projects the exact v1 contract', () => {
  const decoded = decodeExperimentManifest(manifest(), { directory: '/repo/experiments/alpha' });
  assert.equal(Object.isFrozen(decoded), true);
  assert.equal(Object.isFrozen(decoded.entries), true);
  assert.equal(Object.isFrozen(decoded.entries[0]), true);
  assert.deepEqual(publicExperiment(decoded), {
    id: 'alpha',
    title: 'Alpha Lab',
    kind: 'landing',
    href: '/lab/alpha/',
    entryHref: '/lab/alpha/',
    tags: ['astro', 'fan-work']
  });
  assert.deepEqual(publicExperiment(decodeExperimentManifest({
    ...manifest(),
    entryPath: '/alternate.html',
    entries: [{ id: 'alternate', title: 'Alternate', path: '/alternate.html', role: 'landing' }]
  }, { directory: '/repo/experiments/alpha' })).entryHref, '/lab/alpha/alternate.html');
});

test('rejects malformed schema, paths, ownership, duplicates, and decorated values', () => {
  const cases: unknown[] = [
    { ...manifest(), schemaVersion: 2 },
    { ...manifest(), unknown: true },
    { ...manifest(), id: 'other' },
    { ...manifest(), mountPath: '/lab/other' },
    { ...manifest(), visibility: 'private' },
    { ...manifest(), entryPath: '/../index.html' },
    { ...manifest(), entryPath: '/%2e%2e/index.html' },
    { ...manifest(), entryPath: '/nested//index.html' },
    { ...manifest(), entryPath: '/index.html?preview=true' },
    { ...manifest(), entryPath: '/index.html#main' },
    { ...manifest(), entryPath: '/https:example.com' },
    { ...manifest(), build: { command: 'npm run build', outputDir: '../dist' } },
    { ...manifest(), build: { command: 'npm run build', outputDir: 'dist\\escape' } },
    { ...manifest(), build: { command: 'npm run build', outputDir: 'dist', extra: true } },
    { ...manifest(), licenseFile: '/license' },
    { ...manifest(), entries: [] },
    { ...manifest(), entries: [{ id: 'landing', title: 'Landing', path: '/other.html', role: 'landing' }] },
    { ...manifest(), entries: [
      { id: 'landing', title: 'Landing', path: '/index.html', role: 'landing' },
      { id: 'landing', title: 'Other', path: '/other.html', role: 'landing' }
    ] },
    { ...manifest(), entries: [{ id: 'landing', title: 'Landing', path: '/index.html', role: 'landing', extra: true }] },
    { ...manifest(), tags: ['astro', 'astro'] }
  ];
  for (const value of cases) {
    assert.throws(() => decodeExperimentManifest(value, { directory: '/repo/experiments/alpha' }));
  }
  const sparse = manifest();
  sparse.entries = new Array(1) as typeof sparse.entries;
  assert.throws(() => decodeExperimentManifest(sparse, { directory: '/repo/experiments/alpha' }), /dense/u);
  let invoked = false;
  const accessor = Object.defineProperty({}, 'schemaVersion', { get() { invoked = true; return 1; } });
  assert.throws(() => decodeExperimentManifest(accessor, { directory: '/repo/experiments/alpha' }), /data property/u);
  assert.equal(invoked, false);

  const decoratedBuild = manifest();
  decoratedBuild.build = Object.defineProperty({}, 'command', {
    get() { invoked = true; return 'npm run build'; }
  }) as typeof decoratedBuild.build;
  assert.throws(() => decodeExperimentManifest(decoratedBuild, { directory: '/repo/experiments/alpha' }), /data property/u);
  assert.equal(invoked, false);
});

test('discovers stable listed and unlisted manifests and rejects overlapping ownership', async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-manifests-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const experimentsRoot = path.join(root, 'experiments');
  await mkdir(experimentsRoot);
  const writeManifest = async (id: string, visibility: 'listed' | 'unlisted') => {
    const directory = path.join(experimentsRoot, id);
    await mkdir(directory);
    await writeFile(path.join(directory, 'experiment.json'), JSON.stringify({ ...manifest(id), visibility }));
  };
  await writeManifest('zeta', 'unlisted');
  await writeManifest('alpha', 'listed');
  const result = await discoverExperiments({ repositoryRoot: root });
  assert.deepEqual(result.manifests.map((item) => item.id), ['alpha', 'zeta']);
  assert.deepEqual(result.catalog.map((item) => item.id), ['alpha']);

  const zetaPath = path.join(experimentsRoot, 'zeta', 'experiment.json');
  await writeFile(zetaPath, JSON.stringify({ ...manifest('zeta'), mountPath: '/lab/alpha/child' }));
  await assert.rejects(discoverExperiments({ repositoryRoot: root }), /mountPath/u);
});

test('discovery rejects malformed or missing manifests and realpath escapes', async (context) => {
  const sandbox = await mkdtemp(path.join(os.tmpdir(), 'firefly-manifest-boundary-'));
  context.after(() => rm(sandbox, { recursive: true, force: true }));
  const repositoryRoot = path.join(sandbox, 'repository');
  const experimentsRoot = path.join(repositoryRoot, 'experiments');
  await mkdir(path.join(experimentsRoot, 'alpha'), { recursive: true });
  await assert.rejects(discoverExperiments({ repositoryRoot }), /exactly one experiment\.json/u);

  await writeFile(path.join(experimentsRoot, 'alpha/experiment.json'), '{');
  await assert.rejects(discoverExperiments({ repositoryRoot }), /invalid JSON/u);

  await rm(experimentsRoot, { recursive: true });
  const externalExperiments = path.join(sandbox, 'external-experiments');
  await mkdir(externalExperiments);
  await symlink(externalExperiments, experimentsRoot);
  await assert.rejects(discoverExperiments({ repositoryRoot }), /contained/u);
});
