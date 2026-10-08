# Retained Corpus Verification

Read-only inspection on 2026-10-07 while finalizing planning. No source file,
SQL backup, asset, deployment or accepted history was changed.

The prior task's evidence records installation of 89 notes and 211 assets.
Current inspection found zero direct Markdown sources/assets in both the
default selected workspace's Memo directory and the literal source directory
selected by the ignored owner Memo adapter. The latter matches the sourceRoot
in the retained prior external-validation/install evidence. Do not infer a cause
or claim those files still exist there today.

The ignored prior migration staging set is intact:

- Exactly 89 Markdown sources and 211 assets, total 300 files.
- Exact file inventory equals the final conversion report's 300-entry manifest.
- Every file size and SHA-256 matches that final manifest.
- Every one of 89 source-file hashes and extracted body hashes matches the
  final per-record conversion report.
- Zero inventory/type/hash/body mismatches were found.

This provides a verified recovery source for the already approved 89-note
portion of the new 269-entry stream. Use that corrected retained set, not the
earlier pre-autolink-correction baseline or raw SQL alone. Snapshot the live
target again during implementation; if files reappear or differ, preserve
them and reconcile rather than blindly restoring over them.

The target and private report paths remain owner-local operational inputs.
Planning specifies roles, counts and verification, not external absolute paths
or public projection of private correspondence.
