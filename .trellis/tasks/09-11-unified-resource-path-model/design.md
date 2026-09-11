# Unified resource path display: technical design

## Boundary model

The site has three path domains and they must remain distinguishable:

```text
validated Terminal/VFS identity       /posts/infra/note.md
        │
        ├── browser navigation         /posts/infra/note/
        └── shell-visible resource     ~/blog/posts/infra/note.md
```

The VFS path remains the source identity for lookup, structured values,
document matching, and route mapping. The canonical browser `href` remains the
navigation identity. A shared presentation formatter projects a validated VFS
path into the shell-visible form. It is not a parser and must never be used to
construct an `href`.

## Shared formatter and data flow

`presentations/terminal/src/vfs/paths.ts` already owns the mapping from the
internal root to the user-visible shell root through `displayVirtualPath()`.
Expose the resource-display projection through the Terminal runtime boundary
so the site renderer can use the same implementation without importing VFS
internals. The formatter has these rules:

- `/` becomes `~/blog`;
- any validated slash-rooted resource such as `/posts/x.md`, `/pages/x.md`,
  or `/.rshell/tmp/x` becomes `~/blog` plus that path;
- `-` is handled by grep's sentinel branch and remains `-`;
- the formatter does not normalize or accept raw user input. Lookup and path
  validation happen before it is called.

Use that projection at every visible resource boundary:

1. `commands/grep.ts` formats neutral stdout from its internal match path.
2. `commands/document-format.ts` formats `find` and `ls` document rows.
3. `runtime.ts` formats effect stdout and owns the public
   `formatDocumentOperand()` / resource-path helper used by the site.
4. `apps/site/src/scripts/terminal-home.ts` formats interactive grep locations,
   find rows, and tree document accessible labels.
5. `apps/site/src/components/TerminalHome.astro` formats the no-JavaScript
   recovery index's post/page paths.
6. `apps/site/src/components/ContentDirectoryIndex.astro` and directory route
   adapters use the same projection for native file labels and title bars.

The structured `GrepMatch.path`, `PublicDocument.path`, `TreeNode.path`, and
`TerminalEntry.virtualPath` fields remain internal slash-rooted values. Browser
rendering continues to use `entry.href` and directory link paths directly; it
does not derive navigation from the new text projection.

## Compatibility and behavior

- Existing user input is unchanged. `~/blog/...` and cwd-relative operands
  remain valid; `/...` remains rejected, so the task does not silently broaden
  the shell's virtual filesystem boundary.
- Named grep output becomes copyable by `cat`/`vim` without a second resolver
  alias. A `grep` result that identifies a document uses exactly the same
  shell path accepted by the reader commands.
- Relative child labels (`posts/`, `characters/`, tree branch names) remain
  compact structural labels. They are not resource identity projections and
  do not need a home prefix.
- Both posts and pages go through the same path formatter. Collection kind may
  affect validation and route ownership, but never the visible resource path.
- Pipelines and redirects consume the same bounded stdout text as before;
  changing the display prefix must not expose structured values or HTML.

## Safety and failure behavior

The formatter is downstream of the existing VFS resolver and decoded Terminal
entry validation. It must not turn an unknown path, host-like path, unsafe
segment, or browser URL into a plausible shell resource. Existing limits,
stdin/resource exclusivity, traversal rejection, and canonical route checks
remain unchanged. Tests should explicitly prove that only the displayed prefix
changes for valid resources and that rejection behavior is unaffected.

## Rollback

The change is isolated to resource display projections, their focused tests,
and the content-workspace contract. If a regression is found, revert the
formatter call sites and projection tests while retaining the earlier majo
commit. No content materialization, route generation, media, or generated
publication artifact needs to be rolled back.
