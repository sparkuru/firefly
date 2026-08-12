import type {
  NormalizedDocumentInput,
  PresentationAdapter
} from '@f1refly/x-core';
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
      const kind = child.tagName === 'pre' ? 'Code' : 'Table';
      const wrapper: Element = {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['terminal-wide'],
          role: 'region',
          tabIndex: 0,
          ariaLabel: `${kind} content: horizontal scrolling may be needed`,
          dataTerminalWide: kind.toLowerCase()
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

function transformTerminalDocument(input: NormalizedDocumentInput): HastRoot {
  const output = cloneRoot(input.tree);
  wrapWideChildren(output);
  return output;
}

export const terminalPresentation: PresentationAdapter = {
  id: 'terminal',
  supports: (context) =>
    (context.collection === 'posts' && context.layout === 'post') ||
    (context.collection === 'pages' && context.layout === 'page'),
  transform: transformTerminalDocument,
  enhancements: () => []
};
