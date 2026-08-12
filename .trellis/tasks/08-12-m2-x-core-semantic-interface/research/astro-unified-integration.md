# Astro 7 / Unified Integration Evidence

## Installed API Evidence

The task targets the already locked main-site stack, not a hypothetical Astro
version:

- `apps/site/package.json` pins Astro `7.1.6` and
  `@astrojs/markdown-remark` `7.2.2`.
- `@astrojs/markdown-remark/dist/processor.d.ts` shows that `unified(options)`
  accepts ordered `remarkPlugins`, `rehypePlugins`, and `remarkRehype` options.
- `@astrojs/markdown-remark/dist/index.js` shows user remark plugins run before
  remark-to-rehype conversion, and user rehype plugins run before Astro's image
  resolution and built-in heading-ID collection.
- Astro's built-in heading plugin preserves an existing string `id`, so X Core
  can assign deterministic heading IDs and Astro will report the same IDs.
- The renderer creates one VFile containing `file.data.astro.frontmatter` and
  returns that object as rendered metadata.
- `astro:content`'s `render(entry)` exposes the rendered component, headings, and
  `remarkPluginFrontmatter`. This gives routes a supported bridge to
  X Core-generated serializable analysis without browser parsing.

## Design Consequences

1. Build one paired X Core plugin factory whose remark and rehype plugins share
   per-file state privately. Do not put mdast/hast trees or adapter instances in
   frontmatter metadata.
2. The remark stage detects prohibited raw HTML, derives prose/reference facts,
   and captures source context before conversion.
3. The rehype stage assigns stable IDs, resolves the registered presentation,
   transforms the HAST, validates enhancement references, and publishes only a
   versioned JSON-compatible `xCore` result under rendered plugin frontmatter.
4. Configure `remarkRehype.allowDangerousHtml` to `false`, while detecting raw
   mdast HTML first so prohibited content fails instead of disappearing silently.
5. A shared app helper wraps `render(entry)` and validates/narrows the generated
   metadata. Post/page routes consume that helper rather than decoding arbitrary
   plugin output independently.
6. X Core receives an app-owned context resolver. It does not infer Astro routes,
   draft policy, collection loading, or deployment behavior.

## Package Boundary Decision

Create private, independently checked packages at `packages/x-core/` and
`presentations/semantic/`, matching the root architecture. They are repository
implementation units, not npm products or an npm workspace. Each owns an exact
lockfile and build/test scripts. Root scripts establish the deterministic order:
X Core, semantic adapter, then `apps/site`.

The site consumes compiled ESM entries and explicitly allows the repository
package paths in the Vite development boundary if required. This avoids
depending on transitive modules from `apps/site/node_modules` and makes every
runtime import a declared dependency of its owning package.

## Risks to Prove During Implementation

- A clean lockfile install followed by the documented build order resolves both
  private packages from Astro config in check, build, dev, and Playwright modes.
- Generated plugin frontmatter is not treated as authored schema input and does
  not mutate `entry.data` in a way routes depend on.
- X Core IDs remain deterministic across repeated processing and do not conflict
  with Astro's later heading collector.
- Package output and source imports never enter NERV or the final static asset
  bundle.
