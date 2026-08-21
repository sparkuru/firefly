import { deliverNotificationOutbox } from './notifications.js';
import { loadCommentsRuntimeConfig } from './config.js';
import { requireSmtpConfig, SmtpNotificationTransport } from './smtp.js';

const runtimeConfig = loadCommentsRuntimeConfig();
const outboxPath = runtimeConfig.outboxPath ?? './comments.sqlite.outbox.jsonl';
const statePath = runtimeConfig.outboxStatePath ?? `${outboxPath}.state.json`;
const transport = new SmtpNotificationTransport(requireSmtpConfig(runtimeConfig.environment));
const summary = await deliverNotificationOutbox(outboxPath, statePath, transport);
process.stdout.write(`${JSON.stringify(summary)}\n`);
if (summary.failed > 0) {
  process.exitCode = 1;
}
