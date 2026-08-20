# M7 reverse-tunnel staging rehearsal — design

## Boundary

M7 is a short-lived release rehearsal, not a production deployment. The remote
machine exposes only Nginx on its established HTTP/TLS ports; the owner
workstation exposes neither Docker nor the assembled runtime to any non-loopback
network interface.

```text
authenticated browser
  -> CDN / staging edge:443
  -> remote Nginx (TLS + Basic Auth)
  -> remote 127.0.0.1:9450
  -> SSH reverse channel (encrypted, key-auth)
  -> owner workstation 127.0.0.1:4321
  -> existing assembled-publication runtime
```

`GatewayPorts no`, the explicit `127.0.0.1:9450` bind, and the Nginx loopback
upstream are jointly required. Changing any of them to a wildcard/remote public
bind is out of scope and fails the rehearsal.

## Remote configuration contract

The target's Nginx configuration loads the existing site include directory.
M7 adds exactly one
temporary file in that existing directory and no changes to global Nginx,
DNS/CDN, certificate, firewall, or SSH configuration.

The temporary file defines:

- port 80 staging name redirecting to its HTTPS URL;
- port 443 TLS using the existing wildcard certificate;
- `auth_basic` plus a task-specific remote password-hash file;
- a single `/` location proxying to `http://127.0.0.1:9450` with forwarded host,
  scheme, and client-address headers; and
- no cache/header override that weakens the publication runtime's own security
  and cache contract.

Its filename, auth file, loopback port, and command process identifier are
unique to M7. Before installing the file, execution checks that the port is not
already listening and that no current configuration owns the staging name.

## Credential design

The executor generates a high-entropy temporary user/password locally under a
mode-600 `mktemp` file outside the repository. It derives a compatible password
hash locally and sends only the `user:hash` line to the remote auth file. The
plaintext neither appears in terminal output nor enters command history, Git,
task artifacts, Nginx configuration, or remote shell history. It is used by
automated curl/browser probes, then both local and remote auth files are
deleted.

## Lifecycle and failure behavior

1. Confirm the release baseline with `./package-runtime.sh`, then start the
   resulting read-only `firefly:m5-runtime` image on `127.0.0.1:4321`. This
   preserves the runtime's Nginx headers; `dev.sh` is a Node preview and is not
   an equivalent edge-runtime probe.
2. Establish one foreground-managed SSH process with strict host-key checking,
   `ExitOnForwardFailure=yes`, and a remote `127.0.0.1:9450` forward to local
   `127.0.0.1:4321`. A lost connection ends the rehearsal; M7 does not add
   `autossh`, systemd units, or restart persistence.
3. Confirm remote loopback reachability before Nginx is changed. Install the
   isolated Nginx/auth files, run `sudo nginx -t`, and reload only after success.
   If validation fails, remove the M7 files and leave the loaded configuration
   unchanged.
4. Probe direct-origin SNI and public HTTPS separately. Verify authentication,
   HTML/static headers, semantic/Terminal/experiment routes, redirects, and both
   404 owners. Browser evidence uses the temporary Basic Auth credential.
5. Roll back in reverse order: remove/reload the isolated Nginx site, terminate
   the tunnel, stop the exact managed runtime container, delete both credential
   files, and prove that port 9450 is absent and the public host no longer
   reaches the release.

Every process/file-changing step has a shell `trap`/finally-equivalent cleanup
path. Manual interruption, tunnel failure, failed Nginx test, or failed probe
must take the same cleanup route. A cleanup failure is reported as a failure,
not treated as a successful rehearsal.

## Trade-offs and deferrals

- Basic Auth is deliberately simpler than an IP allowlist or CDN Access: no
  user IP discovery or third-party policy is needed, but the staging URL remains
  usable only while its temporary credential exists.
- This proves the real wildcard TLS/Nginx boundary, but the owner's workstation
  must remain online. Availability, deployment persistence, remote release
  images, CDN policy, and production cutover remain later work.
