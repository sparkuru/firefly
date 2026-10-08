import { readdir } from 'node:fs/promises';
import { glob } from 'astro/loaders';

export function workspaceCollectionLoader(collection) {
  const base = '.generated-content/' + collection;
  const loader = glob({
    pattern: '**/*.md',
    base,
    generateId: ({ entry }) => entry.replaceAll('\\', '/')
  });
  return {
    ...loader,
    async load(context) {
      const entries = await readdir(new URL(base + '/', context.config.root), {
        recursive: true,
        withFileTypes: true
      });
      // Astro's glob loader returns before pruning on an empty directory.
      // A complete withdrawal must not republish records from the prior build.
      if (!entries.some((entry) => entry.isFile() && entry.name.endsWith('.md'))) {
        context.store.clear();
      }
      await loader.load(context);
    }
  };
}
