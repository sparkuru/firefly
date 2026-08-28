import type { CanonicalDocument } from './content';
import {
  SitePluginRegistry,
  type SiteBuildDocument,
  type SitePlugin,
  type SitePluginBuildInput,
  type SitePluginData,
  type SitePluginPostExtensionContext
} from './site-plugin-registry.mjs';
import {
  commentsPostPathFromSiteHref,
  loadCommentsForPosts
} from '../plugins/comments/site.mjs';
import type { CommentsSiteConfig, PublicComment } from './comments';
import type { CommentsActivationConfig } from '../../../../plugins/comments/config.mjs';

const COMMENTS_PLUGIN_ID = 'comments' as const;

export interface CommentsPostExtension {
  readonly pluginId: typeof COMMENTS_PLUGIN_ID;
  readonly postPath: string;
  readonly comments: readonly PublicComment[];
}

interface CommentsBuildData {
  readonly commentsByPost: ReadonlyMap<string, readonly PublicComment[]>;
}

interface SitePluginConfig {
  readonly plugins: {
    readonly comments: CommentsActivationConfig;
  };
  readonly comments: CommentsSiteConfig;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function commentsEnabled(config: SitePluginConfig): boolean {
  const plugins = config.plugins;
  if (!isRecord(plugins) || !isRecord(plugins.comments)) return false;
  return plugins.comments.enabled === true;
}

function getCommentsBuildData(value: unknown): CommentsBuildData {
  if (!isRecord(value) || !(value.commentsByPost instanceof Map)) {
    throw new TypeError('The comments plugin requires a build-time comments map.');
  }
  return value as unknown as CommentsBuildData;
}

const commentsPlugin: SitePlugin<SitePluginConfig> = {
  manifest: {
    id: COMMENTS_PLUGIN_ID
  },
  isEnabled: commentsEnabled,
  loadBuildData(input: SitePluginBuildInput<SitePluginConfig>): CommentsBuildData {
    return getCommentsBuildData(input.preparedInput);
  },
  postExtension(context: SitePluginPostExtensionContext): CommentsPostExtension {
    const buildData = getCommentsBuildData(context.buildData);
    const postPath = commentsPostPathFromSiteHref(context.document.route);
    if (postPath === null) {
      throw new TypeError(`The comments plugin cannot represent public post route ${context.document.route}.`);
    }
    return Object.freeze({
      pluginId: COMMENTS_PLUGIN_ID,
      postPath,
      comments: buildData.commentsByPost.get(context.document.route) ?? Object.freeze([])
    });
  }
};

export const SITE_PLUGIN_REGISTRY = new SitePluginRegistry<SitePluginConfig>().register(commentsPlugin);

function toBuildDocument(canonical: CanonicalDocument): SiteBuildDocument {
  return {
    id: canonical.href,
    route: canonical.href,
    collection: canonical.collection,
    presentation: canonical.entry.data.presentation ?? 'firefly'
  };
}

export async function loadPostPluginData(
  posts: readonly CanonicalDocument[],
  config: SitePluginConfig
): Promise<readonly SitePluginData<SitePluginConfig>[]> {
  const commentsByPost = loadCommentsForPosts(posts, config.comments, config.plugins.comments.enabled);
  return SITE_PLUGIN_REGISTRY.loadBuildData({
    config,
    documents: posts.map(toBuildDocument),
    preparedInput: { commentsByPost }
  });
}

export function postPluginExtensions(
  canonical: CanonicalDocument,
  config: SitePluginConfig,
  siteData: readonly SitePluginData<SitePluginConfig>[]
): readonly unknown[] {
  return SITE_PLUGIN_REGISTRY.postExtensions(
    { document: toBuildDocument(canonical), buildData: siteData[0]?.buildData },
    config,
    siteData
  );
}

export function commentsPresentationFromPostExtensions(
  extensions: readonly unknown[] | undefined
): CommentsPostExtension | null {
  const extension = extensions?.find((value): value is CommentsPostExtension => (
    isRecord(value) &&
    value.pluginId === COMMENTS_PLUGIN_ID &&
    typeof value.postPath === 'string' &&
    Array.isArray(value.comments)
  ));
  return extension ?? null;
}
