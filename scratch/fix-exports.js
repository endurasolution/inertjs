import fs from 'fs/promises';
import path from 'path';

const packagesDir = path.resolve('packages');

async function fixExports(dir) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  for (const f of files) {
    const fullPath = path.join(dir, f.name);
    if (f.isDirectory() && f.name !== 'node_modules') {
      await fixExports(fullPath);
    } else if (f.name === 'package.json' && dir !== path.resolve('packages/create-inert/template')) {
      let pkg = JSON.parse(await fs.readFile(fullPath, 'utf8'));
      
      pkg.main = "src/index.js";
      pkg.exports = {
        ".": "./src/index.js",
        "./*": "./*"
      };
      
      await fs.writeFile(fullPath, JSON.stringify(pkg, null, 2) + '\n');
      console.log(`Updated exports for ${pkg.name}`);
    }
  }
}

fixExports(packagesDir).catch(console.error);
