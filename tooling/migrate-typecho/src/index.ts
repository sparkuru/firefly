import { createHash } from 'node:crypto';
import { closeSync, constants as fsConstants, openSync } from 'node:fs';
import { chmod, copyFile, lstat, mkdir, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  readAdapterSnapshot,
  readSqlSnapshot,
  type SourceContent,
  type SourceField,
  type SourceSnapshot
} from './source.js';

export type MetadataClassification = 'approved' | 'deferred' | 'rejected';

export interface MetadataCandidate {
  readonly name: string;
  readonly classification: MetadataClassification;
  readonly currentCount: number;
  readonly orphanCount: number;
  readonly reason: string;
}

export interface ArticleCandidate {
  readonly documentRef: string;
  readonly sourceId: string;
  readonly authorIdentityRef: string;
  readonly kind: 'post' | 'page';
  readonly slug: string;
  readonly categorySlug?: string;
  readonly categoryName?: string;
  readonly template: string;
  readonly publicPath: string;
  readonly canonicalRoute: string;
  readonly title: string;
  readonly description: string;
  readonly date: string;
  readonly updated?: string;
  readonly tags: readonly string[];
  readonly body: string;
}

export interface ResourceDecision {
  readonly documentRef: string;
  readonly reference: string;
  readonly disposition: 'managed' | 'external' | 'deferred' | 'exception';
  readonly publicPath?: string;
  readonly sha256?: string;
  readonly size?: number;
  readonly reason: string;
}

export interface MigrationException {
  readonly kind: string;
  readonly documentRef?: string;
  readonly code: string;
  readonly detail: string;
}

export interface MigrationResult {
  readonly inventory: {
    readonly schemaVersion: 1;
    readonly posts: number;
    readonly pages: number;
    readonly draftsOrUnsupported: number;
    readonly categories: number;
    readonly usedTags: number;
    readonly currentFields: number;
    readonly orphanFields: number;
    readonly comments: number;
    readonly users: number;
    readonly memos: number;
    readonly resources: number;
    readonly resourceDeferred: number;
    readonly resourceExceptions: number;
    readonly exceptions: number;
  };
  readonly articles: readonly ArticleCandidate[];
  readonly metadataCandidates: readonly MetadataCandidate[];
  readonly resourceDecisions: readonly ResourceDecision[];
  readonly exceptions: readonly MigrationException[];
  readonly ledgerRoot: string;
  readonly outputRoot?: string;
}

interface ReviewReport {
  readonly schemaVersion: 1;
  readonly resources: {
    readonly total: number;
    readonly byDisposition: readonly { readonly disposition: ResourceDecision['disposition']; readonly count: number }[];
    readonly exceptionsByReason: readonly { readonly reason: string; readonly count: number }[];
    readonly documentsWithExceptions: number;
  };
  readonly migrationExceptionsByCode: readonly { readonly code: string; readonly count: number }[];
  readonly publicPromotion: {
    readonly blocked: boolean;
    readonly reasons: readonly string[];
  };
}

export interface MigrationOptions {
  readonly repositoryRoot: string;
  readonly dumpPath: string;
  readonly expectedSha256: string;
  readonly ledgerRoot: string;
  readonly adapterCommand?: string;
  readonly uploadsRoot?: string;
  readonly resourceManifestPath?: string;
  readonly materializePublic?: boolean;
  readonly materializeCandidate?: boolean;
  readonly outputRoot?: string;
  readonly expectedPosts?: number;
  readonly expectedPages?: number;
}

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const RAW_HTML_PATTERN = /<\/?[a-z][^>]*>/iu;
const IMAGE_HTML_PATTERN = /<img\b[^>]*\bsrc=(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/giu;
const MARKDOWN_IMAGE_PATTERN = /!\[[^\]\r\n]*\]\(([^\s)\r\n]+)(?:\s+["'][^"'\r\n]*["'])?\)/gu;
const SAFE_SEGMENT_FORBIDDEN = /[\u0000-\u001f\u007f\\/%?#\s]/u;

interface ManagedResource {
  readonly reference: string;
  readonly sourceAbsolutePath: string;
  readonly sourcePath: string;
  readonly publicPath: string;
  readonly sha256: string;
  readonly size: number;
}

const BASE_METADATA: readonly Omit<MetadataCandidate, 'currentCount' | 'orphanCount'>[] = Object.freeze([
  { name: 'title', classification: 'approved', reason: 'Required public title after safe text validation.' },
  { name: 'slug', classification: 'approved', reason: 'Normalized filename segment and canonical identity input.' },
  { name: 'created', classification: 'approved', reason: 'Mapped to the first publication timestamp.' },
  { name: 'modified', classification: 'approved', reason: 'Mapped only when meaningfully later than publication.' },
  { name: 'text', classification: 'approved', reason: 'Mapped through deterministic wrapper and raw-HTML normalization.' },
  { name: 'type', classification: 'approved', reason: 'Selects only the existing post or page layout.' },
  { name: 'status', classification: 'approved', reason: 'Only published documents enter candidates.' },
  { name: 'template', classification: 'deferred', reason: 'Legacy template evidence does not select a public route or layout.' },
  { name: 'parent', classification: 'rejected', reason: 'CMS hierarchy is not public document metadata.' },
  { name: 'authorId', classification: 'rejected', reason: 'Source identity remains private correspondence.' },
  { name: 'commentsNum', classification: 'rejected', reason: 'Historic counters remain private in M5.' },
  { name: 'views', classification: 'rejected', reason: 'Historic counters remain private in M5.' },
  { name: 'stars', classification: 'rejected', reason: 'Historic counters remain private in M5.' },
  { name: 'allowComment', classification: 'rejected', reason: 'CMS runtime flags are not public front matter.' },
  { name: 'allowPing', classification: 'rejected', reason: 'CMS runtime flags are not public front matter.' },
  { name: 'allowFeed', classification: 'rejected', reason: 'CMS runtime flags are not public front matter.' },
  { name: 'password', classification: 'rejected', reason: 'Source access controls are never copied into the static corpus.' }
]);

const FIELD_POLICY: Readonly<Record<string, { readonly classification: MetadataClassification; readonly reason: string }>> = Object.freeze({
  customSummary: { classification: 'approved', reason: 'Normalized text is the preferred public description.' },
  thumb: { classification: 'deferred', reason: 'Resolved only through the checked resource pipeline.' },
  reprint: { classification: 'deferred', reason: 'Rights and attribution require owner review.' },
  mathjax: { classification: 'deferred', reason: 'Parser behavior is not document metadata.' },
  parseWay: { classification: 'deferred', reason: 'Parser behavior is not document metadata.' },
  outdatedNotice: { classification: 'rejected', reason: 'Legacy theme presentation flag.' },
  noThumbInfoEmoji: { classification: 'rejected', reason: 'Legacy theme presentation control.' },
  noThumbInfoStyle: { classification: 'rejected', reason: 'Legacy theme presentation control.' },
  thumbChoice: { classification: 'rejected', reason: 'Legacy theme presentation control.' },
  thumbStyle: { classification: 'rejected', reason: 'Legacy theme presentation control.' },
  thumbSmall: { classification: 'rejected', reason: 'Empty legacy thumbnail variant.' },
  thumbDesc: { classification: 'rejected', reason: 'Empty legacy thumbnail description.' }
});

function contained(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function collisionKey(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('en').replaceAll('ß', 'ss').replaceAll('ς', 'σ');
}

function safeSegment(value: string, owner: string): string {
  const result = value.trim().normalize('NFC');
  if (
    result.length === 0 || result !== value.trim() || result === '.' || result === '..' ||
    result.startsWith('.') || SAFE_SEGMENT_FORBIDDEN.test(result)
  ) {
    throw new TypeError(`${owner} is not a safe normalized path segment.`);
  }
  return result;
}

function safeText(value: string, owner: string): string {
  const result = value.replace(/[\u0000-\u001f\u007f]+/gu, ' ').replace(/\s+/gu, ' ').trim();
  if (result.length === 0) throw new TypeError(`${owner} must contain safe non-empty text.`);
  return result;
}

function sourceDate(value: number, owner: string): string {
  const date = new Date(value * 1000);
  if (!Number.isSafeInteger(value) || Number.isNaN(date.getTime())) throw new TypeError(`${owner} is not a valid Unix timestamp.`);
  return date.toISOString();
}

function opaqueRef(namespace: string, sourceId: string, checksum: string): string {
  return `${namespace}_${createHash('sha256').update(`${checksum}\0${namespace}\0${sourceId}`).digest('hex').slice(0, 24)}`;
}

function decodeEntities(value: string): string {
  return value
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&');
}

function normalizeSummary(value: string): string {
  const summary = safeText(decodeEntities(value.replace(/<[^>]+>/gu, ' ').replace(/[`*_>#\[\]~|-]+/gu, ' ')), 'description');
  return [...summary].slice(0, 280).join('');
}

function normalizeHtmlBlock(value: string): string {
  let result = value;
  if (/<\/?(?:script|iframe|style|object|embed|form)\b/iu.test(result)) throw new TypeError('body contains a prohibited active HTML element.');
  result = result.replace(IMAGE_HTML_PATTERN, (_match, double: string | undefined, single: string | undefined, bare: string | undefined) => `![](${double ?? single ?? bare ?? ''})`);
  result = result.replace(/<a\b[^>]*\bhref=(?:"([^"]+)"|'([^']+)')[^>]*>([\s\S]*?)<\/a>/giu, (_match, double: string | undefined, single: string | undefined, label: string) => `[${label}](${double ?? single ?? ''})`);
  result = result.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/giu, '**$2**');
  result = result.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/giu, '*$2*');
  result = result.replace(/<(del|s)\b[^>]*>([\s\S]*?)<\/\1>/giu, '~~$2~~');
  result = result.replace(/<u\b[^>]*>([\s\S]*?)<\/u>/giu, '$1');
  result = result.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/giu, '`$1`');
  result = result.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/giu, (_match, level: string, body: string) => `\n\n${'#'.repeat(Number(level))} ${body}\n\n`);
  result = result.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/giu, '\n- $1');
  result = result.replace(/<\/?(?:ul|ol|center|span)\b[^>]*>/giu, '');
  result = result.replace(/<\/?(?:p|div)\b[^>]*>/giu, '\n\n');
  result = result.replace(/<br\s*\/?>/giu, '\n').replace(/<hr\s*\/?>/giu, '\n\n---\n\n');
  result = result.replace(/<!--(?:\s*more\s*)?-->/giu, '');
  result = result.replace(/<\/?[a-z][^>]*>/giu, (match) => match.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'));
  return result;
}

function normalizeBody(value: string): string {
  let body = value.replace(/^\uFEFF/u, '').replace(/^\s*<!--\s*markdown\s*-->\s*/iu, '');
  const lines = body.split(/\r?\n/u);
  let fenced = false;
  let outside: string[] = [];
  const normalized: string[] = [];
  const flushOutside = (): void => {
    if (outside.length > 0) normalized.push(normalizeHtmlBlock(outside.join('\n')));
    outside = [];
  };
  for (const line of lines) {
    if (/^\s*(?:```|~~~)/u.test(line)) {
      if (!fenced) flushOutside();
      normalized.push(line);
      fenced = !fenced;
    } else if (fenced) {
      normalized.push(line);
    } else {
      outside.push(line);
    }
  }
  if (!fenced) flushOutside();
  else normalized.push('```');
  body = normalized.join('\n');
  if (RAW_HTML_PATTERN.test(body.split(/^\s*(?:```|~~~).*$/gmu).filter((_part, index) => index % 2 === 0).join('\n'))) throw new TypeError('body contains unsupported raw HTML after wrapper normalization.');
  body = body.replace(/\r\n?/gu, '\n').trim();
  return body.length === 0 ? '' : `${body}\n`;
}

function bodyReferences(body: string): readonly string[] {
  const references = new Set<string>();
  let fenced = false;
  for (const line of body.split('\n')) {
    if (/^\s*(?:```|~~~)/u.test(line)) { fenced = !fenced; continue; }
    if (fenced) continue;
    for (const match of line.matchAll(MARKDOWN_IMAGE_PATTERN)) {
      const reference = match[1];
      if (reference !== undefined && reference.length > 0) references.add(reference);
    }
  }
  return [...references].sort((left, right) => left.localeCompare(right, 'en'));
}

function isDeferredLocalAssetReference(reference: string): boolean {
  if (reference.length === 0 || reference.startsWith('#') || /[\u0000-\u001f\u007f]/u.test(reference)) return false;
  if (/^[A-Za-z]:[\\/]/u.test(reference)) return true;
  if (reference.startsWith('//')) return false;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(reference)) return false;
  return true;
}

function classifyResource(documentRef: string, reference: string, managedResources: ReadonlyMap<string, ManagedResource>): ResourceDecision {
  const managed = managedResources.get(reference);
  if (managed !== undefined) {
    return Object.freeze({ documentRef, reference, disposition: 'managed', publicPath: managed.publicPath, sha256: managed.sha256, size: managed.size, reason: 'Matched a checksum-verified ordinary file in the declared upload manifest.' });
  }
  if (isDeferredLocalAssetReference(reference)) {
    return Object.freeze({ documentRef, reference, disposition: 'deferred', reason: 'Local asset awaits OSS upload.' });
  }
  let parsed: URL;
  try { parsed = new URL(reference); } catch {
    return Object.freeze({ documentRef, reference, disposition: 'exception', reason: 'Local reference requires a checked upload manifest.' });
  }
  if (parsed.protocol === 'https:' && parsed.username === '' && parsed.password === '') {
    return Object.freeze({ documentRef, reference: parsed.href, disposition: 'external', reason: 'Validated credential-free HTTPS reference.' });
  }
  return Object.freeze({ documentRef, reference, disposition: 'exception', reason: 'Only credential-free HTTPS may remain external.' });
}

function fieldsByContent(fields: readonly SourceField[]): ReadonlyMap<string, ReadonlyMap<string, readonly string[]>> {
  const grouped = new Map<string, Map<string, string[]>>();
  for (const field of fields) {
    const names = grouped.get(field.contentId) ?? new Map<string, string[]>();
    const values = names.get(field.name) ?? [];
    values.push(field.value);
    names.set(field.name, values);
    grouped.set(field.contentId, names);
  }
  return grouped;
}

function preferredField(fields: ReadonlyMap<string, readonly string[]> | undefined, name: string): string | undefined {
  const values = fields?.get(name)?.map((value) => value.trim()).filter((value) => value.length > 0) ?? [];
  const unique = [...new Set(values)];
  if (unique.length > 1) throw new TypeError(`custom field ${name} has conflicting values for one document.`);
  return unique[0];
}

function deriveMetadataCandidates(snapshot: SourceSnapshot, currentIds: ReadonlySet<string>): readonly MetadataCandidate[] {
  const names = new Map<string, { current: number; orphan: number }>();
  for (const field of snapshot.fields) {
    const counts = names.get(field.name) ?? { current: 0, orphan: 0 };
    if (currentIds.has(field.contentId)) counts.current += 1;
    else counts.orphan += 1;
    names.set(field.name, counts);
  }
  const baseline = BASE_METADATA.map((candidate) => Object.freeze({ ...candidate, currentCount: snapshot.contents.length, orphanCount: 0 }));
  const custom = [...names.entries()].sort(([left], [right]) => left.localeCompare(right, 'en')).map(([name, counts]) => {
    const policy = FIELD_POLICY[name] ?? { classification: 'rejected' as const, reason: 'Unknown custom field is never promoted automatically.' };
    return Object.freeze({ name: `field:${name}`, ...policy, currentCount: counts.current, orphanCount: counts.orphan });
  });
  return Object.freeze([...baseline, ...custom]);
}

function deriveArticles(snapshot: SourceSnapshot, checksum: string, managedResources: ReadonlyMap<string, ManagedResource>): { readonly articles: readonly ArticleCandidate[]; readonly resources: readonly ResourceDecision[]; readonly exceptions: readonly MigrationException[] } {
  const metas = new Map(snapshot.metas.map((meta) => [meta.sourceId, meta]));
  const relationships = new Map<string, string[]>();
  for (const relationship of snapshot.relationships) {
    const values = relationships.get(relationship.contentId) ?? [];
    values.push(relationship.metaId);
    relationships.set(relationship.contentId, values);
  }
  const groupedFields = fieldsByContent(snapshot.fields);
  const articles: ArticleCandidate[] = [];
  const resources: ResourceDecision[] = [];
  const exceptions: MigrationException[] = [];
  const sourceIds = new Set<string>();
  const pathOwners = new Map<string, string>();
  for (const content of [...snapshot.contents].sort((left, right) => left.sourceId.localeCompare(right.sourceId, 'en'))) {
    if (sourceIds.has(content.sourceId)) throw new TypeError('Source contains a duplicate content identifier.');
    sourceIds.add(content.sourceId);
    if (content.status !== 'publish' || (content.type !== 'post' && content.type !== 'page')) continue;
    const documentRef = opaqueRef('doc', content.sourceId, checksum);
    try {
      const slug = safeSegment(content.slug, `Document ${documentRef} slug`);
      const related = (relationships.get(content.sourceId) ?? []).map((id) => metas.get(id)).filter((meta) => meta !== undefined);
      const categories = related.filter((meta) => meta.type === 'category');
      const tags = related.filter((meta) => meta.type === 'tag').map((meta) => safeText(meta.name, `Document ${documentRef} tag`));
      if (content.type === 'post' && categories.length !== 1) throw new TypeError(`post requires exactly one category relationship; found ${categories.length}.`);
      const category = categories[0];
      if (category !== undefined && category.parentId !== '' && category.parentId !== '0') throw new TypeError('nested source categories require an explicit reviewed folder decision.');
      const categorySlug = category === undefined ? undefined : safeSegment(category.slug, `Document ${documentRef} category slug`);
      const publicPath = content.type === 'post' ? `posts/${categorySlug}/${slug}.md` : `pages/${slug}.md`;
      const key = collisionKey(publicPath);
      const owner = pathOwners.get(key);
      if (owner !== undefined) throw new TypeError(`public path collides with ${owner}.`);
      pathOwners.set(key, documentRef);
      let body = normalizeBody(content.text);
      const customSummary = preferredField(groupedFields.get(content.sourceId), 'customSummary');
      const description = normalizeSummary(customSummary ?? (body.trim() === '' ? content.title : body));
      const date = sourceDate(content.created, `Document ${documentRef} created`);
      const modified = sourceDate(content.modified, `Document ${documentRef} modified`);
      const article = Object.freeze({
        documentRef,
        sourceId: content.sourceId,
        authorIdentityRef: opaqueRef('identity', `user:${content.authorId}`, checksum),
        kind: content.type,
        slug,
        ...(categorySlug === undefined ? {} : { categorySlug, categoryName: safeText(category?.name ?? '', `Document ${documentRef} category`) }),
        template: content.template,
        publicPath,
        canonicalRoute: `/${publicPath.slice(0, -3)}/`,
        title: safeText(content.title, `Document ${documentRef} title`),
        description,
        date,
        ...(content.modified > content.created ? { updated: modified } : {}),
        tags: Object.freeze([...new Set(tags)].sort((left, right) => left.localeCompare(right, 'en'))),
        body
      }) as ArticleCandidate;
      const references = new Set(bodyReferences(body));
      const thumb = preferredField(groupedFields.get(content.sourceId), 'thumb');
      if (thumb !== undefined) references.add(thumb);
      for (const reference of [...references].sort((left, right) => left.localeCompare(right, 'en'))) {
        const decision = classifyResource(documentRef, reference, managedResources);
        resources.push(decision);
        if (decision.disposition === 'managed' && decision.publicPath !== undefined) body = body.replaceAll(reference, decision.publicPath);
      }
      articles.push(Object.freeze({ ...article, body }));
    } catch (error: unknown) {
      exceptions.push(Object.freeze({ kind: content.type, documentRef, code: 'document-invalid', detail: error instanceof Error ? error.message : String(error) }));
    }
  }
  return { articles: Object.freeze(articles.sort((left, right) => left.publicPath.localeCompare(right.publicPath, 'en'))), resources: Object.freeze(resources.sort((left, right) => `${left.documentRef}\0${left.reference}`.localeCompare(`${right.documentRef}\0${right.reference}`, 'en'))), exceptions: Object.freeze(exceptions) };
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function jsonLine(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

function groupedCounts<T extends string>(values: readonly T[]): readonly { readonly value: T; readonly count: number }[] {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Object.freeze([...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right, 'en'))
    .map(([value, count]) => Object.freeze({ value, count })));
}

function reviewReport(result: Omit<MigrationResult, 'ledgerRoot' | 'outputRoot'>): ReviewReport {
  const resourceExceptions = result.resourceDecisions.filter((resource) => resource.disposition === 'exception');
  const exceptionCodes = groupedCounts(result.exceptions.map((exception) => exception.code));
  const reasons = groupedCounts(resourceExceptions.map((resource) => resource.reason));
  const documentsWithExceptions = new Set(resourceExceptions.map((resource) => resource.documentRef)).size;
  const publicReasons = new Set<string>();
  if (result.exceptions.length > 0) publicReasons.add('migration-exceptions');
  if (resourceExceptions.length > 0) publicReasons.add('resource-exceptions');
  return Object.freeze({
    schemaVersion: 1,
    resources: Object.freeze({
      total: result.resourceDecisions.length,
      byDisposition: Object.freeze(groupedCounts(result.resourceDecisions.map((resource) => resource.disposition)).map(({ value, count }) => Object.freeze({ disposition: value, count }))),
      exceptionsByReason: Object.freeze(reasons.map(({ value, count }) => Object.freeze({ reason: value, count }))),
      documentsWithExceptions
    }),
    migrationExceptionsByCode: Object.freeze(exceptionCodes.map(({ value, count }) => Object.freeze({ code: value, count }))),
    publicPromotion: Object.freeze({ blocked: publicReasons.size > 0, reasons: Object.freeze([...publicReasons].sort((left, right) => left.localeCompare(right, 'en'))) })
  });
}

async function privateWrite(file: string, contents: string): Promise<void> {
  await writeFile(file, contents, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
}

function insertLedger(database: DatabaseSync, snapshot: SourceSnapshot, result: Omit<MigrationResult, 'ledgerRoot' | 'outputRoot'>, checksum: string): void {
  database.exec(`
    PRAGMA journal_mode = DELETE;
    PRAGMA foreign_keys = ON;
    CREATE TABLE run (schema_version INTEGER NOT NULL, dump_sha256 TEXT NOT NULL, posts INTEGER NOT NULL, pages INTEGER NOT NULL, comments INTEGER NOT NULL, memos INTEGER NOT NULL);
    CREATE TABLE documents (document_ref TEXT PRIMARY KEY, source_id TEXT NOT NULL, author_identity_ref TEXT NOT NULL, kind TEXT NOT NULL, public_path TEXT NOT NULL, canonical_route TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, date TEXT NOT NULL, updated TEXT, tags_json TEXT NOT NULL, template TEXT NOT NULL, body TEXT NOT NULL);
    CREATE TABLE metadata_candidates (name TEXT PRIMARY KEY, classification TEXT NOT NULL, current_count INTEGER NOT NULL, orphan_count INTEGER NOT NULL, reason TEXT NOT NULL);
    CREATE TABLE comments (comment_ref TEXT PRIMARY KEY, source_id TEXT NOT NULL, document_ref TEXT NOT NULL, parent_ref TEXT, author_identity_ref TEXT, owner_identity_ref TEXT, created INTEGER NOT NULL, author TEXT NOT NULL, mail TEXT NOT NULL, url TEXT NOT NULL, ip TEXT NOT NULL, agent TEXT NOT NULL, body TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL);
    CREATE TABLE identities (identity_ref TEXT PRIMARY KEY, source_kind TEXT NOT NULL, source_id TEXT NOT NULL, name TEXT NOT NULL, display_name TEXT NOT NULL, mail TEXT NOT NULL, url TEXT NOT NULL);
    CREATE TABLE memos (memo_ref TEXT PRIMARY KEY, source_id TEXT NOT NULL, owner_identity_ref TEXT, editor_identity_ref TEXT, title TEXT NOT NULL, body TEXT NOT NULL, alias TEXT NOT NULL, permission TEXT NOT NULL, created TEXT NOT NULL, updated TEXT NOT NULL, deleted TEXT);
    CREATE TABLE identity_policy (owner_alias TEXT NOT NULL, mail_source_field TEXT NOT NULL, url_source_field TEXT NOT NULL, public_fields_json TEXT NOT NULL, private_fields_json TEXT NOT NULL);
    CREATE TABLE resources (document_ref TEXT NOT NULL, reference TEXT NOT NULL, disposition TEXT NOT NULL, public_path TEXT, sha256 TEXT, size INTEGER, reason TEXT NOT NULL, PRIMARY KEY (document_ref, reference));
    CREATE TABLE exceptions (kind TEXT NOT NULL, document_ref TEXT, code TEXT NOT NULL, detail TEXT NOT NULL);
  `);
  database.prepare('INSERT INTO run VALUES (?, ?, ?, ?, ?, ?)').run(1, checksum, result.inventory.posts, result.inventory.pages, result.inventory.comments, result.inventory.memos);
  const documentStatement = database.prepare('INSERT INTO documents VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const article of result.articles) documentStatement.run(article.documentRef, article.sourceId, article.authorIdentityRef, article.kind, article.publicPath, article.canonicalRoute, article.title, article.description, article.date, article.updated ?? null, JSON.stringify(article.tags), article.template, article.body);
  const metadataStatement = database.prepare('INSERT INTO metadata_candidates VALUES (?, ?, ?, ?, ?)');
  for (const candidate of result.metadataCandidates) metadataStatement.run(candidate.name, candidate.classification, candidate.currentCount, candidate.orphanCount, candidate.reason);
  const identityStatement = database.prepare('INSERT INTO identities VALUES (?, ?, ?, ?, ?, ?, ?)');
  const identityRefs = new Set<string>();
  const addIdentity = (sourceKey: string, sourceKind: string, sourceId: string, name: string, displayName: string, mail: string, url: string): string => {
    const identityRef = opaqueRef('identity', sourceKey, checksum);
    if (!identityRefs.has(identityRef)) {
      identityStatement.run(identityRef, sourceKind, sourceId, name, displayName, mail, url);
      identityRefs.add(identityRef);
    }
    return identityRef;
  };
  for (const user of snapshot.users) addIdentity(`user:${user.sourceId}`, 'user', user.sourceId, user.name, user.displayName, user.mail, user.url);
  for (const content of snapshot.contents) {
    if (content.authorId !== '' && content.authorId !== '0') addIdentity(`user:${content.authorId}`, 'user', content.authorId, '', '', '', '');
  }
  const commentAuthorKeys = new Map<string, string>();
  for (const comment of snapshot.comments) {
    const anonymousId = createHash('sha256').update(`${comment.author}\0${comment.mail}\0${comment.url}`).digest('hex');
    const authorKey = comment.authorId === '' || comment.authorId === '0' ? `comment-anonymous:${anonymousId}` : `user:${comment.authorId}`;
    commentAuthorKeys.set(comment.sourceId, authorKey);
    addIdentity(authorKey, comment.authorId === '' || comment.authorId === '0' ? 'comment-anonymous' : 'user', comment.authorId === '' || comment.authorId === '0' ? anonymousId : comment.authorId, comment.author, comment.author, comment.mail, comment.url);
    if (comment.ownerId !== '' && comment.ownerId !== '0') addIdentity(`user:${comment.ownerId}`, 'user', comment.ownerId, '', '', '', '');
  }
  for (const memo of snapshot.memos) {
    if (memo.ownerId !== '') addIdentity(`memo-user:${memo.ownerId}`, 'memo-user', memo.ownerId, '', '', '', '');
    if (memo.lastEditorId !== '') addIdentity(`memo-user:${memo.lastEditorId}`, 'memo-user', memo.lastEditorId, '', '', '', '');
  }
  database.prepare('INSERT INTO identity_policy VALUES (?, ?, ?, ?, ?)').run('wkyuu', 'mail', 'url', JSON.stringify(['displayName', 'url']), JSON.stringify(['mail', 'ip', 'agent', 'rawIdentity']));
  const commentStatement = database.prepare('INSERT INTO comments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const comment of snapshot.comments) commentStatement.run(opaqueRef('comment', comment.sourceId, checksum), comment.sourceId, opaqueRef('doc', comment.contentId, checksum), comment.parentId === '' || comment.parentId === '0' ? null : opaqueRef('comment', comment.parentId, checksum), opaqueRef('identity', commentAuthorKeys.get(comment.sourceId) ?? `comment-anonymous:${comment.sourceId}`, checksum), comment.ownerId === '' || comment.ownerId === '0' ? null : opaqueRef('identity', `user:${comment.ownerId}`, checksum), comment.created, comment.author, comment.mail, comment.url, comment.ip, comment.agent, comment.text, comment.type, comment.status);
  const memoStatement = database.prepare('INSERT INTO memos VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const memo of snapshot.memos) memoStatement.run(opaqueRef('memo', memo.sourceId, checksum), memo.sourceId, memo.ownerId === '' ? null : opaqueRef('identity', `memo-user:${memo.ownerId}`, checksum), memo.lastEditorId === '' ? null : opaqueRef('identity', `memo-user:${memo.lastEditorId}`, checksum), memo.title, memo.body, memo.alias, memo.permission, memo.created, memo.updated, memo.deleted);
  const resourceStatement = database.prepare('INSERT INTO resources VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const resource of result.resourceDecisions) resourceStatement.run(resource.documentRef, resource.reference, resource.disposition, resource.publicPath ?? null, resource.sha256 ?? null, resource.size ?? null, resource.reason);
  const exceptionStatement = database.prepare('INSERT INTO exceptions VALUES (?, ?, ?, ?)');
  for (const exception of result.exceptions) exceptionStatement.run(exception.kind, exception.documentRef ?? null, exception.code, exception.detail);
}

async function writeLedger(candidate: string, snapshot: SourceSnapshot, result: Omit<MigrationResult, 'ledgerRoot' | 'outputRoot'>, checksum: string): Promise<void> {
  await mkdir(candidate, { recursive: true, mode: 0o700 });
  const databasePath = path.join(candidate, 'migration.sqlite');
  const database = new DatabaseSync(databasePath);
  try { insertLedger(database, snapshot, result, checksum); } finally { database.close(); }
  await chmod(databasePath, 0o600);
  const publicArticleManifest = result.articles.map(({ documentRef, kind, slug, categorySlug, categoryName, template, publicPath, canonicalRoute, tags }) => ({ documentRef, kind, slug, ...(categorySlug === undefined ? {} : { categorySlug, categoryName }), template, publicPath, canonicalRoute, tags }));
  await privateWrite(path.join(candidate, 'inventory.json'), json(result.inventory));
  await privateWrite(path.join(candidate, 'article-manifest.json'), json({ schemaVersion: 1, articles: publicArticleManifest }));
  await privateWrite(path.join(candidate, 'metadata-candidates.json'), json({ schemaVersion: 1, candidates: result.metadataCandidates }));
  await privateWrite(path.join(candidate, 'resource-decisions.json'), json({ schemaVersion: 1, resources: result.resourceDecisions }));
  await privateWrite(path.join(candidate, 'exceptions.json'), json({ schemaVersion: 1, exceptions: result.exceptions }));
  await privateWrite(path.join(candidate, 'review-report.json'), json(reviewReport(result)));
  await privateWrite(path.join(candidate, 'comment-handoff.json'), json({ schemaVersion: 1, count: snapshot.comments.length, fields: ['documentRef', 'parentRef', 'authorIdentityRef', 'ownerIdentityRef', 'created', 'type', 'status', 'author', 'mail', 'url', 'ip', 'agent', 'body'], privacy: 'Raw comment and identity values remain only in the private SQLite ledger.' }));
  await privateWrite(path.join(candidate, 'identity-handoff.json'), json({ schemaVersion: 1, sourceUsers: snapshot.users.length, proposedOwnerAlias: 'wkyuu', sourceFieldPolicy: { mail: 'private', url: 'candidate-for-owner-review' }, publicPolicy: { approvedFields: ['displayName', 'url'], rejectedFields: ['mail', 'ip', 'agent', 'rawIdentity'] } }));
  const memoLines = [...snapshot.memos].sort((left, right) => left.sourceId.localeCompare(right.sourceId, 'en')).map((memo) => jsonLine({ schemaVersion: 1, memoRef: opaqueRef('memo', memo.sourceId, checksum), ownerIdentityRef: memo.ownerId === '' ? null : opaqueRef('identity', `memo-user:${memo.ownerId}`, checksum), editorIdentityRef: memo.lastEditorId === '' ? null : opaqueRef('identity', `memo-user:${memo.lastEditorId}`, checksum), title: memo.title, body: memo.body, alias: memo.alias, permission: memo.permission, created: memo.created, updated: memo.updated, deleted: memo.deleted })).join('');
  await privateWrite(path.join(candidate, 'memos.private.jsonl'), memoLines);
}

function markdown(article: ArticleCandidate): string {
  const frontmatter: Record<string, unknown> = {
    title: article.title,
    description: article.description,
    date: article.date,
    ...(article.updated === undefined ? {} : { updated: article.updated }),
    tags: article.tags,
    draft: false,
    layout: article.kind,
    presentation: 'semantic',
    ...(article.kind === 'page' ? { slug: article.slug } : {})
  };
  const lines = Object.entries(frontmatter).map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
  return `---\n${lines.join('\n')}\n---\n\n${article.body}`;
}

async function writePublicCandidate(
  candidate: string,
  articles: readonly ArticleCandidate[],
  managedResources: ReadonlyMap<string, ManagedResource>
): Promise<void> {
  await mkdir(candidate, { recursive: true, mode: 0o755 });
  for (const article of articles) {
    const destination = path.join(candidate, ...article.publicPath.split('/'));
    await mkdir(path.dirname(destination), { recursive: true, mode: 0o755 });
    await writeFile(destination, markdown(article), { encoding: 'utf8', mode: 0o644, flag: 'wx' });
  }
  const copied = new Set<string>();
  for (const resource of managedResources.values()) {
    if (copied.has(resource.publicPath)) continue;
    copied.add(resource.publicPath);
    const sourceStats = await lstat(resource.sourceAbsolutePath).catch(() => undefined);
    if (sourceStats === undefined || !sourceStats.isFile() || sourceStats.isSymbolicLink()) {
      throw new TypeError(`Managed resource source changed: ${resource.sourcePath}`);
    }
    if (sourceStats.size !== resource.size || await hashFile(resource.sourceAbsolutePath) !== resource.sha256) {
      throw new TypeError(`Managed resource checksum changed: ${resource.sourcePath}`);
    }
    const destination = path.join(candidate, ...resource.publicPath.slice(1).split('/'));
    await mkdir(path.dirname(destination), { recursive: true, mode: 0o755 });
    await copyFile(resource.sourceAbsolutePath, destination, fsConstants.COPYFILE_EXCL);
    await chmod(destination, 0o644);
  }
}

async function promoteDirectory(candidate: string, target: string): Promise<void> {
  const backup = `${target}.backup-${process.pid}-${Date.now()}`;
  let backedUp = false;
  try {
    const prior = await lstat(target).catch(() => undefined);
    if (prior !== undefined) {
      if (!prior.isDirectory() || prior.isSymbolicLink()) throw new TypeError(`Promotion target ${target} must be an ordinary directory.`);
      await rename(target, backup);
      backedUp = true;
    }
    await rename(candidate, target);
    if (backedUp) await rm(backup, { recursive: true, force: true });
  } catch (error: unknown) {
    await rm(candidate, { recursive: true, force: true });
    const promoted = await lstat(target).catch(() => undefined);
    if (promoted !== undefined && backedUp) await rm(target, { recursive: true, force: true });
    if (backedUp) await rename(backup, target);
    throw error;
  }
}

async function assertOrdinaryFile(file: string, label: string): Promise<string> {
  const absolute = path.resolve(file);
  const stats = await lstat(absolute);
  if (!stats.isFile() || stats.isSymbolicLink()) throw new TypeError(`${label} must be an ordinary file.`);
  const resolved = await realpath(absolute);
  if (resolved !== absolute) throw new TypeError(`${label} must not traverse symbolic links.`);
  return absolute;
}

async function assertOrdinaryDirectory(directory: string, label: string): Promise<string> {
  const absolute = path.resolve(directory);
  const stats = await lstat(absolute);
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw new TypeError(`${label} must be an ordinary directory.`);
  const resolved = await realpath(absolute);
  if (resolved !== absolute) throw new TypeError(`${label} must not traverse symbolic links.`);
  return absolute;
}

async function assertNoSymlinkPath(candidate: string, stop: string): Promise<void> {
  let current = path.resolve(candidate);
  const boundary = path.resolve(stop);
  if (!contained(boundary, current)) throw new TypeError('Path is outside its declared boundary.');
  while (contained(boundary, current)) {
    const stats = await lstat(current).catch(() => undefined);
    if (stats?.isSymbolicLink()) throw new TypeError(`Path ${candidate} traverses a symbolic link.`);
    if (current === boundary) break;
    current = path.dirname(current);
  }
}

async function hashFile(file: string): Promise<string> {
  return createHash('sha256').update(await readFile(file)).digest('hex');
}

async function loadManagedResources(uploadsRootOption: string | undefined, manifestPathOption: string | undefined): Promise<ReadonlyMap<string, ManagedResource>> {
  if ((uploadsRootOption === undefined) !== (manifestPathOption === undefined)) throw new TypeError('uploadsRoot and resourceManifestPath must be supplied together.');
  if (uploadsRootOption === undefined || manifestPathOption === undefined) return new Map();
  const uploadsRoot = await assertOrdinaryDirectory(uploadsRootOption, 'Uploads root');
  const manifestPath = await assertOrdinaryFile(manifestPathOption, 'Resource manifest');
  let value: unknown;
  try { value = JSON.parse(await readFile(manifestPath, 'utf8')); } catch { throw new TypeError('Resource manifest must contain valid JSON.'); }
  if (typeof value !== 'object' || value === null || Object.getPrototypeOf(value) !== Object.prototype) throw new TypeError('Resource manifest must be a plain object.');
  const manifest = value as Record<string, unknown>;
  if (Object.keys(manifest).sort().join(',') !== 'entries,schemaVersion' || manifest.schemaVersion !== 1 || !Array.isArray(manifest.entries)) throw new TypeError('Resource manifest must match the exact v1 schema.');
  const resources = new Map<string, ManagedResource>();
  const publicPathOwners = new Map<string, string>();
  for (const [index, item] of manifest.entries.entries()) {
    if (typeof item !== 'object' || item === null || Object.getPrototypeOf(item) !== Object.prototype) throw new TypeError(`Resource manifest entry ${index} must be a plain object.`);
    const entry = item as Record<string, unknown>;
    if (Object.keys(entry).sort().join(',') !== 'reference,sha256,size,sourcePath') throw new TypeError(`Resource manifest entry ${index} has unknown or missing fields.`);
    if (typeof entry.reference !== 'string' || entry.reference.trim() !== entry.reference || entry.reference.length === 0) throw new TypeError(`Resource manifest entry ${index} reference is invalid.`);
    if (typeof entry.sourcePath !== 'string' || path.posix.normalize(entry.sourcePath) !== entry.sourcePath || path.isAbsolute(entry.sourcePath) || entry.sourcePath.split('/').some((part) => part === '' || part === '.' || part === '..')) throw new TypeError(`Resource manifest entry ${index} sourcePath is invalid.`);
    if (typeof entry.sha256 !== 'string' || !SHA256_PATTERN.test(entry.sha256)) throw new TypeError(`Resource manifest entry ${index} sha256 is invalid.`);
    if (typeof entry.size !== 'number' || !Number.isSafeInteger(entry.size) || entry.size < 0) throw new TypeError(`Resource manifest entry ${index} size is invalid.`);
    if (resources.has(entry.reference)) throw new TypeError(`Resource manifest contains duplicate reference ${entry.reference}.`);
    const source = path.resolve(uploadsRoot, ...entry.sourcePath.split('/'));
    if (!contained(uploadsRoot, source)) throw new TypeError(`Resource manifest entry ${index} escapes the uploads root.`);
    const ordinarySource = await assertOrdinaryFile(source, `Resource manifest entry ${index} source`);
    const stats = await lstat(ordinarySource);
    if (stats.size !== entry.size) throw new TypeError(`Resource manifest entry ${index} size does not match.`);
    if (await hashFile(ordinarySource) !== entry.sha256) throw new TypeError(`Resource manifest entry ${index} SHA-256 does not match.`);
    const basename = safeSegment(path.posix.basename(entry.sourcePath), `Resource manifest entry ${index} basename`);
    const publicPath = `/assets/migrated/${entry.sha256.slice(0, 20)}-${basename}`;
    const publicOwner = publicPathOwners.get(publicPath);
    if (publicOwner !== undefined) throw new TypeError(`Resource manifest entries ${publicOwner} and ${index} collide at ${publicPath}.`);
    publicPathOwners.set(publicPath, String(index));
    resources.set(entry.reference, Object.freeze({ reference: entry.reference, sourceAbsolutePath: ordinarySource, sourcePath: entry.sourcePath, publicPath, sha256: entry.sha256, size: entry.size }));
  }
  return resources;
}

export async function migrateTypecho(options: MigrationOptions): Promise<MigrationResult> {
  if (options.materializePublic === true && options.materializeCandidate === true) throw new TypeError('Choose either public or private-candidate materialization.');
  if (options.materializePublic !== true && options.materializeCandidate !== true && options.outputRoot !== undefined) throw new TypeError('outputRoot requires explicit materialization.');
  const repositoryRoot = await realpath(path.resolve(options.repositoryRoot));
  const privateRoot = path.join(repositoryRoot, '.private');
  const dumpPath = await assertOrdinaryFile(options.dumpPath, 'Dump');
  if (!contained(privateRoot, dumpPath) || dumpPath === privateRoot) throw new TypeError('Dump must be below the repository .private directory.');
  await assertNoSymlinkPath(dumpPath, repositoryRoot);
  if (!SHA256_PATTERN.test(options.expectedSha256)) throw new TypeError('Expected SHA-256 must be 64 lowercase hexadecimal characters.');
  const checksum = await hashFile(dumpPath);
  if (checksum !== options.expectedSha256) throw new TypeError('Dump SHA-256 does not match the declared checksum.');
  const ledgerRoot = path.resolve(options.ledgerRoot);
  if (!contained(privateRoot, ledgerRoot) || ledgerRoot === privateRoot) throw new TypeError('Ledger root must be a descendant of the repository .private directory.');
  await assertNoSymlinkPath(ledgerRoot, repositoryRoot);
  let adapterCommand: string | undefined;
  if (options.adapterCommand !== undefined) {
    adapterCommand = await assertOrdinaryFile(options.adapterCommand, 'Adapter command');
    if (!contained(repositoryRoot, adapterCommand)) throw new TypeError('Adapter command must be inside the repository.');
    await assertNoSymlinkPath(adapterCommand, repositoryRoot);
  }
  for (const [candidate, label] of [[options.uploadsRoot, 'Uploads root'], [options.resourceManifestPath, 'Resource manifest']] as const) {
    if (candidate === undefined) continue;
    const absolute = path.resolve(candidate);
    if (!contained(privateRoot, absolute) || absolute === privateRoot) throw new TypeError(`${label} must be below the repository .private directory.`);
    await assertNoSymlinkPath(absolute, repositoryRoot);
  }
  const managedResources = await loadManagedResources(options.uploadsRoot, options.resourceManifestPath);
  const snapshot = adapterCommand === undefined ? await readSqlSnapshot(dumpPath) : await readAdapterSnapshot({ command: adapterCommand, dumpPath, sha256: checksum });
  const currentIds = new Set(snapshot.contents.map((content) => content.sourceId));
  const derived = deriveArticles(snapshot, checksum, managedResources);
  const metadataCandidates = deriveMetadataCandidates(snapshot, currentIds);
  const posts = derived.articles.filter((article) => article.kind === 'post').length;
  const pages = derived.articles.filter((article) => article.kind === 'page').length;
  const exceptions = [...derived.exceptions];
  for (const resource of derived.resources) {
    if (resource.disposition === 'exception') {
      exceptions.push(Object.freeze({ kind: 'resource', documentRef: resource.documentRef, code: 'resource-unresolved', detail: resource.reason }));
    }
  }
  const expectedPosts = options.expectedPosts ?? 93;
  const expectedPages = options.expectedPages ?? 7;
  if (posts !== expectedPosts) exceptions.push({ kind: 'inventory', code: 'post-count', detail: `Expected ${expectedPosts} publishable posts; derived ${posts}.` });
  if (pages !== expectedPages) exceptions.push({ kind: 'inventory', code: 'page-count', detail: `Expected ${expectedPages} publishable pages; derived ${pages}.` });
  const currentFields = snapshot.fields.filter((field) => currentIds.has(field.contentId)).length;
  const inventory = Object.freeze({ schemaVersion: 1 as const, posts, pages, draftsOrUnsupported: snapshot.contents.length - posts - pages, categories: snapshot.metas.filter((meta) => meta.type === 'category').length, usedTags: new Set(snapshot.relationships.map((relationship) => snapshot.metas.find((meta) => meta.sourceId === relationship.metaId)).filter((meta) => meta?.type === 'tag').map((meta) => meta?.slug)).size, currentFields, orphanFields: snapshot.fields.length - currentFields, comments: snapshot.comments.length, users: snapshot.users.length, memos: snapshot.memos.length, resources: derived.resources.length, resourceDeferred: derived.resources.filter((resource) => resource.disposition === 'deferred').length, resourceExceptions: derived.resources.filter((resource) => resource.disposition === 'exception').length, exceptions: exceptions.length });
  const privateResult = Object.freeze({ inventory, articles: derived.articles, metadataCandidates, resourceDecisions: derived.resources, exceptions: Object.freeze(exceptions) });
  const ledgerCandidate = `${ledgerRoot}.candidate-${process.pid}-${Date.now()}`;
  await rm(ledgerCandidate, { recursive: true, force: true });
  try {
    await writeLedger(ledgerCandidate, snapshot, privateResult, checksum);
    await promoteDirectory(ledgerCandidate, ledgerRoot);
  } catch (error: unknown) {
    await rm(ledgerCandidate, { recursive: true, force: true });
    throw error;
  }
  let outputRoot: string | undefined;
  if (options.materializePublic === true || options.materializeCandidate === true) {
    if (options.outputRoot === undefined) throw new TypeError('Public materialization requires outputRoot.');
    outputRoot = path.resolve(options.outputRoot);
    const contentRoot = path.join(repositoryRoot, 'content');
    const privateCandidates = path.join(ledgerRoot, 'candidates');
    const publicTarget = contained(contentRoot, outputRoot) && outputRoot !== contentRoot;
    const privateTarget = contained(privateCandidates, outputRoot) && outputRoot !== privateCandidates;
    if (options.materializePublic === true && !publicTarget) throw new TypeError('Public output root must be below repository content.');
    if (options.materializeCandidate === true && !privateTarget) throw new TypeError('Private candidate output root must be below the ledger candidates directory.');
    if (options.materializePublic === true) {
      if (exceptions.length > 0) throw new TypeError('Public materialization is blocked while migration exceptions remain.');
      if (derived.resources.some((resource) => resource.disposition === 'exception')) throw new TypeError('Public materialization is blocked while resource exceptions remain.');
    }
    await assertNoSymlinkPath(outputRoot, repositoryRoot);
    const outputCandidate = `${outputRoot}.candidate-${process.pid}-${Date.now()}`;
    await rm(outputCandidate, { recursive: true, force: true });
    try {
      await writePublicCandidate(outputCandidate, derived.articles, managedResources);
      await promoteDirectory(outputCandidate, outputRoot);
    } catch (error: unknown) {
      await rm(outputCandidate, { recursive: true, force: true });
      throw error;
    }
  }
  return Object.freeze({ ...privateResult, ledgerRoot, ...(outputRoot === undefined ? {} : { outputRoot }) });
}

export function holdOpenNoFollow(file: string): () => void {
  const descriptor = openSync(file, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  return () => closeSync(descriptor);
}

export type { SourceSnapshot } from './source.js';
export { decodeSourceSnapshot, parseTypechoSql } from './source.js';
