# Authored content theme contract migration — implementation design

## Validation and vocabulary

Rename the site-owned theme registry surface from article vocabulary to content
vocabulary (for example `ContentThemeId`, `CONTENT_THEME_IDS`,
`resolveContentThemeId`) without mechanically renaming ordinary article concepts.
The schema is the only authored input boundary. It accepts omission or exact
`default`/`paper`; strict unknown-key/type validation rejects `articleTheme` and
does not select precedence when both names are present.

Diagnostics name the document and offending field/value category without dumping
frontmatter/body. No old parser, alias export or conversion layer exists.

## Rendering and CSS

Pass the normalized `contentTheme` independently of presentation/navigator to both
document renderers. Emit exactly one `data-content-theme="<id>"` on the existing
`[data-article-content]` root. Move/rename content-theme module/style references
consistently, but preserve the default/paper visual rules and scope every paper
rule to the content root. Navigator markup/assets and theme resolution remain
independent.

Repository-supported Markdown fixtures and metadata examples migrate with the
code, preserving values. External content remains read-only from this task; a
legacy external workspace fails schema validation until its owner migrates it.

## Isolation

`contentTheme` is never added to X Core context/metadata, route identity, comments
payloads, plugin data or browser reader state. Static and interactive tests compare
the content attribute/style before and after navigator lifecycle and in every
presentation/capability cell.
