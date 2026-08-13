# M4 Repository Evidence

## Product Contract

- Root `prd.md:151` limits the Publication Assembler to manifest validation,
  path-collision detection, static copying, and public Experiment-index
  generation. It explicitly forbids HTML rewriting and bundle merging.
- Root `prd.md:153-194` reserves `tooling/validate-experiments/`,
  `tooling/assemble-publication/`, root `artifacts/`, and root `dist/` without
  making the repository an npm workspace.
- Root `prd.md:253-291` defines autonomous `experiments/<id>/` projects,
  versioned manifests, `/lab/<id>` mounts, contained outputs, declared entries,
  listed/unlisted discovery, and preserved licensing.
- Root `prd.md:328` says the main-site Experiment index is derived from
  `experiment.json`, not content front matter.
- Root `prd.md:344-375` assigns `/lab/` to the main site,
  `/lab/<experiment-id>/...` to the Experiment, and includes `ls lab` plus
  `open lab/<id>` in the Terminal MVP.
- Root `prd.md:379-396` fixes NERV at `/lab/nerv/`, retains Astro 4, requires
  `index.html`/`404.html`, keeps its license/disclaimer, and prohibits main-site
  component imports.
- Root `prd.md:398-453` requires validation before builds, separate artifacts,
  fresh assembly, full-release container copying, and unchanged static-runtime
  boundaries.
- Root `prd.md:496-503` requires manifest/path/reference validation plus NERV
  desktop/mobile/reduced-motion browser evidence.
- Root `prd.md:520` defines M4 completion as manifest validation, independent
  builds, publication assembly, successful NERV mounting, and no ordinary-bundle
  pollution.

## Current Package and Route State

- `.trellis/spec/frontend/index.md` records five independent package/application
  lock/build boundaries and a non-workspace root delegate.
- `experiments/nerv/experiment.json` is schema version 1 with ID `nerv`, listed
  visibility, `/lab/nerv`, `/index.html`, local `dist`, one declared landing
  entry, a repository license file, and tags.
- `experiments/nerv/astro.config.mjs` already uses static file output and the
  correct base. Its package remains Astro `^4.16.18` with Playwright `1.62.0`.
- `apps/site/` is Astro `7.1.6`, uses static output with trailing slashes, and
  currently emits exactly five HTML routes. No `/lab/` source route exists.
- `apps/site/src/pages/index.astro` derives the Terminal document index from the
  single `getPublicContent()` projection and creates no Experiment catalog.
- `presentations/terminal/src/runtime.ts` has a strict descriptor-safe document
  decoder and closed effects. It deliberately rejects `ls lab` and
  `open lab/nerv`; completion deliberately omits them.
- `apps/site/src/components/TerminalHome.astro` exposes only post/page recovery
  groups and one inert document template per content entry.
- `apps/site/tests/terminal.spec.ts` and Terminal unit tests lock the M3 absence
  of lab commands, making their change an explicit M4 contract update rather
  than an accidental regression.

## Publication and Runtime Baseline

- Root `package.json` delegates separately to X Core, semantic, Terminal, site,
  and NERV. It has no root lockfile and is not a workspace.
- Root `Dockerfile` currently builds only `experiments/nerv` and copies only its
  local `dist/` to `/usr/share/nginx/html/lab/nerv/`.
- `nginx.conf` currently redirects `/` to `/lab/nerv/` and uses the NERV 404 for
  all misses. M4 must replace those temporary baseline semantics when the full
  site becomes the release root.
- `f1refly.yaml` already constrains the runtime to loopback publication, a
  read-only filesystem, `/tmp` tmpfs, dropped capabilities, and
  `no-new-privileges`.
- `.dockerignore` excludes `.private`, generated output, dependencies, reference
  assets, and prototypes. `.gitignore` already excludes generic `dist/` and
  package browser artifacts but does not yet name root `artifacts/` or new
  tooling browser output.

## Validation Baseline and Gaps

- `.trellis/spec/frontend/quality-guidelines.md` requires exact static inventory,
  path/dependency isolation, package-local builds, focused/full browser evidence,
  and truthful unavailable-result reporting.
- `.trellis/spec/frontend/development-runtime.md` makes `./sam` the only Node/npm/
  browser command boundary and fixes the Playwright image/package pair at
  `1.62.0`.
- NERV Playwright currently checks only title, main/H1, and overflow at desktop
  and mobile viewports. It does not verify favicon, mounted 404, return behavior,
  or reduced motion.
- `experiments/nerv/src/layouts/Layout.astro` runs infinite `scanline` and
  `flicker` animations without a reduced-motion override.
- `experiments/nerv/src/pages/index.astro` always attaches scroll-driven stripe
  motion and does not consult `prefers-reduced-motion`.
- M3 final evidence is fully green and archived under
  `.trellis/tasks/archive/2026-08/08-12-m3-terminal-interface/`; M4 must preserve
  its document, Terminal, package-isolation, and browser contracts while
  replacing only the explicitly deferred lab behavior.

## Planning Conclusion

Repository evidence resolves the M4 product scope without another owner choice:
the approved mainline orders M4 next, the root PRD defines its public behavior and
boundaries, and M3 explicitly names the lab commands/publication path as the M4
stop gate. The remaining choices are technical implementation details captured
in `design.md`; implementation still requires fresh approval after final plan
review.
