# M4 Experiment pipeline — Technical Design

## Design Summary

M4 introduces two private, Node-only tooling packages under the product PRD's
existing `tooling/` boundary:

- `tooling/validate-experiments/` owns strict manifest decoding, deterministic
  discovery, public-catalog projection, and actionable diagnostics;
- `tooling/assemble-publication/` owns trusted repository-local Experiment build
  orchestration, staged-artifact validation, route/file collision detection,
  fresh release assembly, and publication-shaped browser fixtures.

The Astro site consumes only the validator package's frozen public catalog. It
does not import Experiment components, runtime code, CSS, or package metadata.
The Terminal package receives a separate, strictly decoded minimal lab index.
NERV remains an autonomous Astro 4 application and is copied unchanged into its
declared mount except for the task-scoped reduced-motion fix and browser coverage.

The final root `dist/` is never an application build target. Package builds stay
local, a staging transaction validates complete inputs, and a fresh sibling
release is promoted only after every check succeeds.

## Architectural Invariants

- X Core and the Presentation registry remain unaware of Experiments.
- `experiments/<id>/experiment.json` is the sole Experiment discovery source;
  content front matter never names or mounts an Experiment.
- Every project keeps its own manifest, lockfile, dependency graph, build
  command, and local `dist/`. The root remains a command delegate, not an npm
  workspace.
- Manifest decoding is one shared implementation used by validation, the site
  public catalog, build orchestration, and assembly. No layer recasts raw JSON.
- Only source-controlled repository-local manifests may declare build commands.
  Browser input, remote manifests, user URLs, and production data never reach
  the process-spawn boundary.
- Site output owns `/`, document routes, `/lab/`, and `/404.html`; Experiment
  output owns only the exact mount derived from its validated ID.
- The assembler copies bytes and emits inventory/catalog metadata. It never
  rewrites Experiment HTML, rebundles Experiment assets, imports their source,
  or merges their dependencies into site bundles.
- A prior root release remains untouched until validation and assembly of a new
  sibling candidate both complete.

## Repository Boundaries

```text
experiments/*/experiment.json
       │
       ▼
@f1refly/validate-experiments
  ├─ strict manifest decoder
  ├─ deterministic discovery
  └─ frozen public catalog
       │
       ├──────────────► apps/site build
       │                  ├─ /lab/index.html
       │                  └─ Terminal lab recovery/index data
       │
       └──────────────► @f1refly/assemble-publication
                          ├─ source-controlled build commands
                          ├─ apps/site/dist → artifacts/site
                          ├─ experiment dist → artifacts/experiments/<id>
                          ├─ output/reference/collision validation
                          └─ fresh candidate → root dist

root dist
  ├─ main-site output
  └─ lab/
      ├─ index.html        (main site)
      └─ nerv/             (autonomous Experiment bytes)
```

### `tooling/validate-experiments/`

This is a private ESM package with an exact lockfile, Node 22 built-ins, package-
local tests, and an exported library plus CLI. It must not depend on Astro, X
Core, either Presentation, the main site, or an Experiment package.

The library accepts explicit repository/experiments roots. It never guesses from
the process working directory, which keeps `npm --prefix`, `./sam`, Astro, and
test fixtures deterministic. It reads JSON as data, validates before narrowing,
clones accepted values, sorts by ID, and freezes returned structures.

### `tooling/assemble-publication/`

This is a second private ESM package with its own exact lockfile and tests. It may
depend on the validator through an exact local `file:` dependency. Its public
operations remain separate:

1. discover and validate manifests;
2. execute each validated repository-local build command in its owning
   Experiment directory with inherited stdio and fail-fast exit propagation;
3. stage site and Experiment outputs into a fresh candidate artifact tree;
4. validate staged files, routes, references, and prohibited content;
5. assemble a fresh candidate release and promote it to root `dist/`.

Keeping build orchestration separate from the byte-copy assembler preserves the
PRD rule that assembly itself only validates, detects conflicts, copies output,
and emits public metadata.

## Manifest Contract

### Accepted v1 shape

The existing NERV manifest is the canonical positive fixture. Version 1 accepts
exactly these top-level fields:

```ts
interface ExperimentManifestV1 {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly title: string;
  readonly kind: string;
  readonly visibility: 'listed' | 'unlisted';
  readonly mountPath: `/lab/${string}`;
  readonly entryPath: `/${string}`;
  readonly build: {
    readonly tool?: string;
    readonly command: string;
    readonly outputDir: string;
  };
  readonly entries: readonly {
    readonly id: string;
    readonly title: string;
    readonly path: `/${string}`;
    readonly role: string;
  }[];
  readonly licenseFile?: string;
  readonly tags?: readonly string[];
}
```

Validation rules are stricter than TypeScript syntax:

- objects and arrays must be ordinary dense JSON data with no unknown fields;
- `id`, entry IDs, `kind`, roles, optional tool, and tags use safe normalized
  token/text rules; titles are non-empty trimmed control-free text;
- directory basename, `id`, and `mountPath` agree exactly:
  `experiments/<id>` and `/lab/<id>`;
- paths are POSIX-normalized, traversal-free, query/fragment-free, and contain no
  backslash, NUL, drive prefix, URL scheme, empty segment, or encoded separator;
- `build.outputDir` and `licenseFile` are relative descendants of the owning
  Experiment; entry paths are root-relative within its mounted output;
- entries are non-empty, IDs and paths are unique, and `entryPath` names exactly
  one declared entry;
- tags are unique; cross-manifest IDs, mount paths, and resulting public routes
  are unique and deterministically ordered;
- schema versions other than `1`, unknown fields, and invalid optional values
  fail closed with the manifest path and field in the diagnostic.

The build command is trusted source code equivalent to a package script because
manifests are repository-owned. The CLI must state that trust boundary and never
expose the command to browser/runtime data or a remote registry.

## Public Catalog Contract

The validator projects every accepted manifest into an internal catalog. The
site receives only `visibility: listed` entries with safe public fields:

```ts
interface PublicExperiment {
  readonly id: string;
  readonly title: string;
  readonly kind: string;
  readonly href: string;
  readonly entryHref: string;
  readonly tags: readonly string[];
}
```

`href` is the canonical mount root with a trailing slash. `entryHref` is derived
from the mount plus `entryPath`; an `/index.html` default canonicalizes to the
mount root while other file entries retain their safe public path. The catalog
does not expose build commands, filesystem paths, output directories, license
paths, package metadata, or unlisted experiments.

`apps/site/src/lib/experiments.ts` resolves the repository root relative to its
own module URL and asks the installed validator package for the catalog. This is
build-time filesystem access only. It is not bundled into client JavaScript.

## Main-Site and Terminal Integration

### Approved UI/UX direction

Task-specific UUPM research is recorded in
`research/ui-ux-pro-max.md`. Its selected direction preserves the existing
product identity instead of introducing the generator's marketing-page defaults:

- `/lab/` is a restrained, content-first semantic index using the existing site
  layout, typography, palette, spacing, readable measure, skip link, and focus
  treatment. It adds no runtime external font, new palette/theme, icon package,
  oversized display type, sticky chrome, Experiment preview, or subscription UI.
- Each Experiment is one native list item with title, concise kind/tags, and a
  clearly labeled native default-entry link. The empty catalog has an explicit
  message and home path.
- Catalog data is immutable at build time. There are no loading, disabled,
  success, or permission states; an invalid catalog is a build failure, not an
  in-page error state.
- Terminal lab discovery keeps the existing shell-first language and recovery
  behavior. Owner review additionally approves semantic theme tokens, a
  self-hosted OFL-1.1 JetBrains Mono webfont, restrained cause-and-effect viewport
  motion, `cat ./<filename>` normalization, and safe global typing-to-prompt.
  No loading state, client fetch, or arbitrary navigation is introduced.
- NERV retains its immersive visual language, but reduced motion freezes
  continuous scanline, flicker, and scroll-driven decoration while preserving
  static layers and core content.
- No GSAP, view transitions, prefetch, client router, third-party runtime font
  request, or new icon dependency is permitted. Experiment assets must never be
  prefetched from the site or Terminal surfaces.
- Automated UI evidence covers `375×812` and `1440×900`, with existing responsive
  checks at `768` and `1024` where applicable: sequential headings, native links,
  logical keyboard order, visible focus, no document overflow, no color-only
  meaning, safe return paths, and reduced-motion behavior.

### `/lab/` route

`apps/site/src/pages/lab/index.astro` is a JavaScript-free main-site route. It
uses the existing semantic document shell and stylesheet, exposes one visible H1,
short explanatory copy, and a native list of public experiments. Each item uses
its validated default-entry link and safe title/kind/tags. It does not inspect
Experiment source or render a card that preloads the destination.

The route is also a direct recovery surface. Empty listed catalogs render an
explicit empty state instead of a broken list. M4's product fixture contains
NERV, so the production build is non-empty.

### Terminal data

The Terminal runtime gains a separate closed type such as:

```ts
interface TerminalExperiment {
  readonly id: string;
  readonly title: string;
  readonly href: string;
}
```

`decodeTerminalExperiments()` applies the same descriptor-safe, exact-field,
plain-data, clone-and-freeze discipline as document entries. It requires
canonical `/lab/<id>/` hrefs and unique IDs/hrefs. The home serializes the
minimal lab fields on server-rendered native recovery entries; no raw manifest,
JSON blob, build metadata, or Experiment body enters the browser.

Command behavior becomes:

| Input | Result |
| --- | --- |
| `help` | Includes `ls lab` and `open lab/<id>` exactly once. |
| `ls lab` | Returns a closed lab-list effect containing only validated listed entries and native links. |
| `open lab/<id>` | Returns a closed navigation effect for one exact validated catalog entry. The DOM controller navigates only to that effect's canonical href. |
| unknown/unlisted ID or malformed operands | Typed error-line effect; no URL construction or navigation. |

Completion adds `lab` after `ls ` and exact `lab/<id>` candidates after `open `.
The existing document index/template bijection remains document-only; lab
entries never create inert article templates. The renderer and announcement
switches remain exhaustive after the new effects land.

### Progressive recovery

The Terminal fallback gains a `lab/` group with native links sourced from the
same public catalog. Successful enhancement may hide it under the existing
startup contract; disabled JavaScript and any early/fatal failure expose it.
No Experiment script/style is referenced by `/` or `/lab/`.

### Terminal owner-review refinement

The root layout declares one explicit default Terminal theme attribute. Theme
blocks map semantic tokens rather than styling components directly:

```css
.terminal-root[data-terminal-theme='phosphor'] {
  --terminal-color-canvas: ...;
  --terminal-color-surface: ...;
  --terminal-color-text: ...;
  --terminal-color-muted: ...;
  --terminal-color-command: ...;
  --terminal-color-link: ...;
  --terminal-color-warning: ...;
  --terminal-color-error: ...;
  --terminal-color-border: ...;
  --terminal-color-focus: ...;
  --terminal-font-family: 'JetBrains Mono', ...;
  --terminal-font-size: ...;
  --terminal-line-height: ...;
  --terminal-measure: ...;
  --terminal-space-record: ...;
}
```

Components consume only those roles. M4 ships one refined green phosphor theme;
adding a visible selector, persistence, or additional product themes is deferred.
The official JetBrains Mono v2.304 Regular and Medium WOFF2 files are vendored as
static site assets with the complete SIL OFL 1.1 license, upstream release/source,
and pinned digests. The tagged release does not ship the generated variable WOFF2,
so M4 uses its unmodified official static webfonts instead of building or taking a
file from `master`. `@font-face` uses `font-display: swap`; local/system mono and
CJK fonts remain fallback. No request leaves the published origin.

Command completion accepts an optional exact `./` only for the closed `cat`
operand. It preserves the spelling during completion but normalizes before the
existing exact filename lookup. `../`, absolute paths, separators after `./`,
URLs, and arbitrary filesystem interpretation remain invalid.

Viewport settlement distinguishes output intent:

- short line/list/error output keeps focus on the input and scrolls the newly
  ready prompt into a comfortable central/lower viewport position;
- document output focuses its scoped title without an intermediate jump, then
  scrolls the new document reading start into view;
- reduced motion uses immediate placement; otherwise native restrained smooth
  scrolling expresses the command-to-output transition without blocking input.

One document-level key listener provides the approved shell return behavior. It
acts only on an unmodified, non-Space printable character when the session is
healthy, focus is outside native/editable/link controls and keyboard-scroll
regions, no text selection is active, and IME composition is inactive. It
prevents that one character's default action, focuses the current input without
an intermediate scroll, inserts at the current selection, and settles the prompt
into view. Tab, Space, Enter, Escape, navigation keys, modifier chords, browser/
assistive shortcuts, controls, text selection, and IME events remain native.

## Staging and Assembly Transaction

Generated root `artifacts/` and `dist/` remain ignored. A pipeline run uses
explicit, validated paths and sibling candidates:

1. validate every source manifest before executing builds;
2. build the M3 package/site graph in its existing order;
3. execute Experiment build commands serially by sorted ID;
4. create a unique sibling artifact candidate under the repository root;
5. copy `apps/site/dist/` to `artifacts/site/` and each declared output to
   `artifacts/experiments/<id>/` without following unsafe symlinks;
6. validate the complete artifact candidate;
7. create a unique sibling release candidate, copy site files at root, then copy
   each Experiment beneath its exact mount directory;
8. emit deterministic inventory/catalog JSON for evidence, not browser runtime;
9. atomically promote the completed candidates. If an older ignored output is
   retained during the swap, restore it on promotion failure and remove it only
   after success.

Source package `dist/`, prior root `artifacts/`, and prior root `dist/` are never
used as scratch directories. Signal/error cleanup targets only transaction paths
created by the current process and validated to be inside the repository root.

## Artifact Validation

The validator walks with `lstat` and realpath containment checks. It rejects:

- symlinks, sockets, devices, FIFOs, or any non-regular/non-directory entry;
- source maps and unknown prohibited development artifacts;
- duplicate normalized release paths, case-fold collisions where relevant, or
  ownership outside the site/manifest route map;
- missing declared entries, license evidence, referenced local assets, or the
  NERV `404.html` required by the product baseline;
- root-absolute Experiment references outside its mount;
- local references whose decoded path escapes the mounted artifact or names a
  missing file;
- credential/private/draft/source-path signatures and repository-local absolute
  paths in text artifacts.

HTML reference scanning covers `href`, `src`, `srcset`, and other local emitted
asset attributes actually present in the repository fixture. CSS scanning covers
local `url(...)`. It ignores fragments, `data:`, `mailto:`, `tel:`, and explicitly
external HTTP(S) references while rejecting protocol-relative URLs unless a
future contract approves them. Validation reports the owning artifact and source
reference; it does not rewrite URLs.

Site ownership includes `/lab/index.html` but excludes descendants of declared
Experiment mounts. Experiment ownership is exact and non-overlapping. The final
inventory is sorted POSIX-relative paths so repeated inputs produce stable
evidence.

## NERV Compatibility and Reduced Motion

NERV keeps Astro `^4.16.18`, its exact lockfile, component structure, favicon,
license, disclaimer, click/cookie/from behavior, and `/lab/nerv/` base. M4 adds a
global `@media (prefers-reduced-motion: reduce)` rule that disables the continuous
scanline and flicker animations while retaining their static visual layers.
Scroll-driven decorative stripe movement must also stop or remain static under
the media query instead of continuing JavaScript motion.

NERV browser coverage expands across the existing desktop/mobile projects to
assert default entry, title/landmarks, local favicon/assets, return behavior,
independent `404.html`, overflow, and reduced-motion state. Package-local NERV
tests still exercise its own output; publication browser tests exercise the same
bytes at the assembled path.

## Container and Nginx Boundary

The Docker builder installs each exact lockfile, builds the validator/assembler,
M3 dependency graph, site, and NERV, then runs the publication pipeline. The
runtime image copies only root `dist/`, not source, package `dist/`, dependency
trees, `artifacts/`, `.private/`, or reference assets. `.dockerignore` retains its
private and generated-output exclusions.

Nginx changes from the NERV-only redirect baseline to complete release serving:

- `/` serves the main-site `index.html`;
- `/lab` redirects canonically to `/lab/` and `/lab/` serves the site index;
- `/lab/nerv` redirects to `/lab/nerv/`;
- NERV hashed assets retain immutable caching;
- NERV misses resolve to its independent mounted `404.html` where configured;
- main-site misses use the main-site static 404 rather than the NERV page;
- `/healthz`, security headers, gzip, non-root user, read-only compose runtime,
  loopback host binding, and dropped capabilities remain.

This is production-shaped packaging evidence, not authorization for M6 staging
or M7 production traffic changes.

## Validation Architecture

- Validator unit tests use same-filesystem temporary fixtures for positive,
  malformed, duplicate, traversal, unknown-field, and deterministic-order cases.
- Assembler tests use temporary fixture trees for entries/assets, bad references,
  symlinks, source maps, collisions, prohibited strings, clean candidates,
  stale-file absence, and prior-release preservation on failure.
- Existing Terminal unit tests add decoder, command, completion, effect, and
  negative navigation coverage.
- Main-site static tests update the exact site inventory from five to six HTML
  routes and prove `/lab/`/home metadata contains only safe catalog fields while
  ordinary routes contain no Experiment code/style/assets.
- Main-site Playwright covers JavaScript-disabled `/lab/` and fallback links plus
  interactive `ls lab` and `open lab/nerv` at both approved viewports.
- NERV Playwright expands its package-local behavior; a publication Playwright
  profile serves the assembled root and checks cross-application navigation and
  mount correctness.
- Container validation builds the production-shaped image, starts the exact
  compose service on a task-selected loopback port, probes `/healthz`, `/`,
  `/lab/`, NERV entry/assets/404, and then tears down the exact service.

## Compatibility, Failure, and Rollback

- Existing document commands, history, recovery, closed template cloning,
  presentation isolation, and protected browser/IME behavior remain unchanged.
  Deliberate M4 changes are limited to lab catalog commands plus the approved
  `cat ./` alias, theme/type system, output settlement, and safe printable-key
  return to the prompt.
- Validation/build/staging failure exits non-zero before root release promotion.
  It preserves the exact child exit code where possible and names the phase,
  manifest/artifact, and failed invariant.
- Do not use `npm audit fix --force`, weaken path checks, follow symlinks, accept
  partial output, or delete a prior valid root release to make the pipeline pass.
- Rollback before commit is additive: remove the new tooling/site integrations
  and restore the NERV-only Docker/Nginx files. Never mutate the source
  Experiment, user content, private backups, or Git history destructively.

## Deferred Boundaries

- M5 owns migration-scale content, media, aliases, comments, RSS, and sitemap.
- M6 owns public staging, real deployment environment validation, and its manual
  acceptance gate.
- M7 owns immutable production release retention, atomic live symlink/container
  traffic switching, and verified production rollback.
- A future remote or third-party Experiment registry requires a new trust,
  signature, sandbox, dependency, and operational design; M4 supports only
  source-controlled repository Experiments.
