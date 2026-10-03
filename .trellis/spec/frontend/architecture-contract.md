# Firefly Architecture Contract

## 1. Scope / Trigger

Use this contract when changing ownership between authored content, the Astro
site, X Core, presentations, Experiments, the comments plugin/service, memo
contracts, or the publication pipeline. It records the durable product and dependency boundaries;
the linked topic contracts below own field-level and command-level behavior.

Firefly is a personal Markdown publication with a static HTML reading surface
and independently built frontend Experiments. It is not a general-purpose site
generator or a distributable X Core framework. Preserve authored content when
changing presentation, and keep experiments free to use their own frameworks.
The product does not require a browser Markdown parser, WYSIWYG editor,
multi-user CMS, or a shared theme/Experiment marketplace.

## 2. Signatures and Data Flow

```text
chosen Markdown workspace (posts/, pages/, managed resources)
  -> site workspace materialization and strict Content Collections schema
  -> X Core normalize/validate/transform
  -> registered firefly or semantic Presentation
  -> apps/site static output

experiments/<id>/experiment.json + independent source
  -> manifest validation -> declared package-local build
  -> isolated Experiment artifact

site artifact + Experiment artifacts
  -> Publication Assembler validation and fresh candidate
  -> coordinated repository artifacts/ + dist/ promotion
  -> operator-owned immutable deployment release
```

The key interfaces are `PresentationAdapter.transform(input:
NormalizedDocumentInput): HastRoot` and `enhancements(input): readonly
Enhancement[]` in `packages/x-core/`; `discoverExperiments()`,
`buildExperiments()`, and `assemblePublication()` in `tooling/`; and the
canonical post/page schemas and route projection in `apps/site/`. Their exact
types, errors, and validation rules live in the linked contracts.

## 3. Contracts

### Ownership and dependency direction

| Owner | Responsibility | Must not own |
| --- | --- | --- |
| `content/` or a selected external blog root | Markdown, front matter, managed resources | Astro imports, client directives, presentation CSS classes, Experiment code |
| `apps/site/` | Static Astro shell, content loading, routes, SEO, presentation dispatch, public catalog, site plugins | Experiment source or private comments database |
| `packages/x-core/` | Framework-neutral document normalization, adapter selection, diagnostics, JSON-safe enhancement metadata | Routes, browser Terminal state, Experiment builds, plugins, deployment |
| `presentations/semantic/`, `presentations/terminal/` | Transform the same normalized document into semantic HTML | Mutation of source Markdown/tree, database reads, cross-imports between adapters |
| `experiments/<id>/` | Own source, lockfile, assets, build command, and static output | Main-site source imports or writes to root `dist/` |
| `tooling/validate-experiments/` | Validate manifests and project the safe public catalog | Build arbitrary browser/remote manifests |
| `tooling/assemble-publication/` | Validate and combine static artifacts as one repository candidate | Rewrite Experiment HTML or switch a deployed release |
| `plugins/comments/`, `services/comments/` | Site-owned comments integration and private write/moderation service | Direct database access from static site generation |
| `plugins/memos/` | Independent memo public export and configuration contract | Site registration, HTTP handlers, private state, or publication promotion |
| `services/memos/` | Independent memo submission, verification, encrypted private state, moderation, mail and export runtime | Comments state, site rendering, public runtime reads, or static release writes |

Use a Presentation when an implementation renders the shared Markdown document
contract. Use an Experiment when it owns a complete page, global style, or
independent runtime. A landing page is an Experiment even if it uses Astro.
The main site consumes only a validated public Experiment catalog; ordinary
article bundles must not import or preload Experiment assets. Both registered
adapters may be used without changing the source document.

### Content, routes, and presentation

- The main site pins Astro 7 and emits `output: 'static'`. Its Markdown
  processor uses Unified through `@astrojs/markdown-remark`; Tailwind 4 enters
  through the Vite plugin. Those build choices live in
  `apps/site/astro.config.mjs` and `apps/site/package.json`, and do not force
  an Experiment to upgrade its own framework or lockfile.
- Markdown `.md` and strict front matter are the long-term authoring interface.
  Markdown parsing, links, heading IDs, code highlighting, HTML generation,
  and adapter transforms happen at build time. The browser progressively
  enhances an already readable document; no client Markdown parser is needed.
- `firefly` is the default Terminal presentation; `presentation: semantic` is
  an explicit alternative. Unknown required layouts or adapter IDs fail the
  build. Site-owned `contentTheme` is independent of `presentation` and styles
  only the article content root; its registered IDs are `default` and `paper`.
- Front matter does not declare Experiments. `experiment.json` is their source
  of public identity. Do not put Astro component paths, hydration instructions,
  arbitrary stylesheet URLs, or Experiment dependencies into authored content.
  New content directives require a documented semantic contract and fixtures.
- The site owns `/`, canonical `/posts/<category...>/<slug>/` and
  `/pages/<slug>/` routes, directory routes, `/lab/`, and its 404. Each
  Experiment owns only its validated `/lab/<id>/...` mount. Public paths,
  aliases, and route reservations are derived from the selected workspace and
  must be collision-free. Slugs do not change automatically with titles.
- Historical Typecho permalinks are migration evidence, not an automatic route
  grammar. Add an old URL only through an explicit, validated alias. Tags and
  old special `cross.php`/`files.php` page semantics need a separate approved
  route/product decision; do not synthesize `/timeline/` or `/files/` from a
  legacy template name.
- The Terminal home keeps a static, accessible recovery/navigation surface.
  Terminal commands consume the public virtual file tree; user operands are
  relative to the virtual cwd or start with `~/blog`. Client command failure
  must not remove canonical static reading routes or no-JavaScript access.

See [Content Workspace](./content-workspace-contract.md), [X Core and
Presentation](./x-core-contract.md), [Site Configuration](./site-configuration-contract.md),
and [Mobile Experience](./mobile-experience-contract.md) for exact interfaces.

### Experiments and publication

- Each `experiments/<id>/` has its own `experiment.json`, framework version,
  lockfile, assets, and declared build. Its ID agrees with its directory and
  `/lab/<id>` mount. `listed` enters the public catalog; `unlisted` remains
  direct-link-only. Every public entry is checked inside the built mount.
- NERV and MAJO are current independent Experiments. NERV's fan-work notice,
  license, mounted 404, and reduced-motion behavior belong to NERV. New
  Experiments do not require changes to X Core or the main content pipeline.
- Validate every manifest before invoking any declared build command. Build
  the site and Experiments into isolated package-local outputs. The assembler
  rejects unsafe trees, path collisions, private data, and invalid mounts,
  then stages a fresh combined candidate. It promotes repository `artifacts/`
  and `dist/` together with rollback for caught filesystem failures. Never let
  independent builders write into the same root `dist/`.
- The repository delivers static files and a validated inventory. Deployment
  owns immutable `releases/<id>/`, an atomic `current` switch, crash recovery,
  TLS/edge behavior, and rollback. Do not claim the assembler's two-target
  promotion is crash-atomic; its remaining crash window is documented in the
  publication contract. Static reading works on any suitable static server.
- The optional comments system has a separate private runtime for writes,
  moderation, and export. The public site consumes a controlled static read
  projection; static pages never query its database. Tracked example config
  stays disabled by default, while owner-local activation is independent.
- The memo service owns a separate package, database and mail lifecycle. Its
  public read projection is the exact `plugins/memos/` export contract;
  verification alone never publishes a record. Service delivery does not
  activate a site route or publication adapter. Historical Typecho memo data
  remains outside this new-submission workflow.

See [Experiment Publication](./publication-contract.md), [Comments and
Publication](./comments-publication-contract.md), and [Development
Runtime](./development-runtime.md) for exact validation, build, and deployment
boundaries.

### Quality and privacy invariants

- Semantic headings, links, lists, and code remain in generated HTML. Terminal
  input has keyboard and label support; interactive effects respect reduced
  motion. Canvas/WebGL Experiments provide text or static fallback and a way
  back to `/lab/` or `/`.
- Keep ordinary article scripts small. Heavy effects load only for their owning
  route or declared enhancement policy; no Experiment CSS, WebGL, or xterm
  dependency enters an ordinary article by default.
- Reject or sanitize authored raw HTML at the declared processor boundary.
  Enhancement props are JSON-safe. No drafts, private workspace paths,
  backups, credentials, email, IP, user-agent, moderation fields, or historical
  Typecho memo data enter the public release. New owner-approved memos have a
  separate exact-field contract; adding that contract alone does not activate
  a public route or authorize historical import. `.private/` stays outside Git
  and CI inputs.
- The site generates per-document title, description, SEO metadata, RSS, and
  sitemap from validated public content. Canonical URLs require either an
  authored URL or a configured site origin. Experiments are not article
  bodies and do not enter the RSS body stream. Visibility and manifest policy
  govern their public discovery.
- Preserve third-party licenses, attribution, and fan-work disclaimers inside
  the owning Experiment. Framework upgrades are package-specific and require
  build/browser regression evidence; do not force all Experiments onto the
  site's Astro version.

The historic Typecho SQL inventory, memo/comment handoffs, and M0–P0 completion
state are evidence in [the project mainline](../../mainline.md) and archived
tasks, not mutable publication counts. Build inventory must come from the
explicitly selected content workspace. Private history (`views`, `stars`,
`commentsNum`, identity mapping) requires a new schema and privacy decision
before any public display.

## 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| Unknown layout/presentation, invalid front matter, or route collision | Fail the site build with the owning document/route identified |
| Raw/unsafe Markdown HTML or unsafe enhancement props | Reject or sanitize at the documented X Core/site boundary; never run in the browser |
| Invalid/escaping Experiment manifest, output, or mount | Fail validation before build or candidate promotion |
| Experiment build failure or partial candidate | Keep the previous repository `artifacts/` and `dist/` pair; do not publish the candidate |
| Missing static document, entry, license, or required error page | Fail the owning build/publication check |
| Browser enhancement failure | Preserve readable static document and native navigation |
| Public output contains private fields or local filesystem paths | Fail the publication/privacy gate |
| Deployment switch/recovery failure | Use operator-owned immutable release recovery; do not mutate a repository build to hide it |

## 5. Good / Base / Bad Cases

- **Good:** One Markdown post builds into both registered presentations with
  the same canonical route and stable content identity; NERV and MAJO build
  separately and mount under their own `/lab/` paths; a validated candidate is
  handed to deployment without Experiment code in article bundles.
- **Base:** A post omits `presentation` and `contentTheme`, resolves to
  `firefly` plus `default`, and remains readable when JavaScript is disabled.
- **Bad:** A landing page is added as a Markdown presentation, its CSS is
  imported by the main site, or its build writes directly to root `dist/`.

## 6. Tests Required

- For content/adapter changes, assert schema rejection, route/alias
  collisions, deterministic headings/node IDs, safe enhancement metadata,
  semantic HTML, and JavaScript-free reading.
- For Experiment changes, validate manifest paths and entries, local asset
  references, mount isolation, reduced motion, independent build, and absence
  of Experiment dependencies in ordinary site bundles.
- For release changes, compare candidate inventory with the promoted static
  output, exercise rollback on caught errors, verify distinct site/Experiment
  404s, and probe representative routes, headers, and asset caching at the
  correct repository or deployment boundary.
- For comments/private-data changes, assert the exact public projection and
  scan outputs for private fields; keep the static reader working when the
  optional write service is unavailable. Use the commands and focused suites
  in the linked topic contracts and [validation profile](../trellis-plus/validation-profile.md).

## 7. Wrong vs Correct

**Wrong:** An Astro page imports `experiments/nerv/src/` and lets the NERV
build copy files over root `dist/`.

**Correct:** `apps/site/` reads the validator's public catalog, the NERV build
produces its own `dist/`, and the assembler mounts its validated output inside
a fresh repository release candidate.
