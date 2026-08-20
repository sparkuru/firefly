# M5.1 Comment Publication and Operations — Implementation Plan

1. Add a strict, contained export handoff contract and wrapper tests.
2. Thread export validation and metadata through the site/publication build
   without network reads or service credentials.
3. Extend static/release scans and rollback evidence with comment privacy and
   tombstone checks.
4. Add service container, private-volume, backup/restore, staging fixture, and
   teardown contracts without deploying externally.
5. Run shell syntax/lint, site/assembler checks, full publication build,
   runtime packaging probes, and focused rollback/privacy tests through `./sam`.

Rollback is preserving the existing release and deleting only the contained
candidate/export fixture; never remove a prior immutable release as cleanup.

## Implementation evidence

Implemented the repository-relative `FIREFLY_COMMENTS_EXPORT` handoff in
`sam`, build validation in `apps/site`, comment privacy scanning and
tombstone-aware metadata in `tooling/assemble-publication`, M5.1 root
scripts, `package-runtime.sh` integration, and the private service
container/staging/backup/restore documentation.

Validation passed through `./sam`: shell syntax, ShellCheck, shfmt,
assembler check/test/build, default `build:m4`, and full enabled fixture
`build:m51`. The enabled publication recorded source revision, SHA-256
digest, and tombstone epoch; a rollback test refuses an older epoch while
preserving the prior output. No external deployment or credentials were used.
