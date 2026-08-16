import fs from 'fs/promises';
import path from 'path';

const packagesDir = path.resolve('packages');
const CURRENT_VERSION = '^1.0.0-beta.3'; // or beta.4, we'll bump right after anyway

async function fixDependencies(dir) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  for (const f of files) {
    const fullPath = path.join(dir, f.name);
    if (f.isDirectory() && f.name !== 'node_modules') {
      await fixDependencies(fullPath);
    } else if (f.name === 'package.json' && dir !== path.resolve('packages/create-inert/template')) {
      // Find all imports in the src/bin directories
      const deps = new Set();
      
      async function scanJs(srcDir) {
        try {
          const items = await fs.readdir(srcDir, { withFileTypes: true });
          for (const item of items) {
            const itemPath = path.join(srcDir, item.name);
            if (item.isDirectory()) {
              await scanJs(itemPath);
            } else if (item.name.endsWith('.js') || item.name.endsWith('.mjs')) {
              const content = await fs.readFile(itemPath, 'utf8');
              const matches = content.matchAll(/from\s+['"](inertjs-[a-zA-Z-]+).*?['"]/g);
              for (const match of matches) {
                deps.add(match[1]);
              }
              const dMatches = content.matchAll(/import\(['"](inertjs-[a-zA-Z-]+).*?['"]\)/g);
              for (const match of dMatches) {
                deps.add(match[1]);
              }
            }
          }
        } catch (e) {
            // Ignore if directory doesn't exist
        }
      }

      await scanJs(path.join(dir, 'src'));
      await scanJs(path.join(dir, 'bin'));
      await scanJs(path.join(dir, 'test'));

      if (deps.size > 0) {
        let pkg = JSON.parse(await fs.readFile(fullPath, 'utf8'));
        pkg.dependencies = pkg.dependencies || {};
        let changed = false;
        for (const dep of deps) {
          if (dep === pkg.name) continue; // ignore self
          if (!pkg.dependencies[dep]) {
            pkg.dependencies[dep] = CURRENT_VERSION;
            changed = true;
          }
        }
        if (changed) {
          console.log(`Updated ${pkg.name} dependencies`);
          await fs.writeFile(fullPath, JSON.stringify(pkg, null, 2) + '\n');
        }
      }
    }
  }
}

fixDependencies(packagesDir).catch(console.error);
