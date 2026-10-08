import { memoAssetDimensions } from './memo-assets.mjs';
import { toHtml } from 'hast-util-to-html';

function walk(node, visit) {
  visit(node);
  for (const child of node.children ?? []) walk(child, visit);
}

function text(node) {
  return node.type === 'text' ? node.value : (node.children ?? []).map(text).join('');
}

// Excerpts are a separate, balanced sanitized HAST projection, never body edits.
export function memoPreview(tree, id, route, { characters = 500, lines = 12 } = {}) {
  let remaining = characters;
  let lineCount = lines;
  let truncated = false;
  const take = (node) => {
    if (node.type === 'text') {
      const points = [...node.value];
      const limit = Math.min(points.length, remaining);
      let consumed = 0;
      for (; consumed < limit; consumed += 1) {
        if (points[consumed] !== '\n') continue;
        if (lineCount <= 1) { lineCount = 0; break; }
        lineCount -= 1;
      }
      remaining -= consumed;
      if (consumed < points.length) truncated = true;
      return { ...node, value: points.slice(0, consumed).join('') };
    }
    if (node.type !== 'element') return { ...node };
    const children = [];
    for (const child of node.children) {
      if (remaining <= 0 || lineCount <= 0) { truncated = true; break; }
      if (child.type === 'element' && child.tagName === 'br') {
        if (lineCount <= 1) { lineCount = 0; truncated = true; break; }
        lineCount -= 1;
      }
      children.push(take(child));
    }
    const properties = { ...node.properties };
    if (typeof properties.id === 'string') properties.id = id + '--' + properties.id;
    if (typeof properties.href === 'string' && properties.href.startsWith('#')) properties.href = route + properties.href;
    if (properties.ariaDescribedBy) properties.ariaDescribedBy = Array.isArray(properties.ariaDescribedBy) ? properties.ariaDescribedBy.map((value) => id + '--' + value) : id + '--' + properties.ariaDescribedBy;
    return { ...node, properties, children };
  };
  const children = [];
  for (const node of tree.children) {
    if (remaining <= 0 || lineCount <= 0) { if (node.type === 'element' || text(node).trim()) truncated = true; continue; }
    children.push(take(node));
    if (node.type === 'element' || text(node).trim()) lineCount -= 1;
  }
  const preview = { type: 'root', children };
  const ids = new Set();
  walk(preview, (node) => { if (node.properties?.id) ids.add(node.properties.id); });
  walk(preview, (node) => {
    const described = node.properties?.ariaDescribedBy;
    if (described && !(Array.isArray(described) ? described : [described]).every((id) => ids.has(id))) delete node.properties.ariaDescribedBy;
  });
  return { html: toHtml(preview), truncated };
}

export function rehypeMemoMarkdown({ resolveContext }) {
  return async (tree, file) => {
    const context = resolveContext(file);
    if (context.collection !== 'memos') return;
    const frontmatter = file.data.astro.frontmatter;
    const visible = frontmatter.draft === false && (frontmatter.access?.visibility ?? 'public') === 'public';
    const images = [];
    walk(tree, (node) => {
      if (node.type !== 'element') return;
      for (const key of ['src', 'href']) {
        const value = node.properties?.[key];
        if (typeof value !== 'string') continue;
        if (value.startsWith('assets/')) node.properties[key] = '/pages/memos/' + value;
        else if (value.startsWith('/memos/assets/')) node.properties[key] = '/pages/memos/assets/' + value.slice('/memos/assets/'.length);
      }
      if (node.tagName === 'img') {
        images.push(node);
        node.properties.loading = 'lazy';
        node.properties.decoding = 'async';
      }
    });
    for (const image of images) {
      const dimensions = visible && typeof image.properties.src === 'string' ? await memoAssetDimensions(image.properties.src) : null;
      if (dimensions?.width > 0 && dimensions?.height > 0) Object.assign(image.properties, dimensions);
    }
    file.data.astro.frontmatter.memoPreview = memoPreview(tree, context.slug, context.route);
  };
}
