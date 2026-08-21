import { listenCommentHttpServer } from './index.js';
import { createCommentsServiceRuntime } from './plugin.js';

const runtime = createCommentsServiceRuntime();
const port = Number(process.env.COMMENTS_PORT ?? '8787');
await listenCommentHttpServer(runtime.server, port, process.env.COMMENTS_BIND ?? '127.0.0.1');
process.stdout.write(`Comments service listening on ${port}\n`);

const shutdown = (): void => {
  runtime.close();
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
