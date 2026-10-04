import fs from 'node:fs';

try {
  const status: unknown = JSON.parse(fs.readFileSync('/tmp/memos-worker-health.json', 'utf8'));
  const value = status as { pid: number; at: number; active: boolean };
  if (!Number.isSafeInteger(value.pid) || value.pid < 1 || !Number.isSafeInteger(value.at) || typeof value.active !== 'boolean') throw new Error();
  process.kill(value.pid, 0);
  const age = Date.now() - value.at;
  if (age < 0 || age > (value.active ? 190000 : 45000)) throw new Error();
} catch { process.exitCode = 1; }
