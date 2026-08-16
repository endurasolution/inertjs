import test from 'node:test';
import assert from 'node:assert';
import http2 from 'node:http2';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { CoreServer } from '../src/server.js';
import { RouterTrie } from 'inertjs-router/src/trie.js';

function fetchH2C(url) {
  return new Promise((resolve, reject) => {
    const client = http2.connect(url);
    const u = new URL(url);
    const req = client.request({ ':path': u.pathname });

    let data = '';
    req.setEncoding('utf8');
    
    req.on('response', (headers) => {
      req.on('data', chunk => data += chunk);
      req.on('end', () => {
        client.close();
        resolve({ status: headers[':status'], data, headers });
      });
    });
    
    req.on('error', err => {
      client.close();
      reject(err);
    });
    
    req.end();
  });
}

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
      shell: toUrl('basic/shell.js'), // Wait, it's an array of shells
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

    await t.test('403 when guard fails', async () => {
      const res = await fetchH2C(`http://127.0.0.1:${port}/basic`);
      assert.strictEqual(res.status, 403);
    });

    await t.test('200 pipeline success (guard -> flux -> view -> shell)', async () => {
      return new Promise((resolve, reject) => {
        const client = http2.connect(`http://127.0.0.1:${port}`);
        const req = client.request({ ':path': '/basic', 'x-allow': 'yes' });

        let data = '';
        req.setEncoding('utf8');
        
        req.on('response', (headers) => {
          assert.strictEqual(headers[':status'], 200);
          assert.strictEqual(headers['content-type'], 'text/html; charset=utf-8');
          assert.ok(headers['content-security-policy'].includes('default-src \'none\''));
          
          req.on('data', chunk => data += chunk);
          req.on('end', () => {
            client.close();
            // It should render shell wrapping view wrapping flux data
            assert.strictEqual(data, '<html><body><main>Hello Flux</main></body></html>');
            resolve();
          });
        });
        
        req.on('error', err => {
          client.close();
          reject(err);
        });
        
        req.end();
      });
    });

    await t.test('200 Pulse JSON manifest', async () => {
      return new Promise((resolve, reject) => {
        const client = http2.connect(`http://127.0.0.1:${port}`);
        const req = client.request({ 
          ':path': '/basic', 
          'x-allow': 'yes',
          'accept': 'application/vnd.inert.pulse+json'
        });

        let data = '';
        req.setEncoding('utf8');
        
        req.on('response', (headers) => {
          assert.strictEqual(headers[':status'], 200);
          assert.strictEqual(headers['content-type'], 'application/vnd.inert.pulse+json');
          
          req.on('data', chunk => data += chunk);
          req.on('end', () => {
            client.close();
            const manifest = JSON.parse(data);
            assert.strictEqual(manifest.title, 'Hello Flux');
            assert.strictEqual(manifest.viewHtml, '<main>Hello Flux</main>');
            assert.deepStrictEqual(manifest.data, { title: 'Hello Flux' });
            resolve();
          });
        });
        
        req.on('error', err => {
          client.close();
          reject(err);
        });
        
        req.end();
      });
    });

    await server.stop();
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
