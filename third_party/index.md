# Retained Third-Party Material

This project inventory supplements original notices. It does not replace
inline headers or grant rights to retained media. Recheck exact provenance
whenever material or its version changes; ordinary package dependencies keep
their installed package notices and lockfile provenance.

| Component / version | Retained paths and provenance | Exact notice / status |
| --- | --- | --- |
| Trellis 0.6.14 | `.trellis/.version` identifies the installed runtime; protected `.trellis/scripts/`, `workflow.md`, agents/config and managed local platform artifacts derive from `@mindfoldhq/trellis` 0.6.14. Source distribution: that exact installed npm package, metadata license `AGPL-3.0-only`, repository `github.com/mindfold-ai/trellis`. | [Trellis-0.6.14-LICENSE](./Trellis-0.6.14-LICENSE), copied verbatim and compared with the matching installed distribution. That distribution supplies no separate root NOTICE/COPYRIGHT. Protected source remains unmodified. |
| JetBrains Mono 2.304 | Unmodified Regular/Medium WOFF2 under `apps/site/public/fonts/`; release tag v2.304 / commit cd5227b, exact source URLs and hashes in `apps/site/public/licenses/JetBrainsMono-PROVENANCE.txt`. | [JetBrainsMono-2.304-LICENSE](./JetBrainsMono-2.304-LICENSE), compared byte-for-byte with the existing complete tagged OFL 1.1 notice. Original published license/provenance paths remain intact. |
| NERV fan work | `experiments/nerv/`, with retained `src/modules/nerv/NOTICE.md` identifying Evangelion-inspired noncommercial fan/parody material. | Original disclaimer is retained; it is not proof of an upstream content license. `license-notice-needed`: exact third-party asset/source versions and permission remain unverified. |
| MAJO media | Independent `experiments/majo/`; local `public/media/` is ignored and feeds the assembled release. | `license-notice-needed`: exact retained media provenance/license is not established by the runtime inventory or this maintenance. Do not claim distribution review passed. |
| Local UUPM | `.codex/skills/ui-ux-pro-max/` stays local/ignored and is not copied into shared specs. No design output is generated in this shell-only maintenance. | No shared UUPM source is added. Verify its exact source/version/retention permission before sharing generated third-party material. |

This inventory adds exact texts only from verified local sources. It does not
change the repository root license, vendor transitive dependencies or authorize
publication of notice-unresolved assets. Notice gaps do not block unrelated
developer CLI work; they remain explicit before later distribution decisions.

The copied JetBrains Mono notice retains its source's trailing space on line
21. Preserve those bytes: verify that notice with `cmp` against the existing
published license, and apply whitespace checks to the other changed files.
