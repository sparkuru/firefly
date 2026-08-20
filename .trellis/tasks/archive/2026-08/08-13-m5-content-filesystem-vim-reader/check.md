# M5 content filesystem and Vim reader — Check Report

## Result

Submit-ready after independent full-scope review. All confirmed findings were
fixed and every affected gate was rerun. No product blocker remains. Commit and
archive still require explicit owner approval.

## Independent Findings and Resolutions

1. **Symlink mount containment and chains** — `sam` could incompletely expose
   intermediate link hops and needed stronger broad-directory/special-node
   rejection. It now uses unresolved-hop-aware path normalization, exact same-
   path read-only mounts, recursive chain discovery, and real Docker positive and
   hostile probes.
2. **Materializer scan/copy race** — a source could change after scanning. Copy
   now opens with `O_NOFOLLOW`, verifies regular-file type plus device/inode, and
   preserves the prior generated stage on failure. A scan-to-symlink swap test
   covers it.
3. **Unicode/path boundary drift** — workspace, schema, canonical route, aliases,
   Terminal decoding, operands, and completion did not initially share the full
   hidden/traversal/percent/backslash/non-NFC/fold-collision boundary. They now
   reject consistently, including NFKC case folding for `ß` and final sigma.
4. **Command registry coupling** — help was coupled to default definition order.
   It now reads the active immutable registry; definitions validate metadata and
   handlers. A custom command/alias fixture proves help, lookup, execution, and
   completion extension without central-switch edits.
5. **Reader ownership and accessibility** — generated unit IDs could collide;
   protected targets omitted several ARIA/native roles; an old reader Range could
   clear a user-replaced selection. IDs now avoid the full document set, native/
   ARIA/local-scroll exclusions are complete, ownership compares exact live Range
   boundaries, and visual state is cleared before search/command transitions.
6. **Runtime publication proof** — packaging validated release shape but needed
   exact publication-manifest/release/image equality and stronger private/font/
   license/header probes. `package-runtime.sh` now gates all three 23-file
   inventories before reporting success.
7. **Terminal follow-up from owner review** — four reproduced defects remained:
   prompt `Ctrl+C` had no cancellation branch; long `help` centered only the
   prompt and clipped the record start; ambiguous safe path Tab escaped into
   browser chrome; and `ls` exposed internal virtual paths that were not always
   usable from the posts cwd. The controller/runtime now implement bounded
   cancellation, record-start settlement, explicit safe-path Tab ownership, and
   executable post-relative/page-absolute operand formatting. Independent review
   also corrected relative-path help wording and strengthened history-cursor,
   modifier, exact tree-content, and focus regressions.
8. **Safe zero-result Tab follow-up** — `cat 1<Tab>` still escaped because a
   syntactically safe zero-candidate path shared generic native `none`. A distinct
   exhaustive `no-match` result now owns Tab, retains exact input/focus, and
   displays `No matches.` for safe relative/absolute cat/vim paths. Unsafe,
   control-character, non-NFC, modifier, IME, list, and unrelated command cases
   remain native. Independent review found and fixed the control-character gap.
9. **Exact permalink path grammar** — the first breadcrumb interpretation kept
   literal `cd` and uniform separators. It now renders exactly
   `guest@firefly:~/blog $ / posts / characters / nahida.md`: root and parents
   are underlined native links; the underlined current filename is non-link
   `aria-current`; duplicate/glued slashes and `cd` are absent. Desktop/mobile
   wrapping, focus-visible behavior, and no-overflow assertions pass.
10. **Non-collapsible breadcrumb spacing** — normalized DOM text still rendered
    `posts/characters` because flex items collapsed separator-adjacent whitespace.
    The component now owns explicit `1ch` gap boxes and slash separator elements.
    Independent review strengthened the test to measure all six gaps directly,
    so legitimate mobile wrapping does not cause false failures while zero visual
    spacing remains a regression.

## Automated Evidence

- `./sam npm run check:m4`: all seven package/application checks pass; main site
  reports 40 files with 0 errors, warnings, or hints; NERV reports 14 files with
  0 diagnostics.
- `./sam npm run test:m4`: 58 non-browser tests pass across validator, X Core,
  semantic, Terminal, assembler, content/access/materializer/schema/negative
  builds, and site integration.
- `./sam npm run build:m4`: passes and assembles exactly 23 files.
- Main-site Playwright: 68/68 across static and interactive desktop/mobile
  projects, including nested routes, breadcrumbs, tree/cat/vim, reader modes,
  Range ownership, native/ARIA exclusions, IME, reduced motion, and recovery.
- Assembled-publication Playwright: 4/4.
- Review capture: 2/2, producing sixteen checked PNGs for tree, nested directory,
  breadcrumb, reader normal/search/visual, help settlement, and path completion
  at `1440x900` and `375x812`.
- Latest owner follow-up refreshes the breadcrumb and path-completion desktop/
  mobile pairs; all four were inspected for exact tokens, underlines, focus,
  bounded `No matches.`, and mobile containment.
- External workspace E2E: native Markdown plus chained file/directory links;
  exact mounts are read-only, broad/broken/FIFO inputs fail, built routes exist,
  generated stage has zero symlinks, and private/host-path sentinels are absent.
  The default ten-page site build was restored afterward.
- Runtime-only image `firefly:m5-runtime`: minimal 478.46 kB build context,
  `User=nginx`, read-only rootfs, all capabilities dropped, no-new-privileges,
  exact 23-file manifest/release/image equality, nested route/redirect, distinct
  site/NERV 404, security, immutable reader/font cache, and teardown probes pass.
- `bash -n`, ShellCheck, shfmt, executable modes, Trellis task-context validation,
  and `git diff --check` pass. No transient test containers, runners, reports,
  candidates, backups, or temporary workspaces remain; the runtime image and
  expected built outputs are intentionally retained. The owner review service on
  loopback port 4322 is intentionally preserved and is not validation residue.

## Human Review Gate

Review the sixteen screenshots under `research/screenshots/`, especially:

- breadcrumb clarity and link/current-file distinction;
- tree and directory readability at desktop/mobile widths;
- reader normal, search, and real visual-selection states;
- complete help output/prompt settlement and focused `vim ./` ambiguity;
- subjective feel on a real device and assistive-technology behavior.

Automated evidence covers structure, keyboard boundaries, focus, overflow,
reduced motion, routes, and containment. Subjective visual quality, real devices,
assistive technology, and private deployment environments remain human residuals.

## Scope Boundaries Preserved

- Current production projection is guest only; user/admin are pure future seams,
  not authentication or runtime authorization.
- Linked local images/attachments, full content migration, staging rollout, and
  production rollout remain outside this prelude.
- NERV retains its pre-existing dependency audit advisories; no forced upgrade
  or unrelated framework change was made.
