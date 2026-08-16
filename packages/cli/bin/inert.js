#!/usr/bin/env node

/**
 * InertJS CLI
 * Parses argv by hand as per spec. Supports --json everywhere.
 */

const argv = process.argv.slice(2);
import path from 'node:path';
import { buildManifest } from 'inertjs-router/src/index.js';

// Extract global flags
const isJson = argv.includes('--json');
const args = argv.filter(arg => arg !== '--json');

const command = args[0];
const subArgs = args.slice(1);

function printHelp() {
  const help = `
InertJS CLI

Usage: inert <command> [options]

Commands:
  init [name]   Scaffold app + generate vault + .inertlink + gitignore
  dev           Dev server + Lens + SSE reload
  serve         Production server (verifies lock + vault)
  lock          Write/verify integrity manifest
  map           Print the Surface route trie + precedence
  doctor        Static security/perf audit
  vault <cmd>   Manage encrypted secrets
  bench         Run benchmark harness

Global Options:
  --json        Output in JSON format
  --help        Show this help message
`;
  if (isJson) {
    console.log(JSON.stringify({ error: 'Help requested', commands: ['init', 'dev', 'serve', 'lock', 'map', 'doctor', 'vault', 'bench'] }));
  } else {
    console.log(help.trim());
  }
}

async function main() {
  if (!command || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  try {
    switch (command) {
      case 'init':
        if (isJson) console.log(JSON.stringify({ status: 'ok', msg: 'Init not yet implemented' }));
        else console.log('Init not yet implemented');
        break;
      case 'dev': {
        let portArg = null;
        let hostArg = null;
        for (let i = 0; i < subArgs.length; i++) {
          if (subArgs[i] === '--port' && subArgs[i+1]) portArg = parseInt(subArgs[++i], 10);
          else if (subArgs[i] === '--host' && subArgs[i+1]) hostArg = subArgs[++i];
        }

        if (!process.env.INERT_CHILD) {
          const { spawn } = await import('node:child_process');
          const fs = await import('node:fs');
          
          let child = null;
          function startChild() {
             child = spawn(process.argv[0], process.argv.slice(1), {
               env: { ...process.env, INERT_CHILD: 'true' },
               stdio: 'inherit'
             });
          }
          startChild();
          
          let debounce;
          fs.watch(process.cwd(), { recursive: true }, (eventType, filename) => {
             if (!filename) return;
             if (filename.includes('.git') || filename.includes('node_modules') || filename.includes('.vault') || filename.endsWith('.log') || filename.endsWith('.tmp')) return;
             
             clearTimeout(debounce);
             debounce = setTimeout(() => {
                console.log(`\n[InertJS] File changed: ${filename}, restarting server...`);
                child.kill();
                startChild();
             }, 500);
          });
          break;
        }

        const { CoreServer } = await import('inertjs-core/src/server.js');
        const { buildManifest } = await import('inertjs-router/src/index.js');
        const path = await import('node:path');
        const cwd = process.cwd();
        
        try {
          // Check for Vault
          const fs = await import('node:fs/promises');
          const linkRaw = await fs.readFile(path.join(cwd, '.inertlink'), 'utf8').catch(() => null);
          let vaultDir = null;
          if (linkRaw) {
            vaultDir = path.join(cwd, JSON.parse(linkRaw).vaultDir);
            const { loadVault } = await import('inertjs-vault/src/index.js');
            await loadVault(cwd);
          }

          console.log('🚀 Starting InertJS development server...');
          const trie = await buildManifest(path.join(cwd, 'src/routes'));
          
          const server = new CoreServer({
            core: {
              port: portArg || (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000),
              host: hostArg || process.env.HOST || 'localhost'
            },
            vaultDir,
            shield: {
              // Custom CSP for the starter app
              csp: (nonce) => `default-src 'self'; script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'`
            }
          }, trie);

          await server.start();
          console.log(`✅ Server listening on http://${server.config.core.host}:${server.config.core.port}`);
        } catch (err) {
          console.error('Failed to start dev server:', err);
          process.exit(1);
        }
        break;
      }
      case 'serve': {
        process.env.NODE_ENV = 'production';
        let portArg = null;
        let hostArg = null;
        for (let i = 0; i < subArgs.length; i++) {
          if (subArgs[i] === '--port' && subArgs[i+1]) portArg = parseInt(subArgs[++i], 10);
          else if (subArgs[i] === '--host' && subArgs[i+1]) hostArg = subArgs[++i];
        }

        const { CoreServer } = await import('inertjs-core/src/server.js');
        const { buildManifest } = await import('inertjs-router/src/index.js');
        const path = await import('node:path');
        const cwd = process.cwd();
        
        try {
          // Check for Vault
          const fs = await import('node:fs/promises');
          const linkRaw = await fs.readFile(path.join(cwd, '.inertlink'), 'utf8').catch(() => null);
          let vaultDir = null;
          if (linkRaw) {
            vaultDir = path.join(cwd, JSON.parse(linkRaw).vaultDir);
            const { loadVault } = await import('inertjs-vault/src/index.js');
            await loadVault(cwd);
          }

          console.log('🚀 Starting InertJS production server...');
          const trie = await buildManifest(path.join(cwd, 'src/routes'));
          
          const server = new CoreServer({
            core: {
              port: portArg || (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000),
              host: hostArg || process.env.HOST || '0.0.0.0'
            },
            vaultDir,
            shield: {
              // Custom CSP for the starter app
              csp: (nonce) => `default-src 'self'; script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'`
            }
          }, trie);

          await server.start();
          console.log(`✅ Production server listening on http://${server.config.core.host}:${server.config.core.port}`);
        } catch (err) {
          console.error('Failed to start production server:', err);
          process.exit(1);
        }
        break;
      }
      case 'build':
        const buildMsg = 'InertJS is zero-build! No build step required. Just run `inert serve` to start the production server.';
        if (isJson) console.log(JSON.stringify({ status: 'ok', msg: buildMsg }));
        else console.log(buildMsg);
        break;
      case 'lock':
        if (isJson) console.log(JSON.stringify({ status: 'ok', msg: 'Lock not yet implemented' }));
        else console.log('Lock not yet implemented');
        break;
      case 'map': {
        const cwd = process.cwd();
        const surfaceDir = path.join(cwd, 'src/routes');
        try {
          const trie = await buildManifest(surfaceDir);
          const routes = trie.getFlattenedRoutes();
          
          if (isJson) {
            console.log(JSON.stringify({ status: 'ok', routes }));
          } else {
            console.log('Surface Route Map (Highest to Lowest Precedence):');
            console.log('-------------------------------------------------');
            if (routes.length === 0) {
              console.log('(No routes found)');
            } else {
              routes.forEach(r => {
                console.log(`- ${r.path || '/'}`);
                if (r.route.view) console.log(`    view:     ${r.route.view}`);
                if (r.route.wire) console.log(`    wire:     ${r.route.wire}`);
                if (r.route.flux) console.log(`    flux:     ${r.route.flux}`);
                if (r.route.guard) console.log(`    guard:    ${r.route.guard}`);
                if (r.route.fallback) console.log(`    fallback: ${r.route.fallback}`);
                if (r.route.shells && r.route.shells.length > 0) {
                  console.log(`    shells:   ${r.route.shells.join(' -> ')}`);
                }
              });
            }
          }
        } catch (err) {
          if (err.code === 'ENOENT') {
            console.error(isJson ? JSON.stringify({ error: 'No src/routes/ directory found' }) : 'Error: No src/routes/ directory found in the current working directory.');
            process.exit(1);
          }
          throw err;
        }
        break;
      }
      case 'doctor':
        try {
          const { runDoctor } = await import('inertjs-lens/src/doctor.js');
          await runDoctor(process.cwd());
        } catch (err) {
          console.error(err);
          process.exit(1);
        }
        break;
      case 'vault':
        if (args[1] === 'init') {
          try {
            const { initVault } = await import('inertjs-vault/src/admin.js');
            await initVault(process.cwd());
            if (isJson) console.log(JSON.stringify({ status: 'ok', msg: 'Vault initialized' }));
          } catch (err) {
            console.error(err);
            process.exit(1);
          }
        } else if (args[1] === 'set') {
          try {
            const { setSecret } = await import('inertjs-vault/src/admin.js');
            const key = args[2];
            const value = args[3];
            if (!key || !value) throw new Error('Usage: inert vault set KEY VALUE');
            await setSecret(process.cwd(), key, value);
          } catch (err) {
            console.error(err.message);
            process.exit(1);
          }
        } else if (args[1] === 'get') {
          try {
            const { getSecret } = await import('inertjs-vault/src/admin.js');
            const key = args[2];
            const reveal = argv.includes('--reveal');
            if (!key) throw new Error('Usage: inert vault get KEY [--reveal]');
            await getSecret(process.cwd(), key, reveal);
          } catch (err) {
            console.error(err.message);
            process.exit(1);
          }
        } else if (args[1] === 'list') {
          try {
            const { listSecrets } = await import('inertjs-vault/src/admin.js');
            await listSecrets(process.cwd());
          } catch (err) {
            console.error(err.message);
            process.exit(1);
          }
        } else if (args[1] === 'rm') {
          try {
            const { rmSecret } = await import('inertjs-vault/src/admin.js');
            const key = args[2];
            if (!key) throw new Error('Usage: inert vault rm KEY');
            await rmSecret(process.cwd(), key);
          } catch (err) {
            console.error(err.message);
            process.exit(1);
          }
        } else if (args[1] === 'rotate') {
          try {
            const { rotateVault } = await import('inertjs-vault/src/admin.js');
            await rotateVault(process.cwd());
          } catch (err) {
            console.error(err.message);
            process.exit(1);
          }
        } else if (args[1] === 'audit') {
          try {
            const { auditVault } = await import('inertjs-vault/src/admin.js');
            await auditVault(process.cwd());
          } catch (err) {
            console.error(err.message);
            process.exit(1);
          }
        } else {
          console.log(`Vault command '${args[1] || ''}' not fully implemented yet.`);
        }
        break;
      case 'bench':
        if (isJson) console.log(JSON.stringify({ status: 'ok', msg: 'Bench not yet implemented' }));
        else console.log('Bench not yet implemented');
        break;
      default:
        if (isJson) {
          console.error(JSON.stringify({ error: `Unknown command: ${command}` }));
        } else {
          console.error(`Unknown command: ${command}`);
          printHelp();
        }
        process.exit(1);
    }
  } catch (err) {
    if (isJson) {
      console.error(JSON.stringify({ error: err.message, stack: err.stack }));
    } else {
      console.error('Fatal error:', err);
    }
    process.exit(1);
  }
}

main();
