# M5.1 Comment Service Core — Design

The service is an independent Node 22 TypeScript package. Its public boundary
is write/verification/control HTTP plus an owner-only control plane; the static
site receives only a local sanitized export. The first storage adapter uses
private SQLite in WAL mode and keeps the repository interface replaceable. Use
Node platform primitives where practical so the service has no dependency on
the Astro site or presentation packages.

The service pipeline is:

```text
request → strict decoder → abuse/rate gate → private store
                                  ↓
                  verification → pending moderation → owner action
                                  ↓ approved only
                         deterministic public export
```

Keep the field split explicit in types. Encrypt private email with a runtime
key, hash verification/control tokens, retain only bounded abuse material, and
never serialize private fields into export, logs, or response HTML. Public
records use opaque IDs, canonical post paths, verified display names, optional
HTTPS homepages, plain text, and server timestamps.

The export decoder/encoder owns `comments.public.v1.json`: schema version,
opaque source revision, generation time, tombstone epoch, deterministic record
ordering, top-level-only parents, and approved-parent eligibility. A route
catalog is supplied by the caller; stale or non-post routes are rejected.

Email delivery is an injected transport. Tests use an in-memory transport; the
package runtime can write a private outbox until a separately configured relay
is authorized. This child does not provision or connect to a real relay.
