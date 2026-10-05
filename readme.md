<p align="left" style="font-size: 34px;">
  <strong style="border-bottom: 2px solid currentColor; padding-bottom: 4px;">
    i@firefly # cat readme.md
  </strong>
</p>


<p align = "center" style="font-size: 30px;" > <strong> Firefly </strong> </p>

Firefly is a static Astro publication backed by Markdown, with a framework-neutral Terminal presentation. Docker is required for builds and checks; `./sam` runs the project commands, and `./preview.sh render` runs commands that render documents.

The [architecture contract](.trellis/spec/frontend/architecture-contract.md) maps content, presentations, independent experiments, and publication boundaries.

<p align = "center" style="font-size: 28px;" > <strong> Build and preview </strong> </p>

The tracked `content/` directory is a sample blog root with `posts/` and `pages/`. Copy the site configuration template, then build and serve the assembled publication:

```sh
cp config/site.toml.example config/site.toml
cp .env.example .env
./sam npm run install:m4
./preview.sh build
./preview.sh
```

`./preview.sh` serves the existing build in the background at the configured port (default `4321`) and returns after readiness. Use `./preview.sh status` to inspect it.

Use `./preview.sh dev` for main-site hot reload, `./preview.sh preview` to rebuild and serve the complete publication, and `./preview.sh down` to stop the development service.

Copy `.env.example` to the ignored `.env` to set a local content root, bind address, or port.

To build from another blog root, point `FIREFLY_CONTENT_ROOT` at the directory containing both `posts/` and `pages/`:

```sh
FIREFLY_CONTENT_ROOT=/absolute/path/to/blog ./preview.sh build
```

To serve with Compose, build first, then run `docker compose up --build -d`. Stop it with `docker compose down`. The optional private comments service has a separate [setup guide](services/comments/README.md).

<p align = "center" style="font-size: 28px;" > <strong> Write content </strong> </p>

Create a post interactively at its final path:

```sh
tooling/new-article.py content/posts/notes/first-entry.md
```

The creator opens your editor and keeps the article as a draft unless you confirm publication. To organize the metadata of an existing Markdown file, preview the result first:

```sh
node apps/site/scripts/blog-meta.mjs /path/to/article.md --blog-root /path/to/blog --preview
```

The [content contract](.trellis/spec/frontend/content-workspace-contract.md) documents front matter, slugs, `.fireflyignore`, markers, and publication visibility. The [site configuration contract](.trellis/spec/frontend/site-configuration-contract.md) documents `config/site.toml`, SEO fields, and content themes.

<p align = "center" style="font-size: 28px;" > <strong> Themes </strong> </p>

The default `firefly` presentation uses a dark Terminal with slate-blue, teal, soft-green, yellow, and orange accents inspired by [Honkai: Star Rail](https://zhuanlan.zhihu.com/p/704319639). Set `presentation: semantic` in a post or page's front matter for a conventional reading layout.

Article content has a separate `contentTheme` setting. Omit it (or use `default`) to follow the presentation's normal reading style.

Set `contentTheme: paper` in front matter for a warm paper surface, serif text, and muted terracotta accents. This changes the article body in either presentation; it does not change the surrounding page or Terminal shell.

The available content theme IDs are `default` and `paper`.

<p align = "center" style="font-size: 28px;" > <strong> Verify </strong> </p>

The complete repository fixture gate uses the tracked `content/` root:

```sh
./sam npm run install:m51
./preview.sh verify
```

See the [development runtime contract](.trellis/spec/frontend/development-runtime.md) for focused checks and the [validation profile](.trellis/spec/trellis-plus/validation-profile.md) for release gates.
