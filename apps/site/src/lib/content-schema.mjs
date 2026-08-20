import { z } from 'astro/zod';
import { DEFAULT_PRESENTATION_ID } from '@firefly/x-core';
import { isSafeHttpUrl, isSafeImageReference } from './site-config.mjs';

const requiredText = z.string().trim().min(1);
const htmlTitle = requiredText.refine(
  (value) => !/[\u0000-\u001f\u007f-\u009f]/u.test(value),
  'HTML title must be one safe line of text'
);
const canonical = requiredText.refine(
  isSafeHttpUrl,
  'Canonical URL must be an absolute http(s) URL without credentials or fragments'
);
const seoImage = requiredText.refine(
  isSafeImageReference,
  'SEO image must be an absolute http(s) URL or a safe root-relative path'
);
const unsafeRouteSegment = /[\\/?#%\s\u0000-\u001f\u007f]/u;
const isSafeRouteSegment = (segment) => segment.length > 0 &&
  segment !== '.' &&
  segment !== '..' &&
  !segment.startsWith('.') &&
  segment.normalize('NFC') === segment &&
  !unsafeRouteSegment.test(segment);
const slug = requiredText.refine(
  isSafeRouteSegment,
  'Slug must be one canonical safe URL segment'
);
const alias = requiredText.refine(
  (value) => value.startsWith('/') && value.endsWith('/') &&
    (value === '/' || value.slice(1, -1).split('/').every(isSafeRouteSegment)),
  'Alias must be a canonical absolute directory route'
);
const date = z.union([z.date(), requiredText]).pipe(z.coerce.date());
const presentation = requiredText.regex(
  /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u,
  'Presentation must be a lowercase kebab-case adapter ID'
);
const owner = requiredText.regex(
  /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/u,
  'Private content owner must be a safe subject token'
);
const access = z.discriminatedUnion('visibility', [
  z.object({ visibility: z.literal('public') }).strict(),
  z.object({ visibility: z.literal('private'), owner }).strict()
]);

const sharedMetadata = {
  title: requiredText,
  htmlTitle: htmlTitle.optional(),
  date,
  updated: date.optional(),
  description: requiredText,
  canonical: canonical.optional(),
  seoImage: seoImage.optional(),
  noindex: z.boolean().optional().default(false),
  tags: z.array(requiredText).optional(),
  draft: z.boolean(),
  presentation: presentation.optional().default(DEFAULT_PRESENTATION_ID),
  aliases: z.array(alias).optional(),
  access: access.optional().default({ visibility: 'public' })
};

function withChronology(schema) {
  return schema.superRefine((metadata, context) => {
    if (metadata.updated && metadata.updated < metadata.date) {
      context.addIssue({
        code: 'custom',
        message: 'Updated date cannot be earlier than publication date',
        path: ['updated']
      });
    }
  });
}

export const postSchema = withChronology(
  z.object({
    ...sharedMetadata,
    slug: slug.optional(),
    layout: z.literal('post')
  }).strict()
);

export const pageSchema = withChronology(
  z.object({
    ...sharedMetadata,
    slug,
    layout: z.enum(['page', 'timeline', 'files'])
  }).strict()
);
