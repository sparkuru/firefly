# Memo execution review

## Review result

The local readiness review is **pass after an execution-environment
correction**. The first runtime packaging invocation exited 1 before
port/readiness/HTTP acceptance. The main session returned the task to planning
as required, then authorized bounded diagnosis and one corrected gate run.
The corrected complete package gate exited zero; no product source was changed.
The main session resumed `in_progress` under the original approval after the
environment correction. The task must remain incomplete and unarchived because
production baseline, recipient confirmation and acceptance remain unresolved.
No production acceptance criterion is satisfied by the local fixtures.

This review covers the task artifacts, curated check context, execution record,
local readiness report and private task-owned runner logs/snapshots. Production
baseline statements were reviewed for consistency and privacy; this reviewer
did not independently connect to a production endpoint.

## Findings fixed

- `research/execution-evidence.md`: AC6 used `pending`, outside the plan's
  explicit result vocabulary. Changed it to `deferred` and preserved the
  outstanding production privacy/cleanup requirement.
- The main session corrected the planning-time no-remote-probing statement in
  `research/production-boundary.md` after current read-only probes were recorded.
  No product source or protected Trellis runtime was changed by this reviewer.
- The private logging runner set process umask to 077 for packaging. Copying
  public `nginx.conf` under that umask produces a 0600 context file; its
  root-owned Docker copy is unreadable to the image's `nginx` user. Reproduction
  with the actual public runtime image exited 1 and reported configuration
  permission denial, with no published port. A separate local copy confirmed
  source mode 0664 and context mode 0600 without changing file contents.
  Corrected only the execution environment: precreate a 0600 log in a 0700
  runner directory, then run the package subprocess with umask 022.
- The corrected package exited zero and emitted the final publication, route,
  header, 404, nonroot and read-only success marker. A review harness cleanup
  filter initially had invalid Docker syntax after the gate passed; corrected
  that cleanup invocation and verified the exact container/tag removal. This
  cleanup-only retry did not rerun the package gate or alter its result.

## Findings not fixed

- The actual deployment baseline, rollback/history boundary and controlled
  recipient confirmation remain unresolved. Production enablement, real receipt, deployed
  deletion, backup/restore and static rollback remain unavailable or deferred.
- Initial owner-input hashes were not captured. The private hash comparison
  proves only preservation from the midrun snapshot through the final snapshot.
  This limitation is stated accurately in `research/local-readiness.md`.

## Independently inspected evidence

- One approved independent diagnostic used the already-cached Node Alpine
  image, an unprivileged/read-only no-mount HTTP container and an ephemeral
  loopback-only port. Immediate and delayed port mapping and delayed HTTP
  succeeded; the exact diagnostic container was removed. This does not
  reproduce the package failure. A plain-Nginx diagnostic did not run because
  its requested image tag was absent. The subsequent actual public image
  reproduction established the configuration-permission mechanism above;
  timing is not the established cause.
- Pinned `test:m51`: 375 Node passes, zero failures. The earlier Alpine run is
  retained as an infrastructure failure, followed by the documented corrected
  pinned-image invocation; it is not silently counted as a pass.
- Full `./preview.sh verify`: runner summaries total 393 Node passes with zero
  failures, and browser summaries total 3 Memo + 157 site + 8 NERV + 6
  publication passes. The 139 applicability skips remain distinct from passes.
  The runner includes the maintained synthetic runtime success and verified
  cleanup markers. Expensive passing checks were not rerun.
- Five Compose logs are empty; worker-recorded syntax invocations did not start
  services. The image-check runner has its success marker. These are local
  syntax/disposable-image evidence, not production deployment evidence.
- Initial package runner records the published-port failure; that invocation
  remains a failure. The separately retained corrected runner has the complete
  package success marker and no missing-port error. Its publication manifest
  is byte-identical before/after; the gate used the tracked content root and
  an isolated, verified-absent image tag.
- Private before/after snapshots preserve all 15 pre-existing container IDs and
  21 volume names. Runtime/image/package owned-after snapshots are empty.
  Publication-history snapshots match, as do midrun/final owner-input hashes.
  The private runner directory is 0700 and its files are 0600. Values, hashes,
  raw transcripts and absolute operational paths are not retained here.
- After the corrected package, all 15 original containers and 21 volumes still
  match the initial snapshots. The exact package container set is empty and
  the corrected disposable image tag is absent. Diagnostic build contexts were
  removed; owner-only logs remain temporarily for main-session review.

## Verification and completion boundary

- Lint/static checks: the wrapped `check:m51` result is pass; no product code
  changed and no additional standalone linter was run for these records.
- TypeCheck: pass in the inspected wrapped checks and full gate.
- Tests: local suites and maintained disposable lifecycle pass as above;
  initial runtime packaging is **fail**, corrected complete packaging is
  **pass**. The overall local readiness gate is now **pass**.
- Context manifests: validation passes with 11 implement and 12 check entries.
- Diff/records: tracked diff check passes; the current task is the only dirty
  directory. Final task-file whitespace/privacy checks cover untracked records
  and both JSONL manifests, not only the tracked Git diff.
- Production acceptance: AC1–AC5 unavailable; AC6 deferred. Exact remote values,
  mailbox identities, credentials and raw diagnostics are absent from the
  current task record set. Final private scratch cleanup belongs to the main
  session and does not complete production AC6.
- Human review classification: `human-required` for the unresolved private
  deployment and real-mail scenarios. Completion, commit/archive acceptance
  and production writes cannot be inferred from this local review.

The main session should preserve the process-umask/log-permission distinction
in the execution guidance: private log modes must not make public runtime
configuration unreadable to the image's nonroot user. No source fix or timing
workaround is needed for the demonstrated failure.
