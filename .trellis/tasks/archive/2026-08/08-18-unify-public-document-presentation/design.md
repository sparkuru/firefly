# Technical Design: Unified Public Document Presentation

## Boundary

The change is a site content/presentation selection migration. The existing
Terminal layout and document component remain the single public document
visual system; the semantic adapter remains available as a generic package
contract but is no longer selected by the four current public documents.

## Data flow

```text
Markdown front matter
  → Astro content schema / X Core context
  → renderDocument()
  → DocumentPresentation.astro
  → TerminalLayout + TerminalDocument
```

The first implementation pass changes only the two semantic fixture metadata
values to `presentation: terminal` and updates route/static/browser assertions.
This keeps the existing dispatch boundary intact and avoids duplicating layout
logic or moving browser behavior into the route.

## Approved UI decisions

- Use the existing phosphor Terminal theme, token system, and self-hosted
  JetBrains Mono assets. Do not adopt the generic UUPM suggestion of an
  external Google Font, a new palette, or newsletter/landing-page sections.
- Keep the current Terminal document hierarchy: title bar, breadcrumb, path,
  metadata, outline, reader status, and prose.
- Preserve the static fallback and native link semantics. The reader remains a
  progressive enhancement over already-rendered HTML.
- Treat `#terminal-reader` as reader intent only; it does not change the
  selected presentation or route shell.
- Validate at the existing 375px mobile and 1440px desktop Playwright
  profiles, with visible focus and no document-level overflow.

## Compatibility and rollback

The generic semantic package, X Core adapter tests, and semantic component are
left intact for future explicitly authorized content or package consumers.
Rollback is limited to restoring the two Markdown `presentation` values and
the corresponding route/static/browser expectations.
