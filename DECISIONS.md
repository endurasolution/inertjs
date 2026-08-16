# InertJS Architectural Decisions

This document records the architectural and design decisions made while implementing InertJS, especially where the master specification is silent or requires an alternative approach to avoid mimicking existing frameworks.

## M1: Monorepo Skeleton & CLI Base
- **Workspaces**: Using npm workspaces with `packages/*`.
- **ESM Strictness**: Every package sets `"type": "module"` and strictly uses `.js` extensions in imports.
- **Node constraints**: Setting engines to `node >= 22.0.0` in all packages as per spec C3.

## M3: Router
- **Catch-all Syntax on Windows**: The spec mandates `*name` for catch-all routes. However, `*` is an illegal character for directory names on Windows. To ensure cross-platform compatibility, InertJS uses `$name` for catch-all directories (e.g., `docs/$path`). This deviation from the spec is strictly due to OS file system limitations.
