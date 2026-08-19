import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';
import { gzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { migrateTypecho, parseTypechoSql } from '../src/index.js';

const fixturePath = path.resolve('fixtures/typecho-synthetic.sql');

async function sandbox(context: TestContext) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'f1refly-typecho-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, '.private/backups'), { recursive: true });
  await mkdir(path.join(root, 'content'));
  const sql = await readFile(fixturePath);
  const dumpPath = path.join(root, '.private/backups/typecho.sql.gz');
  const compressed = gzipSync(sql, { level: 9 });
  await writeFile(dumpPath, compressed, { mode: 0o600 });
  const uploadsRoot = path.join(root, '.private/uploads');
  await mkdir(uploadsRoot);
  const resource = Buffer.from('synthetic managed resource\n');
  await writeFile(path.join(uploadsRoot, 'picture.png'), resource);
  const resourceManifestPath = path.join(root, '.private/resource-manifest.json');
  await writeFile(resourceManifestPath, JSON.stringify({ schemaVersion: 1, entries: [{ reference: '/usr/uploads/picture.png', sourcePath: 'picture.png', sha256: createHash('sha256').update(resource).digest('hex'), size: resource.length }] }));
  return { root, dumpPath, checksum: createHash('sha256').update(compressed).digest('hex'), uploadsRoot, resourceManifestPath };
}

test('parses checked gzip SQL into deterministic private inventory and handoffs', async (context) => {
  const fixture = await sandbox(context);
  const ledgerRoot = path.join(fixture.root, '.private/migration');
  const result = await migrateTypecho({
    repositoryRoot: fixture.root,
    dumpPath: fixture.dumpPath,
    expectedSha256: fixture.checksum,
    ledgerRoot,
    uploadsRoot: fixture.uploadsRoot,
    resourceManifestPath: fixture.resourceManifestPath,
    expectedPosts: 2,
    expectedPages: 1
  });
  assert.deepEqual(result.inventory, {
    schemaVersion: 1,
    posts: 2,
    pages: 1,
    draftsOrUnsupported: 0,
    categories: 1,
    usedTags: 1,
    currentFields: 3,
    orphanFields: 2,
    comments: 1,
    users: 1,
    memos: 2,
    resources: 1,
    resourceDeferred: 0,
    resourceExceptions: 0,
    exceptions: 0
  });
  assert.deepEqual(result.articles.map((article) => article.publicPath), [
    'pages/About-Fixture.md',
    'posts/engineering/First-Synthetic-Post.md',
    'posts/engineering/Second-Synthetic-Post.md'
  ]);
  assert.deepEqual(result.articles.map((article) => article.canonicalRoute), [
    '/pages/about/',
    '/posts/engineering/first-post/',
    '/posts/engineering/second-post/'
  ]);
  assert.equal(result.articles.find((article) => article.slug === 'first-post')?.description, 'A reviewed synthetic summary.');
  assert.match(result.articles.find((article) => article.slug === 'second-post')?.description ?? '', /^Second authored paragraph becomes the derived description/u);
  assert.equal(result.resourceDecisions[0]?.disposition, 'managed');
  assert.match(result.resourceDecisions[0]?.publicPath ?? '', /^\/assets\/migrated\/[a-f0-9]{20}-picture\.png$/u);
  const reviewReport = JSON.parse(await readFile(path.join(ledgerRoot, 'review-report.json'), 'utf8')) as {
    resources: { total: number; byDisposition: Array<{ disposition: string; count: number }>; exceptionsByReason: unknown[] };
    migrationExceptionsByCode: unknown[];
    publicPromotion: { blocked: boolean; reasons: string[] };
  };
  assert.equal(reviewReport.resources.total, 1);
  assert.deepEqual(reviewReport.resources.byDisposition, [{ disposition: 'managed', count: 1 }]);
  assert.deepEqual(reviewReport.resources.exceptionsByReason, []);
  assert.deepEqual(reviewReport.migrationExceptionsByCode, []);
  assert.deepEqual(reviewReport.publicPromotion, { blocked: false, reasons: [] });

  const articleManifest = JSON.parse(await readFile(path.join(ledgerRoot, 'article-manifest.json'), 'utf8')) as { articles: Array<{ slug: string; categorySlug?: string; template: string }> };
  assert.deepEqual(articleManifest.articles.map(({ slug, categorySlug, template }) => ({ slug, categorySlug, template })), [
    { slug: 'about', categorySlug: undefined, template: 'cross.php' },
    { slug: 'first-post', categorySlug: 'engineering', template: '' },
    { slug: 'second-post', categorySlug: 'engineering', template: '' }
  ]);
  const metadata = await readFile(path.join(ledgerRoot, 'metadata-candidates.json'), 'utf8');
  assert.match(metadata, /"field:customSummary"/u);
  assert.match(metadata, /"orphanCount": 1/u);
  assert.match(metadata, /"field:unknownThemeField"/u);
  assert.doesNotMatch(metadata, /Orphaned synthetic value/u);
  const memos = (await readFile(path.join(ledgerRoot, 'memos.private.jsonl'), 'utf8')).trim().split('\n').map((line) => JSON.parse(line) as { permission: string; deleted: string | null });
  assert.deepEqual(memos.map(({ permission, deleted }) => ({ permission, deleted })), [
    { permission: 'protected', deleted: null },
    { permission: 'private', deleted: '2024-01-05T00:00:00.000Z' }
  ]);
  assert.equal((await lstat(path.join(ledgerRoot, 'migration.sqlite'))).mode & 0o077, 0);
  const database = new DatabaseSync(path.join(ledgerRoot, 'migration.sqlite'), { readOnly: true });
  try {
    assert.equal((database.prepare('SELECT COUNT(*) AS count FROM comments').get() as { count: number }).count, 1);
    assert.equal((database.prepare('SELECT COUNT(*) AS count FROM memos').get() as { count: number }).count, 2);
    assert.equal((database.prepare('SELECT COUNT(*) AS count FROM identities').get() as { count: number }).count, 5);
    const policy = database.prepare('SELECT owner_alias, mail_source_field, url_source_field FROM identity_policy').get() as { owner_alias: string; mail_source_field: string; url_source_field: string };
    assert.equal(policy.owner_alias, 'wkyuu');
    assert.equal(policy.mail_source_field, 'mail');
    assert.equal(policy.url_source_field, 'url');
  } finally {
    database.close();
  }
});

test('materializes reviewed Markdown under category folders with a deterministic rerun', async (context) => {
  const fixture = await sandbox(context);
  const options = {
    repositoryRoot: fixture.root,
    dumpPath: fixture.dumpPath,
    expectedSha256: fixture.checksum,
    ledgerRoot: path.join(fixture.root, '.private/migration'),
    uploadsRoot: fixture.uploadsRoot,
    resourceManifestPath: fixture.resourceManifestPath,
    materializePublic: true,
    outputRoot: path.join(fixture.root, 'content/migrated'),
    expectedPosts: 2,
    expectedPages: 1
  } as const;
  const result = await migrateTypecho(options);
  const firstPost = await readFile(path.join(options.outputRoot, 'posts/engineering/First-Synthetic-Post.md'), 'utf8');
  const secondPost = await readFile(path.join(options.outputRoot, 'posts/engineering/Second-Synthetic-Post.md'), 'utf8');
  const page = await readFile(path.join(options.outputRoot, 'pages/About-Fixture.md'), 'utf8');
  assert.match(firstPost, /description: "A reviewed synthetic summary\."/u);
  assert.doesNotMatch(firstPost, /^presentation:/mu);
  assert.match(firstPost, /!\[\]\(\/assets\/migrated\/[a-f0-9]{20}-picture\.png\)/u);
  assert.doesNotMatch(firstPost, /<!--markdown-->|<img|<center|<span/u);
  assert.match(secondPost, /description: "Second authored paragraph becomes the derived description\./u);
  assert.match(page, /slug: "about"/u);
  assert.doesNotMatch(page, /^presentation:/mu);
  assert.match(page, /\*\*About\*\* this entirely synthetic fixture\./u);
  const managedPath = result.resourceDecisions[0]?.publicPath;
  assert.ok(managedPath);
  assert.equal(await readFile(path.join(options.outputRoot, managedPath.slice(1)), 'utf8'), 'synthetic managed resource\n');
  const firstHashes = await treeHashes(options.outputRoot);
  await migrateTypecho(options);
  assert.deepEqual(await treeHashes(options.outputRoot), firstHashes);
});

test('derives filename stems from the title after the first pipe without changing routes', async (context) => {
  const fixture = await sandbox(context);
  const source = parseTypechoSql(await readFile(fixturePath, 'utf8'));
  const titled = {
    ...source,
    contents: source.contents.map((content) => content.sourceId === '11'
      ? { ...content, title: 'legacy category | First | Synthetic Post' }
      : content.sourceId === '12'
        ? { ...content, title: 'legacy category |' }
        : content)
  };
  const adapterPath = path.join(fixture.root, '.private/title-adapter.mjs');
  await writeFile(adapterPath, `#!/usr/bin/env node\nprocess.stdin.resume();process.stdin.on('end',()=>process.stdout.write(${JSON.stringify(JSON.stringify(titled))}));\n`, { mode: 0o700 });
  const result = await migrateTypecho({
    repositoryRoot: fixture.root,
    dumpPath: fixture.dumpPath,
    expectedSha256: fixture.checksum,
    ledgerRoot: path.join(fixture.root, '.private/title-migration'),
    adapterCommand: adapterPath,
    expectedPosts: 2,
    expectedPages: 1
  });
  assert.deepEqual(Object.fromEntries(result.articles.map((article) => [article.slug, {
    title: article.title,
    publicPath: article.publicPath,
    canonicalRoute: article.canonicalRoute
  }])), {
    about: {
      title: 'About Fixture',
      publicPath: 'pages/About-Fixture.md',
      canonicalRoute: '/pages/about/'
    },
    'first-post': {
      title: 'legacy category | First | Synthetic Post',
      publicPath: 'posts/engineering/First-Synthetic-Post.md',
      canonicalRoute: '/posts/engineering/first-post/'
    },
    'second-post': {
      title: 'legacy category |',
      publicPath: 'posts/engineering/legacy-category.md',
      canonicalRoute: '/posts/engineering/second-post/'
    }
  });
});

test('keeps four-space-indented fence content from corrupting authored HTML examples', async (context) => {
  const fixture = await sandbox(context);
  const source = parseTypechoSql(await readFile(fixturePath, 'utf8'));
  const authoredBody = [
    '   ```diff',
    '   <div>literal</div>',
    '    ```python',
    '    print("still code")',
    '    ```',
    '## <center>visible heading</center>',
    '<div>',
    '<p align="right">visible paragraph</p>',
    '</div>'
  ].join('\n');
  const authored = {
    ...source,
    contents: source.contents.map((content, index) => index === 0 ? { ...content, text: authoredBody } : content)
  };
  const adapterPath = path.join(fixture.root, '.private/fence-adapter.mjs');
  await writeFile(adapterPath, `#!/usr/bin/env node\nprocess.stdin.resume();process.stdin.on('end',()=>process.stdout.write(${JSON.stringify(JSON.stringify(authored))}));\n`, { mode: 0o700 });
  const result = await migrateTypecho({
    repositoryRoot: fixture.root,
    dumpPath: fixture.dumpPath,
    expectedSha256: fixture.checksum,
    ledgerRoot: path.join(fixture.root, '.private/fence-migration'),
    adapterCommand: adapterPath,
    materializePublic: true,
    outputRoot: path.join(fixture.root, 'content/fence-release'),
    expectedPosts: 2,
    expectedPages: 1
  });
  assert.deepEqual(result.exceptions, []);
  const body = result.articles.find((article) => article.slug === 'first-post')?.body ?? '';
  assert.match(body, /```diff[\s\S]*## <center>visible heading<\/center>[\s\S]*<div>/u);
  assert.doesNotMatch(body, /```\n## visible heading/u);
});

test('materializes an isolated review candidate while local resources remain deferred', async (context) => {
  const fixture = await sandbox(context);
  const ledgerRoot = path.join(fixture.root, '.private/migration');
  const outputRoot = path.join(ledgerRoot, 'candidates/content');
  const result = await migrateTypecho({
    repositoryRoot: fixture.root,
    dumpPath: fixture.dumpPath,
    expectedSha256: fixture.checksum,
    ledgerRoot,
    materializeCandidate: true,
    outputRoot,
    expectedPosts: 2,
    expectedPages: 1
  });
  assert.equal(result.inventory.resourceDeferred, 1);
  assert.equal(result.inventory.resourceExceptions, 0);
  assert.match(await readFile(path.join(outputRoot, 'posts/engineering/First-Synthetic-Post.md'), 'utf8'), /\/usr\/uploads\/picture\.png/u);
  const reviewReport = JSON.parse(await readFile(path.join(ledgerRoot, 'review-report.json'), 'utf8')) as {
    resources: { exceptionsByReason: Array<{ reason: string; count: number }>; documentsWithExceptions: number };
    publicPromotion: { blocked: boolean; reasons: string[] };
  };
  assert.deepEqual(reviewReport.resources.exceptionsByReason, []);
  assert.equal(reviewReport.resources.documentsWithExceptions, 0);
  assert.deepEqual(reviewReport.publicPromotion, { blocked: false, reasons: [] });
});

test('defers legacy drive-style local asset references without rewriting authored Markdown', async (context) => {
  const fixture = await sandbox(context);
  const source = parseTypechoSql(await readFile(fixturePath, 'utf8'));
  const localReference = 'E:\\Pictures\\markdown\\image-20240228160055557.png';
  const authored = {
    ...source,
    contents: source.contents.map((content, index) => index === 0
      ? { ...content, text: content.text.replace('/usr/uploads/picture.png', localReference) }
      : content)
  };
  const adapterPath = path.join(fixture.root, '.private/drive-asset-adapter.mjs');
  await writeFile(adapterPath, `#!/usr/bin/env node\nprocess.stdin.resume();process.stdin.on('end',()=>process.stdout.write(${JSON.stringify(JSON.stringify(authored))}));\n`, { mode: 0o700 });
  const ledgerRoot = path.join(fixture.root, '.private/drive-asset-migration');
  const result = await migrateTypecho({
    repositoryRoot: fixture.root,
    dumpPath: fixture.dumpPath,
    expectedSha256: fixture.checksum,
    ledgerRoot,
    adapterCommand: adapterPath,
    expectedPosts: 2,
    expectedPages: 1
  });
  assert.ok(result.inventory.resourceDeferred >= 1);
  assert.equal(result.inventory.resourceExceptions, 0);
  assert.equal(result.exceptions.length, 0);
  const decision = result.resourceDecisions.find((resource) => resource.reference === localReference);
  assert.equal(decision?.disposition, 'deferred');
  assert.equal(decision?.reason, 'Local asset awaits OSS upload.');
  assert.match(result.articles.find((article) => article.slug === 'first-post')?.body ?? '', new RegExp(localReference.replaceAll('\\', '\\\\'), 'u'));
});

test('preserves authored path-like body text and allows clean public materialization', async (context) => {
  const fixture = await sandbox(context);
  const sql = await readFile(fixturePath, 'utf8');
  const source = parseTypechoSql(sql);
  const authoredPath = ['', 'home', 'review-only', 'secret.txt'].join('/');
  const sensitive = {
    ...source,
    contents: source.contents.map((content, index) => index === 0 ? { ...content, text: `${content.text}\n${authoredPath}` } : content)
  };
  const adapterPath = path.join(fixture.root, '.private/authored-body-adapter.mjs');
  await writeFile(adapterPath, `#!/usr/bin/env node\nprocess.stdin.resume();process.stdin.on('end',()=>process.stdout.write(${JSON.stringify(JSON.stringify(sensitive))}));\n`, { mode: 0o700 });
  const ledgerRoot = path.join(fixture.root, '.private/migration');
  const outputRoot = path.join(fixture.root, 'content/release');
  const result = await migrateTypecho({
    repositoryRoot: fixture.root,
    dumpPath: fixture.dumpPath,
    expectedSha256: fixture.checksum,
    ledgerRoot,
    adapterCommand: adapterPath,
    uploadsRoot: fixture.uploadsRoot,
    resourceManifestPath: fixture.resourceManifestPath,
    materializePublic: true,
    outputRoot,
    expectedPosts: 2,
    expectedPages: 1
  });
  assert.deepEqual(result.exceptions, []);
  assert.match(result.articles.find((article) => article.slug === 'first-post')?.body ?? '', new RegExp(`${authoredPath}\\n?$`, 'u'));
  assert.match(await readFile(path.join(outputRoot, 'posts/engineering/First-Synthetic-Post.md'), 'utf8'), new RegExp(`${authoredPath}\\n?`, 'u'));
  const reviewReport = JSON.parse(await readFile(path.join(ledgerRoot, 'review-report.json'), 'utf8')) as {
    migrationExceptionsByCode: Array<{ code: string; count: number }>;
    publicPromotion: { blocked: boolean; reasons: string[] };
  };
  assert.deepEqual(reviewReport.migrationExceptionsByCode, []);
  assert.deepEqual(reviewReport.publicPromotion, { blocked: false, reasons: [] });
  assert.deepEqual(Object.keys(reviewReport).sort(), ['migrationExceptionsByCode', 'publicPromotion', 'resources', 'schemaVersion']);
});

test('defers safe relative assets without blocking a clean public candidate', async (context) => {
  const fixture = await sandbox(context);
  const source = parseTypechoSql(await readFile(fixturePath, 'utf8'));
  const relative = {
    ...source,
    contents: source.contents.map((content, index) => index === 0 ? { ...content, text: content.text.replaceAll('/usr/uploads/picture.png', 'assets/pending.png') } : content),
    fields: source.fields.map((field) => field.name === 'thumb' ? { ...field, value: 'assets/pending.png' } : field)
  };
  const adapterPath = path.join(fixture.root, '.private/relative-asset-adapter.mjs');
  await writeFile(adapterPath, `#!/usr/bin/env node\nprocess.stdin.resume();process.stdin.on('end',()=>process.stdout.write(${JSON.stringify(JSON.stringify(relative))}));\n`, { mode: 0o700 });
  const ledgerRoot = path.join(fixture.root, '.private/relative-asset-migration');
  const outputRoot = path.join(fixture.root, 'content/relative-assets');
  const result = await migrateTypecho({
    repositoryRoot: fixture.root,
    dumpPath: fixture.dumpPath,
    expectedSha256: fixture.checksum,
    ledgerRoot,
    adapterCommand: adapterPath,
    materializePublic: true,
    outputRoot,
    expectedPosts: 2,
    expectedPages: 1
  });
  assert.equal(result.inventory.resourceDeferred, 1);
  assert.equal(result.inventory.resourceExceptions, 0);
  assert.equal(result.exceptions.length, 0);
  assert.deepEqual(result.resourceDecisions.map(({ disposition, reason }) => ({ disposition, reason })), [
    { disposition: 'deferred', reason: 'Local asset awaits OSS upload.' }
  ]);
  const firstPost = await readFile(path.join(outputRoot, 'posts/engineering/First-Synthetic-Post.md'), 'utf8');
  assert.ok(firstPost.includes('\\!\\[](assets/pending.png)'));
  const reviewReport = JSON.parse(await readFile(path.join(ledgerRoot, 'review-report.json'), 'utf8')) as {
    resources: { byDisposition: Array<{ disposition: string; count: number }>; exceptionsByReason: unknown[]; documentsWithExceptions: number };
    publicPromotion: { blocked: boolean; reasons: string[] };
  };
  assert.deepEqual(reviewReport.resources.byDisposition, [{ disposition: 'deferred', count: 1 }]);
  assert.deepEqual(reviewReport.resources.exceptionsByReason, []);
  assert.equal(reviewReport.resources.documentsWithExceptions, 0);
  assert.deepEqual(reviewReport.publicPromotion, { blocked: false, reasons: [] });
});

test('keeps unsafe URI-scheme image references as explicit blocking exceptions', async (context) => {
  const fixture = await sandbox(context);
  const source = parseTypechoSql(await readFile(fixturePath, 'utf8'));
  const unsafe = {
    ...source,
    contents: source.contents.map((content, index) => index === 0
      ? { ...content, text: content.text.replace('/usr/uploads/picture.png', 'data:image/png;base64,AAAA') }
      : content),
    fields: source.fields.map((field) => field.name === 'thumb'
      ? { ...field, value: 'data:image/png;base64,AAAA' }
      : field)
  };
  const adapterPath = path.join(fixture.root, '.private/unsafe-uri-adapter.mjs');
  await writeFile(adapterPath, `#!/usr/bin/env node\nprocess.stdin.resume();process.stdin.on('end',()=>process.stdout.write(${JSON.stringify(JSON.stringify(unsafe))}));\n`, { mode: 0o700 });
  const ledgerRoot = path.join(fixture.root, '.private/unsafe-uri-migration');
  const result = await migrateTypecho({
    repositoryRoot: fixture.root,
    dumpPath: fixture.dumpPath,
    expectedSha256: fixture.checksum,
    ledgerRoot,
    adapterCommand: adapterPath,
    expectedPosts: 2,
    expectedPages: 1
  });
  assert.equal(result.inventory.resourceDeferred, 0);
  assert.equal(result.inventory.resourceExceptions, 1);
  assert.deepEqual(result.exceptions.map(({ code }) => code), ['resource-unresolved']);
  assert.equal(result.resourceDecisions[0]?.disposition, 'exception');
  const reviewReport = JSON.parse(await readFile(path.join(ledgerRoot, 'review-report.json'), 'utf8')) as {
    resources: { byDisposition: Array<{ disposition: string; count: number }>; exceptionsByReason: Array<{ reason: string; count: number }>; documentsWithExceptions: number };
    publicPromotion: { blocked: boolean; reasons: string[] };
  };
  assert.deepEqual(reviewReport.resources.byDisposition, [{ disposition: 'exception', count: 1 }]);
  assert.deepEqual(reviewReport.resources.exceptionsByReason, [{ reason: 'Only credential-free HTTPS may remain external.', count: 1 }]);
  assert.equal(reviewReport.resources.documentsWithExceptions, 1);
  assert.deepEqual(reviewReport.publicPromotion, { blocked: true, reasons: ['migration-exceptions', 'resource-exceptions'] });
});

test('rejects checksum drift, symlinked input, collisions, and implicit public output', async (context) => {
  const fixture = await sandbox(context);
  const ledgerRoot = path.join(fixture.root, '.private/migration');
  await assert.rejects(migrateTypecho({ repositoryRoot: fixture.root, dumpPath: fixture.dumpPath, expectedSha256: '0'.repeat(64), ledgerRoot, expectedPosts: 2, expectedPages: 1 }), /does not match/u);
  const outsideDump = path.join(fixture.root, 'outside.sql.gz');
  await writeFile(outsideDump, await readFile(fixture.dumpPath));
  await assert.rejects(migrateTypecho({ repositoryRoot: fixture.root, dumpPath: outsideDump, expectedSha256: fixture.checksum, ledgerRoot, expectedPosts: 2, expectedPages: 1 }), /below the repository \.private/iu);
  const linkedDump = path.join(fixture.root, '.private/backups/linked.sql.gz');
  await symlink(fixture.dumpPath, linkedDump);
  await assert.rejects(migrateTypecho({ repositoryRoot: fixture.root, dumpPath: linkedDump, expectedSha256: fixture.checksum, ledgerRoot, expectedPosts: 2, expectedPages: 1 }), /ordinary file/u);
  await assert.rejects(migrateTypecho({ repositoryRoot: fixture.root, dumpPath: fixture.dumpPath, expectedSha256: fixture.checksum, ledgerRoot, outputRoot: path.join(fixture.root, 'content/migrated'), expectedPosts: 2, expectedPages: 1 }), /explicit materialization/u);

  const sql = await readFile(fixturePath, 'utf8');
  const collided = parseTypechoSql(sql.replaceAll("'second-post'", "'first-post'"));
  assert.equal(collided.contents.length, 3);
  const adapterPath = path.join(fixture.root, '.private/adapter.mjs');
  await writeFile(adapterPath, `#!/usr/bin/env node\nprocess.stdin.resume();process.stdin.on('end',()=>process.stdout.write(${JSON.stringify(JSON.stringify(collided))}));\n`, { mode: 0o700 });
  await chmod(adapterPath, 0o700);
  const priorOutput = path.join(fixture.root, 'content/migrated');
  await mkdir(priorOutput);
  await writeFile(path.join(priorOutput, 'sentinel.txt'), 'prior');
  const result = await migrateTypecho({ repositoryRoot: fixture.root, dumpPath: fixture.dumpPath, expectedSha256: fixture.checksum, ledgerRoot, adapterCommand: adapterPath, uploadsRoot: fixture.uploadsRoot, resourceManifestPath: fixture.resourceManifestPath, expectedPosts: 1, expectedPages: 1 });
  assert.equal(result.exceptions.some((exception) => exception.code === 'document-invalid'), true);
  assert.equal(await readFile(path.join(priorOutput, 'sentinel.txt'), 'utf8'), 'prior');
});

async function treeHashes(root: string): Promise<Readonly<Record<string, string>>> {
  const result: Record<string, string> = {};
  const visit = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else result[path.relative(root, absolute)] = createHash('sha256').update(await readFile(absolute)).digest('hex');
    }
  };
  await visit(root);
  return result;
}
