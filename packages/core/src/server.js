import http from 'node:http';
import crypto from 'node:crypto';
import { requestScope } from './scope.js';
import { handleRequest } from './pipeline.js';
import { RateLimiter } from 'inertjs-shield/src/index.js';

export class CoreServer {
  /**
   * Initializes the InertJS Core server.
   * 
   * @param {object} config Validated config object
   * @param {RouterTrie} trie Loaded router trie
   */
  constructor(config, trie) {
    this.config = config;
    this.trie = trie;
    
    // Browsers do not support HTTP/2 without TLS (h2c).
    // To support Chrome in local dev, we fall back to HTTP/1.1 for plain text.
    this.server = http.createServer();
    
    const reqPerSec = config?.shield?.rateLimit || 100;
    this.rateLimiter = new RateLimiter(reqPerSec);
    
    this.connections = new Set();
    
    this.server.on('connection', (conn) => {
      this.connections.add(conn);
      conn.once('close', () => this.connections.delete(conn));
    });

    this.server.on('request', this._onRequest.bind(this));
  }

  _onRequest(req, res) {
    const ip = req.socket.remoteAddress || '127.0.0.1';
    if (!this.rateLimiter.check(ip)) {
      res.writeHead(429, { 'Content-Type': 'text/plain', 'Retry-After': '1' });
      res.end('Too Many Requests');
      return;
    }

    const scope = {
      reqId: crypto.randomUUID(),
      nonce: crypto.randomBytes(16).toString('base64'),
      startedAt: performance.now(),
      vaultHandle: null,
      conduitAgent: null,
      lens: null
    };

    // Every stage is wrapped in an AsyncLocalStorage RequestScope
    requestScope.run(scope, () => {
      handleRequest(req, res, this.config, this.trie).catch(err => {
        console.error(`[InertJS] Unhandled request error:`, err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
        } else {
          res.end();
        }
      });
    });
  }

  async start() {
    let port = this.config.core.port;
    const host = this.config.core.host;
    
    return new Promise((resolve, reject) => {
      this.server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`[InertJS] Port ${port} is in use, trying ${port + 1}...`);
          port++;
          this.config.core.port = port; // Update config
          this.server.listen(port, host);
        } else {
          reject(err);
        }
      });

      this.server.listen(port, host, () => {
        resolve();
      });
    });
  }

  async stop() {
    return new Promise((resolve, reject) => {
      // Always force idle/keep-alive sockets closed after a grace period — an
      // unset gracefulShutdownMs must not mean "wait forever".
      const graceMs = this.config.core?.gracefulShutdownMs ?? 5000;
      const timeout = setTimeout(() => {
        if (this.connections.size) {
          console.warn(`[InertJS] Graceful shutdown timeout, forcing ${this.connections.size} connection(s) closed`);
        }
        for (const conn of this.connections) {
          conn.destroy();
        }
      }, graceMs);
      timeout.unref?.();

      // Stop keep-alive from holding sockets open past the last response.
      this.server.closeIdleConnections?.();

      this.server.close((err) => {
        clearTimeout(timeout);
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
