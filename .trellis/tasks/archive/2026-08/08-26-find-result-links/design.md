# Technical Design: Clickable `find` Results

## Architecture and Boundaries

The feature crosses the neutral command contract, the framework-neutral
Terminal compatibility adapter, and the Terminal-home DOM controller:

```text
executeFind
  ├─ stdout: existing deterministic rows ──> rshell pipe / redirect / substitution
  └─ value: document-search ──> runtime adapter ──> find effect ──> native anchors
```

`presentations/terminal/src/commands/find.ts` remains the owner of search
validation, public VFS traversal, filtering, ordering, and the plain row
formatter. It adds a structured value containing the validated matching
`PublicDocument` records only when there are matches. No DOM or route logic is
added to the command module.

`presentations/terminal/src/shell/contracts.ts` adds a closed
`document-search` value carrying the original bounded keyword and matching
public documents. `presentations/terminal/src/runtime.ts` adapts that value by
looking up each document through the already decoded `TerminalEntry` index and
returns a closed `find` effect. The lookup is exact by validated virtual path;
the adapter does not trust or construct a URL from the value.

`apps/site/src/scripts/terminal-home.ts` renders the `find` effect with the
existing document-row conventions. A small shared row helper keeps `ls` and
`find` anchor creation aligned while allowing `find` to display its complete
match path rather than only the immediate filename. The renderer creates native
`<a>` elements and text nodes. The existing transcript click handler is scoped
to `a[data-terminal-cd-path]`, so document links require no new interception
path and retain native modified-click behavior.

## UI/UX Context

The task-specific UUPM output is preserved in
`research/ui-ux-pro-max.md`. It supports the selected touch-first/native-link
direction and requires visible focus, keyboard access, reduced-motion respect,
and responsive checks at 375, 768, 1024, and 1440 pixels.

The generated UUPM recommendation is a generic marketing/system-UI result and
is not a license to change Firefly's established Terminal visual language. The
approved task decisions therefore retain the existing JetBrains Mono/font
provenance, semantic Terminal color tokens, content-first shell layout, and
native browser controls. No new icon, shadow, animation, palette, or external
font is introduced for this result list. Existing link focus and wrapping
styles are reused; the only new interaction is the native document anchor.

## Structured and Text Contracts

Neutral result shape:

```ts
type CommandValue =
  | { readonly kind: 'document-search';
      readonly keyword: string;
      readonly documents: readonly PublicDocument[] }
  // existing values remain unchanged
```

Adapter effect shape:

```ts
type TerminalEffect =
  | { readonly kind: 'find';
      readonly keyword: string;
      readonly entries: readonly TerminalEntry[] }
  // existing effects remain unchanged
```

The effect's direct browser representation uses each entry's validated
canonical `href`, a display path derived from the already decoded entry, its
date, and its title. `stdoutForEffect`/`isTextEffect` are updated for the new
effect so compatibility and pipeline paths remain total and deterministic.
The neutral `ProcessResult.stdout` remains the authoritative pipeline channel;
the structured value is never serialized into `stdin` or scratch files.

## Rendering and Accessibility

- Direct matches render as a list of document rows with native anchors.
- Each anchor has a visible display path and an accessible name for that same
  document. Existing focus styles and responsive wrapping apply.
- The link row remains usable at the existing mobile and desktop breakpoints;
  no horizontal overflow or hover-only affordance is acceptable.
- Enter on a focused anchor follows its canonical same-origin route through the
  browser's native link behavior.
- No JavaScript click handler is attached to document links. The existing
  directory-only handler remains the sole interactive transcript link override.
- Zero-match and error results continue through the existing text effect and
  retain their current announcements.

## Compatibility and Failure Handling

- Direct `find` with matches receives the structured effect.
- `find` in a pipeline, substitution, or redirect receives only the bounded
  plain rows, exactly as before.
- If a structured document cannot be mapped to a decoded `TerminalEntry`, the
  adapter returns no structured effect and the existing bounded stdout fallback
  remains available. No unsafe link is rendered.
- Existing `ls`, `tree`, `grep`, completion, shell policies, and no-JavaScript
  recovery are not changed semantically.

## Validation Design

- Neutral tests assert `document-search` value contents and unchanged stdout.
- Runtime tests assert the direct `find` effect and that `find | cat` remains a
  text effect.
- Browser tests submit `find` for post/page matches, assert native link roles,
  canonical hrefs, visible path/date/title, focusability, and keyboard
  navigation. They also assert `find | cat` has no rendered result anchors.
- Run the Terminal package checks/build/tests and the focused interactive site
  Playwright suite through the repository's `./sam` boundary.

## Rollback

The change is additive and can be reverted as one task-scoped commit. Reverting
the structured value/effect and renderer changes restores the previous plain
`find` output; no content, route, schema, deployment, or persisted state
migration is involved.
