# M6 staging rollout

## Goal

Plan a safe, reversible local staging rehearsal of the completed f1refly static
publication. It must let the owner verify the assembled site through a
production-shaped Docker/TLS boundary before any M7 production switch, while
preserving the immutable/static architecture.

## Confirmed Facts

- M5 is complete and archived. The root publication is assembled atomically from
  the main site and declared Experiment artifacts; incomplete candidates restore
  the prior `artifacts/` and `dist/` targets.
- `package-runtime.sh` builds a minimal Nginx runtime context from only the
  validated root release, then verifies exact manifest/release/image inventory,
  non-root/read-only execution, routes, distinct 404 ownership, headers, caches,
  and teardown.
- `dev.sh` is a local loopback-only immutable-publication preview. It is not a
  staging deployment mechanism.
- The repository contains no staging hostname, remote access details, TLS
  material, deployment credentials, or mutable remote configuration. These
  values remain outside Git. The owner has rejected making M6 depend on a
  specific remote host or `majo.im` domain.
- M5.1 comments are deferred; no comment API, database, SSR, or direct database
  reads belong to staging. Local image-like strings in authored Markdown are
  ordinary public body text and are not a staging concern.
- Owner authorization currently covers planning only. No host mutation, DNS/TLS
  change, deployment, or production traffic switch is authorized.
- Local Docker preflight on 2026-08-14 confirms the existing runtime model:
  Docker Engine 26.1.5 built the complete M5 publication and minimal
  `f1refly:m5-runtime` Nginx image. The exact 23-file inventory, routes,
  distinct 404s, security/cache headers, non-root/read-only execution, and
  teardown probes passed; no project-labeled container remained afterward.
  This is local evidence only and does not select, configure, or mutate a remote
  staging target.
- Owner supplied `ssh wkyuu@ssh.majo.im` as the staging-host control path and
  confirmed `*.majo.im` wildcard DNS behavior. A strict-host-key, key-auth SSH
  probe succeeded on 2026-08-15. The remote login is non-root `wkyuu` (uid 1000),
  Docker 26.1.5 is installed, systemd reports running, no host Nginx executable
  was found, and `staging.majo.im` resolves from the host. A later read-only
  baseline connection was closed by the remote host before it could report OS,
  disk, Docker daemon, or port occupancy. No remote state was changed and those
  facts remain pending a stable authorized connection.
- Superseded decision: a remote `staging.majo.im` origin and its associated
  host/DNS/TLS plan are not part of M6. The prior read-only SSH evidence is
  retained only as discarded-option evidence; it authorizes no future remote
  action.
- Owner decision: retain M6 as a production-preflight stage. It must exercise
  the complete release and rollback path in a restricted real environment before
  M7; production is not the first place where a deployment is tried.
- Proposed local alternative: a loopback-only Docker rehearsal runs the immutable
  release behind a local TLS reverse proxy, without DNS, remote SSH, or public
  exposure.
- Owner decision: use a locally trusted development CA for the M6 TLS boundary.
  The trust anchor is installed only on the owner workstation; its generated
  certificate and private key are local-only, excluded from Git and images, and
  removable after the rehearsal.
- Local tool evidence on 2026-08-15: Docker, OpenSSL, and curl are available;
  `mkcert` is absent. No package installation or local trust-store mutation has
  been performed. Any implementation must obtain fresh explicit approval before
  installing `mkcert` or changing the workstation trust store.
- Reversibility requirement: use a dedicated temporary `CAROOT` and a separate
  temporary leaf-certificate directory outside the repository. Cleanup must run
  `mkcert -uninstall` with that same `CAROOT` before deleting either directory,
  stop the local proxy/container, remove the local tool if it was only staged
  temporarily, and verify the system/browser trust store no longer accepts the
  generated leaf certificate. Deleting CA files first is forbidden because it
  can leave a trusted root without an available `mkcert` cleanup path.

## Requirements

- R1: Define a loopback-only local staging topology with TLS and an explicit
  trust boundary. Local certificates, trust anchors, passwords, and generated
  materials must stay outside Git and be removable.
- R1a: Use a locally trusted development CA rather than a browser-warning
  self-signed certificate. Loopback binding is the access boundary; a separate
  reviewer authentication layer is not required for the local-only rehearsal.
- R1b: Record the local CA tool/trust-install prerequisite and require explicit
  authorization at implementation time; do not silently install system packages
  or trust anchors.
- R1b.1: Prefer a verified temporary `mkcert` executable outside the repository
  over a persistent system-package installation. If the workstation lacks a
  trust-store helper required for the selected browser, stop and request a new
  decision rather than installing additional host packages by default.
- R1c: Require an explicit no-residue cleanup proof: uninstall the dedicated
  root from every selected trust store before deleting CA material, stop/remove
  all rehearsal containers, delete temporary leaf/CA/tool directories, and
  prove that default certificate verification rejects the old leaf afterward.
- R2: Define an immutable deployment path from a locally verified publication
  artifact to a local staging runtime, with artifact identity, release inventory,
  rollback, and cleanup rules.
- R3: Define staging verification: HTTP/security/cache probes, desktop/mobile
  browser evidence, no-JavaScript behavior, experiment isolation, observability,
  and owner review.
- R3a: Treat staging as a release rehearsal, including a deliberately verified
  rollback, rather than merely a preview of application functionality.
- R3b: Reuse the checked local Docker runtime preflight as a prerequisite, then
  validate local TLS, reverse-proxy boundaries, authentication, and rollback.
- R4: Define failure, incident, retention, and rollback behavior without
  mutating or depending on the legacy Typecho installation.
- R5: Define the M6-to-M7 promotion gate. Staging success must not itself
  authorize production DNS, traffic, or deployment changes.
- R6: Produce planning artifacts and research sufficient for a later,
  separately authorized staging implementation. Do not implement any rollout in
  this task.

## Initial Scope Boundaries

In scope: loopback Docker/TLS topology, artifact/release provenance, local
certificate/trust and secret-handling design, monitoring and verification plan,
rollback design, acceptance criteria, and implementation plan.

Out of scope: remote mutation, remote credentials, DNS changes, public
certificate issuance, production deployment/traffic, comment services, SSR,
direct database access, legacy Typecho mutation, and application feature work.

## Resolved Decisions

- M6 is retained as the mandatory production-preflight and rollback rehearsal;
  successful package validation alone does not replace it.
- Remote `majo.im` binding, a staging VM, SSH deployment, public DNS, and public
  TLS are rejected for M6. The rehearsal is local and loopback-only.
- M6 uses a local trusted development CA. Its certificate/private key are
  temporary owner-workstation material; they never enter the repository, Docker
  image, release artifact, or a remote host.
- The M6 rehearsal is owner-only and loopback-only; no external reviewer access
  is required before M7.
- `mkcert` is not currently available on the owner workstation. M6 planning
  selects it as the preferred local-CA tool only if the owner later authorizes
  its installation and trust-store setup; no such mutation has occurred.
- The existing local Docker runtime rehearsal is green and leaves no persistent
  project container. It is evidence for the release image and the baseline for
  local TLS/reverse-proxy validation.

## Open Decision

- Whether a later M6 implementation may install `mkcert` and create its local
  trusted development-CA entry on this workstation.

## Deferral Record

Owner decision on 2026-08-15: stop M6 planning here. Do not implement local
TLS, install `mkcert`, alter the workstation trust store, configure a remote
staging host, or start M7. Revisit TLS and release rehearsal only as part of a
future, explicitly authorized formal-deployment task. This record preserves the
discarded options and local Docker evidence without treating them as current
work.
