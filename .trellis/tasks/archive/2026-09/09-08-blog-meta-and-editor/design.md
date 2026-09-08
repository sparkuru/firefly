# Technical design: metadata-first blog labels and Markdown organizer

## Boundaries

The task has two connected deliverables:

1. Firefly's generated content boundary accepts a non-empty Markdown document
   with absent/empty front matter through an explicit runtime fallback, and
   every human-facing directory/document index uses one metadata-first display
   label while retaining the physical path for routing and terminal operands.
2. A single-file Node authoring CLI parses, normalizes, validates, and writes
   standard YAML front matter. It defaults to save-as, supports explicit
   write-back, and writes only inside the selected blog root in save-as mode.

The existing `tooling/format-content.sh` remains the low-dependency batch
presence checker. It is not expanded into a YAML parser or silently changed
from its established frontmatter-only repair contract.

## Data flow

```text
external blog root
  │ regular Markdown scan, visibility/path checks
  ▼
materializer
  │ normalize legacy body headings
  │ no/empty front matter → generated compatibility front matter only in stage
  ▼
Astro collections + Firefly schema + X Core context
  ▼
canonical document model
  │ displayName = non-empty metadata title ?? physical filename stem
  ├── static directory indexes
  ├── Terminal recovery index / ls / tree labels
  ├── Terminal entries (physical filename remains path identity)
  └── canonical routes (physical path + existing slug rules)

source Markdown → blog-meta CLI
  │ parse first YAML front matter block
  │ merge explicit overrides with safe defaults
  │ validate post/page schema
  │ serialize YAML front matter + byte-preserved body
  ├── default save-as → contained blog destination
  └── explicit --write-back → atomic source replacement
```

## Runtime fallback metadata

`apps/site/src/lib/content-metadata.mjs` owns the shared fallback and display
helpers used by the materializer and canonical model. The helper must not parse
front matter independently in each UI consumer.

For a non-empty file with no front matter, or with an empty `---` block, the
materializer prepends a runtime-only compatibility block to the generated copy:

```yaml
---
title: <physical filename stem>
description: <physical filename stem>
date: <source file mtime in UTC calendar form>
draft: false
layout: post  # `page` for the pages collection
slug: <safe stem>  # pages only
---
```

The source workspace is never rewritten by the build. The mtime-derived date is
an explicit fallback with no claim that it is authored publication history; the
authoring CLI defaults new metadata to the current UTC date and `draft: true`
so a user can review it before publication. Posts omit a generated `slug`, so
their physical path remains the route identity. Pages receive a normalized
safe slug because their existing schema requires one.

Zero-byte Markdown placeholders keep the existing contract and remain ignored.
Non-empty malformed or partially authored front matter is not silently
repaired by the materializer; Astro/schema diagnostics remain authoritative.

The generated block uses safe quoted YAML scalars and leaves the normalized
body unchanged apart from the existing legacy heading compatibility pass.

## Canonical labels and routes

`CanonicalDocument` gains a derived `displayName`:

```ts
displayName = nonEmpty(entry.data.title)
  ? entry.data.title.trim()
  : filename.slice(0, -3)
```

The fallback is deliberately the physical filename stem, including any
`index-` prefix. There is no special prefix-stripping route or label parser:
metadata titles hide ordering prefixes when present, while the explicit
missing-metadata behavior remains the file name.

The canonical `filename`, `relativePath`, `virtualPath`, and `href` remain
unchanged. `index-*.md` can therefore keep its stable physical route. The
physical identity remains available to `cat`, `find`, `grep`, breadcrumbs,
accessible labels, and diagnostic output.

Human-facing surfaces use `displayName` as the primary visible label:

- `ContentDirectoryIndex` links the title/fallback label and keeps the route
  target unchanged.
- The Terminal home recovery index makes the title primary and retains the
  relative path as secondary text/data.
- Terminal `tree` uses the title/fallback label for document nodes.
- Terminal `ls`/`find` retain path discoverability but put the title first in
  the formatted document line; command path resolution continues to use the
  physical virtual path.
- Document headings, SEO title input, Terminal entries, and streamed reader
  labels consume the same canonical display value.

No new Terminal entry field is required: `filename` remains the exact physical
identity and `title` becomes the already-derived display label.

## Authoring CLI

The CLI lives at `apps/site/scripts/blog-meta.mjs` and is exposed through the
site package script `blog:meta`. It uses the explicit `yaml` dependency rather
than relying on Astro's transitive dependency graph. The supported authoring
command is run on the host because `./sam` intentionally mounts content roots
read-only for build/test commands; `./sam` remains the dependency-install and
validation boundary.

The command shape is:

```text
node apps/site/scripts/blog-meta.mjs <path/to/article.md> [options]
```

Important options:

- `--blog-root PATH` / `FIREFLY_CONTENT_ROOT`: source blog root; absent values
  use the repository `content/` fixture.
- `--collection posts|pages`: default `posts`, inferred for a source already
  under the blog root.
- `--category SEGMENTS`: optional contained category path; source-relative
  category is inferred for an in-root source.
- `--output PATH`: explicit save-as path, interpreted relative to the blog root
  unless absolute; otherwise an external source maps to
  `<blog>/<collection>/<category?>/<slug>.md`.
- `--write-back`: opt into replacing the source instead of the default save-as
  mode. It is mutually exclusive with `--output`.
- `--title`, `--description`, `--date`, `--updated`, `--draft`, `--layout`,
  `--slug`, repeated `--tag`, and `--access`: explicit metadata overrides.
- `--preview`: print the normalized document and destination without writing;
  `--overwrite` is required to replace an existing save-as target.

Defaults are intentionally publication-safe:

- preserve existing valid metadata and body;
- infer title from existing metadata, the first Markdown H1, or a humanized
  filename stem (leading numeric ordering is ignored for this editor default);
- infer description from existing metadata, the first non-heading paragraph,
  or the title;
- use the current UTC date when absent;
- use `draft: true` when absent;
- use `post` for `posts` and `page` for `pages` when absent;
- preserve existing tags/access/presentation/firefly fields, otherwise use
  schema-safe empty/public defaults;
- preserve a post slug when authored; otherwise let the physical filename own
  the post route. Pages always receive a safe slug.

The parser accepts only a first-document YAML front matter block. Unknown or
schema-invalid metadata is reported instead of being silently discarded.
The output is ordered, valid YAML between Markdown `---` delimiters. The body
starts at the original closing delimiter and is copied byte-for-byte. Existing
front-matter comments/formatting may be normalized because the requested
operation is metadata organization, not a lossless YAML source formatter.

Save-as safety is enforced with resolved-path containment, regular-file and
non-symlink checks, parent creation only below the blog root, no overwrite by
default, and a temporary-file-plus-rename write. If an in-root default save-as
would equal the source, the CLI stops and asks for `--write-back` or an explicit
`--output` rather than overwriting.

## Compatibility, rollout, and rollback

- Existing front matter is copied unchanged by materialization and is parsed
  only by the existing Astro/YAML pipeline; route, slug, access, draft, marker,
  and presentation behavior remain intact.
- No bulk rewrite of the external blog is part of the task. The CLI is opt-in;
  `tooling/format-content.sh` remains available for its earlier batch repair
  use case.
- Runtime fallback affects only the ignored generated stage. Reverting the
  materializer/helper and label changes restores the prior strict behavior
  without touching authored Markdown.
- CLI writes are individually recoverable from the source because save-as is
  non-overwriting by default and write-back is explicit. A failed temporary
  write leaves the original source/target intact.
- The project spec and README must state the read-only build boundary versus
  the host-side authoring command so an operator does not expect a build mount
  to accept edits.

## Validation shape

Focused tests cover the fallback block, display label, route preservation,
directory/Terminal labels, YAML parsing/serialization, body preservation,
save-as containment, collision/overwrite rejection, and explicit write-back.
The normal site content/check/build gates then prove that the generated fallback
is schema-valid and that the static route inventory remains exact.
