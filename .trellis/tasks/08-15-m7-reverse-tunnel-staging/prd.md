# M7 reverse-tunnel staging rehearsal

## Goal

Safely rehearse the complete, immutable f1refly publication through the real
`staging.majo.im` TLS/Nginx edge while the static runtime remains on the owner
workstation. The rehearsal must prove the reverse-tunnel boundary, public
routes, headers, and a complete rollback without exposing a workstation port
directly to the Internet or becoming a persistent deployment.

## Confirmed facts

- M5's assembled static publication and its local Docker runtime preflight are
  green; `dev.sh` publishes only `127.0.0.1:4321` by default.
- `ssh wkyuu@ssh.majo.im` accepts strict-host-key, key-auth login. The remote
  account has non-interactive `sudo`.
- Remote Nginx 1.26.3 is active and owns public ports 80 and 443. Its existing
  proxy sites use loopback upstreams.
- Remote `sshd` has `AllowTcpForwarding yes` and `GatewayPorts no`. A reverse
  forward explicitly bound to `127.0.0.1` therefore remains private to the
  remote host and can be reached only by Nginx.
- `staging.majo.im` has wildcard-DNS/CDN coverage but no dedicated remote Nginx
  server block. At the origin, its HTTP request redirects to HTTPS and its
  HTTPS request returns 404.
- The origin's active certificate is valid for `majo.im` and `*.majo.im`; it
  can serve `staging.majo.im` without issuing or storing a new certificate.
- This task supersedes M6's earlier decision that remote staging changes were
  disallowed. M6 remains a historical local-rehearsal planning record; M7 owns
  all remote tunnel and Nginx changes.

## Requirements

- R1: Build and validate the complete assembled release before serving it
  locally. The local runtime must listen only on loopback.
- R2: Create a temporary SSH reverse tunnel from remote `127.0.0.1:<port>` to
  local `127.0.0.1:4321`, using strict host-key checking and
  `ExitOnForwardFailure`. No remote forward may bind a public address.
- R3: Add an isolated `staging.majo.im` Nginx server block that preserves HTTP
  to HTTPS handling and proxies only to the tunnel's remote loopback port. Its
  configuration must pass `nginx -t` before reload.
- R4: Keep the rehearsal limited to the static release: no application server,
  database, Typecho mutation, comment service, DNS mutation, certificate
  issuance, production traffic switch, or persistent process manager.
- R5: Verify the direct tunnel path and the public HTTPS path, including the
  expected release routes, distinct 404s, security/cache headers, TLS hostname
  validity, and no-JavaScript rendering.
- R6: Prove rollback by removing the dedicated Nginx configuration, stopping
  the tunnel and local runtime, then confirming the remote loopback port is
  closed and `staging.majo.im` no longer serves the rehearsed release.
- R7: Store no credentials, private keys, Cloudflare material, host IPs, or
  generated authentication secrets in Git or task artifacts.
- R8: Put HTTP Basic Auth in front of every rehearsed HTTPS response. Use a
  generated, task-local credential held only in an owner-readable temporary
  file for automated probes; keep only its password hash on the remote host and
  remove both during rollback.

## Acceptance criteria

- [x] The release build and package-runtime checks pass before exposure.
- [x] The SSH tunnel is verified to listen only on remote `127.0.0.1`, and its
  local source is `127.0.0.1:4321`.
- [x] `https://staging.majo.im/` reaches the exact assembled release through
  Nginx, with a valid wildcard certificate and expected static response headers.
- [x] Representative semantic, Terminal, experiment, and missing-route probes
  succeed with the release's expected status/redirect/404 behavior.
- [x] Unauthenticated HTTPS requests receive `401`, while the temporary
  credential reaches the release.
- [x] Cleanup restores the previous Nginx configuration, removes the dedicated
  remote loopback listener, terminates local processes, and leaves no project
  container or tunnel running.

## Out of scope

- Production deployment, DNS/CDN configuration, certificate renewal, long-lived
  tunnel supervision, public comment/identity services, analytics, and any
  change to authored Markdown or the legacy Typecho system.

## Resolved access decision

- The temporary URL uses Nginx HTTP Basic Auth. A generated credential is held
  only in a mode-600 local temporary file for the test session; its hash is the
  only authentication material sent to the remote host, and both are deleted in
  rollback. This prevents public browsing without adding a persistent account,
  CDN rule, or a workstation-wide access dependency.
