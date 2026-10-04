import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { prepareMemoFixture, repositoryRoot, siteRoot } from '../tests/memos-fixture.mjs';

export function buildMemoFixture(fixture, outputRoot, overrides = {}) {
  const env = { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', FIREFLY_CONTENT_ROOT: path.join(repositoryRoot, 'content'), FIREFLY_SITE_CONFIG_PATH: fixture.configRelative, FIREFLY_MEMOS_EXPORT: fixture.exportRelative, ...overrides };
  const gate = spawnSync(process.execPath, ['scripts/validate-memos-build.mjs'], { cwd: siteRoot, env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (gate.status !== 0) return gate;
  return spawnSync('npm', ['run', 'astro', '--', 'build', '--force', '--outDir', outputRoot], { cwd: siteRoot, env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
}

if (process.argv[1] === import.meta.filename) {
  const fixture = await prepareMemoFixture();
  const result = buildMemoFixture(fixture, path.join(fixture.root, 'enabled'));
  if (result.status !== 0) {
    process.stderr.write(`${result.stdout ?? ''}\n${result.stderr ?? ''}`);
    process.exitCode = 1;
  } else process.stdout.write('[memos-fixture] built prevalidated static output\n');
}
