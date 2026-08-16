import crypto from 'node:crypto';

let signingKey = crypto.randomBytes(32);

/**
 * Sets the key used for CSRF signing. Should be derived from Vault if available.
 * @param {Buffer} key 
 */
export function setCsrfKey(key) {
  signingKey = key;
}

/**
 * Generates a signed CSRF token.
 * @returns {string} 
 */
export function generateCsrfToken() {
  const token = crypto.randomBytes(16).toString('base64url');
  const hmac = crypto.createHmac('sha256', signingKey).update(token).digest('base64url');
  return `${token}.${hmac}`;
}

/**
 * Validates the CSRF token.
 * @param {string} cookieToken 
 * @param {string} headerToken 
 * @returns {boolean}
 */
export function validateCsrfToken(cookieToken, headerToken) {
  if (!cookieToken || !headerToken) return false;
  if (cookieToken !== headerToken) return false;

  const parts = cookieToken.split('.');
  if (parts.length !== 2) return false;

  const [token, hmac] = parts;
  const expectedHmac = crypto.createHmac('sha256', signingKey).update(token).digest('base64url');
  
  if (hmac.length !== expectedHmac.length) return false;
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac));
}
