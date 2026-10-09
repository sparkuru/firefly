# Implementation and validation

1. Read task/spec context; implement standalone metadata/Share and distinguish
   document-opening intent from Experiment navigation in the site controller.
2. Add static/order/default/license/canonical checks, meaningful Share lifecycle
   and popup/source-session regressions. Update existing navigator/Open tests
   for the explicitly changed behavior rather than skipping them.
3. Build tracked fixtures using the maintained wrapper/config, run targeted
   browsers first, then affected complete Terminal/navigator/site tests across
   desktop/static and narrow mobile/interactive policies.
4. Independently review source, focused semantics and rendered desktop/narrow
   visuals; preserve failure evidence and fix actual blockers. Root owns spec,
   task acceptance and mainline continuity.
5. Rebuild the existing configured local publication only after browser/review
   commands finish; confirm readiness and exact served bundles. Reuse prior
   commit authorization for the ongoing Terminal refinement after concrete
   review. Work commit precedes supported archive and journal commits; no push.

All Node/browser work uses `./preview.sh render` (pinned browser image and host
IPC). Fixture build/browser commands set tracked `FIREFLY_CONTENT_ROOT` and
`.firefly/memos/browser-fixture/config/site.toml`. Owner-preview refresh uses
the existing configured `./preview.sh build` without configuration changes.
