import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { CoreServer } from '../src/server.js';
import { RouterTrie } from 'inertjs-router/src/index.js';

function get(url, agent) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { agent }, (res) => {
      res.resume(); // drain
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
  });
}

test('CoreServer Rate Limiter E2E (100 reqs/sec limit)', async (t) => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'inert-core-stress-'));
  const agent = new http.Agent({ keepAlive: true, maxSockets: 8 });

  try {
    const vectorPath = pathToFileURL(path.resolve(process.cwd(), 'packages/vector/src/index.js')).href;
    await fs.mkdir(path.join(tmpDir, 'test'), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, 'test', 'view.js'),
      `import { vec } from '${vectorPath}'; export const render = () => vec\`<main>ok</main>\`;`
    );

    const trie = new RouterTrie();
    trie.insert(['test'], {
      view: path.join(tmpDir, 'test', 'view.js').split(path.sep).join('/')
    });

    const server = new CoreServer({
      core: { port: 0, host: '127.0.0.1', gracefulShutdownMs: 500 },
      shield: { rateLimit: 100 }
    }, trie);

    await server.start();
    const port = server.server.address().port;
    const url = `http://127.0.0.1:${port}/test`;

    const statuses = await Promise.all(
      Array.from({ length: 260 }).map(() => get(url, agent).catch(() => 0))
    );

    const ok = statuses.filter(s => s === 200).length;
    const limited = statuses.filter(s => s === 429).length;
    const failed = statuses.filter(s => s === 0).length;
    const other = statuses.filter(s => s !== 0 && s !== 200 && s !== 429).length;

    assert.strictEqual(other, 0, `unexpected statuses in ${JSON.stringify(statuses)}`);
    assert.strictEqual(failed, 0, 'every request got an HTTP response (no dropped connections)');
    assert.ok(ok >= 1, `expected some requests to pass, got ${ok}`);
    // Fixed 1s windows: a burst that straddles a boundary can pass up to ~2x.
    assert.ok(ok <= 200, `rate limiter let too many through: ${ok}`);
    assert.ok(limited >= 60, `expected the limiter to reject the excess, got ${limited}`);

    await server.stop();
  } finally {
    agent.destroy();
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
