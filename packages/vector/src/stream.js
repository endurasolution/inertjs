import { escape, CONTEXT } from './escaper.js';
import { RawString } from './index.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Error handed to the error boundary / `onError` hook when a deferred fragment
 * exceeds its `timeout`.
 */
export class DeferTimeoutError extends Error {
  constructor(slotId, ms) {
    super(`Deferred fragment in slot ${slotId} timed out after ${ms}ms`);
    this.name = 'DeferTimeoutError';
    this.code = 'E_INERT_FRAGMENT_TIMEOUT';
    this.slot = slotId;
    this.timeout = ms;
  }
}

function isDev() {
  return typeof process !== 'undefined' && !!process.env && process.env.NODE_ENV !== 'production';
}

/**
 * One inline script, emitted once into the shell. It applies every streamed
 * `<template data-i-fill>` patch — synchronously for those already parsed, and
 * via a MutationObserver for those that arrive later in the stream. Replaces the
 * previous approach of re-emitting a full patcher script after every patch
 * (which was O(n²) and multiplied inline-script surface under CSP).
 */
function bootstrapScript(nonce) {
  return `<script nonce="${nonce}">
(function(){
  var W=window,D=document;
  function patch(t){
    var id=t.getAttribute('data-i-fill');
    var slot=D.getElementById('i-slot-'+id);
    if(slot){
      var errored=t.hasAttribute('data-i-error');
      slot.replaceWith(t.content);
      if(errored){
        var s=(W.__inert=W.__inert||{});
        s.fragmentErrors=(s.fragmentErrors||0)+1;
        try{W.dispatchEvent(new CustomEvent('inert:fragment:error',{detail:{slot:id}}));}catch(e){}
      }
    }
    if(t.parentNode)t.remove();
  }
  function sweep(root){
    var ts=(root||D).querySelectorAll('template[data-i-fill]');
    for(var i=0;i<ts.length;i++)patch(ts[i]);
  }
  sweep();
  if(W.MutationObserver){
    var mo=new MutationObserver(function(muts){
      for(var i=0;i<muts.length;i++){
        var added=muts[i].addedNodes;
        for(var j=0;j<added.length;j++){
          var n=added[j];
          if(n.nodeType!==1)continue;
          if(n.tagName==='TEMPLATE'&&n.hasAttribute('data-i-fill'))patch(n);
          else if(n.querySelector&&n.querySelector('template[data-i-fill]'))sweep(n);
        }
      }
    });
    mo.observe(D.documentElement,{childList:true,subtree:true});
    var done=function(){sweep();mo.disconnect();};
    if(D.readyState==='complete')done();
    else W.addEventListener('load',done);
  }else{
    W.addEventListener('load',function(){sweep();});
  }
})();
</script>`;
}

/** A bare patch: the bootstrap script (already in the shell) applies it. */
function fillPatch(slotId, html, errored) {
  return `\n<template data-i-fill="${slotId}"${errored ? ' data-i-error="1"' : ''}>${html}</template>`;
}

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
async function valueToHtml(value, ctx, attrName, nonce, options) {
  if (value == null || value === false) return '';
  if (value instanceof RawString) return value.value;
  if (value && value.type === 'VecStream') {
    return drainStream(renderToStream(value, nonce, options));
  }
  if (Array.isArray(value)) {
    let out = '';
    for (const item of value) out += await valueToHtml(item, ctx, attrName, nonce, options);
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
async function errorBoundaryHtml(fragment, err, slotId, ctx, attrName, nonce, options) {
  let content = fragment && fragment.error;
  if (typeof content === 'function') {
    try {
      content = content(err);
    } catch (boundaryErr) {
      console.error('[InertJS] Fragment error boundary threw:', boundaryErr);
      content = null;
    }
  }
  if (content == null) {
    if (isDev()) {
      const msg = escape(err && err.message ? err.message : String(err), CONTEXT.TEXT);
      return `<div data-inert-fragment-error style="border:1px dashed #f43f5e;background:#fff1f2;color:#9f1239;` +
        `padding:6px 10px;font:12px/1.5 ui-monospace,monospace;border-radius:4px">` +
        `⚠ InertJS fragment ${slotId} failed: ${msg}</div>`;
    }
    return '';
  }
  if (content instanceof RawString) return content.value;
  if (content && content.type === 'VecStream') {
    return drainStream(renderToStream(content, nonce, options));
  }
  return String(content);
}

/** Races a fragment's html production against its `timeout`, if any. */
function withTimeout(promise, ms, slotId) {
  if (!ms || ms <= 0) return promise;
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new DeferTimeoutError(slotId, ms)), ms);
    if (timer && typeof timer.unref === 'function') timer.unref();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
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
 *   Called for every hole that rejects (or times out) after the shell flushed.
 * @param {AbortSignal} [options.signal]
 *   Aborting it stops the stream and is forwarded to deferred fragment
 *   factories as `defer(({ signal }) => ...)`.
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

  // Every render has a real AbortSignal so `defer` factories can always rely on
  // `({ signal })`. It fires when the caller's signal fires, when the consumer
  // cancels the stream, or when a write reveals the client has gone away.
  const abort = new AbortController();
  const signal = abort.signal;
  if (options.signal) {
    if (options.signal.aborted) abort.abort();
    else options.signal.addEventListener('abort', () => abort.abort(), { once: true });
  }

  let slotCounter = 0;
  const pendingTasks = new Set();

  return new ReadableStream({
    async start(controller) {
      let closed = false;

      const enqueue = (str) => {
        if (closed || signal.aborted) return;
        try {
          controller.enqueue(encoder.encode(str));
        } catch {
          // Client went away; stop trying to write and let fragments bail.
          closed = true;
          abort.abort();
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

      if (signal.aborted) {
        closeController();
        return;
      }
      signal.addEventListener('abort', closeController, { once: true });

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
                const build = (async () => {
                  let source = fragment ? fragment.source : val;
                  if (typeof source === 'function') source = source({ signal });

                  if (source && source.type === 'VecStream') {
                    return drainStream(renderToStream(source, nonce, options));
                  }
                  if (source && typeof source[Symbol.asyncIterator] === 'function') {
                    let accumulated = '';
                    for await (const chunk of source) {
                      accumulated += chunk instanceof RawString
                        ? chunk.value
                        : escape(chunk, ctx, attrName);
                    }
                    return accumulated;
                  }
                  return valueToHtml(await source, ctx, attrName, nonce, options);
                })();
                build.catch(() => {}); // a lost timeout race must not warn

                const html = await withTimeout(build, fragment && fragment.timeout, slotId);
                enqueue(fillPatch(slotId, html, false));
              } catch (err) {
                console.error(
                  `[InertJS] Deferred fragment in slot ${slotId} failed after the shell was flushed:`,
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
                  boundary = await errorBoundaryHtml(fragment, err, slotId, ctx, attrName, nonce, options);
                } catch (boundaryErr) {
                  console.error('[InertJS] Fragment error boundary failed:', boundaryErr);
                }
                enqueue(fillPatch(slotId, boundary, true));
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

        // One patcher for the whole document, only when something actually streams.
        if (slotCounter > 0) {
          initialHtml += bootstrapScript(nonce);
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
    },
    cancel() {
      // Consumer walked away: let in-flight fragment work abort itself.
      abort.abort();
    }
  });
}
