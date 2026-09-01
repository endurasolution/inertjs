# Changelog

All notable changes to InertJS are recorded here. Versions are published in
lockstep unless noted; internal `^1.0.0-beta.x` ranges resolve upward, so a leaf
publish propagates to dependents.

## 1.0.0-beta.8

### `inertjs-vector`

- **Deferred fragments: `timeout`.** `defer(source, { timeout: 5000, error })` fails
  the fragment with a `DeferTimeoutError` (`code: 'E_INERT_FRAGMENT_TIMEOUT'`) once
  the deadline passes, routing it to the `error` boundary / `onError` hook like any
  other rejection instead of leaving the skeleton to hang.
- **Abort propagation.** `renderToStream(view, nonce, { signal })` stops the stream
  when the signal aborts, when the consumer cancels it, or when a write reveals the
  client has gone. `defer` factories are always called as `defer(({ signal }) => …)`
  so they can cancel their own I/O.
- **One patcher script per document.** The client patcher is now emitted once into
  the shell (a `MutationObserver` plus an initial sweep) instead of re-appending a
  full `<script>` after every patch — O(n) instead of O(n²), and a single inline
  script under CSP rather than one per fragment. Patches are now bare
  `<template data-i-fill>` elements.
- **Dev-mode failure marker.** When a fragment fails and no `error` boundary is
  configured, non-production builds render a visible dashed-outline marker with the
  (escaped) error message; production stays silent.
- `renderToStream` and `DeferTimeoutError` are now re-exported from the package root.

### `inertjs-core`

- The render pipeline wires streaming into the framework: a route may
  `export const onFragmentError = (err, { slot, req, params, scope }) => …`;
  the response's `AbortController` fires on client disconnect and is handed to
  `renderToStream`; and the Node stream now has an `error` listener so a
  pre-flush render failure can no longer crash the process.

## 1.0.0-beta.7

### `inertjs-vector`

- **Out-of-order streaming fragment failures are isolated.** Once the shell has
  flushed, a hole (`Promise` / async iterable / `defer()`) that rejects can no
  longer become a 500. The slot is patched with the fragment's error boundary
  (or emptied), the client gets an `inert:fragment:error` event on `window` plus
  `window.__inert.fragmentErrors`, `renderToStream`'s `onError` hook is invoked,
  and sibling fragments keep streaming.
- **New `defer(source, { fallback, error })` helper** for a first-class skeleton
  and per-fragment error boundary. `source` may be a lazy factory; a synchronous
  throw from it is routed to the boundary. `resolveToString` (Pulse navigation /
  Flash Mode) resolves `defer()` too.
- Release the reader lock in nested-stream draining; guard `enqueue`/`close`
  against client disconnect.

### `create-inert`

- Full npm README; version aligned with the registry.
