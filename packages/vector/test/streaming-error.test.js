import test from 'node:test';
import assert from 'node:assert';
import { vec, raw, defer } from '../src/index.js';
import { renderToStream } from '../src/stream.js';
import { resolveToString } from '../src/resolve.js';

const decoder = new TextDecoder();

/** Fully drains a stream to a string, failing the test rather than hanging forever. */
async function collect(stream, ms = 2000) {
  const reader = stream.getReader();
  let out = '';
  const timer = setTimeout(() => reader.cancel(new Error('stream did not close')), ms);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      out += decoder.decode(value, { stream: true });
    }
    out += decoder.decode();
  } finally {
    clearTimeout(timer);
  }
  return out;
}

test('Out-of-order streaming: fragment errors after shell flush', async (t) => {
  await t.test('a rejected bare promise does not hang the stream and resolves its slot', async () => {
    const boom = Promise.reject(new Error('db exploded'));
    // Attach a catch so Node does not print an unhandled rejection for the test input.
    boom.catch(() => {});

    const stream = renderToStream(vec`<main>${boom}</main>`, 'n0');
    const html = await collect(stream);

    assert.ok(html.includes('<i-slot id="i-slot-1">'), 'shell still flushes with the skeleton slot');
    assert.ok(html.includes('data-i-fill="1" data-i-error="1"'), 'slot 1 receives an error patch');
    assert.ok(html.includes('inert:fragment:error'), 'patcher signals the client');
  });

  await t.test('one failing fragment does not block a healthy sibling', async () => {
    const bad = Promise.reject(new Error('nope'));
    bad.catch(() => {});
    const good = Promise.resolve(raw('<p>loaded</p>'));

    const stream = renderToStream(vec`<div>${bad}</div><div>${good}</div>`, 'n1');
    const html = await collect(stream);

    assert.ok(html.includes('data-i-fill="1" data-i-error="1"'), 'slot 1 errored');
    assert.match(html, /data-i-fill="2"(?!.*data-i-error)/, 'slot 2 filled normally');
    assert.ok(html.includes('<p>loaded</p>'), 'healthy fragment content is present');
  });

  await t.test('defer() renders the fallback skeleton into the shell', async () => {
    const slow = defer(new Promise(() => {}), { fallback: raw('<span class="skeleton"></span>') });
    // never resolves -> read only the first chunk (the shell)
    const reader = renderToStream(vec`<main>${slow}</main>`, 'n2').getReader();
    const { value } = await reader.read();
    await reader.cancel();
    const shell = decoder.decode(value);

    assert.ok(shell.includes('<i-slot id="i-slot-1"><span class="skeleton"></span></i-slot>'));
  });

  await t.test('defer().error is patched in when the source rejects', async () => {
    const frag = defer(() => Promise.reject(new Error('timeout')), {
      fallback: raw('<span>loading…</span>'),
      error: (err) => vec`<p class="err">${err.message}</p>`
    });

    const stream = renderToStream(vec`<main>${frag}</main>`, 'n3');
    const html = await collect(stream);

    assert.ok(html.includes('data-i-error="1"'), 'error patch emitted');
    assert.ok(html.includes('<p class="err">timeout</p>'), 'error boundary content rendered and escaped via vec');
  });

  await t.test('a throwing lazy factory is routed to the error boundary', async () => {
    const frag = defer(() => { throw new Error('sync throw'); }, {
      error: raw('<p>failed</p>')
    });

    const html = await collect(renderToStream(vec`<main>${frag}</main>`, 'n4'));
    assert.ok(html.includes('data-i-error="1"'));
    assert.ok(html.includes('<p>failed</p>'));
  });

  await t.test('onError hook is invoked with the slot id', async () => {
    const seen = [];
    const bad = Promise.reject(new Error('kaboom'));
    bad.catch(() => {});

    const stream = renderToStream(vec`<main>${bad}</main>`, 'n5', {
      onError: (err, info) => seen.push([err.message, info.slot])
    });
    await collect(stream);

    assert.deepStrictEqual(seen, [['kaboom', 1]]);
  });

  await t.test('resolveToString buffers a deferred fragment and its error boundary', async () => {
    const ok = defer(Promise.resolve(raw('<b>hi</b>')));
    assert.strictEqual(await resolveToString(vec`<p>${ok}</p>`), '<p><b>hi</b></p>');

    const failed = defer(() => Promise.reject(new Error('x')), { error: raw('<i>oops</i>') });
    assert.strictEqual(await resolveToString(vec`<p>${failed}</p>`), '<p><i>oops</i></p>');
  });
});
