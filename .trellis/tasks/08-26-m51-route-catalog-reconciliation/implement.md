# M5.1 Route Catalog Reconciliation — Implementation Plan

## Planning gate

- [x] Review `prd.md`, `design.md`, and this checklist after the route
      reconciliation decision; do not start the task before the final planning
      summary receives explicit approval.
- [x] Preserve the three uncommitted quality-review hardening changes already
      present in the worktree; do not mix unrelated user edits.
- [x] Keep route values, deployment identities, private paths, mailbox values,
      credentials, and raw remote output out of Git and task records.

## Ordered execution

1. [x] Load the comments publication, frontend runtime, and quality specs through
   `trellis-before-dev`; confirm `./sam`, the locked Node image, and the remote
   safety boundary.
2. [x] Review and retain the pending route-preflight hardening. Refactor only as
   needed to reuse the same static inventory for a private candidate; keep the
   public CLI summary limited to status and counts.
3. [x] Add focused candidate-generation/reconciliation coverage. Test normal
   nested posts, shallow directory-index exclusion, `<head>`-only metadata,
   canonical Unicode routes, invalid/duplicate routes, symlink/special files,
   realpath escapes, symlinked config/output parents, and preservation of an
   existing config on failure.
4. [x] Run local checks through the project boundary:

   ```sh
   git diff --check
   ./sam npm --prefix services/comments run check
   ./sam npm --prefix services/comments run test
   ./sam npm --prefix services/comments run build
   ```

5. [x] Repeat a read-only remote baseline. Against the exact current release and
   active config, verify the effective runtime UID:GID against the existing
   owner-only mount metadata, then generate a temporary candidate, validate
   it, and compare parsed non-route settings without printing their values.
6. [x] If the approved identity gate is needed, back up and update only the
   production comments Compose runtime UID:GID, preserving existing secret and
   data content/modes. Then, with the owner-approved route policy, back up the
   active config, atomically install the validated candidate, and
   restart/reload only the comments service. Do not change the static release,
   data, outbox, secrets, edge, or site activation.
7. [x] Run the post-apply validator and private service probes. On any failure,
   restore the rollback copy and verify the prior service health. Remove only
   the exact temporary files/containers created by this task.
8. [x] Update redacted evidence and the durable comments publication contract,
   run the full applicable quality check, perform a final privacy scan, and
   prepare one work commit. Keep public enablement and key rotation as later
   owner decisions.

## Validation and rollback points

- Before candidate generation: active service healthy, current release
  recorded only as a redacted identity, and runtime UID:GID compatible with
  the owner-only secret/data mounts (or the approved identity repair is ready).
- Before apply: candidate passes route validation; original config remains
  present; no secret/data mount is attached to the candidate writer.
- After apply: zero route drift, service health, loopback, origin, unknown API,
  and generic error checks pass.
- Rollback: restore the exact config backup and restart/reload the comments
  service; if the identity repair was applied, retain its owner-only Compose
  backup for a separate operator rollback. Never overwrite
  database/data/outbox as a route rollback.
