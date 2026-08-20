# M7 execution evidence

## Result

The temporary reverse-tunnel rehearsal passed on 2026-08-15 and was completely
rolled back. The owner-authorized runner exited successfully and reported that
the remote reverse-tunnel rehearsal passed before beginning rollback. No remote
configuration, tunnel, local listener, process, container, credential, or
temporary test material remains.

## Pre-exposure validation

- `./sam npm run check:m4` and `./sam npm run test:m4` passed in the execution
  preflight.
- `./package-runtime.sh` passed immediately before the successful exposure. It
  rebuilt the complete publication and verified the exact 23-file runtime,
  route/404 ownership, security/cache headers, MIME/cache rules, non-root user,
  read-only filesystem, and teardown.
- The locally served source was that verified `firefly:m5-runtime` image bound
  only to `127.0.0.1:4321`.

## Edge and browser evidence

- The SSH reverse listener was bound only to remote `127.0.0.1:9450`; the
  remote Nginx upstream used that loopback endpoint.
- The dedicated temporary Nginx file passed `nginx -t` before each reload. The
  existing wildcard TLS certificate validated for `staging.majo.im`.
- Public unauthenticated HTTPS returned `401`; the generated, non-recorded
  temporary credential reached the assembled release.
- Authenticated public and direct-origin probes passed for root, posts,
  canonical article, lab, NERV, redirects, and both site/NERV 404 owners.
  The runtime security and cache headers passed at the public edge.
- A temporary Playwright container completed desktop and mobile checks with
  JavaScript disabled for the semantic lab page, and desktop/mobile interactive
  checks for the Terminal prompt at the public staging URL.

## Independent rollback proof

After the final successful run, a separate read-only remote/local check reported
`remote_cleanup=pass` and `local_cleanup=pass`; remote `nginx -t` also
succeeded. It confirmed all of the following:

- the M7 Nginx and Basic Auth files are absent;
- remote port 9450 has no listener and no loaded Nginx server owns the staging
  hostname;
- local port 4321 is unused; and
- no container with the M7 execution label remains.

The tunnel automation and browser/credential scripts lived only under `/tmp`
with mode-restricted temporary state and were not retained in Git. The retained
evidence deliberately excludes passwords, hashes, private keys, host IPs, and
credential-bearing command lines.
