# Public Comments Enablement — Redacted Gate Evidence

All evidence in this file is limited to repository-relative paths, generic
roles, bounded counts, and pass/deferred labels. It contains no credentials,
mailbox values, tokens, exact deployment identities, private absolute paths,
raw remote output, release identifiers, or private comment fields.

## Local enablement gates

- Planning approval: pass. The user explicitly approved execution after the
  PRD/design/checklist review.
- Tracked safety default: pass. `config/site.toml.example` remains in the
  canonical `[plugins.comments]` namespace with `enabled = false`; no tracked
  default was changed.
- Contained local enablement input: pass. The ignored fixture uses the
  canonical plugin namespace, a repository-relative plugin config path, a
  synthetic write origin, and a sanitized `comments.public.v1` export. No
  production data, secret, mailbox, or outbox state was used.
- Route catalog: pass for the exact selected release candidate. The
  release-bound reconciliation/validation reported 93 emitted article routes
  and 93 configured routes, with zero missing, stale, invalid, duplicate,
  directory-index, or non-canonical Unicode route findings.
- Enabled site build: pass. The contained sanitized fixture produced 17/17
  static-output checks with comments limited to canonical posts; pages,
  indexes, experiments, and 404 output remained comment-free.
- Generic enabled static-output expectation: corrected and passing. The test
  derives the expected rendered-comment count from the current sanitized
  export and the expected form action from the current enabled configuration,
  instead of assuming hardcoded fixture values. Fixture-specific Unicode
  assertions remain independently covered.
- Root M5.1 build/assembly: pass with the enabled fixture. Site, NERV,
  publication assembly, digest validation, and tombstone epoch validation
  completed successfully.
- Assembler tests: pass, 9/9. This includes the regression that preserves a
  public `/posts/app/.../` route while still rejecting real private paths,
  private fields, secrets, and unsafe markup.
- Site browser regression with enabled comments: pass, 130/130 across static
  and interactive desktop/mobile projects. The pending-startup test uses a
  larger controlled interception window to avoid parallel-worker timing
  flakiness; production startup behavior was not changed.
- Unicode comments fixture: pass. Enabled static assertions passed 2/2 and
  locked desktop/mobile browser assertions passed 2/2, including readable
  Unicode hrefs and canonical UTF-8 encoded form payloads.
- Assembled-publication browser smoke: pass, 4/4 across desktop/mobile,
  including cross-application navigation, mounted 404 ownership, and the NERV
  return path.
- M5.1 type/check gate: pass through `./sam` with zero Astro diagnostics.
- M5.1 unit/contract gate: pass through `./sam`; validator, X Core,
  presentations, assembler, site content/X Core integration, comments
  contract, and comments service suites all passed.
- Default safety projection: pass. A final contained disabled site build
  completed with 17/17 static-output checks and no comments export supplied.

The build emitted two existing CSS optimizer notices for the `::highlight`
feature; there were no Astro errors, warnings, or hints, and the notices are
unrelated to comments enablement.

## Final quality review

- `task.py validate` and `git diff --check`: pass.
- Tracked-fixture `check:m51`, `test:m51`, and `build:m51`: pass through
  `./sam`; TypeScript and Astro reported zero diagnostics.
- The locked-browser `verify:m51` rerun completed the repeated check, test,
  build, and site browser stages; the site suite passed 130/130. Its standard
  NERV web server then hit the host's inotify watcher limit and timed out
  before assertions, so that exact invocation is unavailable rather than a
  pass. An isolated rerun reproduced the same environment error; the same
  locked image and `./sam` boundary with file polling passed the NERV suite
  8/8. The assembled-publication browser suite then passed 4/4 independently.
- The sanitized enabled Unicode fixture passed its workspace build, static
  assertions 2/2, and locked desktop/mobile browser assertions 2/2. The final
  default disabled build was restored and passed all 17 static-output checks.
- The final task/context/spec diff privacy scan found no credential, mailbox,
  token, exact deployment identity, private path, or raw remote output.

## Private and production-owned gates

- Prior redacted M5.1 evidence carries forward passing private-runtime,
  loopback/no-public-port, edge-boundary, non-sending SMTP, isolated synthetic
  delivery, backup/restore, and rollback-boundary probes. Those historical
  probes do not replace this task's current gate evidence. This task did not
  drain or replay the production outbox or change DNS/TLS or edge
  configuration; its bounded runtime/data reset is recorded below.
- Current remote preflight before image work: partial-pass. The owner-local
  sync target was found in the ignored operational input; SSH, release-layout,
  sudo, container-health, loopback-only, no-public-port, and the 93-route
  runtime catalog probes passed. The long-lived image lacked the required
  private `/readyz` and `/metrics` routes.
- Isolated current-image preflight: pass. A fresh container with temporary
  data returned private health, readiness, metrics, unknown-API, secret-mount,
  and 93-route checks successfully. The active data root and outbox were not
  used by this probe.
- Compose/image preparation: partial-pass. The current Compose template was
  installed in the runtime directory after hash verification, with its prior
  template retained as a rollback copy. The current image was loaded and the
  prior image was retained under a rollback tag.
- Data-bound comments image rollout: recovered through an explicit owner-
  approved empty-store reset. The earlier cutover failed its health window and
  its automatic rollback was stopped; the old database was then retained in an
  owner-only recovery copy, and the stale stopped containers were removed only
  after exact service-directory and runtime-identity checks. A new empty store
  was initialized with 0 comments, 2 migrations, and tombstone epoch 0. The
  service was running and healthy; no static release had been promoted and no
  public activation had been performed at that reset stage.
- Recovery outcome: pass for the bounded runtime reset. Health, readiness,
  metrics, unknown-API rejection, 93-route catalog, loopback binding,
  no-public-port, read-only config/secret mounts, explicit numeric identity,
  and outbox hash preservation all passed. The prior database remains retained
  for owner-led recovery; it was not treated as a verified backup or imported
  into the new store.
- Historical read-only recovery probe: the prior core database was recognized
  as SQLite but rejected read-only constant/schema/integrity queries, and no
  second database or verified backup manifest was found. The cause and
  recoverability are not inferred from that probe; the retained copy remains
  available for owner-led recovery.
- Owner-authorized production export: pass for the empty store. The admin
  token was configured through the owner-only runtime secret boundary, the
  exact service container was restarted once, and unauthenticated/admin-
  authenticated export probes returned the expected bounded statuses. The
  resulting `comments.public.v1` artifact was transferred without logging its
  content into the ignored owner-only staging path with mode `0600`; schema 1,
  digest, 0 comments, and tombstone epoch 0 validated locally. The remote
  temporary export was removed after transfer.
- SMTP delivery and isolated verification gate: pass with distinct evidence
  boundaries. The non-sending TLS/AUTH probe passed using the runtime-injected
  credential. One owner-authorized synthetic sending attempt used a temporary
  database, notification outbox, delivery state, and container; it never
  mounted or drained the production outbox. The first wrapper incorrectly
  compared all service stdout, including privacy-safe request records, against
  a single expected result line and therefore discarded the inner result
  during mandatory cleanup. The attempt was not repeated, and no direct SMTP-
  acceptance result was retained. The owner later observed the single
  synthetic verification message in the approved mailbox, so mailbox receipt
  and delivery confirmation passed. A corrected non-sending diagnostic
  separately passed TLS/AUTH, isolated submission (202), one isolated
  verification notification, and isolated verification (200) while explicitly
  skipping SMTP DATA. Production database/outbox hashes were unchanged, the
  service remained healthy, and all temporary resources were removed. None of
  these checks traversed the public origin.
- Owner-authorized read-only edge gate: pass. HTTPS/TLS validated; the comments
  namespace proxy passed; and host scope remained isolated. Valid-Origin
  `OPTIONS` returned 204, invalid Origin returned 403, and the unknown comments
  path, `/v1` root, and unknown `/v1` path returned 404. Public `/readyz` and
  `/metrics` returned 404. The direct public port was refused, the listener was
  loopback-only, and no port was published. The production database/outbox
  remained unchanged, the service remained healthy, and temporary cleanup
  passed. This was a read-only gate: no public-origin submission or
  verification, static promotion, owner activation, or public comments rollout
  occurred.
- Production activation and publication: pass. The production owner-local
  input uses the canonical enabled activation while tracked defaults remain
  disabled. The exact release/config pair validated at 93/93 routes. The
  enabled build and publication were valid with 0 comments and tombstone epoch
  0, and the immutable static release plus blog mirror were promoted.
- Promotion recovery verification: pass after a bounded connection incident.
  The first promotion command's final blog inventory check hung when its SSH
  connection stopped responding, so the command's built-in rollback could not
  be proven during the disconnect. Independent recovery probes showed the new
  current release and blog mirror complete; independent hash, count, checksum,
  and manifest comparisons matched exactly. No manual rollback was needed.
  The previous release and blog backup remain retained.
- Post-promotion public surface: pass. Representative public routes and forms,
  security headers, cache behavior, and distinct static/application 404s all
  returned the expected bounded outcomes.
- Controlled public submission/verification smoke: pass. The synthetic public
  submission returned 202 and increased the outbox count from 2 to 3. The
  delivery run reported 1 delivered, 2 skipped, and 0 failed. Public
  verification returned 200. The test comment was deleted, the queue was
  cleaned, and the final export validated with 0 comments at tombstone epoch
  0. The comments runtime remained healthy and temporary cleanup passed.

## Execution correction

The first full enabled publication candidate found a scanner false positive:
the public route category `app` contains the same token as a private `/app/`
source path. The scanner now applies path-token boundaries, and a focused
assembler regression protects this case without weakening the private-field,
email, secret, or unsafe-markup checks.

The generic enabled static-output test also assumed one fixture-specific
rendered comment and one hardcoded submission action. It now derives both the
expected rendered count and action from the current sanitized export and
enabled site configuration. This keeps generic enabled production candidates
valid when the export is empty while preserving the separate fixture-specific
rendering and Unicode assertions.

## Handoff

Production activation and controlled public-origin smoke are complete. The
canonical owner-local activation is enabled while tracked defaults remain
disabled; the exact 93/93 route pair, empty epoch-0 publication, immutable
static release, and blog mirror passed independent final verification. The
promotion connection incident required independent recovery probes but no
manual rollback; the previous release and blog backup remain retained. The
public submission, delivery, verification, test-record deletion, queue
cleanup, empty export, runtime-health, and temporary-cleanup gates passed with
the bounded counts recorded above. Credential/key rotation remains a
post-development owner follow-up.
