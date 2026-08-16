import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { minifyAsset } from 'inertjs-optimizer';

const ETAG_CACHE = new Map();

/**
 * Serves a static file with ETag caching and proper cache headers.
 */
export async function serveStatic(req, res, filePath, contentType = 'application/javascript') {
  try {
    const stat = await fs.stat(filePath);
    
    let cacheEntry = ETAG_CACHE.get(filePath);
    if (!cacheEntry || cacheEntry.mtime !== stat.mtimeMs) {
      let content = await fs.readFile(filePath);
      
      if (contentType === 'application/javascript' || contentType === 'text/css') {
        const type = contentType === 'text/css' ? 'css' : 'js';
        const minified = await minifyAsset(content.toString('utf8'), type);
        content = Buffer.from(minified, 'utf8');
      }

      const hash = crypto.createHash('sha1').update(content).digest('hex');
      cacheEntry = { 
        etag: `"${hash}"`, 
        mtime: stat.mtimeMs,
        content 
      };
      ETAG_CACHE.set(filePath, cacheEntry);
    }

    if (req.headers['if-none-match'] === cacheEntry.etag) {
      res.writeHead(304);
      res.end();
      return true;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'ETag': cacheEntry.etag
    });
    res.end(cacheEntry.content);
    return true;
  } catch (err) {
    return false;
  }
}
