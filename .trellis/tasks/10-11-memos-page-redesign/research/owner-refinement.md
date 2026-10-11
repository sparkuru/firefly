# Owner Preview Refinement

## Accepted Baseline

The owner accepted the first candidate's overall light/spacious visual result.
Its validation is retained in `final-validation.md`; it is not evidence for
unimplemented refinement. Continue this task rather than creating a new one.

## Requested Changes

1. Automatic blue-bar feedback must not treat a half-clipped top entry as the
   presumed reading target when complete entries are visible below it.
2. Detail reading should consist of date/content, divider, exactly one bottom
   Return to timeline and footer. Remove upper return/global header/sidebar.
3. Feed should visibly consist of historical navigation and entries. Remove
   Home/Pages/Memos site navigation and move desktop history to the left.

## Repository Evidence

- `apps/site/src/scripts/memo-timeline.ts:41` supplies seek clearance.
- `apps/site/src/scripts/memo-timeline.ts:86`/`:90` use that upper clearance line
  to pick the first entry whose bottom has not crossed it. Thus a clipped top
  entry remains active, matching the owner's report.
- `apps/site/src/scripts/memo-timeline.ts:43` uses a 64px absent-header fallback,
  which must be corrected if the visible global header is removed.
- `apps/site/src/components/MemoDocument.astro:20` and `:23` provide the duplicate
  upper/lower detail returns.
- `apps/site/src/layouts/MemoLayout.astro:29`/`:35` own the global header and
  primary site navigation to remove.

## Approved Reading Policy

The owner explicitly chose native-scroll selection at the center of the unobscured reading
viewport, with deterministic nearest-visible selection in gaps. Long entries
remain selected while containing that center. Explicit seeks retain their
selected target until actual browsing resumes; induced scroll callbacks do not
override it. This is a reading-position proxy rather than gaze detection.

The owner response "中央规则吧" resolves the final choice. Feed/detail
simplifications are already owner-directed; revised implementation may proceed.

## Preservation and Verification

Preserve the approved light tokens, readable measure, source bodies, titles when
authored, URL/visibility/date semantics, occupied-month mapping and static
fallbacks. Revise browser tests for new placement/missing chrome and meaningful
active-reading/seek ownership, then independent review, full gate/package and
actual-corpus preview. Do not weaken unrelated geometry/zoom/touch tests.
