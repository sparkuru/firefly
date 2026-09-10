# Technical design: majo static Experiment

## Boundary and architecture

`experiments/majo/` is an autonomous static Experiment, following the existing
NERV package boundary. The main site knows only the manifest-projected catalog;
it does not import majo source, styles, media, or runtime code.

Planned package shape:

```text
experiments/majo/
├── experiment.json
├── package.json
├── astro.config.mjs
├── tsconfig.json
├── license
├── media-sources.md
├── scripts/
│   └── build.mjs
├── src/
│   ├── layouts/Layout.astro
│   ├── pages/index.astro
│   ├── pages/404.astro
│   ├── styles/majo.css
│   └── scripts/majo-player.ts
├── tests/majo.spec.ts
└── public/media/                 # ignored, owner-supplied only
    ├── images/{slide-01,slide-02,slide-03,preload-04,preload-05}.*
    └── music/{track-01,track-02,track-03}.mp3
```

Astro is used only as the package-local static compiler already used by NERV.
The page implementation is new: no Swiper, Bootstrap, jQuery, icon font, or
target bundle is installed. Astro's output is the publication artifact, not a
runtime dependency.

## Manifest and build contract

The manifest uses schema version 1:

- `id: "majo"`, `visibility: "listed"`, `mountPath: "/lab/majo"`;
- one `landing` entry at `/index.html`;
- `build.tool: "astro"`, `command: "npm run build"`, `outputDir: "dist"`;
- a tracked `license` file and tags that describe the static carousel/music
  experiment without claiming rights over the local media.

`astro.config.mjs` sets `base: '/lab/majo'` and static file output. This keeps
all generated references mount-relative after assembly.

`public/media/` is the ignored Astro public directory. Astro copies it into
`dist/media/`, so `scripts/build.mjs` owns validation of the boundary without
manually copying any binary:

1. Resolve the package root and verify every required canonical image/audio file
   is a regular file inside `public/media/`.
2. Run the package's Astro type check and static build, allowing Astro's public
   directory handling to emit `dist/media/`.
3. Verify the expected emitted entry and `dist/media/` files exist; fail with
   the exact missing input path if not.

The output directory remains ignored by the repository's existing `dist/` rule.
The root `.gitignore` will add an explicit `experiments/majo/public/media/`
entry and majo test-artifact rules so a future ignore-rule change cannot
accidentally stage the media.

The build script does not download, transform, or substitute media. This makes
the missing-input failure deterministic and prevents a production build from
quietly acquiring third-party content.

## Page structure and data flow

The page renders all three slides in static HTML. Each slide has:

- a semantic slide root with a stable `data-slide-index`;
- a background element using a local asset URL;
- the corresponding text content;
- a source-independent credit/metadata label.

The initial HTML marks slide 0 active and leaves its content visible without
JavaScript. The controller adds an enhancement marker, initializes preload and
controls, and updates a single state owner:

```text
static HTML + local URLs
        ↓
preload coordinator (5 images)
        ↓
carousel state { activeIndex, ready, reducedMotion }
        ↓                 ↓
slide/pagination DOM     track/audio state
        ↓                 ↓
visual transition        progress/play/ended controls
```

There is no runtime JSON registry or browser-generated URL. Track metadata and
the five-image preload list are module-local typed constants, so the HTML,
controller, and tests share one source of truth inside the Experiment package.

## Loading behavior

The controller marks the document loading state and displays the mask only after
JavaScript enhancement starts; a no-JS document therefore remains usable. The
five image preload promises settle on either `load` or `error`. When all settle,
the mask is removed and the page exposes `data-majo-ready="true"`.

This preserves the target's wait-for-five-images behavior while fixing its
permanent-overlay failure mode. A bounded fallback is not needed if each image
promise settles on error; no failed image can block the ready transition.

## Carousel and text motion

The controller owns the active index and applies `is-active`/`aria-hidden`
attributes to the three slides. Pagination buttons call the same transition
function as keyboard navigation. CSS implements the target's observable motion:

- opacity fade around 1500 ms;
- background transform from an oversized scale to normal scale over around ten
  seconds after activation;
- first-slide quote paragraphs revealed on the observed two-second cadence with
  a four-second opacity transition.

`prefers-reduced-motion` is read through `matchMedia`; CSS and controller logic
disable continuous zoom and make state transitions immediate while keeping the
same active slide and controls.

## Audio controls

The audio element is local and has no autoplay attribute. After a slide change,
the controller assigns the corresponding local track, calls `load()`, and makes
a best-effort `play()` call. A rejected promise is caught and leaves the play
button in a paused state. User activation on the accessible button always calls
the same play/pause transition.

The progress control is a keyboard-operable range input. `timeupdate` updates
its value; `durationchange` updates the maximum; input/change seeks only when a
finite duration is available. `ended` advances to the next slide, preserving the
target's coupling between track order and pagination.

## Publication and runtime integration

The implementation must update only the integration points required by the new
manifest and package:

- root package scripts for majo install/check/build and the complete build graph;
- Docker builder installation for `experiments/majo` before the generic
  `build:experiments` command;
- root ignore rules for `public/media` and majo test output;
- focused majo tests plus publication tests/catalog expectations that currently
  assume NERV is the only listed Experiment.

No Nginx route is required: the generic `/` `try_files` route serves ordinary
files at `/lab/majo/`. If the runtime probe is extended, it should check majo's
entry and one image/audio asset without adding a majo-specific cache policy.

## Failure and rollback behavior

- Missing `public/media` input: fail before a successful majo build; do not publish an
  external fallback.
- Astro/type/build failure: propagate the package command's non-zero status;
  assembler does not stage the Experiment.
- Unsafe output/symlink/source artifact: let the existing validator/assembler
  reject the candidate before promotion.
- Publication failure: rely on the existing coordinated `artifacts/`/`dist/`
  transaction; no majo-specific live-directory writes are allowed.
- Browser asset error: settle preload, mark the page ready, retain visible text,
  and expose the failed background/audio state without trapping the user behind
  the loading mask.

## Compatibility and verification shape

The package's own Playwright suite runs against the package's static dev/preview
server for behavior and responsive checks. The assembler publication suite then
serves the assembled root release and verifies the canonical mounted URL,
local asset responses, catalog navigation, and no-external-request behavior.
Tests should inspect stable `data-majo-*` attributes rather than generated
Astro asset hashes or implementation class names.
