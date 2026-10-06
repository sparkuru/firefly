# Execution and Acceptance Evidence

Implementation is complete and independently checked. Git/commit/archive
bookkeeping received the required one-shot owner confirmation and the combined
work was committed as `82131db`. The completed task is archived. No production
publication, remote validator installation or SSH operation was performed.

## Corpus and Preservation

- Initial external source inventory was empty.
- Exactly 89 nonempty owner notes became `draft: false` Markdown sources.
  All 287 empty records were excluded without placeholders.
- UTC+8 source dates were converted by subtracting eight hours to canonical UTC;
  original values and correspondence remain in private migration evidence.
- Original SHA-256 remained
  `66f38b90cb8beef5da81ba27eab7d98b55718ad555ccf8da2bfc337a67c0c94a`
  for both retained ledgers. Two notes with equal bodies retain separate IDs.
- All 343 allowed conversion patches reconstruct complete bodies exactly;
  every fenced/inline code span remains byte-identical. No content truncation,
  splitting, extra title insertion or private metadata projection occurred.

## Images and Links

- 218 distinct image references / 224 uses were accounted for.
- 215 web resources were retrieved and verified, deduplicating to 211 assets.
  These serve 221 image uses. One HTTP 404 remains an ordinary original link;
  two absent relative images retain visible caption/target text.
- Requests were limited to the exact inventory and its fixed host set, with
  public destination/redirect checks, 12-second request timeout, bounded redirects
  and a 16 MiB per-asset limit. No unrelated resource crawl or credentials.
- Full source correspondence found 37 old-note links to 30 included notes,
  superseding the earlier partial 23/18 scan. Forty unavailable legacy targets
  and one malformed relative link retain visible original targets; three old
  suffix semantics are explicitly recorded as unsupported.
- A real browser check caught bare/angle links becoming nonclickable after a
  relative target rewrite. Explicit Markdown links fixed all 28 affected uses.
  Three synthetic forms and full-corpus in-memory rendering verified the fix.

## File Promotion

The exact 300-file inventory (89 sources + 211 assets) was staged and strictly
validated before external installation. Initial writes used exclusive/no-follow
creation; no preexisting target file was overwritten. Five task-created notes
subsequently needed the autolink correction. Their old hashes and canonical
paths were verified before atomic replacement; all 300 final bytes were rechecked.
Old generated notes/report are retained privately for correction rollback.

The existing private external adapter built and validated the final actual-source
candidate. A separate check compared all 89 IDs/timestamps/body hashes and 211
assets with the conversion report and public wire export. The largest converted
body is 70614 bytes; pure body/source bounds are 128 KiB / 256 KiB.

## Checks

| Check | Result |
| --- | --- |
| Pure contract suite | 11/11 pass |
| Pure syntax and declaration type checks | Pass |
| Publisher syntax/type check | Pass |
| Publisher suite, including long-body/file bounds | 16/16 pass |
| Publication integration | 4/4 pass |
| Site Memo integration under pinned rendering image | 4/4 pass |
| Maintained synthetic Memo browser matrix | 6/6 pass |
| Actual-corpus desktop no-JS reading | 89 notes, 221 decoded images, 37 anchors; pass |
| Actual-corpus mobile no-JS reading | 89 notes, 221 decoded images, 37 anchors; pass |
| Independent corpus/code/time/file/link/media audit | Pass |
| Scoped whitespace/context manifest validation | Pass |

Both real-corpus viewports had zero horizontal overflow, failed requests or
external requests. Screenshots and actual data/config stay in ignored private
evidence; tracked regression fixtures contain no real owner content.

The initial site integration invocation used Node Alpine and lacked the Mermaid
browser dependency; the required `preview.sh render` environment passed. The
initial private browser script's CommonJS import was corrected before evidence
collection. The first real browser also exposed the autolink defect; final
evidence above is from the corrected real candidate.

## Remaining Boundary

No unresolved implementation defect or user content decision remains. Review
classifies the mechanical import as `human-not-needed`; physical devices and
production access were outside scope. Later remote publication must use a
validator image supporting the enlarged body contract. The owner approved the
exact combined publisher/import commit scope; work commit `82131db` contains
that reviewed scope and excludes external authoring content and private artifacts.
