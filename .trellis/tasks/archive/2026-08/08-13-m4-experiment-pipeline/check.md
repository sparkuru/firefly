# M4 Experiment pipeline — Final Check Evidence

## Scope and Result

The full M4 delta was independently reviewed after implementation against the
task PRD/design/plan, UUPM decisions, all frontend specs, package/data-flow
boundaries, publication trust/rollback behavior, browser semantics, and the
production-shaped container. Confirmed findings were fixed directly and every
affected suite was rerun. The result is submit-ready for the focused human gate;
it is not yet approved for commit or archive.

## Independent Findings Fixed

1. Experiment roots, outputs, and license paths could escape lexical containment
   through symlinked parents. Discovery and assembly now require realpath
   containment with negative regressions.
2. `artifacts/` and `dist/` promotion was sequential. They now promote as one
   coordinated transaction and restore all prior targets if either move fails.
3. Root/Docker pipelines validated manifests too late and Docker bypassed the
   declared Experiment command. Validation now precedes every product build and
   Docker invokes the shared declared-command path.
4. Artifact scanning missed unsafe/development/source names, extensionless text
   secrets, and directory case collisions. The safe-tree/text/case gates and
   fixtures now cover them.
5. An `experiments/` root symlink could leave the repository. Discovery now
   validates the resolved root and every resolved child directory.
6. NERV/publication browser tests did not fully assert mounted assets, distinct
   404 ownership, native return, and reduced motion. Those paths are now covered.
7. The site passed a default `entryHref` into Terminal's canonical mount decoder.
   Terminal now receives `href`; the semantic `/lab/` index retains `entryHref`.
8. The root `dev.sh` still launched only NERV's `/lab/nerv`-based Astro server,
   so the advertised root origin returned a 404. It now builds and serves the
   complete assembled M4 publication under the existing exact-label lifecycle.
9. Terminal's global printable-key handoff protected native controls but omitted
   standard ARIA widgets. The protected boundary now includes interactive widget
   and composite roles, with desktop/mobile regressions.
10. Terminal `color-scheme` and content measures were partly hard-coded in
    component rules. They now come from the selected root theme's semantic
    tokens, with a static theme-purity contract.

## Non-Browser Evidence

- Runtime: Node `v22.23.1` through `./sam`.
- Type checks: validator, X Core, semantic, Terminal, assembler, site, and NERV
  all pass via `./sam npm run check:m4`.
- Package/integration tests: 49 pass via `./sam npm run test:m4`:
  validator 4, X Core 11, semantic 3, Terminal 9, assembler 4, content 13
  (including four negative Astro builds), and site/X Core 5.
- Site build/static-output: 12 pass; output is exactly six site HTML routes, one
  semantic CSS asset, one home-only Terminal JavaScript asset, two pinned WOFF2
  fonts, their complete OFL/provenance evidence, and no maps or unknown files.
- Clean `./sam npm run publication:m4` passes: exact lockfile installs, manifest-
  before-build order, declared NERV build, safe staging, deterministic 14-file
  assembled release, and no stale candidate output. The later owner-review
  refinement supersedes that inventory with a deterministic 18-file release.
- Trellis context validation passes with 11 implementation and 11 check entries.
- `git diff --check` passes. No repository linter/formatter exists, so none is
  claimed.

## Browser Evidence

- Main site Playwright: 54/54 across JavaScript-disabled static and interactive
  desktop `1440×900` / mobile `375×812` projects. This covers `/lab/`, native
  fallback, lab commands/navigation, existing document commands, recovery,
  keyboard/IME/touch behavior, reduced motion, and containment.
- NERV Playwright: 8/8 across desktop/mobile. This covers mounted title/content,
  favicon/logo, overflow, CSS/scroll reduced motion, three-click cookie/return,
  and independent 404.
- Assembled publication Playwright: 4/4 across desktop/mobile. This covers cross-
  application navigation, mounted assets, distinct 404 ownership, native return,
  reduced motion, and the immutable assembled fixture.
- Review screenshots under `research/screenshots/` cover semantic `/lab/`,
  enhanced Terminal `ls lab`, and NERV with reduced motion on both viewports.
- A final visual-polish delta deduplicates `/lab/` metadata while preserving
  catalog order. Independent post-check verification passes site type-check,
  build with 10/10 static-output tests, and the focused site Playwright suite
  14/14; emitted HTML and both refreshed review captures show exactly
  `LANDING · ASTRO · FAN-WORK`.

## Owner-Review Terminal Refinement

The owner approved R8/AC11–13 after observing abrupt transcript flow, incomplete
`cat ./...` completion, poor output typography, and missing shell-like return to
the active prompt. The checked refinement:

- accepts and completes one exact optional `./` prefix without widening `cat`
  into a filesystem or URL boundary;
- settles short output at the fresh prompt and long-form output at its focused
  reading title, with immediate behavior under reduced motion;
- returns eligible unmodified printable typing to the prompt while preserving
  Space, modifiers, navigation/control keys, IME, selections, native controls,
  links, editables, local-scroll regions, and native/ARIA widgets;
- moves Terminal colors, typography, measures, spacing, shadows, and
  `color-scheme` behind the root `phosphor` theme token block; and
- self-hosts unmodified JetBrains Mono v2.304 Regular/Medium under SIL OFL 1.1,
  with tagged provenance and pinned SHA-256 digests.

Independent post-fix evidence passes Terminal check/build and 9/9 unit tests;
site Astro check/build, 12/12 static, 13 content, and 5 X Core integration tests;
main-site Playwright 54/54; publication Playwright 4/4; full `build:m4`; exact
18-file assembly; Trellis validation; and `git diff --check`. Browser FontFaceSet
checks load both weights. The tagged WOFF2 and OFL bytes match the official
v2.304 release. New desktop `1440×900` and mobile `375×812` captures are
`terminal-refined-desktop.png` and `terminal-refined-mobile.png`.

## Container Evidence

The final Docker Compose image builds and runs the complete assembled release.
Loopback probes verify `/healthz`, `/`, `/lab/`, `/lab/nerv/`, relative canonical
slash redirects, distinct site/NERV 404s including a missing NERV asset,
Content-Security-Policy and other security headers, immutable NERV asset caching,
Nginx UID/GID `101`, and an exact 18-file release-only runtime inventory. The
exact service was torn down after the probes.

The current post-refinement image was rebuilt as
`firefly:local@sha256:3c1b5065ebc82f1a200858582e5c4626b805b13f2e27109012400ddfcee91f10`.
Its exact inventory contains six main HTML routes, two main `_astro` assets, two
WOFF2 fonts, OFL/provenance, and six NERV files. Root/lab/NERV, font and license
URLs, canonical redirects, distinct 404s, cache/security headers, read-only
filesystem, dropped capabilities, `no-new-privileges`, and UID/GID `101` passed.
Runtime font/license hashes match source. The exact service was removed and its
loopback port closed.

The reported development command was also reproduced byte-for-byte with
`WEB_HOST_PORT=4322 ./dev.sh`: the then-current fresh 14-file publication returned `200` with
the expected content at `/`, `/lab/`, and `/lab/nerv/`. The service used the
loopback `4322→4321` mapping and exact `dev.sh`/`web` labels; the matching `down`
command stopped it, left no matching container or process, and closed the port.
Shell syntax, ShellCheck, shfmt, assembler check, and 4/4 assembler tests pass.

## Residuals and Explicit Non-Claims

- NERV retains 19 pre-existing dependency advisories: 2 low, 6 moderate, and 11
  high. Forced or unrelated Astro upgrades remain outside M4.
- No automated accessibility scanner or approved visual-regression baseline
  exists.
- Subjective visual coherence, real-device behavior, and assistive-technology
  behavior remain human residuals.
- No staging host, production traffic, DNS/TLS, live release switch, or M5
  migration action was performed.
- `dev.sh` intentionally serves a freshly assembled immutable snapshot. Source
  changes require restart; package-local hot development remains explicit.
