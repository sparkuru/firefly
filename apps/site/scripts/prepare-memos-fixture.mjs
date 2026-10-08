import { spawnSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prepareMemoFixture, repositoryRoot, siteRoot } from '../tests/memos-fixture.mjs';

export function buildMemoFixture(fixture, outputRoot, overrides = {}, { force = true } = {}) {
  const env = {
    ...process.env, ASTRO_TELEMETRY_DISABLED: '1',
    FIREFLY_CONTENT_ROOT: fixture.sourceRoot ?? path.join(repositoryRoot, 'content'),
    FIREFLY_SITE_CONFIG_PATH: fixture.configRelative, ...overrides
  };
  return spawnSync('npm', ['run', 'astro', '--', 'build', ...(force ? ['--force'] : []), '--outDir', outputRoot], { cwd: siteRoot, env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
}

export async function prepareMemoDocumentSources(root, { mode = 'full' } = {}) {
  const sourceRoot = path.join(root, 'document-source-' + mode);
  for (const collection of ['posts', 'pages', 'memos/assets']) await mkdir(path.join(sourceRoot, collection), { recursive: true });
  await writeFile(path.join(sourceRoot, 'posts/start.md'), '---\ntitle: Start\ndate: 2026-01-01\ndescription: Ordinary article fixture.\ndraft: false\nlayout: post\n---\nAn ordinary Terminal article.\n');
  if (mode === 'empty') return sourceRoot;
  const write = (filename, id, date, body, extra = '') => writeFile(path.join(sourceRoot, 'memos', filename + '.md'), '---\nid: ' + id + '\ndate: ' + date + '\ndraft: false\n' + extra + '---\n' + body + '\n');
  await write('recent', 'm_fixture_recent', '2026-06-18T01:30:00.000Z', 'A brief entry, fully readable.\nAn intentional second line.\u200b', 'tags: [reading]\nfirefly:\n  markers: [featured]\n');
  if (mode === 'single') return sourceRoot;
  for (let number = 0; number < 16; number += 1) await write('dense-' + String(number).padStart(2, '0'), 'm_fixture_dense_' + String(number).padStart(2, '0'), '2026-06-' + String(17 - number).padStart(2, '0') + 'T01:30:00.000Z', 'A June thought, number ' + number + '.');
  await write('middle', 'm_fixture_middle', '2024-08-04T10:20:00.000Z',
    'A long note with a complete independent reading page.\n\n## Reading\n\n' + 'A thoughtful sentence. '.repeat(65) +
    '\n\n    indented code\n\n```text\n  code indentation\n' + 'longcode'.repeat(80) + '\n```\n\n| Column | Another |\n| --- | --- |\n| ' + 'longword'.repeat(70) + ' | cell |\n\n![Synthetic pixel](/pages/memos/assets/pixel.png)\n\n![Encoded Unicode image](/pages/memos/assets/%E5%9B%BE%E5%83%8F.png)\n\n<script>memoHostile()</script>\n\nThe final line survives in full.',
    'title: A longer note\n');
  await write('old', 'm_fixture_old', '2022-03-21T11:59:13.000Z', 'First verse line\nSecond verse line\n\nA distinct old entry.');
  await write('oldest', 'm_fixture_oldest', '2022-02-01T00:00:00.000Z', 'The earliest thought.');
  await writeFile(path.join(sourceRoot, 'memos/draft.md'), '---\nid: m_fixture_draft\ndate: 2027-12-01T00:00:00.000Z\ndraft: true\n---\nMEMO_FIXTURE_PRIVATE_INPUT draft\n');
  await writeFile(path.join(sourceRoot, 'memos/private.md'), '---\nid: m_fixture_private\ndate: 2027-11-01T00:00:00.000Z\ndraft: false\naccess:\n  visibility: private\n  owner: fixture\n---\nMEMO_FIXTURE_PRIVATE_INPUT private ![private](/pages/memos/assets/orphan.png) ![unfinished](/pages/memos/assets/unavailable.png)\n');
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64');
  await writeFile(path.join(sourceRoot, 'memos/assets/pixel.png'), pixel);
  await writeFile(path.join(sourceRoot, 'memos/assets/orphan.png'), pixel);
  await writeFile(path.join(sourceRoot, 'memos/assets/图像.png'), pixel);
  return sourceRoot;
}

if (process.argv[1] === import.meta.filename) {
  const fixture = await prepareMemoFixture(undefined, { enabled: false });
  for (const mode of ['full', 'empty', 'single']) {
    const sourceRoot = await prepareMemoDocumentSources(fixture.root, { mode });
    const output = path.join(fixture.root, mode === 'full' ? 'blog' : mode);
    await rm(output, { recursive: true, force: true });
    const result = buildMemoFixture({ ...fixture, sourceRoot }, output);
    if (result.status !== 0) {
      process.stderr.write((result.stdout ?? '') + '\n' + (result.stderr ?? ''));
      process.exitCode = 1;
      break;
    }
  }
  if (!process.exitCode) process.stdout.write('[memos-fixture] built integrated public, empty and single-entry document timelines\n');
}
