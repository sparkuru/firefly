# Design: roadmap and mainline reconciliation

## Authority and boundaries

- `.trellis/mainline.md` is the current release-state authority: M0–M5 and
  production are complete, M7 is the accepted staging evidence, M6 is
  superseded, and M5.1 is deferred.
- `prd.md` remains the product-scope authority, but its original migration
  counts and historical assumptions must be labeled as source history rather
  than silently replaced with current output facts.
- Archived task records remain chronological evidence. This task may redact
  only operational identifiers in the explicitly approved M6/M7 records and
  Trellis workspace journal; outcomes, dates, decisions, and legal attribution
  text remain intact.
- Exact deployment values remain in the owner-only local execution record;
  no repository document will link or copy them.

## Document targets

1. `prd.md`: current-state wording, directory/runtime baseline, Terminal
   grammar, publication pipeline, milestone table, MVP checklist, risks, and
   pending decisions.
2. `.trellis/mainline.md`: only the continuity/evidence pointers needed to
   record this reconciliation and keep the next decision accurate.
3. Archived M6/M7 records: neutralize real host/domain, SSH, CDN/edge, and
   public staging identifiers in `prd.md`, `design.md`, `implement.md`, and
   execution evidence while retaining generic topology and outcomes.
4. `.trellis/workspace/sam/journal-1.md`: neutralize the matching operational
   identifier in the historical session entry; do not rewrite unrelated
   journal entries or license provenance.

## Transformation rules

- Use neutral placeholders or generic descriptions such as “staging name”,
  “SSH alias”, and “staging edge”; neither the wording nor any placeholder may
  resemble a routable endpoint or credential.
- Preserve factual status words (`complete`, `deferred`, `superseded`) and
  links to archived tasks. Do not turn historical plans into current
  authorization.
- Keep internal VFS/HTTP route notation slash-rooted, but use the current
  user-facing Terminal grammar (`cwd-relative` or `~/blog`) in product-facing
  examples.
- Distinguish the original SQL source baseline (93 posts/7 pages) from the
  current authored workspace inventory (95 posts/8 pages) and avoid implying
  that either count alone is the full product contract.

## Compatibility and rollback

This is documentation-only. No application, build, deployment, DNS, release,
or tag behavior changes. A mistaken wording change is reverted by the single
documentation commit; the production publication and private execution record
are unaffected.
