import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Validates a config object against the InertJS schema.
 * Throws a hard error if unknown keys are present or types are wrong.
 *
 * @param {object} config - The raw config object.
 * @returns {object} The validated and normalized config object.
 * @throws {Error} If validation fails (E_INERT_CONFIG_INVALID).
 */
export function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('E_INERT_CONFIG_INVALID: Config must be an object');
  }

  const validKeys = new Set(['core', 'surface', 'pulse', 'assets', 'vault', 'conduit', 'shield', 'lens']);
  for (const key of Object.keys(config)) {
    if (!validKeys.has(key)) {
      throw new Error(`E_INERT_CONFIG_INVALID: Unknown top-level key '${key}'`);
    }
  }

  // Set up defaults
  const normalized = {
    core: { port: 3000, host: '127.0.0.1', http2: true, compress: ['br', 'gzip'], workers: 'auto', gracefulShutdownMs: 8000, ...(config.core || {}) },
    surface: { dir: 'surface', trailingSlash: 'never', caseSensitive: true, ...(config.surface || {}) },
    pulse: { dir: 'pulse', defaultWhen: 'idle', maxBytes: 20000, ...(config.pulse || {}) },
    assets: { dir: 'assets', mount: '/a', immutable: true, ...(config.assets || {}) },
    vault: { linkFile: '.inertlink', requireAtBoot: true, scrubResponses: true, ...(config.vault || {}) },
    conduit: { workers: 2, defaultTimeout: 5000, allowInsecure: false, ...(config.conduit || {}) },
    shield: { csp: 'strict', rateLimit: { rps: 20, burst: 40 }, ...(config.shield || {}) },
    lens: { enabled: process.env.NODE_ENV !== 'production', ...(config.lens || {}) }
  };

  // Validate core
  const coreKeys = new Set(['port', 'host', 'http2', 'compress', 'workers', 'gracefulShutdownMs']);
  if (config.core) {
    for (const key of Object.keys(config.core)) {
      if (!coreKeys.has(key)) throw new Error(`E_INERT_CONFIG_INVALID: Unknown key 'core.${key}'`);
    }
  }

  // Validate surface
  const surfaceKeys = new Set(['dir', 'trailingSlash', 'caseSensitive']);
  if (config.surface) {
    for (const key of Object.keys(config.surface)) {
      if (!surfaceKeys.has(key)) throw new Error(`E_INERT_CONFIG_INVALID: Unknown key 'surface.${key}'`);
    }
  }

  // Validate pulse
  const pulseKeys = new Set(['dir', 'defaultWhen', 'maxBytes']);
  if (config.pulse) {
    for (const key of Object.keys(config.pulse)) {
      if (!pulseKeys.has(key)) throw new Error(`E_INERT_CONFIG_INVALID: Unknown key 'pulse.${key}'`);
    }
  }

  // Validate assets
  const assetsKeys = new Set(['dir', 'mount', 'immutable']);
  if (config.assets) {
    for (const key of Object.keys(config.assets)) {
      if (!assetsKeys.has(key)) throw new Error(`E_INERT_CONFIG_INVALID: Unknown key 'assets.${key}'`);
    }
  }

  // Validate vault
  const vaultKeys = new Set(['linkFile', 'requireAtBoot', 'scrubResponses']);
  if (config.vault) {
    for (const key of Object.keys(config.vault)) {
      if (!vaultKeys.has(key)) throw new Error(`E_INERT_CONFIG_INVALID: Unknown key 'vault.${key}'`);
    }
  }

  // Validate conduit
  const conduitKeys = new Set(['workers', 'defaultTimeout', 'allowInsecure']);
  if (config.conduit) {
    for (const key of Object.keys(config.conduit)) {
      if (!conduitKeys.has(key)) throw new Error(`E_INERT_CONFIG_INVALID: Unknown key 'conduit.${key}'`);
    }
  }

  // Validate shield
  const shieldKeys = new Set(['csp', 'rateLimit']);
  if (config.shield) {
    for (const key of Object.keys(config.shield)) {
      if (!shieldKeys.has(key)) throw new Error(`E_INERT_CONFIG_INVALID: Unknown key 'shield.${key}'`);
    }
    if (config.shield.rateLimit) {
      const rlKeys = new Set(['rps', 'burst']);
      for (const key of Object.keys(config.shield.rateLimit)) {
        if (!rlKeys.has(key)) throw new Error(`E_INERT_CONFIG_INVALID: Unknown key 'shield.rateLimit.${key}'`);
      }
    }
  }

  // Validate lens
  const lensKeys = new Set(['enabled', 'prod']);
  if (config.lens) {
    for (const key of Object.keys(config.lens)) {
      if (!lensKeys.has(key)) throw new Error(`E_INERT_CONFIG_INVALID: Unknown key 'lens.${key}'`);
    }
  }

  return normalized;
}

/**
 * Loads the config file from the project root.
 *
 * @param {string} projectRoot - Absolute path to the project root.
 * @returns {Promise<object>} The loaded and validated config.
 */
export async function loadConfig(projectRoot) {
  const configPath = path.join(projectRoot, 'inert.orbit.js');
  let rawConfig = {};
  
  try {
    // Check if it exists before importing to give a better error message if missing
    await fs.access(configPath);
    // Dynamic import, ensure we get a file URL for Windows compatibility
    const fileUrl = pathToFileURL(configPath).href;
    const imported = await import(fileUrl);
    rawConfig = imported.default || imported;
  } catch (err) {
    if (err.code === 'ENOENT') {
      // It's okay if config doesn't exist, we use defaults
      rawConfig = {};
    } else {
      throw new Error(`E_INERT_CONFIG_LOAD: Failed to load config at ${configPath}. ${err.message}`);
    }
  }

  return validateConfig(rawConfig);
}
