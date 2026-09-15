/**
 * @typedef {'default' | 'paper'} ArticleThemeId
 */

/** @type {ArticleThemeId} */
export const DEFAULT_ARTICLE_THEME_ID = 'default';

/** @type {readonly ArticleThemeId[]} */
export const ARTICLE_THEME_IDS = Object.freeze([
  DEFAULT_ARTICLE_THEME_ID,
  'paper'
]);

const articleThemeIds = new Set(ARTICLE_THEME_IDS);

/**
 * @param {unknown} value
 * @returns {value is ArticleThemeId}
 */
export function isArticleThemeId(value) {
  return typeof value === 'string' && articleThemeIds.has(value);
}

function describeValue(value) {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  return typeof value;
}

/**
 * @param {unknown} value
 * @returns {ArticleThemeId}
 */
export function resolveArticleThemeId(value) {
  const resolved = value === undefined ? DEFAULT_ARTICLE_THEME_ID : value;

  if (!isArticleThemeId(resolved)) {
    throw new Error(
      `Invalid article theme ID ${describeValue(value)}; expected one of ${ARTICLE_THEME_IDS.join(', ')}.`
    );
  }

  return resolved;
}
