# Owner Memo contract

Memo is a separate owner-authored Markdown publication mounted at `/memos/`.
The blog's `plugins.memos.enabled` flag controls discovery only. The route is
reserved independently of activation; the blog never reads Memo sources or
exports and its assembler never replaces the Memo release.

`public.mjs` defines schema 2 with required `bodyFormat: "markdown"`. Records
contain exactly `id`, `displayName`, `body`, `createdAt`. Schema 1 service
exports are plain text and are rejected rather than reinterpreted. Markdown
uses canonical LF while preserving whitespace and Unicode code points; owner
display identity is canonical NFC. Digests include the version/body format.

Use the independent package under `tooling/publish-memos` through `./sam`:

```sh
SAM_CONTENT_MODE=none ./sam npm --prefix tooling/publish-memos ci
SAM_CONTENT_MODE=none ./sam npm --prefix tooling/publish-memos run memos -- new first-note
SAM_CONTENT_MODE=none ./sam npm --prefix tooling/publish-memos run memos -- build --display-name Owner
```

Drafts are absent from public output. Each source file starts with exact YAML:

```yaml
---
id: m_stableOwnerId
createdAt: 2026-10-06T00:00:00.000Z
draft: true
---
```

Edit the Markdown body and set `draft: false` to include the note. `new`
creates random IDs/UTC times without overwriting. Keep IDs and creation times
when editing. Withdrawal retires an ID permanently; intentional republication
needs a new ID. Output defaults to ignored `.firefly/memos/`, independently of
blog `artifacts/` and `dist/`.

The renderer supports basic Markdown, GFM lists/tables and inert fenced code.
It sanitizes active HTML; there is no diagram execution, article loader or
browser Markdown runtime. Image URLs must refer to contained owned raster
files under the selected assets root (default `<sourceRoot>/assets`). HTTP(S)
links are allowed; remote images are rejected. Local image/download links are
copied only when referenced. Supported types: PNG/JPEG/GIF/WebP/AVIF/ICO, PDF,
MP3/OGG/WAV/MP4 and text. SVG, HTML and executable asset types are rejected.
Use `![description](assets/photo.png)` or a relative path within that root.
Unicode media paths receive URI encoding. Build never downloads assets.

Candidates contain `public/index.html`, `public/memos.public.v2.json` and
owned `public/assets/`, plus owner-only `receipt.json` outside the served tree.
Validation regenerates canonical sanitized HTML and checks exact inventories
and digests. Accepted receipts retain a monotonic sequence, deletion floor,
retired IDs and accepted creation times. Publication rechecks an expected base
under the Memo lock and atomically changes one `current` pointer selecting both
public data and private history. A fixed owner-only `established` marker
prevents accidental zero-history bootstrap after accepted state disappears;
it does not carry a second content/history pointer. Established missing history fails closed.
Rollback builds a new candidate against current history and refuses retired
content; it never repoints to an older sequence.

The host entry `tooling/publish-memos/publish.sh` owns authenticated automatic
`publish` and its `--dry-run` mode:

```sh
tooling/publish-memos/publish.sh publish --config config/memos-publisher.json
tooling/publish-memos/publish.sh publish --dry-run --config config/memos-publisher.json
```

See [owner operations](../../tooling/publish-memos/ops/README.md) for the private
JSON config, create/edit/draft/withdrawal workflow and independent static mount.
 Owner SSH configuration stays on the host and never enters
the renderer/validator image. The package's `build` is local-only; `state`,
`validate`, `promote` and `rollback` provide the bounded integration commands.
After an ambiguous push, inspect the destination receipt before retrying.

First cutover must inspect any applicable legacy deletion floor. If nonzero,
pass the validated inherited value with `build --initial-deletion-floor N` and
`promote --initial-deletion-floor N`. This seeds a real first candidate, not a
synthetic accepted receipt. A floor argument cannot override established
history; default zero must never substitute for unavailable legacy evidence.
