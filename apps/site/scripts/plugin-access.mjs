import path from 'node:path';
import { readPluginAccess } from '../../../plugins/public-access-files.mjs';
import { pluginAccessFromConfig, serializePluginAccess } from '../../../plugins/public-access.mjs';

const repositoryRoot = path.resolve(import.meta.dirname, '../../..');

export async function pluginAccessCommand(args) {
  const [command, ...options] = args;
  if (!['current', 'check', 'compare'].includes(command)) {
    throw new Error('Usage: plugin-access.mjs current | check|compare [--release-root <path>]');
  }
  let releaseRoot = path.join(repositoryRoot, 'dist');
  let expectedCommentsOrigin;
  const seen = new Set();
  for (let index = 0; index < options.length; index += 2) {
    const flag = options[index];
    const value = options[index + 1];
    if (!value || seen.has(flag)) throw new Error('Plugin access options require unique flags and values.');
    seen.add(flag);
    if (flag === '--release-root' && command !== 'current') releaseRoot = path.resolve(repositoryRoot, value);
    else if (flag === '--expected-comments-origin' && command !== 'check') {
      let origin;
      try { origin = new URL(value); } catch { throw new Error('Expected comments origin must be a canonical HTTPS origin.'); }
      if (origin.protocol !== 'https:' || origin.origin !== value || origin.username || origin.password) {
        throw new Error('Expected comments origin must be a canonical HTTPS origin.');
      }
      expectedCommentsOrigin = value;
    } else throw new Error(`Unsupported plugin access option: ${flag}.`);
  }
  const current = async () => {
    const { SITE_CONFIG } = await import('../src/lib/site-config.mjs');
    const projection = pluginAccessFromConfig(SITE_CONFIG);
    if (projection.plugins.comments.enabled && expectedCommentsOrigin !== undefined &&
        SITE_CONFIG.comments.writeOrigin !== expectedCommentsOrigin) {
      throw new Error('Enabled comments write origin is outside this managed deployment; configure the matching gated origin before synchronization.');
    }
    return projection;
  };
  if (command === 'current') return current();
  const access = await readPluginAccess(releaseRoot);
  if (command === 'compare' && serializePluginAccess(access) !== serializePluginAccess(await current())) {
    throw new Error('Built plugin activation differs from current selected site configuration; run sync without --no-build to rebuild.');
  }
  return access;
}

if (process.argv[1] === import.meta.filename) {
  try { process.stdout.write(serializePluginAccess(await pluginAccessCommand(process.argv.slice(2)))); }
  catch (error) { process.stderr.write(`[plugin-access] ${error.message}\n`); process.exitCode = 1; }
}
