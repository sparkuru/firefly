import type { DocumentCollection } from './contracts.js';

export const FIREFLY_PLUGIN_CAPABILITIES = [
  'site-post-extension',
  'publication',
  'service'
] as const;

export type FireflyPluginCapability = (typeof FIREFLY_PLUGIN_CAPABILITIES)[number];

export interface FireflyConfig {
  readonly [namespace: string]: unknown;
}

export interface FireflyPluginManifest {
  readonly id: string;
  readonly version: string;
  readonly configNamespace: string;
  readonly capabilities: readonly FireflyPluginCapability[];
}

export interface BuildDocumentInput {
  readonly id: string;
  readonly route: string;
  readonly collection: DocumentCollection;
  readonly presentation: string;
}

export interface BuildInput {
  readonly config: FireflyConfig;
  readonly documents: readonly BuildDocumentInput[];
  readonly repositoryRoot?: string;
  readonly privateInput?: unknown;
}

export interface PostExtensionContext {
  readonly document: BuildDocumentInput;
  readonly buildData: unknown;
}

export interface PublicationInput {
  readonly config: FireflyConfig;
  readonly repositoryRoot: string;
  readonly siteOutput: string;
  readonly privateInput?: unknown;
}

export interface PublicationContribution {
  readonly pluginId: string;
  readonly schemaVersion: number;
  readonly metadata: unknown;
}

export interface HealthResult {
  readonly ok: boolean;
  readonly status: string;
  readonly details?: Readonly<Record<string, string | number | boolean>>;
}

export interface FireflyPlugin {
  readonly manifest: FireflyPluginManifest;
  readonly isEnabled: (config: FireflyConfig) => boolean;
  readonly site?: {
    readonly loadBuildData: (input: BuildInput) => Promise<unknown> | unknown;
    readonly postExtension: (context: PostExtensionContext) => unknown;
  };
  readonly publication?: {
    readonly contribute: (input: PublicationInput) => Promise<PublicationContribution>;
  };
  readonly service?: {
    readonly start: () => Promise<void>;
    readonly health: () => Promise<HealthResult>;
  };
}

export interface PluginSiteData {
  readonly plugin: FireflyPlugin;
  readonly buildData: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertManifest(manifest: FireflyPluginManifest): void {
  if (!isRecord(manifest) || typeof manifest.id !== 'string' || !/^[a-z][a-z0-9-]*$/u.test(manifest.id)) {
    throw new TypeError('Firefly plugin IDs must use lowercase kebab-case.');
  }
  if (typeof manifest.version !== 'string' || manifest.version.length === 0) {
    throw new TypeError(`Firefly plugin "${manifest.id}" must declare a version.`);
  }
  if (typeof manifest.configNamespace !== 'string' || !/^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)*$/u.test(manifest.configNamespace)) {
    throw new TypeError(`Firefly plugin "${manifest.id}" must declare a dotted configuration namespace.`);
  }
  if (!Array.isArray(manifest.capabilities) || manifest.capabilities.length === 0) {
    throw new TypeError(`Firefly plugin "${manifest.id}" must declare at least one capability.`);
  }
  const capabilities = new Set(FIREFLY_PLUGIN_CAPABILITIES);
  for (const capability of manifest.capabilities) {
    if (!capabilities.has(capability)) {
      throw new TypeError(`Firefly plugin "${manifest.id}" declares an unknown capability.`);
    }
  }
}

function assertPlugin(plugin: FireflyPlugin): void {
  if (!isRecord(plugin) || typeof plugin.isEnabled !== 'function') {
    throw new TypeError('Firefly plugins require a manifest and isEnabled function.');
  }
  assertManifest(plugin.manifest);
}

export class FireflyPluginRegistry {
  readonly #plugins = new Map<string, FireflyPlugin>();

  register(plugin: FireflyPlugin): this {
    assertPlugin(plugin);
    if (this.#plugins.has(plugin.manifest.id)) {
      throw new TypeError(`Firefly plugin "${plugin.manifest.id}" is already registered.`);
    }
    this.#plugins.set(plugin.manifest.id, plugin);
    return this;
  }

  get(id: string): FireflyPlugin | undefined {
    return this.#plugins.get(id);
  }

  all(): readonly FireflyPlugin[] {
    return [...this.#plugins.values()];
  }

  enabled(config: FireflyConfig): readonly FireflyPlugin[] {
    return this.all().filter((plugin) => plugin.isEnabled(config));
  }

  async loadSiteData(input: BuildInput): Promise<readonly PluginSiteData[]> {
    const loaded: PluginSiteData[] = [];
    for (const plugin of this.enabled(input.config)) {
      if (!plugin.site) continue;
      loaded.push({ plugin, buildData: await plugin.site.loadBuildData(input) });
    }
    return loaded;
  }

  postExtensions(
    context: PostExtensionContext,
    config: FireflyConfig,
    siteData: readonly PluginSiteData[]
  ): readonly unknown[] {
    if (context.document.collection !== 'posts') return [];
    return siteData
      .filter(({ plugin }) => plugin.isEnabled(config) && plugin.site)
      .map(({ plugin, buildData }) => plugin.site!.postExtension({ ...context, buildData }));
  }

  async publicationContributions(input: PublicationInput): Promise<readonly PublicationContribution[]> {
    const contributions: PublicationContribution[] = [];
    for (const plugin of this.enabled(input.config)) {
      if (!plugin.publication) continue;
      const contribution = await plugin.publication.contribute(input);
      if (contribution.pluginId !== plugin.manifest.id || !Number.isSafeInteger(contribution.schemaVersion) || contribution.schemaVersion < 1) {
        throw new TypeError(`Firefly plugin "${plugin.manifest.id}" returned invalid publication metadata.`);
      }
      contributions.push(contribution);
    }
    return contributions;
  }

  servicePlugins(config: FireflyConfig): readonly FireflyPlugin[] {
    return this.enabled(config).filter((plugin) => plugin.service !== undefined);
  }
}

export const PluginRegistry = FireflyPluginRegistry;
