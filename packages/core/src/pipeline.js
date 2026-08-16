import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { getScope } from './scope.js';
import { renderToStream } from 'inertjs-vector/src/stream.js';
import { raw } from 'inertjs-vector/src/index.js';
import { getCspHeader, validateCsrfToken } from 'inertjs-shield/src/index.js';
import { serveStatic } from './static.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import { optimizeImage } from 'inertjs-optimizer';

function parseCookies(cookieStr) {
  if (!cookieStr) return {};
  return cookieStr.split(';').reduce((acc, str) => {
    const [k, v] = str.split('=');
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});
}

const flashCache = new Map();

export async function handleRequest(req, res, config, trie) {
  const scope = getScope();
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  
  if (req.method === 'GET' && !req.headers['accept']?.includes('application/vnd.inert.pulse+json') && flashCache.has(url.pathname)) {
    const start = performance.now();
    const cachedHtml = flashCache.get(url.pathname);
    // Securely inject the unique nonce for this request
    const safeHtml = cachedHtml.replace(/nonce="[^"]*"/g, `nonce="${scope.nonce}"`);
    const csp = getCspHeader(scope.nonce, config);
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': csp,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-Inert-Flash': 'Hit',
      'X-Inert-Flash-Time': `${(performance.now() - start).toFixed(2)}ms`
    });
    res.end(safeHtml);
    return;
  }
  
  if (url.pathname === '/_inert/dev/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write('data: connected\n\n');
    // Keep connection alive to detect disconnects instantly
    const keepAlive = setInterval(() => res.write(':\n\n'), 15000);
    req.on('close', () => clearInterval(keepAlive));
    return;
  }

  if (url.pathname.startsWith('/_inert/pulse/')) {
    const filename = url.pathname.replace('/_inert/pulse/', '');
    const filePath = path.resolve(process.cwd(), 'packages/pulse/src', filename);
    const served = await serveStatic(req, res, filePath);
    if (!served) {
      res.writeHead(404);
      res.end('Not Found');
    }
    return;
  }

  if (url.pathname.startsWith('/_inert/image')) {
    const src = url.searchParams.get('src');
    const width = url.searchParams.get('w');
    const height = url.searchParams.get('h');
    const quality = url.searchParams.get('q');

    if (!src) {
      res.writeHead(400);
      res.end('Missing src parameter');
      return;
    }

    try {
      const filePath = path.join(process.cwd(), src.replace(/^\/+/, ''));
      // Basic security check to prevent directory traversal
      if (!filePath.startsWith(process.cwd())) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      const buffer = await fs.readFile(filePath);
      const optimizedBuffer = await optimizeImage(buffer, { width, height, quality });
      
      res.writeHead(200, {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable'
      });
      res.end(optimizedBuffer);
    } catch (err) {
      console.error(`[InertJS] Image optimization failed:`, err);
      res.writeHead(500);
      res.end('Error optimizing image');
    }
    return;
  }

  if (url.pathname.startsWith('/public/') || url.pathname === '/favicon.ico' || url.pathname === '/robots.txt' || url.pathname === '/sitemap.xml' || url.pathname === '/site.webmanifest') {
    const filename = url.pathname.startsWith('/public/') 
      ? url.pathname.replace('/public/', '') 
      : url.pathname.slice(1);
    // Need to detect content type based on extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.css': 'text/css',
      '.webp': 'image/webp',
      '.ico': 'image/x-icon',
      '.txt': 'text/plain',
      '.xml': 'application/xml',
      '.webmanifest': 'application/manifest+json',
      '.json': 'application/json'
    };
    const cType = contentTypes[ext] || 'application/octet-stream';
    const filePath = path.resolve(process.cwd(), 'public', filename);
    const served = await serveStatic(req, res, filePath, cType);
    if (!served) {
      res.writeHead(404);
      res.end('Not Found');
    }
    return;
  }

  if (url.pathname.startsWith('/node_modules/')) {
    const filePath = path.resolve(process.cwd(), url.pathname.slice(1));
    const served = await serveStatic(req, res, filePath);
    if (!served) {
      res.writeHead(404);
      res.end('Not Found');
    }
    return;
  }

  const segments = url.pathname.split('/').filter(Boolean);

  let match = trie.match(segments);
  let is404 = false;

  if (!match) {
    match = trie.match(['404']);
    is404 = true;
    if (!match) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>404 Not Found - InertJS</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background-color: #0f172a; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .container { text-align: center; max-width: 600px; padding: 2rem; }
    h1 { font-size: 5rem; margin: 0; background: linear-gradient(to right, #818cf8, #22d3ee); -webkit-background-clip: text; color: transparent; font-weight: 900; }
    p { color: #94a3b8; font-size: 1.25rem; margin-bottom: 2rem; }
    a { background: #1e293b; color: #f8fafc; text-decoration: none; padding: 0.75rem 2rem; border-radius: 9999px; font-weight: 600; border: 1px solid #334155; transition: all 0.2s; }
    a:hover { background: #4f46e5; border-color: #4f46e5; }
  </style>
</head>
<body>
  <div class="container">
    <h1>404</h1>
    <p>The route could not be resolved by the InertJS router.</p>
    <a href="/">Return Home</a>
  </div>
</body>
</html>`);
      return;
    }
  }

  const { route, params } = match;

  try {
    // 1. Run guard() chain
    if (route.guard) {
      const guardModule = await import(pathToFileURL(route.guard).href);
      if (guardModule.guard) {
        const allowed = await guardModule.guard({ req, params, scope });
        if (!allowed) {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('Forbidden');
          return;
        }
      }
    }

    // 2. Wire handling (API endpoint)
    if (route.wire && !route.view) {
      const method = req.method.toUpperCase();
      
      // CSRF Protection for mutating methods
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        const cookies = parseCookies(req.headers.cookie);
        const headerToken = req.headers['x-inert-csrf'];
        if (!validateCsrfToken(cookies['__inert_csrf'], headerToken)) {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('CSRF Validation Failed');
          return;
        }
      }

      const wireModule = await import(pathToFileURL(route.wire).href);
      if (wireModule[method]) {
        // Execute the method handler
        const responseData = await wireModule[method]({ req, res, params, scope });
        if (!res.headersSent && responseData) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(responseData));
        }
      } else {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method Not Allowed');
      }
      return;
    }

    // 3. Run flux()
    let data = {};
    if (route.flux) {
      const fluxModule = await import(pathToFileURL(route.flux).href);
      if (fluxModule.flux) {
        data = await fluxModule.flux({ req, params, scope });
      }
    } else if (route.view) {
      const viewModule = await import(pathToFileURL(route.view).href);
      if (viewModule.flux) {
        data = await viewModule.flux({ req, params, scope });
      }
    }

    const isPulse = req.headers['accept']?.includes('application/vnd.inert.pulse+json');

    // 4. View rendering
    if (!isPulse) {
      const csp = getCspHeader(scope.nonce, config);
      res.writeHead(is404 ? 404 : 200, { 
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': csp,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
      });
    }

    let viewResult = '';
    let isFlashMode = false;
    if (route.view) {
      const viewModule = await import(pathToFileURL(route.view).href);
      if (viewModule.flash === true) isFlashMode = true;
      if (viewModule.render) {
        viewResult = viewModule.render({ data, params, scope });
      }
    }

    // 5. Wrap in shells (from inside out) if not a pulse navigation
    let finalResult = viewResult;
    
    if (isPulse) {
      const { resolveToString } = await import('inertjs-vector/src/index.js');
      const viewHtml = await resolveToString(viewResult);
      
      res.writeHead(200, { 
        'Content-Type': 'application/vnd.inert.pulse+json',
        'X-Content-Type-Options': 'nosniff'
      });
      
      res.end(JSON.stringify({
        title: data.title || 'InertJS',
        shellIdsToUpdate: [],
        viewHtml,
        data
      }));
      return;
    }

    if (route.shells && route.shells.length > 0) {
      for (let i = route.shells.length - 1; i >= 0; i--) {
        const shellModule = await import(pathToFileURL(route.shells[i]).href);
        if (shellModule.render) {
          // Preserve VecStream and RawString objects, only wrap plain strings
          const childrenArg = (finalResult && (finalResult.type === 'VecStream' || finalResult.value !== undefined))
            ? finalResult
            : raw(String(finalResult));
          finalResult = shellModule.render({ children: childrenArg, data, params, scope });
        }
      }
    }

    // 6. Stream to response
    if (isFlashMode && !isPulse && req.method === 'GET') {
      const { resolveToString } = await import('inertjs-vector/src/index.js');
      const finalHtml = await resolveToString(finalResult);
      // Cache it for the next request
      flashCache.set(url.pathname, finalHtml);
      res.end(finalHtml);
      return;
    }

    const webStream = renderToStream(finalResult, scope.nonce);
    const nodeStream = Readable.fromWeb(webStream);
    
    // Pipe handles backpressure natively
    nodeStream.pipe(res);

  } catch (err) {
    console.error(`[InertJS] Pipeline Error:`, err);
    
    // Fallback handling
    if (route && route.fallback) {
      try {
        const fallbackModule = await import(pathToFileURL(route.fallback).href);
        if (fallbackModule.fallback && !res.headersSent) {
          const fallbackRes = await fallbackModule.fallback(err);
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(fallbackRes);
          return;
        }
      } catch (fallbackErr) {
        console.error(`[InertJS] Fallback failed:`, fallbackErr);
      }
    }

    if (!res.headersSent) {
      // Global 500 handler
      const errorMatch = trie.match(['500']);
      if (errorMatch && errorMatch.route.view) {
        try {
          const viewModule = await import(pathToFileURL(errorMatch.route.view).href);
          let finalResult = '';
          if (viewModule.render) {
            finalResult = viewModule.render({ data: { error: err.message, stack: err.stack, title: 'Server Error' }, params: {}, scope });
          }
          
          if (errorMatch.route.shells && errorMatch.route.shells.length > 0) {
            for (let i = errorMatch.route.shells.length - 1; i >= 0; i--) {
              const shellModule = await import(pathToFileURL(errorMatch.route.shells[i]).href);
              if (shellModule.render) {
                finalResult = shellModule.render({ children: raw(finalResult instanceof Object && finalResult.value ? finalResult.value : String(finalResult)), data: { error: err.message, stack: err.stack, title: 'Server Error' }, params: {}, scope });
              }
            }
          }
          
          const csp = getCspHeader(scope.nonce, config);
          res.writeHead(500, { 
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Security-Policy': csp,
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY'
          });
          
          const webStream = renderToStream(finalResult, scope.nonce);
          const nodeStream = Readable.fromWeb(webStream);
          nodeStream.pipe(res);
          return;
        } catch (globalErr) {
          console.error(`[InertJS] Global 500 handler failed:`, globalErr);
        }
      }

      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>500 Internal Error - InertJS</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background-color: #0f172a; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 2rem; box-sizing: border-box; }
    .container { width: 100%; max-width: 800px; }
    .header { text-align: center; margin-bottom: 2rem; }
    h1 { font-size: 3rem; margin: 0; color: #f87171; font-weight: 800; }
    p { color: #94a3b8; font-size: 1.1rem; }
    .error-box { background: rgba(0,0,0,0.3); border: 1px solid rgba(248,113,113,0.3); border-radius: 0.5rem; overflow: hidden; }
    .error-msg { background: rgba(127,29,29,0.4); padding: 1rem; color: #fca5a5; font-family: monospace; font-weight: bold; border-bottom: 1px solid rgba(248,113,113,0.3); word-wrap: break-word; }
    pre { padding: 1rem; margin: 0; color: #cbd5e1; font-family: monospace; font-size: 0.875rem; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Internal Server Error</h1>
      <p>The application encountered an unexpected condition.</p>
    </div>
    <div class="error-box">
      <div class="error-msg">${err.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      <pre>${err.stack.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
    </div>
  </div>
</body>
</html>`);
    } else {
      res.end(); // just close it
    }
  }
}
