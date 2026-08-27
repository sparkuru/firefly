import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { commentsPostPathFromSiteHref } from '../../../plugins/comments/config.mjs';

const repositoryRoot = path.resolve(import.meta.dirname, '../../..');
const fixtureRoot = path.join(repositoryRoot, '.private/m51-unicode-comments');
const contentRoot = path.join(fixtureRoot, 'content');
const siteConfigPath = path.join(fixtureRoot, 'config/site.toml');
const pluginConfigPath = path.join(fixtureRoot, 'config/plugins/comments/config.toml');
const exportPath = path.join(fixtureRoot, 'artifacts/comments/comments.public.v1.json');
const rawPostHref = '/posts/交流/萤火虫/';
const commentsPostPath = commentsPostPathFromSiteHref(rawPostHref);

if (commentsPostPath === null) {
  throw new Error('The Unicode comments fixture route is not representable.');
}

const comments = [
  {
    id: 'c_unicode_top',
    postPath: commentsPostPath,
    parentId: null,
    displayName: 'Fixture reader',
    body: 'A top-level comment on the Unicode route.',
    createdAt: '2026-08-20T00:00:00.000Z'
  },
  {
    id: 'c_unicode_reply',
    postPath: commentsPostPath,
    parentId: 'c_unicode_top',
    displayName: 'Fixture replier',
    body: 'A direct reply on the Unicode route.',
    createdAt: '2026-08-20T00:00:01.000Z'
  }
];
const exportPayload = {
  schemaVersion: 1,
  sourceRevision: 'fixture-unicode-comments',
  generatedAt: '2026-08-20T00:00:00.000Z',
  tombstoneEpoch: 4,
  comments
};
const digest = createHash('sha256')
  .update(JSON.stringify(exportPayload), 'utf8')
  .digest('hex');

await rm(fixtureRoot, { recursive: true, force: true });
await Promise.all([
  mkdir(path.join(contentRoot, 'posts/交流'), { recursive: true }),
  mkdir(path.join(contentRoot, 'pages'), { recursive: true }),
  mkdir(path.dirname(siteConfigPath), { recursive: true }),
  mkdir(path.dirname(pluginConfigPath), { recursive: true }),
  mkdir(path.dirname(exportPath), { recursive: true })
]);
await Promise.all([
  writeFile(path.join(contentRoot, 'posts/交流/萤火虫.md'), `---
title: Unicode comments fixture
date: 2026-08-20
description: A sanitized post proving the Unicode comments boundary.
draft: false
layout: post
presentation: semantic
---

## Readable public route

The public route remains readable while comments use their canonical protocol path.
`),
  writeFile(path.join(contentRoot, 'pages/about.md'), `---
title: Fixture page
slug: about
date: 2026-08-20
description: A sanitized page boundary fixture.
draft: false
layout: page
---

## Page boundary

Comments remain limited to canonical posts.
`),
  writeFile(siteConfigPath, `[site]
name = "Firefly fixture"
description = "A sanitized comments compatibility fixture."
language = "en"
url = "https://site.fixture.invalid"

[terminal]
user = "guest"
host = "fixture"
cwd = "~/blog/posts"
about = "A local static-build fixture."
friends = []

[seo]
titleSuffix = " | fixture"
robots = "noindex, follow"
twitterCard = "summary"

[plugins.comments]
enabled = true
configPath = "config/plugins/comments/config.toml"
`),
  writeFile(pluginConfigPath, `[public]
writeOrigin = "https://comments.fixture.invalid"
exportPath = "artifacts/comments/comments.public.v1.json"
consentVersion = "m51-fixture-v1"
`),
  writeFile(exportPath, `${JSON.stringify({ ...exportPayload, digest }, null, 2)}\n`)
]);

process.stdout.write('[comments-fixture] prepared sanitized Unicode projection\n');
