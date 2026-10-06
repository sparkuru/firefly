import { fileURLToPath } from 'node:url';
import { pluginAccessFromConfig } from '../../../../plugins/public-access.mjs';
import { writePluginAccess } from '../../../../plugins/public-access-files.mjs';
import { SITE_CONFIG } from '../lib/site-config.mjs';

export function createPluginAccessIntegration(config = SITE_CONFIG) {
  const access = pluginAccessFromConfig(config);
  return {
    name: 'firefly-plugin-public-access',
    hooks: {
      'astro:build:done': async ({ dir }) => { await writePluginAccess(fileURLToPath(dir), access); }
    }
  };
}
