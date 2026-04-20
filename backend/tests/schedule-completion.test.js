const test = require("node:test");
const assert = require("node:assert");

// The route file exports helpers under .__test for unit testing.
const { __test } = require("../routes/schedule-completion");
const { dayRangeUtc, isValidDateStr } = __test;

test("isValidDateStr accepts YYYY-MM-DD", () => {
  assert.strictEqual(isValidDateStr("2026-04-20"), true);
  assert.strictEqual(isValidDateStr("2026-12-31"), true);
});

test("isValidDateStr rejects other formats", () => {
  assert.strictEqual(isValidDateStr("2026/04/20"), false);
  assert.strictEqual(isValidDateStr("20-04-2026"), false);
  assert.strictEqual(isValidDateStr("2026-4-20"), false);
  assert.strictEqual(isValidDateStr(""), false);
  assert.strictEqual(isValidDateStr(null), false);
  assert.strictEqual(isValidDateStr(undefined), false);
  assert.strictEqual(isValidDateStr(20260420), false);
});

test("dayRangeUtc converts local date to UTC day window (+07:00)", () => {
  const [start, end] = dayRangeUtc("2026-04-20");
  // 2026-04-20 00:00:00+07:00 == 2026-04-19 17:00:00 UTC
  assert.strictEqual(start, "2026-04-19T17:00:00.000Z");
  // next day 00:00 +07:00 == 2026-04-20 17:00:00 UTC
  assert.strictEqual(end, "2026-04-20T17:00:00.000Z");
});

test("dayRangeUtc window is exactly 24h", () => {
  const [start, end] = dayRangeUtc("2026-01-01");
  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  assert.strictEqual(diffMs, 24 * 60 * 60 * 1000);
});

test("dayRangeUtc rejects invalid date", () => {
  assert.strictEqual(dayRangeUtc("not-a-date"), null);
});

test("dayRangeUtc handles month boundary", () => {
  const [start, end] = dayRangeUtc("2026-02-28");
  assert.strictEqual(start, "2026-02-27T17:00:00.000Z");
  assert.strictEqual(end, "2026-02-28T17:00:00.000Z");
});
