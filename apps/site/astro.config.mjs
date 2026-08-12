import { unified } from '@astrojs/markdown-remark';
import { semanticPresentation } from '@f1refly/presentation-semantic';
import { terminalPresentation } from '@f1refly/presentation-terminal';
import {
  createXCorePlugins,
  PresentationRegistry
} from '@f1refly/x-core';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { terminalHomeAssetsInlineLimit } from './src/lib/assets-inline-limit.mjs';
import { resolveDocumentContext } from './src/lib/x-core-context';

export const presentationRegistry = new PresentationRegistry()
  .register(semanticPresentation)
  .register(terminalPresentation);
const xCorePlugins = createXCorePlugins({
  registry: presentationRegistry,
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
    plugins: [tailwindcss()],
    build: {
      assetsInlineLimit: terminalHomeAssetsInlineLimit
    }
  }
});
