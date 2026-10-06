import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
export const siteRoot = path.resolve(import.meta.dirname, '..');
export const repositoryRoot = path.resolve(siteRoot, '../..');
export const memoFixtureRoot = path.join(repositoryRoot, '.firefly/memos/browser-fixture');
export const privateSentinels = ['MEMO_FIXTURE_PRIVATE_INPUT'];
export async function prepareMemoFixture(root = memoFixtureRoot, { enabled = true } = {}) {
  await mkdir(path.join(root, 'config'), { recursive: true });
  const configPath = path.join(root, 'config/site.toml');
  const pluginPath = path.join(root, 'config/missing-memos.toml');
  const source = await readFile(path.join(repositoryRoot, 'config/site.toml.example'), 'utf8');
  await writeFile(configPath, source.replace('# url = "https://notes.example.com"', 'url = "https://site.fixture.invalid"')
    .replace(/(\[plugins\.memos\][\s\S]*?enabled = )false/u, `$1${enabled}`)
    .replace('configPath = "config/plugins/memos/config.toml"', 'configPath = "config/missing-memos.toml"'));
  await rm(pluginPath, { force: true });
  return { root, configPath, pluginPath, configRelative: path.relative(repositoryRoot, configPath) };
}
