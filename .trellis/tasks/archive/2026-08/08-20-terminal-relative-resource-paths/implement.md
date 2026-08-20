# Terminal relative resource paths — Implementation Plan

1. Make the VFS operand parser and compatibility facade accept only relative
   forms or the display-root absolute `~/blog` form; preserve internal
   slash-rooted VFS keys and browser routes.
2. Update every completion path to share that operand classification, preserve
   `~/blog` prefixes, and reject slash-root input without rewriting/focus loss.
3. Update `open` execution to resolve every safe operand from the current
   virtual cwd; require a resolved listed experiment before emitting the
   existing validated navigation control.
4. Convert scratch redirect/error display forms and all Terminal help/generated
   command examples to the public operand grammar.
5. Add resolver and command matrices for root/nested cwd, relative, `./`,
   `~/blog` absolute, slash-root rejection, hostile input, type boundaries,
   scratch, and completion forms.
6. Add focused interactive browser coverage for cwd-relative `open`, absolute
   `~/blog` navigation, slash-root rejection without state/focus changes, and
   the unchanged HTTP route behavior.
7. Update virtual-path frontend contracts to distinguish internal VFS/URL
   values from user operand syntax; run the Terminal and site checks/builds,
   focused interactive browser suite, and full affected checks.
8. Hand the verified source change back to P0 for release and acceptance.
