# Publication route alignment — technical design

## Route contract

The current authored post is materialized at
`posts/ai/llm-workflow-with-trellis/index.html`, and its public URL is
`/posts/ai/llm-workflow-with-trellis/`. The assembler identifies authored site
documents from relative output shape, not from a fixed list of article names.

The post rule therefore accepts `posts` paths with at least four segments and
an `index.html` leaf. Page handling remains exactly three segments. Existing
reference decoding, safe path checks, inventory checks, and publication
promotion behavior are unchanged.

## File ownership

- `apps/site/tests/fixtures/comments-valid.json` owns the public comments
  fixture route.
- `package-runtime.sh` owns representative runtime probes.
- `tooling/assemble-publication/src/index.ts` owns authored document detection.
- `tooling/assemble-publication/tests/assembler.test.ts` owns route-depth
  regression coverage.
- `tooling/assemble-publication/tests/publication.spec.ts` owns the browser
  representative route.

The route line in `services/comments/staging.env.example` is a bridge hunk and
is reconciled by the parent integration review so the child remains focused on
publication/test alignment.

## Rollback

If a deeper route causes an unexpected inventory or reference regression, revert
the route-depth rule and its new regression fixture together; retain canonical
fixture updates only when they describe an already-published route.
