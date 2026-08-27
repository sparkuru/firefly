# M5.1 Route Catalog Reconciliation — Technical Design

## Boundary and source of truth

The immutable static release is authoritative for public article routes. The
comments runtime consumes a non-secret `runtime.postRoutes` list, but it does
not get to define which documents exist. The site remains static and comments
remain disabled throughout this task.

The existing `validate-route-catalog.mjs` remains the redacted gate. Its
inventory rules are shared by validation and candidate generation so the
operator cannot reconcile against a weaker route interpretation. The pending
quality-review hardening is retained: release realpaths must stay contained,
article metadata is read only from `<head>`, and every existing config/output
parent component must be a real directory.

## Candidate flow

1. Inspect the exact release and active owner config in a temporary isolated
   workspace. Reject unsafe trees, invalid metadata/routes, duplicates, or
   malformed TOML before creating a candidate.
2. Materialize a private static route catalog/candidate config without printing
   route values. The candidate replaces only the `runtime.postRoutes` value and
   preserves the remaining runtime/public settings and file ownership policy.
3. Validate the candidate with the same release-bound validator. A mismatch,
   unsafe path, or write failure leaves the active config untouched.
4. On the authorized remote apply, first confirm that the effective comments
   runtime UID:GID can read the existing owner-only secret/data mounts. If a
   stale deployment identity blocks the required restart, apply only the
   owner-approved production identity alignment and retain a Compose rollback
   copy. Then create an exact rollback copy beside the active config,
   atomically replace the config with the validated candidate, and
   restart/reload only the comments service so it rereads the bind mount.
5. Run health, loopback, origin, generic-error, unknown-API, and route-catalog
   checks. Restore the rollback copy and restart/reload again if any required
   check fails.

The candidate generator must never read or rewrite the secret file, private
data, SQLite database, notification outbox, static release, or site activation
file. Temporary files are owner-only and removed after the evidence is
captured.

## Code organization

- `services/comments/scripts/validate-route-catalog.mjs` owns the CLI gate and
  privacy-safe summary.
- A small shared route-catalog helper or a narrowly scoped reconciler may own
  static inventory reuse and candidate `runtime.postRoutes` replacement; it
  must not silently overwrite the input config.
- `services/comments/tests/route-catalog.test.ts` covers the candidate path,
  metadata boundaries, route canonicalization, symlink/special-file rejection,
  and no-partial-write behavior.
- `.trellis/spec/frontend/comments-publication-contract.md` records the stable
  CLI/candidate contract after implementation review.

## Compatibility and rollback

The current production service reads its plugin config through a read-only
bind mount. The route transaction changes only the route list; the narrowly
approved runtime identity repair is a prerequisite for safely using the
existing service lifecycle when owner-only mounts otherwise reject a restart.
The prior config remains the rollback target until post-apply checks pass; the
existing static release, private data, and secret-content rollback boundaries
are independent and untouched.

If the active service cannot reload safely, stop before replacing the config
and record the gate as blocked. Do not fall back to an environment override or
an enabled site build, because either would hide config drift or broaden the
scope beyond this task.
