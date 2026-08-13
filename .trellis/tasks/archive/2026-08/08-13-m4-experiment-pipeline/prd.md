# M4 Experiment pipeline

## Goal

Deliver the first manifest-driven Experiment publication path for `f1refly` so
the autonomous NERV application can be validated, built, assembled beside the
main site, discovered from `/lab/` and the Terminal home, and served as one
isolated static release without contaminating ordinary blog bundles.

The user value is a repeatable boundary for publishing visually independent
experiments while preserving the Markdown-first blog as the stable, readable
core. NERV proves the boundary; M4 must not specialize the publication contract
so narrowly that a second conforming experiment requires changes to X Core.

## Background and Confirmed Facts

- The product contract in repository-root `prd.md` assigns `/lab/` to a
  main-site index generated from Experiment manifests and
  `/lab/<experiment-id>/...` to autonomous Experiment output.
- `experiments/nerv/` is an Astro 4 application with its own manifest, lockfile,
  source, tests, license, and `dist/`. It is already configured for
  `/lab/nerv`, emits `index.html` and `404.html`, and does not import the main
  site, X Core, or either Presentation package.
- `apps/site/` is an Astro 7 static application. Its current output contains no
  lab route or Experiment runtime/style dependency.
- M3 deliberately leaves `ls lab` and `open lab/<id>` unknown. The approved
  mainline defers those commands until M4 owns a manifest-backed catalog and
  mounted destinations.
- The current Docker image builds and serves only NERV and redirects `/` to
  `/lab/nerv/`. The product contract requires the publication image to copy the
  complete assembled release once the assembler exists.
- All Node/npm/browser commands run through `./sam`; each application retains
  its own package manifest and lockfile. The repository root is a command
  delegate, not an npm workspace.
- NERV's existing Playwright baseline covers title, semantics, and overflow,
  but the durable frontend spec records reduced-motion behavior as an
  unimplemented gap.

## Requirements

### R1 — Discover and validate Experiment manifests

- Discover Experiment directories deterministically from `experiments/` and
  require exactly one `experiment.json` per published Experiment.
- Validate the complete schema and reject unknown or malformed fields,
  unsupported schema versions, duplicate IDs, directory/ID mismatches,
  duplicate or overlapping mount paths, unsafe entry/output/license paths, and
  invalid visibility, kind, build, entry, or tag data.
- Require every mount below `/lab/<id>` and prevent ownership of `/`, `/lab/`,
  blog routes, another Experiment, or paths outside the Experiment directory.
- Produce one canonical, deterministic public catalog. Only `listed`
  Experiments appear in discovery surfaces; `unlisted` Experiments remain
  buildable and directly addressable.
- Manifest validation and catalog generation must not import or execute
  Experiment source code.

### R2 — Build Experiments independently

- Build the main site and each discovered Experiment through its declared
  package-local command and lockfile, without npm workspace coupling or
  cross-project source imports.
- Stage the main-site artifact and each Experiment artifact separately. No
  application may write directly into the final release directory or another
  application's output.
- A failed validation or build must stop before publication assembly and must
  not leave a partially updated final release.
- Preserve NERV's framework/version boundary and license/disclaimer. M4 must not
  perform an unrelated Astro major upgrade or destructive dependency audit fix.

### R3 — Validate staged static artifacts

- Require every manifest-declared entry, default entry, and license file to
  exist where applicable.
- Reject output containing unsafe symlinks, source maps, credentials/private
  data, local absolute paths, or files that escape the declared artifact root.
- Validate local HTML references to emitted CSS, JavaScript, images, fonts, and
  other static files. Root-absolute Experiment URLs must stay within the
  Experiment's declared mount path; relative URLs must resolve inside its
  mounted artifact.
- Detect file and route collisions before assembly, including collisions with
  main-site routes and reserved `/lab/` ownership.

### R4 — Assemble one fresh static release

- Assemble into a newly empty release directory only after every input passes.
  Copy main-site output at the release root and each Experiment output at its
  canonical mount path.
- Emit deterministic publication metadata/catalog data needed by the main-site
  `/lab/` route and Terminal index without importing Experiment components,
  styles, scripts, or framework dependencies.
- The final release contains the main site, `/lab/index.html`, and the complete
  NERV artifact under `/lab/nerv/`, including its independent `404.html` and
  hashed assets.
- Re-running the same inputs produces the same route/file inventory. Stale files
  from an earlier release cannot survive assembly.

### R5 — Add static Experiment discovery surfaces

- Generate an accessible, JavaScript-free `/lab/` main-site route from the
  validated public catalog. Each listed Experiment exposes its title, kind/tags
  where useful, and a native link to its validated default entry.
- Extend the Terminal public index through the same catalog so `help` documents
  `ls lab` and `open lab/<id>`, `ls lab` lists only published `listed`
  Experiments, and `open lab/<id>` yields a validated native destination.
- Unknown, unlisted, malformed, or unpublished Experiment IDs must not produce
  navigable command output. Command parsing remains closed and does not execute
  a shell or accept arbitrary URLs.
- Disabled JavaScript and Terminal recovery continue to expose native access to
  the listed lab destination without loading Experiment assets on the home page.

### R6 — Preserve isolation, accessibility, and failure boundaries

- Ordinary blog HTML, CSS, and JavaScript contain no NERV or other Experiment
  code/style dependency and do not preload Experiment assets.
- NERV remains autonomous at `/lab/nerv/`, keeps its attribution/disclaimer and
  independent 404 behavior, exposes a route back to `/lab/` or `/`, and has no
  document-level overflow at the approved desktop/mobile viewports.
- Continuous NERV motion must respect `prefers-reduced-motion` without removing
  the page's identity or core content.
- A failure in one Experiment's manifest, build, or artifact validation prevents
  the release from being assembled but does not mutate source inputs or a prior
  valid release.

### R7 — Package and verify the complete release

- Update the container build to produce and copy the complete assembled static
  release rather than the NERV-only artifact. `/` serves the Terminal main site;
  `/lab/` serves the generated index; `/lab/nerv/` and its assets remain
  mount-correct.
- Preserve the non-root Nginx runtime, health check, static caching, security
  headers, and explicit trailing-slash/error behavior without claiming staging
  or production rollout.
- Automated checks cover manifest negatives, catalog determinism, staged-output
  validation, collision/secret/path rejection, clean assembly, main-site lab
  discovery, Terminal commands, NERV routes/assets/404, reduced motion, and
  ordinary-bundle isolation.

### R8 — Refine the Terminal session rhythm from owner review

- Replace the current append-only webpage feel with explicit command-session
  viewport behavior. Short command results must reveal the newly ready prompt;
  inline documents must reveal their reading start without forcing the user to
  hunt below the fold, and a later typing gesture must provide a predictable
  route back to the active prompt.
- Treat `cat ./<filename>` as the shell-style spelling of the same closed public
  document operand as `cat <filename>`. Completion and execution must normalize
  only that exact optional `./` prefix; they must not accept traversal, arbitrary
  paths, URLs, or new filesystem semantics.
- Replace the incidental monospace stack with one deliberately selected,
  readable Terminal type system. Self-host the official JetBrains Mono webfont
  under SIL Open Font License 1.1, preserve its license and pinned provenance,
  emit no third-party runtime font request, and retain a local/system monospace
  fallback including CJK coverage.
- Define the Terminal visual system through semantic theme tokens for surface,
  foreground, prompt/accent, muted text, warning, error, border, focus,
  typography, measure, and rhythm. M4 may keep one default theme; future themes
  must be addable by one root theme selector/attribute without component-level
  color rewrites.
- Global typing-to-prompt behavior must preserve browser, operating-system,
  assistive-technology, link/control, selection, and IME interactions. Only an
  unmodified printable character may redirect focus and enter that character,
  and only when focus is outside an interactive/editable control and there is no
  active text selection. Tab, Space, Enter, Escape, navigation keys, modifier
  chords, IME composition, and assistive/browser shortcuts remain native.

## Acceptance Criteria

- [ ] AC1: Valid NERV and representative fixture manifests produce a stable
      canonical catalog; malformed schema, duplicate ownership, traversal,
      symlink, and unsafe path cases fail with actionable diagnostics.
- [ ] AC2: One reproducible command validates inputs, builds the M3 dependency
      graph plus NERV in their own project boundaries, validates staged outputs,
      and assembles only after all preceding stages pass.
- [ ] AC3: The assembled release contains the main-site routes at root,
      `/lab/index.html`, and NERV's declared entry, `404.html`, favicon, and
      referenced hashed assets under `/lab/nerv/`, with no unexpected route or
      file collisions.
- [ ] AC4: `/lab/` is readable without JavaScript and links only listed,
      validated Experiments to their default entries; an unlisted fixture stays
      absent from the index while remaining valid for direct mounting.
- [ ] AC5: Terminal `help`, `ls lab`, and `open lab/nerv` behave
      deterministically across unit and browser coverage; invalid/unlisted IDs
      do not navigate, and native fallback/recovery links remain available.
- [ ] AC6: Main-site routes and ordinary bundles contain no Experiment source,
      CSS, script, or framework dependency; NERV failure cannot partially
      overwrite a previously assembled release.
- [ ] AC7: Desktop/mobile browser checks verify the lab index, NERV default
      entry, independent 404, favicon/local assets, return path, no overflow,
      and reduced-motion behavior at its mounted path.
- [ ] AC8: The production-shaped container serves the complete assembled
      release as non-root Nginx, passes `/healthz`, serves `/` and `/lab/`, and
      preserves mount-correct NERV caching/404 behavior.
- [ ] AC9: Existing X Core, semantic, Terminal, site content/integration/static,
      main-site Playwright, and NERV check/build/browser suites remain green
      through `./sam`; unavailable material checks are reported as unavailable,
      not passed.
- [ ] AC10: Durable frontend specs describe the implemented manifest,
      catalog, staging, assembler, Terminal lab-command, route, container, and
      validation contracts without presenting M5 migration or M6/M7 rollout as
      complete.
- [ ] AC11: At both approved viewports, short command output automatically
      reveals the active prompt, inline `cat` output begins at a readable
      viewport position, and an eligible typing gesture returns to and types in
      the prompt without swallowing protected browser/accessibility keys.
- [ ] AC12: `cat <prefix><Tab>` and `cat ./<prefix><Tab>` complete the same
      validated public filename and keep focus in the command input; unsafe or
      unmatched operands remain closed and non-navigating.
- [ ] AC13: Terminal colors, typography, focus, and output hierarchy consume a
      semantic root theme contract. The default theme remains readable and
      contrast-safe at desktop/mobile and under reduced motion. The official
      self-hosted JetBrains Mono WOFF2 loads from the site release with its OFL
      license/provenance, no third-party request, and no Experiment asset coupling.

## Out of Scope

- Full migration of the 93 posts, 7 pages, 189 approved comments, attachments,
  aliases, timeline/files semantics, RSS, sitemap, or production canonical URLs
  (M5 and later).
- Staging deployment, public DNS/TLS/proxy changes, production traffic switch,
  immutable release retention policy, or live-server rollback execution (M6/M7).
- A generic third-party Experiment marketplace, dynamic plugin loader, remote
  manifest registry, runtime API, server-side command service, or browser fetch
  for catalog data.
- Rewriting NERV into the main-site Astro version, importing its components into
  the blog, redesigning its established visual identity, or resolving the
  pre-existing dependency audit advisories through forced upgrades.
- Publishing a second product Experiment. Fixtures may prove that the contract
  is not NERV-specific, but NERV is the only M4 product mount.
- Executing arbitrary manifest shell text from browser input or treating
  untrusted external manifests as a supported extension boundary.

## Risks and Deferred Items

- HTML/CSS URL validation must distinguish local static references from
  fragments, data URLs, and intentionally external URLs without rewriting
  Experiment output.
- Atomic replacement semantics for a live host belong to rollout; M4 still must
  assemble into a fresh directory and leave a previous release untouched on
  failure.
- NERV's Astro 4 dependency advisories remain tracked but are not remediated by
  destructive or unrelated upgrades in M4.
- Real-device, assistive-technology, and subjective visual review remain human
  residuals after automated checks.
- A visible theme picker and persisted user theme preference are deferred unless
  owner review explicitly brings them into M4. The current request requires a
  theme-ready architecture, not necessarily multiple shipped themes.

## Notes

- This is a complex task. Planning requires `design.md`, `implement.md`, and real
  curated `implement.jsonl` / `check.jsonl` context before implementation can be
  proposed.
- Task creation and planning approval do not authorize `task.py start`, product
  code edits, commit, or archive.
