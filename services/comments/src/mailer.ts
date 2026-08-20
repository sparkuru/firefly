import { deliverNotificationOutbox } from './notifications.js';
import { requireSmtpConfig, SmtpNotificationTransport } from './smtp.js';

const outboxPath = process.env.COMMENTS_OUTBOX_PATH ?? './comments.sqlite.outbox.jsonl';
const statePath = process.env.COMMENTS_OUTBOX_STATE_PATH ?? `${outboxPath}.state.json`;
const transport = new SmtpNotificationTransport(requireSmtpConfig());
const summary = await deliverNotificationOutbox(outboxPath, statePath, transport);
process.stdout.write(`${JSON.stringify(summary)}\n`);
if (summary.failed > 0) {
  process.exitCode = 1;
}
