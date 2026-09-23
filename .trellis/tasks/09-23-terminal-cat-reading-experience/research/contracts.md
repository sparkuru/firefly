# Relevant current contracts and planned deltas

Read the indicated sections of .trellis/spec/frontend/content-workspace-contract.md
before editing. The full file exceeds the automatic injection size limit, so this
research note is a reading map, not a replacement executable spec.

- Lines 260-292: shared presentation registry, separate document navigator
  composition, public destination capability lookup, enabled/none/fallback routes.
- Lines 1057-1082: cat/open share path resolution; cat clones validated templates.
  Current lines 1068-1071 forbid a redundant Return to prompt footer because the
  input remains adjacent. A proposes a bounded header toolbar for long articles,
  not a footer. Preserve prompt adjacency and revise the documented rationale
  when the toolbar is approved and implemented.
- Lines 1085-1110: Ctrl+C/Ctrl+L, composition and protected-event exclusions.
- Lines 1230-1243: documents settle at the title; non-document output and clear
  retain their separate settlement policies.
- Lines 1245-1267: no home navigator asset; open intent uses the shared destination
  helper. Existing permalink and ordinary body links remain fragment-free.
  A's new Open document action is explicit open intent, distinct from permalink;
  do not decorate all links or activate an inline document navigator.
- Lines 1341-1502: validation matrix and required tests, including prompt
  adjacency, native modified clicks, protected interactions and repeated output.

Also retain the complete x-core-contract and development-runtime contracts already
included in the context manifests. Plans do not override current specs until
owner review and validated implementation.
