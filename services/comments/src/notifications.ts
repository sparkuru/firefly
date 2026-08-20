import { appendFile, chmod } from 'node:fs/promises';

import type { NotificationMessage, NotificationTransport } from './types.js';

export class FileNotificationTransport implements NotificationTransport {
  constructor(private readonly path: string) {}

  async send(message: NotificationMessage): Promise<void> {
    await appendFile(this.path, `${JSON.stringify(message)}\n`, { encoding: 'utf8', mode: 0o600 });
    await chmod(this.path, 0o600);
  }
}
