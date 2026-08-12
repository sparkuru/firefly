import { unified } from '@astrojs/markdown-remark';
import { semanticPresentation } from '@f1refly/presentation-semantic';
import {
  createXCorePlugins,
  PresentationRegistry
} from '@f1refly/x-core';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { resolveDocumentContext } from './src/lib/x-core-context';

const registry = new PresentationRegistry().register(semanticPresentation);
const xCorePlugins = createXCorePlugins({
  registry,
  resolveContext: resolveDocumentContext
});

export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  markdown: {
    processor: unified({
      remarkPlugins: [xCorePlugins.remarkPlugin],
      rehypePlugins: [xCorePlugins.rehypePlugin],
      remarkRehype: { allowDangerousHtml: false }
    })
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
