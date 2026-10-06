# Memo service deployment preparation

## Result and scope

Prepared one task-owned Memo service image and owner-only transfer archive on
2026-10-05. No remote connection, credential use, real mail, service startup,
production data access or product source change occurred. The image and archive
remain available to the main session for the confirmed deployment boundary.
Their exact tag, content ID, archive path and checksum were delivered privately
and are excluded from this durable record.

## Source and build boundary

Before and after preparation, `git diff --quiet HEAD -- services/memos
plugins/memos .dockerignore` passed. Git status contained only the current
untracked task directory.

The root ignore rules exclude secrets, Memo runtime config, private data,
SQLite files, dependencies and build outputs. They do not exclude every
owner-local site/comments TOML from a root build context. Preparation therefore
used a new minimal context populated directly from tracked HEAD files with
`git archive`, rather than sending the owner workspace as the context.

The context contained exactly 31 files: `.dockerignore`,
`services/memos/Dockerfile`, its three package/compiler manifests, service
`src/`, canonical migrations, and the five pure Memo contract modules and
declarations explicitly required by the Dockerfile. No owner configuration,
secret file, database, task record, authored content or deployment input was
included. The reviewed Dockerfile was used unchanged.

The task-only image tag was confirmed absent before creation. Build used
explicit `--platform linux/amd64` and `firefly.memo-deployment-prep=<run-id>`
ownership. The build process used `umask 022`; logs and the output archive were
precreated at 0600 inside a 0700 temporary directory. Required context files
remained 0644, allowing the image's nonroot runtime to read them.

## Checks executed

| Check | Result |
| --- | --- |
| Product source matches HEAD before/after build | pass |
| Minimal tracked context inventory | pass; 31 files, no owner inputs |
| `docker build --platform linux/amd64 --file <context>/services/memos/Dockerfile --tag <task-service-tag> <context>` | pass |
| Image metadata | pass; Linux/amd64, `node` user, `node` entrypoint, service cwd and default `dist/src/server.js` command |
| Image health configuration | pass; preserved HTTP `/healthz` and `/readyz` check |
| Offline read-only Node inventory probe | pass; UID 1000; HTTP/worker/worker-health, migration and pure contract files present |
| Private input and development-tree absence | pass; owner config, env/private directories, comments plugin, runtime secrets, Memo DB and service source/ops absent |
| Single-image save and archive manifest | pass; exactly the task tag, config content hash matches inspected image ID |
| Archive permission and checksum | pass; nonempty 0600 archive and private checksum file; parent directory 0700 |
| Exact probe cleanup | pass; no container bearing the task preparation label remains |
| Final source and diff checks | pass; no product edits or staging |

The inventory probe used `--network none`, a read-only root, dropped
capabilities, no-new-privileges and `--rm`. It ran only Node file assertions,
with no HTTP/worker process, host port or mounted owner state. The previously
passed service and integrated lifecycle fixtures were not repeated.

## Handoff and limits

Retain the exact task image tag and matching archive until the main session
loads and verifies the image at the authorized remote boundary. The archive
checksum and inspected content ID support transfer/load verification; the
main session owns transfer, remote configuration, startup and exact cleanup.
Remove only this preparation's temporary artifacts and tag when that handoff
is complete.

Image preparation does not certify production service readiness, mount
identity, worker delivery, edge behavior, mailbox receipt, publication or
rollback. Those remain the ordered production gates.
