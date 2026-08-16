import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { fetchSecure } from '../src/index.js';

test('Conduit secure fetch subsystem', async (t) => {
  // Create a local HTTP server to test against
  const server = http.createServer((req, res) => {
    res.setHeader('Set-Cookie', 'secret=123');
    res.setHeader('Authorization', 'Bearer token');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Safe-Header', 'hello');
    res.end(JSON.stringify({ message: 'Hello from Conduit' }));
  });

  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetchSecure(`http://127.0.0.1:${port}/test`);
    
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['x-safe-header'], 'hello');
    assert.strictEqual(res.headers['set-cookie'], undefined, 'Cookie header should be stripped');
    assert.strictEqual(res.headers['authorization'], undefined, 'Auth header should be stripped');
    
    const data = await res.json();
    assert.deepStrictEqual(data, { message: 'Hello from Conduit' });
  } finally {
    server.close();
  }
});
