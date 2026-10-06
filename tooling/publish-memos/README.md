# Owner Markdown Memo publisher

This package builds a separate static Memo stream. It never reads the blog
workspace, runs site/Experiment builds, syncs blog sources, or changes the blog
release pointer. Visitors read ordinary HTML without JavaScript; only the owner
creates or publishes notes.

Use the complete [owner operation guide](ops/README.md) for configuration and
SSH deployment. The host entry owns authenticated push; Node work runs through
`sam` with `SAM_CONTENT_MODE=none` and narrowly selected Memo mounts.

```sh
tooling/publish-memos/publish.sh new first-note
# Edit locally; change draft: false when ready.
tooling/publish-memos/publish.sh build
tooling/publish-memos/publish.sh publish --dry-run --config config/memos-publisher.json
tooling/publish-memos/publish.sh publish --config config/memos-publisher.json
```

The generic host entry resolves the checkout from its own location, regardless
of the current working directory. `new NAME` always creates an absent draft in
that checkout's `content/memos/`. It accepts `--config FILE` for compatibility
but never reads it or uses it to redirect authoring. Existing notes are never
overwritten. Only the checkout-local authoring directory is selected for writing.

`build` without config reads `content/memos/`, uses display name `Owner`, and
writes a prospective candidate below `.firefly/memos/candidates/`. Missing default
directories are created lazily after checking their parents; symlinks, nonregular
parents and noncanonical paths fail before creation. Install the publisher's
lockfile dependencies through sam before using the entry in a fresh clone.

An explicit `build --config FILE` or publish/rollback config must contain
`displayName`. `sourceRoot` and `outputRoot` are optional and default to the same
checkout-local paths. Present fields must have the correct nonempty types;
explicit null is invalid. Explicitly selected directories must already exist and
be canonical. External source/assets/candidate roots are selected through the
owner's ignored private wrapper and config, not by changing repository defaults.
The private adapter delegates only build/publish/rollback and rejects `new` or
caller config overrides. The shared `new` entry remains checkout-local even if
its compatibility `--config` option is supplied. Build source/assets are mounted
read-only. Publish and rollback still require an explicit owner-owned 0600 config;
SSH, established-history checks and the independent deployment boundary are unchanged.

Each `.md` file has exactly `id`, `createdAt` and `draft` in YAML front matter:

```markdown
---
id: m_stableOwnerId
createdAt: 2026-10-06T00:00:00.000Z
draft: true
---

A short **Markdown** note with a [link](/posts/).
```

`new` creates a random stable ID and UTC time without overwrite. Keep both while
editing. Drafts remain entirely absent from public output. Remove a file or set
it back to draft and publish to withdraw it; the ID becomes retired and cannot
be resurrected by old source or rollback. Deliberate republication uses a new ID.
Owner identity comes from configured `displayName` (or `Owner` for a default build), not record metadata.

Markdown supports paragraphs, links, lists, tables, owned images and inert fenced
code. Significant spaces, indentation, hard breaks and Unicode code points are
preserved. Active HTML/URLs are sanitized. There is no executable Markdown,
article extension/diagram runtime, remote image fetch or browser Markdown parser.
Referenced media must be contained regular files under the selected assets root;
only those referenced files are copied below `/memos/assets/`.

The schema-2 public export declares `bodyFormat: "markdown"` and exactly the four
public record fields. Legacy schema-1 text exports are rejected, never imported
or silently reinterpreted. Each candidate contains `public/` and a private
`receipt.json` outside that subtree. Only `public/` belongs in a static image or
Nginx alias. Candidate validation regenerates sanitized HTML and verifies exact
inventory and digests.

`build` creates a local prospective candidate against null history and never
advances a destination. `publish`/dry-run first read accepted history; automatic
push uploads only Memo, rechecks the expected receipt under the Memo lock, and
atomically switches one pointer selecting public files and matching private state.
Sequence, retired IDs and deletion floor remain authoritative. Missing/corrupt
established history fails closed. First bootstrap can inherit a validated legacy
floor; default zero is not recovery. Rollback builds a new sequence from a retained
candidate against current history and refuses withdrawn content.

The bounded package CLI exposes `new`, `build`, `validate`, `state`, `promote`
and `rollback`, via `SAM_CONTENT_MODE=none ./sam npm --prefix tooling/publish-memos run memos -- <command> ...`. The root npm `memos` alias
also exposes only this CLI. Use the **host shell entry** for SSH and `publish`;
no SSH configuration/key enters the publisher image.

Main-site activation controls navigation/sitemap discovery only; `/memos/` is
reserved even when hidden. Blog builds need no Memo input. Default packaging is
blog-only; explicit `FIREFLY_MEMOS_CANDIDATE` composition serves a prebuilt,
validated read-only artifact without overwriting root `dist/` or Memo history.
The old HTTP/SMTP/worker service is retired; retained private keys, databases and
recovery backups remain outside this publisher.

Run focused checks through the approved wrappers:

```sh
SAM_CONTENT_MODE=none ./sam npm --prefix tooling/publish-memos ci
SAM_CONTENT_MODE=none ./sam npm --prefix tooling/publish-memos run check
SAM_CONTENT_MODE=none ./sam npm --prefix tooling/publish-memos run test
SAM_CONTENT_MODE=none ./preview.sh render npm run test:memos:ops
tooling/publish-memos/ops/check-runtime.sh
```

The operation guide distinguishes synthetic contract/browser/container evidence
from actual remote SSH/TLS acceptance and retained-history recovery.
