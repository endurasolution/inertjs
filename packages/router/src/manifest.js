import fs from 'node:fs/promises';
import path from 'node:path';
import { RouterTrie } from './trie.js';

/**
 * Builds the Surface manifest by walking the surface directory.
 * 
 * @param {string} surfaceDir Absolute path to the surface directory
 * @returns {Promise<RouterTrie>} The built router trie
 */
export async function buildManifest(surfaceDir) {
  const trie = new RouterTrie();

  // Helper to walk the directory
  async function walk(currentDir, urlSegments, shellStack) {
    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch (err) {
      if (err.code === 'ENOENT') return; // Directory doesn't exist, which is fine
      throw err;
    }

    const routePayload = {
      view: null,
      wire: null,
      flux: null,
      guard: null,
      fallback: null,
      shells: [...shellStack] // Copy of inherited shells
    };

    let isRoutable = false;
    const subDirs = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const name = entry.name;
        // Ignore (private) directories
        if (name.startsWith('(') && name.endsWith(')')) {
          continue;
        }
        subDirs.push(entry);
      } else if (entry.isFile()) {
        const fullPath = path.join(currentDir, entry.name);
        // Normalize path for consistent runtime importing (forward slashes)
        const runtimePath = fullPath.split(path.sep).join('/');

        switch (entry.name) {
          case 'view.js':
            routePayload.view = runtimePath;
            isRoutable = true;
            break;
          case 'wire.js':
            routePayload.wire = runtimePath;
            isRoutable = true;
            break;
          case 'flux.js':
            routePayload.flux = runtimePath;
            break;
          case 'guard.js':
            routePayload.guard = runtimePath;
            break;
          case 'fallback.js':
            routePayload.fallback = runtimePath;
            break;
          case 'shell.js':
            // Add to inherited shells for THIS directory and its children
            routePayload.shells.push(runtimePath);
            break;
        }
      }
    }

    // Insert into trie if it's routable
    if (isRoutable) {
      // Clean up segments: remove trailing empty if root
      const segmentsToInsert = urlSegments.length === 0 ? [] : urlSegments;
      trie.insert(segmentsToInsert, routePayload);
    }

    // Walk subdirectories
    for (const subDir of subDirs) {
      const nextDir = path.join(currentDir, subDir.name);
      
      let nextUrlSegments = [...urlSegments];
      // If it's a ~group, we DON'T add it to the URL segments
      if (!subDir.name.startsWith('~')) {
        nextUrlSegments.push(subDir.name);
      }
      
      await walk(nextDir, nextUrlSegments, routePayload.shells);
    }
  }

  await walk(surfaceDir, [], []);
  
  return trie;
}
