export const PLUGIN_IDS = Object.freeze(['comments', 'memos']);
export const PLUGIN_ACCESS_PATH = 'plugins.public.v1.json';
export const PLUGIN_MARKER_ROOT = 'plugin-access';
export const PLUGIN_ENABLED_MARKER_CONTENTS = 'enabled\n';
export const PLUGIN_PUBLIC_ROUTES = Object.freeze([
  Object.freeze({ pluginId: 'comments', exact: '/v1/comments', prefix: '/v1/comments/' }),
  Object.freeze({ pluginId: 'memos', exact: '/memos', prefix: '/memos/' })
]);

function exactDataObject(value, keys, source) {
  if (value === null || typeof value !== 'object' ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new TypeError(`Invalid ${source}: expected a plain data object.`);
  }
  const actual = Reflect.ownKeys(value);
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) {
    throw new TypeError(`Invalid ${source}: expected exactly ${keys.join(', ')}.`);
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
      throw new TypeError(`Invalid ${source}.${key}: expected an enumerable data field.`);
    }
  }
  return value;
}

export function decodePluginAccess(value, source = 'plugin access') {
  const envelope = exactDataObject(value, ['schemaVersion', 'plugins'], source);
  if (envelope.schemaVersion !== 1) throw new TypeError(`Invalid ${source}.schemaVersion: expected 1.`);
  const plugins = exactDataObject(envelope.plugins, PLUGIN_IDS, `${source}.plugins`);
  const normalized = {};
  for (const id of PLUGIN_IDS) {
    const activation = exactDataObject(plugins[id], ['enabled'], `${source}.plugins.${id}`);
    if (typeof activation.enabled !== 'boolean') {
      throw new TypeError(`Invalid ${source}.plugins.${id}.enabled: expected a boolean.`);
    }
    normalized[id] = Object.freeze({ enabled: activation.enabled });
  }
  return Object.freeze({ schemaVersion: 1, plugins: Object.freeze(normalized) });
}

export function pluginAccessFromConfig(config) {
  const plugins = exactDataObject(config?.plugins, PLUGIN_IDS, 'site configuration plugins');
  const projection = { schemaVersion: 1, plugins: {} };
  for (const id of PLUGIN_IDS) {
    const activation = plugins[id];
    const descriptor = activation !== null && typeof activation === 'object'
      ? Object.getOwnPropertyDescriptor(activation, 'enabled') : undefined;
    if (!descriptor || !('value' in descriptor) || typeof descriptor.value !== 'boolean') {
      throw new TypeError(`Invalid site configuration plugins.${id}.enabled: expected a boolean data field.`);
    }
    projection.plugins[id] = { enabled: descriptor.value };
  }
  return decodePluginAccess(projection);
}

export function serializePluginAccess(access) {
  return `${JSON.stringify(decodePluginAccess(access), null, 2)}\n`;
}

export function enabledMarkerPaths(access) {
  const decoded = decodePluginAccess(access);
  return Object.freeze(PLUGIN_IDS.filter((id) => decoded.plugins[id].enabled)
    .map((id) => `${PLUGIN_MARKER_ROOT}/${id}.enabled`));
}

export function pluginForPublicPath(pathname) {
  if (typeof pathname !== 'string' || !pathname.startsWith('/') || /[\\?#\u0000-\u001f\u007f]/u.test(pathname)) {
    throw new TypeError('Expected a decoded public pathname without query, fragment, backslash or controls.');
  }
  // Match the path normalization used by static servers before selecting a mount.
  const segments = [];
  for (const segment of pathname.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') segments.pop(); else segments.push(segment);
  }
  const normalized = `/${segments.join('/')}${pathname.endsWith('/') && segments.length ? '/' : ''}`;
  return PLUGIN_PUBLIC_ROUTES.find((route) => normalized === route.exact || normalized.startsWith(route.prefix))?.pluginId ?? null;
}
