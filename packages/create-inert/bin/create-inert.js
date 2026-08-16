#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDirName = process.argv[2];

if (!targetDirName) {
  console.error('\x1b[31mPlease specify the project directory:\x1b[0m');
  console.log('  npx create-inert \x1b[32m<project-directory>\x1b[0m');
  process.exit(1);
}

const targetPath = path.resolve(process.cwd(), targetDirName);

if (fs.existsSync(targetPath)) {
  console.error(`\x1b[31mDirectory ${targetDirName} already exists.\x1b[0m`);
  process.exit(1);
}

console.log(`\n🚀 Creating a new InertJS project in \x1b[32m${targetPath}\x1b[0m\n`);

// In a real published NPM package, we would bundle the template files.
// Use the bundled template folder shipped with the npm package
const templateDir = path.join(__dirname, '..', 'template');

if (!fs.existsSync(templateDir)) {
  console.error('\x1b[31mError: Starter template not found.\x1b[0m');
  process.exit(1);
}

// Recursively copy files
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        copyDir(srcPath, destPath);
      }
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(templateDir, targetPath);

// Update package.json name to the project name
const targetPackageJsonPath = path.join(targetPath, 'package.json');
if (fs.existsSync(targetPackageJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(targetPackageJsonPath, 'utf8'));
  pkg.name = path.basename(targetPath);
  fs.writeFileSync(targetPackageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

console.log('\x1b[32mSuccess! Created your InertJS project.\x1b[0m\n');
console.log('Inside that directory, you can run several commands:\n');
console.log('  \x1b[36mnpm install\x1b[0m');
console.log('    Installs dependencies.\n');
console.log('  \x1b[36mnpm run dev\x1b[0m');
console.log('    Starts the development server.\n');
console.log('We suggest that you begin by typing:\n');
console.log(`  \x1b[36mcd\x1b[0m ${targetDirName}`);
console.log('  \x1b[36mnpm install\x1b[0m');
console.log('  \x1b[36mnpm run dev\x1b[0m\n');
