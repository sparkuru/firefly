# Local readiness evidence

## Scope and result

Executed implementation step 1 on 2026-10-05. The local readiness gate is
**pass after an environment correction**. The original runtime packaging
failure and its cause are retained below; independent review reran the full
package gate successfully with corrected process umask and private logging.
No product source was changed, no production connection was made by this worker,
and no real credentials or mail recipients were used.

Initial and final Git status contained only the current untracked task
directory. Existing work was preserved. Initial context validation passed with
10 implement entries and 11 check entries; final validation passed with
11 implement entries and 12 check entries after main-session context updates.

## Commands and outcomes

Node and browser commands used the tracked `content/` root through `sam`.
Commands needing Bash, diagrams or browsers used the project-pinned
`mcr.microsoft.com/playwright:v1.62.0-noble` image and host IPC.

| Gate | Result | Evidence |
| --- | --- | --- |
| `FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm run check:m51` | pass | All declared static/type checks exited zero |
| `FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm run test:m51` | corrected infrastructure invocation | Ordinary Alpine lacked Bash and pinned Chromium; 335 earlier tests passed, followed by 6 diagram/CLI passes and 30 environment failures |
| Same `test:m51` with pinned browser image and host IPC | pass | 375 Node tests; zero failures or skips |
| Same pinned environment: `./sam npm run test:memos-publication` | pass | Actual enabled, empty and disabled Astro build/assembly; stale build refused |
| Same pinned environment: `./sam npm run prepare:test:memos` | pass | Prevalidated static Memo fixture built |
| Same pinned environment: `./sam npm run test:e2e:memos` | pass | 3 browser tests: desktop static, mobile static and mobile interactive |
| `./preview.sh verify` | pass | 393 Node tests; 174 browser passes; 139 intentional applicability skips; maintained isolated runtime lifecycle passed |
| Five host Compose syntax shapes | pass | Default, Memo, comments, combined, standalone Memo; no service start |
| `services/memos/ops/check-image.sh <disposable-service-image-tag>` | pass | Default nonroot identity, health/readiness, owner-only files, recreation persistence, encrypted queued mail and rates; no published port |
| `FIREFLY_CONTENT_ROOT="$PWD/content" FIREFLY_RUNTIME_IMAGE=<disposable-web-image-tag> ./preview.sh package` under process `umask 077` | initial fail | Build and metadata passed; Nginx could not read the root-owned 0600 copied config |
| Same full package gate under process `umask 022`, private precreated log | corrected pass | Independent reviewer confirmed runtime routes/headers/nonroot/read-only/inventory and exact cleanup; publication manifest unchanged |

The Alpine failures were `spawn bash ENOENT` and unavailable Mermaid/pinned
Chromium. The documented pinned-image invocation corrected those prerequisites
without modifying code or weakening tests. The complete verification total
includes the 375 `test:m51` tests and 18 additional build/static tests.

Compose commands used `docker compose --env-file /dev/null -f compose.yml
[profile arguments] config --quiet`; profiles were omitted, `memos`,
`comments`, and both. Standalone used `-f plugins/memos/compose.yml` with
synthetic `MEMOS_RUNTIME_USER=1000:1000`. All five logs were empty and the
syntax checks completed without service or bind-input creation.

## Full verification coverage

Browser passes were Memo 3, main site 157, NERV 8, and assembled publication 6.
The maintained host fixture passed absent-upstream refusal, proxy policy,
persistent rate/outbox state, certificate-validated local TLS SMTP delivery,
desktop/mobile native POST, verification/moderation/export, actual static
publication, removal, isolated restore, stale DOM/export refusal, and privacy.
The fixture reported verified exact cleanup. It was not rerun separately.

Synthetic isolated builds emitted their existing missing-Lab-reference
warnings; Node emitted SQLite experimental notices. Neither changed the
successful command statuses.

## Packaging stop condition

The disposable web tag was confirmed absent before creation. Packaging built
the image and verified its expected `nginx` user. It started the script-owned
container with `--publish 127.0.0.1::8080`, then failed immediately at
`docker port <owned-container> 8080/tcp` with:

```text
Error: No public port '8080/tcp' published for <owned-container>
```

The original command exited 1. A later actual-image diagnostic reproduced
Nginx startup refusal: process `umask 077` made the copied public config
root-owned 0600, unreadable to image user `nginx`. The independent reviewer
reran the full gate with process `umask 022`, while keeping its log 0600 inside
a 0700 directory, and it passed. No product fix was required. The initial
script trap removed its container and temporary build
context; the newly created image tag was explicitly removed. Successful image
construction does not establish runtime route, header, health or inventory
acceptance.

## Preservation and cleanup

- All 15 pre-existing container IDs and all 21 pre-existing volume names were
  unchanged in the final snapshots. No default/owner Compose service started
  or stopped.
- Final Memo runtime, Memo image-check and package-runtime owned-container
  queries each returned zero. Both task-created image tags were removed.
- Default publication activation and both retained deletion epochs matched
  the snapshot taken before the full verification build. No history reset,
  deletion or epoch lowering occurred.
- Owner-local site and comments config/secret file hashes were captured
  privately during verification and remained equal through the remaining
  verification/package stages. No contents or hashes were printed. An initial
  pre-run hash snapshot was not captured; this worker cannot claim that
  stronger whole-run hash comparison. The wrapper's site/comments config
  mounts were read-only, fixture inputs were isolated, and no owner file edit
  was performed.
- Raw command logs and hash/resource snapshots remain temporarily outside the
  repository in an owner-only directory (0700; files 0600) for main-session
  failure review. Their values and raw transcripts are excluded from this
  record. Remove them after review under the task cleanup boundary.
- Sanitized runtime desktop/mobile captures remain in ignored
  `services/memos/dist/test-results/` for review. No fixture private state or
  keys remain with them.
- `git diff --check` passed; no source files were changed or staged.

## Limits and follow-up

The main session owns classification of the packaging failure, task phase
changes and any proposed remediation. This local evidence does not establish
production HTTPS/edge behavior, real mailbox receipt, private mount identity,
release promotion, deployed deletion history, backup retention or production
rollback. Production acceptance criteria remain unclaimed.
