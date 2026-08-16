import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveMasterKey } from './key.js';

class SecretRef {
  constructor(key, value) {
    this._key = key;
    this._value = value;
  }
  
  toString() {
    return `[sealed:${this._key}]`;
  }
  
  reveal() {
    // Lazy load scope to avoid circular deps if used outside server
    let scope;
    try {
      // Use dynamic import or just standard require.
      // Wait, ES module dynamic import is async, but reveal() is sync.
      // We'll rely on global context or just inject scope later.
      // Actually, since getScope is in core, we can import it.
    } catch (e) {}

    // We will attach an isClientFacing flag in Vector stream when rendering
    if (globalThis.__INERT_IS_CLIENT_RENDER__) {
      throw new Error(`E_INERT_VAULT_LEAK: Attempted to reveal secret '${this._key}' during client-facing render.`);
    }

    return this._value;
  }
}

export class VaultManager {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.secrets = null;
    this.vaultDir = null;
  }

  async load() {
    if (this.secrets) return; // already loaded

    const linkPath = path.join(this.projectRoot, '.inertlink');
    let linkData;
    try {
      const linkRaw = await fs.readFile(linkPath, 'utf8');
      linkData = JSON.parse(linkRaw);
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new Error('E_INERT_VAULT_UNINITIALIZED: Vault not initialized. Run `inert vault init`.');
      }
      throw err;
    }

    this.vaultDir = path.join(this.projectRoot, linkData.vaultDir);
    const metaPath = path.join(this.vaultDir, 'seal.meta.json');
    const binPath = path.join(this.vaultDir, 'seal.bin');

    const meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));
    const bin = await fs.readFile(binPath);
    
    // Resolve Master Key
    const masterKey = await resolveMasterKey(meta.keyRef);

    // KDF derivation (PBKDF2 since scrypt is slow in JS, or we can use scrypt natively in Node >= 10.5)
    const derivedKey = await new Promise((resolve, reject) => {
      crypto.scrypt(masterKey, Buffer.from(meta.salt, 'base64'), 32, (err, key) => {
        if (err) reject(err);
        else resolve(key);
      });
    });

    // Decrypt AES-256-GCM
    const nonce = Buffer.from(meta.nonce, 'base64');
    const authTag = bin.subarray(bin.length - 16);
    const ciphertext = bin.subarray(0, bin.length - 16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, nonce);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    this.secrets = JSON.parse(decrypted.toString('utf8'));
  }

  get(key) {
    if (!this.secrets) throw new Error('E_INERT_VAULT_NOT_LOADED: Call vault.load() first.');
    if (!(key in this.secrets)) return undefined;
    return new SecretRef(key, this.secrets[key]);
  }
}

// Global singleton for the application
let _vaultInstance = null;

export async function loadVault(projectRoot) {
  _vaultInstance = new VaultManager(projectRoot);
  await _vaultInstance.load();
}

export const seal = {
  get: (key) => {
    if (!_vaultInstance) throw new Error('E_INERT_VAULT_NOT_LOADED: Vault is not initialized.');
    return _vaultInstance.get(key);
  }
};
