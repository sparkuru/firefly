import { rehypeMemoMarkdown } from './src/build/memo-markdown.mjs';
import { rehypeMemoBodyCompatibility } from './src/build/memo-body-compatibility.mjs';
import { createMemoAssetsIntegration } from './src/build/memo-assets.mjs';
import { createFireflyAssetsIntegration, resolveFireflyMedia } from './src/build/firefly-assets.mjs';
import { createFireflyBlockPlugins } from './src/build/firefly-blocks.mjs';
import { diagramPipelineVersion, rehypeMermaid } from './src/build/mermaid-markdown.mjs';
import { createMermaidIntegration } from './src/build/mermaid-assets.mjs';
import { createPluginAccessIntegration } from './src/build/plugin-access.mjs';
import { unified } from '@astrojs/markdown-remark';
import { siteRehypeShiki, siteSyntaxHighlight } from './src/build/code-highlighting.mjs';
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
const fireflyBlockPlugins = createFireflyBlockPlugins({ resolveMedia: resolveFireflyMedia, resolveContext: resolveDocumentContext });

export default defineConfig({
  output: 'static',
  // Content HTML and generated diagrams share the same cold-cache boundary.
  cacheDir: './.astro/cache/',
  trailingSlash: 'always',
  integrations: [createSiteSeoIntegration(), createMermaidIntegration(), createPluginAccessIntegration(), createMemoAssetsIntegration(), createFireflyAssetsIntegration()],
  markdown: {
    syntaxHighlight: siteSyntaxHighlight,
    processor: unified({
      remarkPlugins: [fireflyBlockPlugins.remarkPlugin, xCorePlugins.remarkPlugin],
      rehypePlugins: [
        rehypeRaw,
        [rehypeSanitize, markdownHtmlSchema],
        fireflyBlockPlugins.rehypePlugin,
        [rehypeMemoBodyCompatibility, { resolveContext: resolveDocumentContext }],
        siteRehypeShiki,
        [rehypeMermaid, { resolveContext: resolveDocumentContext, pipelineVersion: diagramPipelineVersion }],
        xCorePlugins.rehypePlugin,
        [rehypeMemoMarkdown, { resolveContext: resolveDocumentContext }]
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
