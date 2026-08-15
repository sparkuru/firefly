# Capability-shell safety research

## Owner decisions

- V1 includes session-only scratch redirection (`>`/`>>`), bounded pure nested
  command substitution (`$(...)`), and a safe regex grep mode.
- Security is command-local: each command owns and declares its resource
  boundary; the router does not confer ambient access.
- Nested expressions are a deliberate knowledge-blog expression feature.
- Grep may inspect only stdin and resources represented by the rshell virtual
  resource directory. It must not enumerate system, process, network, private,
  or browser-storage resources.

## Regex engine decision

RE2's published syntax excludes backreferences and lookaround, and RE2 documents
linear-time matching in input size. See the [RE2 syntax reference](https://github.com/google/re2/blob/main/doc/syntax.html)
and [RE2 project overview](https://github.com/google/re2). A browser package
named `re2-wasm` exists, but its npm page reports a five-year-old release and no
dependencies; importing an aging WebAssembly wrapper would add supply-chain and
bundle/CSP considerations to this static terminal.

The v1 plan therefore specifies a small project-owned, iterative regular-language
engine with RE2-like familiar syntax rather than native JavaScript regex or a
new runtime dependency. It supports only documented regular constructs and fixed
budgets. This is deliberately not a claim of full RE2/PCRE/POSIX compatibility.

## Required capability checks

| Feature | Allowed | Rejected |
| --- | --- | --- |
| Pipeline | immutable stdout lines to a following command | process pipes, stderr merging, arbitrary byte streams |
| Substitution | bounded AST of pure-text commands | eval, host command strings, state/navigation/write commands |
| Redirection | replace/append a safe in-memory scratch leaf | public content, host/browser filesystem, storage, network |
| Grep | stdin, public normalized corpus, named scratch leaf | host paths, private/draft data, URLs, arbitrary objects |
| Regex | bounded RE2-like regular subset | backreferences, lookaround, native backtracking regex |

## Test posture

Tests must prove capability denial per command, not merely at the top-level
parser: a syntactically valid but unauthorized resource, substitution body,
redirection target, or regex construct must fail without partial scratch/state
change. Fuzz-like adversarial pattern/input fixtures cover parser depth, repeat
bounds, output caps, and regex work limits.
