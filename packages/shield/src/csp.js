/**
 * Generates the strict Content Security Policy header.
 * @param {string} nonce The cryptographically secure nonce for the request.
 */
export function getCspHeader(nonce, config = {}) {
  const defaultCsp = `default-src 'none'; script-src 'nonce-${nonce}' 'strict-dynamic' https://cdn.tailwindcss.com; style-src 'nonce-${nonce}' 'unsafe-inline'; connect-src 'self'`;
  if (config.shield && config.shield.csp) {
    if (typeof config.shield.csp === 'function') {
      return config.shield.csp(nonce);
    }
    return config.shield.csp.replace(/\[NONCE\]/g, nonce);
  }
  return defaultCsp;
}
