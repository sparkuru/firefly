---
title: Firefly display samples
slug: firefly-display-semantic
date: 2026-10-30
description: Synthetic display block examples in the semantic paper presentation.
draft: false
layout: page
presentation: semantic
contentTheme: paper
---

## Firefly display samples

The following synthetic examples demonstrate the display blocks used by this
sample publication. The surrounding headings and paragraphs are ordinary
Markdown; each composition contains its image and associated text.

### Image left

```firefly
type: composition
layout: image-left
media:
  type: image
  src: /favicon.png
  alt: Synthetic left image
  caption: Image on the left
content: |
  Left composition paragraph one. This sample keeps the image and its related
  prose together while the surrounding document follows the usual reading flow.

  The second paragraph continues beside the image. A longer passage makes the
  wrapping behavior visible as it reaches the bottom of the picture. After that
  point, its lines can take the full width of the composition. This is useful
  for travel writing, illustrated notes, and many other articles in which a
  picture belongs with several paragraphs instead of occupying a separate
  full-width row. On a narrow display, the same source puts the image above
  these words so each line remains comfortable to read. An author can keep
  adding details without measuring the height of a particular image or making
  separate columns by hand. The available space changes with font size,
  language, window width, and the shape of the photograph, while the browser
  continues placing ordinary text in a natural reading order. Once the lower
  edge of the figure has passed, the rest of this paragraph can use the whole
  measure. That behavior also leaves enough space for longer words and links.
  A sample passage needs to be long enough to demonstrate this transition at
  different viewport sizes, including the wide desktop reading surface. This
  additional sentence describes how an illustration and its surrounding text
  remain related while the text retains its normal line spacing and direction.
  The page can show several pictures one after another without forcing all of
  their associated words into columns of identical height. When a reader uses a
  larger font, the words simply occupy more lines and still continue below the
  image. These final details complete the example in a way that is independent
  of the particular device and the aspect ratio of the sample illustration.

  The last paragraph remains inside this composition, even if the picture has
  already ended. The next ordinary paragraph is outside the group.
```

After the left composition, this ordinary paragraph uses the full width.

### Image right

```firefly
type: composition
layout: image-right
media:
  type: image
  src: /favicon.png
  alt: Synthetic right image
  caption: Image on the right
content: |
  Right composition paragraph one. The image is placed on the opposite side,
  while these words follow the same normal reading order in the source file.

  This second paragraph provides enough text to show the shape of the layout.
  It can continue below the picture when the picture runs out of height, and
  the document does not need fixed columns or a second mobile version. Several
  consecutive image groups remain separate, so a later heading does not slide
  up beside an earlier figure. The caption travels with its image and remains
  distinct from the alternative text used by assistive technology. The author
  does not need to predict how many lines will fit beside the image, because
  the available space changes with the reader's screen and text size. These
  extra sentences make the wrapping visible even on a wide desktop display.
  When the reader reaches the lower edge of the picture, the remaining prose
  continues across the full measure before the next ordinary block begins.
  The same source also remains understandable when it is read in a plain
  Markdown viewer, because the picture and these paragraphs appear together in
  a labeled code block. On the website, an author can alternate the placement of
  images while each group keeps its own boundaries and writing order. This long
  final stretch makes the transition from a narrow line beside the picture to
  a wider line underneath it visible even when the reader has a large display.
  A later heading is free to begin after the whole figure rather than being
  pulled into the space left over beside it.

  The final sentence belongs to the right-image group.
```

After the right composition, this ordinary paragraph uses the full width.

### Image top

```firefly
type: composition
layout: image-top
media:
  type: image
  src: /favicon.png
  alt: Synthetic top image
  caption: Centered image above the text
content: |
  Top composition paragraph one. The centered image appears above these words.
```

After the top composition, this ordinary paragraph uses the full width.

### Image, link, audio and video

```firefly
type: image
src: /favicon.png
alt: Synthetic standalone image
caption: A standalone image
```

```firefly
type: link
url: https://example.invalid/firefly-display
title: Synthetic external link
description: A link card with author-provided text.
```

```firefly
type: audio
src: https://example.invalid/recording.mp3
caption: Synthetic audio resource
```

```firefly
type: video
src: https://example.invalid/clip.mp4
caption: Synthetic video resource
```
