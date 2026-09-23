---
title: Semantic inline reading
slug: inline-reading-semantic
date: 2026-09-23
description: Synthetic table typography coverage for semantic content in the terminal stream.
draft: false
layout: page
presentation: semantic
---

## Semantic inline reading

| Label | Inline code |
| --- | --- |
| token | `semantic_inline_identifier_abcdefghijklmnopqrstuvwxyz_abcdefghijklmnopqrstuvwxyz_abcdefghijklmnopqrstuvwxyz_abcdefghijklmnopqrstuvwxyz` |

## Reading checkpoint

This heading provides an ordinary fragment target for navigation tests. Opening
its outline link should leave the document navigator inactive and let the
browser retain normal heading focus.

A reader can enter navigation after reaching this checkpoint. Entering changes
only the fragment and does not add a history entry or move the reading position.
Exiting restores the remembered checkpoint with the same scroll position.

## Reading positions

The page deliberately contains several short sections so desktop and phone
viewports both have meaningful scroll positions. The text is synthetic and
contains no dependency on an external writing workspace.

A command may move to the next reading unit while the navigator is active.
Repeated entry should preserve that unit instead of restarting at the beginning.
The visible status belongs to the viewport while content continues scrolling.

## Browser history

Following a normal heading link creates an ordinary browser fragment boundary.
Back returns to the navigator fragment, and Forward returns to the heading.
Neither transition should manufacture a second history entry.

The native entry link remains useful without enhancement. Modified clicks keep
their ordinary browser behavior, and a direct canonical visit does not take
keyboard focus away from the reader.

## Final checkpoint

The final section makes the lower reading position distinct from the opening.
The fixture keeps native headings and paragraph structure, allowing tests to
measure actual layout instead of adding artificial element heights.

Leaving the navigator should keep the current page open. The local exit control
returns focus to its entry link and hides the navigation status without changing
the viewport or replacing the authored document.
