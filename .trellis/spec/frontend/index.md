# Firefly Frontend and Publication Specs

## Pre-Development Checklist

1. Read [Firefly Architecture](./architecture-contract.md) for ownership and
   dependency direction, then [Directory Structure](./directory-structure.md)
   for file placement.
2. Open the topic contract for the boundary being changed. Read the source and
   tests named there before changing a field, route, adapter, or build step.
3. Identify whether the change affects static reading, an Experiment mount,
   private comments, or the repository/deployment release boundary.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Firefly Architecture](./architecture-contract.md) | Product boundary, dependency direction, routes, publication flow, quality invariants | Established |
| [Directory Structure](./directory-structure.md) | Source and artifact ownership by path | Established |
| [Component Guidelines](./component-guidelines.md) | Component patterns, props, composition | To fill |
| [Hook Guidelines](./hook-guidelines.md) | Custom hooks, data fetching patterns | To fill |
| [State Management](./state-management.md) | Local state, global state, server state | To fill |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | To fill |
| [Type Safety](./type-safety.md) | Type patterns, validation | To fill |
| [Development Runtime](./development-runtime.md) | Container commands, local servers, and validation boundaries | Established |
| [Content Workspace](./content-workspace-contract.md) | Authoring, publication input, and content routes | Established |
| [X Core and Presentation](./x-core-contract.md) | Document transform, adapter, metadata, and enhancement contracts | Established |
| [Experiment Publication](./publication-contract.md) | Manifests, isolated builds, safe static assembly, and runtime inventory | Established |
| [Comments and Publication](./comments-publication-contract.md) | Private write service and static public read projection | Established |
| [Memo Contract](./memo-contract.md) | Independent memo wire/config contract, strict decoding, and consumer boundaries | Established |
| [Memo Service](./memo-service-contract.md) | Independent private submission, verification, moderation, encrypted mail, export and recovery | Established |
| [Memo Site](./memo-site-contract.md) | Conditional static memo stream, strict export loading, native visitor form and independent navigation | Established |
| [Site Configuration](./site-configuration-contract.md) | Public TOML, SEO, and content themes | Established |
| [Homepage Search](./homepage-search-contract.md) | Public metadata/body search, mobile UI lifecycle, failure recovery and validation | Established |
| [Mobile Experience](./mobile-experience-contract.md) | Native mobile homepage, absent Terminal ownership, input-mode transitions and article-reading policy | Established |

---

## Quality Check

- Verify the changed behavior against the selected topic contract's validation
  matrix and focused tests.
- Check dependency direction, static fallback, route ownership, private-data
  exclusion, and package-local builds when crossing a module boundary.
- Use [Development Runtime](./development-runtime.md) and the
  [validation profile](../trellis-plus/validation-profile.md) to select the
  appropriate repository gate. Keep operator deployment checks at the
  deployment boundary.

---

**Language**: All documentation should be written in **English**.
