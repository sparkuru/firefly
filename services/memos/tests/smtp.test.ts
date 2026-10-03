import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import type { AddressInfo } from 'node:net';
import { createServer as createTlsServer, createSecureContext, TLSSocket } from 'node:tls';
import test from 'node:test';
import { SmtpTransport } from '../src/smtp.js';
import { cert, key } from './tls-fixture.js';

test('SMTP requires STARTTLS and never sends authentication or recipient on a refused upgrade, including fragmented multiline greeting', async () => {
  const commands: string[] = [];
  const server = createServer((socket) => {
    socket.write('220 local-test SMTP\r\n');
    let input = '';
    socket.on('data', (chunk) => {
      input += chunk.toString();
      while (input.includes('\r\n')) {
        const end = input.indexOf('\r\n'); const command = input.slice(0, end); input = input.slice(end + 2); commands.push(command);
        if (command.startsWith('EHLO ')) { socket.write('250-local-test\r\n'); setImmediate(() => socket.write('250 STARTTLS\r\n')); }
        else if (command === 'STARTTLS') socket.write('454 TLS unavailable\r\n');
        else socket.write('500 refused\r\n');
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const transport = new SmtpTransport({ host: '127.0.0.1', port: (server.address() as AddressInfo).port, secure: false, user: 'dummy-login', password: 'dummy-only-test-password', from: 'memos@example.com', connectionTimeoutMs: 1000, commandTimeoutMs: 1000 });
    await assert.rejects(transport.deliver({ id: 'm_example', to: 'reader@example.com', token: 'a'.repeat(43), publicOrigin: 'https://example.com' }), /smtp_failed/);
    assert.deepEqual(commands, ['EHLO firefly-memos', 'STARTTLS']);
    assert.ok(!commands.join('').includes('AUTH')); assert.ok(!commands.join('').includes('reader@example.com'));
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});

test('SMTP rejects untrusted certificates for both implicit TLS and STARTTLS before authentication or recipient', async () => {
  for (const secure of [true, false]) {
    const commands: string[] = [];
    const sockets = new Set<import('node:net').Socket>();
    const track = (socket: import('node:net').Socket): void => { sockets.add(socket); socket.once('close', () => sockets.delete(socket)); socket.on('error', () => {}); };
    const server = secure ? createTlsServer({ key, cert }, (socket) => {
      track(socket); socket.write('220 local-test SMTP\r\n'); socket.on('data', (chunk) => commands.push(chunk.toString()));
    }) : createServer((socket) => {
      track(socket); socket.write('220 local-test SMTP\r\n');
      let input = '';
      const onData = (chunk: Buffer): void => {
        input += chunk.toString();
        while (input.includes('\r\n')) {
          const end = input.indexOf('\r\n'); const command = input.slice(0, end); input = input.slice(end + 2); commands.push(command);
          if (command.startsWith('EHLO ')) socket.write('250 STARTTLS\r\n');
          else if (command === 'STARTTLS') {
            socket.off('data', onData); socket.write('220 Begin TLS\r\n');
            const tls = new TLSSocket(socket, { isServer: true, secureContext: createSecureContext({ key, cert }) });
            track(tls); tls.on('data', (data) => commands.push(data.toString()));
          }
        }
      };
      socket.on('data', onData);
    });
    server.on('tlsClientError', () => {});
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const transport = new SmtpTransport({ host: '127.0.0.1', port: (server.address() as AddressInfo).port, secure, user: 'dummy-login', password: 'dummy-only-test-password', from: 'memos@example.com', connectionTimeoutMs: 1000, commandTimeoutMs: 1000 });
      await assert.rejects(transport.deliver({ id: 'm_example', to: 'reader@example.com', token: 'a'.repeat(43), publicOrigin: 'https://example.com' }), /smtp_failed/);
      assert.deepEqual(commands, secure ? [] : ['EHLO firefly-memos', 'STARTTLS']);
    } finally {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }
});
