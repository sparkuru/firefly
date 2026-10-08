import { defineCollection } from 'astro:content';
import { memoSchema, pageSchema, postSchema } from './lib/content-schema.mjs';
import { workspaceCollectionLoader } from './lib/workspace-collection-loader.mjs';

const posts = defineCollection({
  loader: workspaceCollectionLoader('posts'),
  schema: postSchema
});

const pages = defineCollection({
  loader: workspaceCollectionLoader('pages'),
  schema: pageSchema
});

const memos = defineCollection({
  loader: workspaceCollectionLoader('memos'),
  schema: memoSchema
});

export const collections = { posts, pages, memos };
