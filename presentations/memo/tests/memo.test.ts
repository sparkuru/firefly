import assert from 'node:assert/strict';
import test from 'node:test';
import type { Root } from 'hast';
import { memoPresentation } from '../src/index.js';

test('Memo preserves identities, code whitespace and intentional soft lines', () => {
  const context = { documentId: 'memos/a.md', collection: 'memos' as const, route: '/pages/memos/m_example/', slug: 'm_example', layout: 'memo' as const, presentation: 'memo' };
  assert.equal(memoPresentation.supports(context), true);
  assert.equal(memoPresentation.supports({ ...context, collection: 'posts', layout: 'post' }), false);
  const tree: Root = { type: 'root', children: [
    { type: 'element', tagName: 'p', properties: { dataNodeId: 'a-p' }, children: [{ type: 'text', value: 'first\nsecond\u200b' }] },
    { type: 'element', tagName: 'pre', properties: { dataNodeId: 'a-pre' }, children: [{ type: 'element', tagName: 'code', properties: {}, children: [{ type: 'text', value: '  code\n    line\n' }] }] }
  ] };
  const original = JSON.stringify(tree);
  const result = memoPresentation.transform({ context, tree, summary: '', references: [] });
  assert.equal(JSON.stringify(tree), original);
  assert.match(JSON.stringify(result), /"tagName":"br"/u);
  assert.equal(result.children[0]?.type, 'element');
  assert.match(JSON.stringify(result), /a-pre/u);
});
