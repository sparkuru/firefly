import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assemblePublication, walkSafeTree } from '../dist/src/index.js';
import { createPublicExport, serializePublicExport } from '../../../plugins/memos/public.mjs';
import { buildMemoFixture } from '../../../apps/site/scripts/prepare-memos-fixture.mjs';
import { fixtureMemos, prepareMemoFixture, privateSentinels, repositoryRoot, siteRoot } from '../../../apps/site/tests/memos-fixture.mjs';

await mkdir(path.join(siteRoot, 'test-results'), { recursive: true });
const ownedRoot = await mkdtemp(path.join(siteRoot, 'test-results/memos-publication-'));
const fixtureRoot = path.join(ownedRoot, 'repository');
const discovery = { manifests: [], catalog: [] };
try {
  await mkdir(path.join(fixtureRoot, 'config'), { recursive: true });
  await mkdir(path.join(fixtureRoot, 'inputs'));
  let lastPair;
  for (const state of ['enabled', 'empty', 'disabled', 'stale']) {
    const fixture = await prepareMemoFixture(path.join(ownedRoot, 'source'), { enabled: state !== 'disabled' });
    const envelope = createPublicExport({ schemaVersion: 1, sourceRevision: `built-${state}`, generatedAt: '2026-10-04T00:00:00.000Z', tombstoneEpoch: state === 'stale' ? 2 : 3, memos: state === 'empty' ? [] : fixtureMemos });
    await writeFile(fixture.exportPath, serializePublicExport(envelope));
    const buildOutput = path.join(ownedRoot, `build-${state}`);
    const built = buildMemoFixture(fixture, buildOutput);
    assert.equal(built.status, 0, `${built.stdout}\n${built.stderr}`);
    const site = path.join(fixtureRoot, 'apps/site/dist');
    await rm(site, { recursive: true, force: true });
    await mkdir(path.dirname(site), { recursive: true });
    await cp(buildOutput, site, { recursive: true });
    await cp(fixture.configPath, path.join(fixtureRoot, 'config/site.toml'));
    await cp(fixture.pluginPath, path.join(fixtureRoot, 'memos.toml'));
    await cp(fixture.exportPath, path.join(fixtureRoot, 'inputs/memos.json'));
    const assemble = () => assemblePublication({ repositoryRoot: fixtureRoot, discovery, memoOptions: { environment: {}, exportPath: 'inputs/memos.json' } });
    if (state === 'stale') {
      await assert.rejects(assemble(), /predates the published epoch 3/u);
    } else {
      const result = await assemble();
      assert.equal(result.memos.enabled, state !== 'disabled');
      assert.equal(result.memos.tombstoneEpoch, 3);
      assert.equal(result.inventory.includes('memos/index.html'), state !== 'disabled');
    }
    const pair = {};
    for (const target of ['artifacts', 'dist']) {
      for (const file of (await walkSafeTree(path.join(fixtureRoot, target))).files) {
        const bytes = await readFile(path.join(fixtureRoot, target, file));
        pair[`${target}/${file}`] = bytes.toString('base64');
        if (/\.(?:html|js|json|css|xml)$/u.test(file)) for (const sentinel of privateSentinels) assert.ok(!bytes.toString('utf8').includes(sentinel), `${target}/${file} leaked a private sentinel`);
      }
    }
    if (state === 'stale') assert.deepEqual(pair, lastPair); else lastPair = pair;
    assert.deepEqual((await readdir(fixtureRoot)).filter((file) => file.includes('candidate-') || file.includes('previous-')), []);
    process.stdout.write(`[memo-publication] actual ${state} Astro build/${state === 'stale' ? 'refusal' : 'assembly'} passed\n`);
  }
} finally {
  await rm(ownedRoot, { recursive: true, force: true });
}
