# Memos Design Exploration

## Evidence and Method

Reviewed the current Memo layout, feed, entries, stylesheet, owning document
contract, and project frontend workflow. Ran the local UUPM design-system search
for `personal microblog timeline spacious content-first dark subtle cyan` with
density 2, plus an Astro stack search for static progressive enhancement.
This record summarizes our interpretation rather than retaining database prose.
The owner subsequently approved the final light-theme design and implementation;
`design.md` records that approval and supersedes the initial alternatives here.

## Current Layout

- `apps/site/src/styles/memo.css:38`: outer reader width is capped at 70rem.
- `apps/site/src/styles/memo.css:42`: timeline uses a 12rem rail, a central
  column capped at 43rem, and a 3rem gap.
- `apps/site/src/styles/memo.css:65`: the feed has a bordered rounded surface.
- `apps/site/src/styles/memo.css:66`: entries have nested horizontal padding.
- `apps/site/src/styles/memo.css:95`: detail reading has its own 43rem surface.
- `apps/site/src/components/MemoDocument.astro:22`: aggregate and details share
  the Memo reader and retain explicit return navigation.

## Proposed Visual Options

1. Clean personal feed: broad desktop shell, quiet dividers, generous entry
   spacing, navigation on the left and historical context on the right.
2. Expressive dark timeline: the same content hierarchy with charcoal surfaces,
   restrained cyan accents, an illuminated active-time cursor, and subtle state
   feedback. Keep body text clear and free of decorative glow.

A candidate desktop shell of roughly 1280–1440px can allocate approximately
200–220px to navigation, 720–800px to the feed, and 240–280px to historical
navigation. These are exploration ranges; account for gutters and available
viewport width rather than summing fixed columns blindly.
The feed's readable measure should remain bounded even when the shell grows.
Mobile should prioritize a single feed and reachable historical navigation.

## Recommendation Judgment

The generic generator suggested unrelated newsletter conversion elements and
Latin display fonts. Those do not establish requirements for this existing
Chinese personal-note reader. Preserve the project's Astro static presentation
and progressive enhancement. Typography, theme choice, and accents should be
decided against actual content and the owner's visual preference.

Twitter inspiration can inform navigation and feed rhythm. Existing contracts
already avoid repeated author identity; use site identity once in the shell.
Moving the desktop time rail from left to right would change the current
document contract and needs an explicit approved design plus corresponding
spec updates during implementation.

## Pending Decisions and Verification

The initial exploration left theme and surfaces open. Both are now resolved in
the approved PRD/design, along with breakpoint behavior, empty/single/no-JS
states, sticky clearance, keyboard/touch access and reduced-motion behavior.
Implementation requires maintained desktop/mobile browser coverage and visual
acceptance; the planning pass itself did not execute browser tests or build the
product.

## Apple-Inspired Interaction Follow-Up

The owner requested a small amount of Apple-website-inspired interaction.
Consulted the official iPhone overview at `https://www.apple.com/iphone/` as
reference for content hierarchy and feature exploration. The text-based browser
does not validate live animation timing; the proposals below are our design
adaptation rather than verified claims about that site's runtime effects.
Also queried local UUPM guidance for scroll feedback and reduced motion.

Candidate effects for owner discussion:

- An intro that yields to a compact sticky feed heading as reading begins.
- A date bubble adjacent to the scrubber cursor while dragging or using keys.
- Brief target emphasis after a discrete seek; natural scrolling keeps quiet
  active-state feedback.
- Subtle link/control hover, focus, and press feedback, avoiding false card-wide
  click affordances because Memo bodies contain selectable text and nested links.

The existing controller already distinguishes browse/drag/settle ownership and
aligns seeks immediately. Preserve responsive dragging rather than scheduling
overlapping smooth scrolls for each pointer frame. Header size changes must
respect measured clearance and seek stability. Body text stays available on
initial render; feedback must not hide feed entries behind reveal animations.

The owner selected the silver/white and light-gray direction. Exact interaction
set was subsequently detailed in the final design proposal. The owner included
both feed and details, then explicitly approved the final planning summary for
implementation.

A second design-system query used `personal microblog reading timeline minimal
silver white subtle depth spacious`, again with density 2. Its monochrome/light
recommendations inform palette and whitespace exploration; generic conversion
elements, oversized marketing typography and remote Latin font imports are not
part of this reader design. `design.md` is the authoritative proposal.
