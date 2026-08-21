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
- content/posts/
- content/pages/
- presentations/, packages/, tooling/, and experiments/

`content/` is intentionally private and ignored by Git, so a fresh clone does
not contain it. Restore it from the private content backup before running the
build. `FIREFLY_CONTENT_ROOT` may point to an external posts workspace when the
content is not stored below the checkout.

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
creating an owner-only `config/secrets.env` from its tracked template, an
operator may start the same-device profile with:

~~~sh
docker compose --profile comments up --build -d
docker compose --profile comments down
~~~

The tracked site keeps comments disabled until private health, host-scoped
`/v1/` proxy, TLS/origin, SMTP, backup/restore, and public smoke gates are
accepted. DNS, SSH, remote synchronization, and external SMTP operations are
operator-owned and are not automated by this repository.

The default runtime listens on `127.0.0.1:8080`; set `FIREFLY_HTTP_PORT` to
choose another host port. For runtime-only image validation, use
`./package-runtime.sh`; it does not require a second Compose file.

config/site.toml is public and tracked. It is not a secrets file. The complete
`content/` workspace is excluded from Git; publication visibility rules still
control which restored Markdown entries are emitted for guests.

<p align = "center" style="font-size: 26px;" > <strong> Site configuration </strong> </p>

Ordinary identity and metadata changes belong in config/site.toml; the
complete commented template is config/site.toml.example. TOML is the only
supported site-config format; do not maintain a second YAML or JSON copy. The
supported keys are:

- site.name, site.description, site.language, optional site.url, and optional
  public site.author;
- terminal.user, terminal.host, terminal.cwd, multi-line terminal.about, and
  optional terminal.friends records with name, desc, and URL;
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

All configuration and Markdown values are embedded at build time. No runtime
configuration service, client-side config fetch, credentials, or private
author data is supported.
