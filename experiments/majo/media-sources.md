# majo local media boundary

The majo page intentionally accepts media only from the ignored
`public/media/` directory. Astro copies these public files into `dist/media/`,
which the assembled Experiment serves below `/lab/majo/media/`. The build
expects these eight owner-supplied files:

| Purpose | Required input |
| --- | --- |
| Slide background 1 | `public/media/images/slide-01.jpg` |
| Slide background 2 | `public/media/images/slide-02.jpg` |
| Slide background 3 | `public/media/images/slide-03.jpg` |
| Preload-only image 4 | `public/media/images/preload-04.jpg` |
| Preload-only image 5 | `public/media/images/preload-05.png` |
| Track 1 | `public/media/music/track-01.mp3` |
| Track 2 | `public/media/music/track-02.mp3` |
| Track 3 | `public/media/music/track-03.mp3` |

These inputs are not source-controlled and are not downloaded, transformed, or
replaced by the build. Missing inputs fail the build with their exact path, and
the build verifies the corresponding `dist/media/` files after Astro copies
the public directory.
The image and music files may contain third-party artwork or recordings; local
availability is not evidence of a redistribution license. The owner must
confirm rights before publishing an assembled release.
