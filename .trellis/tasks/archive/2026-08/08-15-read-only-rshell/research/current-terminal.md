# Existing Terminal baseline

Reviewed 2026-08-15.

## Current boundaries

- `presentations/terminal/src/runtime.ts` is a side-effect-free TypeScript
  module. It owns quoted tokenization, frozen command definitions, completion,
  history state, virtual public-entry resolution, and a closed effect union.
- `apps/site/src/scripts/terminal-home.ts` validates DOM-projected public entry
  metadata, validates the one-template-per-entry bijection, clones trusted
  templates for direct `cat`, renders text through DOM APIs, owns focus/ARIA/
  recovery, and has no browser content fetch.
- `apps/site/src/components/TerminalHome.astro` contains exactly one inert
  build-rendered template per public post/page. `TerminalStreamDocument.astro`
  marks the article title and prose that can serve as the source of public,
  visible search text.

## Existing command behavior

The default registry already implements `help`, `ls`, `open`, `cat`, `vim`,
`tree`, `about`, `pwd`, `whoami`, `date`, `history`, and `clear`. It has no
shipped aliases. Its current cwd is `~/blog/posts`; relative document operands
resolve below `posts`, pages require `/pages/...`, and hostile operands do not
resolve.

## Rshell extension points

- The runtime must remain DOM-free. It can accept a frozen normalized text corpus
  made from decoded public entries plus controller-owned text extracted from the
  validated templates.
- The controller must keep direct `cat` as trusted template cloning. It can pass
  the corpus into command execution and render a pipeline's final text with
  `textContent`; it must not parse raw Markdown/HTML or create an URL from input.
- `TerminalState` can hold canonical virtual cwd. Prompt display must derive from
  the same state, rather than retain the old fixed prompt after `cd`.
- Existing current effects (`entries`, `experiments`, `document`, `tree`, etc.)
  preserve rich direct output. Pipelines need a parallel canonical line stream;
  their final output is text-only.

## Constraints inherited by rshell

- No host path, private/draft content, raw Markdown, `innerHTML`, client fetch,
  shell, `eval`, dynamic import, URL execution, or unvalidated navigation.
- No-JavaScript recovery, exact template/index validation, latest-only polite
  announcements, IME/modifier/native-control key ownership, visible focus,
  reduced-motion behavior, and desktop/mobile containment remain mandatory.
- Existing M3 deliberately omitted real shell/process execution. Rshell extends
  only its content-interpreter semantics, so a Unix-like pipe is represented as
  deterministic in-memory normalized text, never an OS pipe.
