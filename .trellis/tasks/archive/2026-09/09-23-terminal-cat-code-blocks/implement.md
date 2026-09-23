# Implementation plan

1. Move the Shiki stage behind `rehypeSanitize` in the site Markdown pipeline;
   keep Mermaid excluded and verify dangerous authored HTML remains stripped.
2. Add terminal-scoped syntax styling and an `aria-hidden` numbered gutter for
   every cloned `pre > code`, including plain and Mermaid source blocks.
3. Add per-code-block language and Copy code controls to cloned terminal output,
   with delegated clipboard handling, feedback and lifecycle cleanup.
4. Add focused build and Playwright coverage for source fidelity, line counts,
   clipboard success/failure, long code, repeat output, desktop/mobile layout,
   Mermaid and canonical-page stability.
5. Run Astro check and the focused test/build gates in the pinned Node/Playwright
   containers; inspect generated HTML, final diff and security contract. Update
   `.trellis/spec/frontend/x-core-contract.md` and the inline-reading contract
   with the accepted pipeline and interaction rules.

Rollback point: restore the previous Markdown pipeline and terminal code
enhancement files together; there is no stored data to migrate.
