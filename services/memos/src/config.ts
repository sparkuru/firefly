import path from 'node:path';
import { parse } from 'smol-toml';
import { configContract } from './contract.js';
import type { MemosConfig, MemosSmtpConfig } from '../../../plugins/memos/config.mjs';
import { credentialHash, decodeKey, MemoCrypto } from './crypto.js';
import { containedFile, privateDirectory, readRegular } from './files.js';
import { ServiceError } from './types.js';
import { proxyTrust, type ProxyTrust } from './address.js';

export interface ServiceConfig {
  readonly plugin: MemosConfig;
  readonly dataRoot: string;
  readonly databasePath: string;
  readonly crypto: MemoCrypto;
  readonly adminHash: Buffer;
  readonly smtp: (MemosSmtpConfig & { readonly password: string }) | null;
  readonly bind: string;
  readonly port: number;
  readonly trustProxy: ProxyTrust;
}
export function loadSecrets(env: NodeJS.ProcessEnv, file = env.MEMOS_SECRETS_FILE): NodeJS.ProcessEnv {
  const values: NodeJS.ProcessEnv = {};
  if (file !== undefined) {
    const content = new TextDecoder('utf-8', { fatal: true }).decode(readRegular(file, true));
    if (content.length > 16384) throw new ServiceError(503, 'invalid_secret_file');
    for (const line of content.split(/\r?\n/u)) {
      if (!line || line.startsWith('#')) continue;
      const match = /^([A-Z_][A-Z0-9_]*)=([^\r\n\x00-\x1f\x7f]+)$/u.exec(line);
      if (!match || Object.hasOwn(values, match[1]!)) throw new ServiceError(503, 'invalid_secret_file');
      values[match[1]!] = match[2]!;
    }
  }
  return { ...values, ...env };
}
export function loadConfig(env: NodeJS.ProcessEnv = process.env, repositoryRoot = path.resolve('../..')): ServiceConfig {
  try {
    const configPath = configContract.resolveMemosConfigPath(env.MEMOS_CONFIG_PATH, repositoryRoot);
    const plugin = configContract.parseMemosConfig(parse(new TextDecoder('utf-8', { fatal: true }).decode(readRegular(configPath))), 'service');
    const secrets = loadSecrets(env);
    const reference = (key: keyof typeof plugin.runtime.secretEnv, fallback: string): string | undefined => secrets[plugin.runtime.secretEnv[key] ?? fallback];
    const adminToken = reference('adminToken', 'MEMOS_ADMIN_TOKEN');
    if (!adminToken || !/^[^\s]{32,512}$/u.test(adminToken)) throw new ServiceError(503, 'invalid_secret');
    if (!plugin.runtime.publicOrigin || plugin.runtime.allowedOrigins.length === 0 || plugin.runtime.outboxPath !== null) throw new ServiceError(503, 'invalid_config');
    const dataRoot = privateDirectory(plugin.runtime.dataRoot ?? '/var/lib/firefly-memos', true);
    const databasePath = containedFile(dataRoot, plugin.runtime.databasePath ?? path.join(dataRoot, 'memos.sqlite'));
    const crypto = new MemoCrypto(decodeKey(reference('encryptionKey', 'MEMOS_ENCRYPTION_KEY')), decodeKey(reference('tokenKey', 'MEMOS_TOKEN_KEY')), plugin.runtime.encryptionKeyId);
    const password = reference('smtpPassword', 'MEMOS_SMTP_PASSWORD');
    if (!plugin.runtime.smtp || !password || password.length > 1024 || /[\x00-\x1f\x7f]/u.test(password)) throw new ServiceError(503, 'delivery_unavailable');
    const port = Number(env.MEMOS_PORT ?? '8788');
    const bind = env.MEMOS_BIND ?? '127.0.0.1';
    if (!Number.isInteger(port) || port < 1 || port > 65535 || !['127.0.0.1', '::1', '0.0.0.0'].includes(bind)) throw new ServiceError(503, 'invalid_config');
    return { plugin, dataRoot, databasePath, crypto, adminHash: credentialHash(adminToken), smtp: { ...plugin.runtime.smtp, password }, bind, port, trustProxy: proxyTrust(env.MEMOS_TRUST_PROXY, bind) };
  } catch { throw new ServiceError(503, 'configuration_unavailable'); }
}
