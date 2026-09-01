import { escape } from './escaper.js';
import { RawString } from './index.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const PATCHER_SCRIPT = `<script nonce="[INERT_NONCE]">
(function(){
  const ds=document.querySelectorAll('template[data-i-fill]');
  for(let d of ds){
    const id=d.getAttribute('data-i-fill');
    const slot=document.getElementById('i-slot-'+id);
    if(slot){
      const errored=d.hasAttribute('data-i-error');
      slot.replaceWith(d.content);
      if(errored){
        const s=(window.__inert=window.__inert||{});
        s.fragmentErrors=(s.fragmentErrors||0)+1;
        try{window.dispatchEvent(new CustomEvent('inert:fragment:error',{detail:{slot:id}}));}catch(e){}
      }
    }
    d.remove();
  }
})();
</script>`;

/**
 * Fully drains a WHATWG ReadableStream of Uint8Array chunks into a string,
 * always releasing the reader lock.
 */
async function drainStream(readable) {
  const reader = readable.getReader();
  let html = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
    }
    html += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  return html;
}

/**
 * Resolves an already-settled value (the result of `await`ing a hole) into an
 * HTML string, recursing through nested streams, RawStrings and arrays.
 */
async function valueToHtml(value, ctx, attrName, nonce) {
  if (value == null || value === false) return '';
  if (value instanceof RawString) return value.value;
  if (value && value.type === 'VecStream') {
    return drainStream(renderToStream(value, nonce));
  }
  if (Array.isArray(value)) {
    let out = '';
    for (const item of value) out += await valueToHtml(item, ctx, attrName, nonce);
    return out;
  }
  return escape(value, ctx, attrName);
}

/** Synchronously resolves a fragment's skeleton (must be inlined into the shell). */
function skeletonHtml(fragment) {
  const f = fragment && fragment.fallback;
  if (f == null) return '';
  if (f instanceof RawString) return f.value;
  if (typeof f === 'string') return f;
  return '';
}

/** Resolves a fragment's error boundary content once the source has rejected. */
async function errorBoundaryHtml(fragment, err, ctx, attrName, nonce) {
  let content = fragment && fragment.error;
  if (typeof content === 'function') {
    try {
      content = content(err);
    } catch (boundaryErr) {
      console.error('[InertJS] Fragment error boundary threw:', boundaryErr);
      return '';
    }
  }
  if (content == null) return '';
  if (content instanceof RawString) return content.value;
  if (content && content.type === 'VecStream') {
    return drainStream(renderToStream(content, nonce));
  }
  return String(content);
}

function fillPatch(slotId, html, nonce, errored) {
  return `\n<template data-i-fill="${slotId}"${errored ? ' data-i-error="1"' : ''}>${html}</template>` +
    PATCHER_SCRIPT.replace('[INERT_NONCE]', nonce);
}

/**
 * Renders a VecStream (or RawString) to a WHATWG ReadableStream.
 * Handles out-of-order streaming for Promises, AsyncIterables and deferred
 * fragments.
 *
 * Once the synchronous shell has been flushed, a hole that rejects can no
 * longer surface as an HTTP error. Such a failure is isolated to its own slot:
 * the slot is patched with the fragment's error boundary (or emptied), the
 * client is signalled via `inert:fragment:error`, `options.onError` is invoked,
 * and every sibling hole keeps streaming.
 *
 * @param {object} vecResult The result from calling vec\`\`
 * @param {string} [nonce] The CSP nonce for inline scripts
 * @param {object} [options]
 * @param {(err: Error, info: { slot: number }) => void} [options.onError]
 *   Called for every hole that rejects after the shell was flushed.
 * @returns {ReadableStream}
 */
export function renderToStream(vecResult, nonce = '', options = {}) {
  if (!(vecResult && vecResult.type === 'VecStream')) {
    const value = vecResult instanceof RawString ? vecResult.value : String(vecResult);
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(value));
        controller.close();
      }
    });
  }

  const { plan, values } = vecResult;
  const onError = typeof options.onError === 'function' ? options.onError : null;
  let slotCounter = 0;
  const pendingTasks = new Set();

  return new ReadableStream({
    async start(controller) {
      let closed = false;

      const enqueue = (str) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(str));
        } catch {
          // Client went away; stop trying to write.
          closed = true;
        }
      };

      const closeController = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed / errored */
        }
      };

      try {
        let initialHtml = plan.statics[0];

        for (let i = 0; i < values.length; i++) {
          const val = values[i];
          const ctx = plan.contexts[i];
          const attrName = plan.attrNames[i];

          const isPromise = val instanceof Promise;
          const isAsyncIter = val && typeof val[Symbol.asyncIterator] === 'function';
          const isNestedStream = val && val.type === 'VecStream';
          const isFragment = val && val.type === 'VecFragment';

          if (isPromise || isAsyncIter || isNestedStream || isFragment) {
            const slotId = ++slotCounter;
            const fragment = isFragment ? val : null;
            initialHtml += `<i-slot id="i-slot-${slotId}">${fragment ? skeletonHtml(fragment) : ''}</i-slot>`;

            const task = (async () => {
              try {
                let source = fragment ? fragment.source : val;
                if (typeof source === 'function') source = source();

                let html;
                if (source && source.type === 'VecStream') {
                  html = await drainStream(renderToStream(source, nonce, options));
                } else if (source && typeof source[Symbol.asyncIterator] === 'function') {
                  let accumulated = '';
                  for await (const chunk of source) {
                    accumulated += chunk instanceof RawString
                      ? chunk.value
                      : escape(chunk, ctx, attrName);
                  }
                  html = accumulated;
                } else {
                  html = await valueToHtml(await source, ctx, attrName, nonce);
                }

                enqueue(fillPatch(slotId, html, nonce, false));
              } catch (err) {
                console.error(
                  `[InertJS] Deferred fragment in slot ${slotId} rejected after the shell was flushed:`,
                  err
                );
                if (onError) {
                  try {
                    onError(err, { slot: slotId });
                  } catch (hookErr) {
                    console.error('[InertJS] renderToStream onError hook threw:', hookErr);
                  }
                }
                let boundary = '';
                try {
                  boundary = await errorBoundaryHtml(fragment, err, ctx, attrName, nonce);
                } catch (boundaryErr) {
                  console.error('[InertJS] Fragment error boundary failed:', boundaryErr);
                }
                enqueue(fillPatch(slotId, boundary, nonce, true));
              } finally {
                pendingTasks.delete(task);
                if (pendingTasks.size === 0) closeController();
              }
            })();

            pendingTasks.add(task);
          } else {
            // Synchronous value
            if (val instanceof RawString) {
              initialHtml += val.value;
            } else if (Array.isArray(val)) {
              initialHtml += val.map(v => v instanceof RawString ? v.value : escape(v, ctx, attrName)).join('');
            } else {
              initialHtml += escape(val, ctx, attrName);
            }
          }
          initialHtml += plan.statics[i + 1];
        }

        // Flush the synchronous initial shell
        enqueue(initialHtml);

        if (pendingTasks.size === 0) {
          closeController();
        }
      } catch (err) {
        // Reached only while the shell is still being built (nothing flushed yet),
        // so it is safe to fail the whole response here.
        try {
          controller.error(err);
        } catch {
          /* already torn down */
        }
      }
    }
  });
}
