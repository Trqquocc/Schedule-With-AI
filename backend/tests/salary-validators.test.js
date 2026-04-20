/**
 * Unit tests for salary-validators pure helpers (Phase 03).
 * Does NOT cover findOverlappingFullTime / findFullTimeCategory
 * (those hit Supabase; tested via manual E2E).
 * Run: node --test backend/tests/salary-validators.test.js
 */
const { test } = require("node:test");
const assert = require("node:assert");
const {
  validateSalaryFields,
  normalizeCategoryName,
} = require("../lib/salary-validators");

test("defaults to 'none' when LoaiLuong missing or invalid", () => {
  assert.strictEqual(validateSalaryFields({}).sanitized.LoaiLuong, "none");
  assert.strictEqual(
    validateSalaryFields({ LoaiLuong: "bogus" }).sanitized.LoaiLuong,
    "none"
  );
});

test("full_time requires positive LuongThang", () => {
  const bad = validateSalaryFields({ LoaiLuong: "full_time", LuongThang: 0 });
  assert.strictEqual(bad.ok, false);
  assert.ok(bad.errors.some((e) => e.includes("Lương tháng")));

  const good = validateSalaryFields({
    LoaiLuong: "full_time",
    LuongThang: 12000000,
  });
  assert.strictEqual(good.ok, true);
  assert.strictEqual(good.sanitized.LuongThang, 12000000);
  assert.strictEqual(good.sanitized.CauHinhCa, null);
});

test("full_time: contract end before start fails", () => {
  const r = validateSalaryFields({
    LoaiLuong: "full_time",
    LuongThang: 1_000_000,
    NgayBatDauHopDong: "2026-05-01",
    NgayKetThucHopDong: "2026-04-01",
  });
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("kết thúc")));
});

test("full_time coerces WorkingDays to sorted unique ints in 1..7", () => {
  const r = validateSalaryFields({
    LoaiLuong: "full_time",
    LuongThang: 1_000_000,
    NgayLamViec: [5, 1, "2", 9, 1, 3.5],
  });
  assert.deepStrictEqual(r.sanitized.NgayLamViec, [1, 2, 5]);
});

test("part_time parses shifts; drops invalid entries", () => {
  const r = validateSalaryFields({
    LoaiLuong: "part_time",
    CauHinhCa: [
      { name: "Ca 1", start: "07:00", end: "11:00" },
      { name: "", start: "13:00", end: "17:00" }, // no name → skipped
      { name: "Bad", start: "invalid", end: "17:00" }, // invalid time → skipped
    ],
  });
  assert.strictEqual(r.sanitized.CauHinhCa.length, 1);
  assert.strictEqual(r.sanitized.CauHinhCa[0].name, "Ca 1");
  assert.ok(r.errors.length >= 2);
});

test("part_time clears LuongThang + contract dates", () => {
  const r = validateSalaryFields({
    LoaiLuong: "part_time",
    LuongThang: 99999,
    CauHinhCa: [{ name: "Ca 1", start: "07:00", end: "11:00" }],
    NgayBatDauHopDong: "2026-04-01",
  });
  assert.strictEqual(r.sanitized.LuongThang, null);
  assert.strictEqual(r.sanitized.NgayBatDauHopDong, null);
});

test("none branch clears everything", () => {
  const r = validateSalaryFields({
    LoaiLuong: "none",
    LuongThang: 12000000,
    CauHinhCa: [{ name: "Ca 1", start: "07:00", end: "11:00" }],
  });
  assert.strictEqual(r.sanitized.LuongThang, null);
  assert.strictEqual(r.sanitized.CauHinhCa, null);
  assert.strictEqual(r.sanitized.NgayLamViec, null);
});

test("normalizeCategoryName: strips diacritics + non-alnum, lowercases", () => {
  assert.strictEqual(normalizeCategoryName("Full-time work"), "fulltimework");
  assert.strictEqual(normalizeCategoryName("  Full  Time  Work  "), "fulltimework");
  assert.strictEqual(
    normalizeCategoryName("Công việc Full time"),
    "congviecfulltime"
  );
  assert.strictEqual(normalizeCategoryName(""), "");
  assert.strictEqual(normalizeCategoryName(null), "");
});
