import fs from 'node:fs';
import { openRuntime } from './runtime.js';
import { startDeliveryWorker } from './worker.js';

try {
  process.umask(0o077);
  const { repository, service } = openRuntime();
  const worker = startDeliveryWorker({
    deliver: (limit) => service.deliver(limit), close: () => repository.close(),
    diagnostic: (code) => process.stderr.write(`memos:${code}\n`),
    heartbeat: (active) => fs.writeFileSync('/tmp/memos-worker-health.json', JSON.stringify({ pid: process.pid, at: Date.now(), active }), { mode: 0o600 })
  });
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => {
    void worker.stop().then(() => { fs.rmSync('/tmp/memos-worker-health.json', { force: true }); process.exit(0); })
      .catch(() => { process.stderr.write('memos:worker_shutdown_failed\n'); process.exit(1); });
  });
} catch { process.stderr.write('memos:worker_startup_failed\n'); process.exitCode = 1; }
