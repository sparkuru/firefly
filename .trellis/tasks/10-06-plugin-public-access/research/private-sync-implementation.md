# Private synchronization implementation

## Owned changes

Only the ignored owner synchronization helper and its ignored operational note
were changed. No owner site flags, tracked runtime implementation, secrets,
remote configuration or live deployment were modified by this worker.

The helper now:

- Reads the selected effective configuration through the shared CLI, with the
  same blog content/config/override handoff as its build. Blog mode is required
  for current/compare; wrapper `none` intentionally omits config override
  handoff and is used only for artifact and independent runtime-file checks.
- Compares current flags with the built snapshot, validates marker closure and
  complete publication inventory, and rejects stale no-build input.
- Skips disabled Memo publication, including its executable requirement, and
  preserves the independently enabled Memo-first publication order.
- Requires the installed host gate version before any plugin publication.
  Optional comment indentation is accepted; the version itself remains exact.
- Requires enabled comments to match the managed origin locally and in the
  prepared nonsecret runtime configuration, pass private readiness, and match
  the new emitted article catalog through the existing validator. No secrets,
  container provisioning, service startup or catalog rewriting is involved.
- Verifies uploaded activation JSON and exact enabled markers by hash, shape,
  absence for false, and complete positive inventory before switching.
- Checks canonical HTTPS origin routes after promotion without bypassing TLS.
  Disabled namespaces are probed with GET/HEAD/POST/OPTIONS, including bare and
  descendant paths, Memo JSON/styles/media/privacy and comments control/admin.
  Enabled Memo retains HTML/JSON/CSS, bare redirects, forbidden write methods
  and private receipt exclusion; enabled comments uses a read-only auth probe.
- Applies ownership only to newly promoted static and Markdown outputs. The
  previous broad web-root ownership repair is removed.
- Records the expected static base before switching, restores blog mirror and
  pointer on caught post-promotion failure/interruption, and refuses recovery
  over an outside changed static pointer. Independently accepted Memo is never
  rolled back; partial publication remains visible.
- Retains owner-only raw logs and command exit codes. Cleanup explicitly uses
  original terminal descriptors, so signal-triggered rollback/partial warnings
  stay visible even when interrupted inside a redirected route-check function.

Dry-run performs no remote staging, upload, pointer change, publication or
reload. One-time host gate installation remains the main session's separate
backed-up/tested operator boundary.

## Checks actually run

- `bash -n tooling/push-majoim/sync.sh`: PASS.
- `shellcheck tooling/push-majoim/sync.sh`: PASS.
- `shfmt -d tooling/push-majoim/sync.sh`: PASS.
- Isolated shell fixture syntax, ShellCheck and formatting: PASS.
- Thirty-three isolated private synchronization cases: PASS, including the
  original twenty-nine under a POSIX remote-shell stub and four state
  combinations using Zsh as the remote shell.
- Exact emitted route-probe commands executed independently under both POSIX
  `sh` and Zsh for all four combinations: PASS with identical status output.
- Prepared comments config parser/module API check through `sam`: PASS.
  This used synthetic public settings and did not read private runtime config.

All behavior fixtures and raw traces are retained under an owner temporary
`firefly-private-sync-check.*` workspace. They copy the helper into a contained
fixture, replace SSH/rsync/sudo/curl/build/publisher boundaries with explicit
local stubs, and never execute real transports or submit a visitor payload.

The matrix covers four activation combinations; absent disabled/enabled
publisher; stale no-build; missing host gate; unavailable/not-ready upstream;
route-catalog, runtime-origin, release-inventory and unmanaged-local-origin
failures; enabled/disabled dry-run; raw build and Memo command failures; Memo
success followed by upload failure; corrupted policy/marker; mirror promotion
failure; post-check rollback; outside current change; TERM during build, Memo
and post-promotion; INT during build; and help without log creation.
The four added Zsh flows exercise the actual target login-shell semantics.

Fixtures assert actual exit codes, conditional calls, order, absence of remote
writes during dry-run, retained previous blog state where recovery is expected,
exact SSH-config/strict transport arguments, verified origin curl arguments,
0700/0600 log modes, temporary preflight cleanup, and visible partial-result
warnings. After adding signal coverage, assertions were tightened to fail
explicitly on forbidden trace matches rather than relying on standalone shell
negation and errexit.

## Remote-shell regression correction

Main-session live acceptance exposed a gap in the first fixtures: they used
Bash for remote execution, while the owner login shell is Zsh. The probe's
`path` assignment changed Zsh's command-search path, and `status` is a read-only
Zsh parameter. Origin probes therefore failed even though the gate and release
were valid. The helper correctly attempted blog recovery; main owns the live
recovery/data verification and retry evidence.

The narrow correction renames all probe variables and loop operands to
`request_path`, `request_method`, `http_status` and `expected_status`. The probe
already uses portable shell constructs, so changing global SSH execution or
introducing shell-string evaluation was unnecessary. This preserves the existing
transport API and owner command behavior.

The retained regression fixture reproduces the old variable collision under
Zsh, then executes the exact newly emitted command under both `sh` and Zsh for
every activation combination. Their complete expected-status output matches.
All original flow/signal/recovery checks were rerun after the correction. No
live SSH or deployment was performed by this worker during the fix.

## Limits and remaining operator acceptance

These orchestration fixtures mock remote HTTP responses and publisher/runtime
outcomes. They do not establish live HTTP behavior, actual service readiness,
independent receipt/history integrity, CDN headers or browser usability. The
maintained shared contract/runtime tests and main-session live both-off
acceptance own those checks.

The prepared comments config is validated before publication. Runtime
configuration changes or environment overrides after that preflight remain an
operator concern and must agree with the reviewed config. Expected-current
checks provide guarded recovery; no distributed or cross-service crash-atomic
transaction is claimed. A failed SSH recovery is reported and requires the
recorded previous release/mirror to be inspected before manual recovery.
