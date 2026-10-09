# Independent inline chrome and metadata review

## Findings (fixed)

- `terminal-home.ts` initially allowed overlapping clipboard writes on the same
  Share button to overwrite feedback/timer state out of order. Review surfaced
  the issue before handoff; the implementation worker added a per-button
  in-flight guard and a deferred clipboard regression. The test proves duplicate
  clicks serialize, replacement feedback cancels the prior timer, and a pending
  write resolved after `clear` cannot revive detached feedback or overwrite the
  cleared announcement. The reviewer inspected the final guard/test and reused
  the worker's successful affected browser run.
- `source-provenance.test.mjs` originally failed promotion with an unchanged
  candidate, so its count assertion could not distinguish rollback from
  incorrect candidate retention. The reviewer now changes candidate body/byte
  count before failure and compares both prior Markdown and the entire prior
  provenance Buffer. A copy-time source replacement likewise preserves both.
  Withdrawal verifies an empty record map and absent prior Markdown.
- The provenance test now covers authored aggregate and Memo originals across
  transformation, source-byte preservation, malformed snapshot shape/version,
  missing records, unsafe/non-NFC identity, malformed JSON and invalid count
  types/ranges. This complements the existing Unicode/BOM/CRLF, linked-file,
  generated aggregate and unchanged-stage/fresh-source checks.
- `content-build-positive.test.mjs` now gives the post a physical filename
  distinct from its explicit route slug, retaining exact original UTF-8 Buffer
  size, canonical override, license and output-privacy assertions. Its exact
  heading-ID expectation was updated to the physical source identity after an
  initial diagnostic assertion caught the old filename. The worker's existing
  differing page filename/slug coverage was preserved.
- `terminal.spec.ts` previously checked new chrome at default text size only.
  The reviewer added a narrow fine-pointer desktop case at 200% root text: each
  wrapped action row remains centered/contained, controls retain 44px height,
  reading focus remains on the visible authored heading and native heading
  settlement clears the measured sticky bar. No application source change was
  needed for this case.

## Full-scope result

`get_context.py --mode packages` identifies the frontend and Trellis Plus layers
in a single-root repository. Reviewed the latest PRD/design/implementation plan,
metadata research, new file-metadata contract, architecture and prior accepted
reading/mobile/Memo/hint/completion contracts. The original eight changed
application/test/config paths were independently reviewed in the accepted
revision; this review also covered every new/changed materializer, schema,
metadata CLI, helper/declaration, renderer, component, controller, stylesheet,
test and registration path.

Original full-file Buffer lengths are captured before fallback/normalization,
fresh generated-only per-collection sidecars promote with the complete stage,
and the renderer exposes only site-owned provenance siblings. Strict snapshot,
own identity and safe-integer validation are consistent with the helper contract.
The source helper follows the site command cwd rather than relocated prerender
bundle paths. Generated aggregate size/kind and authored aggregate originals
have distinct verified semantics. Whole inventories and host paths are absent
from emitted chrome/publication. No owner source/configuration was rewritten.

The six fixed CC4 descriptors/default belong only to posts; pages and Memo stay
outside the license field. Explicit blog-meta normalization preserves default
and overrides through its output allowlist while keeping body bytes. X Core,
presentation adapters, Terminal runtime payloads and route projection are
unchanged.

Repeated-title templates preserve one inert title marker; startup validates the
first authored heading and clone promotion preserves authored text/IDs while
moving focus/article labeling to that visible heading. Nonrepeated title/body
order remains meaningful. Command/collapse/native Open retain draft, selection,
focus, independent clone state and navigator behavior. Share uses canonical
precedence or browser-origin route fallback separately from Open, with guarded
honest feedback, stable slots and cleanup. Existing observer measurement owns
sticky clearance. The approved wide prose, first-visit hint, completion viewport,
mobile no-shell, Memo targets and lab exclusion remain coherent.

The main session corrected stale content-workspace wording that omitted Share
and could be read as excluding the approved file footer. The reviewer read the
updated paragraph and confirmed the four-action/file-footer contract agrees.

## Verification

- Lint: no dedicated site lint script is configured; `git diff --check` passed.
- TypeCheck/build: stable final worker build checked 145 Astro files with zero
  errors/warnings/hints and passed all 18 static-output checks. Application
  source remained unchanged during the reviewer checks. The review's isolated
  positive build also completed its schema/route/template checks.
- Reviewer Node command, through `preview.sh render` with the tracked content
  and contained fixture configuration: `node --experimental-strip-types --test
  --test-concurrency=1 apps/site/tests/source-provenance.test.mjs
  apps/site/tests/content-build-positive.test.mjs` — **5 passed, zero failures**.
  The initial run had four passes and one stale physical-heading-ID assertion;
  correcting that exact expectation produced the complete pass.
- Reviewer browser command: maintained `terminal.spec.ts` with
  `--grep 'inline chrome wraps centered' --retries=0` — **1 passed**, covering the
  previously unverified 200% narrow desktop/sticky state against stable `dist`.
- Reused worker evidence: 43 targeted Node/content cases; 15 focused maintained
  inline/typing/clear/native-reader browser cases; final affected seven-case
  browser run after slot/pending-Share fixes. Those browser subsets overlap and
  must not be summed as unique coverage. Main-session complete verification and
  packaging remain the final gates.

Independently viewed the final narrow repeated-title/body capture and desktop
post-license footer capture under ignored
`apps/site/artifacts/design-refinement/inline-chrome/after/`. They show the
centered four actions, one visible repeated title, readable path/byte/date/license
footer and retained native wide content. Reported header-to-body geometry and
stable control-slot measurements agree with the implementation report; no
additional material visual change was justified by this review.

## Findings (not fixed)

No unresolved code blocker or source/spec boundary violation remains. Main owns
the complete verification/package gate, final evidence/spec/commit-plan update,
owner subjective review and Git/task lifecycle. Local synthetic Chromium and
fine-pointer/touch emulation do not certify physical devices or assistive
technology. No commit, staging, archive, deployment or remote write was performed
by this reviewer.
