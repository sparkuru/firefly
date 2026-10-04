# Owner-approved final Memo commits

## Work commit

`feat: integrate memo publication and private runtime`

Include exactly these 53 reviewed product/spec/mainline files:

```text
.dockerignore
.gitignore
.trellis/mainline.md
.trellis/spec/frontend/architecture-contract.md
.trellis/spec/frontend/development-runtime.md
.trellis/spec/frontend/directory-structure.md
.trellis/spec/frontend/index.md
.trellis/spec/frontend/memo-contract.md
.trellis/spec/frontend/memo-publication-runtime-contract.md
.trellis/spec/frontend/memo-service-contract.md
.trellis/spec/frontend/memo-site-contract.md
.trellis/spec/frontend/publication-contract.md
.trellis/spec/trellis-plus/index.md
.trellis/spec/trellis-plus/validation-profile.md
apps/site/src/lib/contained-file.mjs
apps/site/src/pages/memos/[...stream].astro
apps/site/src/plugins/memos/MemoStream.astro
compose.yml
nginx.conf
package-runtime.sh
package.json
plugins/memos/README.md
plugins/memos/compose.yml
services/memos/Dockerfile
services/memos/README.md
services/memos/ops/check-runtime.sh
services/memos/ops/fixture-browser.mjs
services/memos/ops/fixture-publication.mjs
services/memos/ops/fixture-runtime.mjs
services/memos/ops/fixture-smtp.mjs
services/memos/ops/nginx-hosts.conf.example
services/memos/package.json
services/memos/src/address.ts
services/memos/src/config.ts
services/memos/src/http.ts
services/memos/src/server.ts
services/memos/src/worker-health.ts
services/memos/src/worker-server.ts
services/memos/src/worker.ts
services/memos/tests/config-validation.test.ts
services/memos/tests/runtime.test.ts
tooling/assemble-publication/package-lock.json
tooling/assemble-publication/package.json
tooling/assemble-publication/scripts/check-memos-built.mjs
tooling/assemble-publication/scripts/check-runtime-metadata.mjs
tooling/assemble-publication/src/index.ts
tooling/assemble-publication/src/plugins/memo-history.ts
tooling/assemble-publication/src/plugins/memos.ts
tooling/assemble-publication/tests/assembler.test.ts
tooling/assemble-publication/tests/memos.test.ts
tooling/shared/contained-file.d.mts
tooling/shared/contained-file.mjs
verify.sh
```

This coherent integration binds copied static HTML to strict public input and
retained deletion history, supplies opt-in private proxy/worker operation and
maintained synthetic verification, and records executable contracts. It excludes
both pre-existing task directories from the work commit, all ignored outputs,
private config/data and unrelated files. No unrecognized dirty files remain.

## Bookkeeping after the work commit

1. `chore(task): archive 10-01-memo-publication-runtime`
   - Move only `.trellis/tasks/10-01-memo-publication-runtime/` to
     `.trellis/tasks/archive/2026-10/10-01-memo-publication-runtime/`.
   - Record the accepted source, planning/context and final validation evidence;
     clear that task's current-session pointer through the maintained script.
2. `chore(task): archive 09-28-public-memo-stream`
   - Move only `.trellis/tasks/09-28-public-memo-stream/` to
     `.trellis/tasks/archive/2026-10/09-28-public-memo-stream/` after the child;
     all four children and all eight joint criteria pass.
3. `chore: record journal`
   - Record this session with the work hash in `.trellis/workspace/sam/index.md`
     and the current `journal-1.md`, or `journal-2.md` if the maintained line cap
     requires rollover. Stage only the exact journal/index files actually written.

Use exact stage scopes; no blanket repository/archive/workspace staging,
amend, remote push, deployment or next product task. Preserve existing archived
child history and unrelated ignored owner files. Final tree inspection follows.

## Required decision

Owner implementation approval is already recorded. The repository workflow
`.trellis/workflow.md` Phase 3.4 additionally requires: “Present the plan once,
ask for one-shot confirmation.” This is the concrete plan for that decision.
Approval covers the work commit followed by the two scoped archives and journal;
reply with edits or manual handling to change that scope.


## Execution record

The owner confirmed this exact plan on 2026-10-05. Work commit `08be5df`
contains the 53 reviewed files. Execute the two scoped archives and journal
after it; the earlier decision text is retained as approval provenance.
