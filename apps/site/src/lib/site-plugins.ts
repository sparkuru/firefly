import {
  FireflyPluginRegistry,
  type BuildDocumentInput,
  type BuildInput,
  type FireflyConfig,
  type FireflyPlugin,
  type PluginSiteData,
  type PostExtensionContext
} from '@firefly/x-core';
import type { CanonicalDocument } from './content';
import { loadCommentsForPosts } from '../plugins/comments/site.mjs';
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

function commentsEnabled(config: FireflyConfig): boolean {
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

const commentsPlugin: FireflyPlugin = {
  manifest: {
    id: COMMENTS_PLUGIN_ID,
    version: '0.1.0',
    configNamespace: 'plugins.comments',
    capabilities: ['site-post-extension', 'publication', 'service']
  },
  isEnabled: commentsEnabled,
  site: {
    loadBuildData(input: BuildInput): CommentsBuildData {
      return getCommentsBuildData(input.privateInput);
    },
    postExtension(context: PostExtensionContext): CommentsPostExtension {
      const buildData = getCommentsBuildData(context.buildData);
      return Object.freeze({
        pluginId: COMMENTS_PLUGIN_ID,
        postPath: context.document.route,
        comments: buildData.commentsByPost.get(context.document.route) ?? Object.freeze([])
      });
    }
  }
};

export const SITE_PLUGIN_REGISTRY = new FireflyPluginRegistry().register(commentsPlugin);

function toBuildDocument(canonical: CanonicalDocument): BuildDocumentInput {
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
): Promise<readonly PluginSiteData[]> {
  const commentsByPost = loadCommentsForPosts(posts, config.comments, config.plugins.comments.enabled);
  return SITE_PLUGIN_REGISTRY.loadSiteData({
    config: config as unknown as FireflyConfig,
    documents: posts.map(toBuildDocument),
    privateInput: { commentsByPost }
  });
}

export function postPluginExtensions(
  canonical: CanonicalDocument,
  config: SitePluginConfig,
  siteData: readonly PluginSiteData[]
): readonly unknown[] {
  return SITE_PLUGIN_REGISTRY.postExtensions(
    { document: toBuildDocument(canonical), buildData: siteData[0]?.buildData },
    config as unknown as FireflyConfig,
    siteData
  );
}

export function commentsFromPostExtensions(
  extensions: readonly unknown[] | undefined
): readonly PublicComment[] {
  const extension = extensions?.find((value): value is CommentsPostExtension => (
    isRecord(value) &&
    value.pluginId === COMMENTS_PLUGIN_ID &&
    typeof value.postPath === 'string' &&
    Array.isArray(value.comments)
  ));
  return extension?.comments ?? Object.freeze([]);
}
