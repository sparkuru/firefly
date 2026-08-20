# Firefly comments plugin

This is the internal, statically registered `comments` capability. It is part
of the Firefly repository; it is not a third-party package marketplace or a
public runtime dependency.

The manifest is the ownership index. Its adapters own the post-only public
section and form, build-time sanitized export consumer, publication metadata
handoff, private HTTP/storage/moderation service, and private notification
delivery. Firefly core only provides the generic plugin registry and lifecycle
hooks.

The capability remains disabled by default through `[comments].enabled = false`
in `config/site.toml`. When disabled, the public build does not read a private
export and does not require the comments service, database, outbox, or SMTP
settings.

The service writes a private notification outbox. The optional delivery worker
consumes that queue through a provider-neutral transport. Zoho Mail can be
configured with the documented account host, port `465` with implicit TLS, or
port `587` with STARTTLS. Credentials are operator-provided runtime secrets;
none belong in this tree or in the static publication.
