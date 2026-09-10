import { defineConfig } from 'astro/config';

export default defineConfig({
  base: '/lab/majo',
  output: 'static',
  build: {
    format: 'file'
  }
});
