import { deliverNotificationOutbox } from './notifications.js';
import { loadCommentsRuntimeConfig } from './config.js';
import { requireSmtpConfig, SmtpNotificationTransport } from './smtp.js';
import { resolveCommentsDataRoot, resolveCoreDatabasePath } from './storage.js';
import path from 'node:path';

const runtimeConfig = loadCommentsRuntimeConfig();
const dataRoot = resolveCommentsDataRoot(runtimeConfig.environment, resolveCoreDatabasePath(runtimeConfig.environment));
const outboxPath = runtimeConfig.outboxPath ?? path.join(dataRoot, 'notifications.jsonl');
const statePath = runtimeConfig.outboxStatePath ?? `${outboxPath}.state.json`;
const transport = new SmtpNotificationTransport(requireSmtpConfig(runtimeConfig.environment));
const summary = await deliverNotificationOutbox(outboxPath, statePath, transport);
process.stdout.write(`${JSON.stringify(summary)}\n`);
if (summary.failed > 0) {
  process.exitCode = 1;
}
