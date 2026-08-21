import type { Server } from 'node:http';
import { loadCommentsRuntimeConfig } from './config.js';
import {
  CommentService,
  createCommentHttpServer,
  createRouteCatalog,
  EmailCipher,
  FileNotificationTransport
} from './index.js';
import { SQLiteCommentRepository } from './sqlite-repository.js';
import { resolveCommentsDataRoot, resolveCoreDatabasePath } from './storage.js';
import path from 'node:path';

export const COMMENTS_PLUGIN_MANIFEST = Object.freeze({
  id: 'comments',
  version: '0.1.0',
  configNamespace: 'comments',
  capabilities: ['site-post-extension', 'publication', 'service'] as const
});

export interface CommentsServiceRuntime {
  readonly service: CommentService;
  readonly server: Server;
  readonly close: () => void;
}

export function createCommentsServiceRuntime(env: NodeJS.ProcessEnv = process.env): CommentsServiceRuntime {
  const runtimeConfig = loadCommentsRuntimeConfig(env);
  const databasePath = resolveCoreDatabasePath(runtimeConfig.environment);
  const dataRoot = resolveCommentsDataRoot(runtimeConfig.environment, databasePath);
  const routeValue = runtimeConfig.environment.COMMENTS_POST_ROUTES ?? '';
  const routes = routeValue.split(',').map((value) => value.trim()).filter(Boolean);
  if (routes.length === 0) {
    throw new Error('COMMENTS_POST_ROUTES must contain the current canonical post routes.');
  }
  const tokenSecret = runtimeConfig.environment.COMMENTS_TOKEN_SECRET;
  if (!tokenSecret || tokenSecret.length < 16) {
    throw new Error('COMMENTS_TOKEN_SECRET must be provided at runtime.');
  }
  const configuredOrigins = runtimeConfig.environment.COMMENTS_ALLOWED_ORIGINS
    ?? runtimeConfig.environment.COMMENTS_PUBLIC_ORIGIN
    ?? '';
  const allowedOrigins = new Set(configuredOrigins.split(',').map((value) => value.trim()).filter(Boolean));
  const repository = new SQLiteCommentRepository(databasePath, { dataRoot });
  const service = new CommentService({
    repository,
    routeCatalog: createRouteCatalog(routes),
    emailCipher: EmailCipher.fromEnvironment('COMMENTS_EMAIL_KEY', runtimeConfig.environment),
    verificationSecret: tokenSecret,
    controlSecret: runtimeConfig.environment.COMMENTS_CONTROL_SECRET ?? tokenSecret,
    abuseSecret: runtimeConfig.environment.COMMENTS_ABUSE_SECRET ?? tokenSecret,
    allowedOrigins,
    consentVersion: runtimeConfig.environment.COMMENTS_CONSENT_VERSION,
    notificationTransport: new FileNotificationTransport(runtimeConfig.outboxPath ?? path.join(dataRoot, 'notifications.jsonl'))
  });
  const server = createCommentHttpServer(service, {
    allowedOrigins,
    adminToken: runtimeConfig.environment.COMMENTS_ADMIN_TOKEN
  });
  let closed = false;
  return {
    service,
    server,
    close: () => {
      if (closed) return;
      closed = true;
      service.close();
      if (server.listening) {
        server.close();
      }
    }
  };
}
