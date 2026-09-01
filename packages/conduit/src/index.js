import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let worker;
let idCounter = 0;
let inFlight = 0;
const pending = new Map();

function rejectAll(err) {
  for (const p of pending.values()) p.reject(err);
  pending.clear();
  inFlight = 0;
  worker = null;
}

function getWorker() {
  if (!worker) {
    worker = new Worker(path.join(__dirname, 'worker.js'));
    // Idle, the pool must never be the reason a process stays alive. It is
    // ref'd only while a request is actually in flight (see fetchSecure), so a
    // server keeps running on its own handles and a one-shot script can exit.
    worker.unref();
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
    worker.on('error', (err) => rejectAll(err));
    worker.on('exit', () => rejectAll(new Error('Conduit worker exited unexpectedly')));
  }
  return worker;
}

/**
 * Securely fetch data in a background thread, keeping the event loop free.
 * Sensitive response headers (authorization, cookie, set-cookie) are stripped.
 *
 * @param {string} url
 * @param {RequestInit} [options]
 */
export async function fetchSecure(url, options = {}) {
  const w = getWorker();
  const id = ++idCounter;

  if (inFlight++ === 0) w.ref();

  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, url, options });
  }).finally(() => {
    if (--inFlight <= 0) {
      inFlight = 0;
      if (worker) worker.unref();
    }
  });
}

/**
 * Terminate the background fetch worker. Optional — the pool is unref'd while
 * idle so it never blocks shutdown — but useful for a deterministic teardown
 * (tests, graceful shutdown).
 */
export async function closeConduit() {
  if (!worker) return;
  const w = worker;
  rejectAll(new Error('Conduit closed'));
  await w.terminate();
}
