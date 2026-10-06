export interface MemosActivationConfig { readonly enabled: boolean; readonly configPath: string; }
export interface MemosPublicConfig { readonly route: '/memos/'; }
export interface MemosConfig { readonly public: MemosPublicConfig; }
export const DEFAULT_MEMOS_CONFIG_PATH: string;
export function parseMemosActivation(value?: unknown, source?: string): MemosActivationConfig;
export function parseMemosConfig(value?: unknown, source?: string): MemosConfig;
export function parseMemosPublicConfig(value?: unknown, source?: string): MemosPublicConfig;
/** Filesystem consumers must reject symlinks and enforce containment. */
export function resolveMemosConfigPath(configPath?: string, repositoryRoot?: string): string;
