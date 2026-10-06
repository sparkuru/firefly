export type PluginId = 'comments' | 'memos';
export interface PluginAccess {
  readonly schemaVersion: 1;
  readonly plugins: Readonly<Record<PluginId, Readonly<{ enabled: boolean }>>>;
}
export const PLUGIN_IDS: readonly PluginId[];
export const PLUGIN_ACCESS_PATH: 'plugins.public.v1.json';
export const PLUGIN_MARKER_ROOT: 'plugin-access';
export const PLUGIN_ENABLED_MARKER_CONTENTS: 'enabled\n';
export const PLUGIN_PUBLIC_ROUTES: readonly Readonly<{ pluginId: PluginId; exact: string; prefix: string }>[];
export function decodePluginAccess(value: unknown, source?: string): PluginAccess;
export function pluginAccessFromConfig(config: unknown): PluginAccess;
export function serializePluginAccess(access: unknown): string;
export function enabledMarkerPaths(access: unknown): readonly string[];
export function pluginForPublicPath(decodedPathname: string): PluginId | null;
