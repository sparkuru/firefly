# Friend links design

## Approved product boundary

Friend links are a small, repository-owned public configuration consumed by
the existing Terminal home. They are not Markdown content, a route, a VFS
resource, a remote registry, or a submission workflow.

The source of truth is:

```toml
# config/site.toml
[[terminal.friends]]
name = "Example"
desc = "A short public description."
url = "https://example.com"
```

The live repository keeps the list empty until the owner adds real links. The
example configuration documents the shape without publishing placeholder
destinations.

## Data contract

`terminal.friends` is a strict array with a default of `[]`. Each record has
`name`, `url`, and optional `desc`:

- `name`: non-empty, trimmed, safe single-line public text. Control characters
  and unknown fields are rejected.
- `desc`: optional non-empty, trimmed, safe single-line public text. Control
  characters and unknown fields are rejected.
- `url`: non-empty, trimmed absolute `http:` or `https:` URL. Credentials,
  fragments, whitespace, and control characters are rejected. Query strings
  remain allowed for legitimate public URLs.
- List order is preserved in rendered output.
- Duplicate URLs are rejected with a field-aware configuration error.
- Empty lists are valid and render `No friend links.` in both recovery and
  command output.
- The existing `isSafeHttpUrl` policy is the source of truth for URL safety;
  the runtime decoder repeats the safety check at the browser data boundary.

The schema remains public build-time configuration. No secret, private path,
source workspace path, remote fetch, health probe, image, analytics field, or
tracking identifier is added.

## Presentation and interaction

The command is `friends`, with no operands, in the existing `Explore` help
group. It is visible in `help` and command completion. It has text pipeline
semantics like `about`:

- Direct `friends` output is a structured `links` effect. The browser renderer
  creates a native `<ul>` and one `<a href>` per record using DOM properties
  and `textContent`; no HTML from configuration is interpolated into the
  transcript. Each row follows the existing `ls` visual contract with aligned
  name, optional description, and URL columns. Missing descriptions keep an
  empty middle cell, and mobile layout stacks the cells in the same order.
- `friends | grep example` and `friends > /.rshell/tmp/friends.txt` use the
  deterministic plain-text serialization `name — url` or `name — desc — url`,
  so shell operations remain text-only and bounded.
- Same-tab navigation is used. No forced new window, remote asset, tracking,
  or reciprocal-link policy is introduced.
- The empty state is a normal text line rather than an empty list with no
  announcement.

The Terminal home's existing JavaScript-free recovery/catalog surface renders
the same records as ordinary native links, using the same aligned columns and
responsive stacking. This keeps the links available when the shell has not
started, JavaScript is disabled, or the controller fails.
The recovery section is not represented in `ls`, `tree`, `cat`, document
templates, canonical Markdown content, or route reservation logic.

The visual treatment reuses the existing phosphor Terminal colors, JetBrains
Mono, link focus ring, list spacing, and responsive rules. The task-specific
UUPM research is advisory: no new font, palette, marketplace card system,
search UI, GSAP motion, avatar, or decorative illustration is adopted.

## Data flow

```text
config/site.toml
        │
        ▼
site-config.mjs strict schema + duplicate/URL checks
        │
        ├── TerminalHome.astro renders native recovery links
        │       and data-terminal-friend records
        │
        ▼
terminal-home.ts decodes the DOM data boundary
        │
        ▼
executeCommand({ friendLinks })
        │
        ▼
friends command → links effect (direct) / name — url or name — desc — url text (pipe/redirect)
        │
        ▼
terminal-home.ts creates safe native anchors for direct output
```

The existing `TerminalIdentity` remains about prompt identity (`user`,
`host`, `cwd`, `about`). Friend links are passed as a separate immutable
command input so they do not become identity data or a virtual filesystem
node.

## Runtime contract changes

The terminal presentation runtime remains app-agnostic and receives generic
validated link records from the site:

1. Add a frozen `TerminalFriendLink`/link-record contract and a strict decoder
   for the DOM payload, parallel to the existing identity and entry decoders.
2. Extend the command input/context path with immutable `friendLinks`: the
   public `executeCommand` options, the terminal command context, the shell
   process context, neutral-shell execution, and registered-stage execution.
3. Add a `links` command value/effect carrying link records. Adapt it through
   the existing shell-result bridge and include it in text-effect detection,
   stdout serialization, announcements, and the browser effect renderer.
4. Implement `friends` beside the existing session commands and register it
   in the existing command registry. The handler only validates zero operands,
   returns the configured records, and never performs I/O.

The neutral shell and direct registered-shell path must produce equivalent
results. This preserves the existing optimization without allowing the new
command to behave differently in pipelines.

## Astro and browser boundary

`TerminalHome.astro` reads `SITE_CONFIG.terminal.friends` at build time and
renders each record twice by role: visible recovery markup and validated
`data-terminal-friend-*` attributes. Astro escaping handles the static
attribute boundary; `terminal-home.ts` decodes and revalidates the records
before passing them into the runtime.

The client controller must continue to fail closed: if any required Terminal
node or friend record is malformed, the existing fatal recovery path remains
available. It must not inject `innerHTML`, evaluate URLs, fetch destinations,
or turn arbitrary DOM links into shell commands.

## Compatibility and no-regression decisions

- Existing `about`, `help`, `ls`, `tree`, pipelines, aliases, scratch files,
  document templates, and experiment navigation retain their current output
  and path contracts.
- No friend record is added to `TerminalEntry`, `PublicDocument`, the public
  VFS, `getCanonicalContent()`, sitemap generation, or route inventory.
- The semantic document presentation is untouched; no new navigation item or
  page route is added.
- Empty default configuration keeps the current rendered site usable while
  enabling the feature for owners who add records.

## Evidence plan

- Configuration unit tests cover valid records, empty defaults, unknown keys,
  malformed URLs, unsafe text, duplicate URLs, and non-array values.
- Terminal package tests cover `friends`, help/completion registration,
  structured link effects, empty output, plain-text pipes/redirection, strict
  link decoding, and direct-vs-neutral parity.
- Site tests cover the JavaScript-free recovery links, interactive native
  anchors, help/completion, empty-state behavior, no horizontal overflow, and
  external URL attributes.
- Static-output tests prove the config-shaped data reaches only the home
  artifact and does not alter route/content/VFS inventories.
- Run all required commands through `./sam`; collect focused package tests,
  site config/static tests, and the relevant Playwright projects before the
  task can be marked complete.
