import { unified } from '@astrojs/markdown-remark';
import { semanticPresentation } from '@firefly/presentation-semantic';
import { terminalPresentation } from '@firefly/presentation-terminal';
import {
  createXCorePlugins,
  PresentationRegistry
} from '@firefly/x-core';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { terminalHomeAssetsInlineLimit } from './src/lib/assets-inline-limit.mjs';
import { markdownHtmlSchema } from './src/lib/markdown-html-policy.mjs';
import { createSiteSeoIntegration } from './src/lib/site-seo.mjs';
import { resolveDocumentContext } from './src/lib/x-core-context';

export const presentationRegistry = new PresentationRegistry()
  .register(semanticPresentation)
  .register(terminalPresentation);
const xCorePlugins = createXCorePlugins({
  registry: presentationRegistry,
  resolveContext: resolveDocumentContext,
  allowAuthoredHtml: true
});

export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  integrations: [createSiteSeoIntegration()],
  markdown: {
    processor: unified({
      remarkPlugins: [xCorePlugins.remarkPlugin],
      rehypePlugins: [
        rehypeRaw,
        [rehypeSanitize, markdownHtmlSchema],
        xCorePlugins.rehypePlugin
      ],
      remarkRehype: { allowDangerousHtml: true }
    })
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      assetsInlineLimit: terminalHomeAssetsInlineLimit
    }
  }
});
