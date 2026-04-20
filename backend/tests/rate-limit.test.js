/**
 * Unit tests for rate limiter (Phase 02).
 * Run: node --test backend/tests/rate-limit.test.js
 */
const { test } = require("node:test");
const assert = require("node:assert");
const { checkRateLimit } = require("../utils/rate-limit");

test("allows up to max calls within the window", () => {
  const userId = `u-${Date.now()}-a`;
  for (let i = 0; i < 10; i++) {
    const r = checkRateLimit(userId, 10);
    assert.strictEqual(r.allowed, true, `call ${i + 1} should be allowed`);
  }
});

test("rejects the 11th call when max=10", () => {
  const userId = `u-${Date.now()}-b`;
  for (let i = 0; i < 10; i++) checkRateLimit(userId, 10);
  const r = checkRateLimit(userId, 10);
  assert.strictEqual(r.allowed, false);
  assert.strictEqual(r.remaining, 0);
  assert.ok(r.resetInMs > 0);
});

test("different users tracked independently", () => {
  const uA = `u-${Date.now()}-c`;
  const uB = `u-${Date.now()}-d`;
  for (let i = 0; i < 10; i++) checkRateLimit(uA, 10);
  assert.strictEqual(checkRateLimit(uA, 10).allowed, false);
  assert.strictEqual(checkRateLimit(uB, 10).allowed, true);
});

test("remaining counter decreases correctly", () => {
  const u = `u-${Date.now()}-e`;
  assert.strictEqual(checkRateLimit(u, 3).remaining, 2);
  assert.strictEqual(checkRateLimit(u, 3).remaining, 1);
  assert.strictEqual(checkRateLimit(u, 3).remaining, 0);
  assert.strictEqual(checkRateLimit(u, 3).allowed, false);
});
