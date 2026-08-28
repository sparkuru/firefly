const sitePluginIdPattern = /^[a-z][a-z0-9-]*$/u;

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertSitePlugin(plugin) {
  const allowedPluginKeys = new Set(['manifest', 'isEnabled', 'loadBuildData', 'postExtension']);
  if (
    !isRecord(plugin) ||
    Reflect.ownKeys(plugin).some((key) => typeof key !== 'string' || !allowedPluginKeys.has(key)) ||
    !isRecord(plugin.manifest) ||
    Reflect.ownKeys(plugin.manifest).some((key) => key !== 'id') ||
    typeof plugin.manifest.id !== 'string' ||
    !sitePluginIdPattern.test(plugin.manifest.id) ||
    typeof plugin.isEnabled !== 'function' ||
    typeof plugin.loadBuildData !== 'function' ||
    typeof plugin.postExtension !== 'function'
  ) {
    throw new TypeError('Site plugins require a lowercase kebab-case manifest ID, isEnabled, loadBuildData, and postExtension.');
  }
}

export class SitePluginRegistry {
  #plugins = new Map();

  register(plugin) {
    assertSitePlugin(plugin);
    if (this.#plugins.has(plugin.manifest.id)) {
      throw new TypeError(`Site plugin "${plugin.manifest.id}" is already registered.`);
    }
    this.#plugins.set(plugin.manifest.id, plugin);
    return this;
  }

  get(id) {
    return this.#plugins.get(id);
  }

  all() {
    return [...this.#plugins.values()];
  }

  enabled(config) {
    return this.all().filter((plugin) => plugin.isEnabled(config));
  }

  async loadBuildData(input) {
    const loaded = [];
    for (const plugin of this.enabled(input.config)) {
      loaded.push({ plugin, buildData: await plugin.loadBuildData(input) });
    }
    return loaded;
  }

  postExtensions(context, config, siteData) {
    if (context.document.collection !== 'posts') return [];
    return siteData
      .filter(({ plugin }) => plugin.isEnabled(config))
      .map(({ plugin, buildData }) => plugin.postExtension({ ...context, buildData }));
  }
}
