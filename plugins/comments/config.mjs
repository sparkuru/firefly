import path from 'node:path';

const controlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u2028\u2029]/u;
const emailPattern = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/u;
const hostnameLabelPattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/u;
const environmentNamePattern = /^[A-Z_][A-Z0-9_]*$/u;
const safePathSegment = /^[^\\/?#%\s\u0000-\u001f\u007f.][^\\/?#%\s\u0000-\u001f\u007f]*$/u;
const safePostRouteAsciiCharacter = /^[A-Za-z0-9._~-]$/u;
const safePostRouteAsciiStartCharacter = /^[A-Za-z0-9]$/u;
const unsafePostRouteDecodedCharacter = /[\\/?#%\s\p{Cc}\p{Cf}]/u;
const unpairedSurrogate = /\p{Cs}/u;

export const DEFAULT_COMMENTS_CONFIG_PATH = 'config/plugins/comments/config.toml';

const ACTIVATION_DEFAULTS = Object.freeze({
  enabled: false,
  configPath: DEFAULT_COMMENTS_CONFIG_PATH
});

const PUBLIC_DEFAULTS = Object.freeze({
  writeOrigin: null,
  exportPath: 'artifacts/comments/comments.public.v1.json',
  consentVersion: 'm51-v1'
});

const ACTIVATION_KEYS = new Set(['enabled', 'configPath']);
const CONFIG_KEYS = new Set(['public', 'runtime']);
const PUBLIC_KEYS = new Set(['writeOrigin', 'exportPath', 'consentVersion']);
const SMTP_KEYS = new Set([
  'host',
  'port',
  'secure',
  'user',
  'from',
  'fromName',
  'passwordEnv',
  'publicOrigin',
  'connectionTimeoutMs',
  'commandTimeoutMs'
]);
const RUNTIME_KEYS = new Set([
  'postRoutes',
  'allowedOrigins',
  'publicOrigin',
  'dataRoot',
  'databasePath',
  'outboxPath',
  'outboxStatePath',
  'smtp'
]);
const LEGACY_KEYS = new Set([
  'enabled',
  'writeOrigin',
  'exportPath',
  'consentVersion',
  'smtp',
  'runtime',
  'COMMENTS_POST_ROUTES',
  'COMMENTS_ALLOWED_ORIGINS',
  'COMMENTS_SMTP_HOST',
  'COMMENTS_SMTP_PORT',
  'COMMENTS_SMTP_SECURE',
  'COMMENTS_SMTP_USER',
  'COMMENTS_SMTP_FROM',
  'COMMENTS_SMTP_FROM_NAME',
  'COMMENTS_SMTP_PASSWORD',
  'COMMENTS_PUBLIC_ORIGIN',
  'COMMENTS_DATA_ROOT',
  'COMMENTS_DATABASE_PATH',
  'COMMENTS_OUTBOX_PATH',
  'COMMENTS_OUTBOX_STATE_PATH',
  'COMMENTS_CONSENT_VERSION'
]);

function isRecord(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function invalid(source, message) {
  throw new TypeError(`Invalid comments configuration in ${source}: ${message}`);
}

function assertExactKeys(value, allowed, source, label) {
  if (!isRecord(value)) invalid(source, `${label} must be a plain object.`);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) invalid(source, `${label} contains unsupported key "${key}".`);
  }
}

function safeText(value, source, label) {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value || value.normalize('NFC') !== value || controlCharacters.test(value) || /[\r\n]/u.test(value)) {
    invalid(source, `${label} must be safe trimmed single-line text.`);
  }
  return value;
}

function normalizeOrigin(value, source, label, requireHttps = false) {
  if (value === null) return null;
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0 || controlCharacters.test(value) || /\s/u.test(value)) {
    invalid(source, `${label} must be an absolute origin.`);
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    invalid(source, `${label} must be an absolute origin.`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || (requireHttps && parsed.protocol !== 'https:') || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    invalid(source, `${label} must be an ${requireHttps ? 'HTTPS ' : ''}origin without a path, query, fragment, or credentials.`);
  }
  return parsed.origin;
}

function normalizeEmail(value, source, label) {
  const email = safeText(value, source, label);
  if (!emailPattern.test(email)) invalid(source, `${label} must be a mailbox address.`);
  return email;
}

function normalizeHost(value, source, label) {
  const host = safeText(value, source, label);
  const labels = host.split('.');
  if (host.length > 253 || labels.some((part) => !hostnameLabelPattern.test(part))) invalid(source, `${label} must be a safe hostname.`);
  return host;
}

function normalizeEnvironmentName(value, source, label) {
  const name = safeText(value, source, label);
  if (!environmentNamePattern.test(name)) invalid(source, `${label} must be an uppercase environment variable name.`);
  return name;
}

function parseBoolean(value, source, label) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  invalid(source, `${label} must be true or false.`);
}

function parsePort(value, source, label) {
  const port = typeof value === 'string' && /^\d+$/u.test(value) ? Number(value) : value;
  if (!Number.isInteger(port) || port < 1 || port > 65535) invalid(source, `${label} must be an integer between 1 and 65535.`);
  return port;
}

function parseDuration(value, source, label) {
  const duration = typeof value === 'string' && /^\d+$/u.test(value) ? Number(value) : value;
  if (!Number.isInteger(duration) || duration < 100 || duration > 120_000) invalid(source, `${label} must be an integer between 100 and 120000 milliseconds.`);
  return duration;
}

function normalizeRepositoryPath(value, source, label) {
  const repositoryPath = safeText(value, source, label);
  if (repositoryPath.startsWith('/') || repositoryPath.includes('\\') || repositoryPath.split('/').some((segment) => !safePathSegment.test(segment))) {
    invalid(source, `${label} must be a safe repository-relative path.`);
  }
  return repositoryPath;
}

function normalizeRuntimePath(value, source, label) {
  const runtimePath = safeText(value, source, label);
  const segments = runtimePath.split('/');
  const hasAllowedLeadingSlash = runtimePath.startsWith('/');
  if (runtimePath.includes('\\') || segments.some((segment, index) => {
    if (segment.length === 0) return !(hasAllowedLeadingSlash && index === 0);
    return !safePathSegment.test(segment);
  })) {
    invalid(source, `${label} must be a safe private path without traversal.`);
  }
  return runtimePath;
}

function parseStringList(value, source, label, normalize) {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) invalid(source, `${label} must be an array.`);
  const values = value.map((entry, index) => normalize(entry, source, `${label}[${index}]`));
  return Object.freeze([...new Set(values)]);
}

function encodeCanonicalPostRouteSegment(value) {
  let encoded = '';
  for (const character of value) {
    if (safePostRouteAsciiCharacter.test(character)) {
      encoded += character;
      continue;
    }
    for (const byte of Buffer.from(character, 'utf8')) {
      encoded += `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
    }
  }
  return encoded;
}

function validateCanonicalPostRoute(value) {
  if (typeof value !== 'string') return false;
  const route = value.trim();
  if (
    route.length === 0 ||
    route !== value ||
    !route.startsWith('/posts/') ||
    !route.endsWith('/') ||
    route.includes('?') ||
    route.includes('#') ||
    route.includes('\\') ||
    route.includes('//')
  ) return false;

  const segments = route.slice('/posts/'.length, -1).split('/');
  if (segments.length === 0) return false;
  for (const segment of segments) {
    if (segment.length === 0) return false;
    let decoded;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return false;
    }
    const characters = [...decoded];
    const firstCharacter = characters[0];
    if (firstCharacter === undefined) return false;
    if (
      decoded.length === 0 ||
      decoded.startsWith('.') ||
      decoded.normalize('NFC') !== decoded ||
      unsafePostRouteDecodedCharacter.test(decoded) ||
      (firstCharacter.codePointAt(0) <= 0x7f && !safePostRouteAsciiStartCharacter.test(firstCharacter)) ||
      characters.some((character) => character.codePointAt(0) <= 0x7f && !safePostRouteAsciiCharacter.test(character)) ||
      encodeCanonicalPostRouteSegment(decoded) !== segment
    ) return false;
  }
  return true;
}

export function isCanonicalCommentsPostRoute(value) {
  return validateCanonicalPostRoute(value);
}

export function commentsPostPathFromSiteHref(value) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.trim() !== value ||
    value.normalize('NFC') !== value ||
    unpairedSurrogate.test(value) ||
    !value.startsWith('/posts/') ||
    !value.endsWith('/') ||
    value.includes('?') ||
    value.includes('#') ||
    value.includes('\\') ||
    value.includes('//')
  ) return null;

  const segments = value.slice('/posts/'.length, -1).split('/');
  if (segments.length === 0 || segments.some((segment) => segment.length === 0)) return null;
  const route = `/posts/${segments.map(encodeCanonicalPostRouteSegment).join('/')}/`;
  return validateCanonicalPostRoute(route) ? route : null;
}

function normalizePostRoute(value, source, label) {
  const route = safeText(value, source, label);
  if (!validateCanonicalPostRoute(route)) invalid(source, `${label} must be a canonical /posts/ route with safe UTF-8 encoding.`);
  return route;
}

function parsePublic(value, source, enabled = false) {
  const raw = value === undefined ? {} : value;
  assertExactKeys(raw, PUBLIC_KEYS, source, 'comments.public');
  const writeOrigin = raw.writeOrigin === undefined ? PUBLIC_DEFAULTS.writeOrigin : normalizeOrigin(raw.writeOrigin, source, 'comments.public.writeOrigin', true);
  const exportPath = raw.exportPath === undefined ? PUBLIC_DEFAULTS.exportPath : normalizeRepositoryPath(raw.exportPath, source, 'comments.public.exportPath');
  if (!exportPath.endsWith('.json')) invalid(source, 'comments.public.exportPath must end with .json.');
  const consentVersion = raw.consentVersion === undefined ? PUBLIC_DEFAULTS.consentVersion : safeText(raw.consentVersion, source, 'comments.public.consentVersion');
  if (enabled && writeOrigin === null) invalid(source, 'comments.public.writeOrigin is required when comments are enabled.');
  return Object.freeze({ writeOrigin, exportPath, consentVersion });
}

function parseSmtp(value, source) {
  if (value === null) return null;
  const raw = value === undefined ? {} : value;
  if (isRecord(raw) && Object.hasOwn(raw, 'password')) invalid(source, 'comments.runtime.smtp.password must not be stored; use passwordEnv and the protected secret file.');
  assertExactKeys(raw, SMTP_KEYS, source, 'comments.runtime.smtp');
  const configured = Object.values(raw).some((value) => value !== undefined);
  if (!configured) return null;

  const result = {};
  if (raw.host !== undefined) result.host = normalizeHost(raw.host, source, 'comments.runtime.smtp.host');
  if (raw.port !== undefined) result.port = parsePort(raw.port, source, 'comments.runtime.smtp.port');
  if (raw.secure !== undefined) result.secure = parseBoolean(raw.secure, source, 'comments.runtime.smtp.secure');
  if (raw.user !== undefined) result.user = normalizeEmail(raw.user, source, 'comments.runtime.smtp.user');
  if (raw.from !== undefined) result.from = normalizeEmail(raw.from, source, 'comments.runtime.smtp.from');
  if (raw.fromName !== undefined) result.fromName = safeText(raw.fromName, source, 'comments.runtime.smtp.fromName');
  if (raw.passwordEnv !== undefined) result.passwordEnv = normalizeEnvironmentName(raw.passwordEnv, source, 'comments.runtime.smtp.passwordEnv');
  if (raw.publicOrigin !== undefined) result.publicOrigin = normalizeOrigin(raw.publicOrigin, source, 'comments.runtime.smtp.publicOrigin');
  if (raw.connectionTimeoutMs !== undefined) result.connectionTimeoutMs = parseDuration(raw.connectionTimeoutMs, source, 'comments.runtime.smtp.connectionTimeoutMs');
  if (raw.commandTimeoutMs !== undefined) result.commandTimeoutMs = parseDuration(raw.commandTimeoutMs, source, 'comments.runtime.smtp.commandTimeoutMs');
  if (result.passwordEnv === undefined) result.passwordEnv = 'COMMENTS_SMTP_PASSWORD';
  return Object.freeze(result);
}

function parseRuntime(value, source) {
  const raw = value === undefined ? {} : value;
  assertExactKeys(raw, RUNTIME_KEYS, source, 'comments.runtime');
  const smtp = parseSmtp(raw.smtp, source);
  const smtpPublicOrigin = smtp?.publicOrigin ?? null;
  const publicOrigin = raw.publicOrigin === undefined
    ? smtpPublicOrigin
    : normalizeOrigin(raw.publicOrigin, source, 'comments.runtime.publicOrigin');
  if (raw.publicOrigin !== undefined && smtpPublicOrigin !== null && publicOrigin !== smtpPublicOrigin) {
    invalid(source, 'comments.runtime.publicOrigin and comments.runtime.smtp.publicOrigin must match when both are configured.');
  }
  return Object.freeze({
    postRoutes: parseStringList(raw.postRoutes, source, 'comments.runtime.postRoutes', normalizePostRoute),
    allowedOrigins: parseStringList(raw.allowedOrigins, source, 'comments.runtime.allowedOrigins', (entry, currentSource, label) => normalizeOrigin(entry, currentSource, label)),
    publicOrigin,
    dataRoot: raw.dataRoot === undefined || raw.dataRoot === null ? null : normalizeRuntimePath(raw.dataRoot, source, 'comments.runtime.dataRoot'),
    databasePath: raw.databasePath === undefined || raw.databasePath === null ? null : normalizeRuntimePath(raw.databasePath, source, 'comments.runtime.databasePath'),
    outboxPath: raw.outboxPath === undefined || raw.outboxPath === null ? null : normalizeRuntimePath(raw.outboxPath, source, 'comments.runtime.outboxPath'),
    outboxStatePath: raw.outboxStatePath === undefined || raw.outboxStatePath === null ? null : normalizeRuntimePath(raw.outboxStatePath, source, 'comments.runtime.outboxStatePath'),
    smtp
  });
}

export function parseCommentsActivation(value, source = 'config/site.toml') {
  const raw = value === undefined ? {} : value;
  assertExactKeys(raw, ACTIVATION_KEYS, source, 'plugins.comments');
  const enabled = raw.enabled === undefined ? ACTIVATION_DEFAULTS.enabled : raw.enabled;
  if (typeof enabled !== 'boolean') invalid(source, 'plugins.comments.enabled must be boolean.');
  const configPath = raw.configPath === undefined
    ? ACTIVATION_DEFAULTS.configPath
    : normalizeRepositoryPath(raw.configPath, source, 'plugins.comments.configPath');
  if (!configPath.endsWith('.toml')) invalid(source, 'plugins.comments.configPath must end with .toml.');
  return Object.freeze({ enabled, configPath });
}

export function parseCommentsConfig(value, source = DEFAULT_COMMENTS_CONFIG_PATH, options = {}) {
  const raw = value === undefined ? {} : value;
  assertExactKeys(raw, CONFIG_KEYS, source, 'comments configuration');
  return Object.freeze({
    public: parsePublic(raw.public, source, options.enabled === true),
    runtime: parseRuntime(raw.runtime, source)
  });
}

function getLegacyValue(value, nested, field, legacyKey, source) {
  const nestedPresent = Object.hasOwn(nested, field);
  const legacyPresent = Object.hasOwn(value, legacyKey);
  if (nestedPresent && legacyPresent) invalid(source, `${field} and ${legacyKey} must not both be configured.`);
  if (nestedPresent) return nested[field];
  if (legacyPresent) return value[legacyKey];
  return undefined;
}

function parseLegacyCommentsNamespace(value, source) {
  const raw = value === undefined ? {} : value;
  assertExactKeys(raw, LEGACY_KEYS, source, 'comments');
  const smtp = raw.smtp === undefined ? {} : raw.smtp;
  const runtime = raw.runtime === undefined ? {} : raw.runtime;
  assertExactKeys(smtp, SMTP_KEYS, source, 'comments.smtp');
  assertExactKeys(runtime, RUNTIME_KEYS, source, 'comments.runtime');
  if (Object.hasOwn(smtp, 'password') || Object.hasOwn(raw, 'COMMENTS_SMTP_PASSWORD')) {
    invalid(source, 'a literal SMTP password must not be stored in config; use passwordEnv and the protected secret file.');
  }

  const enabled = raw.enabled === undefined ? false : raw.enabled;
  if (typeof enabled !== 'boolean') invalid(source, 'comments.enabled must be boolean.');
  const publicConfig = parsePublic({
    writeOrigin: raw.writeOrigin,
    exportPath: raw.exportPath,
    consentVersion: raw.consentVersion
  }, source, enabled);
  const canonicalRuntime = {
    postRoutes: getLegacyValue(raw, runtime, 'postRoutes', 'COMMENTS_POST_ROUTES', source),
    allowedOrigins: getLegacyValue(raw, runtime, 'allowedOrigins', 'COMMENTS_ALLOWED_ORIGINS', source),
    publicOrigin: getLegacyValue(raw, runtime, 'publicOrigin', 'COMMENTS_PUBLIC_ORIGIN', source),
    dataRoot: getLegacyValue(raw, runtime, 'dataRoot', 'COMMENTS_DATA_ROOT', source),
    databasePath: getLegacyValue(raw, runtime, 'databasePath', 'COMMENTS_DATABASE_PATH', source),
    outboxPath: getLegacyValue(raw, runtime, 'outboxPath', 'COMMENTS_OUTBOX_PATH', source),
    outboxStatePath: getLegacyValue(raw, runtime, 'outboxStatePath', 'COMMENTS_OUTBOX_STATE_PATH', source),
    smtp: {
      host: getLegacyValue(raw, smtp, 'host', 'COMMENTS_SMTP_HOST', source),
      port: getLegacyValue(raw, smtp, 'port', 'COMMENTS_SMTP_PORT', source),
      secure: getLegacyValue(raw, smtp, 'secure', 'COMMENTS_SMTP_SECURE', source),
      user: getLegacyValue(raw, smtp, 'user', 'COMMENTS_SMTP_USER', source),
      from: getLegacyValue(raw, smtp, 'from', 'COMMENTS_SMTP_FROM', source),
      fromName: getLegacyValue(raw, smtp, 'fromName', 'COMMENTS_SMTP_FROM_NAME', source),
      passwordEnv: smtp.passwordEnv,
      publicOrigin: getLegacyValue(raw, smtp, 'publicOrigin', 'COMMENTS_PUBLIC_ORIGIN', source),
      connectionTimeoutMs: smtp.connectionTimeoutMs,
      commandTimeoutMs: smtp.commandTimeoutMs
    }
  };
  if (canonicalRuntime.smtp.publicOrigin === undefined) delete canonicalRuntime.smtp.publicOrigin;
  const parsed = parseCommentsConfig({ public: publicConfig, runtime: canonicalRuntime }, source, { enabled });
  return Object.freeze({
    activation: Object.freeze({ enabled, configPath: DEFAULT_COMMENTS_CONFIG_PATH }),
    public: Object.freeze({ enabled, ...parsed.public }),
    runtime: parsed.runtime
  });
}

export function parseCommentsNamespace(value, source = 'config/site.toml') {
  if (isRecord(value) && Object.hasOwn(value, 'public')) return parseCommentsConfig(value, source);
  return parseLegacyCommentsNamespace(value, source);
}

export function resolveCommentsConfigPath(configPath = DEFAULT_COMMENTS_CONFIG_PATH, repositoryRoot = process.cwd()) {
  const root = path.resolve(repositoryRoot);
  const relative = normalizeRepositoryPath(configPath, 'plugins.comments', 'plugins.comments.configPath');
  const resolved = path.resolve(root, relative);
  const fromRoot = path.relative(root, resolved);
  if (fromRoot.startsWith('..') || path.isAbsolute(fromRoot)) {
    throw new TypeError('Invalid comments configuration in plugins.comments: configPath escapes the repository root.');
  }
  return resolved;
}

function mapRuntimeToEnvironment(parsed, env) {
  const environment = { ...env };
  const runtime = parsed.runtime;
  const smtp = runtime.smtp;
  const mappings = [
    ['postRoutes', 'COMMENTS_POST_ROUTES', (value) => value.join(',')],
    ['allowedOrigins', 'COMMENTS_ALLOWED_ORIGINS', (value) => value.join(',')],
    ['publicOrigin', 'COMMENTS_PUBLIC_ORIGIN'],
    ['dataRoot', 'COMMENTS_DATA_ROOT'],
    ['databasePath', 'COMMENTS_DATABASE_PATH'],
    ['outboxPath', 'COMMENTS_OUTBOX_PATH'],
    ['outboxStatePath', 'COMMENTS_OUTBOX_STATE_PATH']
  ];
  for (const [field, key, transform] of mappings) {
    const value = runtime[field];
    if (environment[key] === undefined && value !== null && value !== undefined && (!Array.isArray(value) || value.length > 0)) {
      environment[key] = transform ? transform(value) : String(value);
    }
  }
  if (smtp !== null) {
    const smtpMappings = [
      ['host', 'COMMENTS_SMTP_HOST'],
      ['port', 'COMMENTS_SMTP_PORT'],
      ['secure', 'COMMENTS_SMTP_SECURE'],
      ['user', 'COMMENTS_SMTP_USER'],
      ['from', 'COMMENTS_SMTP_FROM'],
      ['fromName', 'COMMENTS_SMTP_FROM_NAME'],
      ['connectionTimeoutMs', 'COMMENTS_SMTP_CONNECT_TIMEOUT_MS'],
      ['commandTimeoutMs', 'COMMENTS_SMTP_COMMAND_TIMEOUT_MS']
    ];
    for (const [field, key] of smtpMappings) {
      if (environment[key] === undefined && smtp[field] !== undefined && smtp[field] !== null) environment[key] = String(smtp[field]);
    }
    if (environment.COMMENTS_PUBLIC_ORIGIN === undefined && smtp.publicOrigin !== undefined && smtp.publicOrigin !== null) {
      environment.COMMENTS_PUBLIC_ORIGIN = smtp.publicOrigin;
    }
    if (environment.COMMENTS_SMTP_PASSWORD === undefined && smtp.passwordEnv !== undefined && env[smtp.passwordEnv] !== undefined) {
      environment.COMMENTS_SMTP_PASSWORD = env[smtp.passwordEnv];
    }
  }
  if (environment.COMMENTS_CONSENT_VERSION === undefined) environment.COMMENTS_CONSENT_VERSION = parsed.public.consentVersion;
  return Object.freeze(environment);
}

export function resolveCommentsRuntimeOptions(value, env = {}, source = DEFAULT_COMMENTS_CONFIG_PATH) {
  const legacy = !(isRecord(value) && Object.hasOwn(value, 'public'));
  const parsed = legacy ? parseLegacyCommentsNamespace(value, source) : parseCommentsConfig(value, source);
  return Object.freeze({
    public: parsed.public,
    runtime: parsed.runtime,
    smtpEnvironment: mapRuntimeToEnvironment(parsed, env)
  });
}
