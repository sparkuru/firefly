export interface HomeSearchMetadata {
  readonly title: string;
  readonly filename: string;
  readonly virtualPath: string;
  readonly href: string;
  readonly date: string;
  readonly description: string;
  readonly tags: readonly string[];
}

export interface HomeSearchDocument {
  readonly metadata: HomeSearchMetadata;
  readonly fields: readonly string[];
  readonly body: readonly string[];
  readonly normalizedFields: readonly string[];
  readonly normalizedBody: readonly string[];
}

export interface HomeSearchResult {
  readonly metadata: HomeSearchMetadata;
  readonly context: string;
  readonly match: 'metadata' | 'body';
}

export function readableSearchText(value: string): string {
  return value.normalize('NFC').replace(/\s+/gu, ' ').trim();
}

export function normalizeSearchText(value: string): string {
  return readableSearchText(value).toLocaleLowerCase('en-US');
}

export function decodeHomeSearchMetadata(value: unknown): HomeSearchMetadata {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Invalid homepage search metadata.');
  }
  const record = value as Record<string, unknown>;
  const keys = ['title', 'filename', 'virtualPath', 'href', 'date', 'description', 'tags'];
  if (Object.keys(record).length !== keys.length || keys.some((key) => {
    const field = Object.getOwnPropertyDescriptor(record, key);
    return field === undefined || !('value' in field) || !field.enumerable;
  })) throw new TypeError('Invalid homepage search metadata fields.');
  const { title, filename, virtualPath, href, date, description, tags } = record;
  if (
    typeof title !== 'string' || title.trim() === '' ||
    typeof filename !== 'string' || !filename.endsWith('.md') ||
    typeof virtualPath !== 'string' || !/^(posts|pages)\/(?:[^/]+\/)*[^/]+\.md$/u.test(virtualPath) ||
    virtualPath.split('/').some((part) => part === '.' || part === '..') ||
    virtualPath.slice(virtualPath.lastIndexOf('/') + 1) !== filename ||
    typeof href !== 'string' || !/^\/(posts|pages)\/(?:[^/\\?#%\u0000-\u001f\u007f]+\/)+$/u.test(href) ||
    href.split('/').some((part) => part === '.' || part === '..') ||
    href.split('/')[1] !== virtualPath.split('/')[0] ||
    typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(date) ||
    typeof description !== 'string' || !Array.isArray(tags) ||
    tags.some((tag) => typeof tag !== 'string')
  ) throw new TypeError('Invalid homepage search document.');
  return Object.freeze({ title, filename, virtualPath, href, date, description, tags: Object.freeze([...tags]) });
}

export function createHomeSearchDocument(metadata: HomeSearchMetadata, blocks: readonly string[]): HomeSearchDocument {
  const fields = [metadata.title, metadata.filename, metadata.virtualPath, metadata.description, ...metadata.tags]
    .map(readableSearchText);
  const body = blocks.map(readableSearchText).filter(Boolean);
  return {
    metadata, fields, body,
    normalizedFields: fields.map(normalizeSearchText),
    normalizedBody: body.map(normalizeSearchText)
  };
}

export function searchExcerpt(text: string, query: string, limit = 160): string {
  const points = Array.from(text);
  const offset = normalizeSearchText(text).indexOf(query);
  const prefix = text.slice(0, Math.max(0, offset));
  let hit = Array.from(prefix).length;
  // Most text preserves length when folded. Map only the expanding case,
  // avoiding a locale conversion per character of every long result body.
  if (prefix.toLowerCase().length !== prefix.length) {
    hit = 0;
    let foldedOffset = 0;
    while (foldedOffset < offset && hit < points.length) {
      foldedOffset += points[hit]!.toLowerCase().length;
      hit += 1;
    }
  }
  const start = Math.max(0, Math.min(hit - 48, points.length - limit));
  const end = Math.min(points.length, start + limit);
  return `${start > 0 ? '…' : ''}${points.slice(start, end).join('')}${end < points.length ? '…' : ''}`;
}

export function searchHomeDocuments(documents: readonly HomeSearchDocument[], input: string): readonly HomeSearchResult[] {
  const query = normalizeSearchText(input);
  if (query === '') return [];
  const metadataMatches: HomeSearchResult[] = [];
  const bodyMatches: HomeSearchResult[] = [];
  for (const document of documents) {
    const fieldIndex = document.normalizedFields.findIndex((field) => field.includes(query));
    const bodyIndex = document.normalizedBody.findIndex((block) => block.includes(query));
    if (fieldIndex >= 0) {
      const description = readableSearchText(document.metadata.description);
      const context = document.fields[fieldIndex] ?? '';
      metadataMatches.push({ metadata: document.metadata, match: 'metadata',
        context: searchExcerpt(description && normalizeSearchText(description).includes(query) ? description : context, query) });
    } else if (bodyIndex >= 0) {
      bodyMatches.push({ metadata: document.metadata, match: 'body',
        context: searchExcerpt(document.body[bodyIndex] ?? '', query) });
    }
  }
  return [...metadataMatches, ...bodyMatches];
}

const bodyBoundaries = new Set(['P', 'DIV', 'SECTION', 'ARTICLE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'LI', 'UL', 'OL', 'BLOCKQUOTE', 'PRE', 'TABLE', 'TR', 'TD', 'TH', 'BR', 'HR', 'DL', 'DT', 'DD']);
const excludedBody = 'script, style, template, svg, button, input, select, textarea, [hidden], [aria-hidden="true"], .terminal-code-toolbar, .document-diagram';

/** Read inert prose without cloning it or including generated interaction labels. */
export function extractHomeSearchBody(prose: Element): readonly string[] {
  const blocks: string[] = [];
  let text = '';
  const flush = (): void => {
    const block = readableSearchText(text);
    if (block) blocks.push(block);
    text = '';
  };
  const visit = (node: Node): void => {
    if (node.nodeType === 3) {
      text += node.textContent ?? '';
      return;
    }
    if (!(node instanceof Element)) return;
    if (node.matches(excludedBody)) {
      // Excluded controls must not join two previously separate words.
      text += ' ';
      return;
    }
    const boundary = bodyBoundaries.has(node.tagName);
    if (boundary) flush();
    for (const child of node.childNodes) visit(child);
    if (boundary) flush();
  };
  for (const node of prose.childNodes) visit(node);
  flush();
  return blocks;
}
