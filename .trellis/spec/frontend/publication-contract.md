# Experiment Publication Contract

## Scenario: Manifest-Driven Static Publication

### 1. Scope / Trigger

Use this contract whenever an Experiment manifest, public Experiment catalog,
Experiment build, staged artifact, root release, `/lab/` surface, or publication
container changes. The boundary is repository-controlled static publication:
remote manifests, browser-supplied commands, runtime plugins, and live deployment
switches are not supported.

The two private tooling packages are intentionally separate:

- `@f1refly/validate-experiments` decodes manifests, discovers Experiments, and
  projects the public catalog without loading Experiment source.
- `@f1refly/assemble-publication` builds declared Experiments, validates static
  trees/references, stages isolated artifacts, and promotes a complete root
  release transaction.

X Core does not participate. The main site consumes only the validator's safe
public catalog; it never imports Experiment components, CSS, runtime code, or
framework dependencies.

### 2. Signatures

```ts
interface ExperimentManifest {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly title: string;
  readonly kind: string;
  readonly visibility: 'listed' | 'unlisted';
  readonly mountPath: `/lab/${string}`;
  readonly entryPath: `/${string}`;
  readonly build: {
    readonly tool?: string;
    readonly command: string;
    readonly outputDir: string;
  };
  readonly entries: readonly {
    readonly id: string;
    readonly title: string;
    readonly path: `/${string}`;
    readonly role: string;
  }[];
  readonly licenseFile?: string;
  readonly tags: readonly string[];
  readonly directory: string;
  readonly manifestPath: string;
}

interface PublicExperiment {
  readonly id: string;
  readonly title: string;
  readonly kind: string;
  readonly href: string;       // canonical /lab/<id>/ mount
  readonly entryHref: string;  // validated default entry
  readonly tags: readonly string[];
}

discoverExperiments(options: {
  repositoryRoot: string;
  experimentsRoot?: string;
}): Promise<{
  manifests: readonly ExperimentManifest[];
  catalog: readonly PublicExperiment[];
}>;

buildExperiments(manifests: readonly ExperimentManifest[]): Promise<void>;
validateRelease(
  releaseRoot: string,
  manifests: readonly ExperimentManifest[]
): Promise<readonly string[]>;
assemblePublication(options: {
  repositoryRoot: string;
  discovery?: ExperimentDiscovery;
}): Promise<PublicationResult>;
```

CLI and root signatures:

```bash
validate-experiments --root <repository-root>
assemble-publication [--root <repository-root>] [--build-experiments]

./sam npm run validate:experiments
./sam npm run build:experiments
./sam npm run assemble:publication
./sam npm run publication:m4
```

`publication:m4` clean-installs every owned lockfile and invokes `build:m4`.
`build:m4` builds the validator first, validates all manifests before any product
build, builds the M3 graph plus assembler/site, invokes the declared Experiment
commands, and only then assembles the release.

### 3. Contracts

#### Manifest and discovery

- JSON objects have exact fields; arrays are plain, dense data arrays. Decoders
  inspect own data descriptors, clone values, freeze results, and never invoke
  accessors or decorated array methods.
- IDs, kinds, roles, tools, and tags are lowercase kebab-case tokens. Titles and
  build commands are non-empty, trimmed, control-free strings.
- `experiments/<id>`, manifest `id`, and `mountPath: /lab/<id>` agree exactly.
  Entry paths are normalized root-relative paths inside the mount; output and
  license paths are normalized relative descendants of the Experiment.
- Paths reject traversal, backslashes, NUL, query/fragment syntax, schemes,
  drive prefixes, empty/dot segments, malformed encoding, and encoded `/` or
  `\`. IDs, mounts, entry IDs/paths, routes, and tags are unique where owned.
- The repository root, experiments root, every Experiment directory, output, and
  license path are checked by resolved realpath containment. Lexical containment
  alone is insufficient because a parent directory may be a symlink.
- Discovery is sorted by ID. Only `listed` manifests enter the frozen public
  catalog. `href` is the canonical trailing-slash mount; `entryHref` is the
  validated default entry and canonicalizes `/index.html` to the mount root.

#### Build trust boundary

- `build.command` is trusted only because the manifest is source-controlled
  repository code. `buildExperiments()` executes commands serially in sorted ID
  order with the Experiment directory as `cwd`, inherited stdio, and propagated
  non-zero status.
- Never pass browser input, URL parameters, remote JSON, content front matter, or
  a runtime registry into this shell boundary. Validate all manifests before the
  first build; Docker must call the same declared-command path rather than a
  NERV-specific shortcut.

#### Artifact and release transaction

- Application builds stay in package-local `dist/`. The assembler copies the
  site into `artifacts/site`, each Experiment into
  `artifacts/experiments/<id>`, and then copies a fresh site candidate plus exact
  Experiment mounts into a fresh release candidate.
- Safe tree walking accepts regular files/directories only. It rejects symlinks,
  devices, sockets, FIFOs, source maps, source/development files, dependency or
  private directories, unsafe/encoded names, and file or directory case-fold
  collisions.
- Every declared entry/license and the site `index.html`, `404.html`, and
  `lab/index.html` must exist. NERV additionally owns a mounted `404.html`.
- Text scanning covers extensionless text as well as known text extensions for
  private keys, credential tokens, `file://`, `.private`, container paths, and
  local home paths. HTML/SVG attributes and HTML/SVG/CSS `url(...)` references
  are decoded and resolved;
  local Experiment references cannot leave the mount and every local target must
  exist. Validation reports errors but never rewrites output.
- `artifacts/` and `dist/` are promoted together. Existing targets move to unique
  backups, both candidates move into place, and any failure rolls back every
  moved/prepared target. Backups are deleted only after complete success.
  Candidate cleanup targets only transaction paths created inside the repository.
- `artifacts/publication.json` is deterministic evidence containing schema
  version, safe catalog, and sorted inventory. It is not a browser registry.

#### Site, Terminal, and runtime

- `apps/site/src/lib/experiments.ts` loads the public catalog at build time from
  the validator. `/lab/` uses `entryHref`; Terminal uses the canonical `href`.
- The site `/lab/` index and Terminal recovery are useful without JavaScript and
  do not request or preload Experiment assets.
- `decodeTerminalExperiments()` accepts only exact `{ id, title, href }` records
  whose href is `/lab/<id>/`. `ls lab` returns a closed experiment-list effect;
  `open lab/<id>` returns a navigation effect only for an exact decoded entry.
  The DOM controller navigates to that effect's href and never constructs a URL
  from raw command input.
- NERV remains autonomous at `/lab/nerv/`. Reduced motion disables scanline,
  flicker, and scroll-driven stripe movement while preserving static content.
- The runtime container copies only root `dist/` into non-root Nginx. It serves
  the site at `/`, the catalog at `/lab/`, NERV at `/lab/nerv/`, distinct site
  and NERV 404s, `/healthz`, security headers, and immutable hashed NERV assets.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| malformed JSON, unknown/missing field, wrong schema version | fail before catalog/build with manifest and field context |
| sparse/decorated input, accessor, custom prototype | decoder `TypeError`; behavior is not invoked |
| ID/directory/mount mismatch or duplicate/overlapping ownership | fail discovery before the first product build |
| lexical or realpath escape through Experiment root/output/license | fail; never copy or execute the escaped target |
| build command exits non-zero or receives a signal | stop in sorted build phase and propagate actionable status |
| symlink, source map, source/dev/private artifact, unsafe name, case collision | reject staged candidate before promotion |
| missing entry/license/local reference or mount-escaping URL | reject release candidate without rewriting it |
| first or second target promotion fails | restore all prior `artifacts/` and `dist/`; clean candidates |
| unknown/unlisted Terminal experiment | error-line effect; no navigation |
| JavaScript disabled or Terminal startup fails | native document and lab recovery links remain available |
| reduced motion requested in NERV | continuous CSS and scroll-driven decorative motion freeze |
| missing main-site vs NERV route | owning static 404 is served; ownership does not leak |

### 5. Good / Base / Bad Cases

- **Good:** a listed, contained NERV manifest validates; its declared command
  builds package-local output; site and Experiment trees stage separately; every
  reference resolves; both root targets promote together; `/lab/`, Terminal, and
  NERV share canonical validated destinations.
- **Base:** an `unlisted` contained Experiment validates, builds, and mounts but
  stays out of `/lab/`, Terminal recovery, `ls lab`, and completion.
- **Bad:** a symlinked Experiment root/output/license, remote manifest, raw URL-
  constructed `open`, direct writes into root `dist/`, NERV-specific Docker build,
  HTML rewriting, or sequential non-rollback promotion.

### 6. Tests Required

- Validator Node tests: exact positive decoding/freezing/catalog projection;
  malformed schema/path/data descriptors; duplicate ownership; missing manifest;
  deterministic listed/unlisted discovery; root/directory realpath escapes.
- Assembler Node tests: unsafe node/source/map/name/content/reference rejection;
  output/license symlinked-parent escapes; file/directory case collisions;
  deterministic 18-file clean assembly, including the two pinned Terminal fonts,
  complete OFL, and provenance record; stale-file exclusion; coordinated prior-
  target preservation and rollback.
- Terminal unit tests: exact Experiment decoder, lab commands/usage/errors,
  completion, frozen effects, and canonical href-only navigation.
- Site static/Playwright: exactly six site HTML routes; JavaScript-free `/lab/`;
  no Experiment asset edge on ordinary pages; lab recovery; `ls lab` and
  `open lab/nerv`; all existing M3 recovery/content behavior.
- NERV and publication Playwright: mounted assets, entry, distinct 404, native
  return, desktop/mobile overflow, and reduced motion. Serve the already built
  artifact; do not substitute `astro dev` for publication evidence.
- Container: build the production-shaped image, probe health/site/lab/NERV,
  redirects, distinct 404s, cache/security headers, non-root UID, exact release-
  only inventory, then tear down the exact service.

### 7. Wrong vs Correct

```ts
// Wrong: lexical containment can be bypassed by a symlinked parent.
if (path.resolve(output).startsWith(path.resolve(experiment))) copy(output);

// Correct: require both normalized lexical and resolved realpath containment.
requireContained(manifest.directory, sourceOutput, `${manifest.id} output`);
await requireRealContained(manifest.directory, sourceOutput, `${manifest.id} output`);
```

```ts
// Wrong: raw command text becomes a destination.
window.location.assign(`/lab/${input.slice('open lab/'.length)}/`);

// Correct: the pure engine resolves one decoded catalog item first.
if (effect.kind === 'navigation') window.location.assign(effect.experiment.href);
```

```text
# Wrong: build an Experiment directly into, or copy it over, the live root.
apps/site/dist + experiments/nerv/dist -> dist

# Correct: validate -> build local outputs -> stage -> validate candidate ->
# promote artifacts and release together with rollback.
```

## Reference Files

- `experiments/nerv/experiment.json`
- `tooling/validate-experiments/src/index.ts`
- `tooling/validate-experiments/src/cli.ts`
- `tooling/assemble-publication/src/index.ts`
- `tooling/assemble-publication/src/cli.ts`
- `apps/site/src/lib/experiments.ts`
- `apps/site/src/pages/lab/index.astro`
- `presentations/terminal/src/runtime.ts`
- `apps/site/src/scripts/terminal-home.ts`
- `experiments/nerv/src/layouts/Layout.astro`
- `experiments/nerv/src/pages/index.astro`
- `Dockerfile`
- `nginx.conf`
