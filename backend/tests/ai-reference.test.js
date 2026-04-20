const test = require("node:test");
const assert = require("node:assert");

const { __test } = require("../routes/ai-reference");
const { isValidDateStr, dayBounds, extractJson, filterNonOverlapping } = __test;

test("isValidDateStr accepts YYYY-MM-DD", () => {
  assert.strictEqual(isValidDateStr("2026-04-20"), true);
  assert.strictEqual(isValidDateStr("2026-12-31"), true);
});

test("isValidDateStr rejects other formats / types", () => {
  assert.strictEqual(isValidDateStr("2026/04/20"), false);
  assert.strictEqual(isValidDateStr("2026-4-20"), false);
  assert.strictEqual(isValidDateStr(""), false);
  assert.strictEqual(isValidDateStr(null), false);
  assert.strictEqual(isValidDateStr(20260420), false);
});

test("dayBounds returns ISO window for +07:00 day", () => {
  const r = dayBounds("2026-04-20", "2026-04-20");
  assert.strictEqual(r.startIso, "2026-04-19T17:00:00.000Z");
  // end is 23:59:59 local → UTC 16:59:59 next day
  assert.strictEqual(r.endIso.startsWith("2026-04-20T16:59:59"), true);
});

test("dayBounds returns null on invalid or reversed dates", () => {
  assert.strictEqual(dayBounds("not-a-date", "2026-04-20"), null);
  assert.strictEqual(dayBounds("2026-04-20", "2026-04-10"), null);
});

test("extractJson handles fenced code blocks", () => {
  const text = '```json\n{"proposals":[]}\n```';
  const out = extractJson(text);
  assert.ok(out);
  assert.deepStrictEqual(out.proposals, []);
});

test("extractJson handles bare JSON", () => {
  const text = 'blah blah {"proposals":[{"taskId":1}]} trailing';
  const out = extractJson(text);
  assert.strictEqual(out.proposals[0].taskId, 1);
});

test("extractJson returns null on malformed", () => {
  assert.strictEqual(extractJson("no json here"), null);
  assert.strictEqual(extractJson(""), null);
  assert.strictEqual(extractJson(null), null);
});

test("filterNonOverlapping drops proposals overlapping busy slots", () => {
  const busy = [
    { GioBatDau: "2026-04-20T02:00:00.000Z", GioKetThuc: "2026-04-20T03:00:00.000Z" },
  ];
  const proposals = [
    { taskId: 1, title: "a", start: "2026-04-20T02:30:00.000Z", end: "2026-04-20T03:30:00.000Z" },
    { taskId: 2, title: "b", start: "2026-04-20T04:00:00.000Z", end: "2026-04-20T05:00:00.000Z" },
  ];
  const { kept, skipped } = filterNonOverlapping(proposals, busy);
  assert.strictEqual(kept.length, 1);
  assert.strictEqual(kept[0].taskId, 2);
  assert.strictEqual(skipped.length, 1);
  assert.strictEqual(skipped[0].taskId, 1);
  assert.match(skipped[0].reason, /busy/);
});

test("filterNonOverlapping drops sibling overlaps", () => {
  const proposals = [
    { taskId: 1, title: "a", start: "2026-04-20T10:00:00.000Z", end: "2026-04-20T11:00:00.000Z" },
    { taskId: 2, title: "b", start: "2026-04-20T10:30:00.000Z", end: "2026-04-20T11:30:00.000Z" },
  ];
  const { kept, skipped } = filterNonOverlapping(proposals, []);
  assert.strictEqual(kept.length, 1);
  assert.strictEqual(kept[0].taskId, 1);
  assert.strictEqual(skipped[0].taskId, 2);
  assert.match(skipped[0].reason, /sibling/);
});

test("filterNonOverlapping rejects invalid intervals", () => {
  const proposals = [
    { taskId: 1, title: "a", start: "bad", end: "bad" },
    { taskId: 2, title: "b", start: "2026-04-20T10:00:00.000Z", end: "2026-04-20T09:00:00.000Z" },
    { taskId: 3, title: "c", start: "2026-04-20T12:00:00.000Z", end: "2026-04-20T13:00:00.000Z" },
  ];
  const { kept, skipped } = filterNonOverlapping(proposals, []);
  assert.strictEqual(kept.length, 1);
  assert.strictEqual(kept[0].taskId, 3);
  assert.strictEqual(skipped.length, 2);
});
