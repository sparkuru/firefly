# Independent publisher image preparation

## Result and boundary

Prepared and locally validated one independent owner-Markdown publisher image
on 2026-10-06. The exact image tag/content ID, archive path, byte size and SHA-256
are held in an owner-only temporary handoff supplied privately to the main
session. No remote action, owner input, credentials, mail, blog publication or
long-running service was involved. This report does not claim production or
integrated task acceptance.

## Stable source and isolated build

The core implementer confirmed its final source/stylesheet checks before any
context copy. Five supplied key source hashes matched. The complete 15-file
context matched the source snapshot, and that snapshot remained unchanged
through build and fixture validation. Concurrent repository work was preserved;
this worker changed only this research report.

The temporary Docker context contained only:

- `tooling/publish-memos/Dockerfile`, `package.json`, `package-lock.json`, and
  its eight `src/` files;
- `plugins/memos/public.mjs` and `validation.mjs`;
- `tooling/shared/contained-file.mjs` and `markdown-html-policy.mjs`.

The repository was never used as the Docker build context. No blog source,
owner config, keys, private receipt/state, task records or fixture data entered
the context. The unique task tag was confirmed absent before creation.
Build used `linux/amd64`, task ownership label
`firefly.publisher-image=<run-id>`, and process `umask 022`. Public context files
were 0644. Logs/archive were precreated at 0600 inside a 0700 temporary directory.

## Checks executed

| Gate | Result |
| --- | --- |
| Allowlist and frozen-source/context comparison | pass; exactly 15 files |
| Minimal-context Docker build | pass |
| Image metadata | pass; Linux/amd64, `USER node`, publisher cwd, `node src/cli.mjs` entrypoint; no exposed port or service healthcheck |
| Offline image inventory | pass; UID 1000, CLI/dependencies/pure contracts/shared policy present; site/content/config/service/secret trees absent |
| Empty candidate generation through `sam` | pass; explicit `SAM_CONTENT_MODE=none`, synthetic empty source readonly, selected work root writable |
| Image CLI `validate --candidate-root /candidate` | pass; valid empty schema-2 Markdown candidate, first sequence, null expected base |
| Image CLI `state --deployment-root /memo` before promotion | pass; null state for the isolated empty destination |
| Image CLI `promote --candidate-root /candidate --deployment-root /memo --expected-base null` | pass; first promotion completed |
| Image CLI state after promotion | pass; exact receipt equality with candidate validation and promotion results |
| Promoted file modes and static inventory | pass; deployment/release/public directories 0755, three public files 0644, receipt and established marker 0600 |
| Empty static surface | pass; canonical empty message, schema 2 / Markdown format / zero records, no form or script |
| Single-image save and checksum | pass; archive contains exactly the task tag, config content hash matches inspected image ID; archive/handoff/digest owner-only |
| Exact runtime and fixture cleanup | pass; no container bearing the preparation label remains; only the task-owned synthetic fixture tree removed |

The checked wrapper provided no-content mode and narrow external Memo mounts.
Its baseline repository mount remained for executing the reviewed Node code;
generation selected no blog/config inputs and read only the synthetic source.
All image runtime probes used `--network none`, a read-only root, dropped
capabilities, no-new-privileges and a bounded 16 MiB `/tmp` tmpfs. Only the
bootstrap promotion had a writable fixture deployment mount; candidates were
read-only. No runtime network, host port or owner mount was added.

## Handoff and limits

The image tag, matching archive/digest and owner-only logs/context are retained
for the main session's approved production loading. Keep that exact tag/archive
until loading and transfer verification finish; then remove only their owned
temporary artifacts. Local fixture inputs and releases are already removed.

The core's source check/unit tests were reported separately and were not
repeated here. This image fixture proves the empty candidate/receipt/bootstrap
path and artifact confinement. Real static serving, automatic SSH publishing,
blog byte preservation, browser reading and remote promotion remain separate
main-session/integration gates.
