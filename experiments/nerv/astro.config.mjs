import { defineConfig } from 'astro/config';

export default defineConfig({
  base: '/lab/nerv',
  output: 'static',
  build: {
    format: 'file'
  }
});
