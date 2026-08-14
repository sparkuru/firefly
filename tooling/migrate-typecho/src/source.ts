import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

export interface SourceContent {
  readonly sourceId: string;
  readonly authorId: string;
  readonly title: string;
  readonly slug: string;
  readonly created: number;
  readonly modified: number;
  readonly text: string;
  readonly template: string;
  readonly type: string;
  readonly status: string;
  readonly parentId: string;
  readonly counters: Readonly<Record<string, number>>;
}

export interface SourceMeta {
  readonly sourceId: string;
  readonly name: string;
  readonly slug: string;
  readonly type: string;
  readonly description: string;
  readonly parentId: string;
}

export interface SourceRelationship {
  readonly contentId: string;
  readonly metaId: string;
}

export interface SourceField {
  readonly contentId: string;
  readonly name: string;
  readonly value: string;
}

export interface SourceComment {
  readonly sourceId: string;
  readonly contentId: string;
  readonly created: number;
  readonly author: string;
  readonly authorId: string;
  readonly ownerId: string;
  readonly mail: string;
  readonly url: string;
  readonly ip: string;
  readonly agent: string;
  readonly text: string;
  readonly type: string;
  readonly status: string;
  readonly parentId: string;
}

export interface SourceUser {
  readonly sourceId: string;
  readonly name: string;
  readonly displayName: string;
  readonly mail: string;
  readonly url: string;
}

export interface SourceMemo {
  readonly sourceId: string;
  readonly ownerId: string;
  readonly lastEditorId: string;
  readonly title: string;
  readonly body: string;
  readonly alias: string;
  readonly permission: string;
  readonly created: string;
  readonly updated: string;
  readonly deleted: string | null;
}

export interface SourceSnapshot {
  readonly schemaVersion: 1;
  readonly contents: readonly SourceContent[];
  readonly metas: readonly SourceMeta[];
  readonly relationships: readonly SourceRelationship[];
  readonly fields: readonly SourceField[];
  readonly comments: readonly SourceComment[];
  readonly users: readonly SourceUser[];
  readonly memos: readonly SourceMemo[];
}

type SqlValue = string | null;
type SqlRow = Readonly<Record<string, SqlValue>>;

const STANDARD_COLUMNS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  typecho_contents: ['cid', 'title', 'slug', 'created', 'modified', 'text', 'order', 'authorId', 'template', 'type', 'status', 'password', 'commentsNum', 'allowComment', 'allowPing', 'allowFeed', 'parent', 'views', 'stars'],
  typecho_fields: ['cid', 'name', 'type', 'str_value', 'int_value', 'float_value'],
  typecho_metas: ['mid', 'name', 'slug', 'type', 'description', 'count', 'order', 'parent'],
  typecho_relationships: ['cid', 'mid'],
  typecho_comments: ['coid', 'cid', 'created', 'author', 'authorId', 'ownerId', 'mail', 'url', 'ip', 'agent', 'text', 'type', 'status', 'parent'],
  typecho_users: ['uid', 'name', 'password', 'mail', 'url', 'screenName', 'created', 'activated', 'logged', 'group', 'authCode']
});

function fail(owner: string, message: string): never {
  throw new TypeError(`${owner}: ${message}`);
}

function plainObject(value: unknown, owner: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Object.getPrototypeOf(value) !== Object.prototype) {
    fail(owner, 'must be a plain object.');
  }
  return value as Record<string, unknown>;
}

function exactObject(value: unknown, owner: string, fields: readonly string[]): Record<string, unknown> {
  const object = plainObject(value, owner);
  const allowed = new Set(fields);
  for (const key of Object.keys(object)) {
    if (!allowed.has(key)) fail(owner, `unknown field "${key}".`);
  }
  for (const key of fields) {
    if (!Object.hasOwn(object, key)) fail(owner, `missing field "${key}".`);
  }
  return object;
}

function denseArray(value: unknown, owner: string): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    fail(owner, 'must be a plain array.');
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) fail(owner, 'must be dense.');
  }
  return value;
}

function text(value: unknown, owner: string, allowEmpty = true): string {
  if (typeof value !== 'string' || /\0/u.test(value) || (!allowEmpty && value.trim().length === 0)) {
    fail(owner, `must be ${allowEmpty ? '' : 'non-empty '}text.`);
  }
  return value;
}

function nullableText(value: unknown, owner: string): string | null {
  return value === null ? null : text(value, owner);
}

function integer(value: unknown, owner: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) fail(owner, 'must be a safe integer.');
  return value;
}

function recordOfIntegers(value: unknown, owner: string): Readonly<Record<string, number>> {
  const object = plainObject(value, owner);
  const result: Record<string, number> = {};
  for (const [key, item] of Object.entries(object)) result[key] = integer(item, `${owner}.${key}`);
  return Object.freeze(result);
}

function decodeRows<T>(value: unknown, owner: string, decode: (item: unknown, itemOwner: string) => T): readonly T[] {
  return Object.freeze(denseArray(value, owner).map((item, index) => Object.freeze(decode(item, `${owner}[${index}]`))));
}

export function decodeSourceSnapshot(value: unknown): SourceSnapshot {
  const source = exactObject(value, 'source', ['schemaVersion', 'contents', 'metas', 'relationships', 'fields', 'comments', 'users', 'memos']);
  if (source.schemaVersion !== 1) fail('source.schemaVersion', 'must equal 1.');
  return Object.freeze({
    schemaVersion: 1,
    contents: decodeRows(source.contents, 'source.contents', (item, owner) => {
      const row = exactObject(item, owner, ['sourceId', 'authorId', 'title', 'slug', 'created', 'modified', 'text', 'template', 'type', 'status', 'parentId', 'counters']);
      return { sourceId: text(row.sourceId, `${owner}.sourceId`, false), authorId: text(row.authorId, `${owner}.authorId`), title: text(row.title, `${owner}.title`, false), slug: text(row.slug, `${owner}.slug`, false), created: integer(row.created, `${owner}.created`), modified: integer(row.modified, `${owner}.modified`), text: text(row.text, `${owner}.text`), template: text(row.template, `${owner}.template`), type: text(row.type, `${owner}.type`, false), status: text(row.status, `${owner}.status`, false), parentId: text(row.parentId, `${owner}.parentId`), counters: recordOfIntegers(row.counters, `${owner}.counters`) };
    }),
    metas: decodeRows(source.metas, 'source.metas', (item, owner) => {
      const row = exactObject(item, owner, ['sourceId', 'name', 'slug', 'type', 'description', 'parentId']);
      return { sourceId: text(row.sourceId, `${owner}.sourceId`, false), name: text(row.name, `${owner}.name`, false), slug: text(row.slug, `${owner}.slug`, false), type: text(row.type, `${owner}.type`, false), description: text(row.description, `${owner}.description`), parentId: text(row.parentId, `${owner}.parentId`) };
    }),
    relationships: decodeRows(source.relationships, 'source.relationships', (item, owner) => {
      const row = exactObject(item, owner, ['contentId', 'metaId']);
      return { contentId: text(row.contentId, `${owner}.contentId`, false), metaId: text(row.metaId, `${owner}.metaId`, false) };
    }),
    fields: decodeRows(source.fields, 'source.fields', (item, owner) => {
      const row = exactObject(item, owner, ['contentId', 'name', 'value']);
      return { contentId: text(row.contentId, `${owner}.contentId`, false), name: text(row.name, `${owner}.name`, false), value: text(row.value, `${owner}.value`) };
    }),
    comments: decodeRows(source.comments, 'source.comments', (item, owner) => {
      const row = exactObject(item, owner, ['sourceId', 'contentId', 'created', 'author', 'authorId', 'ownerId', 'mail', 'url', 'ip', 'agent', 'text', 'type', 'status', 'parentId']);
      return { sourceId: text(row.sourceId, `${owner}.sourceId`, false), contentId: text(row.contentId, `${owner}.contentId`, false), created: integer(row.created, `${owner}.created`), author: text(row.author, `${owner}.author`), authorId: text(row.authorId, `${owner}.authorId`), ownerId: text(row.ownerId, `${owner}.ownerId`), mail: text(row.mail, `${owner}.mail`), url: text(row.url, `${owner}.url`), ip: text(row.ip, `${owner}.ip`), agent: text(row.agent, `${owner}.agent`), text: text(row.text, `${owner}.text`), type: text(row.type, `${owner}.type`), status: text(row.status, `${owner}.status`), parentId: text(row.parentId, `${owner}.parentId`) };
    }),
    users: decodeRows(source.users, 'source.users', (item, owner) => {
      const row = exactObject(item, owner, ['sourceId', 'name', 'displayName', 'mail', 'url']);
      return { sourceId: text(row.sourceId, `${owner}.sourceId`, false), name: text(row.name, `${owner}.name`), displayName: text(row.displayName, `${owner}.displayName`), mail: text(row.mail, `${owner}.mail`), url: text(row.url, `${owner}.url`) };
    }),
    memos: decodeRows(source.memos, 'source.memos', (item, owner) => {
      const row = exactObject(item, owner, ['sourceId', 'ownerId', 'lastEditorId', 'title', 'body', 'alias', 'permission', 'created', 'updated', 'deleted']);
      return { sourceId: text(row.sourceId, `${owner}.sourceId`, false), ownerId: text(row.ownerId, `${owner}.ownerId`), lastEditorId: text(row.lastEditorId, `${owner}.lastEditorId`), title: text(row.title, `${owner}.title`), body: text(row.body, `${owner}.body`), alias: text(row.alias, `${owner}.alias`), permission: text(row.permission, `${owner}.permission`, false), created: text(row.created, `${owner}.created`, false), updated: text(row.updated, `${owner}.updated`, false), deleted: nullableText(row.deleted, `${owner}.deleted`) };
    })
  });
}

function unescapeSql(value: string): string {
  return value.replace(/\\([0bnrtZ'"\\])/gu, (_match, escaped: string) => ({
    '0': '\0', b: '\b', n: '\n', r: '\r', t: '\t', Z: '\u001a', "'": "'", '"': '"', '\\': '\\'
  })[escaped] ?? escaped);
}

function splitSqlList(value: string): readonly string[] {
  const result: string[] = [];
  let start = 0;
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value.charAt(index);
    if (escaped) { escaped = false; continue; }
    if (quoted && character === '\\') { escaped = true; continue; }
    if (character === "'") { quoted = !quoted; continue; }
    if (!quoted && character === ',') { result.push(value.slice(start, index).trim()); start = index + 1; }
  }
  if (quoted) fail('SQL', 'contains an unterminated string.');
  result.push(value.slice(start).trim());
  return result;
}

function parseSqlValue(value: string): SqlValue {
  if (/^NULL$/iu.test(value)) return null;
  if (value.startsWith("'") && value.endsWith("'")) return unescapeSql(value.slice(1, -1));
  if (value.startsWith('"') && value.endsWith('"')) return unescapeSql(value.slice(1, -1));
  if (/^-?\d+(?:\.\d+)?$/u.test(value)) return value;
  fail('SQL', 'contains an unsupported value literal.');
}

function parseValueTuples(value: string): readonly (readonly SqlValue[])[] {
  const rows: SqlValue[][] = [];
  let start = -1;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value.charAt(index);
    if (escaped) { escaped = false; continue; }
    if (quoted && character === '\\') { escaped = true; continue; }
    if (character === "'") { quoted = !quoted; continue; }
    if (quoted) continue;
    if (character === '(') { if (depth === 0) start = index + 1; depth += 1; continue; }
    if (character === ')') {
      depth -= 1;
      if (depth < 0 || start < 0) fail('SQL', 'contains malformed value tuples.');
      if (depth === 0) rows.push(splitSqlList(value.slice(start, index)).map(parseSqlValue));
      continue;
    }
    if (depth === 0 && !/[\s,;]/u.test(character)) fail('SQL', 'contains data outside value tuples.');
  }
  if (quoted || depth !== 0) fail('SQL', 'contains an unterminated value tuple.');
  return rows;
}

function scanStatements(sql: string, prefix: string): readonly string[] {
  const result: string[] = [];
  let cursor = 0;
  const startPattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}[ \\t]`, 'gmu');
  while (cursor < sql.length) {
    startPattern.lastIndex = cursor;
    const startMatch = startPattern.exec(sql);
    if (startMatch === null) break;
    const start = startMatch.index;
    let quoted = false;
    let doubleQuoted = false;
    let escaped = false;
    let backticked = false;
    let end = start;
    for (; end < sql.length; end += 1) {
      const character = sql.charAt(end);
      if (escaped) { escaped = false; continue; }
      if ((quoted || doubleQuoted) && character === '\\') { escaped = true; continue; }
      if (!doubleQuoted && !backticked && character === "'") { quoted = !quoted; continue; }
      if (!quoted && !backticked && character === '"') { doubleQuoted = !doubleQuoted; continue; }
      if (!quoted && !doubleQuoted && character === '`') { backticked = !backticked; continue; }
      if (!quoted && !doubleQuoted && !backticked && character === ';') { end += 1; break; }
    }
    if (quoted || doubleQuoted || backticked || end > sql.length) fail('SQL', `contains an unterminated ${prefix.trim()} statement.`);
    result.push(sql.slice(start, end));
    cursor = end;
  }
  return result;
}

function suffixTable(table: string): string | undefined {
  const known = ['typecho_contents', 'typecho_fields', 'typecho_metas', 'typecho_relationships', 'typecho_comments', 'typecho_users'];
  const lower = table.toLowerCase();
  return known.find((name) => lower === name || lower.endsWith(`_${name}`)) ?? (lower === 'notes' ? 'notes' : undefined);
}

function rowValue(row: SqlRow, names: readonly string[], fallback = ''): string {
  for (const name of names) {
    const value = row[name.toLowerCase()];
    if (value !== undefined && value !== null) return value;
  }
  return fallback;
}

function numberValue(row: SqlRow, names: readonly string[]): number {
  const value = rowValue(row, names, '0');
  const result = Number(value);
  if (!Number.isSafeInteger(result)) fail('SQL', `field ${names[0] ?? 'number'} must be a safe integer.`);
  return result;
}

export function parseTypechoSql(sql: string): SourceSnapshot {
  const createColumns = new Map<string, readonly string[]>();
  for (const statement of scanStatements(sql, 'CREATE TABLE')) {
    const match = /^CREATE TABLE(?: IF NOT EXISTS)?\s+`([^`]+)`\s*\((.*)\)\s*[^;]*;$/isu.exec(statement);
    if (match === null) continue;
    const columns = [...(match[2] ?? '').matchAll(/(?:^|,)\s*`([^`]+)`\s+/gu)].map((entry) => entry[1] ?? '');
    createColumns.set((match[1] ?? '').toLowerCase(), columns);
  }
  const tables = new Map<string, SqlRow[]>();
  for (const statement of scanStatements(sql, 'INSERT INTO')) {
    const header = /^INSERT INTO\s+((?:`[^`]+`|[a-z0-9_$]+)(?:\.(?:`[^`]+`|[a-z0-9_$]+))?)/iu.exec(statement);
    if (header === null) continue;
    const table = (header[1] ?? '').split('.').at(-1)?.replace(/^`|`$/gu, '') ?? '';
    const suffix = suffixTable(table);
    if (suffix === undefined) continue;
    const match = /^\s*(?:\(([^)]*)\))?\s*VALUES\s*([\s\S]*);$/iu.exec(statement.slice(header[0].length));
    if (match === null) fail('SQL', `contains an unsupported INSERT statement for ${table}.`);
    const explicitColumns = match[1]?.match(/`([^`]+)`/gu)?.map((item) => item.slice(1, -1));
    const columns = explicitColumns ?? createColumns.get(table.toLowerCase()) ?? STANDARD_COLUMNS[suffix];
    if (columns === undefined || columns.length === 0) fail('SQL', `table ${table} has no decodable column list.`);
    const destination = tables.get(suffix) ?? [];
    for (const values of parseValueTuples(match[2] ?? '')) {
      if (values.length !== columns.length) fail('SQL', `table ${table} row width does not match its columns.`);
      const row: Record<string, SqlValue> = {};
      columns.forEach((column, index) => { row[column.toLowerCase()] = values[index] ?? null; });
      destination.push(Object.freeze(row));
    }
    tables.set(suffix, destination);
  }
  const rows = (name: string): readonly SqlRow[] => tables.get(name) ?? [];
  return decodeSourceSnapshot({
    schemaVersion: 1,
    contents: rows('typecho_contents').map((row) => ({
      sourceId: rowValue(row, ['cid']), authorId: rowValue(row, ['authorid']), title: rowValue(row, ['title']), slug: rowValue(row, ['slug']), created: numberValue(row, ['created']), modified: numberValue(row, ['modified']), text: rowValue(row, ['text']), template: rowValue(row, ['template']), type: rowValue(row, ['type']), status: rowValue(row, ['status']), parentId: rowValue(row, ['parent']), counters: { comments: numberValue(row, ['commentsnum']), views: numberValue(row, ['views']), stars: numberValue(row, ['stars']) }
    })),
    metas: rows('typecho_metas').map((row) => ({ sourceId: rowValue(row, ['mid']), name: rowValue(row, ['name']), slug: rowValue(row, ['slug']), type: rowValue(row, ['type']), description: rowValue(row, ['description']), parentId: rowValue(row, ['parent']) })),
    relationships: rows('typecho_relationships').map((row) => ({ contentId: rowValue(row, ['cid']), metaId: rowValue(row, ['mid']) })),
    fields: rows('typecho_fields').map((row) => ({ contentId: rowValue(row, ['cid']), name: rowValue(row, ['name']), value: rowValue(row, ['str_value', 'int_value', 'float_value']) })),
    comments: rows('typecho_comments').map((row) => ({ sourceId: rowValue(row, ['coid']), contentId: rowValue(row, ['cid']), created: numberValue(row, ['created']), author: rowValue(row, ['author']), authorId: rowValue(row, ['authorid']), ownerId: rowValue(row, ['ownerid']), mail: rowValue(row, ['mail']), url: rowValue(row, ['url']), ip: rowValue(row, ['ip']), agent: rowValue(row, ['agent']), text: rowValue(row, ['text']), type: rowValue(row, ['type']), status: rowValue(row, ['status']), parentId: rowValue(row, ['parent']) })),
    users: rows('typecho_users').map((row) => ({ sourceId: rowValue(row, ['uid']), name: rowValue(row, ['name']), displayName: rowValue(row, ['screenname']), mail: rowValue(row, ['mail']), url: rowValue(row, ['url']) })),
    memos: rows('notes').map((row) => ({ sourceId: rowValue(row, ['id']), ownerId: rowValue(row, ['ownerid']), lastEditorId: rowValue(row, ['lastchangeuserid', 'lasteditorid']), title: rowValue(row, ['title']), body: rowValue(row, ['content', 'body']), alias: rowValue(row, ['alias']), permission: rowValue(row, ['permission']), created: rowValue(row, ['createdat', 'created']), updated: rowValue(row, ['updatedat', 'updated']), deleted: row['deletedat'] ?? row['deleted'] ?? null }))
  });
}

export async function readSqlSnapshot(dumpPath: string): Promise<SourceSnapshot> {
  const bytes = await readFile(dumpPath);
  const sql = dumpPath.endsWith('.gz') ? gunzipSync(bytes, { maxOutputLength: 512 * 1024 * 1024 }).toString('utf8') : bytes.toString('utf8');
  return parseTypechoSql(sql);
}

export async function readAdapterSnapshot(options: { readonly command: string; readonly dumpPath: string; readonly sha256: string }): Promise<SourceSnapshot> {
  const child = spawn(options.command, [], { env: { PATH: process.env.PATH ?? '' }, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
  child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
  child.stdin.end(`${JSON.stringify({ schemaVersion: 1, dumpPath: options.dumpPath, sha256: options.sha256 })}\n`);
  const status = await new Promise<number>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => resolve(code ?? 1));
  });
  if (status !== 0) {
    throw new Error(`Source adapter exited with status ${status}.`);
  }
  if (Buffer.concat(stderr).length > 0) throw new Error('Source adapter wrote to stderr.');
  const output = Buffer.concat(stdout).toString('utf8');
  if (Buffer.byteLength(output) > 64 * 1024 * 1024) throw new Error('Source adapter output exceeds 64 MiB.');
  let value: unknown;
  try { value = JSON.parse(output); } catch { throw new Error('Source adapter returned invalid JSON.'); }
  return decodeSourceSnapshot(value);
}
