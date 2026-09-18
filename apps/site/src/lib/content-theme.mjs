/**
 * @typedef {'default' | 'paper'} ContentThemeId
 */

/** @type {ContentThemeId} */
export const DEFAULT_CONTENT_THEME_ID = 'default';

/** @type {readonly ContentThemeId[]} */
export const CONTENT_THEME_IDS = Object.freeze([
  DEFAULT_CONTENT_THEME_ID,
  'paper'
]);

const contentThemeIds = new Set(CONTENT_THEME_IDS);

/**
 * @param {unknown} value
 * @returns {value is ContentThemeId}
 */
export function isContentThemeId(value) {
  return typeof value === 'string' && contentThemeIds.has(value);
}

function describeValue(value) {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  return typeof value;
}

/**
 * @param {unknown} value
 * @returns {ContentThemeId}
 */
export function resolveContentThemeId(value) {
  const resolved = value === undefined ? DEFAULT_CONTENT_THEME_ID : value;

  if (!isContentThemeId(resolved)) {
    throw new Error(
      `Invalid content theme ID ${describeValue(value)}; expected one of ${CONTENT_THEME_IDS.join(', ')}.`
    );
  }

  return resolved;
}
