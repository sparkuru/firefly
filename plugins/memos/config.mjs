import path from 'node:path';
import { denseArray, exactObject } from './validation.mjs';

export const DEFAULT_MEMOS_CONFIG_PATH = 'config/plugins/memos/config.toml';
const PUBLIC_KEYS = ['writeOrigin', 'exportPath', 'consentVersion'];
const RUNTIME_KEYS = ['allowedOrigins', 'publicOrigin', 'dataRoot', 'databasePath', 'outboxPath', 'secretEnv'];

function failure(source) {
  return (message) => { throw new TypeError(`Invalid memos configuration in ${source}: ${message}`); };
}
function safeText(value, fail, label) {
  if (typeof value !== 'string' || !value || value.trim() !== value || value.normalize('NFC') !== value || /[\p{Cc}\p{Cf}\p{Cs}\u2028\u2029]/u.test(value)) fail(`${label} must be safe canonical single-line text.`);
  return value;
}
function safePath(value, fail, label, absolute = false) {
  const result = safeText(value, fail, label);
  const relative = absolute && result.startsWith('/') ? result.slice(1) : result;
  if (relative.split('/').some((segment) => !/^[A-Za-z0-9_-][A-Za-z0-9._-]*$/u.test(segment))) fail(`${label} must be a safe ${absolute ? 'private' : 'repository-relative'} path without traversal.`);
  return result;
}
function origin(value, fail, label) {
  safeText(value, fail, label);
  let parsed;
  try { parsed = new URL(value); } catch { fail(`${label} must be an HTTPS origin.`); }
  if (!/^https:\/\/[^/?#\\]+\/?$/u.test(value) || /\s/u.test(value) || parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) fail(`${label} must be an HTTPS origin without credentials, path, query or fragment.`);
  return parsed.origin;
}
function publicConfig(value, fail, enabled) {
  const raw = exactObject(value === undefined ? {} : value, PUBLIC_KEYS, [], fail, 'memos.public');
  const writeOrigin = raw.writeOrigin === undefined || raw.writeOrigin === null ? null : origin(raw.writeOrigin, fail, 'writeOrigin');
  if (enabled && writeOrigin === null) fail('writeOrigin is required when enabled.');
  const exportPath = safePath(raw.exportPath === undefined ? 'artifacts/memos/memos.public.v1.json' : raw.exportPath, fail, 'exportPath');
  if (!exportPath.endsWith('.json')) fail('exportPath must end with .json.');
  const consentVersion = safeText(raw.consentVersion === undefined ? 'memos-v1' : raw.consentVersion, fail, 'consentVersion');
  return Object.freeze({ writeOrigin, exportPath, consentVersion });
}
function runtimeConfig(value, fail) {
  const raw = exactObject(value === undefined ? {} : value, RUNTIME_KEYS, [], fail, 'memos.runtime');
  const allowedOrigins = raw.allowedOrigins === undefined ? [] : denseArray(raw.allowedOrigins, fail, 'allowedOrigins').map((value) => origin(value, fail, 'allowedOrigins entry'));
  if (new Set(allowedOrigins).size !== allowedOrigins.length) fail('allowedOrigins must be unique.');
  const secretEnv = exactObject(raw.secretEnv === undefined ? {} : raw.secretEnv, ['smtpPassword', 'adminToken', 'tokenKey'], [], fail, 'secretEnv');
  const secrets = {};
  for (const [key, value] of Object.entries(secretEnv)) {
    if (typeof value !== 'string' || !/^[A-Z_][A-Z0-9_]*$/u.test(value)) fail(`secretEnv.${key} must name an environment variable, never a secret value.`);
    secrets[key] = value;
  }
  const runtimePath = (key) => raw[key] === undefined || raw[key] === null ? null : safePath(raw[key], fail, key, true);
  return Object.freeze({
    allowedOrigins: Object.freeze(allowedOrigins),
    publicOrigin: raw.publicOrigin === undefined || raw.publicOrigin === null ? null : origin(raw.publicOrigin, fail, 'publicOrigin'),
    dataRoot: runtimePath('dataRoot'), databasePath: runtimePath('databasePath'), outboxPath: runtimePath('outboxPath'),
    secretEnv: Object.freeze(secrets)
  });
}
export function parseMemosActivation(value, source = 'config/site.toml') {
  const fail = failure(source);
  const raw = exactObject(value === undefined ? {} : value, ['enabled', 'configPath'], [], fail, 'plugins.memos');
  const enabled = raw.enabled === undefined ? false : raw.enabled;
  if (typeof enabled !== 'boolean') fail('enabled must be boolean.');
  const configPath = safePath(raw.configPath === undefined ? DEFAULT_MEMOS_CONFIG_PATH : raw.configPath, fail, 'configPath');
  if (!configPath.endsWith('.toml')) fail('configPath must end with .toml.');
  return Object.freeze({ enabled, configPath });
}
export function parseMemosConfig(value, source = DEFAULT_MEMOS_CONFIG_PATH, options = {}) {
  const fail = failure(source);
  const raw = exactObject(value === undefined ? {} : value, ['public', 'runtime'], [], fail, 'memos configuration');
  return Object.freeze({ public: publicConfig(raw.public, fail, options.enabled === true), runtime: runtimeConfig(raw.runtime, fail) });
}
export function parseMemosPublicConfig(value, source = DEFAULT_MEMOS_CONFIG_PATH, options = {}) {
  return parseMemosConfig(value, source, options).public;
}
export function resolveMemosConfigPath(configPath = DEFAULT_MEMOS_CONFIG_PATH, repositoryRoot = process.cwd()) {
  const activation = parseMemosActivation({ configPath });
  return path.resolve(repositoryRoot, activation.configPath);
}
