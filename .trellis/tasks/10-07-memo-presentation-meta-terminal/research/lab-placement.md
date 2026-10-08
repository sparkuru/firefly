# Memo as a Lab Item

The owner proposed Lab placement on 2026-10-07. This is an architecture/product
option under review, not approval to migrate routes, remove the plugin, change
publication ownership, or implement code.

## Repository Evidence

- `.trellis/spec/frontend/architecture-contract.md:73` defines an Experiment
  as a complete page with its own source/style/runtime. A whole Memo reader
  fits that UI definition; individual Markdown entries are its content rather
  than separate Experiments. Metadata alignment remains a separate concern.
- `experiments/nerv/experiment.json` and `experiments/majo/experiment.json`
  declare independent package-local builds, /lab/<id> mounts, and listed
  catalog entries. Their independent builds do not imply independent deployed
  releases or content publication.
- `tooling/validate-experiments/src/index.ts:277` requires the exact
  /lab/<id> mount. Line 335 derives the public href from that mount. Current
  manifests cannot simply point their catalog href to /memos/.
- `apps/site/src/lib/experiments.ts:12` loads the validated public catalog;
  `apps/site/src/pages/lab/index.astro:38` links to each entryHref. Existing
  Terminal Lab listing/launch consumes that same catalog.
- `tooling/assemble-publication/src/index.ts:628` stages each Experiment's
  output and line 652 copies it into the coordinated blog release. A Memo
  snapshot bundled as an ordinary Experiment follows this release lifecycle.
  Updating its bundled entries under today's pipeline requires producing and
  deploying a new combined release.
- `tooling/assemble-publication/src/index.ts:367` rejects local Experiment
  references outside their mount. A wrapper page linking/fetching an independent
  /memos/ publication requires explicit integration design; a redirect/native
  fallback is not merely a manifest setting.
- `plugins/public-access.mjs:7` gates only /memos and its descendants for the
  Memo plugin. A new /lab/memos surface is not automatically governed by that
  gate. Define consistent catalog, shell and route visibility explicitly.

## Product Options

1. Entire Memo reader and its content become a normal Lab Experiment. This
   provides existing Lab discovery/launch and can preserve static no-JS
   reading, but the current pipeline couples content refresh to combined blog
   release construction/deployment. Publication/receipt migration and existing
   /memos links need deliberate handling.
2. Lab owns an independently built reader application while Memo remains the
   independent content/publication owner. Runtime loading of a strict public
   export is feasible, but loading/error/empty states, stale/version handling,
   asset/link routing and JS-disabled static fallback must be specified.
   Do not render owner Markdown in the browser by silently abandoning the
   current build-time rendering contract.
3. Lab acts as discovery for the existing independent static Memo reader.
   This preserves content updates and no-JS reading while unifying entry
   placement. It requires explicit external-static catalog capability or a
   carefully specified navigation wrapper; current manifests do not support
   arbitrary /memos destinations. Avoid a fake content snapshot.

## Recommendation and Next Decision

Treat the whole reader as one Lab-facing item while preserving independent
Memo publication unless the owner explicitly changes that earlier product
decision. Choose the intended discovery/reading behavior after deciding
whether content updates must remain independent of the blog release. All
three options can use document-style metadata conventions and omit author
names; Lab placement does not itself implement those behaviors.
