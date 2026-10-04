import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createPublicExport, serializePublicExport } from '../../../plugins/memos/public.mjs';

export const repositoryRoot = path.resolve(import.meta.dirname, '../../..');
export const siteRoot = path.join(repositoryRoot, 'apps/site');
export const memoFixtureRoot = path.join(siteRoot, 'test-results/memos-fixture');
export const privateSentinels = ['memo-private-mailbox@example.invalid', 'memo-private-smtp.invalid', 'memo-private-data', 'MEMO_FIXTURE_TOKEN'];
export const fixtureMemos = [
  { id: 'm_fixture_new', displayName: '<b>Reader 😀</b>', body: `<script>memoHostile()</script> & plain text\nSecond line 😀\n${'longword'.repeat(160)}`, createdAt: '2026-10-03T12:00:00.000Z' },
  { id: 'm_fixture_old', displayName: 'Older reader', body: 'Older public note.', createdAt: '2026-10-02T12:00:00.000Z' }
];
export function memoExport(memos = fixtureMemos) {
  return createPublicExport({ schemaVersion: 1, sourceRevision: 'memo-site-fixture', generatedAt: '2026-10-04T00:00:00.000Z', tombstoneEpoch: 2, memos });
}
export async function prepareMemoFixture(root = memoFixtureRoot, { enabled = true, memos = fixtureMemos } = {}) {
  await mkdir(path.join(root, 'config'), { recursive: true });
  const prefix = path.relative(repositoryRoot, root);
  const configPath = path.join(root, 'config/site.toml');
  const exportPath = path.join(root, 'memos.json');
  const pluginPath = path.join(root, 'memos.toml');
  const siteConfig = await readFile(path.join(repositoryRoot, 'config/site.toml.example'), 'utf8');
  await writeFile(configPath, siteConfig.replace('language = "en"', 'language = "en"\nurl = "https://site.fixture.invalid"')
    .replace(/(\[plugins\.memos\][\s\S]*?enabled = )false/u, `$1${enabled}`)
    .replace('configPath = "config/plugins/memos/config.toml"', 'configPath = "memos.toml"'));
  await writeFile(pluginPath, `[public]\nwriteOrigin = "https://site.fixture.invalid"\nexportPath = "${prefix}/memos.json"\nconsentVersion = "memo-fixture-v1"\n\n[runtime]\nallowedOrigins = ["https://site.fixture.invalid"]\ndataRoot = "${privateSentinels[2]}"\n[runtime.smtp]\nhost = "${privateSentinels[1]}"\nuser = "fixture"\nfrom = "${privateSentinels[0]}"\n[runtime.secretEnv]\nadminToken = "${privateSentinels[3]}"\n`);
  await writeFile(exportPath, serializePublicExport(memoExport(memos)));
  return { root, configPath, exportPath, pluginPath, configRelative: path.relative(repositoryRoot, configPath), exportRelative: path.relative(repositoryRoot, exportPath) };
}
