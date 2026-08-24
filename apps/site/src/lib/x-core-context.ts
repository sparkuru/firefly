import {
  DEFAULT_PRESENTATION_ID,
  xCoreError,
  type DocumentContext,
  type DocumentContextResolver
} from '@firefly/x-core';

interface AuthoredDocumentMetadata {
  readonly slug?: string;
  readonly layout: DocumentContext['layout'];
  readonly presentation?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDocumentLayout(value: unknown): value is DocumentContext['layout'] {
  return (
    value === 'post' ||
    value === 'page' ||
    value === 'timeline' ||
    value === 'files'
  );
}

function getFrontmatter(
  data: Readonly<Record<string, unknown>>
): AuthoredDocumentMetadata {
  const astro = data.astro;

  if (!isRecord(astro) || !isRecord(astro.frontmatter)) {
    throw xCoreError(
      'XCORE_CONTEXT_RESOLUTION',
      'Astro did not provide validated document front matter.'
    );
  }

  const { slug, layout, presentation } = astro.frontmatter;

  if (
    (slug !== undefined && typeof slug !== 'string') ||
    !isDocumentLayout(layout) ||
    (presentation !== undefined && typeof presentation !== 'string')
  ) {
    throw xCoreError(
      'XCORE_CONTEXT_RESOLUTION',
      'Astro document front matter is missing slug, layout, or presentation data.'
    );
  }

  return {
    ...(slug ? { slug } : {}),
    layout,
    ...(presentation ? { presentation } : {})
  };
}

function stagedRelativePath(filePath: string | undefined, collection: 'posts' | 'pages'): string | undefined {
  if (!filePath) {
    return undefined;
  }

  const normalized = filePath.replaceAll('\\', '/');
  const stageMarker = `/.generated-content/${collection}/`;
  const contentIndex = normalized.lastIndexOf(stageMarker);

  if (contentIndex === -1) {
    return undefined;
  }

  return normalized.slice(contentIndex + stageMarker.length);
}

export const resolveDocumentContext: DocumentContextResolver = (file) => {
  const metadata = getFrontmatter(file.data);
  const collection = metadata.layout === 'post' ? 'posts' : 'pages';
  const relativePath = stagedRelativePath(file.path, collection);
  const slug = (collection === 'posts'
    ? metadata.slug ?? relativePath?.split('/').at(-1)?.replace(/\.md$/u, '')
    : metadata.slug)?.replace(/\s+/gu, '-');
  if (slug === undefined) {
    throw xCoreError('XCORE_CONTEXT_RESOLUTION', 'Astro document path cannot be mapped to a canonical route.');
  }
  const relativeRoute = collection === 'posts'
    ? (() => {
        const physicalPath = relativePath?.replace(/\.md$/u, '');
        if (physicalPath === undefined || slug === undefined) return undefined;
        const parent = physicalPath.slice(0, physicalPath.lastIndexOf('/'));
        return parent.length === 0 ? slug : `${parent}/${slug}`;
      })()
    : slug;
  if (relativeRoute === undefined) {
    throw xCoreError('XCORE_CONTEXT_RESOLUTION', 'Astro document path cannot be mapped to a canonical route.');
  }

  return {
    documentId: `${collection}/${relativePath ?? `${slug}.md`}`,
    sourcePath: `${collection}/${relativePath ?? `${slug}.md`}`,
    route: `/${collection}/${relativeRoute}/`,
    collection,
    slug,
    layout: metadata.layout,
    presentation: metadata.presentation ?? DEFAULT_PRESENTATION_ID
  };
};
