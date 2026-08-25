/**
 * @typedef {Readonly<{
 *   id: 'featured',
 *   label: 'Featured',
 *   tone: 'accent'
 * }>} ContentMarker
 */

const registry = new Map([
  ['featured', Object.freeze({
    id: 'featured',
    label: 'Featured',
    tone: 'accent'
  })]
]);

export const supportedContentMarkerIds = Object.freeze([...registry.keys()]);

/**
 * @param {readonly string[] | undefined} markerIds
 * @returns {readonly ContentMarker[]}
 */
export function resolveContentMarkers(markerIds = []) {
  if (!Array.isArray(markerIds)) return Object.freeze([]);

  const resolved = [];
  const seen = new Set();
  for (const markerId of markerIds) {
    if (seen.has(markerId)) continue;
    seen.add(markerId);
    const marker = registry.get(markerId);
    if (marker !== undefined) resolved.push(marker);
  }
  return Object.freeze(resolved);
}
