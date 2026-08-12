import assert from 'node:assert/strict';
import test from 'node:test';
import type { Root as HastRoot } from 'hast';
import type {
  DocumentContext,
  NormalizedDocumentInput
} from '@f1refly/x-core';
import { semanticPresentation } from '../src/index.js';

const context: DocumentContext = {
  documentId: 'posts/example.md',
  route: '/posts/example/',
  collection: 'posts',
  slug: 'example',
  layout: 'post',
  presentation: 'semantic'
};

function input(tree: HastRoot): NormalizedDocumentInput {
  return { context, summary: '', references: [], tree };
}

test('semantic presentation supports only M2 post and page contexts', () => {
  assert.equal(semanticPresentation.supports(context), true);
  assert.equal(
    semanticPresentation.supports({
      ...context,
      collection: 'pages',
      layout: 'page'
    }),
    true
  );
  assert.equal(
    semanticPresentation.supports({ ...context, layout: 'timeline' }),
    false
  );
  assert.equal(
    semanticPresentation.supports({ ...context, layout: 'files' }),
    false
  );
});

test('semantic presentation preserves native nodes and wraps only wide content', () => {
  const tree: HastRoot = {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'h2',
        properties: { id: 'meaning' },
        children: [{ type: 'text', value: 'Meaning' }]
      },
      {
        type: 'element',
        tagName: 'blockquote',
        properties: {},
        children: [
          {
            type: 'element',
            tagName: 'p',
            properties: {},
            children: [{ type: 'text', value: 'Native semantics remain.' }]
          }
        ]
      },
      {
        type: 'element',
        tagName: 'ul',
        properties: {},
        children: [
          {
            type: 'element',
            tagName: 'li',
            properties: {},
            children: [
              {
                type: 'element',
                tagName: 'pre',
                properties: { dataNodeId: 'example-pre-1' },
                children: [
                  {
                    type: 'element',
                    tagName: 'code',
                    properties: {},
                    children: [{ type: 'text', value: 'wide' }]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        type: 'element',
        tagName: 'table',
        properties: { dataNodeId: 'example-table-1' },
        children: []
      }
    ]
  };
  const result = semanticPresentation.transform(input(tree));

  assert.equal(result.children[0]?.type, 'element');
  assert.equal(result.children[0]?.type === 'element' && result.children[0].tagName, 'h2');
  assert.equal(result.children[1]?.type === 'element' && result.children[1].tagName, 'blockquote');
  assert.equal(result.children[2]?.type === 'element' && result.children[2].tagName, 'ul');
  assert.equal(result.children[3]?.type === 'element' && result.children[3].tagName, 'div');

  const list = result.children[2];
  const listItem = list?.type === 'element' ? list.children[0] : undefined;
  const codeWrapper = listItem?.type === 'element' ? listItem.children[0] : undefined;
  assert.equal(codeWrapper?.type === 'element' && codeWrapper.properties.role, 'region');
  assert.equal(codeWrapper?.type === 'element' && codeWrapper.properties.tabIndex, 0);
  assert.equal(
    codeWrapper?.type === 'element' && codeWrapper.children[0]?.type === 'element' && codeWrapper.children[0].tagName,
    'pre'
  );
});

test('semantic output is stable and production enhancements remain empty', () => {
  const makeTree = (): HastRoot => ({
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'p',
        properties: { dataNodeId: 'example-p-1' },
        children: [{ type: 'text', value: 'Stable output.' }]
      }
    ]
  });
  const first = semanticPresentation.transform(input(makeTree()));
  const second = semanticPresentation.transform(input(makeTree()));

  assert.deepEqual(first, second);
  assert.deepEqual(
    semanticPresentation.enhancements({ ...input(first), tree: first }),
    []
  );
});
