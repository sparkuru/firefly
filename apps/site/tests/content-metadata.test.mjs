import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addRuntimeFrontmatter,
  classifyFrontmatter,
  displayNameForDocument,
  safeSlugFromFilename
} from '../src/lib/content-metadata.mjs';

test('metadata title hides ordering filename prefixes while fallback keeps the physical stem', () => {
  assert.equal(displayNameForDocument({ title: 'A readable title', filename: 'index-001.md' }), 'A readable title');
  assert.equal(displayNameForDocument({ title: '   ', filename: 'index-001.md' }), 'index-001');
  assert.equal(displayNameForDocument({ title: undefined, filename: 'note.md' }), 'note');
});

test('page fallback slug normalizes whitespace without changing the visible filename fallback', () => {
  assert.equal(safeSlugFromFilename('index-page note.md'), 'index-page-note');
  assert.equal(displayNameForDocument({ title: '', filename: 'index-page note.md' }), 'index-page note');
});

test('runtime front matter only repairs absent or empty blocks', () => {
  const options = { filename: 'index-note.md', collection: 'posts', mtimeMs: Date.parse('2024-01-02T00:00:00Z') };
  const missing = addRuntimeFrontmatter('# body\n', options);
  assert.equal(classifyFrontmatter(missing), 'present');
  assert.match(missing, /^---\ntitle: "index-note"[\s\S]*\ndate: "2024-01-02"\ndraft: false\nlayout: "post"\n---\n\n##?/u);

  const empty = addRuntimeFrontmatter('---\n---\n# body\n', options);
  assert.match(empty, /^---\ntitle: "index-note"[\s\S]*\n---\n\n# body\n$/u);

  const partial = '---\ntitle: authored\n---\n# body\n';
  assert.equal(addRuntimeFrontmatter(partial, options), partial);
  assert.equal(classifyFrontmatter(partial), 'present');
});
