# Firefly display blocks

Firefly display blocks add media and image-and-text layouts to ordinary Markdown
posts and pages. A block is a fenced code block named `firefly`; its contents are
YAML. Firefly renders the block when it builds the site. Other Markdown readers
show the YAML as a code block and continue to display the rest of the document.

For a complete local example, open `content/posts/firefly-playground/index.md`.
Build with the tracked `content/` workspace to view it at
`/posts/firefly-playground/showcase/`. Its sibling `assets/` directory contains
original illustrations and synthetic media, so the demo needs no remote media.

## Images and GIFs

````markdown
```firefly
type: image
src: ./assets/illustration.png
alt: Original geometric illustration made from circles and rectangles
caption: An original layout-test illustration
```
````

Use `type: image` for a GIF as well. `src` can be a document-relative local
file, a site-root path, or an HTTP(S) URL. `alt` is the image's text
alternative; `caption` is a separate, visible description. Both are optional,
but add meaningful `alt` text for an informative image. An empty or omitted
alternative makes the image decorative to assistive technology.

Regular Markdown images such as `![Description](https://example.com/photo.jpg)`
remain supported. Use a Firefly block where its additional presentation is
useful.

## Images with text

Put one image and the text associated with it in a single composition block:

````markdown
```firefly
type: composition
layout: image-left
media:
  type: image
  src: ./assets/illustration.png
  alt: Original geometric illustration made from circles and rectangles
  caption: An original layout-test illustration
content: |
  This original sample explains the layout beside a left-aligned image.

  Add more paragraphs to observe how the text resumes full width below
  the image. The next ordinary paragraph remains outside this group.
```

This paragraph is outside the composition and returns to the normal layout.
````

Choose `image-left` to put the image on the left, `image-right` for the right,
or `image-top` for a centered image followed by text. Beside a floated image,
text wraps around it and resumes full width beneath it. On a narrow screen the
image appears above the text. The block boundary limits the layout; later
paragraphs and headings do not wrap around this image.

The `content` value is Markdown. It can contain multiple paragraphs, emphasis,
and links. If it contains a triple-backtick code fence, use at least four
backticks for the outer `firefly` fence so the inner fence remains inside it.

## Links

````markdown
```firefly
type: link
url: https://example.com/article
title: Further reading
description: An article related to this section.
```
````

Only `url` is required. If no title is supplied, the URL itself is the link
label. Firefly does not depend on fetching page metadata to build the card.

## Audio and video

````markdown
```firefly
type: audio
src: ./assets/test-tone.mp3
caption: A locally generated synthetic test tone
```

```firefly
type: video
src: ./assets/test-pattern.mp4
caption: A locally generated video test pattern
```
````

Provide a direct media resource, not a link to a video website's page. The
browser supplies playback controls and determines which formats it can play;
a separate link to the resource remains available. Playback does not start
automatically.

## Moving a document

Relative paths are resolved from the source Markdown file's location. Move or
share local media with the document and update relative paths if their
relationship changes. Copying only the `.md` file does not embed its assets.
The generated website publishes referenced local media under its own URLs.
It keeps the original image bytes and does not create resized variants; prepare
appropriately sized images before publishing, especially for long articles.
For external media on an HTTPS site, use HTTPS URLs: browsers can block an HTTP
resource as mixed content even when the site's media policy permits it.

If a block has invalid YAML, a missing required field, or an unsupported type
or layout, the build reports the document and block location. Platform-specific
embedded players, galleries and custom HTML or scripts are outside the current
block vocabulary.
