# Unified Plugin Public Access Switches

## Goal

Make each `site.toml` plugin `enabled` flag control public availability, so
disabling a plugin hides its site surface and makes its public routes return
404 after synchronization. Preserve owner data and publication history for
subsequent re-enablement.

## Background

- The owner observed that setting Memo to false and syncing still left the
  independent remote Memo route accessible.
- The owner approved false as public-route closure and the same semantics for
  every plugin. Prior conditional consent authorizes task creation when project
  changes are necessary.
- Current manifests identify `comments` and `memos`. Memo activation is
  navigation-only; retained legacy Memo history is not an activation flag.
- Private synchronization currently publishes Memo unconditionally and deploys
  the blog separately. Existing data and credentials must remain intact.

## Technical Evidence

- Site activation/default/override behavior is owned by
  `apps/site/src/lib/site-config.mjs:235`; the registered plugin inventory is
  documented in `research/plugin-switch-inventory.md`.
- Unconditional public routes are present in `nginx.conf:69` and
  `nginx.conf:93`; `research/plugin-switch-deployment.md` records the current
  private orchestration and runtime gaps.
- The old Memo history is separate (`tooling/assemble-publication/src/plugins/memos.ts:21`).
  Disabled comments currently resets the epoch
  (`tooling/assemble-publication/src/plugins/comments.ts:6`), while the assembler
  retains its rollback guard (`tooling/assemble-publication/src/index.ts:590`).
  R4 requires keeping valid history through access changes.
- `research/owner-routing-boundary.md` records sanitized read-only host findings.
  Both owner flags are currently false and must stay unchanged. The current
  comments runtime is absent, so synthetic positive-state coverage must be
  distinguished from actual both-off deployment acceptance.

## Requirements

- R1: One effective `plugins.<id>.enabled` flag controls each registered
  plugin's public site surface and routes. Current coverage is comments and Memo.
- R2: False serves 404 for plugin-owned public routes and public API surfaces,
  including direct access and relevant HTTP methods. Preserve source content,
  service data, releases and history.
- R3: True restores supported public behavior when runtime prerequisites are
  ready. Off/on cycles do not reset history or resurrect retired IDs.
- R4: Build, local static runtime, package output and private synchronization
  agree on effective activation. Legacy Memo metadata keeps its compatibility
  meaning and is distinct from the new public activation state.
- R5: Synchronization uses the same configuration as the build, skips disabled
  plugin publication, validates runtime config before switching, and accurately
  reports success, failure and partial state.
- R6: Route ownership and switch handling are explicit and extensible;
  unsupported activation cannot silently expose ungoverned public routes.

## Acceptance Criteria

- [x] AC1: Each current plugin passes true/false UI and direct-route checks;
  false returns 404 rather than an accessible old page or working API.
- [x] AC2: Both-off, both-on and mixed states preserve plugin independence and
  ordinary blog routes.
- [x] AC3: Off/on cycles retain content, receipts and history and restore normal
  behavior without data or identity loss.
- [x] AC4: Dry-run never uploads, reloads or publishes. Failures and unsupported
  configuration do not claim successful activation or hide partial state.
- [x] AC5: Local static/package and owner deployment integration cover the same
  contract, including an already-present previous plugin publication.
- [x] AC6: Specs/examples document public activation and independent review
  passes before the scoped commit plan is presented.

## Out of Scope

- Deleting retained content/history, stopping unrelated services, or changing
  domain, authentication or authoring rules. Certificate changes are excluded
  except the subsequently explicit owner-approved existing certificate renewal.
- Replacing the independent Memo publisher, restoring visitor Memo submission,
  gratuitously renaming legacy fields, or adding new plugins.
- Implementation and live mutations before final planning approval.

## Key Decisions and Boundaries

- Publish exact effective activation plus validated positive marker files in
  the immutable blog release. The existing blog pointer selects the route state,
  avoiding a separate independently mutable policy pointer.
- False includes all publicly routed comments token/admin branches and Memo
  public assets. Private owner loopback/health/maintenance remains available;
  stopping or provisioning service processes is not required by this task.
- Existing canonical host/HTTPS redirects remain; the destination's disabled
  canonical plugin paths return 404 with non-cacheable responses.
- Missing legacy activation closes plugin access or requires rebuilding; it
  never guesses enabled from an old publication or running service.
- `--no-build` must verify current effective flags against the built snapshot.
  Disabled Memo skips publication; enabled plugins require prepared runtimes.
- First host migration uses backed-up, tested narrow Nginx edits; subsequent
  sync changes state through the ordinary blog release switch.
- After direct-origin validation discovered an expired existing certificate,
  the owner explicitly authorized renewal using the existing certificate client
  before deployment. Preserve the domain/key type and private rollback state;
  no new certificate automation, issuer or account provisioning is implied.

## Artifact Status

Requirements and final planning review are complete. The user approved
implementation and deployment of the current both-off state. The task is
in progress; the owner flags remain inputs and must not be changed.
