import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, readlink, realpath, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { writePluginAccess } from '../../plugins/public-access-files.mjs';
import { buildCandidate, promoteCandidate } from '../publish-memos/src/index.mjs';

const root = path.resolve(process.argv[2] ?? '');
assert.match(root, /^\/tmp\/firefly-plugin-access\.[A-Za-z0-9]+$/u);
assert.equal(await realpath(root), root);
async function inventory(directory) {
  const entries = {};
  async function visit(current, prefix = '') {
    for (const item of await readdir(current, { withFileTypes: true })) {
      const relative = path.posix.join(prefix, item.name);
      if (relative === 'blog/current' || relative === 'preservation.json') continue;
      if (item.isDirectory()) await visit(path.join(current, item.name), relative);
      else if (item.isSymbolicLink()) entries[relative] = await readlink(path.join(current, item.name));
      else entries[relative] = createHash('sha256').update(await readFile(path.join(current, item.name))).digest('hex');
    }
  }
  await visit(directory);
  return entries;
}
if (process.argv[3] === '--verify') {
  assert.deepEqual(await inventory(root), JSON.parse(await readFile(path.join(root, 'preservation.json'), 'utf8')));
  process.stdout.write('[plugins-runtime] retained source, Memo receipt/pointer and releases remain exact\n');
} else {
  const sourceRoot = path.join(root, 'source');
  await mkdir(path.join(sourceRoot, 'assets'), { recursive: true, mode: 0o755 });
  await writeFile(path.join(sourceRoot, 'assets/pixel.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64'));
  await writeFile(path.join(sourceRoot, 'note.md'), '---\nid: m_plugin_fixture\ncreatedAt: 2026-10-06T00:00:00.000Z\ndraft: false\n---\nRetained **Memo** ![Pixel](assets/pixel.png)\n');
  const candidate = await buildCandidate({ sourceRoot, outputRoot: path.join(root, 'candidates'), displayName: 'Fixture', generatedAt: '2026-10-06T00:00:00.000Z' });
  await promoteCandidate({ candidateRoot: candidate.candidateRoot, deploymentRoot: path.join(root, 'memo-state'), expectedBase: null });
  await writeFile(path.join(root, 'candidate-path.txt'), candidate.candidateRoot);
  for (const comments of [false, true]) for (const memos of [false, true]) {
    const name = `c${Number(comments)}m${Number(memos)}`;
    const release = path.join(root, 'blog', name);
    await mkdir(release, { recursive: true, mode: 0o755 });
    await writePluginAccess(release, { schemaVersion: 1, plugins: { comments: { enabled: comments }, memos: { enabled: memos } } });
    await writeFile(path.join(release, 'index.html'), `<h1>Blog ${name}</h1>${comments ? '<section class="comment-section">Approved fixture</section>' : ''}${memos ? '<a href="/memos/">Memo</a>' : ''}`);
    await writeFile(path.join(release, '404.html'), '<h1>Missing</h1>');
    await mkdir(path.join(release, '_astro'));
    await writeFile(path.join(release, '_astro/fixture.js'), '/* fixture */');
  }
  for (const comments of [false, true]) {
    const release = path.join(root, 'blog', `integrated-c${Number(comments)}`);
    await mkdir(path.join(release, 'pages/memos/m_integrated_fixture'), { recursive: true, mode: 0o755 });
    await mkdir(path.join(release, 'memos'), { mode: 0o755 });
    await writePluginAccess(release, { schemaVersion: 2, plugins: { comments: { enabled: comments } } });
    await writeFile(path.join(release, 'index.html'), '<h1>Integrated site</h1>');
    await writeFile(path.join(release, '404.html'), '<h1>Missing</h1>');
    await writeFile(path.join(release, 'pages/memos/index.html'), '<h1>Integrated Memo timeline</h1>');
    await writeFile(path.join(release, 'pages/memos/m_integrated_fixture/index.html'), '<h1>Integrated Memo detail</h1>');
    await writeFile(path.join(release, 'memos/index.html'), '<a href="/pages/memos/">Integrated Memo compatibility</a>');
  }
  await mkdir(path.join(root, 'blog/legacy'));
  await writeFile(path.join(root, 'blog/legacy/index.html'), '<h1>Legacy</h1>');
  await writeFile(path.join(root, 'blog/legacy/404.html'), '<h1>Missing</h1>');
  await symlink('c1m1', path.join(root, 'blog/current'));
  await writeFile(path.join(root, 'preservation.json'), JSON.stringify(await inventory(root)));
}
