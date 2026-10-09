# Terminal File Metadata and Sharing

## 1. Scope / Trigger

Use for post licensing, original Markdown byte provenance, standalone Terminal
metadata, inline `cat` footer and Share. These are site-owned chrome, independent of X Core,
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

`resolveDocumentShareUrl(pathname: string, canonical?: string): string` in
`document-share-url.mjs` applies the existing site canonical precedence, strips
the resolved URL fragment and returns a canonical route only when no absolute
origin/override is configured. Both Terminal document components use it.
`startDocumentShare(root: HTMLElement): void` independently enhances the
standalone `[data-document-sharing]` article, with a WeakSet startup guard.

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

Standalone Terminal title metadata is UTC YYYY-MM-DD date, exact source bytes,
post license and Share, in that order. The compact visible row omits the old
published/updated wording; existing updated SEO metadata remains unchanged.
Pages retain applicable date/bytes/Share without acquiring a post license.
The inline footer follows the body with virtual Markdown path, then the same
date/bytes/post-license sequence. Inline navigation contains centered `Command`,
`Collapse`/`Expand`, `Open`, `Share` actions.
Share metadata uses `resolveSiteMetadata` canonical precedence through the
shared build-time helper, falling back to the canonical route resolved against
browser origin only when origin/override are absent. Open alone receives navigator fragments;
Share remains a permanent, fragment-free HTTP(S) URL without credentials.
Clipboard feedback reports actual success/failure, preserves draft/selection,
stays per output and participates in existing timer/transcript cleanup.

Standalone Share starts independently of navigator availability, including
`navigator = "none"`. Its wrapper/separator and button remain hidden without JS
and are revealed together only after initialization; explicit hidden CSS must
outrank any display rule. Keep the separator and button in one nonbreaking
inline group to avoid an orphan separator on narrow screens. Feedback reserves
the same button width across Share/Copied/Failed; coarse/no-hover targets are
at least 44px. Native button focus is protected from navigator keys.
Concurrent clicks are serialized with a request token. Pagehide retires the
pending token and timer; pageshow restores the usable action without reviving an
older promise's feedback or releasing a newer request. Copy failure is honest
and preserves static metadata and native reading links.

Terminal document Open uses a new tab while the source session remains usable.
The command controller separates document intent from same-tab Experiment
navigation. Synchronously acquire a blank tab within the submit gesture, clear
its opener, then navigate to the validated capability-aware local destination.
Successful command records contain only the submitted line followed by the next
prompt. A truly blocked/failed opening retains a native target-blank noopener
retry link with `[data-terminal-open]`, using the existing href-refresh policy.
Do not interpret the null return of `window.open(..., 'noopener')` as a reliable
blocking signal. Inline Open remains a native target-blank noopener anchor,
preserving modified clicks, original draft/caret and current navigator intent.

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
| Standalone navigator disabled or no JavaScript | Share remains independent when enhanced; static metadata stays readable, no inert visible Share |
| Pagehide/pageshow during pending standalone Share | Old completion cannot revive feedback or reset a newer pending request |
| Document Open succeeds | One new tab, opener null, original session retained, command-only successful record |
| Document Open blocked/throws | Original session remains usable; honest native retry, no same-tab fallback |

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
Original-byte output assertions must locate the physical source through the
content mapping/virtual file identity, not a canonical route slug or hardcoded
fixture basename. Owner files can have numbered prefixes and independent date
or license overrides; compare their actual Buffer, date and validated license
without weakening the separate pinned-fixture default/override assertions.
Browser checks retain repeated-clone IDs, visible reading focus, native modified
Open, collapse/body identity, centered controls, narrow sticky clearance and
Share success/failure/reset/independence with exact copied URL and draft/caret.
Standalone checks cover actual original-byte/default/override rendering, UTC
order, no-JS hidden actions, navigator-none build and enhancement, pending
lifecycle, stable feedback geometry, touch targets and 200% narrow reflow.
New-tab tests assert both popup destination/opener isolation and unchanged
source URL/cwd/history/transcript/input; popup-local Back/Forward and `:q` retain
the existing navigator policies. Experiment launch remains independently tested.

## 7. Wrong vs Correct

Wrong: `Buffer.byteLength(entry.body)` or a generated-file stat is labeled as
original Markdown size. Correct: capture `sourceBytes.length` at the existing
race-checked read, atomically publish provenance with the stage, then project
only that record's validated count into site-owned renderer metadata.
