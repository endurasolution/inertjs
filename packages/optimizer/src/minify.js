import * as esbuild from 'esbuild';

/**
 * Minifies raw HTML string by stripping whitespaces between tags and comments.
 * Extremely fast regex-based minifier intended for parse-time optimization.
 */
export function minifyHTML(html) {
  if (!html) return '';
  return html
    .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
    .replace(/>\s+</g, '><')         // Remove space between tags
    .replace(/\s{2,}/g, ' ')         // Collapse multiple spaces
    .trim();                         // Trim edges
}

/**
 * Minifies JS or CSS using esbuild
 * @param {string} code The source code
 * @param {string} type 'js' or 'css'
 */
export async function minifyAsset(code, type = 'js') {
  try {
    const result = await esbuild.transform(code, {
      loader: type,
      minify: true,
      target: 'esnext'
    });
    return result.code;
  } catch (err) {
    console.error(`[InertJS Optimizer] Failed to minify ${type}:`, err);
    return code; // Fallback to raw on error
  }
}
