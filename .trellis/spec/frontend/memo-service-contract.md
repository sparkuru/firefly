# Retired Memo Service Boundary

## 1. Scope / Trigger

The visitor Memo HTTP/verification/moderation/mail service is retired by the
owner-approved static-publisher task. This file protects retained operational
state when removing the old repository wiring; it is not an active service
implementation guide. See [owner Markdown contract](./memo-contract.md) and
[independent publisher](./memo-publication-runtime-contract.md).

## 2. Signatures

There is no supported Memo submission, verification, admin, SMTP, worker or
private readiness endpoint in the current product. New publishing uses the
owner's local publisher command. Historical source contracts remain in Git
and archived tasks, not active root checks or Compose services.

## 3. Contracts

- Remove old service package/build scripts, interactive fixtures, Memo proxy
  templates and worker/service Compose entries coherently.
- Retain owner-private databases, encryption/admin keys and recovery backups.
  Repository retirement does not authorize deleting or importing those files.
- Stop only the two exact task-created private Memo processes after confirming
  their identities/state and retained recovery material. Comments services,
  secrets, data, mounts and unrelated listeners retain their own ownership.
- Do not start a legacy service to publish Markdown, expose retained private
  data or restore an old database over current state. Any historical recovery
  remains an owner-led procedure with the original matched key/schema rules.
- No new source/public candidate/web image contains old secrets or SQLite.

## 4. Validation & Error Matrix

| Condition | Result |
| --- | --- |
| Unknown process identity or changed private state | Stop cutover and inspect; no broad kill |
| Old HTTP/worker reference in active product/deployment wiring | Retirement incomplete |
| Retained database/key/backup proposed as cleanup | Refuse outside approved scope |
| Static Memo route with service stopped | Reading remains available |
| Historical record proposed for public import | Requires separate owner scope |

## 5. Good / Base / Bad Cases

Good: preserve private recovery files and remove active visitor/mail wiring.
Base: independent static reading has no Memo listener or delivery queue.
Bad: delete the private directory, stop comments, or use an old export as
Markdown to make migration appear complete.

## 6. Tests Required

Check active imports/scripts/Compose/proxies for retired runtime references;
assert no form, email control or write endpoint in public Memo output. Actual
cutover evidence verifies exact stopped processes, retained recovery and
unchanged comments boundary. Local fixtures do not prove production retirement.

## 7. Wrong vs Correct

Wrong: recursively remove a private plugin directory or stop every container
whose name includes a plugin word.

Correct: retain data/keys/backups, identify the task-created HTTP/worker exactly,
stop only those processes, and verify static reading plus unrelated boundaries.
