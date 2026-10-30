import { randomBytes } from 'node:crypto';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { parseDocument } from 'yaml';

const supportedLayouts = new Set(['image-left', 'image-right', 'image-top']);
const markerLanguage = 'firefly-block-marker';
const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);
const forbiddenUrlCharacters = /[\s\u0000-\u001f\u007f\\]/u;

function diagnosticPath(value) {
  if (typeof value !== 'string') return '(document)';
  const normalized = value.replaceAll('\\', '/');
  const staged = normalized.match(/\/\.generated-content\/((?:posts|pages|memos)\/[^?#]+)$/u);
  const candidate = staged?.[1] ?? normalized;
  if (!/^(?:posts|pages|memos)\/[^\u0000-\u001f\u007f]+\.md$/u.test(candidate) ||
      candidate.split('/').some((part) => part === '.' || part === '..')) return '(document)';
  return candidate;
}

function blockError(documentPath, line, message) {
  const location = Number.isInteger(line) && line > 0 ? `:${line}` : '';
  return new Error(`[FIREFLY_BLOCK] ${diagnosticPath(documentPath)}${location}: ${message}`);
}

function plainMapping(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function validateMapping(value, keys, required, owner, label) {
  if (!plainMapping(value)) throw blockError(owner.path, owner.line, `${label} must be a mapping.`);
  for (const key of Object.keys(value)) {
    if (forbiddenKeys.has(key) || !keys.includes(key)) {
      throw blockError(owner.path, owner.line, `${label} has an unknown field: ${key}.`);
    }
  }
  for (const key of required) {
    if (!Object.hasOwn(value, key)) throw blockError(owner.path, owner.line, `${label}.${key} is required.`);
  }
}

function stringField(value, owner, field, { empty = false } = {}) {
  if (typeof value !== 'string' || (!empty && value.trim() === '')) {
    throw blockError(owner.path, owner.line, `${field} must be ${empty ? 'a string' : 'a non-empty string'}.`);
  }
  return value;
}

function safeSource(value) {
  if (typeof value !== 'string' || value.length === 0 || forbiddenUrlCharacters.test(value)) return false;
  if (value.startsWith('//')) return false;
  try { decodeURI(value); }
  catch { return false; }
  if (/^[a-z][a-z\d+.-]*:/iu.test(value)) {
    try {
      const parsed = new URL(value);
      return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.length > 0;
    } catch {
      return false;
    }
  }
  return true;
}

function sourceField(value, owner, field, { external = false } = {}) {
  const source = stringField(value, owner, field);
  if (!safeSource(source) || (external && !/^https?:\/\//iu.test(source))) {
    throw blockError(owner.path, owner.line, `${field} must be a safe ${external ? 'HTTP(S) URL' : 'resource URL'}.`);
  }
  return source;
}

function optionalString(value, key, owner, label, { empty = false } = {}) {
  return Object.hasOwn(value, key)
    ? { [key]: stringField(value[key], owner, `${label}.${key}`, { empty }) }
    : {};
}

function imageDeclaration(value, owner, label) {
  validateMapping(value, ['type', 'src', 'alt', 'caption'], ['type', 'src'], owner, label);
  if (value.type !== 'image') throw blockError(owner.path, owner.line, `${label}.type must be image.`);
  return {
    type: 'image',
    src: sourceField(value.src, owner, `${label}.src`),
    ...optionalString(value, 'alt', owner, label, { empty: true }),
    ...optionalString(value, 'caption', owner, label)
  };
}

/** Parse one declaration without consulting the file system or network. */
export function parseFireflyBlock(source, { documentPath, line } = {}) {
  const owner = { path: documentPath, line };
  if (typeof source !== 'string') throw blockError(owner.path, owner.line, 'block must contain YAML text.');
  const yaml = parseDocument(source, { uniqueKeys: true });
  if (yaml.errors.length > 0 || yaml.warnings.length > 0) {
    throw blockError(owner.path, owner.line, 'invalid YAML or unsupported YAML tag.');
  }
  let data;
  try {
    data = yaml.toJS({ maxAliasCount: 0 });
  } catch {
    throw blockError(owner.path, owner.line, 'YAML aliases are not supported.');
  }
  if (!plainMapping(data)) throw blockError(owner.path, owner.line, 'block must be a mapping.');
  const type = stringField(data.type, owner, 'type');
  if (type === 'image') return imageDeclaration(data, owner, 'image');
  if (type === 'link') {
    validateMapping(data, ['type', 'url', 'title', 'description'], ['type', 'url'], owner, 'link');
    return {
      type,
      url: sourceField(data.url, owner, 'link.url', { external: true }),
      ...optionalString(data, 'title', owner, 'link'),
      ...optionalString(data, 'description', owner, 'link')
    };
  }
  if (type === 'video' || type === 'audio') {
    validateMapping(data, ['type', 'src', 'caption'], ['type', 'src'], owner, type);
    return {
      type,
      src: sourceField(data.src, owner, `${type}.src`),
      ...optionalString(data, 'caption', owner, type)
    };
  }
  if (type === 'composition') {
    validateMapping(data, ['type', 'layout', 'media', 'content'], ['type', 'layout', 'media', 'content'], owner, type);
    if (!supportedLayouts.has(data.layout)) {
      throw blockError(owner.path, owner.line, 'composition.layout must be image-left, image-right, or image-top.');
    }
    return {
      type,
      layout: data.layout,
      media: imageDeclaration(data.media, owner, 'composition.media'),
      content: stringField(data.content, owner, 'composition.content')
    };
  }
  throw blockError(owner.path, owner.line, `unknown block type: ${type}.`);
}

let captureProcessor;

function captureMarkdownTree() {
  return (tree, file) => {
    file.data.astro.frontmatter.fireflyCapturedChildren = tree.children;
    tree.children = [];
  };
}

async function parseMarkdown(markdown) {
  captureProcessor ??= createMarkdownProcessor({
    syntaxHighlight: false,
    remarkPlugins: [captureMarkdownTree]
  });
  const processor = await captureProcessor;
  const rendered = await processor.render(markdown);
  return { type: 'root', children: rendered.metadata.frontmatter.fireflyCapturedChildren };
}

async function parseComposition(markdown, outerDefinitions) {
  if (outerDefinitions.size === 0) return parseMarkdown(markdown);
  // CommonMark resolves reference nodes while parsing. Supply inert definitions
  // for outer-document labels, then remove them so the real outer definitions
  // remain authoritative when remark-rehype renders the combined document.
  const placeholders = [...outerDefinitions.values()].map((definition) => {
    const label = (definition.label ?? definition.identifier).replace(/([\\[\]])/gu, '\\$1');
    return `[${label}]: <https://firefly.invalid/>`;
  });
  const parsed = await parseMarkdown(`${markdown}\n\n${placeholders.join('\n')}`);
  parsed.children = parsed.children.filter((node) => (node.position?.start?.offset ?? 0) < markdown.length);
  return parsed;
}

export function splitFireflyFrontmatter(markdown) {
  const opening = /^(?:\uFEFF)?---[ \t]*(?:\r\n|\n|\r|$)/u.exec(markdown);
  if (!opening) return undefined;
  const closingPattern = /^---[ \t]*(?:\r\n|\n|\r|$)/gmu;
  closingPattern.lastIndex = opening[0].length;
  const closing = closingPattern.exec(markdown);
  if (!closing) return undefined;
  return {
    yaml: markdown.slice(opening[0].length, closing.index),
    end: closing.index + closing[0].length
  };
}

function withoutFrontmatter(markdown) {
  const frontmatter = splitFireflyFrontmatter(markdown);
  return frontmatter
    ? markdown.slice(0, frontmatter.end).replace(/[^\r\n]/gu, '') + markdown.slice(frontmatter.end)
    : markdown;
}

function walk(node, callback) {
  callback(node);
  for (const child of node.children ?? []) walk(child, callback);
}

function containsNestedFirefly(tree) {
  let found = false;
  walk(tree, (node) => { if (node.type === 'code' && node.lang === 'firefly') found = true; });
  return found;
}

function marker(value) {
  return { type: 'code', lang: markerLanguage, value };
}

function text(value) {
  return { type: 'text', value };
}

function mediaMarkdown(block) {
  if (block.type === 'image' || block.type === 'composition') {
    const image = block.type === 'image' ? block : block.media;
    return { type: 'image', url: image.src, alt: image.alt ?? '' };
  }
  if (block.type === 'link') {
    return { type: 'link', url: block.url, children: [text(block.title ?? block.url)] };
  }
  return { type: 'link', url: block.src, children: [text(`Open ${block.type}`)] };
}

async function expandBlocks(tree, documentPath) {
  const records = [];
  const outerDefinitions = definitions(tree);
  async function expand(parent) {
    if (!Array.isArray(parent.children)) return;
    for (let index = 0; index < parent.children.length; index += 1) {
      const node = parent.children[index];
      if (node.type !== 'code' || node.lang !== 'firefly') {
        await expand(node);
        continue;
      }
      const line = node.position?.start?.line;
      if (node.meta?.trim()) throw blockError(documentPath, line, 'firefly fence metadata is not supported.');
      const block = parseFireflyBlock(node.value, { documentPath, line });
      const contentTree = block.type === 'composition'
        ? await parseComposition(block.content, outerDefinitions)
        : { type: 'root', children: [] };
      if (containsNestedFirefly(contentTree)) throw blockError(documentPath, line, 'nested firefly blocks are not supported.');
      const nonce = randomBytes(24).toString('hex');
      const record = {
        block,
        line,
        ordinal: records.length + 1,
        start: `firefly-start-${nonce}`,
        end: `firefly-end-${nonce}`,
        mediaNode: mediaMarkdown(block),
        contentNodes: contentTree.children
      };
      const description = block.type === 'link' && block.description
        ? [{ type: 'paragraph', children: [text(block.description)] }]
        : [];
      const expanded = [marker(record.start), record.mediaNode, ...description, ...record.contentNodes, marker(record.end)];
      parent.children.splice(index, 1, ...expanded);
      index += expanded.length - 1;
      records.push(record);
    }
  }
  await expand(tree);
  return records;
}

function definitionKey(identifier) {
  return identifier.replace(/\s+/gu, ' ').trim().toLowerCase();
}

function definitions(tree) {
  const result = new Map();
  walk(tree, (node) => {
    if (node.type !== 'definition' || typeof node.identifier !== 'string') return;
    const key = definitionKey(node.identifier);
    if (!result.has(key)) result.set(key, node);
  });
  return result;
}

async function transformImages(record, allDefinitions, resolve) {
  const resources = new Set();
  const primary = record.block.type === 'composition' ? record.block.media.src : record.block.src;
  if (typeof primary === 'string') resources.add(primary);
  async function transform(parent) {
    for (let index = 0; index < (parent.children?.length ?? 0); index += 1) {
      let node = parent.children[index];
      if (node.type === 'imageReference') {
        const definition = allDefinitions.get(definitionKey(node.identifier));
        if (definition) {
          node = { type: 'image', url: definition.url, alt: node.alt ?? '', title: definition.title, position: node.position };
          parent.children[index] = node;
        }
      }
      if (node.type === 'image' && safeSource(node.url)) {
        resources.add(node.url);
        if (resolve) node.url = (await resolve(node.url)).src;
      }
      await transform(node);
    }
  }
  await transform({ children: record.contentNodes });
  return [...resources];
}

/** Extract validated declarations from genuine Markdown fences for resource staging. */
export async function collectFireflyBlocks(markdown, { documentPath } = {}) {
  if (typeof markdown !== 'string') throw new TypeError('Markdown must be a string.');
  const tree = await parseMarkdown(withoutFrontmatter(markdown));
  const records = await expandBlocks(tree, documentPath);
  const allDefinitions = definitions(tree);
  const result = [];
  for (const record of records) {
    const resources = await transformImages(record, allDefinitions);
    result.push({ block: record.block, line: record.line, ordinal: record.ordinal, resources });
  }
  return result;
}

function element(tagName, properties, children) {
  return { type: 'element', tagName, properties, children };
}

function markerValue(node) {
  if (node.type !== 'element' || node.tagName !== 'pre') return undefined;
  const code = node.children?.find((child) => child.type === 'element' && child.tagName === 'code');
  if (!code?.properties?.className?.includes(`language-${markerLanguage}`)) return undefined;
  return (code.children ?? []).filter((child) => child.type === 'text').map((child) => child.value).join('').trim();
}

function figure(record, image, classNames) {
  const declaration = record.block.type === 'composition' ? record.block.media : record.block;
  const children = [image];
  if (declaration.caption) children.push(element('figcaption', {}, [text(declaration.caption)]));
  return element('figure', { className: classNames }, children);
}

function renderedBlock(record, children, documentPath) {
  const first = children.findIndex((node) => node.type === 'element');
  const primary = children[first];
  const expected = record.block.type === 'image' || record.block.type === 'composition' ? 'img' : 'a';
  if (primary?.type !== 'element' || primary.tagName !== expected) {
    throw blockError(documentPath, record.line, 'validated media could not be rendered.');
  }
  children.splice(first, 1);
  const { block } = record;
  if (block.type === 'image' || block.type === 'composition') {
    primary.properties.loading = 'lazy';
    primary.properties.decoding = 'async';
    if (record.dimensions) Object.assign(primary.properties, record.dimensions);
    if (block.type === 'image') return figure(record, primary, ['firefly-block', 'firefly-block-image']);
    const image = figure(record, primary, ['firefly-block-media']);
    return element('div', { className: ['firefly-block', 'firefly-block-composition', `firefly-block-composition--${block.layout}`] }, [image, ...children]);
  }
  if (block.type === 'link') {
    return element('div', { className: ['firefly-block', 'firefly-block-link'] }, [primary, ...children]);
  }
  const media = element(block.type, { src: record.resolvedSrc, controls: true, preload: 'none' }, []);
  const body = [media, primary];
  if (block.caption) body.push(element('figcaption', {}, [text(block.caption)]));
  return element('figure', { className: ['firefly-block', `firefly-block-${block.type}`] }, body);
}

function resolveDocumentOwner(file, resolveContext) {
  const context = resolveContext?.(file);
  const path = context?.sourcePath ?? file.path;
  return { path: diagnosticPath(path), collection: context?.collection ?? file.data.astro?.frontmatter?.layout };
}

/** Create the paired remark and rehype stages; neither stage trusts authored HTML markers. */
export function createFireflyBlockPlugins({ resolveMedia = ({ src }) => src, resolveContext } = {}) {
  const state = new WeakMap();
  const remarkPlugin = () => async (tree, file) => {
    const owner = resolveDocumentOwner(file, resolveContext);
    if (owner.collection === 'memos' || owner.collection === 'memo') return;
    const records = await expandBlocks(tree, owner.path);
    if (records.length === 0) return;
    const allDefinitions = definitions(tree);
    for (const record of records) {
      const resolve = async (src) => {
        let response;
        try { response = await resolveMedia({ src, file }); }
        catch { throw blockError(owner.path, record.line, 'could not resolve the media resource.'); }
        const result = typeof response === 'string' ? { src: response } : response;
        if (!plainMapping(result) || !safeSource(result.src)) {
          throw blockError(owner.path, record.line, 'media resolver returned an invalid resource URL.');
        }
        return result;
      };
      const original = record.block.type === 'composition' ? record.block.media.src : record.block.src;
      if (typeof original === 'string') {
        const resolved = await resolve(original);
        record.resolvedSrc = resolved.src;
        if (Number.isSafeInteger(resolved.width) && resolved.width > 0 && Number.isSafeInteger(resolved.height) && resolved.height > 0) {
          record.dimensions = { width: resolved.width, height: resolved.height };
        }
        const media = record.mediaNode;
        if (media.type === 'image') media.url = resolved.src;
        else if (media.type === 'link') media.url = resolved.src;
      }
      await transformImages(record, allDefinitions, resolve);
    }
    state.set(file, { owner, records });
  };
  const rehypePlugin = () => (tree, file) => {
    const saved = state.get(file);
    if (!saved) return;
    const remaining = new Map(saved.records.map((record) => [record.start, record]));
    function transform(parent) {
      if (!Array.isArray(parent.children)) return;
      for (let index = 0; index < parent.children.length; index += 1) {
        const node = parent.children[index];
        const record = remaining.get(markerValue(node));
        if (!record) {
          transform(node);
          continue;
        }
        let end = index + 1;
        while (end < parent.children.length && markerValue(parent.children[end]) !== record.end) end += 1;
        if (end === parent.children.length) throw blockError(saved.owner.path, record.line, 'block boundaries were lost during Markdown processing.');
        const rendered = renderedBlock(record, parent.children.slice(index + 1, end), saved.owner.path);
        parent.children.splice(index, end - index + 1, rendered);
        remaining.delete(record.start);
      }
    }
    transform(tree);
    state.delete(file);
    if (remaining.size > 0) {
      const record = remaining.values().next().value;
      throw blockError(saved.owner.path, record.line, 'block was lost during Markdown processing.');
    }
  };
  return { remarkPlugin, rehypePlugin };
}
