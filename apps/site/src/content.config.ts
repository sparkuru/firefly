import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { pageSchema, postSchema } from './lib/content-schema.mjs';

const posts = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: '../../content/posts'
  }),
  schema: postSchema
});

const pages = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: '../../content/pages'
  }),
  schema: pageSchema
});

export const collections = { posts, pages };
