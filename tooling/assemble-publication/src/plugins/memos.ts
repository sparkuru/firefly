import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse as parseToml } from 'smol-toml';
import { parse, type DefaultTreeAdapterTypes as HTML } from 'parse5';
import type { PublicMemosExport } from '../../../../plugins/memos/public.mjs';
import type { MemosPublicConfig } from '../../../../plugins/memos/config.mjs';

// Resolve shipped contracts from this package, never from the selected input repository.
const packageRoot = existsSync(path.resolve(import.meta.dirname, '../../package.json'))
  ? path.resolve(import.meta.dirname, '../..') : path.resolve(import.meta.dirname, '../../..');
export const publicationContractRoot = path.resolve(packageRoot, '../..');
export const memoContract = await import(pathToFileURL(path.join(publicationContractRoot, 'plugins/memos/public.mjs')).href) as typeof import('../../../../plugins/memos/public.mjs');
const memoConfig = await import(pathToFileURL(path.join(publicationContractRoot, 'plugins/memos/config.mjs')).href) as typeof import('../../../../plugins/memos/config.mjs');
export const { readContainedFile } = await import(pathToFileURL(path.join(publicationContractRoot, 'tooling/shared/contained-file.mjs')).href) as typeof import('../../../shared/contained-file.mjs');

export interface MemosPublicationMetadata {
  readonly enabled: boolean;
  readonly schemaVersion: 1;
  readonly sourceRevision: string;
  readonly generatedAt: string;
  readonly digest: string | null;
  readonly tombstoneEpoch: number;
}
export interface MemoPublicationInput {
  readonly envelope: PublicMemosExport;
  readonly public: MemosPublicConfig;
  readonly exportPath: string;
}
export interface MemoPublicationOptions {
  readonly siteConfigPath?: string;
  readonly exportPath?: string;
  readonly environment?: Readonly<Record<string, string | undefined>>;
}
const EMPTY_DATE = '1970-01-01T00:00:00.000Z';
export function memoMetadata(input: MemoPublicationInput | null, epoch = 0): MemosPublicationMetadata {
  return Object.freeze(input === null
    ? { enabled: false, schemaVersion: 1, sourceRevision: 'empty', generatedAt: EMPTY_DATE, digest: null, tombstoneEpoch: epoch }
    : { enabled: true, schemaVersion: 1, sourceRevision: input.envelope.sourceRevision, generatedAt: input.envelope.generatedAt, digest: input.envelope.digest, tombstoneEpoch: input.envelope.tombstoneEpoch });
}
export function decodeMemoMetadata(value: unknown): MemosPublicationMetadata {
  const fail = () => { throw new TypeError('Invalid memo publication history; recover the prior publication metadata before rebuilding.'); };
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return fail();
  const fields = ['enabled', 'schemaVersion', 'sourceRevision', 'generatedAt', 'digest', 'tombstoneEpoch'];
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== fields.length || fields.some((key) => !descriptors[key] || !('value' in descriptors[key]!))) return fail();
  const v = value as MemosPublicationMetadata;
  if (typeof v.enabled !== 'boolean' || v.schemaVersion !== 1 || typeof v.sourceRevision !== 'string' || !/^[A-Za-z0-9._~-]{1,256}$/u.test(v.sourceRevision) ||
    typeof v.generatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(v.generatedAt) || !Number.isFinite(Date.parse(v.generatedAt)) || new Date(v.generatedAt).toISOString() !== v.generatedAt ||
    !Number.isSafeInteger(v.tombstoneEpoch) || v.tombstoneEpoch < 0 || Object.is(v.tombstoneEpoch, -0) ||
    (v.enabled ? typeof v.digest !== 'string' || !/^[a-f0-9]{64}$/u.test(v.digest) : v.digest !== null || v.sourceRevision !== 'empty' || v.generatedAt !== EMPTY_DATE)) return fail();
  return Object.freeze({ enabled: v.enabled, schemaVersion: 1, sourceRevision: v.sourceRevision, generatedAt: v.generatedAt, digest: v.digest, tombstoneEpoch: v.tombstoneEpoch });
}
function readToml(relative: string, root: string) {
  if (!relative.endsWith('.toml')) throw new TypeError('Site configuration must use a repository-relative TOML path.');
  try { return parseToml(new TextDecoder('utf-8', { fatal: true }).decode(readContainedFile(relative, root, 'public configuration', 1024 * 1024))); }
  catch { throw new TypeError('Unable to decode contained public TOML configuration.'); }
}
export function loadMemoPublication(repositoryRoot: string, options: MemoPublicationOptions = {}): MemoPublicationInput | null {
  const env = options.environment ?? process.env;
  const overridePath = options.siteConfigPath ?? env.FIREFLY_SITE_CONFIG_PATH;
  const sitePath = overridePath === undefined || overridePath === '' ? 'config/site.toml' : overridePath;
  const site = readToml(sitePath, repositoryRoot);
  const plugins = site.plugins;
  if (plugins !== undefined && (plugins === null || typeof plugins !== 'object' || Array.isArray(plugins))) throw new TypeError('Invalid site plugins configuration.');
  const activation = memoConfig.parseMemosActivation((plugins as { memos?: unknown } | undefined)?.memos, 'site memo activation');
  if (!activation.enabled) return null;
  const config = readToml(activation.configPath, repositoryRoot);
  // Only the public projection belongs to this consumer. Runtime settings are not loaded or validated.
  const publicConfig = memoConfig.parseMemosPublicConfig({ public: config.public }, 'memo public configuration', { enabled: true });
  const override = options.exportPath ?? env.FIREFLY_MEMOS_EXPORT;
  const exportPath = override === undefined || override === '' ? publicConfig.exportPath : override;
  if (typeof exportPath !== 'string' || !exportPath.endsWith('.json')) throw new TypeError('Memo export must use a repository-relative JSON path.');
  const envelope = memoContract.decodePublicMemosExport(readContainedFile(exportPath, repositoryRoot, 'memo export', 64 * 1024 * 1024), 'memo export');
  return Object.freeze({ envelope, public: publicConfig, exportPath });
}

type Element = HTML.Element;
type Node = HTML.Node;
function elements(node: Node): Element[] {
  return 'childNodes' in node ? node.childNodes.filter((child): child is Element => 'tagName' in child) : [];
}
function descendants(node: Node): Element[] {
  return elements(node).flatMap((child) => [child, ...descendants(child), ...('content' in child ? descendants(child.content as HTML.DocumentFragment) : [])]);
}
function attr(node: Element, key: string): string | undefined { return node.attrs.find((a) => a.name === key)?.value; }
function hasClass(node: Element, key: string): boolean { return (attr(node, 'class') ?? '').split(/\s+/u).includes(key); }
function owned(node: Element): boolean { return hasClass(node, 'memo-stream') || hasClass(node, 'memo-submission') || node.attrs.some((a) => a.name.startsWith('data-memos-') || a.name === 'data-memo-id'); }
function fail(): never { throw new TypeError('Memo HTML does not match the validated public export/form.'); }
function requireLiveBody(node: Element): void {
  let current: HTML.ParentNode | null = node;
  let body = false;
  while (current !== null && 'tagName' in current) {
    if (!['html', 'body', 'main', 'article', 'div', 'section'].includes(current.tagName) || attr(current, 'hidden') !== undefined || attr(current, 'inert') !== undefined || attr(current, 'aria-hidden') === 'true' || attr(current, 'style') !== undefined) fail();
    body ||= current.tagName === 'body';
    current = current.parentNode;
  }
  if (!body) fail();
}
function attributes(node: Element, allowed: readonly string[]): void {
  if (node.namespaceURI !== 'http://www.w3.org/1999/xhtml' || node.attrs.some((a) => !allowed.includes(a.name) && !/^data-astro-cid-[a-z0-9]+$/u.test(a.name))) fail();
}
function text(node: Element, allowed: readonly string[] = []): string {
  attributes(node, allowed);
  if (node.childNodes.some((n) => n.nodeName !== '#text')) fail();
  return node.childNodes.map((n) => (n as HTML.TextNode).value).join('');
}
function shape(node: Element, tags: readonly string[], allowed: readonly string[] = []): Element[] {
  attributes(node, allowed);
  if (node.childNodes.some((n) => n.nodeName === '#text' ? (n as HTML.TextNode).value.trim() !== '' : !('tagName' in n))) fail();
  const children = elements(node);
  if (children.length !== tags.length || children.some((n, i) => n.tagName !== tags[i])) fail();
  return children;
}
function checkStream(stream: Element, input: MemoPublicationInput): void {
  const envelope = input.envelope;
  const receipt = { 'data-memos-schema-version': '1', 'data-memos-source-revision': envelope.sourceRevision, 'data-memos-generated-at': envelope.generatedAt, 'data-memos-digest': envelope.digest, 'data-memos-tombstone-epoch': String(envelope.tombstoneEpoch) };
  if (stream.tagName !== 'section' || attr(stream, 'class') !== 'memo-stream' || attr(stream, 'aria-labelledby') !== 'memo-stream-heading' || Object.entries(receipt).some(([k, v]) => attr(stream, k) !== v)) fail();
  const children = shape(stream, ['h2', envelope.memos.length ? 'ol' : 'p'], ['class', 'aria-labelledby', ...Object.keys(receipt)]);
  if (text(children[0]!, ['id']) !== 'Reader notes' || attr(children[0]!, 'id') !== 'memo-stream-heading') fail();
  if (!envelope.memos.length) {
    if (text(children[1]!) !== 'No published memos yet. You can leave a note below.') fail();
    return;
  }
  const list = children[1]!;
  if (attr(list, 'class') !== 'memo-list') fail();
  const items = shape(list, envelope.memos.map(() => 'li'), ['class']);
  items.forEach((li, index) => {
    const article = shape(li, ['article'])[0]!;
    const memo = envelope.memos[index]!;
    if (attr(article, 'data-memo-id') !== memo.id) fail();
    const [name, time, body] = shape(article, ['h3', 'time', 'p'], ['data-memo-id']);
    if (text(name!) !== memo.displayName || text(time!, ['datetime']) !== memo.createdAt || attr(time!, 'datetime') !== memo.createdAt || text(body!, ['class']) !== memo.body || attr(body!, 'class') !== 'memo-body') fail();
  });
}
function checkForm(section: Element, input: MemoPublicationInput): void {
  if (section.tagName !== 'section' || attr(section, 'class') !== 'memo-submission') fail();
  const tags = new Set(['section', 'h2', 'p', 'form', 'label', 'input', 'textarea', 'span', 'button']);
  for (const node of [section, ...descendants(section)]) {
    if (!tags.has(node.tagName)) fail();
    attributes(node, ['class', 'id', 'aria-labelledby', 'aria-describedby', 'action', 'method', 'enctype', 'for', 'name', 'type', 'required', 'autocomplete', 'maxlength', 'rows', 'value']);
  }
  const forms = descendants(section).filter((n) => n.tagName === 'form');
  if (forms.length !== 1) fail();
  const form = forms[0]!;
  if (attr(form, 'action') !== new URL('/v1/memos/submissions', input.public.writeOrigin!).href || attr(form, 'method') !== 'post' || attr(form, 'enctype') !== 'application/x-www-form-urlencoded') fail();
  const controls = descendants(section).filter((n) => ['input', 'textarea', 'button'].includes(n.tagName));
  if (controls.some((n) => !descendants(form).includes(n))) fail();
  const submit = controls.filter((n) => n.tagName === 'button');
  if (submit.length !== 1 || attr(submit[0]!, 'name') !== undefined || attr(submit[0]!, 'type') !== 'submit') fail();
  const fields = controls.filter((n) => n.tagName !== 'button');
  const names = ['displayName', 'email', 'body', 'consentVersion', 'honeypot', 'consent'];
  if (fields.length !== names.length || fields.some((n, i) => attr(n, 'name') !== names[i])) fail();
  fields.forEach((n, i) => {
    if (i === 2 ? n.tagName !== 'textarea' : n.tagName !== 'input') fail();
    const type = ['text', 'email', undefined, 'hidden', 'hidden', 'checkbox'][i];
    if (attr(n, 'type') !== type || (i === 0 || i === 1 || i === 2 || i === 5) !== (attr(n, 'required') !== undefined)) fail();
    const value = i === 3 ? input.public.consentVersion : i === 5 ? 'accepted' : i === 4 ? '' : undefined;
    if (attr(n, 'value') !== value || (i === 2 && text(n, ['id', 'name', 'required', 'rows', 'aria-describedby']) !== '')) fail();
  });
}
export function hasMemoSurface(contents: string): boolean {
  return descendants(parse(contents)).some(owned);
}
export async function validateMemoTree(root: string, files: readonly string[], input: MemoPublicationInput | null): Promise<void> {
  let streams = 0;
  let submissions = 0;
  for (const relative of files.filter((file) => file.endsWith('.html'))) {
    if (input !== null && (relative === 'memos.html' || relative.startsWith('memos/')) && relative !== 'memos/index.html') fail();
    const errors: string[] = [];
    const contents = new TextDecoder('utf-8', { fatal: true }).decode(await readFile(path.join(root, relative)));
    const nodes = descendants(parse(contents, { onParseError: (error) => { if (error.code !== 'missing-doctype') errors.push(error.code); } }));
    const surfaces = nodes.filter(owned);
    if (!surfaces.length) continue;
    if (input === null || relative !== 'memos/index.html' || errors.length) fail();
    const stream = nodes.filter((n) => hasClass(n, 'memo-stream'));
    const submission = nodes.filter((n) => hasClass(n, 'memo-submission'));
    if (stream.length !== 1 || submission.length !== 1) fail();
    requireLiveBody(stream[0]!);
    requireLiveBody(submission[0]!);
    if (nodes.filter((n) => ['input', 'textarea', 'form'].includes(n.tagName)).some((n) => !descendants(submission[0]!).includes(n))) fail();
    if (surfaces.some((n) => n !== stream[0] && n !== submission[0] && !descendants(stream[0]!).includes(n))) fail();
    checkStream(stream[0]!, input);
    checkForm(submission[0]!, input);
    streams += stream.length; submissions += submission.length;
  }
  if (input !== null && (streams !== 1 || submissions !== 1)) fail();
}

export function memoHtmlReferences(contents: string): readonly string[] {
  const targets: string[] = [];
  for (const node of descendants(parse(contents))) {
    for (const attribute of node.attrs) {
      if (['href', 'src', 'poster', 'action'].includes(attribute.name)) targets.push(attribute.value);
      if (attribute.name === 'srcset') for (const value of attribute.value.split(',')) {
        const target = value.trim().split(/\s+/u)[0];
        if (target) targets.push(target);
      }
    }
    const css = node.tagName === 'style' ? node.childNodes.filter((n) => n.nodeName === '#text').map((n) => (n as HTML.TextNode).value).join('') : attr(node, 'style') ?? '';
    for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/giu)) if (match[1]) targets.push(match[1]);
  }
  return targets;
}
