import type {
  NormalizedDocumentInput,
  PresentationAdapter
} from '@f1refly/x-core';
import type { Element, Parent, Root as HastRoot, RootContent } from 'hast';

function wrapWideChildren(parent: Parent): void {
  const children: RootContent[] = [];

  for (const child of parent.children) {
    if (
      child.type === 'element' &&
      (child.tagName === 'pre' || child.tagName === 'table')
    ) {
      const kind = child.tagName === 'pre' ? 'code' : 'table';
      const wrapper: Element = {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['wide-content'],
          role: 'region',
          tabIndex: 0,
          ariaLabel: `${kind === 'code' ? 'Code' : 'Table'} content: horizontal scrolling may be needed`,
          dataWideContent: kind
        },
        children: [child]
      };
      children.push(wrapper);
      continue;
    }

    if (child.type === 'element') {
      wrapWideChildren(child);
    }

    children.push(child);
  }

  parent.children = children;
}

function wrapWideContent(tree: HastRoot): HastRoot {
  wrapWideChildren(tree);
  return tree;
}

export const semanticPresentation: PresentationAdapter = {
  id: 'semantic',
  supports: (context) =>
    (context.collection === 'posts' && context.layout === 'post') ||
    (context.collection === 'pages' && context.layout === 'page'),
  transform: ({ tree }: NormalizedDocumentInput) => wrapWideContent(tree),
  enhancements: () => []
};
