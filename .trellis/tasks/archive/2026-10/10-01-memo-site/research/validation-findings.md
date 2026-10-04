# Memo site acceptance and final validation

## Outcome

The approved static site child is implemented and independently checked.
The six PRD acceptance criteria pass. No product code changed after the final
reviewer froze source and ran the remaining build/browser gates. The owner approved the Phase 3.4 commit/archive plan on 2026-10-05;
the verified 36-file work batch was committed as `f5bc47c`. Site-only archival
and a separate scoped journal commit follow; the parent and publication/runtime
child remain planning.

## Implemented boundaries

- Manifest-aligned immutable public export adapter with strict raw-byte decoding,
  repository containment, non-symlink regular-file reads and disabled input
  short-circuit.
- Independent public config projection, conditional static `/memos/` route,
  enabled-only route reservation, escaped multiline stream/empty state, and
  exact native URL-encoded visitor form with required unchecked consent.
- Enabled primary/native mobile/desktop recovery links, preserving canonical
  documents, search, Lab and Terminal record projections.
- Raw `FIREFLY_MEMOS_EXPORT` handoff through `sam`, without wrapper file probing
  or value-bearing logging; complete service config template preserved alongside
  a separate public-only site example.
- Synthetic contained build/browser fixtures and a bounded static fixture server
  with malformed-request/file-containment/lifecycle regression coverage.

## Acceptance mapping

| Criterion | Final evidence |
| --- | --- |
| AC1 | Focused enabled/empty static build and newest-first list checks |
| AC2 | Missing/invalid UTF-8/digest/order/private-field gates; symlink/component/escape/FIFO/directory rejection |
| AC3 | Disabled malformed config, absent export, getter/override short-circuit; no route/link/sitemap emission |
| AC4 | Native no-JavaScript desktop/mobile POST of exactly six URL-encoded fields; required unchecked consent; readable service-contract response/return link |
| AC5 | Escaped hostile text/Unicode and multiline/long-text fixtures; generated output privacy scan; desktop/mobile screenshots |
| AC6 | Native memo discovery without inline directory interception; document/search/Lab record isolation; ordinary browser regression |

Enabled route alias-collision coverage proves authored aliases cannot overwrite
the plugin page. The disabled path preserves existing route ownership.

## Final automated evidence

All Node/browser commands ran through the approved container wrappers with
tracked content selected; diagram-capable builds used `./render.sh`.

| Gate | Result |
| --- | --- |
| Repository package checks | Passed; site Astro 125 files, zero errors/warnings |
| `apps/site` focused `test:memos` | 4/4 passed |
| Repaired positive content fixture | 1/1 passed |
| Validator / X Core / semantic / Terminal / assembler tests | 4 / 15 / 3 / 40 / 9 passed |
| Site content / integration / diagrams | 101 / 8 / 15 passed |
| Comments contract / service | 7 / 60 passed |
| `build:m51` | Passed, including experiment builds, static output 18/18 and assembly |
| Ordinary site browser | 157 passed, 139 expected skips, 296 scheduled |
| NERV / publication browser | 8/8 / 6/6 passed |
| Final dedicated memo browser | 3/3 passed: desktop static, mobile static, mobile interactive |
| Shell syntax / ShellCheck / shfmt / diff whitespace | Passed |
| Reviewer runtime cleanup | No matching labelled container or host fixture listener remained |

The implementer also ran enabled and disabled standard site builds, each with
18/18 static-output tests passing, and the disabled wrapper-Node smoke with an
unusable export override. The independent reviewer repeated focused checks and
the equivalent final repository gate.

### Gate continuation and existing-fixture corrections

Do not describe this as one uninterrupted successful `./verify.sh` invocation.
It stopped first at an old directory-script assertion, then the final reviewer
run stopped at an old highlighting fixture. Both were demonstrated from unchanged
HEAD files and established behavior introduced by `08045e3`:

1. `content-build-positive.test.mjs` prohibited all script tags even though
   `TerminalLayout.astro` already emitted its head-only appearance helper. The
   repaired test permits exactly the source-established single inline helper
   and keeps the main, listing and snapshots script-free, with no external/module
   script allowance. It also uses the tracked config example for reproducibility.
2. `mermaid-rendering.test.mjs` supplied no palette attribute/CSS even though
   palette files already owned Shiki colors. Its repaired fixture loads actual
   dark/white palette styles and attributes; distinct token colors, text,
   sanitization and canonical isolation assertions remain intact.

After those test-only corrections, the corrected diagram gate and all remaining
ordered comments/build/site/NERV/publication gates passed. Earlier unchanged
successful package/content/integration evidence was retained. No product theme,
pure memo contract, service state, assembler or runtime deployment was modified
to satisfy these assertions.

## Visual and temporary evidence

The final six page/acceptance PNGs are retained under
`/tmp/firefly-memo-site-evidence/memos-browser/`. The main session inspected
final desktop/mobile page captures and a mobile acceptance capture: escaped
hostile text, preserved line breaks, wrapped long bodies, clear labels/consent
and submit button, and no visible horizontal overflow.

Reviewer logs remain under `/tmp/firefly-memo-check-*.log`; the initial baseline
directory assertion capture is `/tmp/firefly-memo-site-content-positive.log`.
These are local temporary artifacts, not production evidence or source inputs.

## Explicit limits

Browser service HTML was intercepted locally to prove frontend compatibility.
Actual same-origin proxy, trusted client-IP/rate behavior, SMTP, integrated
moderation/export/publication lifecycle, memo publication metadata and epoch
rollback remain with `10-01-memo-publication-runtime`. The site child neither
deploys nor imports historical Typecho data. Parent cross-layer acceptance is
not yet complete.
