import assert from 'node:assert/strict';
import test from 'node:test';
import type { Element, Root as HastRoot } from 'hast';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import {
  createXCorePlugins,
  parseXCoreMetadata,
  PresentationRegistry,
  validateJsonValue,
  XCoreError,
  type DocumentContext,
  type Enhancement,
  type NormalizedDocumentInput,
  type PresentationAdapter
} from '../src/index.js';

const semanticContext: DocumentContext = {
  documentId: 'posts/fixture.md',
  sourcePath: 'content/posts/fixture.md',
  route: '/posts/fixture/',
  collection: 'posts',
  slug: 'fixture',
  layout: 'post',
  presentation: 'semantic'
};

const passThroughAdapter: PresentationAdapter = {
  id: 'semantic',
  supports: () => true,
  transform: ({ tree }) => tree,
  enhancements: () => []
};

async function processMarkdown(
  markdown: string,
  adapter: PresentationAdapter = passThroughAdapter,
  context: DocumentContext = semanticContext,
  resolvedContext: DocumentContext = context
) {
  const registry = new PresentationRegistry().register(adapter);
  const plugins = createXCorePlugins({
    registry,
    resolveContext: () => resolvedContext
  });
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(plugins.remarkPlugin)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(plugins.rehypePlugin)
    .use(rehypeStringify)
    .process({ value: markdown, path: context.sourcePath });
  const astro = file.data.astro as { frontmatter?: Record<string, unknown> };

  return {
    html: String(file),
    metadata: parseXCoreMetadata(astro.frontmatter?.xCore)
  };
}

function expectXCoreError(
  action: () => unknown,
  code: string,
  owner?: string
) {
  assert.throws(action, (error: unknown) => {
    assert.ok(error instanceof XCoreError);
    assert.equal(error.diagnostic.code, code);
    if (owner) {
      assert.match(error.message, new RegExp(owner));
    }
    return true;
  });
}

test('registry normalizes IDs and reports duplicate, unknown, and unsupported adapters', () => {
  const registry = new PresentationRegistry().register(passThroughAdapter);

  expectXCoreError(
    () => new PresentationRegistry().register(null as never),
    'XCORE_INVALID_ADAPTER'
  );
  expectXCoreError(
    () =>
      new PresentationRegistry().register({
        ...passThroughAdapter,
        id: 42 as never
      }),
    'XCORE_INVALID_ADAPTER_ID'
  );
  expectXCoreError(
    () => registry.register({ ...passThroughAdapter }),
    'XCORE_DUPLICATE_ADAPTER'
  );
  expectXCoreError(
    () => registry.resolve({ ...semanticContext, presentation: 'missing' }),
    'XCORE_UNKNOWN_PRESENTATION',
    semanticContext.documentId
  );

  const pagesOnly = new PresentationRegistry().register({
    ...passThroughAdapter,
    supports: (context) => context.collection === 'pages'
  });
  expectXCoreError(
    () => pagesOnly.resolve(semanticContext),
    'XCORE_UNSUPPORTED_CONTEXT',
    semanticContext.route
  );
});

test('plain JSON validation rejects non-finite, cyclic, class, and forbidden-key values', () => {
  validateJsonValue({ safe: [null, true, 1, 'value'] });

  const accessorValue = {};
  let accessorRead = false;
  Object.defineProperty(accessorValue, 'unsafe', {
    enumerable: true,
    get() {
      accessorRead = true;
      return 'not plain data';
    }
  });
  const decoratedArray: unknown[] = [];
  Object.defineProperty(decoratedArray, '__proto__', {
    enumerable: true,
    value: 'not an array item'
  });
  const inheritedArray = Object.setPrototypeOf([], {
    __proto__: Array.prototype
  });

  for (const value of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    new Date(),
    { value: undefined },
    JSON.parse('{"__proto__": true}'),
    { nested: JSON.parse('{"constructor": true}') },
    new Array(1),
    { [Symbol('not-json')]: true },
    decoratedArray,
    inheritedArray,
    accessorValue
  ]) {
    expectXCoreError(() => validateJsonValue(value), 'XCORE_UNSAFE_JSON');
  }

  assert.equal(accessorRead, false);

  const cyclic: { self?: unknown } = {};
  cyclic.self = cyclic;
  expectXCoreError(() => validateJsonValue(cyclic), 'XCORE_UNSAFE_JSON');
});

test('metadata parsing rejects unknown fields and malformed adapter IDs', () => {
  const metadata = {
    version: 1,
    presentation: 'semantic',
    summary: 'Fixture summary.',
    references: [],
    outline: [],
    enhancements: []
  };

  expectXCoreError(
    () => parseXCoreMetadata({ ...metadata, unexpected: true }),
    'XCORE_INVALID_METADATA'
  );
  expectXCoreError(
    () => parseXCoreMetadata({ ...metadata, presentation: 'Semantic' }),
    'XCORE_INVALID_METADATA'
  );
});

test('invalid resolved contexts fail as X Core diagnostics without native type errors', async () => {
  await assert.rejects(
    processMarkdown('A paragraph.', passThroughAdapter, semanticContext, null as never),
    (error: unknown) => {
      assert.ok(error instanceof XCoreError);
      assert.equal(error.diagnostic.code, 'XCORE_INVALID_CONTEXT');
      return true;
    }
  );

  await assert.rejects(
    processMarkdown(
      'A paragraph.',
      passThroughAdapter,
      semanticContext,
      { ...semanticContext, presentation: 42 } as never
    ),
    (error: unknown) => {
      assert.ok(error instanceof XCoreError);
      assert.equal(error.diagnostic.code, 'XCORE_INVALID_CONTEXT');
      assert.match(error.message, /posts\/fixture\.md/u);
      return true;
    }
  );
});

test('adapter failures and raw transform output become document-aware diagnostics', async () => {
  const failingAdapter: PresentationAdapter = {
    ...passThroughAdapter,
    transform: () => {
      throw new Error('fixture failure');
    }
  };
  await assert.rejects(
    processMarkdown('A paragraph.', failingAdapter),
    (error: unknown) => {
      assert.ok(error instanceof XCoreError);
      assert.equal(error.diagnostic.code, 'XCORE_TRANSFORM_FAILED');
      assert.match(error.message, /posts\/fixture\.md/u);
      return true;
    }
  );

  const rawAdapter: PresentationAdapter = {
    ...passThroughAdapter,
    transform: ({ tree }) => {
      tree.children.push({ type: 'raw', value: '<script>unsafe</script>' });
      return tree;
    }
  };
  await assert.rejects(
    processMarkdown('A paragraph.', rawAdapter),
    (error: unknown) => {
      assert.ok(error instanceof XCoreError);
      assert.equal(error.diagnostic.code, 'XCORE_INVALID_TRANSFORM');
      assert.match(error.message, /raw HTML/u);
      return true;
    }
  );

  const malformedTransform: PresentationAdapter = {
    ...passThroughAdapter,
    transform: () => null as never
  };
  await assert.rejects(
    processMarkdown('A paragraph.', malformedTransform),
    (error: unknown) => {
      assert.ok(error instanceof XCoreError);
      assert.equal(error.diagnostic.code, 'XCORE_INVALID_TRANSFORM');
      assert.match(error.message, /posts\/fixture\.md/u);
      return true;
    }
  );
});

test('malformed adapter support results remain document-aware diagnostics', async () => {
  const nonBooleanSupport: PresentationAdapter = {
    ...passThroughAdapter,
    supports: () => 'yes' as never
  };
  await assert.rejects(
    processMarkdown('A paragraph.', nonBooleanSupport),
    (error: unknown) => {
      assert.ok(error instanceof XCoreError);
      assert.equal(error.diagnostic.code, 'XCORE_INVALID_ADAPTER_RESULT');
      assert.match(error.message, /posts\/fixture\.md/u);
      return true;
    }
  );

  const throwingSupport: PresentationAdapter = {
    ...passThroughAdapter,
    supports: () => {
      throw new Error('support failure');
    }
  };
  await assert.rejects(
    processMarkdown('A paragraph.', throwingSupport),
    (error: unknown) => {
      assert.ok(error instanceof XCoreError);
      assert.equal(error.diagnostic.code, 'XCORE_ADAPTER_SUPPORT_FAILED');
      assert.match(error.message, /posts\/fixture\.md/u);
      return true;
    }
  );
});

test('paired plugins emit deterministic analysis, references, heading IDs, and node IDs', async () => {
  const markdown = `## Repeated heading

The first substantive paragraph links to [About](/pages/about/), [details](guide.md), [a section](#next), and [the web](https://example.test/).

![Fixture resource](./fixture.png)

## Repeated heading

> Quoted guidance.

\`\`\`text
a very wide code fixture
\`\`\`

| Kind | Result |
| --- | --- |
| static | durable |
`;
  const first = await processMarkdown(markdown);
  const second = await processMarkdown(markdown);

  assert.deepEqual(first, second);
  assert.deepEqual(first.metadata.outline, [
    { depth: 2, id: 'repeated-heading', text: 'Repeated heading' },
    { depth: 2, id: 'repeated-heading-1', text: 'Repeated heading' }
  ]);
  assert.match(first.metadata.summary, /^The first substantive paragraph/);
  assert.deepEqual(
    first.metadata.references.map(({ role, kind }) => ({ role, kind })),
    [
      { role: 'link', kind: 'internal' },
      { role: 'link', kind: 'relative' },
      { role: 'link', kind: 'fragment' },
      { role: 'link', kind: 'external' },
      { role: 'resource', kind: 'relative' }
    ]
  );
  assert.match(first.html, /id="repeated-heading"/u);
  assert.match(first.html, /id="repeated-heading-1"/u);
  assert.match(first.html, /data-node-id="posts-fixture-md-table-1"/u);
  assert.match(first.html, /data-node-id="posts-fixture-md-blockquote-1"/u);
  assert.match(first.html, /data-node-id="posts-fixture-md-pre-1"/u);
});

test('one normalized document produces deterministic adapter-specific output', async () => {
  const markerAdapter: PresentationAdapter = {
    id: 'marker',
    supports: () => true,
    transform: ({ tree }) => {
      tree.children.unshift({
        type: 'element',
        tagName: 'aside',
        properties: { dataPresentation: 'marker' },
        children: [{ type: 'text', value: 'Fixture presentation' }]
      });
      return tree;
    },
    enhancements: () => []
  };
  const markdown = '## Shared body\n\nThe source body stays unchanged.';
  const semantic = await processMarkdown(markdown);
  const markerContext = { ...semanticContext, presentation: 'marker' };
  const marker = await processMarkdown(markdown, markerAdapter, markerContext);
  const markerAgain = await processMarkdown(markdown, markerAdapter, markerContext);

  assert.doesNotMatch(semantic.html, /Fixture presentation/u);
  assert.match(marker.html, /Fixture presentation/u);
  assert.deepEqual(marker, markerAgain);
  assert.equal(semantic.metadata.summary, marker.metadata.summary);
  assert.deepEqual(semantic.metadata.outline, marker.metadata.outline);
});

test('raw HTML and transformed identity collisions fail with document diagnostics', async () => {
  await assert.rejects(processMarkdown('<div>not allowed</div>'), (error: unknown) => {
    assert.ok(error instanceof XCoreError);
    assert.equal(error.diagnostic.code, 'XCORE_RAW_HTML');
    assert.match(error.message, /posts\/fixture\.md/u);
    return true;
  });

  const collisionAdapter: PresentationAdapter = {
    ...passThroughAdapter,
    transform: ({ tree }) => {
      const nodes: Element[] = [];
      visit(tree, 'element', (node: Element) => {
        if (node.properties?.dataNodeId) {
          nodes.push(node);
        }
      });
      if (nodes.length >= 2 && nodes[0] && nodes[1]) {
        nodes[1].properties ??= {};
        nodes[1].properties.dataNodeId = nodes[0].properties?.dataNodeId;
      }
      return tree;
    }
  };

  await assert.rejects(
    processMarkdown('## Heading\n\nFirst.\n\nSecond.', collisionAdapter),
    (error: unknown) => {
      assert.ok(error instanceof XCoreError);
      assert.equal(error.diagnostic.code, 'XCORE_NODE_ID_COLLISION');
      assert.match(error.message, /posts\/fixture\.md/u);
      return true;
    }
  );

  const identityDriftAdapter: PresentationAdapter = {
    ...passThroughAdapter,
    transform: ({ tree }) => {
      visit(tree, 'element', (node: Element) => {
        if (typeof node.properties?.dataNodeId === 'string') {
          node.properties.dataNodeId = 'adapter-owned-node-id';
          return false;
        }
      });
      return tree;
    }
  };
  await assert.rejects(
    processMarkdown('A paragraph.', identityDriftAdapter),
    (error: unknown) => {
      assert.ok(error instanceof XCoreError);
      assert.equal(error.diagnostic.code, 'XCORE_NODE_ID_DRIFT');
      assert.match(error.message, /posts\/fixture\.md/u);
      return true;
    }
  );

  const headingCollisionAdapter: PresentationAdapter = {
    ...passThroughAdapter,
    transform: ({ tree }) => {
      let heading: Element | undefined;

      visit(tree, 'element', (node: Element) => {
        if (!heading && node.tagName === 'h2') {
          heading = node;
        }
      });

      if (heading) {
        tree.children.push({
          ...heading,
          properties: { ...heading.properties }
        });
      }

      return tree;
    }
  };
  await assert.rejects(
    processMarkdown('## Heading\n\nA paragraph.', headingCollisionAdapter),
    (error: unknown) => {
      assert.ok(error instanceof XCoreError);
      assert.equal(error.diagnostic.code, 'XCORE_HEADING_ID_COLLISION');
      assert.match(error.message, /heading/u);
      return true;
    }
  );
});

function enhancementAdapter(
  enhancements: (input: NormalizedDocumentInput) => readonly Enhancement[]
): PresentationAdapter {
  return {
    ...passThroughAdapter,
    enhancements
  };
}

test('enhancements require plain JSON props and emitted targets', async () => {
  const nullManifest = enhancementAdapter(() => null as never);
  await assert.rejects(
    processMarkdown('A paragraph.', nullManifest),
    (error: unknown) => {
      assert.ok(error instanceof XCoreError);
      assert.equal(error.diagnostic.code, 'XCORE_INVALID_ENHANCEMENT_MANIFEST');
      assert.match(error.message, /posts\/fixture\.md/u);
      return true;
    }
  );

  const nullEntry = enhancementAdapter(() => [null] as never);
  await assert.rejects(
    processMarkdown('A paragraph.', nullEntry),
    (error: unknown) => {
      assert.ok(error instanceof XCoreError);
      assert.equal(error.diagnostic.code, 'XCORE_INVALID_ENHANCEMENT');
      assert.match(error.message, /posts\/fixture\.md/u);
      return true;
    }
  );

  const missingTarget = enhancementAdapter(() => [
    {
      nodeId: 'missing-node',
      feature: 'fixture',
      module: './fixture.js',
      load: 'idle',
      props: {}
    }
  ]);
  await assert.rejects(
    processMarkdown('A paragraph.', missingTarget),
    (error: unknown) => {
      assert.ok(error instanceof XCoreError);
      assert.equal(error.diagnostic.code, 'XCORE_MISSING_ENHANCEMENT_TARGET');
      assert.match(error.message, /missing-node/u);
      return true;
    }
  );

  const unsafeProps = enhancementAdapter(({ tree }) => {
    let nodeId = '';
    visit(tree, 'element', (node: Element) => {
      if (!nodeId && typeof node.properties?.dataNodeId === 'string') {
        nodeId = node.properties.dataNodeId;
      }
    });
    return [
      {
        nodeId,
        feature: 'fixture',
        module: './fixture.js',
        load: 'visible',
        props: { invalid: (() => undefined) as never }
      }
    ];
  });
  await assert.rejects(
    processMarkdown('A paragraph.', unsafeProps),
    (error: unknown) => {
      assert.ok(error instanceof XCoreError);
      assert.equal(error.diagnostic.code, 'XCORE_UNSAFE_ENHANCEMENT_PROPS');
      assert.match(error.message, /posts\/fixture\.md/u);
      return true;
    }
  );

  const arrayProps = enhancementAdapter(({ tree }) => {
    let nodeId = '';
    visit(tree, 'element', (node: Element) => {
      if (!nodeId && typeof node.properties?.dataNodeId === 'string') {
        nodeId = node.properties.dataNodeId;
      }
    });
    return [
      {
        nodeId,
        feature: 'fixture',
        module: './fixture.js',
        load: 'visible',
        props: [] as never
      }
    ];
  });
  await assert.rejects(
    processMarkdown('A paragraph.', arrayProps),
    (error: unknown) => {
      assert.ok(error instanceof XCoreError);
      assert.equal(error.diagnostic.code, 'XCORE_UNSAFE_ENHANCEMENT_PROPS');
      assert.match(error.message, /posts\/fixture\.md/u);
      return true;
    }
  );
});

test('a valid non-empty enhancement targets a stable emitted node', async () => {
  const adapter = enhancementAdapter(({ tree }) => {
    let nodeId = '';
    visit(tree, 'element', (node: Element) => {
      if (!nodeId && typeof node.properties?.dataNodeId === 'string') {
        nodeId = node.properties.dataNodeId;
      }
    });
    return [
      {
        nodeId,
        feature: 'annotation',
        module: './annotation.js',
        load: 'visible',
        props: { label: 'Fixture' }
      }
    ];
  });
  const result = await processMarkdown('A target paragraph.', adapter);

  assert.equal(result.metadata.enhancements.length, 1);
  assert.match(result.html, new RegExp(result.metadata.enhancements[0]?.nodeId ?? 'missing'));
});
