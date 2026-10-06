import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { markdownHtmlSchema } from '../../shared/markdown-html-policy.mjs';
import { readFile, safeRelative } from './files.mjs';
import { STYLESHEET } from './style.mjs';

const escape = (value) => value.replace(/[&<>"']/gu, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const ASSET_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.pdf', '.mp3', '.ogg', '.wav', '.mp4', '.txt']);

function validateAssetType(bytes, extension) {
  const ascii = (start, end) => bytes.subarray(start, end).toString('ascii');
  const valid = {
    '.png': () => bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) && ascii(12, 16) === 'IHDR' && bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0,
    '.jpg': () => bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
    '.jpeg': () => bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
    '.gif': () => bytes.length >= 10 && ['GIF87a', 'GIF89a'].includes(ascii(0, 6)) && bytes.readUInt16LE(6) > 0 && bytes.readUInt16LE(8) > 0,
    '.webp': () => bytes.length >= 16 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP',
    '.avif': () => bytes.length >= 16 && ascii(4, 8) === 'ftyp' && /(?:avif|avis)/u.test(ascii(8, Math.min(64, bytes.length))),
    '.ico': () => bytes.length >= 6 && bytes.readUInt16LE(0) === 0 && bytes.readUInt16LE(2) === 1 && bytes.readUInt16LE(4) > 0,
    '.pdf': () => ascii(0, 5) === '%PDF-',
    '.mp3': () => ascii(0, 3) === 'ID3' || (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0),
    '.ogg': () => ascii(0, 4) === 'OggS',
    '.wav': () => bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE',
    '.mp4': () => bytes.length >= 12 && ascii(4, 8) === 'ftyp',
    '.txt': () => { new TextDecoder('utf-8', { fatal: true }).decode(bytes); return true; }
  }[extension];
  if (!valid || !valid()) throw new TypeError('Memo asset bytes do not match their declared supported type.');
}

function assetUrl(raw, assetsRoot, assets, image) {
  if (/^https?:\/\//iu.test(raw)) {
    if (image) throw new TypeError('Memo images must use contained local assets.');
    return raw;
  }
  if (raw.startsWith('#') || raw.startsWith('?') || (raw.startsWith('/') && !raw.startsWith('/memos/assets/'))) {
    if (image) throw new TypeError('Memo images must use contained local assets.');
    return raw;
  }
  let relative = raw;
  if (relative.startsWith('/memos/assets/media/')) relative = relative.slice('/memos/assets/media/'.length);
  else if (relative.startsWith('assets/')) relative = relative.slice('assets/'.length);
  else if (relative.startsWith('./')) relative = relative.slice(2);
  try { relative = decodeURIComponent(relative); } catch { throw new TypeError('Invalid Memo asset URL encoding.'); }
  safeRelative(relative);
  const extension = path.extname(relative).toLowerCase();
  if (!ASSET_EXTENSIONS.has(extension) || (image && !['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico'].includes(extension))) throw new TypeError('Unsupported Memo asset type.');
  const bytes = readFile(assetsRoot, relative);
  validateAssetType(bytes, extension);
  assets.set(`assets/media/${relative}`, bytes);
  return `/memos/assets/media/${relative.split('/').map(encodeURIComponent).join('/')}`;
}

export async function renderMarkdown(body, assetsRoot, assets = new Map(), id = 'memo') {
  const rewriteAssets = () => (tree) => {
    let visible = false;
    function visit(node) {
      if (node.type === 'text' && node.value.trim()) visible = true;
      if (node.type === 'element') {
        if (node.tagName === 'hr' || (node.tagName === 'img' && node.properties.src)) visible = true;
        if (node.tagName === 'img' && typeof node.properties.src === 'string') node.properties.src = assetUrl(node.properties.src, assetsRoot, assets, true);
        if (node.tagName === 'a' && typeof node.properties.href === 'string') node.properties.href = assetUrl(node.properties.href, assetsRoot, assets, false);
        // GFM footnote IDs must be unique across independently rendered notes.
        if (typeof node.properties.id === 'string') node.properties.id = `${id}-${node.properties.id}`;
        if (typeof node.properties.ariaDescribedBy === 'object') node.properties.ariaDescribedBy = node.properties.ariaDescribedBy.map((value) => `${id}-${value}`);
        if (typeof node.properties.href === 'string' && /^#(?:user-content-|footnote-label)/u.test(node.properties.href)) node.properties.href = `#${id}-${node.properties.href.slice(1)}`;
      }
      for (const child of node.children ?? []) visit(child);
    }
    visit(tree);
    if (!visible) throw new TypeError('Rendered Memo body has no visible content.');
  };
  const result = await unified().use(remarkParse).use(remarkGfm).use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw).use(rehypeSanitize, markdownHtmlSchema).use(rewriteAssets).use(rehypeStringify).process(body);
  return String(result);
}

export async function renderPublication(bundle, assetsRoot) {
  const assets = new Map([['assets/style.css', Buffer.from(STYLESHEET)]]);
  const articles = [];
  for (const memo of bundle.memos) {
    const fragment = await renderMarkdown(memo.body, assetsRoot, assets, memo.id);
    articles.push(`<article id="${memo.id}" data-memo-id="${memo.id}"><header><strong>${escape(memo.displayName)}</strong><a href="#${memo.id}" aria-label="Permanent link to Memo from ${memo.createdAt}"><time datetime="${memo.createdAt}">${memo.createdAt.slice(0, 10)} ${memo.createdAt.slice(11, 16)} UTC</time></a></header><div class="memo-body" data-memo-body>${fragment}</div></article>`);
  }
  const content = articles.length ? articles.join('\n') : '<p data-memos-empty>No Memo has been published.</p>';
  const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>Memo · Firefly</title><link rel="stylesheet" href="/memos/assets/style.css"></head><body><main><nav aria-label="Site navigation"><a href="/">Home</a><a href="/posts/">Blog</a></nav><h1>Memo</h1><section aria-label="Memo stream" data-memo-stream data-memo-export-digest="${bundle.digest}">${content}</section></main></body></html>\n`;
  return { html, assets };
}
