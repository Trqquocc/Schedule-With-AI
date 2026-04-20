/**
 * Unit tests for schedule image prompt builder (Phase 03).
 * Run: node --test backend/tests/schedule-image-prompt.test.js
 */
const { test } = require("node:test");
const assert = require("node:assert");
const {
  buildScheduleImagePrompt,
  TIET_TIMING,
} = require("../utils/schedule-image-prompt");

const windowStart = "2026-04-20T00:00:00+07:00";
const windowEnd = "2026-04-27T00:00:00+07:00";

test("study prompt for THCS includes tiết=45 and 15-phút long break", () => {
  const p = buildScheduleImagePrompt({
    type: "study",
    level: "thcs",
    windowStart,
    windowEnd,
  });
  assert.ok(p.includes("45 phút"));
  assert.ok(p.includes("15 phút"));
  assert.ok(p.includes("Cấp 2"));
  assert.ok(p.includes("courseCode"));
});

test("study prompt for THPT uses 20-phút long break", () => {
  const p = buildScheduleImagePrompt({
    type: "study",
    level: "thpt",
    windowStart,
    windowEnd,
  });
  assert.ok(p.includes("20 phút"));
  assert.ok(p.includes("Cấp 3"));
});

test("study prompt for đại học emphasizes reading directly", () => {
  const p = buildScheduleImagePrompt({
    type: "study",
    level: "dai_hoc",
    windowStart,
    windowEnd,
  });
  assert.ok(p.includes("Đại học"));
  assert.ok(p.toLowerCase().includes("đọc giờ"));
  assert.ok(p.includes("courseCode"));
});

test("work prompt asks for assignees and does NOT leak user name", () => {
  const p = buildScheduleImagePrompt({
    type: "work",
    windowStart,
    windowEnd,
  });
  assert.ok(p.includes("assignees"));
  assert.ok(p.includes("ca làm"));
  // Ensure the prompt never embeds a user-specific name (filtering is backend-side)
  assert.ok(!p.includes("HoTen"));
});

test("prompt always embeds window bounds", () => {
  const p = buildScheduleImagePrompt({
    type: "study",
    level: "dai_hoc",
    windowStart,
    windowEnd,
  });
  assert.ok(p.includes(windowStart));
  assert.ok(p.includes(windowEnd));
});

test("TIET_TIMING covers all 5 learning levels", () => {
  for (const level of ["thcs", "thpt", "dai_hoc", "di_lam", "khac"]) {
    assert.ok(TIET_TIMING[level], `missing level: ${level}`);
    assert.ok(TIET_TIMING[level].label);
  }
});

test("missing level defaults to dai_hoc study variant", () => {
  const p = buildScheduleImagePrompt({
    type: "study",
    windowStart,
    windowEnd,
  });
  assert.ok(p.includes("Đại học"));
});
