import {
  xCoreError,
  type DocumentContext,
  type DocumentContextResolver
} from '@f1refly/x-core';

interface AuthoredDocumentMetadata {
  readonly slug: string;
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
    typeof slug !== 'string' ||
    !isDocumentLayout(layout) ||
    (presentation !== undefined && typeof presentation !== 'string')
  ) {
    throw xCoreError(
      'XCORE_CONTEXT_RESOLUTION',
      'Astro document front matter is missing slug, layout, or presentation data.'
    );
  }

  return {
    slug,
    layout,
    ...(presentation ? { presentation } : {})
  };
}

function repositorySourcePath(filePath: string | undefined): string | undefined {
  if (!filePath) {
    return undefined;
  }

  const normalized = filePath.replaceAll('\\', '/');
  const contentIndex = normalized.lastIndexOf('/content/');

  if (contentIndex === -1) {
    return undefined;
  }

  return normalized.slice(contentIndex + 1);
}

export const resolveDocumentContext: DocumentContextResolver = (file) => {
  const metadata = getFrontmatter(file.data);
  const collection = metadata.layout === 'post' ? 'posts' : 'pages';
  const sourcePath = repositorySourcePath(file.path);

  return {
    documentId: `${collection}/${metadata.slug}`,
    ...(sourcePath ? { sourcePath } : {}),
    route: `/${collection}/${metadata.slug}/`,
    collection,
    slug: metadata.slug,
    layout: metadata.layout,
    presentation: metadata.presentation ?? 'semantic'
  };
};
