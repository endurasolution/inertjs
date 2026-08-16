import { Transform } from 'node:stream';

/**
 * Creates a stream that scans outbound chunks for leaked secrets.
 * @param {object} vaultManager The initialized VaultManager
 * @returns {Transform}
 */
export function createScrubberStream(vaultManager) {
  const secrets = vaultManager && vaultManager.secrets 
    ? Object.values(vaultManager.secrets).filter(s => typeof s === 'string' && s.length > 3)
    : [];
    
  return new Transform({
    transform(chunk, encoding, callback) {
      if (secrets.length === 0) {
        this.push(chunk);
        return callback();
      }

      const str = chunk.toString('utf8');
      
      for (let i = 0; i < secrets.length; i++) {
        if (str.includes(secrets[i])) {
          console.error(`[InertJS Security] FATAL: Outbound buffer contained plaintext secret! Connection aborted.`);
          return callback(new Error('E_INERT_SECRET_LEAK: Response contained plaintext secret.'));
        }
      }
      
      this.push(chunk);
      callback();
    }
  });
}
