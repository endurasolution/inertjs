import fs from 'fs/promises';
import path from 'path';

const packagesDir = path.resolve('packages');
console.log('Fixing imports in:', packagesDir);

async function fixImports(dir) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  for (const f of files) {
    const fullPath = path.join(dir, f.name);
    if (f.isDirectory() && f.name !== 'node_modules' && f.name !== '.git') {
      await fixImports(fullPath);
    } else if (f.name.endsWith('.js') || f.name.endsWith('.mjs')) {
      let content = await fs.readFile(fullPath, 'utf8');
      
      const regex = /\.\.\/\.\.\/([a-zA-Z-]+)\/(src|bin|test)(\/[a-zA-Z0-9_\-\.]+)?/g;
      let changed = false;
      content = content.replace(regex, (match, pkg, folder, file) => {
        if (pkg === 'create-inert') return match;
        changed = true;
        
        let target = `inertjs-${pkg}`;
        if (folder === 'src') {
            if (file) target += `/${folder}${file}`;
            else target += `/${folder}/index.js`;
        }
        return target;
      });
      
      // also fix ../../core/src/server.js -> inertjs-core/src/server.js
      // The regex above handles (src|bin|test)(/file)?
      
      if (changed) {
        console.log('Fixed:', fullPath);
        await fs.writeFile(fullPath, content);
      }
    }
  }
}

fixImports(packagesDir).catch(console.error);
