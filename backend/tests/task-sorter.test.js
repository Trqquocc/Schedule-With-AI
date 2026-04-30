const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sorterSrc = fs.readFileSync(
  path.join(__dirname, "..", "..", "frontend", "assets", "js", "modules", "work", "task-sorter.js"),
  "utf8"
);

function loadSorter() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(sorterSrc, context);
  return context.window.TaskSorter;
}

test("sort by priority desc puts highest (4) first", () => {
  const TaskSorter = loadSorter();
  const items = [
    { TieuDe: "a", MucDoUuTien: 1 },
    { TieuDe: "b", MucDoUuTien: 4 },
    { TieuDe: "c", MucDoUuTien: 2 },
  ];
  const out = TaskSorter.sortTasks(items, "priority", "desc", "cv");
  assert.deepStrictEqual(out.map((x) => x.TieuDe), ["b", "c", "a"]);
});

test("sort by duration asc puts shortest first", () => {
  const TaskSorter = loadSorter();
  const items = [
    { TieuDe: "a", ThoiGianUocTinh: 120 },
    { TieuDe: "b", ThoiGianUocTinh: 30 },
    { TieuDe: "c", ThoiGianUocTinh: 60 },
  ];
  const out = TaskSorter.sortTasks(items, "duration", "asc", "cv");
  assert.deepStrictEqual(out.map((x) => x.TieuDe), ["b", "c", "a"]);
});

test("sort by category asc uses Vietnamese collation", () => {
  const TaskSorter = loadSorter();
  const items = [
    { TieuDe: "a", TenLoai: "Zeta" },
    { TieuDe: "b", TenLoai: "Alpha" },
    { TieuDe: "c", TenLoai: "Beta" },
  ];
  const out = TaskSorter.sortTasks(items, "category", "asc", "cv");
  assert.deepStrictEqual(out.map((x) => x.TieuDe), ["b", "c", "a"]);
});

test("null fields pushed to end regardless of direction", () => {
  const TaskSorter = loadSorter();
  const items = [
    { TieuDe: "a", MucDoUuTien: null },
    { TieuDe: "b", MucDoUuTien: 3 },
    { TieuDe: "c", MucDoUuTien: 1 },
  ];
  const desc = TaskSorter.sortTasks(items, "priority", "desc", "cv");
  assert.deepStrictEqual(desc.map((x) => x.TieuDe), ["b", "c", "a"]);
  const asc = TaskSorter.sortTasks(items, "priority", "asc", "cv");
  assert.deepStrictEqual(asc.map((x) => x.TieuDe), ["c", "b", "a"]);
});

test("no criterion returns input order unchanged", () => {
  const TaskSorter = loadSorter();
  const items = [
    { TieuDe: "c", MucDoUuTien: 1 },
    { TieuDe: "a", MucDoUuTien: 4 },
    { TieuDe: "b", MucDoUuTien: 2 },
  ];
  const out = TaskSorter.sortTasks(items, null, "asc", "cv");
  assert.deepStrictEqual(out.map((x) => x.TieuDe), ["c", "a", "b"]);
});

test("sort is stable — ties preserve original order", () => {
  const TaskSorter = loadSorter();
  const items = [
    { TieuDe: "a", MucDoUuTien: 2 },
    { TieuDe: "b", MucDoUuTien: 2 },
    { TieuDe: "c", MucDoUuTien: 2 },
  ];
  const out = TaskSorter.sortTasks(items, "priority", "desc", "cv");
  assert.deepStrictEqual(out.map((x) => x.TieuDe), ["a", "b", "c"]);
});

test("AI shape sorts by priority and estimatedMinutes", () => {
  const TaskSorter = loadSorter();
  const items = [
    { id: 1, priority: 1, estimatedMinutes: 90 },
    { id: 2, priority: 4, estimatedMinutes: 30 },
    { id: 3, priority: 2, estimatedMinutes: 60 },
  ];
  const byPrio = TaskSorter.sortTasks(items, "priority", "desc", "ai");
  assert.deepStrictEqual(byPrio.map((x) => x.id), [2, 3, 1]);
  const byDur = TaskSorter.sortTasks(items, "duration", "asc", "ai");
  assert.deepStrictEqual(byDur.map((x) => x.id), [2, 3, 1]);
});

test("original array not mutated", () => {
  const TaskSorter = loadSorter();
  const items = [
    { TieuDe: "c", MucDoUuTien: 1 },
    { TieuDe: "a", MucDoUuTien: 4 },
  ];
  TaskSorter.sortTasks(items, "priority", "desc", "cv");
  assert.strictEqual(items[0].TieuDe, "c");
  assert.strictEqual(items[1].TieuDe, "a");
});

test("non-array input returns empty array", () => {
  const TaskSorter = loadSorter();
  assert.strictEqual(TaskSorter.sortTasks(null, "priority", "desc", "cv").length, 0);
  assert.strictEqual(TaskSorter.sortTasks(undefined, "priority", "desc", "cv").length, 0);
});
