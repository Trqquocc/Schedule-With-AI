/**
 * Unit tests for shift-matcher (Phase 05 of salary feature).
 * Run: node --test backend/tests/shift-matcher.test.js
 */
const { test } = require("node:test");
const assert = require("node:assert");
const { matchShift, toLocalMinutes, parseHM } = require("../lib/shift-matcher");

const shifts = [
  { name: "Ca 1", start: "07:00", end: "11:00" },
  { name: "Ca 2", start: "13:00", end: "17:00" },
  { name: "Ca đêm", start: "22:00", end: "06:00" },
];

test("parseHM returns minutes from midnight; rejects bad input", () => {
  assert.strictEqual(parseHM("07:00"), 420);
  assert.strictEqual(parseHM("23:59"), 23 * 60 + 59);
  assert.strictEqual(parseHM("7:5"), null);
  assert.strictEqual(parseHM(""), null);
  assert.strictEqual(parseHM(null), null);
});

test("toLocalMinutes converts UTC -> Asia/Bangkok minutes", () => {
  // 2026-04-20T00:00:00Z = 07:00 BKK = 420 min
  assert.strictEqual(toLocalMinutes("2026-04-20T00:00:00Z"), 420);
  // Midnight BKK = 17:00Z prev day: 2026-04-19T17:00:00Z
  assert.strictEqual(toLocalMinutes("2026-04-19T17:00:00Z"), 0);
});

test("matchShift: exact shift window", () => {
  assert.strictEqual(matchShift("2026-04-20T00:15:00Z", shifts), "Ca 1"); // 07:15 BKK
  assert.strictEqual(matchShift("2026-04-20T06:30:00Z", shifts), "Ca 2"); // 13:30 BKK
});

test("matchShift: overnight shift (22:00 - 06:00)", () => {
  assert.strictEqual(matchShift("2026-04-20T16:00:00Z", shifts), "Ca đêm"); // 23:00 BKK
  assert.strictEqual(matchShift("2026-04-20T22:30:00Z", shifts), "Ca đêm"); // 05:30 BKK next day
});

test("matchShift: ±30min grace", () => {
  // 06:45 BKK — 15 min before Ca 1 start → within grace → match
  assert.strictEqual(matchShift("2026-04-19T23:45:00Z", shifts), "Ca 1");
  // 11:20 BKK — 20 min after Ca 1 end → within grace → match
  assert.strictEqual(matchShift("2026-04-20T04:20:00Z", shifts), "Ca 1");
});

test("matchShift: gap between shifts returns null", () => {
  assert.strictEqual(matchShift("2026-04-20T05:00:00Z", shifts), null); // 12:00 BKK
});

test("matchShift: invalid / empty inputs", () => {
  assert.strictEqual(matchShift("2026-04-20T00:00:00Z", []), null);
  assert.strictEqual(matchShift("2026-04-20T00:00:00Z", null), null);
  assert.strictEqual(matchShift("bad-iso", shifts), null);
});

test("matchShift: skips shifts with invalid time strings", () => {
  const bad = [
    { name: "OK", start: "07:00", end: "11:00" },
    { name: "Bad", start: "xx:xx", end: "11:00" },
  ];
  assert.strictEqual(matchShift("2026-04-20T00:15:00Z", bad), "OK");
});
