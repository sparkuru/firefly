import { isIP } from 'node:net';
import type { IncomingMessage } from 'node:http';
import { ServiceError } from './types.js';

export type ProxyTrust = 'none' | 'loopback';

export function canonicalAddress(value: string): string {
  if (value.trim() !== value || value.includes('%') || !isIP(value)) throw new ServiceError(400, 'invalid_client_address');
  if (isIP(value) === 4) return value;
  const canonical = new URL(`http://[${value}]/`).hostname.slice(1, -1);
  const mapped = /^::ffff:([a-f0-9]+):([a-f0-9]+)$/u.exec(canonical);
  if (!mapped) return canonical;
  const high = Number.parseInt(mapped[1]!, 16), low = Number.parseInt(mapped[2]!, 16);
  return `${high >>> 8}.${high & 255}.${low >>> 8}.${low & 255}`;
}

export function loopbackAddress(value: string): boolean {
  try { const address = canonicalAddress(value); return address === '::1' || address.startsWith('127.'); }
  catch { return false; }
}

export function proxyTrust(value: string | undefined, bind: string): ProxyTrust {
  const mode = value ?? 'none';
  if (!['none', 'loopback'].includes(mode) || (mode === 'loopback' && !loopbackAddress(bind))) throw new ServiceError(503, 'invalid_config');
  return mode as ProxyTrust;
}

export function clientAddress(request: IncomingMessage, trust: ProxyTrust = 'none'): string {
  const peer = request.socket.remoteAddress ?? '';
  if (trust === 'none') return canonicalAddress(peer);
  if (trust !== 'loopback' || !loopbackAddress(peer) || !loopbackAddress(request.socket.localAddress ?? '')) throw new ServiceError(400, 'invalid_client_address');
  const values: string[] = [];
  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    if (request.rawHeaders[index]!.toLowerCase() === 'x-real-ip') values.push(request.rawHeaders[index + 1]!);
  }
  if (values.length !== 1) throw new ServiceError(400, 'invalid_client_address');
  return canonicalAddress(values[0]!);
}
