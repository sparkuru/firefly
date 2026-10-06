import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { publicationContractRoot } from './memos.js';

export type { PluginAccess } from '../../../../plugins/public-access.mjs';
export const { decodePluginAccess, pluginForPublicPath, enabledMarkerPaths, PLUGIN_ACCESS_PATH, PLUGIN_MARKER_ROOT } = await import(pathToFileURL(path.join(publicationContractRoot, 'plugins/public-access.mjs')).href) as typeof import('../../../../plugins/public-access.mjs');
export const { readPluginAccess } = await import(pathToFileURL(path.join(publicationContractRoot, 'plugins/public-access-files.mjs')).href) as typeof import('../../../../plugins/public-access-files.mjs');
