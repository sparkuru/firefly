# M7 reverse-tunnel staging rehearsal — implementation plan

## Preconditions and safety gates

1. Confirm a clean local worktree, strict SSH host-key verification, active
   remote Nginx, unused staging server name, and unused remote
   loopback port 9450.
2. Run `./package-runtime.sh`; stop before remote mutation if it fails.
3. Create local mode-600 temporary state for PID/log/credential data outside
   the repository. Register cleanup before starting a service.

## Rehearsal

1. Start the `firefly:m5-runtime` image produced by `./package-runtime.sh` on
   `127.0.0.1:4321` with the same read-only/non-root restrictions; wait for the
   static root and assert no non-loopback publication listener exists.
2. Generate the short-lived Basic Auth value without printing it. Derive the
   remote-compatible hash locally; create its remote file with restricted
   ownership/permissions appropriate for the Nginx worker.
3. Start one managed `ssh -N` process with `StrictHostKeyChecking=yes`,
   `ExitOnForwardFailure=yes`, keepalives, and
   `-R 127.0.0.1:9450:127.0.0.1:4321`. Assert remote `ss` shows only a
   `127.0.0.1:9450` listener and curl it from the remote host.
4. Upload/install the one isolated staging Nginx file. Validate with
   `sudo nginx -t`; only then reload. Capture the pre-existing configuration
   fingerprint/listing so rollback can prove it was restored.
5. Execute authenticated and unauthenticated direct-origin/public HTTPS probes.
   Run the relevant existing static/browser checks against the staging URL using
   temporary Basic Auth credentials, preserving their results as non-secret
   task evidence.

## Required checks

- `./package-runtime.sh` passes before the remote entry point is enabled.
- Local runtime and tunnel are loopback-only; no `0.0.0.0:9450`/`[::]:9450`
  listener exists.
- `curl` verifies `401` without credentials; authenticated probes cover `/`,
  `/posts/`, a canonical article, `/lab/`, `/lab/nerv/`, redirects, and both
  site/NERV missing routes.
- TLS validates for the staging name; HTML retains the runtime security/cache
  contract and static assets retain immutable caching.
- Browser desktop/mobile evidence covers a no-JavaScript page and an enabled
  Terminal route through the public edge.

## Rollback and completion

1. Remove the M7 Nginx/auth files, run `sudo nginx -t`, reload, and prove the
   configured host no longer returns the release.
2. Terminate the exact managed SSH PID; prove remote port 9450 is no longer
   listening and local port 4321 has no M7 service.
3. Delete local temporary credentials/logs and verify no M7-labelled Docker
   container/process remains.
4. Re-run read-only Nginx configuration/listener checks. If the site, auth
   file, tunnel listener, or local runtime remains, stop and repair cleanup
   before reporting success.

## Risky targets

- Remote temporary Nginx site and auth file: remove only the M7-named paths;
  never rewrite the shared site file or global Nginx configuration.
- Remote Nginx reload: gated behind `nginx -t`; failed validation means no
  reload.
- Local Docker runtime and SSH process: exact PID/label cleanup only; never
  stop unrelated containers or sessions.
