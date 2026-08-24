import assert from 'node:assert/strict';
import { access, chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { loadCommentsRuntimeConfig, loadCommentsSecrets, parseCommentsSecrets } from '../src/config.js';

const { parseCommentsActivation, parseCommentsConfig } = await import(
  pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..', 'plugins/comments/config.mjs')).href
);

test('dotenv parser accepts only the small non-expanding key/value subset', () => {
  assert.deepEqual(parseCommentsSecrets('# comment\nCOMMENTS_TOKEN_SECRET=literal-value\nCOMMENTS_SMTP_PASSWORD=value=with=equals\n'), {
    COMMENTS_TOKEN_SECRET: 'literal-value',
    COMMENTS_SMTP_PASSWORD: 'value=with=equals'
  });
  assert.throws(() => parseCommentsSecrets('COMMENTS_TOKEN_SECRET=one\nCOMMENTS_TOKEN_SECRET=two\n'), /Duplicate comments secrets key/u);
  assert.throws(() => parseCommentsSecrets('COMMENTS-TOKEN=unsafe\n'), /Invalid comments secrets entry/u);
});

test('comments secrets require owner-only readable regular files and keep values out of errors', async (context) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'firefly-comments-secrets-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const secretsPath = path.join(directory, 'secrets.env');
  const privateValue = 'safe-test-only-value';
  await writeFile(secretsPath, `COMMENTS_TOKEN_SECRET=${privateValue}\n`);
  await chmod(secretsPath, 0o640);
  assert.throws(() => loadCommentsSecrets({ COMMENTS_SECRETS_FILE: secretsPath }), /permissions are too broad/u);
  await chmod(secretsPath, 0o600);
  const loaded = loadCommentsSecrets({ COMMENTS_SECRETS_FILE: secretsPath });
  assert.equal(loaded.COMMENTS_TOKEN_SECRET, privateValue);
  assert.equal(loadCommentsSecrets({ COMMENTS_SECRETS_FILE: secretsPath, COMMENTS_TOKEN_SECRET: 'environment-value' }).COMMENTS_TOKEN_SECRET, 'environment-value');
});

test('compiled runtime loader resolves the shared plugin decoder from the repository root', async () => {
  const compiledLoaderPath = fileURLToPath(new URL('../src/config.js', import.meta.url));
  const pluginPath = path.resolve(path.dirname(compiledLoaderPath), '../../../../plugins/comments/config.mjs');
  await access(pluginPath);
});

test('comments runtime config reads the plugin namespace and resolves only the named secret', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'firefly-comments-config-'));
  const configPath = path.join(directory, 'site.toml');
  await writeFile(configPath, [
    '[comments]',
    'enabled = false',
    '',
    '[comments.smtp]',
    'host = "smtp.example.test"',
    'port = 465',
    'secure = true',
    'user = "comments@example.test"',
    'from = "comments@example.test"',
    'passwordEnv = "COMMENTS_TEST_PASSWORD"',
    'publicOrigin = "https://comments.example.test"',
    '',
    '[comments.runtime]',
    'outboxPath = "/private/comments/outbox.jsonl"',
    'outboxStatePath = "/private/comments/outbox.state.json"',
    ''
  ].join('\n'));
  try {
    const config = loadCommentsRuntimeConfig({
      COMMENTS_CONFIG_PATH: configPath,
      COMMENTS_TEST_PASSWORD: 'app-password'
    });
    assert.equal(config.configPath, configPath);
    assert.equal(config.outboxPath, '/private/comments/outbox.jsonl');
    assert.equal(config.outboxStatePath, '/private/comments/outbox.state.json');
    assert.equal(config.environment.COMMENTS_SMTP_HOST, 'smtp.example.test');
    assert.equal(config.environment.COMMENTS_SMTP_PORT, '465');
    assert.equal(config.environment.COMMENTS_SMTP_SECURE, 'true');
    assert.equal(config.environment.COMMENTS_SMTP_PASSWORD, 'app-password');
    assert.equal(config.environment.COMMENTS_CONSENT_VERSION, 'm51-v1');
    assert.equal(config.environment.COMMENTS_TEST_PASSWORD, 'app-password');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('environment values override non-secret values from the unified config', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'firefly-comments-config-'));
  const configPath = path.join(directory, 'site.toml');
  await writeFile(configPath, [
    '[comments.smtp]',
    'host = "smtp.file.example.test"',
    'port = 465',
    'secure = true',
    'user = "comments@example.test"',
    'from = "comments@example.test"',
    'publicOrigin = "https://comments.example.test"',
    ''
  ].join('\n'));
  try {
    const config = loadCommentsRuntimeConfig({
      COMMENTS_CONFIG_PATH: configPath,
      COMMENTS_SMTP_HOST: 'smtp.env.example.test',
      COMMENTS_SMTP_PORT: '587',
      COMMENTS_SMTP_SECURE: 'false',
      COMMENTS_SMTP_USER: 'comments@example.test',
      COMMENTS_SMTP_PASSWORD: 'app-password',
      COMMENTS_SMTP_FROM: 'comments@example.test',
      COMMENTS_PUBLIC_ORIGIN: 'https://comments.example.test'
    });
    assert.equal(config.environment.COMMENTS_SMTP_HOST, 'smtp.env.example.test');
    assert.equal(config.environment.COMMENTS_SMTP_PORT, '587');
    assert.equal(config.environment.COMMENTS_SMTP_SECURE, 'false');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('runtime outbox paths reject traversal and empty path segments', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'firefly-comments-config-'));
  const configPath = path.join(directory, 'site.toml');
  await writeFile(configPath, [
    '[comments.runtime]',
    'outboxPath = "../outside/notifications.jsonl"',
    ''
  ].join('\n'));
  try {
    assert.throws(
      () => loadCommentsRuntimeConfig({ COMMENTS_CONFIG_PATH: configPath }),
      /safe private path without traversal/u
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('comments runtime follows site activation into a plugin-owned config and secret file', async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-comments-plugin-config-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const pluginDirectory = path.join(root, 'config/plugins/comments');
  await mkdir(pluginDirectory, { recursive: true });
  const siteConfigPath = path.join(root, 'config/site.toml');
  const pluginConfigPath = path.join(pluginDirectory, 'config.toml');
  const secretsPath = path.join(pluginDirectory, 'secrets.env');
  await writeFile(siteConfigPath, [
    '[plugins.comments]',
    'enabled = false',
    'configPath = "config/plugins/comments/config.toml"',
    ''
  ].join('\n'));
  await writeFile(pluginConfigPath, [
    '[public]',
    'writeOrigin = "https://comments.example.test"',
    'exportPath = "artifacts/comments/comments.public.v1.json"',
    'consentVersion = "m51-v1"',
    '',
    '[runtime]',
    'postRoutes = ["/posts/example/"]',
    'allowedOrigins = ["https://comments.example.test"]',
    'publicOrigin = "https://comments.example.test"',
    'outboxPath = "/var/lib/firefly-comments/notifications.jsonl"',
    '',
    '[runtime.smtp]',
    'host = "smtp.example.test"',
    'port = 465',
    'secure = true',
    'user = "comments@example.test"',
    'from = "comments@example.test"',
    'passwordEnv = "COMMENTS_SMTP_PASSWORD"',
    ''
  ].join('\n'));
  await writeFile(secretsPath, 'COMMENTS_SMTP_PASSWORD=app-password\n');
  await chmod(secretsPath, 0o600);

  const config = loadCommentsRuntimeConfig({
    COMMENTS_SITE_CONFIG_PATH: siteConfigPath,
    COMMENTS_SECRETS_FILE: secretsPath
  });
  assert.equal(config.siteConfigPath, siteConfigPath);
  assert.equal(config.configPath, pluginConfigPath);
  assert.equal(config.activation.enabled, false);
  assert.equal(config.activation.configPath, 'config/plugins/comments/config.toml');
  assert.equal(config.public.writeOrigin, 'https://comments.example.test');
  assert.deepEqual(config.runtime.postRoutes, ['/posts/example/']);
  assert.equal(config.environment.COMMENTS_SMTP_PASSWORD, 'app-password');
  assert.equal(config.environment.COMMENTS_SMTP_HOST, 'smtp.example.test');
  assert.equal(Object.hasOwn(config.public, 'smtp'), false);
});

test('plugin activation and config reject unsupported or secret-shaped fields', () => {
  assert.throws(
    () => parseCommentsActivation({ enabled: false, unknown: true }, 'fixture'),
    /unsupported key/u
  );
  assert.throws(
    () => parseCommentsConfig({ runtime: { smtp: { password: 'must-not-be-stored' } } }, 'fixture'),
    /password/u
  );
  assert.throws(
    () => parseCommentsSecrets('COMMENTS_SMTP_HOST=smtp.example.test\n'),
    /Non-secret comments setting/u
  );
});
