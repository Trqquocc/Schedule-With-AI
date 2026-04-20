/**
 * Unit tests for Vietnamese name matcher (Phase 04).
 * Run: node --test backend/tests/name-matcher.test.js
 */
const { test } = require("node:test");
const assert = require("node:assert");
const {
  isSamePerson,
  matchUserNameInItems,
  normalize,
  tokens,
} = require("../utils/name-matcher");

test("normalize strips diacritics and lowercases", () => {
  assert.strictEqual(normalize("Trần Quang Quốc"), "tran quang quoc");
  assert.strictEqual(normalize("Đặng Thị Mai"), "dang thi mai");
  assert.strictEqual(normalize("  Multi   Space "), "multi space");
  assert.strictEqual(normalize(""), "");
  assert.strictEqual(normalize(null), "");
});

test("tokens split on whitespace after normalize", () => {
  assert.deepStrictEqual(tokens("Trần Quang Quốc"), ["tran", "quang", "quoc"]);
  assert.deepStrictEqual(tokens(""), []);
});

test("isSamePerson: exact full-name match", () => {
  assert.ok(isSamePerson("Trần Quang Quốc", "Trần Quang Quốc"));
  assert.ok(isSamePerson("TRAN QUANG QUOC", "Trần Quang Quốc")); // accent-insensitive
});

test("isSamePerson: suffix (partial) match", () => {
  assert.ok(isSamePerson("Trần Quang Quốc", "Quang Quốc"));
  assert.ok(isSamePerson("Nguyễn Thị Thu Hà", "Thu Hà"));
});

test("isSamePerson: single given-name matches last token only", () => {
  assert.ok(isSamePerson("Trần Quang Quốc", "Quốc"));
  assert.ok(isSamePerson("Đặng Thị Mai", "Mai"));
});

test("isSamePerson: ambiguity guard — given-name not at end is NOT a match", () => {
  assert.strictEqual(isSamePerson("Quốc Anh", "Quốc"), false);
  assert.strictEqual(isSamePerson("Mai Lan", "Mai"), false);
});

test("isSamePerson: unrelated names never match", () => {
  assert.strictEqual(isSamePerson("Nguyễn Văn A", "Quốc"), false);
  assert.strictEqual(isSamePerson("Lê Bảo Ngọc", "Trần Quang Quốc"), false);
});

test("isSamePerson: empty inputs return false", () => {
  assert.strictEqual(isSamePerson("", "Quốc"), false);
  assert.strictEqual(isSamePerson("Quốc", ""), false);
  assert.strictEqual(isSamePerson(null, null), false);
});

test("matchUserNameInItems: filters items by assignees", () => {
  const items = [
    { title: "A", assignees: ["Trần Quang Quốc", "Nguyễn Văn A"] },
    { title: "B", assignees: ["Quốc Anh"] },
    { title: "C", assignees: ["Lê Bảo Quốc"] },
    { title: "D", assignees: [] },
  ];
  const r = matchUserNameInItems(items, "Quốc");
  assert.deepStrictEqual(
    r.matched.map((i) => i.title),
    ["A", "C"]
  );
  assert.ok(r.unmatchedAssignees.includes("Quốc Anh"));
});

test("matchUserNameInItems: full-name disambiguates shared given-name", () => {
  const items = [
    { title: "A", assignees: ["Trần Quang Quốc"] },
    { title: "B", assignees: ["Lê Bảo Quốc"] },
  ];
  const r = matchUserNameInItems(items, "Trần Quang Quốc");
  assert.deepStrictEqual(
    r.matched.map((i) => i.title),
    ["A"]
  );
});

test("matchUserNameInItems: empty/bad input returns empty matched", () => {
  assert.deepStrictEqual(matchUserNameInItems([], "Quốc").matched, []);
  assert.deepStrictEqual(matchUserNameInItems(null, "Quốc").matched, []);
  assert.deepStrictEqual(matchUserNameInItems([{ assignees: ["x"] }], "").matched, []);
});
