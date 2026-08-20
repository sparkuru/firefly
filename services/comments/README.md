# Firefly comments service

This package is the private `comments` plugin service boundary. It is not a
public comment read API and it is never part of the static publication image.
The only public-site handoff is an owner-reviewed
`comments.public.v1.json` export passed to a guarded local build through
`FIREFLY_COMMENTS_EXPORT`.

## Runtime contract

Build the image from this directory and keep its database/outbox volume
private. Publish the port only on loopback or behind an owner-controlled
private ingress:

```sh
docker build --tag firefly-comments:staging services/comments
docker run --rm --init \
  --read-only --tmpfs /tmp:size=16m,mode=1777 \
  --mount type=volume,src=firefly-comments-staging,dst=/var/lib/firefly-comments \
  --env-file services/comments/staging.env \
  --publish 127.0.0.1:8787:8787 \
  firefly-comments:staging
```

The environment file is an operator-owned secret input and is not committed;
`staging.env.example` contains placeholders only. Required route catalogs,
email encryption keys, token secrets, admin authentication, and allowed origins
are injected at runtime. Do not mount the database, outbox, environment file,
or service source into `apps/site`, `artifacts`, or the runtime image.

## Backup and restore

Stop writes before taking a snapshot. The backup destination must be an
encrypted, owner-only storage location; these scripts make a consistent
SQLite snapshot but do not provide encryption. The outbox is private data and
must be protected/backed up separately when it is needed for delivery replay.

```sh
services/comments/ops/backup.sh \
  /var/lib/firefly-comments/comments.sqlite \
  /encrypted-backups/comments-<date>.sqlite

services/comments/ops/restore.sh \
  /encrypted-backups/comments-<date>.sqlite \
  /var/lib/firefly-comments/comments-restored.sqlite
```

Both commands refuse symlinks and overwrites, run `PRAGMA integrity_check`,
and leave the existing destination untouched on failure. A restore drill must
open the restored database with the service test suite before it is selected
for staging. Never copy a backup into the public repository or publication
tree.

## Staging and release handoff

Use test-only routes, a non-public origin, and a private admin ingress for
staging. Exercise verification, moderation, one-level replies, deletion,
retention, export, and restore with non-production data. Email delivery and
real ingress are operator checks; no deployment or DNS action is automated by
this repository.

The static publication sequence is deliberately separate:

Enable the public comments block with a reviewed HTTPS write origin before
using the M5.1 command; leave the tracked default disabled until that staging
decision is made.

```sh
FIREFLY_COMMENTS_EXPORT=artifacts/comments/comments.public.v1.json \
  ./sam npm run build:m51
```

`./sam` accepts only an existing repository-relative JSON path and passes its
contained `/app/...` equivalent into the build container. The site validates
the schema, digest, and current public post catalog during its static build;
the assembler records the export revision/digest/tombstone epoch and refuses
to promote a candidate older than the epoch already recorded in the last
publication. The service never calls the publication pipeline or receives
release credentials.

## Notification delivery

The HTTP process writes notification events to the private outbox and does not
open an SMTP connection in the submission request. Run the delivery worker as
a separate private process with the same outbox volume:

```sh
./sam npm --prefix services/comments run deliver:notifications
```

The worker records delivered notification IDs in
`COMMENTS_OUTBOX_STATE_PATH`, retries unresolved entries on the next run, and
keeps failure state private. Configure a controlled staging SMTP sink first.
For Zoho Mail, use the account-specific host, port `465` with
`COMMENTS_SMTP_SECURE=true`, or port `587` with
`COMMENTS_SMTP_SECURE=false`; provide a full mailbox username and an
app-specific password when the account requires one. Never commit those
values.
