# M5.1 Static Comment Consumer

## Scope

Consume the service's sanitized `comments.public.v1.json` during the Astro
build and render post-scoped comments and a native submission form in both
canonical document presentations. Preserve the current static-only runtime,
no-JavaScript reading, and all page/experiment/inline-Terminal exclusions.

## Acceptance criteria

- Empty or absent local export preserves the current no-comment build.
- A strict decoder accepts only schema-versioned public fields, current
  canonical `/posts/.../` routes, plain text, safe HTTPS homepages, direct
  replies, and deterministic timestamps; private sentinels never reach HTML.
- Semantic and Terminal canonical post pages render the same validated
  post-scoped records and native form; pages, indexes, `/lab/`, 404, and inline
  `cat` output do not render comments or forms.
- The form targets only the configured HTTPS write origin, has no read/count
  request, and remains useful with JavaScript disabled.
- Unit, static-output, and focused browser coverage proves escaping, route
  binding, responsive semantics, and private-data exclusion.

## Out of scope

No database access, runtime comment API, client fetch, accounts, rich text,
historical import, or publication handoff changes.
