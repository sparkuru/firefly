import { existsSync, readFileSync } from 'node:fs';
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
  const configPath = resolveConfigPath(env);
  const resolved = resolveCommentsRuntimeOptions(readCommentsNamespace(configPath), env, configPath ?? 'environment');
  const outboxPath = resolved.smtpEnvironment.COMMENTS_OUTBOX_PATH?.trim() || null;
  const outboxStatePath = resolved.smtpEnvironment.COMMENTS_OUTBOX_STATE_PATH?.trim() || null;
  return Object.freeze({
    configPath,
    outboxPath,
    outboxStatePath,
    environment: resolved.smtpEnvironment
  });
}
