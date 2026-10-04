# Implementation plan

## Ordered work

### Progress

- Current state, 2026-10-05: all four deliverables pass implementation and
  combined acceptance. The final publication/runtime child passed independent
  full-scope fixes, one complete `./verify.sh`, minimal web packaging and final
  service image check. All eight parent criteria are mapped in that child's
  `research/validation-findings.md`. Owner-approved work commit `08be5df` and
  final-child archive `4b4a01a` are complete; child archival is now 4/4. The owner
  also confirmed the separate parent archive and scoped journal. No subsequent
  task, production deployment or real mail is included.

The dated entries below preserve earlier decisions and baseline progress.

- Contract child completed and archived under
  `.trellis/tasks/archive/2026-10/10-01-memo-contract/`; implementation commit
  `c9885e6`, archive commit `1e7fb12`, session record `2983333`.
- Contract validation: 11 tests, strict declaration consumption and JavaScript
  syntax checks passed through `./sam`; no consumer integration is claimed.
- Service child completed and archived under
  `.trellis/tasks/archive/2026-10/10-01-memo-service/`; implementation commit
  `bcbca34`, archive commit `6c2dd55`. The owner approved implementation on
  2026-10-03 and confirmed commit/archival on 2026-10-04.
- Final service validation: 29/29 service tests, 12/12 memo contract tests,
  strict declarations, check/build, shell gates and Docker persistence/isolation
  passed, with independent full-scope review and no remaining service findings.
- Site child completed and archived on 2026-10-05 under
  `.trellis/tasks/archive/2026-10/10-01-memo-site/`; implementation commit
  `f5bc47c`, archive commit `a408ed6`. The owner approved the exact commit,
  site-only archival and separate journal recording on 2026-10-05.
- After the site archive, parent archival progress was 3/4. `10-01-memo-site` passed implementation and
  independent acceptance and is archived;
  publication/runtime was planning. Parent integration acceptance
  was not yet complete; no subsequent product task is activated automatically.
- On 2026-10-04, the site child planning was reconciled with the accepted
  contract/service: strict byte and real-path input validation, explicit HTTPS
  write origin, native service form fields, conditional route absence, public
  configuration projection, mobile native links and acceptance-mapped tests.
  Its PRD/design/implementation plan, research and both context manifests passed
  final owner review on 2026-10-04. The site child is now completed; the parent
  and publication/runtime child remain planning.
- Site child final evidence: focused 4, content 101, diagrams 15, static 18, site
  integration 8 and memo browser 3 passed; ordinary site browser 157 with 139 expected
  skips, NERV 8 and publication 6 passed. Two proven pre-existing theme fixture
  defects were corrected without product theme changes; the equivalent full
  repository gate completed in ordered stages. Detailed evidence and limits
  remain in the site child's `research/validation-findings.md`. The next
  publication/runtime child is not activated automatically.
- On 2026-10-05 the owner requested continued progress. Publication/runtime
  planning was reconciled with all three archived dependencies: strict copied
  DOM/export binding, retained disabled epoch, canonical artifact-only snapshot,
  shared build-input helper, opt-in proxy address trust and delivery scheduling.
  PRD/design/implementation plan and spec/research manifests passed planning
  consistency and context validation. The owner approved the final summary and
  explicitly requested implementation on 2026-10-05; the publication/runtime
  child is now in progress. Main dispatched separate publication and runtime
  implement agents; parent integration acceptance remains pending. No production
  deployment or real mail is included.

### Child activation order

- Start `10-01-memo-contract` first and review its exact-field contract before
  activating consumers.
- After the contract is accepted, `10-01-memo-service` and
  `10-01-memo-site` can be implemented independently against the shared
  contract and the HTTP routes in `design.md`.
- Start `10-01-memo-publication-runtime` only after the service and site
  slices have their focused checks passing; it owns the final cross-layer
  integration review.
- Keep this parent task in planning as the requirement and integration record;
  do not start it as a substitute for the child implementation targets.

1. **Load implementation guidance and lock the contracts**
   - Before product-code edits, load `trellis-before-dev` for the affected
     frontend, service, plugin, Compose/Nginx, and publication layers.
   - Re-read this task's PRD, design, and repository findings.
   - Define public request/response shapes, the exact public export envelope,
     route/config names, and disabled-plugin behavior in one pure contract
     module under `plugins/memos/`.
   - Keep internal lifecycle transitions in the memo service, and keep all
     memo-specific names and data independent of comments.

2. **Build the independent memo service**
   - Add `services/memos/` with its own package, SQLite schema/repository,
     configuration, HTTP server, Dockerfile, and persistent data root.
   - Implement public submission validation, abuse limits, email verification,
     pending moderation state, and sanitized approved-only export.
   - Implement private list/approve/reject/delete/export operations, protected
     by the service credential, plus a small CLI client for those operations.
   - Give the service liveness/readiness and owner backup/restore procedures
     consistent with the existing private-service operating model.

3. **Add the Firefly plugin adapter and visitor surface**
   - Add the `plugins/memos/` manifest, config projection, public contract, and
     operator documentation/config examples.
   - Add an `apps/site/src/plugins/memos/` adapter that loads only the
     repository-contained sanitized export and validates it at build time.
   - Add the static memo route, newest-first plain-text stream, and native
     submission form. Make success/error/verification responses readable
     without JavaScript.
   - Add the route to the ordinary and Terminal navigation while keeping memo
     entries out of post/page collections, search, and comments presentation.
   - When the plugin is disabled, omit the route and do not require runtime
     secrets, service availability, or an export file.

4. **Wire publication and runtime integration**
   - Add an independent `FIREFLY_MEMOS_EXPORT` build handoff and publication
     adapter for route presence, digest, privacy allowlist, and tombstone
     rollback protection.
   - Add same-origin `/v1/memos/` proxying to the private loopback service.
   - Add an opt-in root Compose profile and a plugin-local deployment template
     with persistent private data and no host-published service port.
   - Preserve the comments profile, comment export contract, and existing
     static-only default runtime.

5. **Document and integrate operations**
   - Document local setup, service configuration, secret/data ownership,
     private API/CLI usage, email setup, export/build workflow, backup/restore,
     and disabling/rolling back the plugin.
   - Update the repository's install, build, publication, and verification
     wiring where needed. Do not provision production hosts, DNS/TLS, or real
     credentials as part of this task.

## Validation checkpoints after implementation is authorized

- Confirm the disabled site build needs neither service credentials nor an
  export; confirm the enabled build rejects a missing or malformed export.
- Review that only the public allowlist appears in the JSON artifact and
  generated HTML, and that body text is rendered as text rather than markup.
- Walk the no-JavaScript visitor path: submit, verify mailbox, remain pending,
  owner approves through private API/CLI, export is refreshed, and the next
  static build displays the memo.
- Confirm private endpoints reject missing/invalid credentials, the service
  data survives container recreation, and its port is not host-published.
- Confirm old Typecho memo data is not read or copied and comments behavior is
  unchanged.
- Use the repository's established `./sam` and `./render.sh` workflows plus
  the existing verification gate when validation is authorized. Do not run
  production provisioning or credential operations.

## Main risk and rollback points

- **Publication contract:** a malformed or stale export could publish private
  fields or restore deleted entries. Keep exact-field validation and monotonic
  tombstone enforcement before artifacts are promoted.
- **Same-origin routing:** the memo proxy must not collide with comments or
  expose a host-published service port. Use a distinct loopback listener and
  route.
- **Private data:** submission email and verification/admin tokens must stay
  in service-only storage/configuration. Do not place secret inputs in static
  plugin config or build output.
- **Rollback:** disabling the plugin must restore the static-only build path;
  a failed export/build must leave the prior publication pair intact. Service
  data remains separately backed up and is not removed by site rollback.

## Final parent closure — 2026-10-05

All four children are archived. The owner confirmed the final work and
bookkeeping plan; work commit `08be5df` and final-child archive `4b4a01a`
complete the integrated implementation. All eight parent criteria pass against
[the combined acceptance record](../10-01-memo-publication-runtime/research/validation-findings.md).
Archive this parent separately, then record the journal using the work hash.
Operator deployment, real SMTP and a subsequent product task remain outside
this closure. The dated progress above preserves the implementation history.
