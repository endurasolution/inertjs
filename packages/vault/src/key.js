import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

/**
 * Resolves the 32-byte master key for the Vault.
 * @param {string} keyRef 
 * @returns {Promise<Buffer>}
 */
export async function resolveMasterKey(keyRef) {
  if (process.env.INERT_VAULT_KEY) {
    const key = Buffer.from(process.env.INERT_VAULT_KEY, 'base64');
    if (key.length !== 32) throw new Error('E_INERT_VAULT_KEY_SIZE: INERT_VAULT_KEY must be 32 bytes (base64 encoded)');
    // Delete immediately to prevent leakage to child processes or dumps
    delete process.env.INERT_VAULT_KEY;
    return key;
  }

  const localKeyPath = path.join(process.cwd(), '.vault.key');
  try {
    const keyBuffer = await fs.readFile(localKeyPath);
    if (keyBuffer.length !== 32) throw new Error('E_INERT_VAULT_KEY_SIZE_LOCAL');
    return keyBuffer;
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  const keysDir = process.platform === 'win32'
    ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'inert', 'keys')
    : path.join(os.homedir(), '.inert', 'keys');

  const keyPath = path.join(keysDir, `${keyRef}.key`);

  try {
    const keyBuffer = await fs.readFile(keyPath);
    if (keyBuffer.length !== 32) throw new Error();
    return keyBuffer;
  } catch (err) {
    // If we're strictly reading and it fails, it's a fatal error
    if (err.code === 'ENOENT') {
      throw new Error(`E_INERT_VAULT_KEY_MISSING: Master key '${keyRef}' not found in local .vault.key, OS keystore, or environment.`);
    }
    throw err;
  }
}

/**
 * Generates and stores a new master key.
 * @param {string} keyRef 
 * @returns {Promise<Buffer>}
 */
export async function generateAndStoreMasterKey(keyRef) {
  const key = crypto.randomBytes(32);
  
  const localKeyPath = path.join(process.cwd(), '.vault.key');
  
  // Create with strict permissions (0600)
  await fs.writeFile(localKeyPath, key, { mode: 0o600 });

  // Attempt to add to .gitignore automatically
  try {
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    const gitignoreContent = await fs.readFile(gitignorePath, 'utf8').catch(() => '');
    if (!gitignoreContent.includes('.vault.key')) {
      await fs.appendFile(gitignorePath, '\n# InertJS Vault Key\n.vault.key\n');
    }
  } catch (e) {
    // Ignore gitignore errors
  }
  
  return key;
}
