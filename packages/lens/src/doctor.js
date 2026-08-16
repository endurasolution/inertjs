import { buildManifest } from 'inertjs-router/src/index.js';
import path from 'node:path';
import fs from 'node:fs/promises';

export async function runDoctor(cwd = process.cwd()) {
  console.log('🩺 Inert Doctor - System Diagnostic\n');
  const srcDir = path.join(cwd, 'src/routes');
  
  let warnings = 0;
  let errors = 0;

  try {
    await fs.stat(srcDir);
  } catch {
    console.error(`❌ src/routes directory not found at ${srcDir}`);
    return;
  }

  console.log('Checking routes...');
  const trie = await buildManifest(srcDir);
  const routes = trie.getFlattenedRoutes();

  for (const { path: routePath, route } of routes) {
    if (route.wire && !route.guard) {
      console.warn(`⚠️  Warning: Route ${routePath} has a .wire.js but no guard.js! This may expose endpoints to unauthorized access.`);
      warnings++;
    }

    if (!route.view && !route.wire && !route.fallback) {
      console.warn(`⚠️  Warning: Route ${routePath} is mapped but has no .view.js, .wire.js, or fallback.js.`);
      warnings++;
    }
  }

  console.log('\nChecking Vault...');
  try {
    const linkPath = path.join(cwd, '.inertlink');
    const linkRaw = await fs.readFile(linkPath, 'utf8');
    const dirName = JSON.parse(linkRaw).vaultDir;
    await fs.stat(path.join(cwd, dirName, 'seal.meta.json'));
    console.log('✅ Vault is connected and sealed.');
  } catch (err) {
    console.warn('⚠️  Vault is NOT initialized or .inertlink is missing. Secrets are not configured for this environment.');
    warnings++;
  }

  console.log('\nDiagnostic Complete.');
  if (errors > 0 || warnings > 0) {
    console.log(`Found ${errors} error(s) and ${warnings} warning(s).`);
    if (errors > 0) process.exit(1);
  } else {
    console.log('✨ System is healthy!');
  }
}
