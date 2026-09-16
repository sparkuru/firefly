import { unified } from '@astrojs/markdown-remark';
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
import { PRESENTATION_EXPERIENCES } from './src/lib/presentation-experiences';
import { createSiteSeoIntegration } from './src/lib/site-seo.mjs';
import { resolveDocumentContext } from './src/lib/x-core-context';

export const presentationRegistry = new PresentationRegistry();
for (const experience of PRESENTATION_EXPERIENCES) {
  presentationRegistry.register(experience.adapter);
}
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
