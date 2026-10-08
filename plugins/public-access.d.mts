export type PluginId = 'comments' | 'memos';
export interface LegacyPluginAccess {
  readonly schemaVersion: 1;
  readonly plugins: Readonly<Record<PluginId, Readonly<{ enabled: boolean }>>>;
}
export interface IntegratedPluginAccess {
  readonly schemaVersion: 2;
  readonly plugins: Readonly<{ comments: Readonly<{ enabled: boolean }> }>;
}
export type PluginAccess = LegacyPluginAccess | IntegratedPluginAccess;
export const PLUGIN_IDS: readonly PluginId[];
export const INTEGRATED_PLUGIN_IDS: readonly 'comments'[];
export const LEGACY_PLUGIN_ACCESS_PATH: 'plugins.public.v1.json';
export const PLUGIN_ACCESS_PATH: 'plugins.public.v2.json';
export const PLUGIN_MARKER_ROOT: 'plugin-access';
export const PLUGIN_ENABLED_MARKER_CONTENTS: 'enabled\n';
export const PLUGIN_PUBLIC_ROUTES: readonly Readonly<{ pluginId: PluginId; exact: string; prefix: string }>[];
export function decodePluginAccess(value: unknown, source?: string): PluginAccess;
export function pluginAccessFromConfig(config: unknown): IntegratedPluginAccess;
export function serializePluginAccess(access: unknown): string;
export function enabledMarkerPaths(access: unknown): readonly string[];
export function pluginForPublicPath(decodedPathname: string, access?: PluginAccess): PluginId | null;
