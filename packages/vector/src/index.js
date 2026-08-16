import { analyzeTemplateStrings, escape, CONTEXT } from './escaper.js';
import { minifyHTML } from 'inertjs-optimizer';
export { resolveToString } from './resolve.js';

const planCache = new WeakMap();

export class RawString {
  constructor(str) {
    this.value = str;
  }
  toString() {
    return this.value;
  }
}

/**
 * Opt-out of HTML escaping. 
 * Use with extreme caution.
 * 
 * @param {string} str Unescaped HTML string
 * @returns {RawString}
 */
export function raw(str, suppressWarning = false) {
  if (!suppressWarning && process.env.NODE_ENV !== 'production') {
    const stack = new Error().stack;
    // index 1 is raw(), index 2 is the caller
    const callSite = stack && stack.split('\n')[2] ? stack.split('\n')[2].trim() : 'unknown location';
    console.warn(`[Lens] Warning: raw() escape hatch used at ${callSite}. Ensure this string is safe.`);
  }
  return new RawString(str);
}

/**
 * Tagged template literal for Vector template engine.
 * Safely escapes all interpolations based on their HTML context.
 * 
 * @param {TemplateStringsArray} strings 
 * @param  {...any} values 
 */
export function vec(strings, ...values) {
  let plan = planCache.get(strings);
  if (!plan) {
    plan = analyzeTemplateStrings(strings);
    // Minify statics on the fly during template parse
    plan.statics = plan.statics.map(staticStr => minifyHTML(staticStr));
    planCache.set(strings, plan);
  }

  // Check if we need to stream (any value is a Promise or AsyncIterable)
  const isAsync = values.some(v => v instanceof Promise || (v && typeof v[Symbol.asyncIterator] === 'function') || (v && v.type === 'VecStream'));
  
  if (isAsync) {
    return {
      type: 'VecStream',
      plan,
      values
    };
  }

  let result = plan.statics[0];
  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    const ctx = plan.contexts[i];
    const attrName = plan.attrNames[i];

    if (val instanceof RawString) {
      result += val.value;
    } else if (val && val.type === 'VecStream') {
       throw new Error('E_INERT_VECTOR_NESTED_ASYNC: Async nested vec`` found in synchronous render context.');
    } else if (Array.isArray(val)) {
       result += val.map(v => v instanceof RawString ? v.value : escape(v, ctx, attrName)).join('');
    } else {
      result += escape(val, ctx, attrName);
    }
    result += plan.statics[i + 1];
  }
  
  // Return RawString so nested `vec` calls aren't double-escaped
  return new RawString(result);
}

/**
 * Generates an optimized image tag that hooks into InertJS's on-the-fly optimizer.
 * 
 * @param {object} props Image properties: src, width, height, quality, class, alt
 * @returns {RawString}
 */
export function img({ src, width, height, quality, ...rest }) {
  const query = new URLSearchParams();
  query.set('src', src);
  if (width) query.set('w', width);
  if (height) query.set('h', height);
  if (quality) query.set('q', quality);

  const url = `/_inert/image?${query.toString()}`;
  
  const attrs = Object.entries(rest)
    .map(([key, val]) => `${key}="${escape(val, CONTEXT.ATTR_VALUE_DOUBLE)}"`)
    .join(' ');
    
  return raw(`<img src="${url}" ${attrs} />`, true);
}
