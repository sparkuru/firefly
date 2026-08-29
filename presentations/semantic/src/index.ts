import type {
  NormalizedDocumentInput,
  PresentationAdapter
} from '@firefly/x-core';
import type {
  Element,
  ElementContent,
  Parent,
  Root as HastRoot,
  RootContent
} from 'hast';

function cloneElementContent(node: ElementContent): ElementContent {
  if (node.type !== 'element') {
    return { ...node };
  }

  return {
    ...node,
    properties: { ...node.properties },
    children: node.children.map(cloneElementContent)
  };
}

function cloneRootContent(node: RootContent): RootContent {
  if (node.type === 'doctype') {
    return { ...node };
  }
  return cloneElementContent(node);
}

function cloneRoot(tree: HastRoot): HastRoot {
  return {
    ...tree,
    children: tree.children.map(cloneRootContent)
  };
}

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
  transform: ({ tree }: NormalizedDocumentInput) => wrapWideContent(cloneRoot(tree)),
  enhancements: () => []
};
