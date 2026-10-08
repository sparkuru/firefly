# Independent Page Presentation

## Owner's Feasibility Question

The owner asked whether a Pages item can have an independent visual language,
using a Twitter-like Memo reader alongside the current Terminal Firefly as an
example. This is a request to establish feasibility and scope, not yet a final
selection of route, presentation ID, layout, or interaction features.

## Current Boundaries

- `apps/site/src/lib/content-schema.mjs:77` accepts a registered-style
  presentation ID. It is separate from route/collection and contentTheme.
- `apps/site/src/lib/presentation-experiences.ts:203` currently registers only
  firefly and semantic. The registry feeds adapter registration in
  `apps/site/astro.config.mjs:20` and document rendering through
  `apps/site/src/components/DocumentPresentation.astro`.
- The experience registry's documentKind is currently limited to terminal and
  semantic (`presentation-experiences.ts:6`, validation at line 145).
  DocumentPresentation dispatches those two fixed page shells. A genuinely
  independent reader shell needs deliberate extension of this composition;
  an unregistered presentation value cannot enable it by itself.
- `apps/site/src/lib/content-theme.mjs` registers default and paper only.
  `.trellis/spec/frontend/content-workspace-contract.md:475` scopes
  contentTheme to the article-body root. It cannot change whole-page
  navigation, feed layout, outer shell or interaction model.
- `apps/site/src/lib/render-document.ts` validates rendered document metadata
  and heading consistency. New reading views can reuse build-time content
  processing while supplying their own page composition.

## Feasible Planning Direction

A /pages/ route can remain content-driven and part of the shared build while
its registered presentation owns a separate shell, typography/tokens, feed
layout and bounded reading interactions. Source metadata, drafts, document
identity and Markdown handling remain shared. Content location does not force
Terminal chrome.

Treat the proposed Memo reader as a concrete first independent page
experience, rather than designing a general theme marketplace or allowing
Markdown to import arbitrary CSS/components. The final design should distinguish
single-entry body adapters from aggregation of multiple validated entries.
Changing one presentation must not change the bytes/behavior of ordinary
Terminal pages or leak its CSS/runtime onto unrelated routes.

A Twitter-like reading direction could use a central chronological feed,
short-entry cards, dates, optional tags, full-content expansion, and optional
desktop history/filter navigation that collapses naturally on mobile. Owner
name repetition is already excluded. These are visual/reading proposals;
social interaction features are not established requirements.

## Pending Owner Choice

Resolved by owner confirmation on 2026-10-07: the primary route is
/pages/memos/ and the first Memo view adopts an independent Twitter-like
timeline presentation. This approval selects a product direction; it does not
approve implementation of an unfinished plan. Metadata requirements,
aggregate vs individual-entry behavior, and migration remain planning choices.
