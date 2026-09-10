# Majo observation record

Observed on 2026-09-10 from the public route `SOURCE-URL` and
from an owner-authorized, read-only inspection of the separately served static
tree. Operational host names, credentials, and remote filesystem details are
intentionally not recorded here.

## Public document

The route returned `200 OK` and a small static HTML document. Its visible page
contains:

- three full-viewport slides;
- a full-screen loading mask, initially hidden in the HTML;
- one text block per slide, with the first quote revealed progressively;
- a bottom overlay containing a progress bar, play/pause control, current song
  metadata, background metadata, and pagination;
- one `<audio>` element whose source is changed when the active slide changes.

The document references relative `assets/` paths. The route is independent from
the Firefly site and does not require server-rendered data.

## Observed behavior protocol

The behavior below is a protocol to reimplement, not source to copy.

1. The original page initializes a Swiper carousel with fade transitions,
   `loop: true`, `speed: 1500`, parallax, clickable pagination, and touch
   simulation disabled.
2. A custom preload layer requests five images:
   `Elaina[04].jpg`, `Elaina[01].jpg`, `Elaina[02].jpg`, `Genshin1.jpg`, and
   `1911ammoqs2kps.png`. The loading mask is removed after all five load
   callbacks complete.
3. The first slide's two quote paragraphs start hidden. The first paragraph is
   revealed immediately after initialization and the second is scheduled on a
   two-second cadence; the fade duration is approximately four seconds.
4. The three displayed slides select three tracks. The original labels are
   `Reminiscence (Genshin Impact Main Theme Var.)`, `Faraway Solicitude`, and
   `The Fading Stories (Qingce Night)`, with Chinese display subtitles.
5. The player updates progress from `timeupdate`, seeks from a click on the
   progress bar, updates its icon on `play`/`pause`, and advances the active
   slide when a track ends. Initial autoplay is attempted by the original page;
   browser autoplay policy may reject it.
6. The background layer is oversized and transitions from a zoomed state to
   its normal scale over roughly ten seconds. A dark gradient keeps the lower
   footer readable.

The public JavaScript is a broad site bundle plus custom files (`app.js` and
`z.js`); the reproduction must not vendor or copy those files. No authoritative
upstream source repository was found during the inspection.

## Media evidence and boundary

The three displayed images and two preload-only images total roughly 19 MiB;
the three observed MP3 files total roughly 16 MiB. The media appears to be
third-party character/game artwork and music. Public reachability is not proof
of a redistribution license. The implementation therefore treats the media as
owner-supplied local inputs that are ignored by Git, while keeping the source
code, asset contract, and rights warning reviewable.

The target server also contains unrelated historical sibling routes and extra
media. They are not part of the `/majo/` reproduction scope.

For the Firefly implementation, the owner-supplied files follow a separate
local publication boundary: ignored `experiments/majo/public/media/` inputs,
Astro-emitted `experiments/majo/dist/media/` output, and the assembled
`/lab/majo/media/` URLs. The target's observed relative `assets/` paths are
behavior evidence only and are not reused as a source or runtime dependency.

## Firefly evidence

- `experiments/nerv/experiment.json` demonstrates the repository's independent
  static Experiment manifest and package-local build output.
- `.trellis/spec/frontend/publication-contract.md` requires a listed manifest,
  contained regular-file output, declared entries, local references within the
  mount, and no source/dependency artifacts in emitted output.
- `apps/site/src/lib/experiments.ts` and `apps/site/src/pages/lab/index.astro`
  consume the validator catalog, so a new listed manifest automatically appears
  in `/lab/` and the Terminal experiment view after a successful build.
- The generic Nginx publication route already serves ordinary files below
  `/lab/`; only the special NERV route has an experiment-specific location.
