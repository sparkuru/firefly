import { createConnection, type Socket } from 'node:net';
import { connect as connectTls, type TLSSocket } from 'node:tls';
import type { MemosSmtpConfig } from '../../../plugins/memos/config.mjs';
import { normalizeEmail } from './validation.js';
import { ServiceError, type DeliveryTransport, type MailMessage } from './types.js';

type SmtpSocket = Socket | TLSSocket;
type Config = MemosSmtpConfig & { readonly password: string };
interface Response { code: number; lines: readonly string[] }
export function renderMail(message: MailMessage, from: string): string {
  normalizeEmail(message.to);
  normalizeEmail(from);
  if (!/^m_[A-Za-z0-9_-]{3,128}$/u.test(message.id) || !/^[A-Za-z0-9_-]{43}$/u.test(message.token)) throw new ServiceError(503, 'invalid_mail');
  const origin = new URL(message.publicOrigin);
  if (origin.protocol !== 'https:' || origin.origin !== message.publicOrigin) throw new ServiceError(503, 'invalid_mail');
  const text = ['Verify your Firefly memo:', `${origin.origin}/v1/memos/verify/${message.token}`, '', 'This link expires in 24 hours. Verification sends your memo to the owner for review; it does not publish it.'].join('\r\n');
  return [`From: ${from}`, `To: ${message.to}`, 'Subject: Verify your Firefly memo', `Message-ID: <${message.id}@firefly-memos.invalid>`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: 7bit', '', text].join('\r\n');
}
export class SmtpTransport implements DeliveryTransport {
  constructor(private readonly config: Config) {}
  async deliver(message: MailMessage): Promise<void> {
    const connection = new SmtpConnection(this.config);
    try { await connection.send(message.to, renderMail(message, this.config.from)); }
    finally { connection.close(); }
  }
}
class SmtpConnection {
  private socket: SmtpSocket | null = null;
  private input = '';
  private failure = false;
  private waiter: { resolve: (value: Response) => void; reject: (error: Error) => void; timer: NodeJS.Timeout } | null = null;
  private totalTimer: NodeJS.Timeout | null = null;
  constructor(private readonly config: Config) {}
  private readonly onData = (chunk: Buffer): void => {
    this.input += chunk.toString('ascii');
    if (this.input.length > 65536) { this.fail(); this.socket?.destroy(); return; }
    this.flush();
  };
  private readonly onFailure = (): void => { this.fail(); };
  private fail(): void {
    this.failure = true;
    const waiter = this.waiter;
    if (waiter) { this.waiter = null; clearTimeout(waiter.timer); waiter.reject(new ServiceError(503, 'smtp_failed')); }
  }
  private attach(socket: SmtpSocket): void {
    socket.on('data', this.onData); socket.on('error', this.onFailure); socket.on('close', this.onFailure);
  }
  private detach(socket: SmtpSocket): void {
    socket.off('data', this.onData); socket.off('error', this.onFailure); socket.off('close', this.onFailure);
  }
  async send(to: string, raw: string): Promise<void> {
    this.totalTimer = setTimeout(() => { this.fail(); this.socket?.destroy(); }, 180000);
    const socket = this.config.secure
      ? connectTls({ host: this.config.host, port: this.config.port, servername: this.config.host, rejectUnauthorized: true })
      : createConnection({ host: this.config.host, port: this.config.port });
    this.socket = socket; this.attach(socket);
    await this.connected(socket, this.config.secure ? 'secureConnect' : 'connect');
    await this.response([220]);
    await this.command('EHLO firefly-memos', [250]);
    if (!this.config.secure) {
      await this.command('STARTTLS', [220]);
      // Buffered plaintext must never become authenticated TLS responses.
      this.input = ''; this.detach(socket);
      const tls = connectTls({ socket, servername: this.config.host, rejectUnauthorized: true });
      this.socket = tls; this.attach(tls);
      await this.connected(tls, 'secureConnect');
      await this.command('EHLO firefly-memos', [250]);
    }
    await this.command('AUTH LOGIN', [334]);
    await this.command(Buffer.from(this.config.user).toString('base64'), [334]);
    await this.command(Buffer.from(this.config.password).toString('base64'), [235]);
    await this.command(`MAIL FROM:<${this.config.from}>`, [250]);
    await this.command(`RCPT TO:<${to}>`, [250, 251]);
    await this.command('DATA', [354]);
    await this.command(`${raw.split('\r\n').map((line) => line.startsWith('.') ? `.${line}` : line).join('\r\n')}\r\n.`, [250]);
  }
  close(): void {
    if (this.totalTimer) clearTimeout(this.totalTimer);
    if (this.socket) { this.detach(this.socket); this.socket.destroy(); this.socket = null; }
    this.fail();
  }
  private connected(socket: SmtpSocket, event: 'connect' | 'secureConnect'): Promise<void> {
    return new Promise((resolve, reject) => {
      const clean = (): void => { clearTimeout(timer); socket.off(event, ready); socket.off('error', failed); socket.off('close', failed); };
      const ready = (): void => { clean(); resolve(); };
      const failed = (): void => { clean(); reject(new ServiceError(503, 'smtp_failed')); };
      const timer = setTimeout(() => { failed(); socket.destroy(); }, this.config.connectionTimeoutMs);
      socket.once(event, ready); socket.once('error', failed); socket.once('close', failed);
    });
  }
  private async command(value: string, codes: readonly number[]): Promise<Response> {
    if (!this.socket || this.failure) throw new ServiceError(503, 'smtp_failed');
    await new Promise<void>((resolve, reject) => this.socket!.write(`${value}\r\n`, (error) => error ? reject(new ServiceError(503, 'smtp_failed')) : resolve()));
    return this.response(codes);
  }
  private async response(codes: readonly number[]): Promise<Response> {
    if (this.failure) throw new ServiceError(503, 'smtp_failed');
    const immediate = this.take();
    const result = immediate ?? await new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(() => { this.waiter = null; this.failure = true; reject(new ServiceError(503, 'smtp_failed')); }, this.config.commandTimeoutMs);
      this.waiter = { resolve, reject, timer };
    });
    if (!codes.includes(result.code)) throw new ServiceError(503, 'smtp_failed');
    return result;
  }
  private flush(): void {
    if (!this.waiter) return;
    try {
      const result = this.take();
      if (!result) return;
      const waiter = this.waiter; this.waiter = null; clearTimeout(waiter.timer); waiter.resolve(result);
    } catch { this.fail(); this.socket?.destroy(); }
  }
  private take(): Response | null {
    let offset = 0;
    let code: number | null = null;
    const lines: string[] = [];
    while (true) {
      const end = this.input.indexOf('\r\n', offset);
      if (end < 0) return null;
      const match = /^(\d{3})([ -])([\x20-\x7e]*)$/u.exec(this.input.slice(offset, end));
      if (!match || (code !== null && code !== Number(match[1]))) throw new ServiceError(503, 'smtp_failed');
      code = Number(match[1]); lines.push(match[3]!); offset = end + 2;
      if (match[2] === ' ') { this.input = this.input.slice(offset); return { code, lines }; }
    }
  }
}
