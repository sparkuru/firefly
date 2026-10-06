import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readPluginAccess, writePluginAccess } from '../public-access-files.mjs';

const state = (comments = false, memos = false) => ({ schemaVersion: 1, plugins: { comments: { enabled: comments }, memos: { enabled: memos } } });
async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), 'firefly-plugin-access-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test('on/off/on emission removes only validated stale markers and preserves ordinary bytes', async (context) => {
  const root = await fixture(context);
  await writeFile(path.join(root, 'index.html'), 'ordinary blog');
  for (const value of [state(true, true), state(), state(false, true), state(true, false), state(true, true)]) {
    await writePluginAccess(root, value);
    assert.deepEqual(await readPluginAccess(root), value);
    assert.equal(await readFile(path.join(root, 'index.html'), 'utf8'), 'ordinary blog');
    assert.deepEqual((await readdir(root)).sort(), (value.plugins.comments.enabled || value.plugins.memos.enabled ? ['index.html', 'plugin-access', 'plugins.public.v1.json'] : ['index.html', 'plugins.public.v1.json']).sort());
  }
});

test('missing activation and contradictory positive markers fail closed', async (context) => {
  const root = await fixture(context);
  await assert.rejects(readPluginAccess(root), /rebuild/u);
  await writePluginAccess(root, state());
  await mkdir(path.join(root, 'plugin-access'));
  await writeFile(path.join(root, 'plugin-access/memos.enabled'), 'enabled\n');
  await assert.rejects(readPluginAccess(root), /disagree/u);
  await assert.rejects(writePluginAccess(root, state(true)), /disagree/u);
  assert.equal(await readFile(path.join(root, 'plugin-access/memos.enabled'), 'utf8'), 'enabled\n');
});

test('unexpected, malformed and symlink markers are rejected before emission', async (context) => {
  for (const variant of ['extra', 'contents', 'symlink', 'directory']) {
    const root = await fixture(context);
    await writePluginAccess(root, state(true));
    const marker = path.join(root, 'plugin-access/comments.enabled');
    if (variant === 'extra') await writeFile(path.join(root, 'plugin-access/private.txt'), 'must retain');
    if (variant === 'contents') await writeFile(marker, 'false\n');
    if (variant === 'symlink') { await rm(marker); await symlink('../index.html', marker); }
    if (variant === 'directory') { await rm(marker); await mkdir(marker); }
    await assert.rejects(readPluginAccess(root));
    await assert.rejects(writePluginAccess(root, state()));
    if (variant === 'extra') assert.equal(await readFile(path.join(root, 'plugin-access/private.txt'), 'utf8'), 'must retain');
  }
});

test('reserved collisions and symlink roots/snapshots cannot clobber user files', async (context) => {
  const root = await fixture(context);
  await mkdir(path.join(root, 'plugin-access'));
  await writeFile(path.join(root, 'plugin-access/user.txt'), 'retained');
  await assert.rejects(writePluginAccess(root, state()), /Reserved/u);
  assert.equal(await readFile(path.join(root, 'plugin-access/user.txt'), 'utf8'), 'retained');
  const another = await fixture(context);
  await writeFile(path.join(another, 'user.txt'), 'retained');
  await symlink('user.txt', path.join(another, 'plugins.public.v1.json'));
  await assert.rejects(writePluginAccess(another, state()), /snapshot/u);
  assert.equal(await readFile(path.join(another, 'user.txt'), 'utf8'), 'retained');
  await symlink(another, path.join(root, 'linked-root'));
  await assert.rejects(readPluginAccess(path.join(root, 'linked-root')), /canonical/u);
});

test('empty stale marker directories and oversized snapshots are invalid', async (context) => {
  const root = await fixture(context);
  await writePluginAccess(root, state());
  await mkdir(path.join(root, 'plugin-access'));
  await assert.rejects(readPluginAccess(root), /Empty/u);
  await assert.rejects(writePluginAccess(root, state(true)), /Empty/u);
  const another = await fixture(context);
  await writeFile(path.join(another, 'plugins.public.v1.json'), `${JSON.stringify(state())}${' '.repeat(4096)}`);
  await assert.rejects(readPluginAccess(another), /snapshot/u);
});

test('public activation modes are exact under a private umask without changing unrelated files', async (context) => {
  const root = await fixture(context);
  const originalMask = process.umask(0o077);
  try {
    await writeFile(path.join(root, 'private.txt'), 'retained private data');
    const rootMode = (await stat(root)).mode & 0o777;
    for (const value of [state(true, true), state(), state(false, true)]) {
      await writePluginAccess(root, value);
      assert.deepEqual(await readPluginAccess(root), value);
      assert.equal((await stat(path.join(root, 'plugins.public.v1.json'))).mode & 0o777, 0o644);
      for (const id of ['comments', 'memos']) if (value.plugins[id].enabled) {
        assert.equal((await stat(path.join(root, 'plugin-access'))).mode & 0o777, 0o755);
        assert.equal((await stat(path.join(root, `plugin-access/${id}.enabled`))).mode & 0o777, 0o644);
      }
      assert.equal((await stat(root)).mode & 0o777, rootMode);
      assert.equal((await stat(path.join(root, 'private.txt'))).mode & 0o777, 0o600);
      assert.equal(await readFile(path.join(root, 'private.txt'), 'utf8'), 'retained private data');
    }
  } finally { process.umask(originalMask); }
});
