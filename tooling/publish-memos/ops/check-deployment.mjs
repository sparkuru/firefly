import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, readlink, rename, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildCandidate, buildRollbackCandidate, promoteCandidate, readCurrentHistory } from '../src/index.mjs';
import { writePluginAccess } from '../../../plugins/public-access-files.mjs';

const root = path.resolve(process.argv[2]);
const sourceRoot = path.join(root, 'source');
const deploymentRoot = path.join(root, 'memo');
const blog = path.join(root, 'blog');
await mkdir(path.join(sourceRoot, 'assets'), { recursive: true });
await writeFile(path.join(sourceRoot, 'assets/pixel.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64'));
await mkdir(path.join(blog, 'release-one'), { recursive: true });
await writePluginAccess(path.join(blog, 'release-one'), { schemaVersion: 1, plugins: { comments: { enabled: false }, memos: { enabled: true } } });
await writeFile(path.join(blog, 'release-one/index.html'), '<h1>Independent Blog</h1><a href="/memos/">Memo</a>');
await writeFile(path.join(blog, 'release-one/article.html'), '<p>Article bytes</p>');
await symlink('release-one', path.join(blog, 'current'));
async function inventory(directory) {
  const result = {};
  async function visit(current, prefix = '') {
    for (const item of await readdir(current, { withFileTypes: true })) {
      const relative = path.posix.join(prefix, item.name);
      if (item.isDirectory()) await visit(path.join(current, item.name), relative);
      else if (item.isSymbolicLink()) result[relative] = await readlink(path.join(current, item.name));
      else result[relative] = createHash('sha256').update(await readFile(path.join(current, item.name))).digest('hex');
    }
  }
  await visit(directory);
  return result;
}
const baseline = await inventory(blog);
const id = 'm_fixture_owner';
const note = (body) => `---\nid: ${id}\ncreatedAt: 2026-10-06T00:00:00.000Z\ndraft: false\n---\n${body}\n\n![Synthetic pixel](assets/pixel.png)\n`;
await writeFile(path.join(sourceRoot, 'note.md'), note('First **owner** Memo.'));
const build = (name, history) => buildCandidate({ sourceRoot, outputRoot: path.join(root, name), displayName: 'Fixture Owner', history, generatedAt: '2026-10-06T01:00:00.000Z' });
const first = await build('candidate-first', null);
await promoteCandidate({ deploymentRoot, candidateRoot: first.candidateRoot, expectedBase: null });
assert.deepEqual(await inventory(blog), baseline);
const base = await readCurrentHistory(deploymentRoot);
const stale = await build('candidate-stale', base);
await writeFile(path.join(sourceRoot, 'note.md'), note('Edited owner Memo with [Blog](/posts/).'));
const edited = await build('candidate-edited', base);
await promoteCandidate({ deploymentRoot, candidateRoot: edited.candidateRoot, expectedBase: base.digest });
assert.deepEqual(await inventory(blog), baseline);
await assert.rejects(promoteCandidate({ deploymentRoot, candidateRoot: stale.candidateRoot, expectedBase: base.digest }));
const afterEdit = await inventory(deploymentRoot);
await mkdir(path.join(blog, 'release-two'));
await writePluginAccess(path.join(blog, 'release-two'), { schemaVersion: 1, plugins: { comments: { enabled: false }, memos: { enabled: true } } });
await writeFile(path.join(blog, 'release-two/index.html'), '<h1>Updated Blog</h1><a href="/memos/">Memo</a>');
await writeFile(path.join(blog, 'release-two/article.html'), '<p>Updated article</p>');
await symlink('release-two', path.join(blog, 'next'));
await rename(path.join(blog, 'next'), path.join(blog, 'current'));
assert.deepEqual(await inventory(deploymentRoot), afterEdit, 'ordinary blog switch preserves Memo bytes/history');
const newBlog = await inventory(blog);
const current = await readCurrentHistory(deploymentRoot);
const rollback = await buildRollbackCandidate({ priorCandidateRoot: first.candidateRoot, history: current, outputRoot: path.join(root, 'candidate-rollback') });
await promoteCandidate({ deploymentRoot, candidateRoot: rollback.candidateRoot, expectedBase: current.digest });
assert.deepEqual(await inventory(blog), newBlog);
await rm(path.join(sourceRoot, 'note.md'));
const withdrawal = await build('candidate-withdrawal', await readCurrentHistory(deploymentRoot));
await promoteCandidate({ deploymentRoot, candidateRoot: withdrawal.candidateRoot, expectedBase: withdrawal.receipt.expectedBase });
assert.deepEqual(await inventory(blog), newBlog);
await assert.rejects(buildRollbackCandidate({ priorCandidateRoot: first.candidateRoot, history: await readCurrentHistory(deploymentRoot), outputRoot: path.join(root, 'candidate-retired') }));
await writeFile(path.join(sourceRoot, 'note.md'), note('Restored stale source'));
await assert.rejects(build('candidate-resurrection', await readCurrentHistory(deploymentRoot)));
// Publish a new identity after withdrawal; the runtime probes the current accepted artifact.
await writeFile(path.join(sourceRoot, 'note.md'), note('Current owner Memo after withdrawal.').replace('m_fixture_owner', 'm_fixture_fresh'));
const finalCandidate = await build('candidate-current', await readCurrentHistory(deploymentRoot));
await promoteCandidate({ deploymentRoot, candidateRoot: finalCandidate.candidateRoot, expectedBase: finalCandidate.receipt.expectedBase });
assert.deepEqual(await inventory(blog), newBlog);
assert.equal((await readCurrentHistory(deploymentRoot)).digest, finalCandidate.receipt.digest);
process.stdout.write(`${JSON.stringify({ candidateRoot: finalCandidate.candidateRoot, blogPublicRoot: path.join(blog, 'release-two') })}\n`);
