# Content and production layout design

## Scope and boundaries

The task changes the authored-content input boundary, the generated Astro
collections, metadata compatibility, the ignored static synchronizer, and the
operator-owned comments runtime layout. It does not change canonical route
ownership, guest/private projection rules, Nginx routing, or the comments HTTP
API.

Remote deployment values are represented by `<deploy-root>` and
`<comments-data-root>` in this record. The exact operator target remains in the
ignored local sync/deployment notes.

## Content workspace contract

`FIREFLY_CONTENT_ROOT` becomes a blog root with this shape:

```text
<content-root>/
├── posts/**/*.md
└── pages/**/*.md
```

The default is the tracked repository `content/` directory. `sam` resolves and
mounts the root read-only at the same absolute container path, then discovers
link hops only below the `posts/` and `pages/` source trees. A missing source
directory, unsafe link, special file, or broken/cyclic target fails before
Docker starts.

The scanner remains collection-agnostic and keeps its existing collision,
NFC, inode/race, and ordinary-Markdown guarantees. A new content-workspace
orchestrator scans and materializes the two collections into one generated
candidate:

```text
apps/site/.generated-content/<candidate>/
├── posts/**/*.md
└── pages/**/*.md
```

The candidate is promoted as one directory, so a failed posts or pages copy
cannot leave the two Astro collections at different source revisions. The
Astro loaders read only the generated `posts` and `pages` trees; host paths and
authored links never become loader bases or publication identities.

The existing single-tree scanner/materializer API remains available for its
focused security tests. The site entry point uses the new two-collection
orchestrator and reports separate post/page counts.

## Metadata compatibility and authoring rules

The current external blog is valid Markdown but was authored under an older
metadata convention. Its `source` field records the old article location; it is
not part of Firefly's presentation or route model. Firefly therefore adds this
one legacy field to the strict schema with a narrow decoder: only a safe
relative Markdown reference with safe path segments and an optional fragment
is accepted. The value remains non-routing metadata and is not passed to
rendering, X Core, comments, or public navigation. New articles omit it.

The current route contract rejects whitespace because canonical hrefs,
Terminal virtual paths, and comments route catalogs must not contain raw
spaces. The compatibility decoder canonicalizes a run of whitespace in a slug
to `-` before the existing safe-segment checks. Slashes, percent escapes,
backslashes, controls, dot segments, and non-NFC values remain errors. The
normalized value is the only route value used by canonical content and
comments route generation. This keeps the old blog buildable without turning
unknown front matter or unsafe routes into accepted input.

Zero-byte Markdown files are treated as legacy placeholders rather than
articles and are omitted from the generated collections. A newly authored
article still needs complete front matter; a non-empty malformed article fails
the normal schema gate with its file and field context.

For legacy body compatibility, the generated stage demotes ATX `# ` headings
outside fenced code blocks to `## ` because the document title already owns the
rendered h1. The source blog and production Markdown mirror remain unchanged;
new authored bodies start at level two and do not rely on this migration rule.

New authored files use `posts/<category>/<safe-slug>.md` or
`pages/<safe-slug>.md`. The recommended form is lowercase ASCII kebab-case,
NFC, no whitespace, and a filename stem equal to the explicit `slug`. Legacy
physical Markdown filenames may retain whitespace; they remain source identity
only and do not weaken the route slug contract. New post front matter uses
`title`, `description`, `date`, `draft`, and `layout: post`; new page front
matter additionally requires `slug` and uses `layout: page`. `updated` must not
precede `date`; `source` is omitted unless a validated legacy provenance
reference is intentionally retained.

## Clone-ready demo

The current `content` link is replaced with a small ordinary fixture containing
one public page, one public post, one draft, and one private-owner post. The
fixture is tracked by removing the broad `content/` ignore and ignoring only
generated/owner-local inputs as appropriate. It contains no external article
body, host path, source link, or authored symlink.

The README and frontend specs describe `content/` as the default demo root and
show `FIREFLY_CONTENT_ROOT=/absolute/path/to/blog` for the full external
workspace.

The README also contains a copyable post/page front matter template and the
build command used as the authoring gate. The compatibility path is a migration
guardrail, not the recommended authoring format.

## Production synchronization

The synchronizer keeps two independent outputs:

1. A validated Markdown mirror at `<deploy-root>/blog/` from the resolved
   `FIREFLY_CONTENT_ROOT`. It accepts only regular Markdown files under
   `posts/` and `pages/`; it never syncs generated output, secrets, or symlink
   metadata.
2. The assembled static `dist/` publication staged into
   `<deploy-root>/releases/<release-id>/`, followed by the existing atomic
   `current` switch.

The blog mirror is staged and verified separately. Static release promotion
retains the current checksum/file-count gates and old releases. A blog mirror
failure or release failure stops the operation and leaves the previous static
`current` target intact; the operator keeps the previous blog mirror as the
documented rollback input until the new deployment is accepted.

The synchronizer never copies `config/site.toml` as a production source file.
The local file is consumed during the build; its validated values are embedded
in the assembled release. The production comments process uses only its
plugin-owned config and secrets files.

## Comments plugin runtime and SQLite data

The operator-owned runtime layout is:

```text
<deploy-root>/plugins/comments/
├── compose.yml
├── config.toml
├── secrets.env
└── data/
    ├── core.db
    ├── core.db-wal / core.db-shm  # when SQLite is using WAL
    ├── notifications.jsonl
    ├── notifications.jsonl.state.json
    └── plugins/<plugin-id>/<relative-path>
```

Compose mounts `data/` as the container's private comments data root and
mounts config/secrets read-only. The existing service resolves `core.db`,
outbox, and plugin storage below that data root; no new database dialect or
schema migration is introduced. The directory is owner-only and outside the
static web root.

Migration is a separate operator step from static publication sync:

1. Validate the current service and create a complete SQLite backup set using
   the image's existing backup script.
2. Stop the old comments process and ensure no writer remains.
3. Copy the verified data set into the new plugin-local `data/` directory,
   preserving private ownership and SQLite sidecar files as needed.
4. Start the new Compose project with explicit plugin config/secrets paths and
   the plugin-local data bind mount.
5. Check health, route catalog, database integrity, and notification outbox
   behavior before removing legacy config files.
6. Retain the old runtime directory and data backup until the smoke gate is
   accepted; rollback is a Compose path switch plus restoration of the prior
   data root, not a static release rollback.

The legacy `comments-runtime/config/site.toml` is not part of this layout.
Because production Compose supplies an explicit plugin config path, it is not
needed by the service and can be removed only after a reference check.

## Compatibility and rollback

- Existing `FIREFLY_CONTENT_ROOT=<old-posts-root>` callers become invalid by
  design; the migration form is the containing blog root. The error names the
  required `posts/` and `pages/` children.
- Existing site routes and generated post/page identities remain unchanged
  except for the one whitespace slug, which receives a stable hyphenated
  canonical segment.
- Static release rollback remains the existing atomic `current` replacement.
- Blog mirror rollback and comments data rollback are independent and retain
  their prior verified inputs.
- Secrets are never printed, copied into Git, or stored in Trellis records.
