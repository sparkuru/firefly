import { CommentService, createRouteCatalog, createCommentHttpServer, EmailCipher, FileNotificationTransport, listenCommentHttpServer } from './index.js';
import { SQLiteCommentRepository } from './sqlite-repository.js';

const databasePath = process.env.COMMENTS_DATABASE_PATH ?? './comments.sqlite';
const routeValue = process.env.COMMENTS_POST_ROUTES ?? '';
const routes = routeValue.split(',').map((value) => value.trim()).filter(Boolean);
if (routes.length === 0) {
  throw new Error('COMMENTS_POST_ROUTES must contain the current canonical post routes.');
}
const tokenSecret = process.env.COMMENTS_TOKEN_SECRET;
if (!tokenSecret || tokenSecret.length < 16) {
  throw new Error('COMMENTS_TOKEN_SECRET must be provided at runtime.');
}
const allowedOrigins = new Set((process.env.COMMENTS_ALLOWED_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean));
const repository = new SQLiteCommentRepository(databasePath);
const service = new CommentService({
  repository,
  routeCatalog: createRouteCatalog(routes),
  emailCipher: EmailCipher.fromEnvironment(),
  verificationSecret: tokenSecret,
  controlSecret: process.env.COMMENTS_CONTROL_SECRET ?? tokenSecret,
  abuseSecret: process.env.COMMENTS_ABUSE_SECRET ?? tokenSecret,
  allowedOrigins,
  consentVersion: process.env.COMMENTS_CONSENT_VERSION,
  notificationTransport: new FileNotificationTransport(process.env.COMMENTS_OUTBOX_PATH ?? `${databasePath}.outbox.jsonl`)
});
const server = createCommentHttpServer(service, {
  allowedOrigins,
  adminToken: process.env.COMMENTS_ADMIN_TOKEN
});
const port = Number(process.env.COMMENTS_PORT ?? '8787');
await listenCommentHttpServer(server, port, process.env.COMMENTS_BIND ?? '0.0.0.0');
process.stdout.write(`Comments service listening on ${port}\n`);

const shutdown = (): void => {
  server.close(() => {
    service.close();
  });
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
