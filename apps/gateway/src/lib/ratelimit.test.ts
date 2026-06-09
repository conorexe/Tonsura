import { test } from "node:test";
import assert from "node:assert/strict";
import { FixedWindowLimiter, DailyCounter } from "./ratelimit";
import { TTLCache } from "./cache";

// --- FixedWindowLimiter ------------------------------------------------------
test("limiter: allows up to the limit within one window, then blocks", () => {
  let t = 0;
  const lim = new FixedWindowLimiter(60_000, () => t);
  assert.deepEqual(lim.hit("k", 3), { ok: true, remaining: 2 });
  assert.deepEqual(lim.hit("k", 3), { ok: true, remaining: 1 });
  assert.deepEqual(lim.hit("k", 3), { ok: true, remaining: 0 });
  assert.equal(lim.hit("k", 3).ok, false);
});

test("limiter: window expiry resets the count", () => {
  let t = 0;
  const lim = new FixedWindowLimiter(60_000, () => t);
  lim.hit("k", 1);
  assert.equal(lim.hit("k", 1).ok, false);
  t = 60_000; // next window
  assert.equal(lim.hit("k", 1).ok, true);
});

test("limiter: keys are independent", () => {
  let t = 0;
  const lim = new FixedWindowLimiter(60_000, () => t);
  lim.hit("a", 1);
  assert.equal(lim.hit("a", 1).ok, false);
  assert.equal(lim.hit("b", 1).ok, true);
});

test("limiter: zero limit blocks immediately", () => {
  const lim = new FixedWindowLimiter(60_000, () => 0);
  assert.equal(lim.hit("k", 0).ok, false);
});

// --- DailyCounter -------------------------------------------------------------
test("dailyCounter: accumulates within a day and resets on rollover", () => {
  let day = "2026-06-06";
  const c = new DailyCounter(() => day);
  assert.equal(c.add("k", 100), 100);
  assert.equal(c.add("k", 50), 150);
  assert.equal(c.get("k"), 150);
  day = "2026-06-07"; // midnight rollover
  assert.equal(c.get("k"), 0);
  assert.equal(c.add("k", 10), 10);
});

// --- TTLCache -------------------------------------------------------------
test("ttlCache: returns value before expiry, undefined after", () => {
  let t = 0;
  const cache = new TTLCache<string>(60_000, 10, () => t);
  cache.set("k", "v");
  assert.equal(cache.get("k"), "v");
  t = 59_999;
  assert.equal(cache.get("k"), "v");
  t = 60_000;
  assert.equal(cache.get("k"), undefined);
});

test("ttlCache: delete removes immediately (revocation path)", () => {
  const cache = new TTLCache<string>(60_000, 10, () => 0);
  cache.set("k", "v");
  cache.delete("k");
  assert.equal(cache.get("k"), undefined);
});

test("ttlCache: bounded — prune keeps size under the cap", () => {
  let t = 0;
  const cache = new TTLCache<number>(60_000, 10, () => t);
  for (let i = 0; i < 25; i++) cache.set(`k${i}`, i);
  assert.ok(cache.size <= 11, `size ${cache.size} should stay bounded`);
});
