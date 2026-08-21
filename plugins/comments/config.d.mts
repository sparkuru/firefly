export interface CommentsPublicConfig {
  readonly enabled: boolean;
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
  readonly smtp: Readonly<CommentsSmtpOptions> | null;
  readonly outboxPath: string | null;
  readonly outboxStatePath: string | null;
}

export interface CommentsNamespace {
  readonly public: CommentsPublicConfig;
  readonly runtime: CommentsRuntimeOptions;
}

export interface ResolvedCommentsRuntimeOptions extends CommentsNamespace {
  readonly smtpEnvironment: Readonly<Record<string, string | undefined>>;
}

export function parseCommentsNamespace(value: unknown, source?: string): CommentsNamespace;
export function resolveCommentsRuntimeOptions(
  value: unknown,
  env?: Readonly<Record<string, string | undefined>>,
  source?: string
): ResolvedCommentsRuntimeOptions;
