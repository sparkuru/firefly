# Research — real Terminal article selection

## Authorization and scope

The owner authorized use of articles under:

```text
/home/wkyuu/cargo/repo/04-flyMe2theStar/03-genshin/online/
```

The directory was audited read-only. It contains 46 Markdown files and roughly
10 GB in its wider subtree. M3 must not treat this authorization as approval for
bulk migration: it copies exactly one article into `content/posts/`; the source
repository remains untouched, and M5 retains full migration ownership.

## Selection

Use:

```text
41-llm-workflow-with-trellis.md
```

Target:

```text
content/posts/llm-workflow-with-trellis.md
```

It is the strongest M3 vertical slice because its subject matches the current
repository workflow and its body exercises a representative Markdown surface:

- blockquote at source lines 5–7;
- table at lines 13–18;
- fenced summary at lines 24–28;
- Mermaid source fence at lines 32–121;
- list at lines 126–129;
- Bash/tree code at lines 139–192;
- nested H2/H3/H4 structure, tables, and lists through line 346.

The article is about 346 lines. It is long enough to expose terminal document
measure, local overflow, focus, and mobile reading defects without importing a
large asset tree.

## Safety and dependency audit

- No embedded images, local asset paths, remote embedded assets, authored raw
  HTML, or directives.
- The `<br/>` strings occur inside the Mermaid fence and remain inert code; they
  do not enter the raw-HTML path.
- One public Trellis source URL is the only external link dependency and is not
  required for rendering.
- No secrets, credentials, private hostnames/IPs, personal machine paths, or
  reader data were found. `pm-alice` and `unitree-g1-tests` are explicit worked
  examples.
- Git history dates the original to `2026-05-28`, updated `2026-07-03`. Preserve
  those authored dates in front matter.
- The source repository has an author-written license rather than a standard
  OSI identifier. The owner explicitly authorized reuse; retain authorship and
  source provenance in migration evidence rather than silently treating the
  article as generated fixture text.

## Required normalization

1. Add only the strict authored fields: title, slug, date, updated, description,
   tags, draft, layout, and presentation.
2. Move the source H1 into `title`; body headings then start at H2 and remain
   sequential.
3. Set `presentation: terminal` and slug `llm-workflow-with-trellis`.
4. Convert the bare Trellis URL into an explicit Markdown link.
5. Keep the Mermaid fence as readable source; add no Mermaid browser runtime.
6. Correct only demonstrably outdated workflow claims and the
   `spec-bootstarp` typo. Record each prose edit and why it was needed.

The existing `hello-static-foundation` post and About page remain semantic so
the emitted site proves both presentations with real routes.

## Editorial mode

The article has a recognizable first-person author voice, concrete opinions,
and mixed sentence rhythm. Apply `compose-with-llm` A mode (preserve the person):

- assume rough edges are handwriting, not defects;
- make the smallest possible factual/formatting correction;
- do not invent scene-setting, metaphors, slogans, symmetry, or conclusions;
- after editing, inspect only changed prose for AI-writing patterns;
- hand off a per-change ledger so the owner can reject any uncertain edit.

## Rejected candidates

- `14-firmware-emulation-over-docker.md` is compact and asset-free but less
  polished and less aligned with M3.
- `15-hedgedoc-offline-with-mdns.md` needs substantial desensitization of local
  domains, proxy paths, and credential-shaped examples.
- `40-handle-a-dhcp-problem-with-tshark.md` is compact but exposes local network
  observations that should be generalized.
- Several other files contain Windows image paths, raw HTML, private/local
  paths, large security payloads, or incomplete notes. They remain M5 audit work.
