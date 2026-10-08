import type { PresentationAdapter } from '@firefly/x-core';
import type { Element, Root, RootContent } from 'hast';

// Transform sanitized nodes only; outline and body identities remain X Core owned.
function copy(node: RootContent, softLines = false): RootContent {
  if (node.type !== 'element') return { ...node };
  const preserve = node.tagName === 'pre' || node.tagName === 'code';
  const lines = !preserve && (softLines || ['p', 'li', 'blockquote'].includes(node.tagName));
  const children = node.children.flatMap((child) => {
    if (lines && child.type === 'text' && child.value.includes('\n') && child.value.trim()) {
      return child.value.split('\n').flatMap((value, index) => [
        ...(index ? [{ type: 'element' as const, tagName: 'br', properties: {}, children: [] }] : []),
        { type: 'text' as const, value }
      ]);
    }
    return [copy(child, lines) as Element['children'][number]];
  });
  const cloned: Element = { ...node, properties: { ...node.properties }, children };
  if (node.tagName === 'pre' || node.tagName === 'table') {
    return {
      type: 'element', tagName: 'div',
      properties: { className: ['memo-wide'], role: 'region', tabIndex: 0,
        ariaLabel: (node.tagName === 'pre' ? 'Code' : 'Table') + ': horizontal scrolling', dataWideContent: node.tagName },
      children: [cloned]
    };
  }
  return cloned;
}

export const memoPresentation: PresentationAdapter = {
  id: 'memo',
  supports: (context) =>
    (context.collection === 'memos' && context.layout === 'memo') ||
    (context.collection === 'pages' && ['page', 'timeline'].includes(context.layout)),
  transform: ({ tree }): Root => ({ ...tree, children: tree.children.map((node) => copy(node)) }),
  enhancements: () => []
};
