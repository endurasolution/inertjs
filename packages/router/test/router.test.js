import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { RouterTrie } from '../src/trie.js';
import { buildManifest } from '../src/manifest.js';

test('Router Trie - Precedence Matrix', async (t) => {
  const trie = new RouterTrie();
  
  trie.insert(['blog', 'new'], 'static-new');
  trie.insert(['blog', '[slug]'], 'dynamic-slug');
  trie.insert(['blog', '$rest'], 'catchall-rest');
  trie.insert([''], 'root');

  await t.test('matches root', () => {
    const res = trie.match(['']);
    assert.strictEqual(res.route, 'root');
  });

  await t.test('prefers static over dynamic and catch-all', () => {
    const res = trie.match(['blog', 'new']);
    assert.strictEqual(res.route, 'static-new');
    assert.deepStrictEqual(res.params, {});
  });

  await t.test('prefers dynamic over catch-all', () => {
    const res = trie.match(['blog', 'hello']);
    assert.strictEqual(res.route, 'dynamic-slug');
    assert.deepStrictEqual(res.params, { slug: 'hello' });
  });

  await t.test('falls back to catch-all', () => {
    const res = trie.match(['blog', 'archive', '2026']);
    assert.strictEqual(res.route, 'catchall-rest');
    assert.deepStrictEqual(res.params, { rest: ['archive', '2026'] });
  });
  
  await t.test('catch-all matches one segment if dynamic not present', () => {
    const trie2 = new RouterTrie();
    trie2.insert(['docs', '$path'], 'docs-catchall');
    
    const res = trie2.match(['docs', 'setup', 'install']);
    assert.strictEqual(res.route, 'docs-catchall');
    assert.deepStrictEqual(res.params, { path: ['setup', 'install'] });
  });

  await t.test('returns null for no match', () => {
    const res = trie.match(['about']);
    assert.strictEqual(res, null);
  });
});

test('Surface Manifest Builder', async (t) => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'inert-router-test-'));
  
  try {
    // Scaffold surface dir
    const dirs = [
      '',
      'about',
      'blog',
      'blog/[slug]',
      '~auth',
      '~auth/login',
      '(private)',
      'docs',
      'docs/$path'
    ];
    
    for (const d of dirs) {
      await fs.mkdir(path.join(tmpDir, d), { recursive: true });
    }
    
    // Create some files
    await fs.writeFile(path.join(tmpDir, 'view.js'), 'export const render = () => ""');
    await fs.writeFile(path.join(tmpDir, 'shell.js'), 'export const render = () => ""');
    await fs.writeFile(path.join(tmpDir, 'about', 'view.js'), '');
    await fs.writeFile(path.join(tmpDir, 'blog', '[slug]', 'view.js'), '');
    await fs.writeFile(path.join(tmpDir, 'blog', '[slug]', 'guard.js'), '');
    await fs.writeFile(path.join(tmpDir, '~auth', 'shell.js'), '');
    await fs.writeFile(path.join(tmpDir, '~auth', 'login', 'view.js'), '');
    await fs.writeFile(path.join(tmpDir, '(private)', 'view.js'), '');
    await fs.writeFile(path.join(tmpDir, 'docs', '$path', 'view.js'), '');

    const trie = await buildManifest(tmpDir);

    await t.test('ignores (private) dirs', () => {
      assert.strictEqual(trie.match(['(private)']), null);
    });

    await t.test('omits ~group from URL path but includes its shell', () => {
      const res = trie.match(['login']);
      assert.ok(res);
      assert.ok(res.route.view.endsWith('~auth/login/view.js'));
      // Should inherit root shell and ~auth shell
      assert.strictEqual(res.route.shells.length, 2);
      assert.ok(res.route.shells[0].endsWith('shell.js'));
      assert.ok(res.route.shells[1].endsWith('~auth/shell.js'));
    });

    await t.test('builds dynamic and catch-all routes correctly', () => {
      const slugRes = trie.match(['blog', 'my-post']);
      assert.ok(slugRes);
      assert.strictEqual(slugRes.params.slug, 'my-post');
      assert.ok(slugRes.route.view.endsWith('blog/[slug]/view.js'));
      assert.ok(slugRes.route.guard.endsWith('blog/[slug]/guard.js'));

      const catchRes = trie.match(['docs', 'a', 'b']);
      assert.ok(catchRes);
      assert.deepStrictEqual(catchRes.params.path, ['a', 'b']);
      assert.ok(catchRes.route.view.endsWith('docs/$path/view.js'));
    });

  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
