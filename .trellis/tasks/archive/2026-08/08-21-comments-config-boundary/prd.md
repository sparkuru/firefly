# Converge comments configuration boundary

## Goal

Make the existing comments configuration WIP a coherent, testable plugin
boundary: one validated `[comments]` namespace, a public projection for the
static site, and a private runtime projection for the service without storing
SMTP credentials in repository configuration.

## Requirements

- `plugins/comments/config.mjs` and `config.d.mts` are intentional tracked
  plugin source and expose stable public/runtime types and parsers.
- Public fields are limited to `enabled`, `writeOrigin`, `exportPath`, and
  `consentVersion`; enabled comments still require an HTTPS write origin.
- Runtime SMTP/outbox fields are validated, exact-key checked, and excluded
  from the site projection. `passwordEnv` may name an injected environment
  variable, but a literal password or `COMMENTS_SMTP_PASSWORD` TOML key is
  rejected.
- Explicit environment variables override file values. The service resolves
  `config/site.toml` through the documented path candidates and supports an
  explicit `COMMENTS_CONFIG_PATH`.
- The site remains static and disabled by default; the Dockerfile, README,
  staging example, `sam`, package lock, and service runtime use the repository
  root build context and read-only config mount consistently.
- Tests cover projection, rejection, config loading, precedence, and existing
  service/operations behavior.

## Acceptance Criteria

- [x] Four untracked comments source files are reviewed and tracked as source.
- [x] `npm run check:comments` passes under Node `>=22.13.0`.
- [x] `npm run test:comments` passes, including config and offline backup/restore
      cases.
- [x] `npm run test:content:site` passes its site config/comments cases and the
      disabled-build contract.
- [x] A site config containing SMTP/runtime fields yields no private fields in
      `SITE_CONFIG.comments`; environment values take precedence in the service.
- [x] Negative tests reject literal SMTP passwords, unknown keys, unsafe origins,
      unsafe paths, malformed environment names, and conflicting legacy/nested
      values.
- [x] No credential, private mailbox value, database path, outbox content, or
      service-only token enters the public build or publication metadata.
- [x] Durable frontend specs and service documentation match the final code.

## Out of scope

- Enabling comments in tracked configuration.
- Provisioning SMTP, origins, credentials, DNS, or deployment infrastructure.
- Changing database schema, public comments export schema, moderation rules, or
  site SSR boundaries.
