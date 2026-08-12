import { z } from 'astro/zod';

const requiredText = z.string().trim().min(1);
const slug = requiredText.regex(
  /^[^/?#\s]+$/u,
  'Slug must be a single URL segment without whitespace, slashes, queries, or fragments'
);
const alias = requiredText.regex(
  /^\/(?!\/)[^?#\s]*$/u,
  'Alias must be an absolute path without whitespace, a query, or a fragment'
);
const date = z.union([z.date(), requiredText]).pipe(z.coerce.date());
const presentation = requiredText.regex(
  /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u,
  'Presentation must be a lowercase kebab-case adapter ID'
);

const sharedMetadata = {
  title: requiredText,
  slug,
  date,
  updated: date.optional(),
  description: requiredText,
  tags: z.array(requiredText).optional(),
  draft: z.boolean(),
  presentation: presentation.optional(),
  aliases: z.array(alias).optional()
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
    layout: z.literal('post')
  }).strict()
);

export const pageSchema = withChronology(
  z.object({
    ...sharedMetadata,
    layout: z.enum(['page', 'timeline', 'files'])
  }).strict()
);
