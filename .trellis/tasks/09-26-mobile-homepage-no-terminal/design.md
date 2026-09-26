# Design: native mobile homepage and desktop Terminal

## Policy and artifact boundaries

Reuse `MOBILE_DOCUMENT_NAVIGATION_QUERY` for homepage eligibility. Homepage shell availability is distinct from a presentation's navigator `supportsMobile`; preserve normal article rendering and navigator profiles. Do not add another configuration field or width/user-agent detection.

Keep one shared static public homepage artifact, its native index, and sanitized inert search templates. Desktop progressively enhances browsing into Terminal; mobile retains native browsing and independently initializes search.

## Static and early startup

Mobile CSS hides startup/session/shell-only framing and shows native browsing regardless of connecting or `hidden` flags left by desktop. Remove the mobile Terminal flex/empty-prompt viewport layout. The inline marker must gate before setting connecting or installing Escape/Ctrl+L guards. Module entry must not launch Terminal on an initially mobile page. Invalid Terminal-only data must not become a mobile command-error surface.

## Runtime transitions

Availability is a lifecycle boundary, not CSS alone. An initially mobile page creates no Terminal session or boot state. Desktop initialization is single-instance. When becoming mobile after desktop initialization, suspend input ownership, cancel/suspend pending boot work, dismiss completion, and blur Terminal-owned focus. Async boot/effect callbacks must not restore mobile focus or shell visibility. Returning to desktop establishes one usable session without duplicate listeners/effects, preserving session state where feasible without changing commands.

Choose the smallest cohesive typed entry/controller mechanism after direct inspection; `startTerminalHome` currently returns `void` and has no public teardown handle to assume available. Any cleanup/resume mechanism remains site-owned. Do not create another Terminal implementation or fake media policy to satisfy obsolete tests. CSS/runtime eligibility must agree at every transition.

## Search and browsing

Preserve strict public metadata/template validation, lazy extraction and matching helpers. Search is independent of Terminal validation/readiness. Empty/cleared queries retain native browsing; failure hides search controls and retains links, never opening Terminal. Results retain canonical fragment-free destinations. Suppress shell-only recovery framing (prompt plus `ls`, optional-shell instructions, Terminal errors); existing native groups/links can remain without a broad redesign.

## Spec synchronization

Add `.trellis/spec/frontend/mobile-experience-contract.md` as the discoverable authority for eligibility, native homepage, absent shell input ownership, article reading, transitions, failure and validation. Include reviewed final signatures/selectors and good/bad examples. Link from frontend index, search and content-workspace contracts; remove obsolete mobile Terminal layout/startup requirements.

## Verification and rollback

Replace mobile-shell-positive baselines with explicit absence/native-event/link tests; keep desktop command and article-reading coverage. Cover delayed/disabled/unavailable JavaScript, pending boot transitions, ready transitions, failure, repeated coarse/fine switches, portrait/landscape/tablet and narrow desktop. Use wrapper-built tracked fixtures and viewport captures, avoiding the prior pinned full-page screenshot touch-emulation reset. Rollback is limited to this availability/style/test/spec repair; retain article search and authored/remote state.
