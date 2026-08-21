import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('same-device provisioning keeps comments private and the tracked site disabled', async () => {
  const compose = await readFile(new URL('../../../../compose.yml', import.meta.url), 'utf8');
  const nginx = await readFile(new URL('../../../../nginx.conf', import.meta.url), 'utf8');
  const dockerfile = await readFile(new URL('../../Dockerfile', import.meta.url), 'utf8');
  const siteConfig = await readFile(new URL('../../../../config/site.toml', import.meta.url), 'utf8');
  const dockerignore = await readFile(new URL('../../../../.dockerignore', import.meta.url), 'utf8');
  assert.match(compose, /comments:\n\s+profiles:\n\s+- comments/u);
  assert.match(compose, /network_mode: service:web/u);
  assert.match(compose, /COMMENTS_SECRETS_FILE: \/run\/secrets\/comments\.env/u);
  assert.match(compose, /\.\/config\/secrets\.env:\/run\/secrets\/comments\.env:ro/u);
  const commentsBlock = compose.slice(compose.indexOf('\n  comments:'));
  assert.doesNotMatch(commentsBlock, /\n\s+ports:/u);
  assert.match(nginx, /location \^~ \/v1\//u);
  assert.match(nginx, /proxy_pass http:\/\/127\.0\.0\.1:8787/u);
  assert.match(nginx, /proxy_set_header Host \$http_host/u);
  assert.match(nginx, /X-Forwarded-Host \$http_host/u);
  assert.match(dockerfile, /COMMENTS_DATABASE_PATH=\/var\/lib\/firefly-comments\/core\.db/u);
  assert.match(dockerfile, /COMMENTS_SECRETS_FILE=\/run\/secrets\/comments\.env/u);
  assert.doesNotMatch(dockerfile, /COPY .*secrets\.env/u);
  assert.match(siteConfig, /enabled = false/u);
  assert.match(dockerignore, /config\/secrets\.env/u);
});

test('operator edge example selects distinct upstreams by host before /v1 routing', async () => {
  const edge = await readFile(new URL('../../ops/nginx-hosts.conf.example', import.meta.url), 'utf8');
  assert.match(edge, /server_name production\.example\.invalid/u);
  assert.match(edge, /server_name development\.example\.invalid/u);
  assert.match(edge, /firefly_comments_production/u);
  assert.match(edge, /firefly_comments_development/u);
  assert.match(edge, /server 127\.0\.0\.1:8787/u);
  assert.match(edge, /server 127\.0\.0\.1:8788/u);
  assert.equal((edge.match(/location \^~ \/v1\//gu) ?? []).length, 2);
});
