# Firefly comments plugin

This is the internal, statically registered `comments` capability. It is part
of the Firefly repository; it is not a third-party package marketplace or a
public runtime dependency.

The manifest is the ownership index. Its adapters own the post-only public
section and form, build-time sanitized export consumer, publication metadata
handoff, private HTTP/storage/moderation service, and private notification
delivery. The site owns the static registry that invokes its site adapter;
publication and service adapters remain separate package-owned entrypoints.
X Core provides the document/Presentation pipeline, not a generic plugin
lifecycle host.

`public.mjs` and `public.d.mts` are the repository-local public/build contract.
They own the sanitized `comments.public.v1` model, canonical route facade,
normalization, parent checks, ordering, digest, serialization, and immutable
empty export. The module is pure build-time code: it reads no files, secrets,
environment, database, SMTP configuration, or site components. `config.mjs`
remains the configuration namespace owner and supplies the route implementation
used by the public facade.

The three consumers stay thin around that contract. The site adapter reads a
contained export and groups encoded routes under readable post hrefs; the
private service selects approved rows and translates contract failures into its
service error classes; the publication adapter checks the emitted site,
contained handoff, and release metadata. The assembler imports only
`plugins/comments/public.mjs`, never site source. The focused contract tests
live under `plugins/comments/tests/` and run independently of any package.

The capability remains disabled by default through the single
`[plugins.comments].enabled = false` projection in `config/site.toml`. Its
build-time `configPath` must be an explicit repository-relative path and
defaults to `config/plugins/comments/config.toml`. When disabled, the public
build does not read a private export and does not require the comments service,
database, outbox, or SMTP settings.

The repository-local build input is the separate
`config/plugins/comments/config.toml` file. Its
`[public]` section contains only the static write origin, export path, and
consent version. Its `[runtime]` section contains post routes, allowed/public
origins, private storage/outbox paths, and non-secret SMTP host/port/security,
mailbox, display-name, and `passwordEnv` settings. A literal SMTP password is
rejected. The static site receives only `[public]`; the service resolves the
full runtime projection and reads named secrets from the protected
`config/plugins/comments/secrets.env` boundary.

Production keeps the plugin runtime separate from the static release and
content mirror:

```text
<deploy-root>/plugins/comments/
├── compose.yml
├── config.toml
├── secrets.env
└── data/
    ├── core.db
    ├── core.db-wal / core.db-shm
    ├── outbox/
    ├── outbox-state.json
    └── plugins/<plugin-id>/...
```

The production Compose file mounts `config.toml` and `secrets.env` read-only
and binds `data/` to the service's private data root. The `data/` directory is
owner-only writable and must not be under `current`, `releases`, or `blog`.
The local `config/plugins/comments/` files are build inputs/templates; an
operator copies reviewed values into the plugin-owned production directory
without copying secrets into this repository.

For one migration window, an old `[comments]` namespace is accepted only when
`[plugins.comments]` is absent. It is projected into the same activation and
public/runtime objects; configuring both namespaces is rejected, so there are
never two independent enable flags.

The service writes a private notification outbox. The optional delivery worker
consumes that queue through a provider-neutral transport. Zoho Mail can be
configured with the documented account host, port `465` with implicit TLS, or
port `587` with STARTTLS. Credentials are operator-provided runtime secrets;
none belong in this tree or in the static publication.
