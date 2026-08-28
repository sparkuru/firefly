export interface SitePluginManifest {
  readonly id: string;
}

export interface SiteBuildDocument {
  readonly id: string;
  readonly route: string;
  readonly collection: 'posts' | 'pages';
  readonly presentation: string;
}

export interface SitePluginBuildInput<Config> {
  readonly config: Config;
  readonly documents: readonly SiteBuildDocument[];
  readonly preparedInput: unknown;
}

export interface SitePluginPostExtensionContext {
  readonly document: SiteBuildDocument;
  readonly buildData: unknown;
}

export interface SitePlugin<Config = unknown> {
  readonly manifest: SitePluginManifest;
  readonly isEnabled: (config: Config) => boolean;
  readonly loadBuildData: (input: SitePluginBuildInput<Config>) => Promise<unknown> | unknown;
  readonly postExtension: (context: SitePluginPostExtensionContext) => unknown;
}

export interface SitePluginData<Config = unknown> {
  readonly plugin: SitePlugin<Config>;
  readonly buildData: unknown;
}

export class SitePluginRegistry<Config = unknown> {
  register(plugin: SitePlugin<Config>): this;
  get(id: string): SitePlugin<Config> | undefined;
  all(): readonly SitePlugin<Config>[];
  enabled(config: Config): readonly SitePlugin<Config>[];
  loadBuildData(input: SitePluginBuildInput<Config>): Promise<readonly SitePluginData<Config>[]>;
  postExtensions(
    context: SitePluginPostExtensionContext,
    config: Config,
    siteData: readonly SitePluginData<Config>[]
  ): readonly unknown[];
}
