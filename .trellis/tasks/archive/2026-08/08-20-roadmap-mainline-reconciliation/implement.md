# Implementation plan: roadmap and mainline reconciliation

## Ordered checklist

1. Re-read the approved PRD, `.trellis/mainline.md`, archived P0/M5/M6/M7
   evidence, and the targeted workspace journal entry. Record the exact stale
   claims and operational tokens before editing.
2. Update `prd.md` to separate original migration inputs from current
   authored/publication facts; align current-state, Terminal, publication,
   milestone, MVP, risk, and unresolved/deferred sections with mainline
   evidence.
3. Redact only approved operational identifiers in the archived M6/M7 records
   and Trellis workspace journal. Preserve chronology, outcomes, generic
   topology, and legal attribution text. Inspect the diff for accidental
   credential, endpoint, or license changes.
4. Update `.trellis/mainline.md` only where the reconciliation needs a durable
   P1 evidence pointer or a refreshed next-decision statement. Do not add
   private deployment values.
5. Curate the implementation and check manifests, then run task-context
   validation.
6. Run documentation-focused stale-language and privacy scans, `git diff
   --check`, and an independent review of the final diff. No product build or
   production sync is required.
7. After the owner approves the final planning summary, start the task and
   execute the checklist. Finish with Trellis spec/update review, a local work
   commit, task archive, and session journal.

## Validation commands

```bash
python3 ./.trellis/scripts/task.py validate 08-20-roadmap-mainline-reconciliation
git diff --check
git grep -n -I -i -E 'majo\\.im|ssh[[:space:]]+[^ ]+@|cloudflare|staging\\.[[:alnum:]-]+(\\.[[:alpha:]]{2,})+' -- \
  .trellis/tasks/archive/2026-08/08-14-m6-staging-rollout \
  .trellis/tasks/archive/2026-08/08-15-m7-reverse-tunnel-staging \
  .trellis/workspace/sam/journal-1.md
rg -n 'open lab/<id>|尚未落地|NERV-only|NERV only|当前仓库的容器发布基线' prd.md
```

The privacy scan is expected to return no operational identifiers after the
redaction. Legal attribution files are intentionally outside its target set.
The stale-language scan is expected to return no unqualified old claims; any
remaining match must be explicitly historical in the final diff.

## Risk and rollback points

- A broad replacement could alter generic prose or legal attribution. Limit
  edits to the enumerated files and inspect every replacement.
- Marking a milestone complete without archived evidence would overclaim the
  product state. Use `.trellis/mainline.md` and task results as the authority.
- A documentation commit cannot affect the promoted release. If wording is
  wrong, revert only the work commit before archive bookkeeping.
