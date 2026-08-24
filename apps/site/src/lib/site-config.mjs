import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'astro/zod';
import { parse as parseToml } from 'smol-toml';
import {
  parseCommentsActivation,
  parseCommentsConfig,
  parseCommentsNamespace,
  resolveCommentsConfigPath
} from '../../../../plugins/comments/config.mjs';

const sourceRepositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const configCandidates = [
  path.resolve(process.cwd(), 'config/site.toml'),
  path.resolve(process.cwd(), '../../config/site.toml'),
  path.join(sourceRepositoryRoot, 'config/site.toml')
];
export const SITE_CONFIG_PATH = configCandidates.find((candidate) => existsSync(candidate)) ?? configCandidates[0];

const controlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u2028\u2029]/u;
const lineBreaks = /[\r\n\u2028\u2029]/u;
const safePathSegment = /^[^\\/?#%\s\u0000-\u001f\u007f.][^\\/?#%\s\u0000-\u001f\u007f]*$/u;
const safePromptToken = /^[^\\/?#%\s\u0000-\u001f\u007f]+$/u;

function safeText(message, { multiline = false } = {}) {
  return z.string().refine((value) => {
    if (value.trim().length === 0 || controlCharacters.test(value)) return false;
    if (!multiline && value !== value.trim()) return false;
    return multiline || !lineBreaks.test(value);
  }, message);
}

function normalizeOrigin(value) {
  if (value === null) return null;
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0 || controlCharacters.test(value) || /\s/u.test(value)) {
    return false;
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    return false;
  }
  return parsed.origin;
}

export function isSafeHttpUrl(value) {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value || controlCharacters.test(value) || /\s/u.test(value)) return false;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return ['http:', 'https:'].includes(parsed.protocol) && parsed.username === '' && parsed.password === '' && !parsed.hash;
}

export function isSafeImageReference(value) {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value || controlCharacters.test(value) || /\\/u.test(value)) return false;
  if (isSafeHttpUrl(value)) return true;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('#') || /\s/u.test(value)) return false;
  const pathPart = value.split(/[?#]/u, 1)[0] ?? value;
  return pathPart.split('/').every((segment) => segment === '' || (segment !== '.' && segment !== '..' && safePathSegment.test(segment)));
}

function normalizeAbout(value) {
  return value.replaceAll('\r\n', '\n').replaceAll('\r', '\n').trim();
}

function normalizeCwd(value) {
  if (value.includes('\\') || value.normalize('NFC') !== value) return false;
  const normalized = value;
  if (!normalized.startsWith('~/blog') || (normalized.length > '~/blog'.length && !normalized.startsWith('~/blog/'))) return false;
  const suffix = normalized.slice('~/blog'.length);
  if (suffix.length === 0) return normalized;
  if (!suffix.startsWith('/') || suffix.split('/').slice(1).some((segment) => !safePathSegment.test(segment) || segment.normalize('NFC') !== segment)) return false;
  return normalized;
}

const origin = z.union([z.string(), z.null()]).optional().default(null).refine(
  (value) => value === null || normalizeOrigin(value) !== false,
  'site.url must be an absolute http(s) origin without a path, query, fragment, or credentials'
).transform((value) => value === null ? null : normalizeOrigin(value));

const image = z.union([z.string(), z.null()]).optional().default(null).refine(
  (value) => value === null || isSafeImageReference(value),
  'SEO image must be an absolute http(s) URL or a safe root-relative path'
).transform((value) => value === null ? null : value);

const friendLink = z.object({
  name: safeText('terminal.friends.name must be non-empty safe text'),
  desc: safeText('terminal.friends.desc must be non-empty safe single-line text').optional(),
  url: z.string().refine(
    isSafeHttpUrl,
    'terminal.friends.url must be an absolute http(s) URL without credentials or fragments'
  )
}).strict();

const friends = z.array(friendLink).optional().default([]).superRefine((links, context) => {
  const seen = new Map();
  links.forEach((link, index) => {
    const previousIndex = seen.get(link.url);
    if (previousIndex !== undefined) {
      context.addIssue({
        code: 'custom',
        message: `terminal.friends.url duplicates item ${previousIndex + 1}`,
        path: [index, 'url']
      });
    } else {
      seen.set(link.url, index);
    }
  });
});

const siteSchema = z.object({
  name: safeText('site.name must be non-empty safe text'),
  description: safeText('site.description must be non-empty safe text'),
  language: z.string().trim().regex(/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{2,8})*$/u, 'site.language must be a BCP 47-style language tag'),
  url: origin,
  author: z.union([safeText('site.author must be non-empty safe text'), z.null()]).optional().default(null)
}).strict();

const terminalSchema = z.object({
  user: z.string().trim().min(1).refine((value) => safePromptToken.test(value), 'terminal.user must be one safe prompt token'),
  host: z.string().trim().min(1).refine((value) => safePromptToken.test(value), 'terminal.host must be one safe prompt token'),
  cwd: z.string().trim().min(1).refine((value) => normalizeCwd(value) !== false, 'terminal.cwd must be a safe virtual path beginning with ~/blog').transform(normalizeCwd),
  about: safeText('terminal.about must be non-empty safe text', { multiline: true }).transform(normalizeAbout),
  friends
}).strict();

const robots = safeText('seo.robots must be a safe robots policy').refine(
  (value) => /^(?:index|noindex),\s*(?:follow|nofollow)$/u.test(value),
  'seo.robots must contain one index/noindex and one follow/nofollow directive'
).transform((value) => value.replaceAll(/\s*,\s*/gu, ', '));

const seoSchema = z.object({
  titleSuffix: z.string().min(1).refine((value) => value.trim().length > 0 && value === value.trimEnd() && !controlCharacters.test(value) && !lineBreaks.test(value), 'seo.titleSuffix must be safe single-line text'),
  robots,
  twitterCard: z.enum(['summary', 'summary_large_image']),
  image
}).strict();

const siteConfigSchema = z.object({
  site: siteSchema,
  terminal: terminalSchema,
  seo: seoSchema
}).strict();

function freezeDeep(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) freezeDeep(child, seen);
  return Object.freeze(value);
}

function formatIssues(error) {
  return error.issues.map((issue) => {
    const location = issue.path.length === 0 ? 'config' : issue.path.join('.');
    return `${location}: ${issue.message}`;
  }).join('; ');
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function commentsSiteProjection(rawValue, source, commentsConfig) {
  const rawComments = rawValue.comments;
  const rawPlugins = rawValue.plugins;
  if (rawComments !== undefined && rawPlugins !== undefined) {
    throw new TypeError('the legacy [comments] namespace cannot be combined with [plugins.comments].');
  }

  if (rawComments !== undefined) {
    const legacy = parseCommentsNamespace(rawComments, source);
    return {
      activation: legacy.activation,
      public: {
        writeOrigin: legacy.public.writeOrigin,
        exportPath: legacy.public.exportPath,
        consentVersion: legacy.public.consentVersion
      }
    };
  }

  const rawPluginActivation = rawPlugins === undefined ? undefined : rawPlugins.comments;
  if (rawPlugins !== undefined) {
    if (!isRecord(rawPlugins)) throw new TypeError('plugins must be a plain object.');
    for (const key of Object.keys(rawPlugins)) {
      if (key !== 'comments') throw new TypeError(`plugins contains unsupported key "${key}".`);
    }
  }
  const activation = parseCommentsActivation(rawPluginActivation, source);
  const parsed = parseCommentsConfig(commentsConfig, activation.configPath, { enabled: activation.enabled });
  return { activation, public: parsed.public };
}

export function parseSiteConfig(value, source = 'config/site.toml', options = {}) {
  const rawValue = isRecord(value) ? value : {};
  const { comments: _legacyComments, plugins: _plugins, ...siteValue } = rawValue;
  let commentsProjection;
  try {
    commentsProjection = commentsSiteProjection(rawValue, source, options.commentsConfig);
  } catch (error) {
    throw new Error(`Invalid site configuration in ${source}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const result = siteConfigSchema.safeParse(siteValue);
  if (!result.success) throw new Error(`Invalid site configuration in ${source}: ${formatIssues(result.error)}`);
  return freezeDeep({
    ...result.data,
    plugins: { comments: commentsProjection.activation },
    comments: commentsProjection.public
  });
}

function configRepositoryRoot(filePath) {
  const resolved = path.resolve(filePath);
  return path.basename(path.dirname(resolved)) === 'config'
    ? path.dirname(path.dirname(resolved))
    : sourceRepositoryRoot;
}

function readCommentsConfigForSite(value, filePath) {
  if (path.basename(filePath) === 'site.toml.example') return undefined;
  if (isRecord(value.comments)) return undefined;
  const rawPlugins = isRecord(value.plugins) ? value.plugins : undefined;
  const activation = parseCommentsActivation(rawPlugins?.comments, filePath);
  const repositoryRoot = configRepositoryRoot(filePath);
  const configPath = resolveCommentsConfigPath(activation.configPath, repositoryRoot);
  if (!existsSync(configPath)) {
    if (activation.enabled) throw new Error(`Comments plugin configuration is required at ${configPath} when the plugin is enabled.`);
    return undefined;
  }
  let stats;
  try {
    stats = lstatSync(configPath);
    if (!stats.isFile() || stats.isSymbolicLink()) throw new Error('not a regular file');
    const resolved = realpathSync(configPath);
    const relative = path.relative(repositoryRoot, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('resolved path escapes repository root');
  } catch (error) {
    throw new Error(`Unable to use comments plugin configuration at ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  let source;
  try {
    source = readFileSync(configPath, 'utf8');
  } catch (error) {
    throw new Error(`Unable to read comments plugin configuration at ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  let parsed;
  try {
    parsed = parseToml(source);
  } catch (error) {
    throw new Error(`Invalid TOML in ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  return parseCommentsConfig(parsed, configPath, { enabled: activation.enabled });
}

export function loadSiteConfig(filePath = SITE_CONFIG_PATH) {
  let source;
  try {
    source = readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Unable to read site configuration at ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  let value;
  try {
    value = parseToml(source);
  } catch (error) {
    throw new Error(`Invalid TOML in ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const commentsConfig = readCommentsConfigForSite(value, filePath);
  return parseSiteConfig(value, filePath, { commentsConfig });
}

export const SITE_CONFIG = loadSiteConfig();

export function terminalIdentityFromConfig(config = SITE_CONFIG) {
  return Object.freeze({
    user: config.terminal.user,
    host: config.terminal.host,
    workingDirectory: config.terminal.cwd,
    about: config.terminal.about
  });
}
