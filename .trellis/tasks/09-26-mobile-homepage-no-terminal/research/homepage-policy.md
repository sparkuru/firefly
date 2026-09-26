# Homepage policy research

## Intent and root cause

The owner confirmed mobile home means search and native browsing, without Terminal startup/command line. Past dialogue was checked with `trellis mem`: project session `01a0d268-275e-7dd0-a2a0-861a653059ed`, turn 27 contains the original ordinary-mobile-reading intent; turns 36-38 show its narrower navigator plan. The current conversation explicitly resolves homepage scope.

The previous task/spec/test baseline scoped mobile constraints to the navigator and kept homepage Terminal. This repair must update that baseline and durable constraints, not just add `display: none`.

## Code boundaries

- `TerminalHome.astro` installs connecting/key guards inline before modules and invokes search then Terminal unconditionally.
- `terminal-home.ts` `startTerminalHome(root, seams = {})` returns `void`, creates state/listeners/boot timers, and hides fallback/reveals session at boot completion. There is no public teardown handle. Inspect document composition/typing/clear listeners and async continuations for availability.
- `terminal.css` connecting and `[hidden]` rules hide native recovery; mobile must show native browsing regardless. Remove the search-plus-empty-Terminal viewport rule.
- `home-search.ts` owns independent media/failure/extraction behavior. Preserve matching/public projection and do not depend on Terminal readiness.
- Reuse exact `MOBILE_DOCUMENT_NAVIGATION_QUERY`; do not invent width/UA detection. Homepage availability and article navigator policy are separate.
- Search, Terminal and navigator-mobile suites assume a mobile shell in some cases. Revise those baselines while retaining desktop and mobile ordinary-reading coverage, with explicit registration for any new suite.

## Spec and evidence boundaries

No standalone mobile experience spec exists. Add a focused indexed frontend contract and update conflicting search/workspace paragraphs. The oversized content-workspace spec requires targeted direct reads if injection truncates it. Final executable specs will track reviewed code, not hypothetical APIs.

Use wrapper-built tracked public fixtures, site gates, desktop Terminal/navigation regressions, mobile no-shell/search/reading checks, and static native browsing. Include mode switches while connecting/ready, hidden-focus release, non-intercepted native keys, search failure and responsive geometry. Viewport captures avoid the prior full-page screenshot touch-emulation reset. No physical device, private content or external access is required; real keyboard review remains optional.
