# M5.1 Route Catalog Reconciliation Evidence

All evidence below is intentionally redacted. It contains no route values,
credentials, mailbox values, external identities, private deployment paths, or
raw remote output.

## Local implementation

- `git diff --check`: pass.
- Comments type-check: pass through `./sam`.
- Comments test suite: 56/56 pass through `./sam`.
- Comments build: pass through `./sam`.
- The initial host attempt was blocked by the sandbox Docker socket; the same
  commands were rerun through the declared `./sam` boundary with escalation.
- The route validator and reconciler share one inventory implementation.
  Metadata scanning excludes comments, scripts, raw-text elements, and
  attribute-value pseudo-tags. Output paths cannot overwrite the input or
  enter the immutable release.

## Private candidate

- The exact current release inventory reported 93 article documents and 93
  valid static routes.
- The pre-apply runtime inventory reported 108 configured entries, with 22
  missing and 37 stale routes; invalid and duplicate counts were zero.
- The private candidate validated against the same release with zero missing,
  stale, invalid, or duplicate routes.
- A semantic comparison with `runtime.postRoutes` removed reported that every
  non-route TOML setting was unchanged.
- Candidate generation and validation used a networkless comments image with
  release/config read-only mounts and no secret, database, or outbox mounts.

## Apply and rollback

- The first controlled restart exposed a pre-existing runtime UID/GID mismatch
  with the owner-only secret mount. Automatic rollback restored the previous
  active config and release-bound validation returned to the original 93/108
  drift; the owner-only route rollback copy remains restorable.
- With owner approval, production Compose was repaired only at its comments
  runtime identity. A separate owner-only Compose rollback copy was retained;
  the existing secret/data owners and modes were preserved, and no secret
  content was read or rewritten by the repair.
- The second route-only transaction backed up the active config, atomically
  installed the validated candidate, and restarted only comments. The active
  config now equals the candidate byte-for-byte; the retained pre-transaction
  config backup still validates as the previous 93/108 state.
- The resulting container is healthy with the approved owner-aligned identity,
  the existing fixed image and host network, owner-only read-only config and
  secret mounts, one writable private data mount, and no published Docker
  ports. No static release, database/outbox contents, edge, DNS/TLS, or
  tracked site activation was changed.

## Deferred gate

Public comments remain disabled. The site Unicode href versus percent-encoded
comments-route compatibility risk remains deferred with enablement, as do
SMTP delivery and later credential/key rotation. Route reconciliation and the
approved runtime recovery are complete; no public enablement claim is made.

## Post-apply probes

- Release-bound validator: pass with 93 static and 93 configured routes; all
  missing, stale, invalid, and duplicate counts are zero.
- Private HTTP probes: health 200, unknown API 404, and disallowed Origin 403.
- Listener and container checks: loopback listener pass, healthy service,
  approved owner-aligned UID:GID, unchanged image/network/restart policy, and
  empty published-port mapping.
- Candidate and rollback metadata remained owner-only; the remote temporary
  workspace and local temporary workspace were removed after verification.
