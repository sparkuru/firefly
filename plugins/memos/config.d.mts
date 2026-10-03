export interface MemosActivationConfig {
  readonly enabled: boolean;
  readonly configPath: string;
}
export interface MemosPublicConfig {
  readonly writeOrigin: string | null;
  readonly exportPath: string;
  readonly consentVersion: string;
}
export interface MemosRuntimeConfig {
  readonly allowedOrigins: readonly string[];
  readonly publicOrigin: string | null;
  readonly dataRoot: string | null;
  readonly databasePath: string | null;
  readonly outboxPath: string | null;
  readonly secretEnv: Readonly<{ smtpPassword?: string; adminToken?: string; tokenKey?: string }>;
}
export interface MemosConfig {
  readonly public: MemosPublicConfig;
  readonly runtime: MemosRuntimeConfig;
}
export const DEFAULT_MEMOS_CONFIG_PATH: string;
export function parseMemosActivation(value?: unknown, source?: string): MemosActivationConfig;
export function parseMemosConfig(value?: unknown, source?: string, options?: { readonly enabled?: boolean }): MemosConfig;
export function parseMemosPublicConfig(value?: unknown, source?: string, options?: { readonly enabled?: boolean }): MemosPublicConfig;
/** Lexical resolution only; filesystem consumers must verify realpath containment and reject symlinks. */
export function resolveMemosConfigPath(configPath?: string, repositoryRoot?: string): string;
