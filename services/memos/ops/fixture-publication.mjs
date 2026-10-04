import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { assemblePublication } from '../../../tooling/assemble-publication/dist/src/index.js';

try {
  const [operation, root] = process.argv.slice(2);
  const options = { repositoryRoot: root, discovery: { manifests: [], catalog: [] }, memoOptions: { siteConfigPath: 'config/site.toml', exportPath: 'inputs/memos.json', environment: {} } };
  if (operation === 'assemble') {
    await assemblePublication(options);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/publication.json'), 'utf8'));
    const exported = JSON.parse(fs.readFileSync(path.join(root, 'inputs/memos.json'), 'utf8'));
    assert.equal(manifest.memos.digest, exported.digest); assert.equal(manifest.memos.tombstoneEpoch, exported.tombstoneEpoch);
    assert.ok(fs.existsSync(path.join(root, 'artifacts/memos/memos.public.v1.json')));
    assert.ok(!fs.existsSync(path.join(root, 'dist/memos/memos.public.v1.json')));
    for (const target of ['artifacts', 'dist']) {
      const scan = (directory) => { for (const file of fs.readdirSync(directory, { withFileTypes: true })) {
        const name = path.join(directory, file.name);
        if (file.isDirectory()) scan(name);
        else { const bytes = fs.readFileSync(name, 'utf8'); for (const sentinel of ['native-private-', 'runtime-private-', 'fixture-only-password', '/var/lib/firefly-memos']) assert.ok(!bytes.includes(sentinel)); }
      } };
      scan(path.join(root, target));
    }
  } else if (operation === 'stale' || operation === 'stale-dom') {
    const before = fs.readFileSync(path.join(root, 'artifacts/publication.json'));
    await assert.rejects(assemblePublication(options), operation === 'stale' ? /predates the published epoch/u : /Memo|memo/u);
    assert.deepEqual(fs.readFileSync(path.join(root, 'artifacts/publication.json')), before);
    assert.equal(JSON.parse(before).memos.tombstoneEpoch, operation === 'stale' ? 2 : 0);
  } else throw new Error();
  process.stdout.write(`fixture:publication_${operation}_passed\n`);
} catch { process.stderr.write('fixture:publication_failed\n'); process.exitCode = 1; }
