import test from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Pulse Client Runtime syntax check', async (t) => {
  const runtimePath = path.resolve(__dirname, '../src/runtime.js');
  const morphPath = path.resolve(__dirname, '../src/morph.js');
  
  // Quick syntax check by compiling it with node (will fail if invalid JS)
  const res1 = spawnSync(process.execPath, ['--check', runtimePath]);
  assert.strictEqual(res1.status, 0, 'runtime.js has syntax errors: ' + res1.stderr.toString());

  const res2 = spawnSync(process.execPath, ['--check', morphPath]);
  assert.strictEqual(res2.status, 0, 'morph.js has syntax errors: ' + res2.stderr.toString());
});
