import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { SITE_CONFIG } from '../src/lib/site-config.mjs';

const distRoot = path.resolve(import.meta.dirname, '../dist');
const rawPostHref = '/posts/交流/萤火虫/';
const commentsPostPath = '/posts/%E4%BA%A4%E6%B5%81/%E8%90%A4%E7%81%AB%E8%99%AB/';

test('enabled Unicode projection renders comments and canonical form payloads', async () => {
  assert.equal(SITE_CONFIG.plugins.comments.enabled, true);
  const html = await readFile(path.join(distRoot, 'posts/交流/萤火虫/index.html'), 'utf8');

  assert.match(html, /class="comment-section"/u);
  assert.match(html, /A top-level comment on the Unicode route\./u);
  assert.match(html, /A direct reply on the Unicode route\./u);
  assert.equal([...html.matchAll(new RegExp(`name="postPath" value="${commentsPostPath}"`, 'gu'))].length, 2);
  assert.equal([...html.matchAll(/name="parentId" value="c_unicode_top"/gu)].length, 1);
  assert.doesNotMatch(html, new RegExp(`name="postPath" value="${rawPostHref}"`, 'gu'));
  assert.match(html, /action="https:\/\/comments\.fixture\.invalid\/v1\/comments\/submissions"/u);
  assert.doesNotMatch(html, /emailCiphertext|verificationTokenHash|controlTokenHash|ipHash|userAgentHash|internalId|dedupeKey/iu);
});

test('enabled Unicode projection remains post-only', async () => {
  const page = await readFile(path.join(distRoot, 'pages/about/index.html'), 'utf8');
  const home = await readFile(path.join(distRoot, 'index.html'), 'utf8');

  assert.doesNotMatch(page, /class="comment-section"/u);
  assert.doesNotMatch(home, /class="comment-section"/u);
});
