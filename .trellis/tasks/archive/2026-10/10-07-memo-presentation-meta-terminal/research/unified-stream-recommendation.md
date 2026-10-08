# Unified Memo Stream Recommendation

The owner asked whether short entries and long notes actually need separate
views, then approved the unified 269-entry stream on 2026-10-07.

Recommend one chronological stream for the 180 historical short entries and
89 existing notes. Their different legacy source tables and length distributions
do not, by themselves, establish distinct owner-authored content types. The
confirmed navigation concept is historical-time scrubbing; separate views would
change occupied-month sets and rail geometry whenever the view changes.

Handle reading density through presentation: short bodies can appear in full,
while long bodies use a bounded preview with access to complete content and
their individual reading view. Preserve authored titles where meaningful;
do not force titles or short/note categories onto brief entries solely to
implement a view filter. Automatic preview length is not a source classification
or body truncation policy.

Tags may eventually describe subjects, but tag filtering is not required to
solve the observed body-length difference. Keep that future behavior separate
from current scope and do not fabricate classifications or labels during import.

This approved decision replaces the earlier recommendation for
short-entry/note/all tabs. Exact preview/expand treatment and shared metadata
requirements remain planning decisions.
