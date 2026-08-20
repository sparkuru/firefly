import { render } from 'astro:content';
import {
  parseXCoreMetadata,
  xCoreError,
  type OutlineItem
} from '@firefly/x-core';
import type { PublicPage, PublicPost } from './content';

export type PublicDocument = PublicPost | PublicPage;

function assertHeadingMetadata(
  outline: readonly OutlineItem[],
  headings: readonly { depth: number; slug: string; text: string }[],
  owner: string
) {
  if (outline.length !== headings.length) {
    throw xCoreError(
      'XCORE_HEADING_METADATA_DRIFT',
      `X Core and Astro reported different heading counts for ${owner}.`
    );
  }

  outline.forEach((item, index) => {
    const heading = headings[index];

    if (
      !heading ||
      item.depth !== heading.depth ||
      item.id !== heading.slug ||
      item.text !== heading.text
    ) {
      throw xCoreError(
        'XCORE_HEADING_METADATA_DRIFT',
        `X Core and Astro heading metadata diverged for ${owner}.`
      );
    }
  });

  let previousDepth = 1;

  for (const item of outline) {
    if (item.depth === 1 || item.depth > previousDepth + 1) {
      throw xCoreError(
        'XCORE_SEMANTIC_HEADING_ORDER',
        `Body headings for ${owner} must begin at level two and remain sequential.`
      );
    }

    previousDepth = item.depth;
  }
}

export async function renderDocument(entry: PublicDocument) {
  const rendered = await render(entry);
  const owner = `${entry.collection}/${entry.id}`;
  const metadata = parseXCoreMetadata(
    rendered.remarkPluginFrontmatter.xCore,
    owner
  );

  assertHeadingMetadata(metadata.outline, rendered.headings, owner);

  return {
    Content: rendered.Content,
    headings: rendered.headings,
    metadata
  };
}
