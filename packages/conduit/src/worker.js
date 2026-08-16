import { parentPort } from 'node:worker_threads';

const FORBIDDEN_HEADERS = ['authorization', 'cookie', 'set-cookie'];

parentPort.on('message', async ({ id, url, options }) => {
  try {
    const res = await fetch(url, options);
    const headers = {};
    for (const [key, value] of res.headers.entries()) {
      if (!FORBIDDEN_HEADERS.includes(key.toLowerCase())) {
        headers[key] = value;
      }
    }
    
    const arrayBuffer = await res.arrayBuffer();
    // Use Uint8Array which is efficiently clonable to the main thread
    const data = new Uint8Array(arrayBuffer);

    parentPort.postMessage({
      id,
      status: res.status,
      headers,
      data
    });
  } catch (err) {
    parentPort.postMessage({
      id,
      error: err.message
    });
  }
});
