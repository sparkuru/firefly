# Main-session full quality check

## Reviewed scope and execution

The native dedicated checker could not be started because collaboration returned
`agent thread limit reached`. The main session applied the `trellis-check` skill
to the full changed scope, loaded the frontend and Trellis Plus quality guidance,
and used complementary independent reviews of the other implementers' code.
`independent-cross-review.md` covers assembler/runtime/private synchronization;
`runtime-independent-review.md` covers shared contracts/site/private synchronization.
The complete comments contract was read from disk because context injection
truncates its size. Neither review substitutes for actual deployment acceptance.

Affected boundaries: shared plugins, site configuration/build/content
reservations/static output, assembler/history/Node serving, container Nginx,
preview/package/disposable runtime fixtures, ignored owner synchronization,
examples and project specs. No product design or authoring changes were made.

## Automated evidence

- Final `./preview.sh verify` exited zero under caller `umask 077` after the
  exact static inventory and public-file permission corrections. Package
  checks/types/tests/builds, browser suites, independent Memo deployment and
  plugin access fixtures all passed.
- Browser coverage: Memo 6, site 157, NERV 8 and assembled publication 6 passed;
  139 site project applicability cases were skipped. Static and interactive
  desktop/mobile projects are included; these are browser viewports, not claims
  about physical devices.
- Shared access suite: 11 passed, including exact public output modes and
  retained private/root modes under restrictive umask. Declaration checks passed.
- Assembler/Node suite: 18 passed, covering the four states, retained positive
  comments floor, stale re-enable refusal, old/new history, exact activation and
  caught-promotion rollback.
- Real disposable Nginx: four states, on/off/on under the same instance without
  reload, legacy absent markers, GET/HEAD/POST/OPTIONS/PUT/DELETE closure, public
  Memo byte hashes, independent receipt/source/release preservation all passed.
- Runtime packaging exited zero under restrictive umask with an isolated tag;
  exact publication/image inventories, routes/headers/404 ownership, non-root,
  read-only confinement and disposable teardown passed.
- Private synchronization: 33 isolated flows passed, including four full Zsh
  state flows and matching exact generated probes under sh and Zsh. No real transport was
  executed by those fixtures. See `private-sync-implementation.md` for its scope.
- Changed shell syntax, ShellCheck, shfmt and `git diff --check` passed. Curated
  implement/check context validation passed with 14 real entries each.
- The owner site configuration checksum remains identical to its baseline;
  both plugin flags remain false.

## Corrections kept in the contract

The old static output test omitted the new activation JSON. Its full exact
inventory now includes the shared snapshot and selected markers without
weakening equality. Public snapshot/marker and temporary runtime config modes
are explicitly readable independently of caller umask; private data modes are
unchanged. Nginx orders activation before return-only method rejection, rather
than using an access-phase block that can return the wrong disabled status.
The host gate has a named non-cacheable 404 handler to preserve headers through
its global error-page handling. Broad shared-web-root ownership changes are
removed from the private sync.

## Host installation and verified acceptance

The prepared single-vhost candidate passed native Nginx syntax testing. Its
certificate-verified direct-origin probe rejected the existing expired source
certificate. The installer automatically restored the original configuration
and reloaded; the resulting configuration checksum matched the baseline.
At that first failed attempt no blog or Memo publication was promoted. Public
CDN HTTPS remained available. Certificate changes were explicitly
outside the approved task; the owner decision on renewal versus public-edge
acceptance was pending at that point. The owner subsequently explicitly approved
renewal through the existing client. Renewal succeeded; the replacement keeps
the domain and key type and passed validity/hostname/key-pair/native-Nginx checks
and certificate-verified direct-origin HTTPS. The narrow host gate was then
installed and verified with current both-off origin probes. Exact host, paths, certificate and rollback inputs remain
in owner-only operational files, not this record.

## Completion boundary

The initial live sync caught a target-shell compatibility gap: its generated
probe used Zsh-special `path` and read-only `status`. The caught failure restored
the blog pointer and mirror while retaining the installed fail-closed gate and
independent Memo state. The private probe now uses shell-neutral names in both
assignments and loops; the original error was reproduced and the corrected
exact command passed under both sh and Zsh for all four states. Its final retry
reuses the already validated owner publication, not a fixture artifact.

The corrected private sync retry exited zero. Both-off activation JSON and
exact marker absence are bound to the new current release; canonical public
JSON bytes match the validated local owner publication exactly. Ordinary home,
post index, Lab and both Experiment routes pass public 200 checks. Both plugin
namespaces pass public GET/HEAD/POST/OPTIONS/PUT/DELETE 404 checks with no-store,
CSP and nosniff headers; query probes and canonical redirect destination pass.
The sync's direct-origin HTTPS GET/HEAD/POST/OPTIONS matrix also passes without
disabling certificate verification. Actual desktop/mobile browser contexts,
with and without JavaScript, follow a native post link, read its content and
verify absent comments/Memo discovery plus closed plugin routes.

Before/after exact inventories prove unchanged local Memo sources, all retained
remote plugin/Memo files, independent current pointer/receipt/established
history and plugin directory owners/modes. Owner site config hash remains
unchanged. Disabled Memo publication was skipped; the publisher log is empty.
Native Nginx syntax remains valid. Private screenshots/logs/backups stay outside
tracked source. The isolated package image tag and disposable containers were
removed, leaving the real owner publication as the final local output.

Local automated, independent source-review and actual current-state deployment
acceptance pass. `human-not-needed` for these covered mechanics: no residual
material runnable check or subjective visual decision remains. All six AC are
met within the explicitly reviewed fixture-versus-production boundary. Work
commit and subsequent archival/journal were explicitly confirmed by the owner.
Work commit `c04b09f` contains the reviewed changes. The completed task is
archived with that reference; separate bookkeeping follows without a Git push.
Enabled production comments is intentionally untested because no
prepared runtime exists; its positive/mixed acceptance is isolated synthetic
evidence, with future synchronization requiring matching readiness/config.
Memo and blog publication remain independent, not a cross-service transaction.
