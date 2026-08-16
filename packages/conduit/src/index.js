import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let worker;
let idCounter = 0;
const pending = new Map();

function getWorker() {
  if (!worker) {
    worker = new Worker(path.join(__dirname, 'worker.js'));
    worker.on('message', (msg) => {
      const p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      
      if (msg.error) {
        p.reject(new Error(msg.error));
      } else {
        const textData = Buffer.from(msg.data).toString('utf8');
        p.resolve({
          status: msg.status,
          headers: msg.headers,
          data: msg.data,
          text: () => Promise.resolve(textData),
          json: () => Promise.resolve(JSON.parse(textData))
        });
      }
    });
    worker.on('error', (err) => {
      for (const p of pending.values()) p.reject(err);
      pending.clear();
      worker = null;
    });
    worker.on('exit', () => {
      for (const p of pending.values()) p.reject(new Error('Conduit worker exited unexpectedly'));
      pending.clear();
      worker = null;
    });
  }
  return worker;
}

/**
 * Securely fetch data in a background thread, preventing Event Loop blocking.
 * Sensitive headers (authorization, cookies) are automatically stripped from the response.
 * 
 * @param {string} url 
 * @param {RequestInit} options 
 */
export async function fetchSecure(url, options = {}) {
  const w = getWorker();
  const id = ++idCounter;
  
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, url, options });
  });
}
