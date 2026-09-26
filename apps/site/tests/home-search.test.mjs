import assert from 'node:assert/strict';
import test from 'node:test';
import { createHomeSearchDocument, decodeHomeSearchMetadata, normalizeSearchText, searchExcerpt, searchHomeDocuments } from '../src/lib/home-search.ts';

function metadata(overrides = {}) {
  return decodeHomeSearchMetadata({
    title: 'Same title', filename: 'note.md', virtualPath: 'posts/note.md', href: '/posts/note/',
    date: '2026-09-26', description: 'A useful description', tags: ['tag-only'], ...overrides
  });
}

test('searches every approved field literally, case-insensitively, with Chinese and NFC', () => {
  const document = createHomeSearchDocument(metadata({ title: 'CAFÉ 萤火虫 [a.*]', virtualPath: 'posts/nested/note.md' }), ['Only body phrase', '连续中文没有空格']);
  for (const query of ['cafe\u0301', '萤火虫', '[a.*]', 'note.md', 'nested', 'useful description', 'TAG-ONLY', 'body phrase', '中文没有']) {
    assert.equal(searchHomeDocuments([document], query).length, 1, query);
  }
  for (const query of ['a.+', '[a.*]+', 'unmatched', '', ' \n\t ']) {
    assert.equal(searchHomeDocuments([document], query).length, 0, query);
  }
  assert.equal(normalizeSearchText('  A\nB '), 'a b');
});

test('matches one article once, preserving public order within metadata and body tiers', () => {
  const body = createHomeSearchDocument(metadata({ virtualPath: 'pages/body.md', href: '/pages/body/', filename: 'body.md' }), ['needle', 'needle again']);
  const first = createHomeSearchDocument(metadata({ virtualPath: 'posts/first.md', href: '/posts/first/', filename: 'first.md', tags: ['needle'] }), ['needle']);
  const second = createHomeSearchDocument(metadata({ virtualPath: 'posts/second.md', href: '/posts/second/', filename: 'second.md', description: 'needle' }), []);
  const results = searchHomeDocuments([body, first, second], 'needle');
  assert.deepEqual(results.map((result) => [result.metadata.virtualPath, result.match]), [
    ['posts/first.md', 'metadata'], ['posts/second.md', 'metadata'], ['pages/body.md', 'body']
  ]);
  assert.deepEqual(results.map((result) => result.metadata.title), ['Same title', 'Same title', 'Same title']);
  assert.deepEqual(results.map((result) => result.context), ['needle', 'needle', 'needle']);
});

test('body boundaries cannot invent a cross-paragraph match', () => {
  const document = createHomeSearchDocument(metadata(), ['one paragraph', 'next paragraph', 'inline words continuous', 'code\n  literal();', 'table cell']);
  assert.equal(searchHomeDocuments([document], 'paragraph next').length, 0);
  for (const query of ['words continuous', 'code literal();', 'table cell']) {
    assert.equal(searchHomeDocuments([document], query).length, 1);
  }
});

test('excerpts bound Unicode code points, retain hits after expanded folding, and never interpret markup', () => {
  const text = 'İ'.repeat(200) + '🪲'.repeat(200) + 'findme <img onerror=alert(1)>' + '尾'.repeat(200);
  const excerpt = searchExcerpt(text, 'findme');
  assert.ok(excerpt.includes('findme <img onerror=alert(1)>'));
  assert.ok(Array.from(excerpt).length <= 162);
  assert.doesNotMatch(excerpt, /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u);
  assert.equal(searchExcerpt('short context', 'absent'), 'short context');
});

test('metadata accepts public Unicode/spaced parent routes and rejects unsafe/incomplete projections', () => {
  assert.equal(metadata({ virtualPath: 'posts/with spaces/交流.md', filename: '交流.md', href: '/posts/with spaces/交流/' }).href, '/posts/with spaces/交流/');
  for (const override of [
    { href: 'https://example.test/posts/note/' }, { href: '/posts/note/#document-navigator' },
    { href: '//example.test/posts/note/' }, { href: '/posts/../note/' },
    { href: '/lab/nerv/' }, { virtualPath: 'posts/../note.md' }, { tags: [1] }, { private: true }
  ]) assert.throws(() => metadata(override), TypeError);
  assert.throws(() => decodeHomeSearchMetadata({}), TypeError);
  let getterReads = 0;
  const accessorMetadata = { ...metadata() };
  Object.defineProperty(accessorMetadata, 'title', {
    enumerable: true,
    get() { getterReads += 1; return 'Getter title'; }
  });
  assert.throws(() => decodeHomeSearchMetadata(accessorMetadata), TypeError);
  assert.equal(getterReads, 0);
});

test('hundreds of public documents produce complete stable results without a cap', (context) => {
  const started = performance.now();
  const documents = Array.from({ length: 600 }, (_, index) => createHomeSearchDocument(metadata({
    filename: `note-${index}.md`, virtualPath: `posts/note-${index}.md`, href: `/posts/note-${index}/`
  }), ['long public text '.repeat(1000) + 'body-fixture-needle']));
  const extracted = performance.now();
  const results = searchHomeDocuments(documents, 'body-fixture-needle');
  const finished = performance.now();
  assert.equal(results.length, 600);
  assert.equal(results[599].metadata.virtualPath, 'posts/note-599.md');
  context.diagnostic(`600 documents / ~10 MB: normalize=${(extracted - started).toFixed(1)}ms search=${(finished - extracted).toFixed(1)}ms`);
});
