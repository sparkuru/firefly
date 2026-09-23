import { copyFile, mkdir, readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { diagramCache } from './mermaid-renderer.mjs';

export async function publishDiagramAssets(directory, cacheDir = diagramCache) {
  const keys = new Set();
  async function scan(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await scan(filename);
      else if (entry.name.endsWith('.html')) {
        const html = await readFile(filename, 'utf8');
        for (const match of html.matchAll(/(?:src|href)="\/diagrams\/([a-f0-9]{64})\.svg"/gu)) keys.add(match[1]);
      }
    }
  }
  await scan(directory);
  if (keys.size) await mkdir(path.join(directory, 'diagrams'), { recursive: true });
  for (const key of keys) {
    try { await copyFile(path.join(cacheDir, `${key}.svg`), path.join(directory, 'diagrams', `${key}.svg`)); }
    catch (cause) { throw new Error(`Missing generated diagram ${key}. Clear apps/site/.astro and rebuild through ./render.sh.`, { cause }); }
  }
  return keys;
}

export function createMermaidIntegration() {
  return {
    name: 'firefly-static-mermaid',
    hooks: {
      'astro:build:done': async ({ dir }) => { await publishDiagramAssets(fileURLToPath(dir)); },
      'astro:server:setup': ({ server }) => {
        server.middlewares.use(async (request, response, next) => {
          const match = request.url?.match(/^\/diagrams\/([a-f0-9]{64})\.svg$/u);
          if (!match) return next();
          try {
            const svg = await readFile(path.join(diagramCache, `${match[1]}.svg`));
            response.setHeader('Content-Type', 'image/svg+xml');
            response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            response.end(svg);
          } catch { response.statusCode = 404; response.end('Diagram unavailable'); }
        });
      }
    }
  };
}
