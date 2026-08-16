import { escape } from './escaper.js';
import { RawString } from './index.js';

/**
 * Fully resolves a VecStream and all its asynchronous holes into a single string.
 */
export async function resolveToString(val, ctx = 'text', attrName = '') {
  if (val == null || val === false) return '';
  if (typeof val === 'string' || typeof val === 'number') return escape(String(val), ctx, attrName);
  if (val instanceof RawString) return val.value;
  
  if (val instanceof Promise) {
    return resolveToString(await val, ctx, attrName);
  }

  if (Array.isArray(val)) {
    let res = '';
    for (const item of val) {
      res += await resolveToString(item, ctx, attrName);
    }
    return res;
  }

  if (val && val.type === 'VecStream') {
    let result = '';
    for (let i = 0; i < val.values.length; i++) {
      result += val.plan.statics[i];
      
      const part = val.values[i];
      const nextCtx = val.plan.contexts[i];
      const nextAttrName = val.plan.attrNames[i];

      result += await resolveToString(part, nextCtx, nextAttrName);
    }
    result += val.plan.statics[val.plan.statics.length - 1];
    return result;
  }
  
  if (val && typeof val[Symbol.asyncIterator] === 'function') {
    let res = '';
    for await (const chunk of val) {
      res += await resolveToString(chunk, ctx, attrName);
    }
    return res;
  }

  return escape(String(val), ctx, attrName);
}
