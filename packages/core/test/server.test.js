import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { CoreServer } from '../src/server.js';
import { RouterTrie } from 'inertjs-router/src/trie.js';

// The Core server is plain HTTP/1.1 (h2c has no browser support), so the test
// client is a plain fetch — not an http2 session.
test('Core Kernel - Server Pipeline', async (t) => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'inert-core-test-'));

  try {
    // Scaffold test routes
    await fs.mkdir(path.join(tmpDir, 'basic'), { recursive: true });

    const vectorPath = pathToFileURL(path.resolve(process.cwd(), 'packages/vector/src/index.js')).href;

    // Mock view.js
    await fs.writeFile(
      path.join(tmpDir, 'basic', 'view.js'),
      `import { vec } from '${vectorPath}'; export const render = ({ data }) => vec\`<main>\${data.title}</main>\`;`
    );

    // Mock shell.js
    await fs.writeFile(
      path.join(tmpDir, 'basic', 'shell.js'),
      `import { vec } from '${vectorPath}'; export const render = ({ children }) => vec\`<html><body>\${children}</body></html>\`;`
    );

    // Mock flux.js
    await fs.writeFile(
      path.join(tmpDir, 'basic', 'flux.js'),
      `export const flux = async () => { return { title: 'Hello Flux' }; };`
    );

    // Mock guard.js
    await fs.writeFile(
      path.join(tmpDir, 'basic', 'guard.js'),
      `export const guard = async ({ req }) => req.headers['x-allow'] === 'yes';`
    );

    const trie = new RouterTrie();

    // The manifest stores absolute paths
    const toUrl = p => path.join(tmpDir, p).split(path.sep).join('/');

    trie.insert(['basic'], {
      view: toUrl('basic/view.js'),
      shell: toUrl('basic/shell.js'),
      shells: [toUrl('basic/shell.js')],
      flux: toUrl('basic/flux.js'),
      guard: toUrl('basic/guard.js'),
    });

    const config = {
      core: { port: 0, host: '127.0.0.1', gracefulShutdownMs: 1000 }
    };

    const server = new CoreServer(config, trie);
    await server.start();
    const port = server.server.address().port;
    const base = `http://127.0.0.1:${port}`;

    await t.test('403 when guard fails', async () => {
      const res = await fetch(`${base}/basic`);
      assert.strictEqual(res.status, 403);
    });

    await t.test('200 pipeline success (guard -> flux -> view -> shell)', async () => {
      const res = await fetch(`${base}/basic`, { headers: { 'x-allow': 'yes' } });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('content-type'), 'text/html; charset=utf-8');
      assert.ok(res.headers.get('content-security-policy').includes("default-src 'none'"));

      const body = await res.text();
      assert.strictEqual(body, '<html><body><main>Hello Flux</main></body></html>');
    });

    await t.test('200 Pulse JSON manifest', async () => {
      const res = await fetch(`${base}/basic`, {
        headers: { 'x-allow': 'yes', 'accept': 'application/vnd.inert.pulse+json' }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('content-type'), 'application/vnd.inert.pulse+json');

      const manifest = await res.json();
      assert.strictEqual(manifest.title, 'Hello Flux');
      assert.strictEqual(manifest.viewHtml, '<main>Hello Flux</main>');
      assert.deepStrictEqual(manifest.data, { title: 'Hello Flux' });
    });

    await t.test('404 for an unknown route', async () => {
      const res = await fetch(`${base}/does-not-exist`);
      assert.strictEqual(res.status, 404);
      await res.text();
    });

    await server.stop();
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
