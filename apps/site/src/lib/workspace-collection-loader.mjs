import { readFile, readdir } from 'node:fs/promises';
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
      if (collection === 'posts' || collection === 'pages') {
        // Rendered media URLs depend on asset bytes outside the Markdown source.
        const mediaDigest = context.generateDigest(await readFile(
          new URL('.generated-content/.firefly-media.json', context.config.root),
          'utf8'
        ));
        await loader.load({
          ...context,
          generateDigest: (data) => context.generateDigest([data, mediaDigest])
        });
      } else {
        await loader.load(context);
      }
    }
  };
}
