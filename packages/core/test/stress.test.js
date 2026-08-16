import test from 'node:test';
import assert from 'node:assert';
import http2 from 'node:http2';
import crypto from 'node:crypto';
import { CoreServer } from '../src/server.js';
import { RouterTrie } from 'inertjs-router/src/index.js';

test('CoreServer Rate Limiter E2E (100 reqs/sec limit)', async (t) => {
  const trie = new RouterTrie();
  trie.insert(['test'], {
    view: 'file://' + process.cwd() + '/packages/core/test/mock/view.js'
  });

  const server = new CoreServer({
    core: { port: 0, host: '127.0.0.1' },
    shield: { rateLimit: 100 }
  }, trie);

  await server.start();
  const port = server.server.address().port;
  
  const client = http2.connect(`http://127.0.0.1:${port}`);
  
  let successCount = 0;
  let limitedCount = 0;

  // Spam 200 requests concurrently
  const reqs = Array.from({ length: 200 }).map(() => {
    return new Promise((resolve) => {
      const req = client.request({ ':path': '/test' });
      req.on('response', (headers) => {
        if (headers[':status'] === 200) successCount++;
        if (headers[':status'] === 429) limitedCount++;
        req.resume(); // consume data
      });
      req.on('end', resolve);
      req.end();
    });
  });

  await Promise.all(reqs);

  assert.ok(successCount > 0 && successCount <= 100, `Expected some success, got ${successCount}`);
  assert.ok(limitedCount >= 100, `Expected at least 100 429s, got ${limitedCount}`);

  client.close();
  await server.stop();
});
