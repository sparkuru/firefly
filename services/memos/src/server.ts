import { createMemoServer } from './http.js';
import { openRuntime } from './runtime.js';

try {
  process.umask(0o077);
  const { config, repository, service } = openRuntime();
  const server = createMemoServer(service, config.adminHash, (code) => process.stderr.write(`memos:${code}\n`));
  const timer = setInterval(() => { try { repository.maintain(); } catch { process.stderr.write('memos:maintenance_failed\n'); } }, 60000);
  timer.unref();
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.on('error', () => { clearInterval(timer); repository.close(); process.stderr.write('memos:listener_failed\n'); process.exitCode = 1; });
  server.listen(config.port, config.bind, () => process.stdout.write('memos:ready\n'));
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { clearInterval(timer); server.close(() => { repository.close(); process.exit(0); }); });
} catch { process.stderr.write('memos:startup_failed\n'); process.exitCode = 1; }
