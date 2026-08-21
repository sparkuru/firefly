import { createConnection, type Socket } from 'node:net';
import { connect as connectTls, type TLSSocket } from 'node:tls';
import { notificationIdFor } from './notifications.js';
import type { NotificationDeliveryTransport, NotificationMessage } from './types.js';

type SmtpSocket = Socket | TLSSocket;

export interface SmtpConfig {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly user: string;
  readonly password: string;
  readonly from: string;
  readonly fromName: string | null;
  readonly notificationOrigin: string;
  readonly connectionTimeoutMs: number;
  readonly commandTimeoutMs: number;
}

export class SmtpConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SmtpConfigurationError';
  }
}

export class SmtpProtocolError extends Error {
  readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = 'SmtpProtocolError';
    this.code = code;
  }
}

export interface RenderedNotification {
  readonly subject: string;
  readonly text: string;
}

const SUBJECTS = {
  verification: 'Verify your Firefly comment',
  approved: 'Your Firefly comment was approved',
  rejected: 'Your Firefly comment was not approved',
  reply: 'A reader replied to your Firefly comment'
} as const;

const controlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u2028\u2029]/u;
const emailPattern = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/u;
const hostnameLabelPattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/u;

export function parseSmtpConfig(env: NodeJS.ProcessEnv = process.env): SmtpConfig | null {
  const configured = [
    'COMMENTS_SMTP_HOST',
    'COMMENTS_SMTP_PORT',
    'COMMENTS_SMTP_SECURE',
    'COMMENTS_SMTP_USER',
    'COMMENTS_SMTP_PASSWORD',
    'COMMENTS_SMTP_FROM',
    'COMMENTS_SMTP_FROM_NAME',
    'COMMENTS_PUBLIC_ORIGIN',
    'COMMENTS_SMTP_CONNECT_TIMEOUT_MS',
    'COMMENTS_SMTP_COMMAND_TIMEOUT_MS'
  ].some((key) => env[key] !== undefined);
  if (!configured) return null;
  const host = requiredEnv(env, 'COMMENTS_SMTP_HOST', false);
  const user = requiredEnv(env, 'COMMENTS_SMTP_USER', false);
  const password = requiredEnv(env, 'COMMENTS_SMTP_PASSWORD', false);
  const from = requiredEnv(env, 'COMMENTS_SMTP_FROM', false);
  const notificationOrigin = normalizeOrigin(requiredEnv(env, 'COMMENTS_PUBLIC_ORIGIN', false));
  if (controlCharacters.test(user) || controlCharacters.test(from) || !emailPattern.test(user) || !emailPattern.test(from)) {
    throw new SmtpConfigurationError('COMMENTS_SMTP_USER and COMMENTS_SMTP_FROM must be mailbox addresses.');
  }
  const hostLabels = host.split('.');
  if (/\s/u.test(host) || host.length > 253 || hostLabels.some((label) => !hostnameLabelPattern.test(label))) {
    throw new SmtpConfigurationError('COMMENTS_SMTP_HOST must be a safe hostname.');
  }
  const portValue = env.COMMENTS_SMTP_PORT ?? '587';
  const port = Number(portValue);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new SmtpConfigurationError('COMMENTS_SMTP_PORT must be an integer between 1 and 65535.');
  }
  const secure = parseBoolean(env.COMMENTS_SMTP_SECURE ?? (port === 465 ? 'true' : 'false'), 'COMMENTS_SMTP_SECURE');
  const fromNameValue = env.COMMENTS_SMTP_FROM_NAME;
  if (fromNameValue !== undefined && (controlCharacters.test(fromNameValue) || /[\r\n]/u.test(fromNameValue))) {
    throw new SmtpConfigurationError('COMMENTS_SMTP_FROM_NAME must not contain line breaks.');
  }
  return Object.freeze({
    host,
    port,
    secure,
    user,
    password,
    from,
    fromName: fromNameValue?.trim() || null,
    notificationOrigin,
    connectionTimeoutMs: parseDuration(env.COMMENTS_SMTP_CONNECT_TIMEOUT_MS, 10_000),
    commandTimeoutMs: parseDuration(env.COMMENTS_SMTP_COMMAND_TIMEOUT_MS, 10_000)
  });
}

export function requireSmtpConfig(env: NodeJS.ProcessEnv = process.env): SmtpConfig {
  const config = parseSmtpConfig(env);
  if (config === null) {
    throw new SmtpConfigurationError('SMTP settings are not configured.');
  }
  return config;
}

export function renderNotificationMessage(message: NotificationMessage, config: Pick<SmtpConfig, 'notificationOrigin'>): RenderedNotification {
  const origin = config.notificationOrigin.replace(/\/$/u, '');
  const lines = [
    'This is a private Firefly comments notification.',
    `Post: ${origin}${message.postPath}`
  ];
  if (message.kind === 'verification' && message.token !== undefined) {
    lines.push(`Verify your comment: ${origin}/v1/verify/${encodeURIComponent(message.token)}`);
  }
  if (message.controlToken !== undefined) {
    lines.push(`Manage or delete your comment: ${origin}/v1/control/${encodeURIComponent(message.controlToken)}`);
  }
  lines.push('', 'Replies and moderation notifications are sent only for the choices you made in the comment form.');
  return { subject: SUBJECTS[message.kind], text: `${lines.join('\n')}\n` };
}

export class SmtpNotificationTransport implements NotificationDeliveryTransport {
  constructor(private readonly config: SmtpConfig) {}

  async deliver(message: NotificationMessage): Promise<void> {
    if (!emailPattern.test(message.to)) {
      throw new SmtpConfigurationError('notification recipient is invalid.');
    }
    const rendered = renderNotificationMessage(message, this.config);
    const notificationId = notificationIdFor(message);
    const raw = formatMessage(message, rendered, notificationId, this.config);
    const connection = new SmtpConnection(this.config);
    try {
      await connection.send(message.to, raw);
    } finally {
      await connection.close();
    }
  }
}

class SmtpConnection {
  private socket: SmtpSocket | null = null;
  private input = '';
  private waiter: {
    resolve: (response: SmtpResponse) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
  } | null = null;
  private readonly onData = (chunk: Buffer | string): void => {
    this.input += chunk.toString();
    this.flushResponse();
  };
  private readonly onError = (error: Error): void => {
    this.rejectResponse(error);
  };

  constructor(private readonly config: SmtpConfig) {}

  async send(recipient: string, raw: string): Promise<void> {
    await this.open();
    await this.command(`MAIL FROM:<${this.config.from}>`, [250]);
    await this.command(`RCPT TO:<${recipient}>`, [250, 251]);
    await this.command('DATA', [354]);
    await this.write(raw.endsWith('\r\n') ? `${raw}.\r\n` : `${raw}\r\n.\r\n`);
    await this.expectResponse([250]);
  }

  async close(): Promise<void> {
    const socket = this.socket;
    if (socket === null) return;
    try {
      if (!socket.destroyed) {
        await this.command('QUIT', [221]);
      }
    } catch {
      // Closing a failed SMTP connection is best effort.
    } finally {
      this.detach(socket);
      socket.destroy();
      this.socket = null;
    }
  }

  private async open(): Promise<void> {
    const socket = this.config.secure
      ? connectTls({ host: this.config.host, port: this.config.port, servername: this.config.host })
      : createConnection({ host: this.config.host, port: this.config.port });
    this.socket = socket;
    this.attach(socket);
    await this.waitForSocket(socket, this.config.secure ? 'secureConnect' : 'connect');
    await this.expectResponse([220]);
    await this.command(`EHLO firefly-comments`, [250]);
    if (!this.config.secure) {
      await this.command('STARTTLS', [220]);
      await this.upgradeToTls(socket);
      await this.command(`EHLO firefly-comments`, [250]);
    }
    await this.command('AUTH LOGIN', [334]);
    await this.command(Buffer.from(this.config.user, 'utf8').toString('base64'), [334]);
    await this.command(Buffer.from(this.config.password, 'utf8').toString('base64'), [235]);
  }

  private async upgradeToTls(previous: SmtpSocket): Promise<void> {
    this.detach(previous);
    const socket = connectTls({ socket: previous, servername: this.config.host });
    this.socket = socket;
    this.attach(socket);
    await this.waitForSocket(socket, 'secureConnect');
  }

  private async command(value: string, codes: readonly number[]): Promise<SmtpResponse> {
    await this.write(`${value}\r\n`);
    return this.expectResponse(codes);
  }

  private async expectResponse(codes: readonly number[]): Promise<SmtpResponse> {
    const response = await this.readResponse();
    if (!codes.includes(response.code)) {
      throw new SmtpProtocolError(response.code, `SMTP command failed with ${response.code}.`);
    }
    return response;
  }

  private async readResponse(): Promise<SmtpResponse> {
    const immediate = this.takeResponse();
    if (immediate !== null) return immediate;
    if (this.waiter !== null) throw new Error('SMTP response pipeline is already waiting.');
    return new Promise<SmtpResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiter = null;
        reject(new Error('SMTP response timed out.'));
      }, this.config.commandTimeoutMs);
      this.waiter = { resolve, reject, timer };
    });
  }

  private async write(value: string): Promise<void> {
    const socket = this.socket;
    if (socket === null || socket.destroyed) throw new Error('SMTP connection is closed.');
    await new Promise<void>((resolve, reject) => {
      socket.write(value, (error?: Error | null) => error ? reject(error) : resolve());
    });
  }

  private waitForSocket(socket: SmtpSocket, readyEvent: 'connect' | 'secureConnect'): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error('SMTP connection timed out.'));
      }, this.config.connectionTimeoutMs);
      const onReady = (): void => {
        clearTimeout(timer);
        socket.off('error', onError);
        resolve();
      };
      const onError = (error: Error): void => {
        clearTimeout(timer);
        socket.off(readyEvent, onReady);
        reject(error);
      };
      socket.once(readyEvent, onReady);
      socket.once('error', onError);
    });
  }

  private attach(socket: SmtpSocket): void {
    socket.on('data', this.onData);
    socket.on('error', this.onError);
  }

  private detach(socket: SmtpSocket): void {
    socket.off('data', this.onData);
    socket.off('error', this.onError);
  }

  private flushResponse(): void {
    if (this.waiter === null) return;
    let response: SmtpResponse | null;
    try {
      response = this.takeResponse();
    } catch (error) {
      this.rejectResponse(error instanceof Error ? error : new Error(String(error)));
      return;
    }
    if (response === null) return;
    const waiter = this.waiter;
    this.waiter = null;
    clearTimeout(waiter.timer);
    waiter.resolve(response);
  }

  private rejectResponse(error: Error): void {
    if (this.waiter === null) return;
    const waiter = this.waiter;
    this.waiter = null;
    clearTimeout(waiter.timer);
    waiter.reject(error);
  }

  private takeResponse(): SmtpResponse | null {
    const lines: string[] = [];
    while (true) {
      const newline = this.input.indexOf('\r\n');
      if (newline < 0) return null;
      const line = this.input.slice(0, newline);
      this.input = this.input.slice(newline + 2);
      const match = /^(\d{3})([ -])(.*)$/u.exec(line);
      if (match === null) {
        throw new Error('SMTP server returned an invalid response.');
      }
      const code = Number(match[1]);
      lines.push(match[3] ?? '');
      if (match[2] === '-') continue;
      return { code, lines };
    }
  }
}

interface SmtpResponse {
  readonly code: number;
  readonly lines: readonly string[];
}

function formatMessage(
  message: NotificationMessage,
  rendered: RenderedNotification,
  notificationId: string,
  config: SmtpConfig
): string {
  const from = config.fromName === null
    ? config.from
    : `${encodeHeader(config.fromName)} <${config.from}>`;
  const messageId = `<${notificationId}@firefly-comments.invalid>`;
  const text = rendered.text.replace(/\r?\n/gu, '\r\n');
  return [
    `From: ${from}`,
    `To: ${message.to}`,
    `Subject: ${rendered.subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    dotStuff(text)
  ].join('\r\n');
}

function dotStuff(value: string): string {
  return value.split('\r\n').map((line) => line.startsWith('.') ? `.${line}` : line).join('\r\n');
}

function encodeHeader(value: string): string {
  if (/^[\x20-\x7e]*$/u.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function requiredEnv(env: NodeJS.ProcessEnv, key: string, trim = true): string {
  const value = env[key];
  if (value === undefined || (trim ? value.trim() : value).length === 0) {
    throw new SmtpConfigurationError(`${key} must be provided when SMTP delivery is enabled.`);
  }
  return trim ? value.trim() : value;
}

function parseBoolean(value: string, key: string): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new SmtpConfigurationError(`${key} must be true or false.`);
}

function parseDuration(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 100 || parsed > 120_000) {
    throw new SmtpConfigurationError('SMTP timeout values must be integers between 100 and 120000 milliseconds.');
  }
  return parsed;
}

function normalizeOrigin(value: string): string {
  if (value.trim() !== value || controlCharacters.test(value) || /\s/u.test(value)) {
    throw new SmtpConfigurationError('COMMENTS_PUBLIC_ORIGIN must be an absolute HTTP(S) origin.');
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new SmtpConfigurationError('COMMENTS_PUBLIC_ORIGIN must be an absolute HTTP(S) origin.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new SmtpConfigurationError('COMMENTS_PUBLIC_ORIGIN must be an absolute HTTP(S) origin.');
  }
  return parsed.origin;
}
