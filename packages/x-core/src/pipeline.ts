import Slugger from 'github-slugger';
import type { Element, Root as HastRoot } from 'hast';
import type {
  Html as MdastHtml,
  Image as MdastImage,
  Link as MdastLink,
  Paragraph,
  Root as MdastRoot
} from 'mdast';
import { toString } from 'mdast-util-to-string';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import type { VFile } from 'vfile';
import {
  DEFAULT_PRESENTATION_ID,
  X_CORE_METADATA_VERSION,
  type DiagnosticDocument,
  type DocumentContext,
  type DocumentContextResolver,
  type DocumentReference,
  type Enhancement,
  type NormalizedDocumentInput,
  type OutlineItem,
  type XCoreMetadata
} from './contracts.js';
import { XCoreError, xCoreError } from './diagnostics.js';
import { validateJsonValue } from './json.js';
import { normalizeAdapterId, PresentationRegistry } from './registry.js';

interface PipelineState {
  readonly context: DocumentContext;
  readonly summary: string;
  readonly references: readonly DocumentReference[];
}

interface AstroFileData {
  frontmatter?: Record<string, unknown>;
}

interface XCorePluginOptions {
  readonly registry: PresentationRegistry;
  readonly resolveContext: DocumentContextResolver;
}

const addressableTags = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'ul',
  'ol',
  'blockquote',
  'pre',
  'table',
  'img'
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function diagnosticDocumentFrom(value: unknown): DiagnosticDocument | undefined {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.documentId) ||
    !isNonEmptyString(value.route)
  ) {
    return undefined;
  }

  return {
    documentId: value.documentId,
    ...(isNonEmptyString(value.sourcePath)
      ? { sourcePath: value.sourcePath }
      : {}),
    route: value.route
  };
}

function contextFromResolver(
  resolveContext: DocumentContextResolver,
  file: VFile
): DocumentContext {
  let resolved: unknown;

  try {
    resolved = resolveContext({
      ...(file.path ? { path: file.path } : {}),
      data: file.data as Readonly<Record<string, unknown>>
    });
  } catch (error) {
    if (error instanceof XCoreError) {
      throw error;
    }

    throw xCoreError(
      'XCORE_CONTEXT_RESOLUTION',
      'The application could not resolve a document context.',
      undefined,
      undefined,
      error
    );
  }

  if (
    !isRecord(resolved) ||
    !isNonEmptyString(resolved.documentId) ||
    !isNonEmptyString(resolved.route) ||
    !isNonEmptyString(resolved.slug) ||
    (resolved.sourcePath !== undefined &&
      !isNonEmptyString(resolved.sourcePath)) ||
    (resolved.collection !== 'posts' && resolved.collection !== 'pages') ||
    (resolved.layout !== 'post' &&
      resolved.layout !== 'page' &&
      resolved.layout !== 'timeline' &&
      resolved.layout !== 'files') ||
    (resolved.presentation !== undefined &&
      typeof resolved.presentation !== 'string')
  ) {
    throw xCoreError(
      'XCORE_INVALID_CONTEXT',
      'The application returned an incomplete or invalid document context.',
      diagnosticDocumentFrom(resolved)
    );
  }

  let presentation: string;

  try {
    presentation = normalizeAdapterId(resolved.presentation || DEFAULT_PRESENTATION_ID);
  } catch (error) {
    throw xCoreError(
      'XCORE_INVALID_CONTEXT',
      'The application returned an invalid presentation in the document context.',
      diagnosticDocumentFrom(resolved),
      undefined,
      error
    );
  }

  return {
    documentId: resolved.documentId,
    ...(resolved.sourcePath ? { sourcePath: resolved.sourcePath } : {}),
    route: resolved.route,
    collection: resolved.collection,
    slug: resolved.slug,
    layout: resolved.layout,
    presentation
  };
}

function classifyReference(target: string): DocumentReference['kind'] {
  if (target.startsWith('#')) {
    return 'fragment';
  }

  if (target.startsWith('/')) {
    return 'internal';
  }

  if (/^[a-z][a-z\d+.-]*:/iu.test(target) || target.startsWith('//')) {
    return 'external';
  }

  return 'relative';
}

function analyzeMarkdown(tree: MdastRoot, context: DocumentContext): PipelineState {
  let summary = '';
  const references: DocumentReference[] = [];

  visit(tree, 'html', (node: MdastHtml) => {
    throw xCoreError(
      'XCORE_RAW_HTML',
      'Raw authored HTML is not supported.',
      context
    );
  });

  visit(tree, (node) => {
    if (!summary && node.type === 'paragraph') {
      summary = toString(node as Paragraph).replace(/\s+/gu, ' ').trim();
    }

    if (node.type === 'link') {
      const target = (node as MdastLink).url.trim();
      references.push({ role: 'link', kind: classifyReference(target), target });
    }

    if (node.type === 'image') {
      const target = (node as MdastImage).url.trim();
      references.push({ role: 'resource', kind: classifyReference(target), target });
    }
  });

  return { context, summary, references };
}

function textFromHast(node: Element): string {
  let text = '';

  visit(node, 'text', (child) => {
    text += child.value;
  });

  return text.replace(/\s+/gu, ' ').trim();
}

function assignHeadingIdsAndOutline(tree: HastRoot, context: DocumentContext) {
  const outline: OutlineItem[] = [];
  const slugger = new Slugger();

  visit(tree, 'element', (node: Element) => {
    const match = /^h([1-6])$/u.exec(node.tagName);

    if (!match) {
      return;
    }

    const text = textFromHast(node);
    const id = slugger.slug(text);
    const currentId = node.properties?.id;

    if (
      node.properties &&
      Object.hasOwn(node.properties, 'id') &&
      typeof currentId !== 'string'
    ) {
      throw xCoreError(
        'XCORE_HEADING_ID_CONFLICT',
        `Heading "${text}" already has a non-string ID.`,
        context
      );
    }

    if (typeof currentId === 'string' && currentId !== id) {
      throw xCoreError(
        'XCORE_HEADING_ID_CONFLICT',
        `Heading "${text}" already has conflicting ID "${currentId}".`,
        context
      );
    }

    node.properties ??= {};
    node.properties.id = id;
    outline.push({ depth: Number(match[1]), id, text });
  });

  return outline;
}

function stableDocumentToken(documentId: string): string {
  const token = documentId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '');

  return token || 'document';
}

function assignNodeIds(tree: HastRoot, context: DocumentContext) {
  const ordinals = new Map<string, number>();
  const nodeIds = new Set<string>();

  visit(tree, 'element', (node: Element) => {
    if (!addressableTags.has(node.tagName)) {
      return;
    }

    const ordinal = (ordinals.get(node.tagName) ?? 0) + 1;
    ordinals.set(node.tagName, ordinal);
    const nodeId = `${stableDocumentToken(context.documentId)}-${node.tagName}-${ordinal}`;

    node.properties ??= {};
    const existing = node.properties.dataNodeId;

    if (
      Object.hasOwn(node.properties, 'dataNodeId') &&
      typeof existing !== 'string'
    ) {
      throw xCoreError(
        'XCORE_NODE_ID_CONFLICT',
        'Node already has a non-string identity.',
        context
      );
    }

    if (typeof existing === 'string' && existing !== nodeId) {
      throw xCoreError(
        'XCORE_NODE_ID_CONFLICT',
        `Node already has conflicting identity "${existing}".`,
        context,
        existing
      );
    }

    node.properties.dataNodeId = nodeId;
    nodeIds.add(nodeId);
  });

  return nodeIds;
}

function assertTree(tree: unknown, context: DocumentContext): asserts tree is HastRoot {
  if (
    typeof tree !== 'object' ||
    tree === null ||
    !('type' in tree) ||
    tree.type !== 'root' ||
    !('children' in tree) ||
    !Array.isArray(tree.children)
  ) {
    throw xCoreError(
      'XCORE_INVALID_TRANSFORM',
      'Presentation transform did not return a HAST root.',
      context
    );
  }
}

function assertSafeTransformTree(tree: HastRoot, context: DocumentContext) {
  visit(tree, 'raw', () => {
    throw xCoreError(
      'XCORE_INVALID_TRANSFORM',
      'Presentation output cannot contain dangerous raw HTML nodes.',
      context
    );
  });
}

function validateOutputIdentity(
  tree: HastRoot,
  outline: readonly OutlineItem[],
  expectedNodeIds: ReadonlySet<string>,
  context: DocumentContext
) {
  const outputOutline: OutlineItem[] = [];
  const headingIds = new Set<string>();
  const nodeIds = new Set<string>();

  visit(tree, 'element', (node: Element) => {
    const headingId = node.properties?.id;

    if (/^h[1-6]$/u.test(node.tagName) && typeof headingId === 'string') {
      if (headingIds.has(headingId)) {
        throw xCoreError(
          'XCORE_HEADING_ID_COLLISION',
          `Duplicate heading ID "${headingId}" in presentation output.`,
          context
        );
      }

      headingIds.add(headingId);
      outputOutline.push({
        depth: Number(node.tagName.slice(1)),
        id: headingId,
        text: textFromHast(node)
      });
    }

    const nodeId = node.properties?.dataNodeId;

    if (
      node.properties &&
      Object.hasOwn(node.properties, 'dataNodeId') &&
      typeof nodeId !== 'string'
    ) {
      throw xCoreError(
        'XCORE_INVALID_TRANSFORM',
        'Presentation output contains a non-string node identity.',
        context
      );
    }

    if (typeof nodeId === 'string') {
      if (nodeIds.has(nodeId)) {
        throw xCoreError(
          'XCORE_NODE_ID_COLLISION',
          `Duplicate node identity "${nodeId}" in presentation output.`,
          context,
          nodeId
        );
      }

      nodeIds.add(nodeId);
    }
  });

  for (const [index, item] of outline.entries()) {
    const outputItem = outputOutline[index];

    if (
      !outputItem ||
      outputItem.depth !== item.depth ||
      outputItem.id !== item.id ||
      outputItem.text !== item.text
    ) {
      throw xCoreError(
        'XCORE_OUTLINE_DRIFT',
        `Presentation output changed outline target "${item.id}".`,
        context
      );
    }
  }

  if (outputOutline.length !== outline.length) {
    throw xCoreError(
      'XCORE_OUTLINE_DRIFT',
      'Presentation output introduced headings absent from normalized analysis.',
      context
    );
  }

  if (
    nodeIds.size !== expectedNodeIds.size ||
    [...expectedNodeIds].some((nodeId) => !nodeIds.has(nodeId))
  ) {
    throw xCoreError(
      'XCORE_NODE_ID_DRIFT',
      'Presentation output changed or removed X Core node identities.',
      context
    );
  }

  return nodeIds;
}

function readPlainDataProperties(
  value: unknown
): ReadonlyMap<string, unknown> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  try {
    const prototype = Object.getPrototypeOf(value);

    if (prototype !== Object.prototype && prototype !== null) {
      return undefined;
    }

    const properties = new Map<string, unknown>();

    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string') {
        return undefined;
      }

      const descriptor = Object.getOwnPropertyDescriptor(value, key);

      if (!descriptor?.enumerable || !('value' in descriptor)) {
        return undefined;
      }

      properties.set(key, descriptor.value);
    }

    return properties;
  } catch {
    return undefined;
  }
}

function isPlainArrayContainer(value: unknown): value is readonly unknown[] {
  if (!Array.isArray(value)) {
    return false;
  }

  try {
    if (Object.getPrototypeOf(value) !== Array.prototype) {
      return false;
    }

    for (const key of Reflect.ownKeys(value)) {
      if (key === 'length') {
        continue;
      }

      if (
        typeof key !== 'string' ||
        !/^(?:0|[1-9]\d*)$/u.test(key) ||
        Number(key) >= value.length
      ) {
        return false;
      }

      const descriptor = Object.getOwnPropertyDescriptor(value, key);

      if (!descriptor?.enumerable || !('value' in descriptor)) {
        return false;
      }
    }

    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

function validateEnhancement(
  value: unknown,
  index: number,
  context: DocumentContext
): Enhancement {
  const properties = readPlainDataProperties(value);
  const expectedKeys = ['nodeId', 'feature', 'module', 'load', 'props'];

  if (
    !properties ||
    properties.size !== expectedKeys.length ||
    expectedKeys.some((key) => !properties.has(key))
  ) {
    throw xCoreError(
      'XCORE_INVALID_ENHANCEMENT',
      `Enhancement entry ${index} must be a plain object with the documented fields.`,
      context
    );
  }

  const nodeId = properties.get('nodeId');
  const feature = properties.get('feature');
  const module = properties.get('module');
  const load = properties.get('load');
  const props = properties.get('props');

  if (
    !isNonEmptyString(nodeId) ||
    !isNonEmptyString(feature) ||
    !isNonEmptyString(module) ||
    (load !== 'eager' && load !== 'idle' && load !== 'visible')
  ) {
    throw xCoreError(
      'XCORE_INVALID_ENHANCEMENT',
      'Enhancement entries require nodeId, feature, module, and a supported loading strategy.',
      context,
      typeof nodeId === 'string' ? nodeId : undefined
    );
  }

  if (!isRecord(props)) {
    throw xCoreError(
      'XCORE_UNSAFE_ENHANCEMENT_PROPS',
      `Enhancement props for "${nodeId}" must be a plain JSON object.`,
      context,
      nodeId
    );
  }

  try {
    validateJsonValue(props, `enhancement(${nodeId}).props`);
  } catch (error) {
    throw xCoreError(
      'XCORE_UNSAFE_ENHANCEMENT_PROPS',
      `Enhancement props for "${nodeId}" are not plain JSON.`,
      context,
      nodeId,
      error
    );
  }

  return { nodeId, feature, module, load, props };
}

function validateEnhancements(
  value: unknown,
  nodeIds: ReadonlySet<string>,
  context: DocumentContext
): readonly Enhancement[] {
  if (!isPlainArrayContainer(value)) {
    throw xCoreError(
      'XCORE_INVALID_ENHANCEMENT_MANIFEST',
      'Presentation enhancements must be returned as a plain, dense array.',
      context
    );
  }

  const enhancements = value.map((entry, index) =>
    validateEnhancement(entry, index, context)
  );
  const declaredNodeIds = new Set<string>();

  for (const enhancement of enhancements) {
    if (declaredNodeIds.has(enhancement.nodeId)) {
      throw xCoreError(
        'XCORE_DUPLICATE_ENHANCEMENT',
        `Multiple enhancements target node "${enhancement.nodeId}".`,
        context,
        enhancement.nodeId
      );
    }

    declaredNodeIds.add(enhancement.nodeId);

    if (!nodeIds.has(enhancement.nodeId)) {
      throw xCoreError(
        'XCORE_MISSING_ENHANCEMENT_TARGET',
        `Enhancement target "${enhancement.nodeId}" is absent from presentation output.`,
        context,
        enhancement.nodeId
      );
    }
  }

  return enhancements;
}

function publishMetadata(file: VFile, metadata: XCoreMetadata) {
  validateJsonValue(metadata, '$.xCore');
  const astro = (file.data.astro ??= {}) as AstroFileData;
  astro.frontmatter ??= {};
  astro.frontmatter.xCore = metadata;
}

export function createXCorePlugins(options: XCorePluginOptions): {
  readonly remarkPlugin: Plugin<[], MdastRoot>;
  readonly rehypePlugin: Plugin<[], HastRoot>;
} {
  const stateByFile = new WeakMap<VFile, PipelineState>();

  const remarkPlugin: Plugin<[], MdastRoot> = () => (tree, file) => {
    const context = contextFromResolver(options.resolveContext, file);
    stateByFile.set(file, analyzeMarkdown(tree, context));
  };

  const rehypePlugin: Plugin<[], HastRoot> = () => (tree, file) => {
    const state = stateByFile.get(file);

    if (!state) {
      throw xCoreError(
        'XCORE_PIPELINE_STATE',
        'The X Core rehype stage ran without its paired remark analysis.'
      );
    }

    const outline = assignHeadingIdsAndOutline(tree, state.context);
    const expectedNodeIds = assignNodeIds(tree, state.context);
    const adapter = options.registry.resolve(state.context);
    const input: NormalizedDocumentInput = {
      context: state.context,
      summary: state.summary,
      references: state.references,
      tree
    };
    let transformed: HastRoot;

    try {
      transformed = adapter.transform(input);
    } catch (error) {
      if (error instanceof XCoreError) {
        throw error;
      }

      throw xCoreError(
        'XCORE_TRANSFORM_FAILED',
        `Presentation "${state.context.presentation}" failed to transform the document.`,
        state.context,
        undefined,
        error
      );
    }

    let nodeIds: ReadonlySet<string>;

    try {
      assertTree(transformed, state.context);
      assertSafeTransformTree(transformed, state.context);
      nodeIds = validateOutputIdentity(
        transformed,
        outline,
        expectedNodeIds,
        state.context
      );
    } catch (error) {
      if (error instanceof XCoreError) {
        throw error;
      }

      throw xCoreError(
        'XCORE_INVALID_TRANSFORM',
        `Presentation "${state.context.presentation}" returned malformed HAST.`,
        state.context,
        undefined,
        error
      );
    }

    const transformedInput = { ...input, tree: transformed };
    let enhancements: unknown;

    try {
      enhancements = adapter.enhancements(transformedInput);
    } catch (error) {
      if (error instanceof XCoreError) {
        throw error;
      }

      throw xCoreError(
        'XCORE_ENHANCEMENTS_FAILED',
        `Presentation "${state.context.presentation}" failed to declare enhancements.`,
        state.context,
        undefined,
        error
      );
    }

    const manifest = validateEnhancements(
      enhancements,
      nodeIds,
      state.context
    );
    publishMetadata(file, {
      version: X_CORE_METADATA_VERSION,
      presentation: state.context.presentation,
      summary: state.summary,
      references: state.references,
      outline,
      enhancements: manifest
    });

    return transformed;
  };

  return { remarkPlugin, rehypePlugin };
}
