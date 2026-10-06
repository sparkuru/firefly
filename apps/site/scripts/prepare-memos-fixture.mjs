import { spawnSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildCandidate } from '../../../tooling/publish-memos/src/index.mjs';
import { prepareMemoFixture, repositoryRoot, siteRoot } from '../tests/memos-fixture.mjs';
export function buildMemoFixture(fixture, outputRoot, overrides = {}) {
  const env = { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', FIREFLY_CONTENT_ROOT: path.join(repositoryRoot, 'content'), FIREFLY_SITE_CONFIG_PATH: fixture.configRelative, ...overrides };
  return spawnSync('npm', ['run', 'astro', '--', 'build', '--force', '--outDir', outputRoot], { cwd: siteRoot, env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
}
if (process.argv[1] === import.meta.filename) {
  const fixture = await prepareMemoFixture();
  const output = path.join(fixture.root, 'blog');
  await rm(output, { recursive: true, force: true });
  const result = buildMemoFixture(fixture, output);
  if (result.status !== 0) { process.stderr.write(`${result.stdout ?? ''}\n${result.stderr ?? ''}`); process.exitCode = 1; }
  else {
    const sourceRoot = path.join(fixture.root, 'owner-source');
    await mkdir(path.join(sourceRoot, 'assets'), { recursive: true });
    const body = `Owner **Markdown** with a [Blog](/posts/) link.\n\n- First list item\n- Second list item\n\n\`\`\`text\n${'longcode'.repeat(55)}\n\`\`\`\n\n| Column | Another column |\n| --- | --- |\n| ${'longword'.repeat(50)} | Cell |\n\n![Synthetic pixel](assets/%E5%9B%BE%E5%83%8F.png)\n\n<script>memoHostile()</script>`;
    await writeFile(path.join(sourceRoot, 'note.md'), `---\nid: m_fixture_owner\ncreatedAt: 2026-10-06T00:00:00.000Z\ndraft: false\n---\n${body}\n`);
    await writeFile(path.join(sourceRoot, 'assets/图像.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64'));
    await writeFile(path.join(sourceRoot, 'draft.md'), '---\nid: m_fixture_draft\ncreatedAt: 2026-10-06T00:00:00.000Z\ndraft: true\n---\nPrivate draft');
    for (const name of ['memo', 'empty']) await rm(path.join(fixture.root, name), { recursive: true, force: true });
    await buildCandidate({ sourceRoot, outputRoot: path.join(fixture.root, 'memo'), displayName: 'Fixture Owner' });
    const emptySource = path.join(fixture.root, 'empty-source');
    await mkdir(emptySource, { recursive: true });
    await buildCandidate({ sourceRoot: emptySource, outputRoot: path.join(fixture.root, 'empty'), displayName: 'Fixture Owner' });
    process.stdout.write('[memos-fixture] built independent prevalidated static Memo and blog output\n');
  }
}
