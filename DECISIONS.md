# InertJS Architectural Decisions

This document records the architectural and design decisions made while implementing InertJS, especially where the master specification is silent or requires an alternative approach to avoid mimicking existing frameworks.

## M1: Monorepo Skeleton & CLI Base
- **Workspaces**: Using npm workspaces with `packages/*`.
- **ESM Strictness**: Every package sets `"type": "module"` and strictly uses `.js` extensions in imports.
- **Node constraints**: Setting engines to `node >= 22.0.0` in all packages as per spec C3.

## M3: Router
- **Catch-all Syntax on Windows**: The spec mandates `*name` for catch-all routes. However, `*` is an illegal character for directory names on Windows. To ensure cross-platform compatibility, InertJS uses `$name` for catch-all directories (e.g., `docs/$path`). This deviation from the spec is strictly due to OS file system limitations.

## M?: Vector — post-flush fragment failures
- **Problem**: With out-of-order streaming, a hole (`Promise` / async iterable / `defer()`) can reject *after* the synchronous shell — and therefore the HTTP status line and headers — has already been flushed to the browser. At that point the response can no longer be turned into a 500.
- **Decision**: A rejecting fragment is isolated to its own slot rather than tearing down the stream.
  - `renderToStream` never calls `controller.error()` once the shell is flushed; the outer `try/catch` there only guards *shell construction* (pre-flush), where failing the whole response is still correct.
  - The failed slot is patched with the fragment's `error` boundary (from `defer(source, { error })`), or emptied if none was supplied — so a skeleton never spins forever.
  - The patch carries `data-i-error="1"`; the client patcher then fires a `inert:fragment:error` `CustomEvent` on `window` and increments `window.__inert.fragmentErrors`.
  - `renderToStream(result, nonce, { onError })` receives `(err, { slot })` for server-side logging/telemetry.
  - Sibling fragments are unaffected; the stream still closes once all holes settle.
- **`defer()` helper**: `fallback` / `error` content is treated as trusted HTML (like `raw()`); untrusted values must be routed through `vec\`\`` first. `source` may be a lazy factory `() => Promise`; a synchronous throw from the factory is routed to the same error boundary.
- **Buffered renders**: `resolveToString` (Pulse navigation, Flash Mode) resolves `defer()` too, falling back to the `error` content on rejection instead of throwing.
