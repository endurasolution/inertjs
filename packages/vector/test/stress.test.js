import test from 'node:test';
import assert from 'node:assert';
import { vec } from '../src/index.js';
import { renderToStream } from '../src/stream.js';
import { Readable } from 'node:stream';

test('Vector Stress Test (100,000 DOM nodes)', async (t) => {
  // Generate 10,000 items, each item will have 10 nodes, totaling 100,000 nodes.
  const data = Array.from({ length: 10000 }).map((_, i) => ({
    id: i,
    name: `Item ${i}`,
    desc: `Description for ${i}`
  }));

  function itemTemplate(item) {
    return vec`
      <div id="item-${item.id}" class="item-container">
        <h2>${item.name}</h2>
        <p>${item.desc}</p>
        <span>Extra node 1</span>
        <span>Extra node 2</span>
        <ul>
          <li>Child 1</li>
          <li>Child 2</li>
          <li>Child 3</li>
        </ul>
      </div>
    `;
  }

  function rootTemplate(items) {
    return vec`
      <main>
        <h1>100k Node Stress Test</h1>
        <div class="list">
          ${items.map(itemTemplate)}
        </div>
      </main>
    `;
  }

  const start = performance.now();
  
  const webStream = renderToStream(rootTemplate(data));
  const nodeStream = Readable.fromWeb(webStream);
  
  let chunkCount = 0;
  let totalBytes = 0;

  for await (const chunk of nodeStream) {
    chunkCount++;
    totalBytes += chunk.length;
  }

  const end = performance.now();
  const timeMs = end - start;
  
  console.log(`Rendered ${totalBytes} bytes in ${chunkCount} chunks. Time: ${timeMs.toFixed(2)}ms`);

  assert.ok(totalBytes > 1000000, `Expected > 1MB of HTML, got ${totalBytes} bytes`);
  assert.ok(timeMs < 2000, `Expected render under 2s, took ${timeMs}ms`);
});
