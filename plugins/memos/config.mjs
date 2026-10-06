import path from 'node:path';
import { exactObject } from './validation.mjs';

export const DEFAULT_MEMOS_CONFIG_PATH = 'config/plugins/memos/config.toml';
const failure = (source) => (message) => { throw new TypeError(`Invalid memos configuration in ${source}: ${message}`); };

export function parseMemosActivation(value, source = 'config/site.toml') {
  const fail = failure(source);
  const raw = exactObject(value === undefined ? {} : value, ['enabled', 'configPath'], [], fail, 'plugins.memos');
  const enabled = raw.enabled === undefined ? false : raw.enabled;
  if (typeof enabled !== 'boolean') fail('enabled must be boolean.');
  const configPath = raw.configPath === undefined ? DEFAULT_MEMOS_CONFIG_PATH : raw.configPath;
  if (typeof configPath !== 'string' || !configPath.endsWith('.toml') || configPath.split('/').some((segment) => !/^[A-Za-z0-9_-][A-Za-z0-9._-]*$/u.test(segment))) fail('configPath must be a safe repository-relative TOML path without traversal.');
  return Object.freeze({ enabled, configPath });
}

export function parseMemosConfig(value, source = DEFAULT_MEMOS_CONFIG_PATH) {
  const fail = failure(source);
  const raw = exactObject(value === undefined ? {} : value, ['public'], [], fail, 'memos configuration');
  const publicConfig = exactObject(raw.public === undefined ? {} : raw.public, ['route'], [], fail, 'memos.public');
  const route = publicConfig.route === undefined ? '/memos/' : publicConfig.route;
  if (route !== '/memos/') fail('route must be /memos/.');
  return Object.freeze({ public: Object.freeze({ route }) });
}

export function parseMemosPublicConfig(value, source = DEFAULT_MEMOS_CONFIG_PATH) {
  return parseMemosConfig(value, source).public;
}

export function resolveMemosConfigPath(configPath = DEFAULT_MEMOS_CONFIG_PATH, repositoryRoot = process.cwd()) {
  return path.resolve(repositoryRoot, parseMemosActivation({ configPath }).configPath);
}
