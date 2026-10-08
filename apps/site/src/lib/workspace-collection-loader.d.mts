import type { Loader } from 'astro/loaders';

export function workspaceCollectionLoader(collection: 'posts' | 'pages' | 'memos'): Loader;
