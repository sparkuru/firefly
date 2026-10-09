# Terminal File Metadata and Sharing

## 1. Scope / Trigger

Use for post licensing, original Markdown byte provenance, inline `cat` footer
metadata and Share. These are site-owned chrome, independent of X Core,
presentation/runtime entry payloads, routes, Memo licensing and authored bytes.

## 2. Signatures

```ts
readSourceProvenance(collection: string, id: string, options?: { root?: string })
  : Promise<{ readonly kind: 'authored' | 'generated'; readonly sourceByteLength: number }>
```

`source-provenance.mjs` reads the generated stage. Site commands run with
`apps/site` as cwd, so its default root is `path.resolve('.generated-content')`;
tests may supply a contained root. Do not derive the stage from `import.meta.url`
inside prerender-bundled code: the bundle may live in the output directory.
`renderDocument(entry)` exposes `sourceByteLength` and `sourceKind` alongside
Core metadata, without expanding its strict decoded payload.

Post `license` is one of `CC-BY-4.0`, `CC-BY-SA-4.0`, `CC-BY-ND-4.0`,
`CC-BY-NC-4.0`, `CC-BY-NC-SA-4.0`, `CC-BY-NC-ND-4.0`; omission defaults to
`CC-BY-NC-4.0`. `post-license.mjs` exports `DEFAULT_POST_LICENSE`,
`POST_LICENSE_IDS`, and the frozen `POST_LICENSES` label/deed mapping.
`getPostLicense(id: unknown)` validates an own descriptor key and returns its
typed label/link; components use this boundary instead of indexing with the
generated Astro metadata's `any` type.

## 3. Contracts

Materialization captures the checked original UTF-8 Buffer length before
fallback frontmatter, heading normalization or Memo staging transforms. Each
collection candidate includes generated-only `.source-provenance.json`:

```json
{"version":1,"records":{"infra/example.md":{"kind":"authored","sourceByteLength":123}}}
```

The entire Markdown/provenance candidate promotes atomically. Every rebuild
creates fresh records, including empty collections. Automatically generated
`pages/memos.md` records `kind: "generated"` and the generated Markdown Buffer
length; an owner-authored aggregate uses its actual original Buffer. No
filesystem path, source root, inode or private inventory is projected to HTML.

Identity is collection-relative NFC Markdown identity, with no empty/dot,
escape/control or unsafe path segments. Snapshot and record keys are exact;
counts are nonnegative safe integers, kind is exact, and the requested record
must be an own property. Read fresh provenance rather than a stale global cache
or a transformed-file fallback. Source byte counts are not authored metadata.

License belongs to the strict post schema, not shared page/Memo metadata.
Build defaults do not rewrite owner files. The existing `blog-meta` output
allowlist preserves the field during explicit normalization, including default
and overrides, while preserving body bytes. Footer license links use the fixed
official mapping, never authored arbitrary HTML/URLs.

Inline navigation contains centered `Command`, `Collapse`/`Expand`, `Open`,
`Share` actions. The footer follows the body with virtual Markdown path, exact
bytes, date and post license. Share metadata uses `resolveSiteMetadata` canonical
precedence, falling back to the canonical route resolved against browser origin
only when origin/override are absent. Open alone receives navigator fragments;
Share remains a permanent, fragment-free HTTP(S) URL without credentials.
Clipboard feedback reports actual success/failure, preserves draft/selection,
stays per output and participates in existing timer/transcript cleanup.

## 4. Validation & Error Matrix

| Input or condition | Required behavior |
| --- | --- |
| Missing/malformed provenance, unsafe identity, wrong version/keys/kind/count | Fail clearly; never use rendered/staged text as original size |
| Copy/sidecar/promotion failure | Preserve previous stage and its provenance |
| Original size changes while normalized Markdown stays identical | Next render reads the fresh size |
| Missing post license | Default CC-BY-NC-4.0 |
| Invalid/null/unknown/wrong-version license or authored size field | Strict schema failure, no source rewrite |
| Page/Memo entry | No post license default added |
| Clipboard unavailable/rejected | Honest failure; native Open remains usable |
| Clear/fatal transition during pending clipboard | No late detached output feedback or retained timers |

## 5. Good / Base / Bad Cases

- Good: Chinese/emoji Markdown with frontmatter reports the full original
  Buffer length even after H1 normalization; a slug override keeps physical
  virtual-file identity in the footer.
- Base: `license: CC-BY-SA-4.0` selects its fixed label/link; omission selects
  the default, and a page footer shows only its applicable file metadata.
- Bad: byte size comes from `textContent`, a frontmatter number, rendered HTML,
  or normalized staging bytes; sharing copies the homepage or navigator hash.

## 6. Tests Required

Cover Unicode/frontmatter/BOM/CRLF counts, unchanged-stage/fresh-source sizes,
rollback/withdrawal, generated aggregate and missing/invalid provenance. Test
all license overrides/defaults/rejections and metadata-writer body preservation.
An isolated build verifies source bytes, virtual identity despite slug, footer
order, no published sidecar/host path, and correct license/canonical override.
Browser checks retain repeated-clone IDs, visible reading focus, native modified
Open, collapse/body identity, centered controls, narrow sticky clearance and
Share success/failure/reset/independence with exact copied URL and draft/caret.

## 7. Wrong vs Correct

Wrong: `Buffer.byteLength(entry.body)` or a generated-file stat is labeled as
original Markdown size. Correct: capture `sourceBytes.length` at the existing
race-checked read, atomically publish provenance with the stage, then project
only that record's validated count into site-owned renderer metadata.
