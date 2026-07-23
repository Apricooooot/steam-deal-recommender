import assert from "node:assert/strict";
import test from "node:test";

async function request(path = "/", accept = "text/html") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the multi-region deal product page", async () => {
  const response = await request();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Steam Deal Recommender \| Multi-region historical lows<\/title>/);
  assert.match(html, /Steam Deal Recommender/);
  assert.match(html, /Region/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("serves US English demo deals when requested", async () => {
  const response = await request("/api/deals?region=US&locale=en_US", "application/json");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.region, "US");
  assert.equal(payload.locale, "en_US");
  assert.equal(payload.currency, "USD");
  assert.equal(payload.source, "demo");
  assert.ok(payload.deals.length > 0);
  assert.equal(payload.deals[0].currency, "USD");
});

test("keeps the CN query alias compatible", async () => {
  const response = await request("/api/deals?country=CN&locale=zh_CN", "application/json");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.region, "CN");
  assert.equal(payload.locale, "zh_CN");
  assert.equal(payload.currency, "CNY");
});
