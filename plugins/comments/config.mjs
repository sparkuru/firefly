const controlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u2028\u2029]/u;
const emailPattern = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/u;
const hostnameLabelPattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/u;
const environmentNamePattern = /^[A-Z_][A-Z0-9_]*$/u;
const safePathSegment = /^[^\\/?#%\s\u0000-\u001f\u007f.][^\\/?#%\s\u0000-\u001f\u007f]*$/u;

const PUBLIC_DEFAULTS = Object.freeze({
  enabled: false,
  writeOrigin: null,
  exportPath: 'artifacts/comments/comments.public.v1.json',
  consentVersion: 'm51-v1'
});

const PUBLIC_KEYS = new Set(['enabled', 'writeOrigin', 'exportPath', 'consentVersion']);
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
const RUNTIME_KEYS = new Set(['outboxPath', 'outboxStatePath']);
const LEGACY_KEYS = new Set([
  'COMMENTS_SMTP_HOST',
  'COMMENTS_SMTP_PORT',
  'COMMENTS_SMTP_SECURE',
  'COMMENTS_SMTP_USER',
  'COMMENTS_SMTP_FROM',
  'COMMENTS_SMTP_FROM_NAME',
  'COMMENTS_SMTP_PASSWORD',
  'COMMENTS_PUBLIC_ORIGIN',
  'COMMENTS_OUTBOX_PATH',
  'COMMENTS_OUTBOX_STATE_PATH'
]);
const NAMESPACE_KEYS = new Set([...PUBLIC_KEYS, 'smtp', 'runtime', ...LEGACY_KEYS]);

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

function getLegacyValue(value, nested, field, legacyKey, source) {
  const nestedPresent = Object.hasOwn(nested, field);
  const legacyPresent = Object.hasOwn(value, legacyKey);
  if (nestedPresent && legacyPresent) {
    invalid(source, `${field} and ${legacyKey} must not both be configured.`);
  }
  if (nestedPresent) return nested[field];
  if (legacyPresent) return value[legacyKey];
  return undefined;
}

function parsePublic(value, source) {
  const enabled = value.enabled === undefined ? PUBLIC_DEFAULTS.enabled : value.enabled;
  if (typeof enabled !== 'boolean') invalid(source, 'comments.enabled must be boolean.');
  const writeOrigin = value.writeOrigin === undefined ? PUBLIC_DEFAULTS.writeOrigin : normalizeOrigin(value.writeOrigin, source, 'comments.writeOrigin', true);
  const exportPath = value.exportPath === undefined ? PUBLIC_DEFAULTS.exportPath : value.exportPath;
  if (typeof exportPath !== 'string' || exportPath.length === 0 || exportPath.normalize('NFC') !== exportPath || exportPath.startsWith('/') || exportPath.includes('\\') || exportPath.includes('?') || exportPath.includes('#') || controlCharacters.test(exportPath) || exportPath.split('/').some((segment) => !safePathSegment.test(segment))) {
    invalid(source, 'comments.exportPath must be a safe repository-relative path.');
  }
  if (!exportPath.endsWith('.json')) invalid(source, 'comments.exportPath must end with .json.');
  const consentVersion = value.consentVersion === undefined ? PUBLIC_DEFAULTS.consentVersion : value.consentVersion;
  safeText(consentVersion, source, 'comments.consentVersion');
  if (enabled && writeOrigin === null) invalid(source, 'comments.writeOrigin is required when comments.enabled is true.');
  return Object.freeze({ enabled, writeOrigin, exportPath, consentVersion });
}

function parseSmtp(value, source) {
  const nested = value.smtp === undefined ? {} : value.smtp;
  if (isRecord(nested) && Object.hasOwn(nested, 'password')) invalid(source, 'comments.smtp.password must not be stored in site.toml; use passwordEnv.');
  assertExactKeys(nested, SMTP_KEYS, source, 'comments.smtp');
  if (Object.hasOwn(value, 'COMMENTS_SMTP_PASSWORD')) invalid(source, 'COMMENTS_SMTP_PASSWORD must not be stored in site.toml; use comments.smtp.passwordEnv.');

  const fields = {
    host: getLegacyValue(value, nested, 'host', 'COMMENTS_SMTP_HOST', source),
    port: getLegacyValue(value, nested, 'port', 'COMMENTS_SMTP_PORT', source),
    secure: getLegacyValue(value, nested, 'secure', 'COMMENTS_SMTP_SECURE', source),
    user: getLegacyValue(value, nested, 'user', 'COMMENTS_SMTP_USER', source),
    from: getLegacyValue(value, nested, 'from', 'COMMENTS_SMTP_FROM', source),
    fromName: getLegacyValue(value, nested, 'fromName', 'COMMENTS_SMTP_FROM_NAME', source),
    publicOrigin: getLegacyValue(value, nested, 'publicOrigin', 'COMMENTS_PUBLIC_ORIGIN', source),
    connectionTimeoutMs: nested.connectionTimeoutMs,
    commandTimeoutMs: nested.commandTimeoutMs,
    passwordEnv: nested.passwordEnv
  };
  const configured = Object.values(fields).some((field) => field !== undefined);
  if (!configured) return null;

  const result = {};
  if (fields.host !== undefined) result.host = normalizeHost(fields.host, source, 'comments.smtp.host');
  if (fields.port !== undefined) result.port = parsePort(fields.port, source, 'comments.smtp.port');
  if (fields.secure !== undefined) result.secure = parseBoolean(fields.secure, source, 'comments.smtp.secure');
  if (fields.user !== undefined) result.user = normalizeEmail(fields.user, source, 'comments.smtp.user');
  if (fields.from !== undefined) result.from = normalizeEmail(fields.from, source, 'comments.smtp.from');
  if (fields.fromName !== undefined) result.fromName = safeText(fields.fromName, source, 'comments.smtp.fromName');
  if (fields.publicOrigin !== undefined) result.publicOrigin = normalizeOrigin(fields.publicOrigin, source, 'comments.smtp.publicOrigin');
  if (fields.passwordEnv !== undefined) result.passwordEnv = normalizeEnvironmentName(fields.passwordEnv, source, 'comments.smtp.passwordEnv');
  if (fields.connectionTimeoutMs !== undefined) result.connectionTimeoutMs = parseDuration(fields.connectionTimeoutMs, source, 'comments.smtp.connectionTimeoutMs');
  if (fields.commandTimeoutMs !== undefined) result.commandTimeoutMs = parseDuration(fields.commandTimeoutMs, source, 'comments.smtp.commandTimeoutMs');
  if (result.passwordEnv === undefined) result.passwordEnv = 'COMMENTS_SMTP_PASSWORD';
  return Object.freeze(result);
}

function parseRuntime(value, source) {
  const nested = value.runtime === undefined ? {} : value.runtime;
  assertExactKeys(nested, RUNTIME_KEYS, source, 'comments.runtime');
  const outboxPath = getLegacyValue(value, nested, 'outboxPath', 'COMMENTS_OUTBOX_PATH', source);
  const outboxStatePath = getLegacyValue(value, nested, 'outboxStatePath', 'COMMENTS_OUTBOX_STATE_PATH', source);
  return Object.freeze({
    outboxPath: outboxPath === undefined ? null : normalizeRuntimePath(outboxPath, source, 'comments.runtime.outboxPath'),
    outboxStatePath: outboxStatePath === undefined ? null : normalizeRuntimePath(outboxStatePath, source, 'comments.runtime.outboxStatePath')
  });
}

export function parseCommentsNamespace(value, source = 'config/site.toml') {
  const raw = value === undefined ? {} : value;
  assertExactKeys(raw, NAMESPACE_KEYS, source, 'comments');
  const result = Object.freeze({
    public: parsePublic(raw, source),
    runtime: Object.freeze({
      smtp: parseSmtp(raw, source),
      ...parseRuntime(raw, source)
    })
  });
  return result;
}

export function resolveCommentsRuntimeOptions(value, env = {}, source = 'config/site.toml') {
  const parsed = parseCommentsNamespace(value, source);
  const smtpEnvironment = { ...env };
  const smtp = parsed.runtime.smtp;
  if (smtp !== null) {
    const mappings = [
      ['host', 'COMMENTS_SMTP_HOST'],
      ['port', 'COMMENTS_SMTP_PORT'],
      ['secure', 'COMMENTS_SMTP_SECURE'],
      ['user', 'COMMENTS_SMTP_USER'],
      ['from', 'COMMENTS_SMTP_FROM'],
      ['fromName', 'COMMENTS_SMTP_FROM_NAME'],
      ['publicOrigin', 'COMMENTS_PUBLIC_ORIGIN'],
      ['connectionTimeoutMs', 'COMMENTS_SMTP_CONNECT_TIMEOUT_MS'],
      ['commandTimeoutMs', 'COMMENTS_SMTP_COMMAND_TIMEOUT_MS']
    ];
    for (const [field, key] of mappings) {
      if (smtpEnvironment[key] === undefined && smtp[field] !== undefined && smtp[field] !== null) smtpEnvironment[key] = String(smtp[field]);
    }
    if (smtpEnvironment.COMMENTS_SMTP_PASSWORD === undefined && smtp.passwordEnv !== undefined && env[smtp.passwordEnv] !== undefined) {
      smtpEnvironment.COMMENTS_SMTP_PASSWORD = env[smtp.passwordEnv];
    }
  }
  if (smtpEnvironment.COMMENTS_OUTBOX_PATH === undefined && parsed.runtime.outboxPath !== null) {
    smtpEnvironment.COMMENTS_OUTBOX_PATH = parsed.runtime.outboxPath;
  }
  if (smtpEnvironment.COMMENTS_OUTBOX_STATE_PATH === undefined && parsed.runtime.outboxStatePath !== null) {
    smtpEnvironment.COMMENTS_OUTBOX_STATE_PATH = parsed.runtime.outboxStatePath;
  }
  if (smtpEnvironment.COMMENTS_CONSENT_VERSION === undefined) {
    smtpEnvironment.COMMENTS_CONSENT_VERSION = parsed.public.consentVersion;
  }
  return Object.freeze({
    public: parsed.public,
    runtime: parsed.runtime,
    smtpEnvironment: Object.freeze(smtpEnvironment)
  });
}
