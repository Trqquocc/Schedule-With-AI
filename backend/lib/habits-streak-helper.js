/**
 * habits-streak-helper.js
 * Calculates the current streak for a habit by counting consecutive
 * completed days backwards from today. If today is not completed,
 * streak is 0 — no fallback to nearest historical streak.
 */
const { supabase } = require("../config/database");

function _localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * @param {number} habitId
 * @returns {Promise<number>} streak count (0 if today not completed)
 */
async function recalculateStreak(habitId) {
  const now = new Date();
  const todayStr = _localDateStr(now);

  const { data: logs, error } = await supabase
    .from("NhatKyThoiQuen")
    .select("NgayHoanThanh")
    .eq("MaThoiQuen", habitId)
    .eq("DaHoanThanh", true)
    .order("NgayHoanThanh", { ascending: false })
    .limit(366);

  if (error || !logs || logs.length === 0) return 0;

  const logSet = new Set(logs.map((l) => l.NgayHoanThanh));

  if (!logSet.has(todayStr)) return 0;

  let streak = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  while (logSet.has(_localDateStr(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

module.exports = { recalculateStreak };
