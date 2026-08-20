# Production rollout record and runbook

## Goal

Promote the approved static release, verify the public deployment, and record
the evidence-backed production state in the project mainline. The deployment
must remain atomic and rollback-capable, while the deferred comments/identity
work remains untouched. Root-roadmap reconciliation is the separately ordered
P1 documentation task and is not part of this rollout task.

## Private execution record

The operational target, topology, release identifiers, checksums, and exact
rollback procedure are intentionally kept outside the repository at:

```text
/tmp/firefly-production-rollout-2026-08-20.md
```

This file is local-only and must not be committed, archived with the Trellis
task, or quoted in public documentation.

## Requirements

- R1: Use the established guarded publication-sync procedure to build, stage,
  validate, and atomically promote the approved release.
- R2: Preserve the prior immutable release as the rollback target; stop instead
  of switching traffic if any build, transfer, checksum, or promotion guard
  fails.
- R3: Perform credential-free public verification after promotion and record
  only non-sensitive evidence needed to establish that the new static release
  is served correctly.
- R4: Update the project mainline only after evidence supports the
  production-complete classification. Historical staging facts remain intact;
  root-roadmap reconciliation remains sequenced as P1.

## Out of scope

- Infrastructure/DNS/TLS configuration changes, credentials, secret handling,
  and topology changes.
- Application feature changes or dynamic-service work, including M5.1.

## Acceptance criteria

- [x] The guarded release procedure completed and retained a rollback target.
- [x] The public static site passed the documented route, error, and header
      checks.
- [x] The project mainline reflects the evidence-backed production state
      without exposing deployment identifiers or operational details; the
      root-roadmap reconciliation remains explicitly sequenced as P1.

## Result

The guarded publication promotion completed successfully. Local build and
integrity checks passed; the server-side immutable publication matched the
candidate; and public checks passed for representative site/content/experiment
routes, both 404 owners, required security headers, and immutable static-asset
cache behavior. The supported full non-browser test suite also passed. The
release procedure retains the prior immutable publication for rollback. Exact
operational values remain only in the local execution record.

The follow-up Terminal path correction was then rebuilt from the integrated
baseline, passed the focused and full browser gates, and was atomically
re-promoted. Public route/status, security-header, and hashed-asset cache probes
matched the candidate after that correction; the prior immutable publication
remains retained for rollback.
