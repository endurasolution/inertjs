import { escape } from './escaper.js';
import { RawString } from './index.js';

const encoder = new TextEncoder();

const PATCHER_SCRIPT = `<script nonce="[INERT_NONCE]">
(function(){
  const ds=document.querySelectorAll('template[data-i-fill]');
  for(let d of ds){
    const id=d.getAttribute('data-i-fill');
    const target=document.getElementById('i-slot-'+id);
    if(target){
      target.replaceWith(d.content);
    }
    d.remove();
  }
})();
</script>`;

/**
 * Renders a VecStream (or RawString) to a WHATWG ReadableStream.
 * Handles out-of-order streaming for Promises and AsyncIterables.
 * 
 * @param {object} vecResult The result from calling vec\`\`
 * @param {string} nonce The CSP nonce for inline scripts
 * @returns {ReadableStream}
 */
export function renderToStream(vecResult, nonce = '') {
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
  let slotCounter = 0;
  const pendingTasks = new Set();
  
  return new ReadableStream({
    async start(controller) {
      try {
        let initialHtml = plan.statics[0];
        
        for (let i = 0; i < values.length; i++) {
          const val = values[i];
          const ctx = plan.contexts[i];
          const attrName = plan.attrNames[i];

          const isPromise = val instanceof Promise;
          const isAsyncIter = val && typeof val[Symbol.asyncIterator] === 'function';
          const isNestedStream = val && val.type === 'VecStream';

          if (isPromise || isAsyncIter || isNestedStream) {
            const slotId = ++slotCounter;
            initialHtml += `<i-slot id="i-slot-${slotId}"></i-slot>`;
            
            const task = (async () => {
              try {
                if (isPromise) {
                  const resolved = await val;
                  let str = '';
                  if (resolved && resolved.type === 'VecStream') {
                    // Resolve nested stream by reading from it
                    const nestedReadable = renderToStream(resolved, nonce);
                    const reader = nestedReadable.getReader();
                    let nestedHtml = '';
                    while (true) {
                      const { done, value } = await reader.read();
                      if (done) break;
                      // value is Uint8Array
                      nestedHtml += new TextDecoder().decode(value);
                    }
                    str = nestedHtml;
                  } else if (resolved instanceof RawString) {
                    str = resolved.value;
                  } else {
                    str = escape(resolved, ctx, attrName);
                  }
                  const patch = `\n<template data-i-fill="${slotId}">${str}</template>` + 
                                PATCHER_SCRIPT.replace('[INERT_NONCE]', nonce);
                  controller.enqueue(encoder.encode(patch));
                } else if (isAsyncIter) {
                  let accumulated = '';
                  for await (const chunk of val) {
                    accumulated += (chunk instanceof RawString ? chunk.value : escape(chunk, ctx, attrName));
                  }
                  const patch = `\n<template data-i-fill="${slotId}">${accumulated}</template>` + 
                                PATCHER_SCRIPT.replace('[INERT_NONCE]', nonce);
                  controller.enqueue(encoder.encode(patch));
                } else if (isNestedStream) {
                  const nestedReadable = renderToStream(val, nonce);
                  const reader = nestedReadable.getReader();
                  let nestedHtml = '';
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    nestedHtml += new TextDecoder().decode(value);
                  }
                  const patch = `\n<template data-i-fill="${slotId}">${nestedHtml}</template>` + 
                                PATCHER_SCRIPT.replace('[INERT_NONCE]', nonce);
                  controller.enqueue(encoder.encode(patch));
                }
              } catch (err) {
                console.error(`[InertJS] Error streaming slot ${slotId}:`, err);
              } finally {
                pendingTasks.delete(task);
                if (pendingTasks.size === 0) {
                  controller.close();
                }
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
        controller.enqueue(encoder.encode(initialHtml));

        if (pendingTasks.size === 0) {
          controller.close();
        }
      } catch (err) {
        controller.error(err);
      }
    }
  });
}
