# Design: stable Terminal home reading band

## Approved interaction decision

The home terminal uses a stable reading band instead of a permanently
bottom-pinned cursor. Empty startup and cleared sessions center the fresh prompt.
When a command produces non-document output, the newest record and fresh prompt
are centered as one readable group when that group fits. If the group is taller
than the viewport, the controller keeps the fresh prompt visible at the lower
edge and accepts that the earliest output lines are above the fold.

This preserves spatial continuity between startup, short output, long output,
and `clear` without adding a nested scroll container or changing the command
semantics.

## Data flow and boundaries

- `apps/site/src/scripts/terminal-home.ts` remains the sole owner of focus and
  document scroll settlement.
- `settleCommandOutput()` will measure the latest record-to-prompt span once,
  choose a centered target when it fits, and retain the existing prompt-at-end
  fallback for oversized output.
- The initial boot record needs a small tall-viewport offset because the page is
  too short for browser scrolling to center it. The connecting startup staging
  surface and the ready session use the same CSS compensation before and after
  the boot record is relocated, so the relocation cannot shift the log. A
  transient `data-terminal-session-initial` marker on the session enables the
  ready-state compensation; the marker is removed on the first command result
  and on clear.
- `data-terminal-session-empty` remains the authoritative clear/empty state and
  continues to center the prompt with the existing grid layout.
- Document effects keep their existing title settlement and are not folded into
  the non-document grouping algorithm.

## Geometry policy

For a record top `r`, prompt bottom `p`, viewport height `h`, and edge margin
`m`, let `span = p - r` and `available = h - 2m`:

1. If `span <= available`, scroll by `r - (m + (available - span) / 2)` so the
   record/prompt group is centered in the readable band.
2. Otherwise, focus the prompt and use `scrollIntoView({ block: 'end' })` so the
   command row remains usable without pretending the entire result fits.
3. Use smooth motion normally and immediate motion under
   `prefers-reduced-motion`, matching the existing controller contract.

The initial marker uses a bounded `dvh`-based top offset only on the booted
session. It is intentionally small on ordinary viewports and capped on tall
2K displays; mobile remains within the existing safe-area padding.

## UI and accessibility constraints

The UUPM research confirms this is an existing terminal-style, dark, content-first
surface. Only the spatial-continuity guidance is adopted; the generated
newsletter/marketing pattern is not applicable. Preserve existing JetBrains
Mono tokens, green semantic prompt colors, 44px command-row target, visible
focus, no horizontal overflow, and reduced-motion behavior. Geometry assertions
must use semantic prompt/transcript locators rather than screenshot snapshots.

## Rollback boundary

The change is limited to the home controller, Terminal CSS, the Terminal browser
spec, and the reusable frontend settlement contracts (`hook-guidelines.md`,
`type-safety.md`, `content-workspace-contract.md`, `quality-guidelines.md`, and
the validation index) if needed. Runtime, document-reader settlement, command
output, and native fallback markup are not changed.
