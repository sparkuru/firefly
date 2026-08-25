<p align="left" style="font-size: 34px;">
  <strong style="border-bottom: 2px solid currentColor; padding-bottom: 4px;">
    me@firefly # cat readme.md
  </strong>
</p>

<p align = "center" style="font-size: 30px;" > <strong> firefly </strong> </p>

firefly is a static Astro publication backed by Markdown and a small
framework-neutral Terminal presentation. The build is intentionally
Docker-only: the supported command boundary is ./sam.

<p align = "center" style="font-size: 26px;" > <strong> Clone and build </strong> </p>

After cloning, restore these authored inputs locally:

- config/site.toml
- optional owner-local comments build inputs under config/plugins/comments/
- presentations/, packages/, tooling/, and experiments/

The tracked `content/` directory is a clone-ready demo blog root containing
`posts/` and `pages/`, including public, draft, and private-access fixtures.
For the full authoring workspace, point the same variable at its containing
blog root (not at `posts/` alone):

~~~sh
FIREFLY_CONTENT_ROOT=/absolute/path/to/blog ./sam npm --prefix apps/site run build:workspace
FIREFLY_CONTENT_ROOT=/absolute/path/to/blog ./sam npm run build:m4
~~~

The external root is mounted read-only and only its `posts/` and `pages/`
trees are scanned. Symlinks are dereferenced into the generated workspace;
generated files never retain symlink metadata or host absolute paths.

The default clone path is:

~~~sh
./sam npm run install:m4
./sam npm run build:m4
~~~

The build recreates ignored generated directories, including
apps/site/.generated-content/, package dist/ folders, and the assembled
publication dist/. They do not need to be created by hand. For local
development use ./dev.sh after installation; ./dev.sh preview serves the
assembled static publication.

For the production-shaped Compose runtime, build the publication first and
then start the default service definition:

~~~sh
./sam npm run install:m4
./sam npm run build:m4
docker compose up --build -d
docker compose down
~~~

The private comments runtime is opt-in and has no host-published port. After
creating the plugin-owned local runtime files and data directory from their
tracked templates, an operator may start the same-device profile with:

~~~sh
mkdir -p plugins/comments/data
cp config/plugins/comments/config.toml.example plugins/comments/config.toml
cp config/plugins/comments/secrets.env.example plugins/comments/secrets.env
chmod 600 plugins/comments/secrets.env
docker compose --profile comments up --build -d
docker compose --profile comments down
~~~

The tracked site keeps comments disabled until private health, host-scoped
`/v1/comments/` proxy, fail-closed unknown `/v1/` handling, TLS/origin, SMTP,
backup/restore, and public smoke gates are accepted. DNS, SSH, remote
synchronization, and external SMTP operations are operator-owned and are not
automated by this repository.

The default runtime listens on `127.0.0.1:8080`; set `FIREFLY_HTTP_PORT` to
choose another host port. For runtime-only image validation, use
`./package-runtime.sh`; it does not require a second Compose file.

`config/site.toml` is the owner-local public build input; its tracked template
is `config/site.toml.example`. It contains core site settings plus the single
`[plugins.comments]` activation projection; it is not a secrets file.
The comments plugin's non-secret public/runtime settings live in the explicit
repository-relative `config/plugins/comments/config.toml`. Its protected
`secrets.env` contains only injected secret values and is never part of the
static build. The repository-relative `config/plugins/comments/` files are
build inputs/templates. The production-shaped comments runtime owns
`<deploy-root>/plugins/comments/{compose.yml,config.toml,secrets.env,data/}`;
its SQLite data is never part of a static release. Publication visibility rules
control which Markdown entries are emitted for guests.

<p align = "center" style="font-size: 26px;" > <strong> Site configuration </strong> </p>

Ordinary identity and metadata changes belong in config/site.toml; the
complete commented template is config/site.toml.example. TOML is the only
supported site-config format; do not maintain a second YAML or JSON copy. The
comments plugin templates are kept separately under
`config/plugins/comments/`. The supported core keys are:

- site.name, site.description, site.language, optional site.url, and optional
  public site.author;
- terminal.user, terminal.host, terminal.cwd, multi-line terminal.about,
  optional terminal.promptMarker, and optional terminal.friends records with
  name, desc, and URL;
- seo.titleSuffix, seo.robots, seo.twitterCard, and optional seo.image.

site.url must be an absolute http or https origin. Leave optional TOML keys
commented out when their value is undecided: canonical URLs and sitemap.xml
are then omitted, while robots.txt and ordinary relative image paths remain
valid. TOML has no null literal, so omission represents the configured null
defaults.

<p align = "center" style="font-size: 26px;" > <strong> Markdown metadata </strong> </p>

Posts and pages use strict front matter. Existing title, description, date,
draft, layout, and access fields remain required where applicable. The
optional SEO fields are:

~~~yaml
htmlTitle: Exact browser title
canonical: https://example.com/articles/example/
seoImage: /images/example.png
noindex: false
~~~

htmlTitle controls the escaped document title in either presentation. Without
it, the visible title receives seo.titleSuffix. canonical, seoImage, and
noindex are validated during the build; unsafe or unknown front-matter keys
fail the build.

New authored files use these paths and safe-slug convention:

~~~text
content/posts/<category>/<safe-slug>.md
content/pages/<safe-slug>.md
~~~

For example, the smallest new post and page are:

~~~yaml
# content/posts/notes/first-entry.md
---
title: First entry
slug: first-entry
date: 2026-08-24
description: A short public note.
draft: false
layout: post
---
~~~

~~~yaml
# content/pages/about.md
---
title: About
slug: about
date: 2026-08-24
description: A short public page.
draft: false
layout: page
---
~~~

Do not use whitespace, percent escapes, dot segments, slashes, backslashes, or
control characters in new path segments or slugs. A legacy slug containing a
run of whitespace is normalized to `-` before route validation; this migration
compatibility does not change the new-file convention. The legacy `source`
field is optional provenance only: when present it must be a safe relative
Markdown reference with an optional fragment, and it never controls routing or
public output. Omit it for new content.

<p align = "center" style="font-size: 26px;" > <strong> Firefly metadata markers </strong> </p>

Project-specific presentation markers live under the optional `firefly`
front-matter namespace. The first supported marker is `featured`:

~~~yaml
firefly:
  markers:
    - featured
~~~

Marker IDs use safe lowercase kebab-case. Duplicate IDs are reduced to their
first declaration. The registry owns the visible label and presentation data;
front matter cannot provide HTML, CSS, icons, or scripts. The `featured`
marker renders a `Featured` badge on document headers and public content
indexes. Other safe IDs are accepted as silent no-ops until they receive an
explicit registry entry. A future checker will report unsupported IDs without
making ordinary builds fail. Markers do not replace `.fireflyignore`, `draft`,
or `access`: those remain the owners of publication and visibility.

<p align = "center" style="font-size: 26px;" > <strong> Markdown publication filter </strong> </p>

An optional `.fireflyignore` at the blog root controls which non-empty Markdown
files under `posts/` and `pages/` enter the generated publication. Root rules
are relative to the blog root, so they include the collection name; a nested
`.fireflyignore` is relative to its own directory:

~~~text
# blog/.fireflyignore
posts/archive/
pages/internal.md

# blog/posts/notes/.fireflyignore
*.md
!keep.md
~~~

Rules use Gitignore-style comments, blank lines, escaped literals, trailing
spaces, `/`, `*`, `?`, ranges, `**`, directory-only patterns, and ordered
negation. The last matching rule wins within a file; a lower-directory policy
can override an inherited result when its parent directory remains reachable.
An excluded parent directory cannot be bypassed by re-including a descendant.
`.gitignore` is never used for publication. Excluded Markdown remains in the
source workspace, while control files are never copied to the generated stage.
Non-Markdown attachments are outside this filter and their publication remains
deferred.

The build materializes both collections atomically under
`apps/site/.generated-content/{posts,pages}` before Astro loads them. Draft and
private-owner entries remain in the source inventory for access projection but
are excluded from the guest publication. Zero-byte Markdown placeholders are
ignored; any non-empty new article must pass the front matter schema gate and
should start body headings at `##`. Legacy body `#` headings are normalized in
the generated stage only; source and production Markdown remain unchanged.

All configuration and Markdown values are embedded at build time. No runtime
configuration service, client-side config fetch, credentials, or private
author data is supported.
