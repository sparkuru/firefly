import { unified } from '@astrojs/markdown-remark';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  markdown: {
    processor: unified()
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
