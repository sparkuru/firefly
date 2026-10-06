# Unified Plugin Public Access Design

## Decision and ownership

`plugins.<id>.enabled` becomes a public activation switch for the two current
plugins, comments and Memo. False hides site discovery/embedded content and
blocks every plugin-owned public route. It does not delete data, revoke private
operator access or stop retained background processes. True permits public
behavior after the deployment verifies the matching runtime prerequisites.

Experiments and presentation adapters are not site plugins and keep their
existing contracts. The standalone owner Memo publisher keeps its independent
source/config/history interface; the combined private push applies activation.

## One build-bound activation projection

Introduce a small framework-independent plugin-access contract under `plugins/`:

- a finite registry of the current plugin IDs and owned exact/prefix routes;
- exact-field schema/version/real-boolean activation decoding and projection;
- deterministic serialization and positive enabled-marker inventory;
- checks keeping the registry aligned with the tracked plugin manifests.

This is a project-owned contract, not arbitrary runtime plugin loading. An
unregistered plugin or undeclared route is rejected instead of silently exposed.
Plugin-specific TOML parsing remains in each plugin; the site config validates
plugin namespaces through the shared registry.

An Astro build integration emits a public, path-free activation JSON and enabled
marker files from the same frozen selected `SITE_CONFIG` used to render the site.
The projection contains no origins, private paths, identity, credentials or
content. The exact output filenames are contract-owned and reserved against
content collisions. Markers for false must be absent in fresh output.

The assembler validates the projection and complete marker set, binds them to
the promoted inventory, and records unambiguous plugin activation separately
as `pluginAccess`, separate from comments publication evidence and legacy Memo
history. Strict old-manifest
decoding accepts this new field while retaining compatibility with prior
manifests for historical floor recovery. Serving/deploying a legacy artifact
without activation fails explicitly or closes plugin routes; it never infers
true from retained files.

## History remains separate

Disabled comments currently emits epoch zero, which can violate a previously
published positive floor. Preserve the maximum validated established comments
deletion floor when disabled, without loading private DB/export as a fake public
projection. Re-enabling still rejects a stale export below that floor. Do not
weaken rollback validation or fabricate a current digest.

Legacy Memo metadata remains its exact compatibility shape and retained floor.
Independent Memo source files, `current`, immutable receipts, established marker
and retired-ID rules remain unchanged by an access toggle.

## Runtime access enforcement

Both assembled-release serving and the container Nginx runtime consume the
release-bound state, not live owner TOML. Gate the exact bare path and full
namespace before redirect, method handling, artifact serving or proxying:

- Memo: `/memos`, `/memos/` and descendants, including JSON, CSS and media.
- Comments: `/v1/comments`, `/v1/comments/` and descendants, including submission,
  verification, token-control, OPTIONS and publicly routed authenticated paths.

False returns 404 even with a nonempty retained Memo artifact or a responding
comments upstream. Canonical article routes remain readable, with comment data
and forms omitted from the newly built HTML. Shared article CSS/assets remain
available. Private loopback health/admin/maintenance stay outside public routing.

Nginx uses a return-only regular-file test for each release-contained positive
marker, with an explicit blog root independent of any alias. The site release
and its access policy therefore advance through the same blog pointer. Prove
cache behavior across pointer changes; disabled responses must not create stale
public or negative-cache behavior. Ordinary unknown API routes remain 404.

Combined preview/package must validate JSON/marker consistency and selected
public-only Memo bytes separately. Retained candidates or running upstreams do
not override false. Enabled reading retains existing privacy/method constraints.

## Private synchronization and host migration

1. Validate effective configuration, build the blog and decode its activation
   projection. `--no-build` requires current activation to agree with the built
   snapshot and strict inventory; toggled flags require a normal rebuild.
2. Preflight transport and enabled-plugin runtime readiness before writes.
   Disabled Memo skips its publisher and retains all current history.
3. Enabled Memo follows the existing independent publication workflow before
   blog upload. Publish status and a later blog failure remain separately reported.
4. Stage and verify the ordinary blog and mirror. Promote the blog release with
   its validated activation markers, then verify canonical public routes.
5. Existing blog rollback restores the previous release and its markers
   together. Never roll back Memo by repointing its old receipt.

Install the narrow generic gate in the actual host vhost once: retain exact
configuration backup, prepare and syntax-test the candidate, atomically install,
reload the existing Nginx and verify relevant origin and edge responses. Keep
certificates, other aliases/apps and current plugin data untouched. Private
operational paths and upstream inputs belong to the ignored host adapter.

The current owner configuration has both plugins false. Deployment acceptance
applies that state and verifies 404s plus normal blog reading. Positive and mixed
states are first exercised in isolated fixtures with real static media and a
responding synthetic comments upstream. Actual comments re-enablement requires
its prepared runtime, which is absent at the observed baseline; do not silently
provision/start it or expose a broken proxy.

`--dry-run` can build local candidates and read state but cannot upload, promote,
install routes or reload. Invalid state or a failed prerequisite stops before
writes. Report partial outcomes; no cross-service crash-atomic claim is made.

## Validation and acceptance boundaries

- Four activation combinations and strict malformed/unknown/missing snapshot
  cases; alternate selected config and no-build mismatch.
- Retained nonempty Memo artifact + live synthetic comments upstream, all public
  paths/methods and redirects, state toggles under the same Nginx instance.
- Positive comments floor across on/off/on, stale re-enable rejection, identical
  Memo pointers/receipts and unchanged retained source/service data.
- Build/site/assembler checks, static/privacy/browser coverage, package/runtime
  confinement and inventory, private orchestration dry-run/failure/rollback.
- One-time host config validation and current both-off origin/edge acceptance;
  desktop/mobile blog reading remains usable. No real comment submission or mail
  is needed merely to prove disabled route behavior.

Specs owning activation, publication, Memo, comments, runtime packaging and
architecture are updated as part of this task. Final independent review covers
the full diff and evidence before the separate commit confirmation.
