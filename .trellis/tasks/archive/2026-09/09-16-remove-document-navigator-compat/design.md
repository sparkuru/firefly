# Remove legacy document navigator compatibility — Technical Design

## Status

Planning complete and implementation validated after owner approval of the
final planning summary. The task is ready for commit and archival.

## 1. Design outcome

The site will have one current document navigator entry contract:

```text
fragment: #document-navigator
region id: document-navigator
```

`apps/site/src/lib/document-navigation.ts` remains the single owner of the
fragment value. Both document components consume the same literal as the
rendered DOM contract, and the browser controller continues to compare the
current location to that exported value. The existing presentation profiles,
progressive enhancement, native hash navigation, focus rules, and document
navigator interaction remain unchanged.

The previous `#terminal-reader` and `id="terminal-reader"` values are removed
from the live site contract. There is no redirect, alias, dual-id period, or
legacy hash branch. An old hash therefore has ordinary browser behavior and
does not activate the document navigator's exact-fragment entry path.

The Terminal `vim` command remains a first-class current product command. Its
command name, path resolution, completion, help text, fragment-free effect,
and shell tests remain unchanged. Its site-side document destination naturally
uses the new fragment because `terminal-home.ts` already imports the shared
fragment constant and adds it only at the browser navigation boundary.

## 2. Boundaries and data flow

| Concern | Owner | Change |
| --- | --- | --- |
| Current fragment value | `apps/site/src/lib/document-navigation.ts` | Change the exported value to `#document-navigator`. |
| Document region markup | `SemanticDocument.astro`, `TerminalDocument.astro` | Change the single navigable region ID to `document-navigator`. |
| Entry gate and focus | `scripts/document-navigator.ts` | No new branch; its existing comparison follows the shared constant. Verify exact-fragment focus still works. |
| Terminal-generated document URL | `scripts/terminal-home.ts` | No independent literal; verify `vim` destinations now receive the current fragment. |
| Experience/profile contract | `lib/presentation-experiences.ts` | Preserve `document-navigator` profile kinds and entry policies. |
| Static and browser assertions | `apps/site/tests/` | Update expected current fragment/ID and preserve behavior assertions. |
| Durable contracts | `.trellis/spec/frontend/*.md` | Replace the live legacy fragment wording with the current contract. |

The cross-layer flow is:

```text
document-navigation.ts
  → Astro document region + profile-derived initial state
  → document-navigator.ts exact hash gate/focus
  → terminal-home.ts document destination decoration
  → browser URL #document-navigator
```

X Core metadata, presentation adapter IDs, content front matter, canonical
routes, comments payloads, article themes, and terminal command effects do not
cross this boundary and remain unchanged.

## 3. Required invariants

1. `DOCUMENT_NAVIGATOR_FRAGMENT` is exactly `#document-navigator` and no live
   code defines a competing document navigator fragment.
2. Each rendered document has exactly one `id="document-navigator"` region,
   and its `data-document-navigator-region`, role, label, and profile-derived
   tabindex remain intact.
3. Firefly's `always` profile stays visible and focusable on direct entry but
   only receives programmatic fragment focus for the current exact fragment.
4. Semantic's `fragment` profile stays hidden and unfocusable until the current
   exact fragment is present.
5. `vim` continues to resolve the same public document and emit the same
   fragment-free `open-document` effect; only the site-generated URL hash
   changes through the shared browser helper.
6. Ordinary headings, outline links, breadcrumbs, directory links, `cat`
   output, and canonical URLs remain fragment-free unless they explicitly
   target their own content heading IDs.
7. Historical task archives and developer journals remain records of earlier
   decisions; they are not live contracts and are not rewritten for this task.

## 4. Test strategy

- Pure site tests assert the current exported fragment while preserving the
  presentation/profile validation matrix.
- Static output tests assert exactly one `id="document-navigator"` on both
  representative Terminal outputs and keep the navigator/status ordering and
  no-JavaScript behavior checks.
- JavaScript-disabled Playwright tests use the current fragment and ID to prove
  native deep links remain visible in the built HTML.
- Interactive Playwright tests update all current-fragment routes, `vim`
  destination checks, native Back/Forward checks, focus checks, and the
  no-second-scroll check. The existing desktop/mobile matrix remains the
  validation boundary.
- Screenshot review routes use the current fragment so captured entry states
  exercise the same contract as production links.
- A final live-source search must find no `terminal-reader` compatibility
  reference outside the current task's evidence, archived task records, and
  historical journal. The search must include source, tests, publication
  contracts, and X Core-facing contract text.

## 5. Rollback and risk

The change is a small atomic contract rename with a broad assertion surface.
The principal risk is a partial update that leaves the runtime, generated
HTML, or documentation on different fragment values. The shared constant and
exact-one-ID static assertions reduce that risk; the focused and full browser
checks cover focus, hash settlement, history, and `vim` routing.

If validation exposes a missed consumer, restore the last coherent state by
reverting the task's atomic diff, then update the remaining consumer and repeat
the checks. Do not reintroduce a compatibility alias as a temporary fix unless
the owner explicitly changes the product decision.
