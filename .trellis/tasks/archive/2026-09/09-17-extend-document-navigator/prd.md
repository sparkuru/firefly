# Extend document navigator composition and author-controlled themes

## Goal and status

Make document navigation independently selectable from presentation chrome,
including a fully disabled mode, while preserving static reading. Add a visible
semantic entry, migrate the author-controlled content-theme naming contract, and
separate implementation-neutral document opening from experiment launching.

Status: **implementation complete 2026-09-17**. Product decisions are resolved
and recorded in R1–R6. The owner has no legacy users to accommodate. The parent
owns requirements and integration acceptance; implementation is complete across
the four linked children. Evidence and audit findings:
`research/planning-audit.md` and `implement.md`.

## Confirmed background

- Current presentations are `firefly` and `semantic`; both use the same
  `document-navigator` implementation. `always` and `fragment` are entry policies,
  not separate navigator implementations. Profiles are currently fixed in the
  presentation registry and always passed to document components.
- The existing public field is **`articleTheme`**, with `default` and `paper`
  registered values. There is no `contentTheme` field or browser theme picker.
- Both document renderers currently emit navigator markup and status. Navigator
  JavaScript originates in `DocumentNavigationStatus.astro`; navigator CSS also
  lives in presentation-wide stylesheets.
- `#document-navigator` is already the live fragment. The old fragment migration
  is complete; R5 is a regression gate, not a new migration deliverable.
- Current specs keep navigator profiles site-owned and out of content schemas
  and X Core metadata. Themes are site-owned content styling, not chrome.
  A new author-facing navigator field would explicitly change the first contract.
- Terminal `vim` emits a fragment-free navigation effect. The site browser helper
  currently adds the navigator fragment unconditionally, without checking the
  destination document's capability.

## Requirements

### R1 — Fully disabled navigator

`none` is a **navigator selection**, not a presentation ID. A document still has
its selected presentation, content styling, full static body, ordinary links,
heading anchors, existing outline rules, and comments behavior.

Disabled output must omit navigator-specific region semantics, ID/data hooks,
status, entry controls, handlers, and navigator-only asset delivery. Keep the
content wrapper and its styling; removing a navigator region must not remove its
body. Other independently enabled scripts, such as comments, may remain.

Asset acceptance concerns the disabled page's HTML/preloads/import graph and
browser requests. Shared build output may contain navigator files used by enabled
pages. Navigator-only CSS must also be isolated; general body/layout CSS remains.
Conditional component markup alone is insufficient evidence of asset exclusion.

Document `open` opens the destination's canonical document URL without a
navigator fragment when that destination resolves to `none`. Decide by the
**destination**, not the Terminal source page. Preserve same-origin validation
and query handling. The command rename is owned by R6. Direct visits with
`#document-navigator` to a disabled page remain normally readable and must not
activate anything.

### R2 — Independent composition and configuration

Approved first-release composition matrix:

| Presentation | Navigator | Default entry policy when enabled |
| --- | --- | --- |
| firefly | document-navigator | always |
| firefly | none | not applicable |
| semantic | document-navigator | fragment |
| semantic | none | not applicable |

Keep presentation renderer/chrome, navigator implementation, and enabled profile
separate. Presentation defaults are allowed; hard-coded ownership of the only
possible navigator is not. Registered definitions and one resolver must govern
validation, rendering, resources, and destination capability lookup. Unknown IDs
and invalid profiles must fail early with useful diagnostics.

Approved configuration scope: site-owned per-presentation defaults/overrides.
Omission preserves today's enabled behavior. No Markdown navigator metadata,
global override, or additional precedence layers are included. The
configuration surface and validation are recorded in `design.md`; configuration
does not require editing the internal registry.

The four cells prove composition across existing presentations and optionality;
they do not prove compatibility with an arbitrary future navigator. Use resolver
contract tests with a small test-only alternate definition to detect hard-coded
implementation assumptions without shipping another navigator. No dynamic plugin
loader or general compatibility negotiation is needed for this release.

### R3 — Visible semantic entry

For enabled semantic navigation, provide a visible, named entry independent of
whether an outline exists. Use a normal link near the document header
to `#document-navigator`; Enter and touch activate it. Without JavaScript it remains
a native body anchor and reading remains complete. Do not add a global shortcut.

Approved exit behavior: semantic `:q` and a visible, keyboard/touch-accessible exit
control deactivate navigation without leaving the document, returning focus to
the entry link. Firefly `:q` continues to return home. Escape cancels the current
interaction mode rather than acting as document exit.

Approved enhanced interaction: entering/exiting is an immediate page-local mode
change. Replace the current URL fragment without adding history, reloading the
page, forcing scroll or introducing transition delays. Entry focuses the body;
exit returns focus without moving the reading viewport. Back/Forward follows
normal browsing history and synchronizes the mode with the resulting URL.

The transition contract in `design.md` covers initial load, repeated activation,
direct fragment entry and cleanup. Ordinary heading links, modified clicks and
no-JS anchors retain native browser behavior. Controls work at mobile widths and
respect editable elements; no entry appears for `none`.

### R4 — Theme vocabulary and author-controlled presentation

Approved direct migration: **`articleTheme` → `contentTheme`**, without an alias
or compatibility window. Reject any input containing the old field, including
inputs containing both names even when their values agree. Omitted `contentTheme`
defaults to `default`; explicit values must be registered `default` or `paper`.

Synchronize schema, repository Markdown fixtures/front matter, `blog-meta`,
resolver/types, component props, `data-content-theme`, theme CSS, tests and docs.
Keep the structural `[data-article-content]` hook: it is not the renamed theme
field. The migration/input matrix and rollout constraints are in `design.md`.
External authored content needs an explicit migration handoff before a new build;
this design-only task does not authorize editing that content.

The authored `contentTheme` determines the document's body styling, rather than
an initial reader preference. Omission uses `default`; an explicit theme must not
be replaced by application-provided reader controls, URL overrides or stored
preferences. Do not add a public theme picker or runtime theme-switching assets.
This holds across all four composition cells, with and without JavaScript.

The registered theme set remains `default` and `paper`. Navigator entry/exit must
not change the authored theme. Author preview/editor tooling, theme locking flags
and per-article lists of reader-selectable themes are outside this task. This
application contract does not attempt to prevent browser accessibility features
or user stylesheets.

### R5 — Current fragment regression

All enabled navigator destinations and entries use `#document-navigator`.
Do not add old-fragment aliases, redirects, dual IDs, or legacy-hash branches.
Historical task records and journals need not be rewritten. Negative assertions
may mention the old name; the gate rejects active legacy behavior, not every
textual occurrence. Disabled destinations follow R1 rather than acquiring a
fragment for a region they do not render.

### R6 — Document opening and experiment launching

Approved command split: `open <path>` takes over document
opening from `vim <path>`. It expresses an intent to open a document, independent
of its configured navigator or a future editor implementation. This release does
not add editors, editable content, save operations or an editor-selection flag.

Approved experiment command: `launch <path>`, replacing the old experiment
meaning of `open`. Resolve exact listed experiment leaves using existing cwd/path
rules. `lab` alone is a directory, not a launchable application. Document `open`
must not silently dispatch experiments; `launch` must not silently open documents.
Wrong resource kinds should explain the appropriate command.
`cat <document-path>` keeps its existing inline reading behavior.

Approved migration: direct command replacement with no built-in
`vim` alias or old experiment-`open` dispatch. Update registration, help, usage,
completion, error hints (`cat`/`ls` included), examples, tests and live specs together.
No legacy history/alias conversion, deprecation period, redirect dispatch or
compatibility shim is required. `vim` follows normal unknown-command behavior;
`open` given an experiment follows resource-kind validation, with a `launch` hint.
These are ordinary new-contract errors, not old-command compatibility branches.

Keep pure document/experiment effects and canonical destination validation intact.
Document completion retains existing path and metadata matching; experiment
completion retains listed-leaf filtering. Preserve standalone-command restrictions
and private/unlisted resource exclusion.

## Delivery map

The parent defines four implementation children. They are created and linked;
each child records its own dependency and acceptance mapping in its artifacts.

| Child | Owns | Dependency and independent completion |
| --- | --- | --- |
| A: composition and disabled mode | R1, R2, destination-aware document opening | Foundation; four-cell static/runtime/asset acceptance |
| B: semantic entry | R3 | A; entry, focus, history, no-JS and mobile checks |
| C: authored theme contract migration | R4 | Direct migration approved; can be designed independently; final integration on A verifies authored themes in all cells |
| D: document/experiment command vocabulary | R6 | Command registry work can be designed independently; integration on A verifies `open` with enabled and disabled destinations |

R5 applies to every child and the parent's integration review; no standalone
migration child is needed. C owns the field migration and external-content
handoff, with no picker deliverable.

## Acceptance criteria

- [x] **AC1 / R1–R2:** Every approved presentation × navigator cell renders both
      posts and pages; omitted configuration preserves existing behavior and
      invalid selections fail early. Both registered themes retain correct styling.
- [x] **AC2 / R1:** Built disabled pages contain complete readable content,
      working links/outline and no navigator DOM/hooks/status/entry. Inspect built
      asset dependencies and browser requests to prove no navigator-only JS/CSS
      is delivered; verify JavaScript-disabled reading separately.
- [x] **AC3 / R1–R2, R6:** Document `open` to enabled and disabled destinations follows the
      approved fallback, including navigation between presentations; canonical
      routes, same-origin checks and query handling remain valid after command migration.
- [x] **AC4 / R2:** Independent registry/resolver validation covers duplicates,
      unknown IDs, invalid profiles, and an alternate test definition without
      per-presentation navigator dispatch duplication or X Core metadata leakage.
- [x] **AC5 / R3:** Visible entry works with and without an outline, on direct
      fragment load and after initial load, with keyboard/touch/no JS; focus,
      exit, repeat activation and history match the approved UX contract. Enhanced
      toggles cause no reload, new history entry, artificial delay or forced scroll.
- [x] **AC6 / R4:** The approved public field/compatibility policy is consistent
      across schema, metadata tools, authored fixtures, DOM/CSS and docs. Unknown
      theme IDs remain rejected; external workspace migration is explicit and
      does not silently mutate external content.
- [x] **AC7 / R4:** Explicit authored themes and the omitted-field default render
      consistently in all four cells, with and without JS and across navigator
      entry/exit. No public picker, theme-switching runtime or application reader
      override is introduced. No theme data enters X Core or plugin payloads.
- [x] **AC8 / R5:** Live source and generated destinations introduce no active
      legacy fragment behavior; ordinary heading links and publication routes work.
- [x] **AC9 / all:** Parent integration evidence covers the approved matrix,
      browser accessibility interactions, static output and publication asset
      boundaries. Record environment limitations without weakening assertions.
- [x] **AC10 / R6:** The approved document/experiment commands agree across help,
      completion, execution, error hints and browser navigation. Cover cwd-relative
      and rooted paths, wrong resource kinds, missing/extra operands, unknown and
      private/unlisted targets, and the approved legacy-command policy.

## Out of scope

New Atom/PowerShell presentations, a second production navigator, arbitrary
third-party runtime plugins, new theme artwork, automatic external-workspace
rewrites, old fragment compatibility, public theme switching/persistence, author
theme-preview tools, theme-lock/reader-choice metadata, and new editor runtimes.
No compatibility aliases, old-schema converters, dual dispatch, staged release or
legacy-user migration mechanism is included.

## Risks, deferred verification and artifact status

No blocking product decision remains. This PRD has passed final review for
implementation. `design.md` defines the technical design and `implement.md`
defines dependency order and validation. Both parent context manifests contain
real spec/research references; child manifests narrow that context per boundary.

Astro's final asset-loading mechanism must be proved against production output
during implementation; the zero-navigator-assets acceptance criterion is fixed.
External content, if used in future validation, must already use the new schema
or receive separately authorized edits. No external content is changed here.
The four-cell scope proves existing composition, not arbitrary future editors or
navigators. Existing specs still describe live code and will be updated with
future implementation; approved task contracts govern those intentional changes.

The owner explicitly approved the consolidated design and lifted the design-only
restriction. The four implementation children and parent integration are complete;
no compatibility aliases, legacy-schema acceptance, old-fragment behavior, or
dual command dispatch were introduced.
