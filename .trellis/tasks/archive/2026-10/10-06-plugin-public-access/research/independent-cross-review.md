# Independent cross-boundary review

## Scope and classification

The contract/site implementer independently read the assembler/history adapter,
Node static server, container Nginx gates, current ignored synchronization script,
and prepared owner-only host gate/installation candidate. No remote action or
changes to those other implementation owners were performed by this review.

No blocking finding was identified in the reviewed cross-boundary behavior.
This is source review plus focused regression evidence, not a replacement for
the main session's full quality gate or actual host acceptance.

## Reviewed invariants

- The assembler decodes the site's actual activation snapshot, binds it to the
  assembled inventory and publication record, and rejects contradictory comment
  evidence or HTML. Historical Memo metadata remains migration-only.
- Disabling comments preserves the maximum established validated deletion floor,
  resets only the disabled public evidence fields, and continues rejecting a
  lower re-enable export. Tests cover on/off/on and caught promotion rollback.
- New history records decode exact activation and marker inventory; old records
  remain readable for floor recovery. New active outputs cannot silently omit
  activation and still serve enabled plugin routes.
- Node and Nginx select the full registered namespaces before ordinary method,
  redirect, alias or proxy branches. Canonical content remains independently
  served. The Node preview remains a static reader, with no invented comments
  proxy; positive comments runtime behavior is exercised at the Nginx boundary.
- Nginx gates refer to the explicit blog release root, independent of the Memo
  alias. File caching is disabled for the gates, and closed responses are
  non-cacheable. The prepared host gate overrides its custom 404 handling with a
  named closed response so disabled routes do not fall through to blog content.
- The private sync checks current selected flags before building and compares
  them with the release afterward. It validates full local inventory, skips
  disabled Memo publication and requires the installed host gate. Enabled comments
  require matching managed origin, private readiness and a complete route catalog.
- Dry-run returns before upload, staging, promotion or reload. Temporary comments
  preflight TOML stays private and is cleaned. The old recursive ownership helper
  is absent; scoped static/blog ownership changes do not touch retained plugins.
- Uploaded snapshot checksums and exact marker bytes/count are checked before
  switching and against current afterward. Static pointer rollback includes the
  prior gate snapshot. A failed later blog step reports already accepted Memo
  publication as independent and never reverses its receipt pointer.
- The prepared host installer guards the original config hash, retains a private
  rollback copy, atomically replaces the single narrow config, tests native Nginx
  before reload and restores/reloads the baseline on a caught failure.

## Additional corrections and evidence

The main quality gate found the site's exact non-HTML/CSS/JS inventory omitted
the new activation files. The site owner fixed it by adding the shared snapshot
path and selected marker inventory, retaining exact equality and additionally
decoding the emitted snapshot against the selected configuration. The focused
static-output suite then passed all 18 tests.

A finite inventory test now requires every registered exact/prefix route to have
an explicit container Nginx marker gate and disabled file caching. This catches a
future declared plugin policy that was omitted at the edge; the existing manifest
ID test alone could not do so. The final shared suite passed 10 tests. Real HTTP
semantics remain the separate runtime fixture's responsibility.

## Acceptance limits

- Enabled comments production readiness remains unproven because the observed
  owner baseline has no prepared comments process. Positive and mixed HTTP states
  are synthetic, while current both-off production acceptance belongs to main.
- Cached client copies cannot be recalled; the switch governs subsequent public
  requests and newly rendered site content.
- Separate Memo acceptance and blog promotion do not form a cross-service
  crash-atomic transaction. Caught rollback and explicit partial-state reporting
  preserve that existing boundary.

The final private route-probe correction was independently read after a remote
Zsh-specific failure triggered the established rollback. Its variable and loop
names now use `request_path`, `request_method`, `http_status` and
`expected_status`, avoiding Zsh's special `path`/`status` parameters. Review of
the owner-only fixture and result logs confirmed 29 prior isolation flows plus
four Zsh activation combinations passed (33 total); the exact generated probe
ran through both sh and Zsh with byte-identical output, and the old variable
spelling reproduced missing curl and a read-only status error. No protocol or
tracked implementation change was introduced by this correction, and no blocking
finding was identified. Live retry acceptance remains the main session's scope.
