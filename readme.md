# f1refly

f1refly is a static Astro publication backed by Markdown and a small
framework-neutral Terminal presentation. The build is intentionally
Docker-only: the supported command boundary is ./sam.

## Clone and build

After cloning, keep these authored inputs in the checkout:

- config/site.yaml
- content/posts/
- content/pages/
- presentations/, packages/, tooling/, and experiments/

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
then start the checked-in service definition:

~~~sh
./sam npm run install:m4
./sam npm run build:m4
docker compose -f f1refly.yaml up --build -d
docker compose -f f1refly.yaml down
~~~

The default runtime listens on `127.0.0.1:8080`; set `F1REFLY_HTTP_PORT` to
choose another host port.

config/site.yaml is public and tracked. It is not a secrets file. Draft and
private Markdown is excluded from the guest publication, but tracked source
files remain visible to anyone who can clone the repository.

## Site configuration

Ordinary identity and metadata changes belong in config/site.yaml; the
complete commented template is config/site.yaml.example. The supported keys
are:

- site.name, site.description, site.language, optional site.url, and optional
  public site.author;
- terminal.user, terminal.host, terminal.cwd, and multi-line terminal.about;
- seo.titleSuffix, seo.robots, seo.twitterCard, and optional seo.image.

site.url must be an absolute http or https origin. It may remain null for an
undecided clone: canonical URLs and sitemap.xml are then omitted, while
robots.txt and ordinary relative image paths remain valid.

## Markdown metadata

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
