# Focused Memo Migration Review

The dispatched reviewer checked only `tooling/memo-documents/documents.mjs`,
`cli.mjs` and `documents.test.mjs` on 2026-10-07. The approved PRD/design/plan,
native check context, full content-workspace contract, retained-history and
project validation/privacy rules were loaded. Other agents own reader/release
implementation. No real candidate, original, external workspace, history,
publication pointer or deployment was modified by this review.

## Findings and Self-Fixes

- Candidate validation previously trusted advertised counts while accepting a
  self-consistent enlarged workspace inventory. It now requires exactly 269
  direct Memo documents and 211 contained assets, the 89/180 origin split,
  matching imported metadata/title and unique identities. Extra collections or
  publication-changing metadata fail before installation.
- Reverse reconstruction alone could accept an arbitrary prose edit declared
  as a patch. Validation now independently reparses the reconstructed original
  and checks both the forward body and exact URL patch list. Only the supported
  parsed link/media destinations may change; code and other spans stay exact.
- The offline reader now enforces the existing 256 KiB source and 128 KiB body
  limits, and rejects invalid optional titles. Significant whitespace, CRLF
  and U+200B remain preserved; no new normalization was introduced.
- Owned asset URL handling now decodes contained filename segments, checks the
  owned inventory, emits encoded canonical URLs and preserves query/fragment
  suffixes. Unicode/space filenames work. Encoded traversal/separators,
  malformed escapes and double-encoded unsafe names fail.
- Dry-run now notices a dangling Memo-root symlink instead of reporting it as
  an absent safe directory. Symlink ancestors remain rejected by shared safe
  directory/contained-file helpers.
- Apply uses an exclusive owner-only workspace lock, rechecks both trees under
  that lock and verifies each candidate file's expected bytes/hash before its
  exclusive hard-link commit. Candidate changes cannot commit unexpected
  bytes. Racing user files are preserved; failed operations retain the exact
  private partial-install journal and remove only their temporary file/lock.
  Abrupt process termination can leave the owned lock; inspect its operation
  and partial journal before deliberately clearing that exact stale lock.

## Verification

`SAM_CONTENT_MODE=none ./sam node --test
tooling/memo-documents/documents.test.mjs` passed all 14 tests. Seven new cases
cover the concrete validation/race/URL/symlink findings. The first review run
passed 13/14; the race fixture incorrectly assumed assets precede timestamp
documents. It now selects the first two records from the actual manifest and
asserts the committed bytes, blocked next write and exact partial journal.

Wrapper `node --check` passed individually for all three owned JavaScript
files. This folder has no configured lint/type-check project; syntax and
behavioral checks are the applicable local gates. Whole-site/package type
checks and browser/publication acceptance remain with their implementation
owners and the main session. Docker socket access needed the authorized narrow
wrapper escalation; all focused commands ultimately exited zero.

## Existing Candidate Compatibility

The migration report remains schema version 1; no report rewrite or source
installation occurred. These checks do not by themselves require regenerating
the existing candidate. The main session must repeat validation of its actual
candidate before installing: canonical URL replay is now stricter, and any
new failure must be reconciled privately rather than bypassed. The prior
independent corpus audit remains separate source-correspondence evidence.

Stable installation/validation rules should enter the superseding Memo
document spec during the main session's final spec synchronization; the legacy
independent-publisher contracts are intentionally not edited by this bounded
reviewer.
