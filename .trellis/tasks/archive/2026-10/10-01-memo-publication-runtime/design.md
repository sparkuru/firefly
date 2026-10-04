# Memo publication and runtime integration design

## Boundaries and data flow

Accepted dependencies: contract `c9885e6`, service `bcbca34`, site `f5bc47c`.
This child integrates them; it does not change their public domain semantics.

```text
static native form -> same-origin memo proxy -> private HTTP service
  -> encrypted SQLite outbox -> bounded private delivery worker
  -> mailbox verification -> authenticated owner moderation/export
  -> contained public export -> site build + public evidence attributes
  -> assembler strict decode + candidate HTML comparison + retained epoch
  -> coordinated artifact/release promotion -> static web-only runtime image
```

No static code accesses the database or secrets; no browser fetches a runtime
list. The service remains its own image/package. The release remains static.

## Publication input and site evidence

Add `tooling/assemble-publication/src/plugins/memos.ts` as a manifest-aligned
adapter. Its assembler-owned TOML reader selects the same site config and uses
the pure memo activation/config parsers; it consumes only the public projection.
It must not import the eager Astro-dependent site-config singleton or site source.
Pin `smol-toml` 1.8.0 directly in the assembler package. Disabled memo activation
returns before export override/config/file/service access, yet still rejects a
stale memo-owned surface in candidate output. Reserve no arbitrary authored
route when disabled; identify the plugin surface by its explicit evidence.

Enabled loading uses the same repo-relative `.json` handoff semantics as the
site: explicit override, then `FIREFLY_MEMOS_EXPORT`, then public exportPath.
Extract the existing contained regular-file reader to
`tooling/shared/contained-file.mjs` with matching declarations and preserve the
site's existing helper path as a re-export facade. Reuse that utility and the
pure strict raw-byte decoder; do not recreate business validation
or copy comments' weaker parsed-JSON/symlink checks. Do not let root discovery
inside the site singleton decide a fixture repository root implicitly.

The memo route passes public envelope identity to MemoStream. Its root emits
explicit schema/revision/generated-time/digest/epoch evidence attributes;
each existing record article has an opaque public memo ID. No extra records,
tokens, runtime config or public JSON endpoint are emitted.

Pin `parse5` 7.3.0 in the assembler's own package/lockfile (already used by the
site lock). Use its HTML tree to require exactly one enabled memo stream and
compare the ordered ID, name text, time/datetime and body text to the decoded
envelope. For each record, accept only the existing text-oriented structure;
reject duplicate/extra/missing records, nested active markup, event attributes,
altered identity and unexpected private fields. Empty streams have the existing
empty state. Validate the native form's exact six names, action/origin,
consent version/unchecked-required state, and no private hidden input.
HTML entities are decoded for text comparison; escaped `<script>` or words
resembling email/field names are plain public text, not executable markup.

Do not treat a marker alone as evidence. Load the envelope once, copy the safe
site tree into an artifact candidate, then compare that copied tree and final
release against the same envelope. This rejects an export swapped after site
build and output altered between initial loading and staging. The assembler's
public API performs this validation too; caller-supplied metadata cannot skip
it. Existing comments behavior and global credential/source-path checks remain
intact. Private fixture sentinels provide cross-layer leak evidence without
blanket bans on all approved text containing an email-looking word.

The adapter must not import site/service/database/secret loaders. Preserve the
site helper interface and run its full containment tests after extraction.
This rejects stable symlinks and final-file races; it does not claim complete
defense against a hostile concurrent swap of intermediate parent directories.

## Manifest state and rollback

Extend publication schema 1 with the exact six-field `memos` metadata object:
enabled/schemaVersion/sourceRevision/generatedAt/digest/tombstoneEpoch.
Its epoch is the retained nonnegative safe-integer high-water mark: enabled
candidates must have export epoch >= prior metadata epoch; disabled metadata
has false/neutral revision/date/null digest but retains the prior epoch.
An enabled stale export is rejected, never repaired using a maximum.
No duplicate high-water field or memo runtime/export read is needed to disable.

Prior metadata is read with contained non-symlink regular-file checks, fatal
UTF-8 decoding, bounded input and exact validation of present memo-owned fields.
An absent memos object in a valid legacy schema-1 manifest means no memo history
(zero) only when the prior artifact/release has no plugin-owned memo surface.
Legacy memo-bearing HTML without history requires recovery/rebuild, never an
automatic zero floor; a marker-free authored alias remains compatible.
Partial/malformed fields, negative zero, wrong digest/date/revision
types or unsafe files fail closed. An absent publication manifest is allowed
for a fresh repository with no promoted release. Target directories containing
only the explicitly selected and already decoded initial public memo/comments
export inputs also qualify; this covers first combined builds and an override
staged in either target. No unrecognized files or prior site/experiment/root
HTML/publication trees may be present. Existing published trees with missing
history require operator recovery, not automatic zero.
Never catch all read failures as zero.

Run these checks before promotion. Keep `promoteTogether` as the existing
artifact/release transaction; inject failures to prove restoration of both
previous trees and deletion of only owned candidates. Assembly stays
single-writer. Epoch history cannot survive arbitrary deletion/replacement of
its durable publication state; docs must not present that as a rollback bypass.
Older binary versions that cannot preserve memo history are unsupported once
memo metadata has been promoted.

Default memo exports live below `artifacts/`, which promotion replaces. Read
and validate before staging, then serialize only the decoded public envelope to
the fixed `artifactsCandidate/memos/memos.public.v1.json` path. Retain this
canonical snapshot for subsequent builds; never recursively copy the input's
siblings or old artifact tree. It stays out of dist/browser/runtime inventories.
An override outside the two promotion targets remains unchanged. An override
inside artifacts/dist is a consumed build input: successful promotion replaces
it with the canonical artifact-only snapshot, while failure preserves it.
Do not claim byte/path preservation for an input under a replaced target.
Disabled promotion can drop this public
snapshot while retaining the epoch floor. Fresh owner export after moderation
is explicit; retaining a snapshot does not fetch live state. Tests assert both
the artifact snapshot and release privacy, plus prior input preservation on
failure. Private service data never lives below either promotion target.

## Runtime and proxy topology

Root Compose adds opt-in `memos` HTTP and delivery services. HTTP shares the
web namespace, binds loopback port 8788, and has no published port. The worker
uses the same private data/config/secrets and existing service image with a
worker command; it publishes no port. Plugin-local Compose uses same-host
loopback networking for an operator-owned edge. Comments retains port 8787.

Use a nonroot numeric owner UID:GID matching 0700 data/0600 secrets and
read-only regular config. Root Compose keeps a portable 1000:1000 default and
an explicit MEMOS_RUNTIME_USER override so an inactive profile cannot break
default config interpolation. The standalone operator template requires that
override explicitly. Operators must align mount ownership before startup;
missing/unreadable inputs fail, with no permission broadening.
Use distinct data/config path variables and mount options that refuse missing
inputs. Both services have read-only root filesystems,
bounded tmpfs, no-new-privileges and dropped capabilities. Do not mount these
inputs into `web`, the publication builder or minimal runtime context.

Add `MEMOS_TRUST_PROXY=none|loopback`, default none, as a service deployment
setting. Loopback mode requires loopback bind and socket peer, reads exactly
one valid literal X-Real-IP and canonicalizes IPv4/mapped IPv6/IPv6 identity.
Missing/duplicate/list/port/invalid headers fail before write/rates. Direct mode
ignores forwarding. Pass the validated policy explicitly into the HTTP factory;
keep test/helper/direct callers compatible with default none.

Nginx adds `location ^~ /v1/memos/` with 8788 upstream, overwrites X-Real-IP,
removes untrusted forwarding chains, retains original Host/Origin and uses
bounded timeouts. Owner routes continue authenticating at the service.
Responses are no-store; absent upstream remains a bounded failure with security
headers. Unknown `/v1/` remains bounded 404, unknown memo routes are service
404s, and health/private unrelated prefixes are never added as public proxies.
Disable memo request/access/error URI logging at the proxy boundary so
verification paths never put raw tokens in container logs. Service diagnostics
remain bounded codes; no body, recipient or Authorization logging is added.
Do not weaken the service's restrictive CSP/referrer policy with duplicate
looser headers. Include a host-scoped edge example with placeholders; automatic
trust in another edge or deployment TLS configuration is outside this task.

## Delivery scheduling and operation

Add an injectable bounded worker loop wrapping existing `service.deliver()`
and its SQLite leases. Use fixed small batch/cadence, one in-flight drain,
bounded status-only diagnostics, error recovery and graceful signal shutdown
before repository close. Forced container termination relies on existing lease
expiry/retry rather than a claim of exactly-once mail; align stop grace with
bounded drain time and document that recovery. Do not recreate delivery/state
transitions. The image entrypoint must support an explicit HTTP/worker command
while retaining default server behavior. Worker health reports process/tick
health without SMTP probing; override the inherited HTTP healthcheck so a
healthy HTTP sibling cannot conceal a dead worker. Runtime/readiness checks
do not send real mail.

Existing maintenance/backup/restore commands retain their contracts. Document
worker lifecycle, identity/config preparation, snapshot and separately retained
keys, restore to an absent private destination, export staging, enable/disable
and epoch-aware rollback. Production SMTP/edge/client-IP acceptance remains
operator-owned; synthetic local lifecycle tests prove only repository wiring.

## Verification and compatibility

Add maintained root memo contract/service install/check/test/build delegates
and focused runtime integration commands; extend M5.1 ordering without changing
tracked-content wrapper selection. Package checks precede site/assembly, and
browser validation serves prebuilt output. Extend `package-runtime.sh` to
validate memo metadata/history and exact inventories while retaining its minimal
web-only context and exact-label teardown. Update owning specs after review.

Use isolated synthetic fixtures for enabled/empty/disabled publication, bad
exports/HTML/history, staged failures, proxy identity, scheduled mail and the
whole moderation/removal lifecycle. Validate default/memo/comments/both profile
shapes, actual disposable containers and no-JavaScript desktop/mobile behavior.
A disposable fixture HTTPS edge satisfies the existing HTTPS writeOrigin and
same-origin native browser contract; do not replace the real POST with response
interception. A local SMTP TLS sink uses a fixture CA trusted only by the owned
runtime; do not disable service certificate validation or contact real mail.
Parent integration review maps all eight parent criteria to child and joint
evidence; planning artifacts alone never mark the parent complete.
