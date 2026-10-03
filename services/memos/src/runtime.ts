import { loadConfig } from './config.js';
import { MemoRepository } from './repository.js';
import { MemoService } from './service.js';
import { SmtpTransport } from './smtp.js';

export function openRuntime() {
  const config = loadConfig();
  const repository = new MemoRepository(config.databasePath, config.crypto);
  return { config, repository, service: new MemoService(repository, config.plugin, config.smtp ? new SmtpTransport(config.smtp) : null) };
}
