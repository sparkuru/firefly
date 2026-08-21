import { existsSync, lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse as parseToml } from 'smol-toml';

type CommentsConfigModule = typeof import('../../../plugins/comments/config.mjs');

const configuredPluginPath = process.env.COMMENTS_PLUGIN_CONFIG_PATH?.trim();
const pluginConfigPath = configuredPluginPath === undefined || configuredPluginPath.length === 0
  ? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../plugins/comments/config.mjs')
  : path.resolve(process.cwd(), configuredPluginPath);
const { resolveCommentsRuntimeOptions } = await import(pathToFileURL(pluginConfigPath).href) as CommentsConfigModule;

export interface CommentsRuntimeConfig {
  readonly configPath: string | null;
  readonly outboxPath: string | null;
  readonly outboxStatePath: string | null;
  readonly environment: NodeJS.ProcessEnv;
}

export const DEFAULT_COMMENTS_SECRETS_FILE = path.resolve(process.cwd(), 'config/secrets.env');

const environmentNamePattern = /^[A-Z_][A-Z0-9_]*$/u;
const dotenvControlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;

export function parseCommentsSecrets(source: string, sourceName = 'config/secrets.env'): Readonly<Record<string, string>> {
  const values: Record<string, string> = {};
  for (const [index, originalLine] of source.split('\n').entries()) {
    const lineNumber = index + 1;
    const line = originalLine.endsWith('\r') ? originalLine.slice(0, -1) : originalLine;
    if (line.trim().length === 0 || line.trimStart().startsWith('#')) continue;
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/u);
    if (!match?.[1] || match[2] === undefined || !environmentNamePattern.test(match[1])) {
      throw new Error(`Invalid comments secrets entry at ${sourceName}:${lineNumber}.`);
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
  const secretsPath = configured === undefined || configured.length === 0
    ? (existsSync(DEFAULT_COMMENTS_SECRETS_FILE) ? DEFAULT_COMMENTS_SECRETS_FILE : null)
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

function configCandidates(env: NodeJS.ProcessEnv): readonly string[] {
  const configured = env.COMMENTS_CONFIG_PATH?.trim();
  const candidates = [
    ...(configured === undefined || configured.length === 0 ? [] : [path.resolve(process.cwd(), configured)]),
    path.resolve(process.cwd(), 'config/site.toml'),
    path.resolve(process.cwd(), '../../config/site.toml'),
    path.resolve(process.cwd(), '../../../config/site.toml')
  ];
  return [...new Set(candidates)];
}

function resolveConfigPath(env: NodeJS.ProcessEnv): string | null {
  const candidates = configCandidates(env);
  const configured = env.COMMENTS_CONFIG_PATH?.trim();
  const configuredPath = configured === undefined || configured.length === 0 ? null : path.resolve(process.cwd(), configured);
  if (configuredPath !== null && !existsSync(configuredPath)) {
    throw new Error(`Unable to read comments configuration at ${configuredPath}.`);
  }
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function readCommentsNamespace(configPath: string | null): unknown {
  if (configPath === null) return undefined;
  let source;
  try {
    source = readFileSync(configPath, 'utf8');
  } catch (error) {
    throw new Error(`Unable to read comments configuration at ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  let value;
  try {
    value = parseToml(source) as Record<string, unknown>;
  } catch (error) {
    throw new Error(`Invalid TOML in ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  return value.comments;
}

export function loadCommentsRuntimeConfig(env: NodeJS.ProcessEnv = process.env): CommentsRuntimeConfig {
  const runtimeEnvironment = loadCommentsSecrets(env);
  const configPath = resolveConfigPath(env);
  const resolved = resolveCommentsRuntimeOptions(readCommentsNamespace(configPath), runtimeEnvironment, configPath ?? 'environment');
  const outboxPath = resolved.smtpEnvironment.COMMENTS_OUTBOX_PATH?.trim() || null;
  const outboxStatePath = resolved.smtpEnvironment.COMMENTS_OUTBOX_STATE_PATH?.trim() || null;
  return Object.freeze({
    configPath,
    outboxPath,
    outboxStatePath,
    environment: resolved.smtpEnvironment
  });
}
