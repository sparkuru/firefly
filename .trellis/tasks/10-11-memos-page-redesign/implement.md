# Memos Redesign Execution Plan

## Phase Gate

The task is already active and the first candidate was verified and visually
accepted. The owner's requested simplifications are recorded in the revised
PRD/design. The owner selected the center rule; resume Phase 2 using this
existing task and curated context.
Do not create or start a second task for the refinement.
The main session retains task transitions, scope decisions, specs and finish.

## Ordered Work

1. Read the approved PRD/design and injected specs; inspect current dirty state
   and preserve others' changes. Build no parallel editable design-system master.
2. Remove global header/site navigation and large feed intro. Make the detail
   reader flat and minimal with date/content and one bottom return/footer.
   Retain authored titles, accessible naming, source bodies and route semantics.
3. Update scoped `memo.css` tokens, feed spacing, readable detail width,
   left desktop rail/two-column layout, focus and control states.
4. Implement the approved native-scroll active-entry policy independently of
   explicit seek alignment. Fix absent-header geometry/zero fallback and retire
   unused heading-only shell code. Preserve time mapping, explicit seek targets,
   history, date bubble, feedback and no-JS fallback behavior.
5. Extend maintained browser tests for actual changed interactions and layout:
   wide desktop/left rail, tablet, narrow/mobile landscape, clipped edge entries,
   center/long-entry reading behavior if chosen, explicit seek ownership, date
   feedback, one bottom detail return, missing chrome, focus and reduced motion.
   Replace only assertions for explicitly retired header/navigation behavior;
   preserve all other invariants and meaningful enlarged-text geometry coverage.
   Retain equal-month/geometry/touch/no-JS/empty/single/media coverage.
6. Run focused checks, fix substantive failures, and dispatch full-scope Trellis
   check. Record actual evidence and failures; never weaken existing assertions.
7. Run required broader gates and normal runtime packaging. Restore the normal
   local preview after synthetic fixture builds, then present both surfaces to
   the owner for subjective acceptance.
8. Update the owning Memo reader contract from approved behavior and validated
   evidence. Follow project commit/finish rules when those actions are reached.

## Expected Source Boundary

- `apps/site/src/layouts/MemoLayout.astro`
- `apps/site/src/components/MemoDocument.astro`, `MemoTimeline.astro`,
  `MemoEntry.astro`
- `apps/site/src/styles/memo.css`
- `apps/site/src/scripts/memo-timeline.ts` and retirement of `memo-shell.ts`
  once no header enhancement remains.
- `apps/site/tests/memos.spec.ts`, relevant existing static/Node tests only when
  their asserted behavior changes, and `.trellis/spec/frontend/memo-document-contract.md`.

No content-source edits, package/dependency upgrades, shared Terminal redesign,
README edits, or private runtime/deployment changes are required.

## Validation

Classifications: `playwright-required` for new interactions, with existing
coverage reused for unchanged reader invariants; `mobile-required` for feed and
details. Browser evidence uses pinned Docker execution, never host Node/browser.

Inspect existing Docker/lockfile prerequisites before installing changed-package
dependencies through the approved boundary. Relevant commands:

```sh
./sam npm --prefix apps/site ci
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run test:x-core
./preview.sh render npm run prepare:test:memos
./preview.sh render npm run test:e2e:memos
./preview.sh verify
./preview.sh package
```

Use the established contained fixture site configuration when required by the
current wrapper/full gate; inspect current preparation rather than guessing
flags or installing globally. Full verification covers the ordinary site and
publication regressions. Preserve failure artifacts in configured ignored
locations. Store temporary logs/screenshots under `/tmp` and durable findings
under this task's research directory with private values excluded.

Serialize all commands that materialize site content or build fixtures. Content
negative tests and Memo fixture preparation share `.generated-content` and the
site content store; overlapping them invalidates the resulting browser evidence.
After an interrupted/overlapping preparation, rebuild every full/empty/single
variant successfully before running the authoritative browser matrix.

Record desktop/mobile static/interactive projects separately. Supplement the
maintained 1440x900 and 375x812 runs with focused tablet/landscape and zoom checks,
actual corpus reading checks using existing selected inputs, and before/after
diagnostic screenshots. Screenshots are owner review evidence, not automatic
baseline approval. Physical devices/assistive technology remain residual review.

## Risk and Completion Checks

- Absent-header/rail geometry does not occlude seek targets or month anchors.
- The chosen browse policy handles clipped edge entries and long content;
  induced seek events do not immediately switch the chosen target.
- Dragging remains responsive and never fights induced/native scrolling.
- Date bubble fits both orientations and does not duplicate ARIA announcements.
- Detail reading/return work with JS disabled and runtime initialization failure.
- No private/source data or new external asset dependency enters output.
- Local owner preview reflects the actual final build, not the synthetic fixture.
- PRD/design, source, focused tests and owning spec agree before finish.

Rollback consists of reversing the scoped source/test/spec change; no content
or publication-history migration needs reversal.
