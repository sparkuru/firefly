# M5.1 WIP convergence — technical design

## Boundaries

The parent task is an integration and evidence task. The two child tasks own
disjoint primary file sets and are completed serially because the comments
fixture and service staging examples bridge the public route and private
runtime concerns.

1. `comments-config-boundary` owns the plugin parser/types, site projection,
   service runtime loader and mailer/plugin integration, Docker build context,
   service documentation, configuration examples, and configuration specs.
2. `publication-route-alignment` owns canonical route fixtures, runtime
   representative paths, publication assembler depth handling, and related
   assembler/publication tests.
3. The parent owns final cross-layer review, shared-file hunk reconciliation,
   mainline status, task evidence, staging/commit order, and rollback notes.

## Data flow

```text
config/site.toml
        |
        v
plugins/comments/config.mjs
   |                    |
   v                    v
site public projection  service runtime projection
   |                    |
   v                    v
static comments build   env overrides / private outbox / SMTP
```

The plugin parser is the single namespace owner. `parseCommentsNamespace()`
returns a public projection and a runtime projection. The site imports only the
public projection. The service reads the same TOML file, resolves the runtime
projection, and applies explicit environment variables as higher-precedence
overrides. `passwordEnv` names an injected secret; a password value is never
read from or written to the repository config.

## Compatibility and safety

- Preserve the current public comments schema and static export handoff.
- Preserve legacy `COMMENTS_*` environment variables as runtime overrides while
  rejecting a literal `COMMENTS_SMTP_PASSWORD` in TOML.
- Keep the site parser strict for its own keys and exact for the comments
  namespace; reject unknown, unsafe, non-NFC, credential-bearing, and
  path-escaping values.
- Keep `comments.enabled = false` in the tracked config, so disabled builds do
  not require an export or service.
- Use the repository root as Docker build context so the service can copy the
  shared plugin decoder; mount `config/site.toml` read-only at runtime.
- Treat the canonical route as data contract, not as a content rewrite. Update
  only stale fixture/probe references and broaden authored-post recognition as
  required by the existing nested route model.

## Validation and rollback

Validation proceeds from cheap/static to cross-layer:

1. `git diff --check`, targeted parser/service/site/assembler tests.
2. Node `>=22.13.0` package checks, tests, and builds.
3. Shell checks and publication/runtime probes.
4. Optional Docker image and publication browser checks without credentials.

If a child fails, leave the worktree intact, record the failing command and
scope, and roll back only that child’s uncommitted hunks. Do not restore the
entire worktree because it contains owner WIP. The final commit plan keeps the
comments boundary and route alignment separable where the diff permits.

## Mainline reconciliation

After validation and before archival, update the M5.1 row from the stale
`in_progress` wording to reflect that implementation/WIP convergence is
complete and external service provisioning remains a separate owner gate. Do
not provision services or change the guided-mode authorization in this task.
