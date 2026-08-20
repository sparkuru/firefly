import type { Server } from 'node:http';
import {
  CommentService,
  createCommentHttpServer,
  createRouteCatalog,
  EmailCipher,
  FileNotificationTransport
} from './index.js';
import { SQLiteCommentRepository } from './sqlite-repository.js';

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
  const databasePath = env.COMMENTS_DATABASE_PATH ?? './comments.sqlite';
  const routeValue = env.COMMENTS_POST_ROUTES ?? '';
  const routes = routeValue.split(',').map((value) => value.trim()).filter(Boolean);
  if (routes.length === 0) {
    throw new Error('COMMENTS_POST_ROUTES must contain the current canonical post routes.');
  }
  const tokenSecret = env.COMMENTS_TOKEN_SECRET;
  if (!tokenSecret || tokenSecret.length < 16) {
    throw new Error('COMMENTS_TOKEN_SECRET must be provided at runtime.');
  }
  const allowedOrigins = new Set((env.COMMENTS_ALLOWED_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean));
  const repository = new SQLiteCommentRepository(databasePath);
  const service = new CommentService({
    repository,
    routeCatalog: createRouteCatalog(routes),
    emailCipher: EmailCipher.fromEnvironment(),
    verificationSecret: tokenSecret,
    controlSecret: env.COMMENTS_CONTROL_SECRET ?? tokenSecret,
    abuseSecret: env.COMMENTS_ABUSE_SECRET ?? tokenSecret,
    allowedOrigins,
    consentVersion: env.COMMENTS_CONSENT_VERSION,
    notificationTransport: new FileNotificationTransport(env.COMMENTS_OUTBOX_PATH ?? `${databasePath}.outbox.jsonl`)
  });
  const server = createCommentHttpServer(service, {
    allowedOrigins,
    adminToken: env.COMMENTS_ADMIN_TOKEN
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
