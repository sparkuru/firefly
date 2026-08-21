# Comments configuration boundary — technical design

## Ownership

`plugins/comments/config.mjs` is the namespace owner and has no dependency on
Astro or the service package. It validates TOML-shaped data and exposes:

- `public`: the frozen four-field site projection;
- `runtime`: validated non-secret SMTP and outbox settings;
- `resolveCommentsRuntimeOptions()`: runtime environment mapping with explicit
  environment precedence and named-secret lookup.

`apps/site/src/lib/site-config.mjs` removes `[comments]` before its own strict
site schema parse, then attaches only `parseCommentsNamespace(...).public`.
`services/comments/src/config.ts` reads TOML, imports the shared plugin module,
and supplies the resolved environment to the service/mailer. Existing service
environment variables remain compatible as overrides.

## Safety and compatibility

- Exact-key validation prevents accidental leakage and configuration drift.
- Public export paths remain safe repository-relative JSON paths.
- Runtime paths are private service settings and never enter the site object.
- SMTP password material is accepted only from the named process environment;
  the TOML file stores a variable name, not a secret.
- The root-context Docker build copies only the shared decoder/type declaration
  into the service image and mounts `config/site.toml` read-only at runtime.
- Disabled builds preserve the existing empty comments behavior and do not
  require an export or service.

## Rollback

If the boundary cannot be made green, revert only the child-owned config and
service hunks; retain unrelated route fixture WIP. Do not restore the whole
worktree or remove the new source files without recording the decision.
