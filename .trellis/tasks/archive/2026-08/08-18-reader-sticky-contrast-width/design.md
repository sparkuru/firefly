# Design: Reader sticky contrast and full-width layout

The status section remains inside each existing reader root so the controller
and fragment/native fallback contracts do not change. Its presentation becomes
full-bleed relative to the centered document frame: the semantic article keeps
its readable child measures while the status section uses the centered parent
width to bleed to the viewport without changing prose layout.

Both presentation variants use an inverse surface already represented by their
theme palette. Semantic status text and controls must override the normal
light-theme foreground rules because the panel becomes dark. Terminal status
text and controls must likewise override its normal dark-theme foreground rules
because the panel becomes light. Existing borders, focus treatment, search
suppression, sticky positioning, and normal-flow height reservation remain.

Browser assertions should measure the initial visible Terminal panel and the
explicit semantic fragment panel at desktop and mobile widths. They should
prove sticky positioning, full viewport edges, an opaque surface distinct from
the canvas, readable foreground/background separation, no document overflow,
and unchanged readable prose/frame constraints.
