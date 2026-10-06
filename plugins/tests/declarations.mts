import {
  decodePluginAccess, enabledMarkerPaths, pluginAccessFromConfig, pluginForPublicPath,
  PLUGIN_IDS, PLUGIN_PUBLIC_ROUTES, serializePluginAccess, type PluginAccess, type PluginId
} from '../public-access.mjs';
import { readPluginAccess, writePluginAccess } from '../public-access-files.mjs';

const access: PluginAccess = decodePluginAccess({});
const projected: PluginAccess = pluginAccessFromConfig({});
const markerPaths: readonly string[] = enabledMarkerPaths(projected);
const serialized: string = serializePluginAccess(access);
const plugin: PluginId | null = pluginForPublicPath('/memos/');
const ids: readonly PluginId[] = PLUGIN_IDS;
const routes: readonly { pluginId: PluginId; exact: string; prefix: string }[] = PLUGIN_PUBLIC_ROUTES;
const loaded: Promise<PluginAccess> = readPluginAccess('/release');
const written: Promise<PluginAccess> = writePluginAccess('/release', access);
void [markerPaths, serialized, plugin, ids, routes, loaded, written];
