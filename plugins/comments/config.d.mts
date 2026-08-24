export interface CommentsActivationConfig {
  readonly enabled: boolean;
  readonly configPath: string;
}

export interface CommentsPublicConfig {
  readonly writeOrigin: string | null;
  readonly exportPath: string;
  readonly consentVersion: string;
}

export interface CommentsSmtpOptions {
  readonly host?: string;
  readonly port?: number;
  readonly secure?: boolean;
  readonly user?: string;
  readonly from?: string;
  readonly fromName?: string;
  readonly passwordEnv?: string;
  readonly publicOrigin?: string | null;
  readonly connectionTimeoutMs?: number;
  readonly commandTimeoutMs?: number;
}

export interface CommentsRuntimeOptions {
  readonly postRoutes: readonly string[];
  readonly allowedOrigins: readonly string[];
  readonly publicOrigin: string | null;
  readonly dataRoot: string | null;
  readonly databasePath: string | null;
  readonly smtp: Readonly<CommentsSmtpOptions> | null;
  readonly outboxPath: string | null;
  readonly outboxStatePath: string | null;
}

export interface CommentsConfig {
  readonly public: CommentsPublicConfig;
  readonly runtime: CommentsRuntimeOptions;
}

export interface LegacyCommentsNamespace extends CommentsConfig {
  readonly activation: CommentsActivationConfig;
  readonly public: CommentsPublicConfig & { readonly enabled: boolean };
}

export interface ResolvedCommentsRuntimeOptions extends CommentsConfig {
  readonly smtpEnvironment: Readonly<Record<string, string | undefined>>;
}

export const DEFAULT_COMMENTS_CONFIG_PATH: string;

export function isCanonicalCommentsPostRoute(value: unknown): value is string;
export function parseCommentsActivation(value: unknown, source?: string): CommentsActivationConfig;
export function parseCommentsConfig(value: unknown, source?: string, options?: { readonly enabled?: boolean }): CommentsConfig;
export function parseCommentsNamespace(value: unknown, source?: string): CommentsConfig | LegacyCommentsNamespace;
export function resolveCommentsConfigPath(configPath?: string, repositoryRoot?: string): string;
export function resolveCommentsRuntimeOptions(
  value: unknown,
  env?: Readonly<Record<string, string | undefined>>,
  source?: string
): ResolvedCommentsRuntimeOptions | (LegacyCommentsNamespace & { readonly smtpEnvironment: Readonly<Record<string, string | undefined>> });
