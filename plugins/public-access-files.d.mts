import type { PluginAccess } from './public-access.mjs';
export function readPluginAccess(root: string): Promise<PluginAccess>;
export function writePluginAccess(root: string, access: unknown): Promise<PluginAccess>;
