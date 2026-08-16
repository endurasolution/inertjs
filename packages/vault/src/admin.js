import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { generateAndStoreMasterKey, resolveMasterKey } from './key.js';
import { VaultManager } from './seal.js';

function base32(buffer) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  return output;
}

export async function initVault(cwd) {
  try {
    await fs.stat(path.join(cwd, '.inertlink'));
    console.log('Vault already initialized.');
    return;
  } catch (e) {}

  const keyRef = crypto.randomUUID();
  const projectId = crypto.randomUUID();
  const dirName = '.vault-' + base32(crypto.randomBytes(10)).slice(0, 10);
  
  const vaultDir = path.join(cwd, dirName);
  await fs.mkdir(vaultDir, { mode: 0o700, recursive: true });

  // Generate Master Key
  const masterKey = await generateAndStoreMasterKey(keyRef);

  const salt = crypto.randomBytes(16);
  const nonce = crypto.randomBytes(12);

  const derivedKey = await new Promise((resolve, reject) => {
    crypto.scrypt(masterKey, salt, 32, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });

  const emptySecrets = JSON.stringify({});
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, nonce);
  let ciphertext = cipher.update(emptySecrets, 'utf8');
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);
  const authTag = cipher.getAuthTag();

  const binData = Buffer.concat([ciphertext, authTag]);

  await fs.writeFile(path.join(vaultDir, 'seal.bin'), binData);

  const meta = {
    v: 1,
    kdf: 'scrypt',
    salt: salt.toString('base64'),
    nonce: nonce.toString('base64'),
    alg: 'aes-256-gcm',
    createdAt: new Date().toISOString(),
    keyRef,
    chain: crypto.createHash('sha256').update('genesis').digest('hex')
  };

  await fs.writeFile(path.join(vaultDir, 'seal.meta.json'), JSON.stringify(meta, null, 2));

  await fs.writeFile(path.join(vaultDir, 'seal.log'), `[${new Date().toISOString()}] INIT\n`);

  const link = { vaultDir: dirName, keyRef, projectId };
  await fs.writeFile(path.join(cwd, '.inertlink'), JSON.stringify(link, null, 2));

  console.log(`Vault initialized in ${dirName}. Keystore ref: ${keyRef}`);
}

export async function setSecret(cwd, key, value) {
  const manager = new VaultManager(cwd);
  await manager.load();
  manager.secrets[key] = value;
  await saveVault(cwd, manager);
  console.log(`Secret '${key}' saved securely.`);
}

export async function getSecret(cwd, key, reveal) {
  const manager = new VaultManager(cwd);
  await manager.load();
  if (!(key in manager.secrets)) {
    console.error(`Secret '${key}' not found.`);
    process.exit(1);
  }
  if (reveal) {
    console.log(manager.secrets[key]);
  } else {
    console.log(`[sealed:${key}]`);
  }
}

async function saveVault(cwd, manager) {
  const vaultDir = manager.vaultDir;
  
  const metaPath = path.join(vaultDir, 'seal.meta.json');
  const meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));
  
  const masterKey = await resolveMasterKey(meta.keyRef);
  const salt = Buffer.from(meta.salt, 'base64');
  
  const derivedKey = await new Promise((resolve, reject) => {
    crypto.scrypt(masterKey, salt, 32, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });

  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, nonce);
  
  const plaintext = JSON.stringify(manager.secrets);
  let ciphertext = cipher.update(plaintext, 'utf8');
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);
  const authTag = cipher.getAuthTag();

  const binData = Buffer.concat([ciphertext, authTag]);
  await fs.writeFile(path.join(vaultDir, 'seal.bin'), binData);

  meta.nonce = nonce.toString('base64');
  meta.v = meta.v + 1;
  const previousChain = meta.chain;
  meta.chain = crypto.createHash('sha256').update(previousChain + plaintext).digest('hex');
  
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));

  // Audit log
  await fs.appendFile(path.join(vaultDir, 'seal.log'), `[${new Date().toISOString()}] UPDATE\n`);
}

export async function listSecrets(cwd) {
  const manager = new VaultManager(cwd);
  await manager.load();
  const keys = Object.keys(manager.secrets);
  if (keys.length === 0) {
    console.log('Vault is empty.');
  } else {
    keys.forEach(k => console.log(`- ${k}`));
  }
}

export async function rmSecret(cwd, key) {
  const manager = new VaultManager(cwd);
  await manager.load();
  if (!(key in manager.secrets)) {
    console.error(`Secret '${key}' not found.`);
    process.exit(1);
  }
  delete manager.secrets[key];
  await saveVault(cwd, manager);
  console.log(`Secret '${key}' removed securely.`);
}

export async function rotateVault(cwd) {
  console.log('Vault rotation not fully implemented yet.');
}

export async function auditVault(cwd) {
  const linkPath = path.join(cwd, '.inertlink');
  const linkRaw = await fs.readFile(linkPath, 'utf8');
  const dirName = JSON.parse(linkRaw).vaultDir;
  const logData = await fs.readFile(path.join(cwd, dirName, 'seal.log'), 'utf8');
  console.log('--- VAULT AUDIT LOG ---');
  console.log(logData.trim());
}
