# Production rollout record and runbook — Design

The task uses the established release mechanism as a black-box guarded
promotion: build a static publication, stage it remotely, validate integrity,
atomically select the new immutable release, then verify the public result.
The prior release remains available for rollback.

Deployment identifiers, topology, release values, and exact operator commands
are held only in the local-only execution record named by `prd.md`. Repository
documentation records only non-sensitive outcome evidence. The task does not
change application code, infrastructure configuration, or the deferred M5.1
scope.
