# Owner Routing Boundary Research

## Read-only observed baseline

The main session used the already authorized SSH alias with an explicit existing
user SSH configuration. The system-wide included SSH configuration has an
ownership error, so the selected fallback must remain on every SSH/transfer
operation. Exact paths, hostnames, virtual-host contents and probes are retained
only in an owner-only `/tmp/firefly-plugin-public-access.*` directory.

- The actual public edge is a host Nginx process, not the repository's Docker
  runtime. Its HTTP and canonical HTTPS virtual host preserve transport and
  canonical-host redirects.
- The HTTPS root points to the deployed immutable blog `current` symlink. The
  Memo alias points to an independent deployment's `current/public/` tree.
- There is an unconditional exact Memo redirect and an unconditional prefix
  Memo alias. No comments public proxy was found in any active custom vhost.
- No comments container was running at inspection time. The local comments
  write origin selects the canonical site origin. Public re-enablement must
  validate a prepared matching upstream, rather than provision an invented one.
- Both owner-local site plugin flags are currently false. The owner's private
  configuration is an input; do not overwrite it during implementation.
- The old private sync calls a broad recursive ownership helper on the web root,
  which also affects plugin directories. Remove that invocation and retain only
  existing narrowly scoped new blog release and source-mirror permissions.
- The existing host configuration passes its native syntax test. Other aliases,
  certificate configuration and independent applications are outside scope.

## Selected approach and constraints

Use validated positive activation markers contained in each immutable blog
release. Public plugin locations check their marker before a redirect, alias or
proxy. Disabling produces no marker, so an already retained Memo publication or
live comments upstream cannot override false.

The file test must use an explicit blog-release root. `$document_root` inside
the Memo alias is not an acceptable source for that root. One-time installation
of the narrow host gate requires a backup, complete `nginx -t`, reload and
origin/edge verification; future ordinary toggles then follow the existing blog
pointer without a second policy pointer or per-push reload.

The deployment protocol must handle missing old markers as disabled, preserve
legacy floor recovery, validate JSON/markers/inventory consistency, and prevent
stale positive markers from surviving a new build. The gate must precede HTTP
method handling; public 404s use non-cacheable responses. Canonical host/HTTPS
redirects continue to their gated canonical endpoints.

Private admin/health/data operations remain possible through their existing
private boundary. Public access through any comments namespace, including token
and authenticated branches, is blocked when comments is false. No service stop,
DB reset, export deletion, historical release deletion or SMTP migration is
needed for this public-access contract.

## Primary Nginx references

The official rewrite-module documentation explicitly supports regular-file
existence tests (`-f`/`!-f`) and `return` inside `if`. This permits a narrow
return-only route gate. Implementation must prove behavior in the actual runtime
with `nginx -t` and HTTP probes; documentation alone is insufficient.

- https://nginx.org/en/docs/http/ngx_http_rewrite_module.html#if
- https://nginx.org/en/docs/http/ngx_http_rewrite_module.html#return
- https://nginx.org/en/docs/http/ngx_http_core_module.html#open_file_cache

Cache behavior must be exercised across an on/off/on release-pointer switch.
No caching assumption may permit a stale enabled-file decision. Preserve
unrelated static cache headers and canonical redirects.
