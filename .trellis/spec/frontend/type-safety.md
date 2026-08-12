# Frontend Type Safety

## Compiler Baseline

All frontend units are private ESM packages with local exact lockfiles. Keep
compiler/framework versions local:

- `packages/x-core/`: TypeScript `6.0.3`, framework-neutral.
- `presentations/semantic/`: TypeScript `6.0.3`, type-level X Core dependency.
- `presentations/terminal/`: TypeScript `6.0.3`; adapter root plus an independent
  framework-neutral runtime export.
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
| page `layout` | schema accepts `page`, `timeline`, `files`; current public projection accepts only `page` |
| `presentation` | optional lowercase kebab-case adapter ID; omission resolves to `semantic`; registry membership is a build-time X Core check |
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
| unknown layout, malformed presentation ID, or unknown key | schema/public-projection failure |
| valid but unregistered presentation ID | X Core build failure naming document and requested adapter |
| duplicate public slug | build failure naming both owners |
| draft entry | valid input but excluded from links/routes/output |
| public `timeline`/`files` before its route exists | build failure naming the current route/layout boundary |

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
- Negative builds when changing public invariants: duplicate slug, unsupported
  public layout, unregistered adapter, and raw HTML must fail with actionable
  owner/details. Use ignored same-filesystem `apps/site/test-results/` output and
  `finally` cleanup so failed Astro staging cannot damage normal `dist/`.
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

## Scenario: Terminal Index and Command Effects

### 1. Scope / Trigger

Use this contract when changing the home index, Terminal commands/state/effects,
or DOM controller. It protects the build-to-browser data boundary and preserves a
native fallback when enhancement data or behavior fails.

### 2. Signatures

```ts
decodeTerminalEntries(value: unknown): readonly TerminalEntry[]
executeCommand(options: {
  state: TerminalState;
  input: string;
  entries: readonly TerminalEntry[];
  identity?: TerminalIdentity;
  now?: () => Date;
}): CommandResult
navigateHistory(
  state: TerminalState,
  direction: 'up' | 'down',
  input: string
): { readonly state: TerminalState; readonly input: string }
completeCommand(input: string, entries: readonly TerminalEntry[]): CompletionResult
startTerminalHome(root: HTMLElement, seams?: TerminalControllerSeams): void
const DEFAULT_TERMINAL_PROMPT: string
```

### 3. Contracts

- `TerminalEntry` has exactly `kind`, `slug`, `filename`, `title`, `href`, and
  `date`. Filename is `${slug}.md`; href is the canonical post/page route; date
  is a real `YYYY-MM-DD` UTC calendar date.
- Decode only own data descriptors from a plain dense array and exact plain/null-
  prototype objects. Never call decorated array methods, getters, or setters.
- Commands return readonly-typed `CommandResult` values and a closed effect union:
  `lines`, `entries`, `document`, or `clear`. A document effect contains one
  validated `TerminalEntry`, never Markdown, HTML, or arbitrary DOM data. The
  engine has no DOM imports or side effects; the site controller exhaustively
  renders effects.
- Build output contains exactly one inert, `renderDocument()`-produced template
  per entry. Before revealing the shell, the controller validates the exact
  entry/template set, one top-level stream document, its non-empty title ID,
  exact `aria-labelledby` ownership, and absence of scripts/extra top-level
  elements.
- `DEFAULT_TERMINAL_PROMPT` is derived from `DEFAULT_TERMINAL_IDENTITY.user` and
  `.host`. `TerminalHome.astro` uses it for the visible prompt and accessible
  label, and `terminal-home.ts` uses it for echoed command lines. Change identity,
  prompt rendering, and their unit/browser assertions together.
- Completion is `unique`, `ambiguous`, or `none`; consume Tab only for `unique`.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| accessor, sparse/decorated array, custom prototype, unknown/missing field | decoder `TypeError`; property behavior is not invoked |
| unsafe slug/text/date or noncanonical filename/href | decoder `TypeError` before revealing the shell |
| empty command | unchanged state, null effect, empty announcement |
| unknown command or bad operands | typed error-line effect; no throw or shell interpretation |
| missing DOM, malformed index, duplicate/missing/unknown template, non-bijection, script, or extra top-level template node | retain recovery and hidden session; do not partially start |
| executor/renderer/clone scoping throws after startup | hide session, restore recovery, expose one failure message, and focus one recovery target |

### 5. Good / Base / Bad Cases

- Good: decoded build entries plus an exact template set produce closed effects;
  text/list effects use safe DOM creation, while document effects clone only the
  matching trusted template and namespace clone-owned IDs/references.
- Base: JavaScript is absent or early/late failure leaves or restores the
  server-rendered recovery navigation.
- Bad: asserting `dataset`, parsing HTML strings, cloning an unproven template,
  rewriting an external fragment as clone-local, or navigating from unvalidated
  input.

### 6. Tests Required

- Terminal unit tests: adapter identity, hostile descriptor non-invocation,
  runtime-subpath purity, tokenization, every command/usage error, 50-item history,
  and unique-only completion with lab commands absent.
- Static-output tests: exact serialized fields, one inert template per entry,
  exact bijection, bodies absent from JavaScript/data attributes, canonical
  routes, one home-only script, JavaScript-free Terminal article, and
  bidirectional package/style graph.
- Interactive Playwright: prompt-only startup, commands/errors, history,
  unique-only completion, IME and soft-keyboard Enter, inline `cat` with
  unchanged URL, repeated-clone ID/fragment/ARIA scoping, clear-to-fresh-prompt,
  latest-only announcements, and early/late recovery containment.

### 7. Wrong vs Correct

```ts
// Wrong: executes a decorated method and trusts its values.
const entries = (value as TerminalEntry[]).map((entry) => entry);

// Correct: validates own data descriptors, then returns frozen clones.
const entries = decodeTerminalEntries(value);

// Wrong: parses or injects an HTML string returned by a command.
record.innerHTML = effect.html;

// Correct: clones only the prevalidated build-time template for the entry.
const template = templates.byFilename.get(effect.entry.filename);
if (template === undefined) throw new TypeError('Missing document template.');
record.append(template.content.cloneNode(true));
```

## Local Types and Narrowing

- Keep one-consumer Astro props in a local `interface Props`.
- Use `CollectionEntry<'posts'>` / `CollectionEntry<'pages'>` instead of
  redefining loaded entry shapes.
- Let clear local primitives infer; use literal unions for closed variants.
- Type DOM elements at query boundaries and guard optional elements.
- Keep Terminal command/effect unions exhaustive; a new variant must update the
  pure engine, DOM renderer, announcements, and unit/browser tests together.
- Use Astro/Playwright `defineConfig` helpers for contextual typing.

## Avoid

- No `any`, broad assertions, relaxed compiler settings, or duplicated metadata
  interfaces to bypass the source contract.
- Do not accept `remarkPluginFrontmatter.xCore` by assertion. Parse exact fields,
  version, adapter ID, references, outline, and enhancements at the site bridge.
- Do not treat a JSON/Markdown shape as validated merely because it parses.

## Reference Files

- `apps/site/src/lib/content-schema.mjs`
- `apps/site/src/lib/content.ts`
- `apps/site/src/content.config.ts`
- `apps/site/tests/content-schema.test.mjs`
- `apps/site/tests/content-build-negatives.test.mjs`
- `packages/x-core/src/contracts.ts`
- `packages/x-core/src/metadata.ts`
- `apps/site/tsconfig.json`
- `experiments/nerv/tsconfig.json`
- `experiments/nerv/src/modules/nerv/components/WarningStripe.astro`
- `presentations/terminal/src/runtime.ts`
- `presentations/terminal/tests/terminal.test.ts`
- `apps/site/src/scripts/terminal-home.ts`
