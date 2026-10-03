import { createBackup, restoreBackup } from './backup.js';
import { loadSecrets } from './config.js';
import { decodeKey, MemoCrypto } from './crypto.js';
import { openRuntime } from './runtime.js';

try {
  process.umask(0o077);
  const [operation, first, second, extra] = process.argv.slice(2);
  if (operation === 'restore' && first && second && extra === undefined) {
    const secrets = loadSecrets(process.env);
    const crypto = new MemoCrypto(decodeKey(secrets.MEMOS_ENCRYPTION_KEY), decodeKey(secrets.MEMOS_TOKEN_KEY), secrets.MEMOS_ENCRYPTION_KEY_ID ?? 'primary');
    restoreBackup(first, second, crypto);
    process.stdout.write('memos:restore_complete\n');
  } else if ((operation === 'backup' && first && second === undefined) || (['deliver', 'maintain'].includes(operation ?? '') && first === undefined)) {
    const { repository, service } = openRuntime();
    try {
      if (operation === 'backup') await createBackup(repository, first!);
      else if (operation === 'maintain') repository.maintain(1000);
      else process.stdout.write(`${JSON.stringify(await service.deliver())}\n`);
      process.stdout.write('memos:operation_complete\n');
    } finally { repository.close(); }
  } else throw new Error();
} catch { process.stderr.write('memos:operation_failed (usage: deliver | maintain | backup <absent-dir> | restore <backup-dir> <absent-dir>)\n'); process.exitCode = 1; }
