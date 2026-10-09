export const DEFAULT_POST_LICENSE = 'CC-BY-NC-4.0';
export const POST_LICENSE_IDS = Object.freeze([
  'CC-BY-4.0', 'CC-BY-SA-4.0', 'CC-BY-ND-4.0',
  'CC-BY-NC-4.0', 'CC-BY-NC-SA-4.0', 'CC-BY-NC-ND-4.0'
]);
export const POST_LICENSES = Object.freeze(Object.fromEntries(POST_LICENSE_IDS.map(id => {
  const code = id.slice(3, -4);
  return [id, Object.freeze({ label: `CC ${code} 4.0`, href: `https://creativecommons.org/licenses/${code.toLowerCase()}/4.0/` })];
})));

export function getPostLicense(id) {
  if (typeof id !== 'string' || !Object.hasOwn(POST_LICENSES, id)) throw new Error('Invalid post license.');
  return POST_LICENSES[id];
}
