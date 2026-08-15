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
| post `slug` | optional legacy assertion; when present equals the filename stem |
| page `slug` | required canonical safe URL segment; NFC, non-hidden, no whitespace, slash, percent, backslash, query, fragment, control, or dot segment |
| `date` | required valid `Date` or non-empty string coercible to a valid date |
| `updated` | optional same input boundary; cannot precede `date` |
| `tags` | optional array of trimmed non-empty strings |
| `draft` | required boolean |
| post `layout` | exactly `post` |
| page `layout` | schema accepts `page`, `timeline`, `files`; current public projection accepts only `page` |
| `presentation` | optional lowercase kebab-case adapter ID; omission resolves to `semantic`; registry membership is a build-time X Core check |
| `aliases` | optional canonical absolute trailing-slash directory routes; every segment passes the safe route-segment gate |
| `access` | optional exact public/private-owner union; omission defaults public; private requires a safe subject owner |
| unknown keys | rejected by strict schemas |

Canonical document/directory/alias routes must be unique under the shared
Unicode/case collision key. Drafts never enter any identity projection.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| malformed/empty date string | schema failure |
| date input is `null`, boolean, or number | schema failure before coercion |
| `updated < date` | schema failure at `updated` |
| invalid/non-NFC/hidden/percent slug or alias | schema failure |
| private without owner, public with owner, or malformed subject | schema failure |
| unknown layout, malformed presentation ID, or unknown key | schema/public-projection failure |
| valid but unregistered presentation ID | X Core build failure naming document and requested adapter |
| duplicate/colliding canonical path, directory, or alias | build failure naming both owners |
| draft entry | valid input but excluded from links/routes/output |
| public `timeline`/`files` before its route exists | build failure naming the current route/layout boundary |

`z.coerce.date()` alone is insufficient: JavaScript coercion accepts values such
as `null`, booleans, and numbers. First restrict input to a valid `Date` or
non-empty string, then pipe to date coercion.

### 5. Good / Base / Bad Cases

- Good: valid framework-neutral post Markdown gains identity from its safe staged
  relative path; a page uses its explicit stable slug; both become typed routes.
- Base: a valid draft parses but is absent from the public projection.
- Bad: using raw `z.coerce.date()`, deriving a route from title/filename, or
  filtering drafts independently in each page.

### 6. Tests Required

- `./sam npm --prefix apps/site run test:content`: valid metadata plus malformed
  string, scalar date, slug, layout, presentation, chronology, and unknown-key
  cases.
- `./sam npm --prefix apps/site run check` and `run build`: collection and route
  integration.
- Negative builds when changing public invariants: duplicate/colliding route,
  unsupported public layout, unregistered adapter, private leakage, and raw HTML
  must fail with actionable
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

## Scenario: Terminal Index, Registry, and Effects

### 1. Scope / Trigger

Use this contract when changing the Terminal browser index, command definitions,
aliases, state/effects, completion, or DOM controller. The runtime remains pure;
native recovery remains available when enhancement validation fails.

### 2. Signatures

```ts
decodeTerminalEntries(value: unknown): readonly TerminalEntry[]
decodeTerminalExperiments(value: unknown): readonly TerminalExperiment[]
createTerminalCommandRegistry(
  definitions: readonly TerminalCommandDefinition[]
): TerminalCommandRegistry
executeCommand(options: {
  state: TerminalState;
  input: string;
  entries: readonly TerminalEntry[];
  experiments?: readonly TerminalExperiment[];
  documents?: readonly TerminalTextDocument[];
  identity?: TerminalIdentity;
  now?: () => Date;
  registry?: TerminalCommandRegistry;
}): CommandResult
completeCommand(
  input: string,
  entries: readonly TerminalEntry[],
  experiments?: readonly TerminalExperiment[],
  registry?: TerminalCommandRegistry
): CompletionResult
startTerminalHome(root: HTMLElement, seams?: TerminalControllerSeams): void
```

### 3. Contracts

- `TerminalEntry` contains exactly `kind`, `virtualPath`, `relativePath`,
  `filename`, `title`, `href`, and `date`; href is derived from the canonical
  `.md` virtual path. `TerminalExperiment` remains exact `{ id, title, href }`.
- Decoders inspect only own data descriptors in plain dense arrays and exact
  plain/null-prototype objects. They reject accessors, unknown fields, hidden/
  traversal/percent/backslash/non-NFC paths, route drift, and Unicode/case-folded
  duplicates without invoking user behavior.
- Registry definitions own canonical name, aliases, summary, usage, execution,
  and optional completion. Creation validates safe unique tokens, safe metadata,
  callable handlers, clones/freeze records, and supplies the active definition
  list to `help`, execution, and completion.
- Rshell execution resolves aliases to the canonical definition and passes only
  immutable state, public entries, normalized `TerminalTextDocument` lines,
  declared stdin, identity/clock, and pipeline flags. Custom text definitions
  may participate in pipelines; only `pureText: true` definitions may run in
  bounded substitution, and non-text effects are rejected there.
- Effects are closed: `lines`, `entries`, `experiments`, `navigation`,
  `document`, `document-navigation`, `tree`, and `clear`. Navigation effects
  contain decoded records; raw input never becomes a URL.
- `cat`/`vim` share the virtual resolver/completer from
  `content-workspace-contract.md`. Safe zero-result paths use a distinct
  `no-match` result that owns Tab; safe ambiguity marks ownership explicitly;
  other ambiguity and unsafe input remain native.
  Template validation/cloning and global typing retain the existing
  descriptor, fallback, focus, ID scoping, IME, ARIA, and reduced-motion gates.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| accessor, sparse/decorated array, custom prototype, unknown field | decoder `TypeError`; behavior not invoked |
| unsafe/noncanonical/fold-colliding path or href | decoder `TypeError` before shell reveal |
| unsafe/colliding command or alias, bad metadata/handler | registry `TypeError` at creation |
| empty command | unchanged state, null effect, empty announcement |
| unknown command or bad operand | error-line effect; no throw/shell interpretation |
| hostile/unknown-root `cat` or `vim` path | not-found/usage or no completion; no navigation/native Tab capture |
| safe ambiguous `cat`/`vim` path | `ambiguous` with `ownsTab: true`; retain focus and prefixed candidates |
| safe zero-result `cat`/`vim` path | exhaustive `no-match` with `ownsTab: true`; retain exact input/focus and status |
| non-path command ambiguity | `ambiguous` with `ownsTab: false`; preserve native traversal |
| custom registry alias in a pipeline | execute the canonical custom definition with bounded text stdin; do not fall back to a legacy single-command path |
| custom non-text effect in a pipeline/substitution | typed error; no navigation, DOM effect, or partial scratch mutation |
| malformed template or controller exception | retain/restore recovery and hide partial session |

### 5. Good / Base / Bad Cases

- Good: a custom test definition and alias appear in active-registry help,
  execute through either token, and complete without changing a central switch.
- Good: `cat ./characters/nahida.md` and virtual absolute form resolve the same
  decoded entry; `vim` returns that entry's canonical href.
- Base: absent JavaScript or validation failure leaves native recovery links.
- Bad: assert datasets, invoke getters, register behavior in parallel switches,
  parse HTML strings, resolve host paths, or concatenate operands into URLs.

### 6. Tests Required

- Unit: hostile descriptors, registry validation/custom alias/help/execution/
  completion, all commands/effects, tree variants, history, nested/absolute
  cat/vim completion, and hostile path rejection.
- Static output: exact serialized fields/template bijection, canonical nested
  routes, bodies absent from index/JS, home-only command asset, document-only
  reader asset, and package/style graph closure.
- Playwright: prompt/history/IME/Tab/recovery/global typing, tree/cat/vim,
  canonical navigation, clone scoping, settlement, reduced motion, and protected
  native/ARIA/local-scroll behavior at both viewports.

### 7. Wrong vs Correct

```ts
// Wrong: trust raw values and construct a route from an operand.
const entry = (value as TerminalEntry[])[0];
window.location.assign(`/posts/${operand}/`);

// Correct: decode records, resolve through the registry, then use the closed effect.
const entries = decodeTerminalEntries(value);
const result = executeCommand({ state, input, entries, registry });
if (result.effect?.kind === 'document-navigation') {
  window.location.assign(result.effect.entry.href);
}
```

## Local Types and Narrowing

Workspace, access, canonical-path, registry, and reader contracts are detailed
in `content-workspace-contract.md`. Experiment manifest and publication types live in
`@f1refly/validate-experiments`, not in Astro routes or the assembler. Raw JSON
must pass the exact descriptor-safe decoder before narrowing; downstream code
accepts frozen `ExperimentManifest` / `PublicExperiment` values. Terminal narrows
again to exact canonical `{ id, title, href }` data at the browser boundary.
Path types do not prove containment: validate normalized syntax, lexical
containment, and resolved realpath containment before reading, copying, or
executing an Experiment-owned path. The full executable matrix is in
`publication-contract.md`.

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
- Do not cast `experiment.json`, duplicate its interface in a consumer, trust a
  template-literal path type as filesystem containment, or construct a Terminal
  Experiment href from raw command text.

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
- `tooling/validate-experiments/src/index.ts`
- `tooling/assemble-publication/src/index.ts`
- `.trellis/spec/frontend/publication-contract.md`
- `.trellis/spec/frontend/content-workspace-contract.md`
- `presentations/terminal/tests/terminal.test.ts`
- `apps/site/src/scripts/terminal-home.ts`
- `apps/site/src/scripts/terminal-reader.ts`
