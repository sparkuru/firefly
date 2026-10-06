# Owner Markdown publisher planning review

## Scope and state

Reviewed current manifests, PRD/design/implementation plan, owner-publisher/UI
research, scoped article invariants and applicable publication/privacy policies
on 2026-10-06. This is planning review only. The task remains `planning`; prior
interactive approval is historical and does not start the amended task.
The converged planning review is **pass**, ready for the owner's final amended
approval. It is not implementation or production acceptance.
No builds, Docker, SSH, operational temporary inputs, ignored configuration,
product/spec changes, commits or task activation were performed in this review.

## Coherent design boundaries

- Independent Markdown files with explicit opaque IDs, canonical UTC creation
  times and draft metadata supply schema-2 Markdown public data. Rendering is
  build-time and sanitized; source identity and drafts never become visitor
  data. No form, public write API, SMTP or moderation dependency remains.
- Dedicated Memo output/state outside blog `artifacts/` and `dist/`, a separate
  deployed pointer and a self-contained `/memos/` static mount support both
  preservation directions. Routine Memo publication cannot publish unrelated
  article edits; a later blog release cannot revert independent Memo content.
- One Memo pointer selects matching public output and private receipt data.
  Expected-base checks under the Memo lock and monotonic sequence prevent lost
  concurrent updates and stale same-epoch candidates. Retired IDs and the
  retained deletion floor prevent withdrawn content from returning via an old
  source workspace. Rollback creates a new validated publication against
  current history rather than switching to an old lower-history release.
- Established missing/malformed history stops promotion; migration must retain
  legacy public deletion history or require recovery. The retained private
  service database is not an owner-Markdown authoring input or a history reset.
- Cutover stops only reidentified task-created HTTP/worker services and retains
  their keys, database and initial recovery artifacts. Comments and unknown
  owner data are explicitly outside cleanup. Old mail/logging acceptance no
  longer applies to this read-only product.
- Planned source/CLI, sanitizer, static desktop/mobile, cross-publication,
  concurrency, transfer/failure, rollback and privacy tests exercise actual
  boundaries. Local/isolated nonempty fixtures and an empty initial production
  stream are realistic without inventing owner content. Passing old fixtures
  do not certify the new publisher.

## Findings fixed in research context

- `research/production-boundary.md` and `research/private-runtime-evidence.md`
  now explicitly identify old interactive/mail gates as superseded history.
  Their recovery/retirement evidence remains preserved.
- `research/owner-publisher-research.md` now distinguishes exploratory choices
  from the current settled design: Option A, rendered Markdown and explicit
  publish with automatic push. No source evidence or prior decision was erased.

## Findings resolved before approval

1. Design/implementation now separate first Memo publication/static mount
   verification from the subsequent one-time blog navigation/sitemap release.
   Routine byte/inventory/mirror preservation uses the baseline after that
   intentional integration; subsequent Memo updates remain independent.
2. A thin host-owned entry uses SSH inputs. Node generation/render/validation
   uses the approved Docker wrappers, without SSH configuration or keys in
   public build containers.
3. An existing accepted ID cannot change `createdAt`; comparison against
   accepted public data/history and timestamp regression coverage are explicit.
4. `/memos/` namespace reservation remains active independently of the
   navigation flag; hiding a link cannot permit a shadowing authored alias.
5. Schema-2 body canonicalization preserves significant Markdown whitespace
   and authored Unicode code points, including code text, while normalizing
   line endings to LF. NFC applies to display metadata. Strict wire decoding
   rejects rather than repairs invalid/noncanonical input. Empty new drafts
   are supported; published non-draft bodies must be nonempty. Focused tests
   now explicitly cover those source/rendering distinctions.

These are bounded contract/sequence clarifications within the selected scope;
no generic deployment framework or further feature is proposed. No substantive
planning blocker or additional owner product decision remains. Main session
owns the final approval presentation and any later activation.

## Validation

Context validation passes with 18 implement and 19 check entries. Both contexts
explicitly include the current design, UI workflow/research, independent
publisher research, scoped article preservation, publication and privacy
contracts. Legacy contract entries are identified as migration/retirement
context, not current visitor requirements. No test/build pass is claimed for
unimplemented behavior. Final task-record privacy/whitespace checks and
`git diff --check` pass after convergence. All task files and both manifests
are included, rather than relying on a tracked diff that excludes this new
task directory. Exact owner values and raw operational data are not retained
in these planning records. The existing separate validation-profile edit was
preserved; no specification was changed by this reviewer.
