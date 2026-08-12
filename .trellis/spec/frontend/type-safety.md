# Frontend Type Safety

## Compiler Baseline

Both frontend packages are private ESM packages and extend an Astro strict
TypeScript config. Keep their dependency/lockfile and compiler versions local:

- `apps/site/`: Astro `7.1.6`, TypeScript `6.0.3`.
- `experiments/nerv/`: Astro `^4.16.18`, TypeScript `^5.9.3`.

Do not weaken strict settings or synchronize versions merely for consistency.

## Scenario: Executable Content Metadata Contract

### 1. Scope / Trigger

Use this contract whenever adding/changing content metadata, loaders, public
filters, or generated post/page routes. It prevents authored YAML values from
silently becoming invalid dates, routes, layouts, or presentations.

### 2. Signatures

```js
postSchema.parse(metadata)
pageSchema.parse(metadata)
```

```ts
getPublicContent(): Promise<{ posts: PublicPost[]; pages: PublicPage[] }>
getPublicPosts(): Promise<PublicPost[]>
getPublicPages(): Promise<PublicPage[]>
```

Collections import the same `postSchema` / `pageSchema` objects that Node tests
exercise. Do not create a test-only schema.

### 3. Contracts

| Field | Contract |
| --- | --- |
| `title`, `description` | required, trimmed, non-empty strings |
| `slug` | required single URL segment; no whitespace, slash, query, or fragment marker |
| `date` | required valid `Date` or non-empty string coercible to a valid date |
| `updated` | optional same input boundary; cannot precede `date` |
| `tags` | optional array of trimmed non-empty strings |
| `draft` | required boolean |
| post `layout` | exactly `post` |
| page `layout` | schema accepts `page`, `timeline`, `files`; M1 public projection accepts only `page` |
| `presentation` | optional `semantic` until a later registry expands it |
| `aliases` | optional absolute paths without whitespace/query/fragment |
| unknown keys | rejected by strict schemas |

Public entries across both collections must have globally unique `slug` values.
Drafts never enter the public projection.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| malformed/empty date string | schema failure |
| date input is `null`, boolean, or number | schema failure before coercion |
| `updated < date` | schema failure at `updated` |
| invalid slug/alias | schema failure |
| unknown layout/presentation/key | schema or public-projection failure |
| duplicate public slug | build failure naming both owners |
| draft entry | valid input but excluded from links/routes/output |
| public `timeline`/`files` before its route exists | build failure with the M1 layout boundary |

`z.coerce.date()` alone is insufficient: JavaScript coercion accepts values such
as `null`, booleans, and numbers. First restrict input to a valid `Date` or
non-empty string, then pipe to date coercion.

### 5. Good / Base / Bad Cases

- Good: valid framework-neutral Markdown with an explicit stable slug becomes a
  typed collection entry and independent static route.
- Base: a valid draft parses but is absent from the public projection.
- Bad: using raw `z.coerce.date()`, deriving a route from title/filename, or
  filtering drafts independently in each page.

### 6. Tests Required

- `./sam npm --prefix apps/site run test:content`: valid metadata plus malformed
  string, scalar date, slug, layout, presentation, chronology, and unknown-key
  cases.
- `./sam npm --prefix apps/site run check` and `run build`: collection and route
  integration.
- Negative builds when changing public invariants: duplicate slug and unsupported
  public layout must fail with actionable owner/details.
- Inspect `apps/site/dist/` to assert the public routes exist and drafts do not.

### 7. Wrong vs Correct

#### Wrong

```js
date: z.coerce.date()
```

#### Correct

```js
const dateInput = z.union([z.date(), z.string().trim().min(1)]);
const strictDate = dateInput.pipe(z.coerce.date());
```

The concrete helper name may differ; the input restriction and regression tests
are the contract.

## Local Types and Narrowing

- Keep one-consumer Astro props in a local `interface Props`.
- Use `CollectionEntry<'posts'>` / `CollectionEntry<'pages'>` instead of
  redefining loaded entry shapes.
- Let clear local primitives infer; use literal unions for closed variants.
- Type DOM elements at query boundaries and guard optional elements.
- Use Astro/Playwright `defineConfig` helpers for contextual typing.

## Avoid

- No `any`, broad assertions, relaxed compiler settings, or duplicated metadata
  interfaces to bypass the source contract.
- Do not describe future `PresentationAdapter` / `Enhancement` interfaces as
  implemented.
- Do not treat a JSON/Markdown shape as validated merely because it parses.

## Reference Files

- `apps/site/src/lib/content-schema.mjs`
- `apps/site/src/lib/content.ts`
- `apps/site/src/content.config.ts`
- `apps/site/tests/content-schema.test.mjs`
- `apps/site/tsconfig.json`
- `experiments/nerv/tsconfig.json`
- `experiments/nerv/src/modules/nerv/components/WarningStripe.astro`
