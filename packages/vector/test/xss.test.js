import test from 'node:test';
import assert from 'node:assert';
import { vec, raw } from '../src/index.js';

test('Vector Template Engine XSS Corpus', async (t) => {
  await t.test('escapes basic text interpolation', () => {
    const malicious = '<script>alert(1)</script>';
    const result = vec`<div>${malicious}</div>`;
    assert.strictEqual(result.toString(), '<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>');
  });

  await t.test('escapes double-quoted attributes', () => {
    const malicious = '"> <script>alert(1)</script>';
    const result = vec`<div class="${malicious}"></div>`;
    assert.strictEqual(result.toString(), '<div class="&quot;&gt; &lt;script&gt;alert(1)&lt;/script&gt;"></div>');
  });

  await t.test('escapes single-quoted attributes', () => {
    const malicious = "'> <script>alert(1)</script>";
    const result = vec`<div class='${malicious}'></div>`;
    assert.strictEqual(result.toString(), "<div class='&#39;&gt; &lt;script&gt;alert(1)&lt;/script&gt;'></div>");
  });

  await t.test('escapes unquoted attributes', () => {
    const malicious = 'onclick=alert(1)';
    const result = vec`<div class=${malicious}></div>`;
    assert.strictEqual(result.toString(), '<div class=onclick=alert(1)></div>');
  });

  await t.test('hard-refuses javascript: in URL attributes', () => {
    const malicious = 'javascript:alert(1)';
    assert.throws(
      () => vec`<a href="${malicious}">link</a>`,
      /E_INERT_VECTOR_UNSAFE/
    );
    assert.throws(
      () => vec`<a href='  ${malicious}  '>link</a>`,
      /E_INERT_VECTOR_UNSAFE/
    );
    assert.throws(
      () => vec`<iframe src=${malicious}></iframe>`,
      /E_INERT_VECTOR_UNSAFE/
    );
  });

  await t.test('hard-refuses interpolation in <script> and <style>', () => {
    const data = 'alert(1)';
    assert.throws(
      () => vec`<script>${data}</script>`,
      /E_INERT_VECTOR_UNSAFE/
    );
    assert.throws(
      () => vec`<style>${data}</style>`,
      /E_INERT_VECTOR_UNSAFE/
    );
  });

  await t.test('raw() escape hatch bypasses escaping', () => {
    const result = vec`<div>${raw('<b>bold</b>')}</div>`;
    assert.strictEqual(result.toString(), '<div><b>bold</b></div>');
  });

  await t.test('nested vec calls do not double-escape', () => {
    const child = vec`<span>${'<escaped>'}</span>`;
    const parent = vec`<div>${child}</div>`;
    assert.strictEqual(parent.toString(), '<div><span>&lt;escaped&gt;</span></div>');
  });
});
