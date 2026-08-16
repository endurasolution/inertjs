import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const NEW_VERSION = '1.0.0-beta.4';

// List all packages
const packagesDir = path.join(root, 'packages');
const packages = fs.readdirSync(packagesDir).filter(p => fs.statSync(path.join(packagesDir, p)).isDirectory());

// Get all package.json files to update
const packageJsonPaths = [
  path.join(root, 'package.json'),
  path.join(root, 'examples', 'starter', 'package.json'),
  ...packages.map(p => path.join(packagesDir, p, 'package.json'))
];

for (const pkgPath of packageJsonPaths) {
  if (!fs.existsSync(pkgPath)) continue;
  
  const content = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  
  // Bump version
  if (content.version) {
    content.version = NEW_VERSION;
  }
  
  // Bump internal dependencies
  for (const depType of ['dependencies', 'devDependencies', 'peerDependencies']) {
    if (content[depType]) {
      for (const [dep, version] of Object.entries(content[depType])) {
        if (dep.startsWith('inertjs-')) {
          content[depType][dep] = `^${NEW_VERSION}`;
        }
      }
    }
  }
  
  fs.writeFileSync(pkgPath, JSON.stringify(content, null, 2) + '\n', 'utf8');
  console.log(`Updated ${path.relative(root, pkgPath)} to ${NEW_VERSION}`);
}
