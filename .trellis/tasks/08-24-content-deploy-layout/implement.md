# Implementation and validation plan

## Ordered checklist

1. Review the approved PRD/design and load the frontend content, runtime,
   comments, site-configuration, quality, and privacy contracts. Do not start
   code before the latest planning summary is explicitly approved.
2. Update the content transport boundary:
   - change `sam` default/root validation and narrow recursive link discovery to
     the `posts/` and `pages/` source trees;
   - add the two-collection generated workspace orchestrator with one
     candidate/promotion boundary;
   - point both Astro collections at generated ordinary Markdown trees.
3. Update metadata compatibility:
   - add narrowly validated `source` provenance metadata;
   - normalize whitespace-only legacy slug separators before route validation;
   - add schema, canonical-route, and rejection tests for both behaviors;
   - document and test the no-whitespace safe-slug convention for new articles.
4. Replace the working-tree `content` symlink with the tracked demo fixture,
   update `.gitignore`, README, and content-workspace documentation, and verify
   no external article text or host path enters the diff.
5. Update the ignored synchronizer and its operational note:
   - validate the selected blog root and regular Markdown-only contents;
   - stage/verify the blog mirror separately from the assembled publication;
   - preserve release checksum/count/atomic-current behavior;
   - document that `site.toml` is build input only and comments runtime config is
     plugin-owned.
6. Prepare the remote plugin runtime migration using owner-controlled
   operational input only:
   - record current static release and comments health;
   - back up and integrity-check the current SQLite data;
   - create the plugin directory and owner-only `data/`, config, and secrets
     boundaries;
   - switch Compose to plugin-local data/config paths;
   - health-check and route-check the new process;
   - keep the old directory and backup until acceptance, then remove only the
     confirmed-unused legacy `site.toml`/legacy config files.
7. Run local checks in dependency order. Use `./sam` for Node/npm commands and
   use the locked browser image for Playwright. Run shell syntax/style checks
   for `sam` and the synchronizer. Do not count host-only validation as the
   project gate.
8. Build with the default demo and with an external blog-root override. Audit
   both generated collections, metadata failures, route output, draft/private
   exclusion, safe new-article examples, symlink absence, and absolute-path
   absence.
9. Run the synchronizer dry-run against the operator target, then perform the
   approved remote sync only after local build and release gates pass. Verify
   the final blog mirror, release target, comments health, and rollback inputs.
10. Run the full Trellis quality check, update the frontend spec contracts with
    the new root/config/data decisions, review the complete diff including
    task records for privacy leakage, and only then commit/archive the task.

## Validation commands

### Local content and packages

```sh
bash -n sam
if command -v shellcheck >/dev/null 2>&1; then shellcheck sam; fi
bash -n tooling/sync-server/sync-server.sh
if command -v shellcheck >/dev/null 2>&1; then shellcheck tooling/sync-server/sync-server.sh; fi

./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build
./sam npm run check:m4
./sam npm run test:m4
./sam npm run build:m4
FIREFLY_CONTENT_ROOT=/absolute/path/to/blog ./sam npm --prefix apps/site run build:workspace
```

The external path is supplied through the owner-controlled shell environment;
do not write it into a Trellis artifact or command output beyond the minimum
operator handoff.

### Static and browser evidence

```sh
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix apps/site run test:e2e -- tests/site.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix apps/site run test:e2e -- tests/terminal.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix tooling/assemble-publication run test:e2e
```

### Synchronizer evidence

```sh
./tooling/sync-server/sync-server.sh --dry-run
```

The exact remote target is read from the ignored operational note. A dry-run
must not upload, mutate `blog`, or switch `current`.

## Risk and rollback points

| Point | Risk | Rollback |
| --- | --- | --- |
| Content-root change | external blog structure or link target differs | restore prior generated stage and use the old caller only after adapting it to a blog root |
| Two-tree promotion | one collection copy fails | remove candidate and retain prior generated directory |
| Metadata normalization | route changes for the legacy whitespace slug | revert schema change; no broad route relaxation |
| Demo replacement | the user-owned symlink target could be damaged | remove only the repository link, never modify its target; create demo files in repository scope |
| Blog sync | mirror staging or validation fails | retain previous blog mirror and do not alter static `current` |
| Static promotion | upload/checksum/symlink fails | synchronizer cleanup and retain prior `current` release |
| Comments migration | service/data incompatibility | stop new Compose, restore old Compose/data path from verified backup, retain old runtime |

## Review gates before task activation

- PRD has no unresolved product decisions.
- Design and implementation artifacts agree on `site.toml` placement,
  plugin-local SQLite data, and the blog-root input contract.
- `implement.jsonl` and `check.jsonl` contain real frontend spec entries, not
  seed placeholders.
- The latest planning summary has been shown to the user and explicitly
  approved.
