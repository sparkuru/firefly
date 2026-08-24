import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse as parseToml } from 'smol-toml';

type CommentsConfigModule = typeof import('../../../plugins/comments/config.mjs');
import type {
  CommentsActivationConfig,
  CommentsPublicConfig,
  CommentsRuntimeOptions
} from '../../../plugins/comments/config.mjs';

const configuredPluginPath = process.env.COMMENTS_PLUGIN_CONFIG_PATH?.trim();
const pluginConfigPath = configuredPluginPath === undefined || configuredPluginPath.length === 0
  ? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../plugins/comments/config.mjs')
  : path.resolve(process.cwd(), configuredPluginPath);
const {
  DEFAULT_COMMENTS_CONFIG_PATH,
  parseCommentsActivation,
  parseCommentsConfig,
  parseCommentsNamespace,
  resolveCommentsConfigPath,
  resolveCommentsRuntimeOptions
} = await import(pathToFileURL(pluginConfigPath).href) as CommentsConfigModule;

export interface CommentsRuntimeConfig {
  readonly configPath: string | null;
  readonly siteConfigPath: string | null;
  readonly activation: CommentsActivationConfig;
  readonly public: CommentsPublicConfig;
  readonly runtime: CommentsRuntimeOptions;
  readonly outboxPath: string | null;
  readonly outboxStatePath: string | null;
  readonly environment: NodeJS.ProcessEnv;
}

export const DEFAULT_COMMENTS_SITE_CONFIG_PATH = path.resolve(process.cwd(), 'config/site.toml');
export const DEFAULT_COMMENTS_SECRETS_FILE = path.resolve(process.cwd(), 'config/plugins/comments/secrets.env');

const environmentNamePattern = /^[A-Z_][A-Z0-9_]*$/u;
const dotenvControlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const knownNonSecretNames = new Set([
  'COMMENTS_SITE_CONFIG_PATH',
  'COMMENTS_CONFIG_PATH',
  'COMMENTS_PLUGIN_CONFIG_PATH',
  'COMMENTS_POST_ROUTES',
  'COMMENTS_ALLOWED_ORIGINS',
  'COMMENTS_SMTP_HOST',
  'COMMENTS_SMTP_PORT',
  'COMMENTS_SMTP_SECURE',
  'COMMENTS_SMTP_USER',
  'COMMENTS_SMTP_FROM',
  'COMMENTS_SMTP_FROM_NAME',
  'COMMENTS_SMTP_CONNECT_TIMEOUT_MS',
  'COMMENTS_SMTP_COMMAND_TIMEOUT_MS',
  'COMMENTS_PUBLIC_ORIGIN',
  'COMMENTS_DATA_ROOT',
  'COMMENTS_DATABASE_PATH',
  'COMMENTS_OUTBOX_PATH',
  'COMMENTS_OUTBOX_STATE_PATH',
  'COMMENTS_CONSENT_VERSION'
]);

export function parseCommentsSecrets(source: string, sourceName = 'config/plugins/comments/secrets.env'): Readonly<Record<string, string>> {
  const values: Record<string, string> = {};
  for (const [index, originalLine] of source.split('\n').entries()) {
    const lineNumber = index + 1;
    const line = originalLine.endsWith('\r') ? originalLine.slice(0, -1) : originalLine;
    if (line.trim().length === 0 || line.trimStart().startsWith('#')) continue;
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/u);
    if (!match?.[1] || match[2] === undefined || !environmentNamePattern.test(match[1])) {
      throw new Error(`Invalid comments secrets entry at ${sourceName}:${lineNumber}.`);
    }
    if (knownNonSecretNames.has(match[1])) {
      throw new Error(`Non-secret comments setting ${match[1]} must be configured in config/plugins/comments/config.toml.`);
    }
    if (Object.hasOwn(values, match[1])) {
      throw new Error(`Duplicate comments secrets key at ${sourceName}:${lineNumber}.`);
    }
    if (dotenvControlCharacters.test(match[2])) {
      throw new Error(`Invalid comments secrets value at ${sourceName}:${lineNumber}.`);
    }
    values[match[1]] = match[2];
  }
  return Object.freeze(values);
}

export function loadCommentsSecrets(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const configured = env.COMMENTS_SECRETS_FILE?.trim();
  const defaultFileAllowed = env === process.env;
  const secretsPath = configured === undefined || configured.length === 0
    ? (defaultFileAllowed && existsSync(DEFAULT_COMMENTS_SECRETS_FILE) ? DEFAULT_COMMENTS_SECRETS_FILE : null)
    : path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
  if (secretsPath === null) return { ...env };
  let stats;
  try {
    stats = lstatSync(secretsPath);
  } catch {
    throw new Error(`Unable to read comments secrets file at ${secretsPath}.`);
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new Error(`Comments secrets file must be a regular file at ${secretsPath}.`);
  }
  if ((stats.mode & 0o077) !== 0 || (stats.mode & 0o400) === 0) {
    throw new Error(`Comments secrets file permissions are too broad at ${secretsPath}.`);
  }
  let source;
  try {
    source = readFileSync(secretsPath, 'utf8');
  } catch {
    throw new Error(`Unable to read comments secrets file at ${secretsPath}.`);
  }
  const fileValues = parseCommentsSecrets(source, secretsPath);
  return { ...fileValues, ...env };
}

function pathCandidates(env: NodeJS.ProcessEnv): readonly string[] {
  const configured = env.COMMENTS_SITE_CONFIG_PATH?.trim();
  const candidates = [
    ...(configured === undefined || configured.length === 0 ? [] : [path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured)]),
    path.resolve(process.cwd(), 'config/site.toml'),
    path.resolve(process.cwd(), '../../config/site.toml'),
    path.resolve(process.cwd(), '../../../config/site.toml')
  ];
  return [...new Set(candidates)];
}

function resolveSiteConfigPath(env: NodeJS.ProcessEnv): string | null {
  const configured = env.COMMENTS_SITE_CONFIG_PATH?.trim();
  const configuredPath = configured === undefined || configured.length === 0
    ? null
    : path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
  if (configuredPath !== null && !existsSync(configuredPath)) {
    throw new Error(`Unable to read comments site configuration at ${configuredPath}.`);
  }
  return pathCandidates(env).find((candidate) => existsSync(candidate)) ?? null;
}

function readTomlFile(filePath: string): Record<string, unknown> {
  let source;
  try {
    source = readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Unable to read comments configuration at ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  try {
    return parseToml(source) as Record<string, unknown>;
  } catch (error) {
    throw new Error(`Invalid TOML in ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function repositoryRootForSiteConfig(filePath: string): string {
  const resolved = path.resolve(filePath);
  return path.basename(path.dirname(resolved)) === 'config'
    ? path.dirname(path.dirname(resolved))
    : path.resolve(process.cwd());
}

function assertPrivateConfigFile(filePath: string, repositoryRoot: string): void {
  const stats = lstatSync(filePath);
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error('comments configuration must be a regular file.');
  const resolved = realpathSync(filePath);
  const relative = path.relative(repositoryRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('comments configuration resolves outside the repository root.');
}

interface RuntimeSource {
  readonly configPath: string | null;
  readonly siteConfigPath: string | null;
  readonly activation: CommentsActivationConfig;
  readonly value: unknown;
}

function legacyActivation(value: ReturnType<typeof parseCommentsNamespace>, source: string): CommentsActivationConfig {
  if (!('activation' in value)) {
    throw new Error(`Invalid legacy comments configuration in ${source}: activation is missing.`);
  }
  return value.activation;
}

function sourceFromSiteConfig(siteConfigPath: string): RuntimeSource {
  const siteValue = readTomlFile(siteConfigPath);
  const rawPlugins = siteValue.plugins;
  if (rawPlugins !== undefined && (rawPlugins === null || typeof rawPlugins !== 'object' || Array.isArray(rawPlugins))) {
    throw new Error(`Invalid comments configuration in ${siteConfigPath}: plugins must be a plain object.`);
  }
  const pluginValue = rawPlugins && Object.hasOwn(rawPlugins, 'comments') ? (rawPlugins as Record<string, unknown>).comments : undefined;
  if (rawPlugins !== undefined && pluginValue === undefined && Object.keys(rawPlugins as object).length > 0) {
    throw new Error(`Invalid comments configuration in ${siteConfigPath}: plugins must declare comments.`);
  }
  if (siteValue.comments !== undefined && rawPlugins !== undefined) {
    throw new Error(`Invalid comments configuration in ${siteConfigPath}: the legacy [comments] namespace cannot be combined with [plugins.comments].`);
  }
  if (siteValue.comments !== undefined) {
    const legacy = parseCommentsNamespace(siteValue.comments, siteConfigPath);
    return { configPath: siteConfigPath, siteConfigPath, activation: legacyActivation(legacy, siteConfigPath), value: siteValue.comments };
  }
  const activation = parseCommentsActivation(pluginValue, siteConfigPath);
  const repositoryRoot = repositoryRootForSiteConfig(siteConfigPath);
  const configPath = resolveCommentsConfigPath(activation.configPath, repositoryRoot);
  if (!existsSync(configPath)) {
    if (activation.enabled) throw new Error(`Comments plugin configuration is required at ${configPath} when the plugin is enabled.`);
    return { configPath, siteConfigPath, activation, value: {} };
  }
  try {
    assertPrivateConfigFile(configPath, repositoryRoot);
  } catch (error) {
    throw new Error(`Unable to use comments plugin configuration at ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  return { configPath, siteConfigPath, activation, value: readTomlFile(configPath) };
}

function sourceFromExplicitConfig(configPath: string): RuntimeSource {
  const value = readTomlFile(configPath);
  if (value.comments !== undefined && value.public === undefined && value.runtime === undefined) {
    const legacy = parseCommentsNamespace(value.comments, configPath);
    return { configPath, siteConfigPath: configPath, activation: legacyActivation(legacy, configPath), value: value.comments };
  }
  return {
    configPath,
    siteConfigPath: null,
    activation: parseCommentsActivation(undefined, configPath),
    value
  };
}

function resolveRuntimeSource(env: NodeJS.ProcessEnv): RuntimeSource {
  const configured = env.COMMENTS_CONFIG_PATH?.trim();
  if (configured !== undefined && configured.length > 0) {
    const configPath = path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
    if (!existsSync(configPath)) throw new Error(`Unable to read comments configuration at ${configPath}.`);
    return sourceFromExplicitConfig(configPath);
  }
  const siteConfigPath = resolveSiteConfigPath(env);
  if (siteConfigPath !== null) return sourceFromSiteConfig(siteConfigPath);
  const configPath = path.resolve(process.cwd(), DEFAULT_COMMENTS_CONFIG_PATH);
  return existsSync(configPath)
    ? sourceFromExplicitConfig(configPath)
    : { configPath, siteConfigPath: null, activation: parseCommentsActivation(undefined, configPath), value: {} };
}

export function loadCommentsRuntimeConfig(env: NodeJS.ProcessEnv = process.env): CommentsRuntimeConfig {
  const runtimeEnvironment = loadCommentsSecrets(env);
  const source = resolveRuntimeSource(env);
  const resolved = resolveCommentsRuntimeOptions(source.value, runtimeEnvironment, source.configPath ?? 'environment');
  const outboxPath = resolved.smtpEnvironment.COMMENTS_OUTBOX_PATH?.trim() || null;
  const outboxStatePath = resolved.smtpEnvironment.COMMENTS_OUTBOX_STATE_PATH?.trim() || null;
  return Object.freeze({
    configPath: source.configPath,
    siteConfigPath: source.siteConfigPath,
    activation: source.activation,
    public: resolved.public,
    runtime: resolved.runtime,
    outboxPath,
    outboxStatePath,
    environment: resolved.smtpEnvironment
  });
}
