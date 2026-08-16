import { AsyncLocalStorage } from 'node:async_hooks';

export const requestScope = new AsyncLocalStorage();

/**
 * Gets the current request scope.
 * 
 * @returns {object} The RequestScope object
 * @throws {Error} If called outside of a request scope
 */
export function getScope() {
  const scope = requestScope.getStore();
  if (!scope) {
    throw new Error('E_INERT_SCOPE: Accessed outside of request scope');
  }
  return scope;
}
