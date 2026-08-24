import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { pageSchema, postSchema } from './lib/content-schema.mjs';

const posts = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: '.generated-content/posts',
    generateId: ({ entry }) => entry.replaceAll('\\', '/')
  }),
  schema: postSchema
});

const pages = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: '.generated-content/pages',
    generateId: ({ entry }) => entry.replaceAll('\\', '/')
  }),
  schema: pageSchema
});

export const collections = { posts, pages };
