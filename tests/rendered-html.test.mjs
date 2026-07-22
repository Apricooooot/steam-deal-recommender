import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the CN deal product page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Steam å²ä½Žï½œä¸­å›½åŒºå½“å‰æœ‰æ•ˆ Deal<\/title>/);
  assert.match(html, /åªçœ‹çœŸæ­£çš„å²ä½Ž/);
  assert.match(html, /ä¸­å›½åŒº/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});
