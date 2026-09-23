import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);
export const diagramCache = fileURLToPath(new URL('../../.astro/diagrams/', import.meta.url));
const configuration = { startOnLoad: false, securityLevel: 'strict', htmlLabels: false, deterministicIds: true, deterministicIDSeed: 'firefly', fontFamily: 'Arial, sans-serif', flowchart: { htmlLabels: false }, theme: 'default' };
const policyVersion = 'firefly-diagram-v4-mermaid12-playwright1.62';
const pending = new Map();
let renderQueue = Promise.resolve();

export function sourcePolicyError(source) {
  if (Buffer.byteLength(source) > 65536) return 'Diagram exceeds the 64 KiB source limit.';
  // URLs and instruction words inside labels are inert text. Reject authored
  // directives and resource declarations; network blocking and SVG validation
  // enforce the resource boundary after Mermaid interprets the source.
  const declarations = source.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/gu, '""');
  if (/%%\s*\{|^\s*---|(?:^|;)\s*click\s|@\s*\{[^}]*\b(?:icon|img)\s*:|<(?:img|image|use)\b/imu.test(declarations)) return 'Diagram configuration, callbacks and external resources are not supported.';
  return undefined;
}

// Runs inside an isolated browser page. Parse XML and CSS rather than trusting
// Mermaid's sanitizer or searching serialized markup for a few dangerous strings.
export function validateSvg(svg) {
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = document.documentElement;
  if (document.doctype || [...document.childNodes].some((node) => node.nodeType === Node.PROCESSING_INSTRUCTION_NODE) || root.localName !== 'svg' || document.querySelector('parsererror')) throw new Error('Invalid SVG.');
  const allowed = new Set(['svg', 'g', 'defs', 'marker', 'path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line', 'text', 'tspan', 'title', 'desc', 'style', 'clipPath', 'symbol', 'use', 'filter', 'feDropShadow', 'feGaussianBlur', 'feOffset', 'feFlood', 'feComposite', 'feMerge', 'feMergeNode', 'feColorMatrix', 'feBlend', 'linearGradient', 'radialGradient', 'stop']);
  const checkCss = (text) => {
    // CSS escapes/comments can hide resource functions. Mermaid never needs them.
    if (/[\\]|@import|@font-face|\/\*/iu.test(text)) throw new Error('Unsupported SVG CSS.');
    for (const match of text.matchAll(/url\s*\(([^)]*)\)/giu)) {
      if (!/^\s*["']?#[\w:.-]+["']?\s*$/u.test(match[1])) throw new Error('External SVG CSS resource.');
    }
    if (/(?:expression|image-set)\s*\(/iu.test(text)) throw new Error('Unsupported SVG CSS function.');
  };
  for (const element of [root, ...root.querySelectorAll('*')]) {
    if (!allowed.has(element.localName) || element.namespaceURI !== 'http://www.w3.org/2000/svg') throw new Error(`Unsupported SVG element: ${element.localName}.`);
    for (const attribute of element.attributes) {
      if (/^on/iu.test(attribute.name) || attribute.name === 'xml:base') throw new Error('Executable SVG attribute.');
      if (attribute.localName === 'href' && !/^#[\w:.-]+$/u.test(attribute.value)) throw new Error('External SVG reference.');
      if (attribute.name !== 'xmlns' && attribute.name !== 'xmlns:xlink') checkCss(attribute.value);
    }
    if (element.localName === 'style') {
      checkCss(element.textContent);
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(element.textContent);
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSStyleRule) checkCss(rule.style.cssText);
        else if (rule instanceof CSSKeyframesRule) {
          for (const frame of rule.cssRules) checkCss(frame.style.cssText);
        } else throw new Error('Unsupported SVG CSS rule.');
      }
    }
  }
  return true;
}

// The external asset is also the native full-size view. Percentage dimensions
// let browsers shrink tall diagrams to their viewport, defeating that link.
export function normalizeSvgDimensions(svg) {
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = document.documentElement;
  const values = (root.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/u).map(Number);
  if (root.localName !== 'svg' || document.querySelector('parsererror') || values.length !== 4 ||
      values.some((value) => !Number.isFinite(value)) || values[2] <= 0 || values[3] <= 0 ||
      values[2] > 1000000 || values[3] > 1000000) {
    throw new Error('Diagram has invalid intrinsic dimensions.');
  }
  const firstNode = root.querySelector('g.node[id]');
  if (firstNode?.id) root.setAttribute('data-diagram-start', encodeURIComponent(firstNode.id));
  root.setAttribute('width', String(values[2]));
  root.setAttribute('height', String(values[3]));
  for (const property of ['width', 'height', 'max-width', 'max-height']) root.style.removeProperty(property);
  if (!root.getAttribute('style')?.trim()) root.removeAttribute('style');
  return new XMLSerializer().serializeToString(document);
}

function artifactResult(key, svg) {
  const url = `/diagrams/${key}.svg`;
  // This marker is generated from encodeURIComponent, never copied as markup.
  const rootTag = /^<svg\b[^>]*>/u.exec(svg)?.[0] ?? '';
  const fragment = / data-diagram-start="([A-Za-z0-9_.!~*'()%\-]+)"/u.exec(rootTag)?.[1];
  return { url, key, fullSizeUrl: fragment ? `${url}#${fragment}` : url };
}

async function render(source, cacheDir, timeoutMs) {
  const policyError = sourcePolicyError(source);
  if (policyError) return { error: policyError };
  const key = createHash('sha256').update(JSON.stringify([policyVersion, configuration, source])).digest('hex');
  const filename = `${cacheDir}/${key}.svg`;
  try { return artifactResult(key, await readFile(filename, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (cause) {
    throw new Error('Mermaid renderer unavailable. Install locked site dependencies and run this command through ./render.sh (Playwright 1.62.0 Noble).', { cause });
  }
  try {
    const context = await browser.newContext({ javaScriptEnabled: true, serviceWorkers: 'block' });
    await context.route('**/*', (route) => route.abort());
    const page = await context.newPage();
    try {
      await page.addScriptTag({ path: require.resolve('mermaid/dist/mermaid.min.js') });
    } catch (cause) {
      throw new Error('Mermaid runtime unavailable. Install the locked apps/site dependencies and use ./render.sh.', { cause });
    }
    let timeout;
    const work = (async () => {
      const svg = await page.evaluate(async ({ source, configuration }) => {
        window.mermaid.initialize(configuration);
        return (await window.mermaid.render('firefly-diagram', source)).svg;
      }, { source, configuration });
      await page.evaluate(validateSvg, svg);
      const normalized = await page.evaluate(normalizeSvgDimensions, svg);
      await page.evaluate(validateSvg, normalized);
      return normalized;
    })();
    let svg;
    try {
      svg = await Promise.race([work, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Diagram rendering timed out.')), timeoutMs); })]);
    } catch {
      return { error: 'Diagram could not be rendered safely. View the source below.' };
    } finally { clearTimeout(timeout); }
    await mkdir(cacheDir, { recursive: true });
    const temporary = `${filename}.${randomUUID()}.tmp`;
    await writeFile(temporary, svg, { flag: 'wx' });
    await rename(temporary, filename);
    return artifactResult(key, svg);
  } finally { await browser.close(); }
}

export function renderDiagram(source, { cacheDir = diagramCache, timeoutMs = 15000 } = {}) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 15000) {
    throw new RangeError('Diagram render timeout must be positive and at most 15000 milliseconds.');
  }
  const key = `${cacheDir}\0${timeoutMs}\0${source}`;
  if (!pending.has(key)) {
    const promise = renderQueue.then(() => render(source, cacheDir, timeoutMs)).finally(() => pending.delete(key));
    renderQueue = promise.then(() => undefined, () => undefined);
    pending.set(key, promise);
  }
  return pending.get(key);
}
