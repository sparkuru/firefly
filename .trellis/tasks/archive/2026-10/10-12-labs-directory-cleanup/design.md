# Design

## Source Placement

Move the complete `experiments/` tree to `labs/` so ignored media and package-local
files accompany tracked source. Change the validator's default root literal;
retain `experimentsRoot`, API names, package names and manifest schema. Site and
assembler inherit the new default through existing discovery. Public routes
remain `/lab/nerv/` and `/lab/majo/`.

Synchronize root scripts, Docker builder paths, source-path fixtures, ignore
rules, the `sam` usage example, current project-authored specs and third-party
path records. Add `labs` to the retained publisher's protected source roots.
Avoid global text replacement: `artifacts/experiments` and semantic references
remain valid. Root README contains no source-directory commands needing edits.

## Retired Directory

The old Memo service has no maintained package or active consumer. Current Memo
rendering belongs to the site/presentation/document tooling; retained independent
recovery belongs to `plugins/memos` and `tooling/publish-memos`.

Move `services/memos` intact to a unique owner-only temporary recovery directory;
its tracked README becomes a repository deletion. This preserves local compiled
output and historical browser evidence while removing the repository directory.
The existing Memo retirement spec retains recovery guidance. Do not alter private
databases, keys, backups, publisher history or process/container state.

## Compatibility and Rollback

Source location changes together with actual callers. Public URLs, staging
artifact layout, command names and Experiment interfaces stay compatible.
Explicit local source-path commands must now use `labs`; no alias is added.

Fingerprint tracked source and ignored media before moving them; compare before
install/build commands regenerate outputs. Rollback reverses the directory move
and reviewed code/config edits, then restores the quarantined Memo directory.
Avoid broad Git cleanup/reset. Builds retain existing publication rollback rules.

## Verification Boundary

This is repository/build maintenance with no intended UI change. Verify discovery,
containment, assembly rollback, affected package gates, the complete publication
build and focused immutable-publication browser checks. Runtime packaging checks
existing Memo/lab/media routes. No subjective design acceptance is needed.
