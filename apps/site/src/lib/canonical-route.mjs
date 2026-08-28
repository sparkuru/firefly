const markdownPath = /^[^\\/?#%\u0000-\u001f\u007f]+(?:\/[^\\/?#%\u0000-\u001f\u007f]+)*\.md$/u;
const unsafeRouteSegment = /[\\/?#%\u0000-\u001f\u007f]/u;

function fail(message) {
  throw new TypeError(`Cannot project canonical route: ${message}`);
}

function isSafeMarkdownSegment(segment) {
  return segment.length > 0 &&
    segment !== '.' &&
    segment !== '..' &&
    !segment.startsWith('.') &&
    segment.normalize('NFC') === segment &&
    !unsafeRouteSegment.test(segment);
}

function normalizeSlug(value) {
  if (typeof value !== 'string') fail('slug must be a string.');
  if (value.normalize('NFC') !== value) fail('slug must be NFC-normalized.');

  const normalized = value.replace(/\s+/gu, '-');
  if (!isSafeMarkdownSegment(normalized)) fail('slug must be one canonical safe URL segment.');
  return normalized;
}

function validateRelativePath(value) {
  if (
    typeof value !== 'string' ||
    value.normalize('NFC') !== value ||
    !markdownPath.test(value) ||
    value.split('/').some((segment) => !isSafeMarkdownSegment(segment))
  ) {
    fail('relativePath must be a safe NFC-normalized relative Markdown path.');
  }
  return value;
}

/**
 * Project a validated site collection/path/slug tuple into its canonical
 * public directory route. This helper has no Astro, filesystem, or X Core
 * dependencies; callers retain ownership of loading and validating entries.
 *
 * @param {{ collection: 'posts' | 'pages', relativePath?: string, slug: string }} input
 * @returns {string}
 */
export function projectCanonicalRoute(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    fail('input must be a plain route projection object.');
  }

  const { collection, relativePath, slug } = input;
  if (collection !== 'posts' && collection !== 'pages') {
    fail('collection must be posts or pages.');
  }

  const normalizedSlug = normalizeSlug(slug);
  const validatedPath = relativePath === undefined ? undefined : validateRelativePath(relativePath);

  if (collection === 'pages') return `/pages/${normalizedSlug}/`;
  if (validatedPath === undefined) fail('posts require a relative Markdown path.');

  const parentSegments = validatedPath.split('/').slice(0, -1);
  return `/posts/${[...parentSegments, normalizedSlug].join('/')}/`;
}
