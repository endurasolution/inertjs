import { randomBytes } from 'node:crypto';

/**
 * Creates an obfuscator pool that generates a cacheable static CSS string
 * containing multiple randomized variants of given classes, and provides
 * a fast lookup function to randomly pick a variant during rendering.
 * 
 * @param {Object} stylesObject - Mapping of logical class names to CSS rules. E.g. { minimage: 'border-radius: 8px;' }
 * @param {number} poolSize - The number of variants to generate. Default 25.
 * @returns {Object} { css, getClasses }
 */
export function createObfuscator(stylesObject, poolSize = 25) {
  let combinedCss = '';
  const variants = {};

  for (const [logicalSelector, cssRules] of Object.entries(stylesObject)) {
    const isId = logicalSelector.startsWith('#');
    const isClass = logicalSelector.startsWith('.');
    
    // Default to class if no prefix is provided
    const prefix = isId ? '#' : '.';
    const logicalName = (isId || isClass) ? logicalSelector.slice(1) : logicalSelector;
    
    variants[logicalName] = [];
    
    for (let i = 0; i < poolSize; i++) {
      // Generate a random 6-character hex suffix
      const suffix = randomBytes(3).toString('hex');
      const obfuscatedName = `${logicalName}_${suffix}`;
      
      variants[logicalName].push(obfuscatedName);
      
      // Append this variant's CSS definition to the static CSS pool
      combinedCss += `${prefix}${obfuscatedName} {\n${cssRules}\n}\n`;
    }
  }

  const getPicked = () => {
    const picked = {};
    for (const [logicalName, pool] of Object.entries(variants)) {
      const randomIndex = Math.floor(Math.random() * poolSize);
      picked[logicalName] = pool[randomIndex];
    }
    return picked;
  };

  return {
    css: combinedCss,
    getSelectors: getPicked,
    getClasses: getPicked // Retained for backwards compatibility
  };
}
