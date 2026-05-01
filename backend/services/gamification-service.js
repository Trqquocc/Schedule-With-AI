// gamification-service.js — XP, level, streak, badge logic for UserGamification table
const { supabase } = require("../config/database");

const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 3800,
  4700, 5700, 6800, 8000, 9500, 11000, 13000, 15000, 17500, 20000,
];

const BADGES = [
  { id: "first_task", name: "Khởi đầu", desc: "Hoàn thành task đầu tiên", icon: "fa-star" },
  { id: "tasks_10", name: "Chiến binh", desc: "Hoàn thành 10 task", icon: "fa-shield-alt" },
  { id: "tasks_50", name: "Chuyên gia", desc: "Hoàn thành 50 task", icon: "fa-award" },
  { id: "tasks_100", name: "100 task", desc: "Hoàn thành 100 task", icon: "fa-trophy" },
  { id: "tasks_500", name: "Huyền thoại", desc: "Hoàn thành 500 task", icon: "fa-crown" },
  { id: "streak_3", name: "3 ngày", desc: "Streak 3 ngày liên tiếp", icon: "fa-fire" },
  { id: "streak_7", name: "7 ngày", desc: "Streak 7 ngày liên tiếp", icon: "fa-fire-alt" },
  { id: "streak_14", name: "2 tuần", desc: "Streak 14 ngày", icon: "fa-bolt" },
  { id: "streak_30", name: "30 ngày", desc: "Streak 30 ngày liên tục", icon: "fa-meteor" },
  { id: "priority_king", name: "Ưu tiên cao", desc: "Hoàn thành 20 task ưu tiên 4", icon: "fa-chess-king" },
  { id: "early_bird", name: "Đầu ngày mới", desc: "5 task hoàn thành trước 8h", icon: "fa-sun" },
  { id: "level_5", name: "Cấp 5", desc: "Đạt cấp 5", icon: "fa-angle-double-up" },
  { id: "level_10", name: "Cấp 10", desc: "Đạt cấp 10", icon: "fa-gem" },
  { id: "level_15", name: "Cấp 15", desc: "Đạt cấp 15", icon: "fa-dragon" },
  { id: "level_20", name: "Tối đa", desc: "Đạt cấp 20", icon: "fa-infinity" },
];

function getLevelFromXP(xp) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

// Compute streak from LichTrinh: consecutive days (up to today) with ≥1 completed event
async function computeStreak(userId) {
  const { data: records, error } = await supabase
    .from("LichTrinh")
    .select("GioBatDau")
    .eq("UserID", userId)
    .eq("DaHoanThanh", true);

  if (error || !records) return 0;

  const daysWithActivity = new Set(
    records.map((r) => r.GioBatDau?.split("T")[0]).filter(Boolean)
  );

  let streak = 0;
  const todayStr = new Date().toISOString().split("T")[0];
  for (let i = 0; ; i++) {
    const expected = new Date(new Date(todayStr).getTime() - i * 86400000)
      .toISOString()
      .split("T")[0];
    if (daysWithActivity.has(expected)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

async function calculateXP(userId) {
  const { data: tasks, error: taskErr } = await supabase
    .from("CongViec")
    .select("MucDoUuTien")
    .eq("UserID", userId)
    .eq("TrangThaiThucHien", 2);

  if (taskErr) throw new Error("Failed to fetch tasks: " + taskErr.message);

  const completedTasks = tasks?.length || 0;
  const priority4Done = tasks?.filter((t) => t.MucDoUuTien === 4).length || 0;
  const priority3Done = tasks?.filter((t) => t.MucDoUuTien === 3).length || 0;

  // Early tasks: LichTrinh completed before 08:00 local hour
  const { data: scheduleRecords } = await supabase
    .from("LichTrinh")
    .select("GioBatDau")
    .eq("UserID", userId)
    .eq("DaHoanThanh", true);

  const earlyTasks = (scheduleRecords || []).filter((r) => {
    if (!r.GioBatDau) return false;
    const hour = new Date(r.GioBatDau).getHours();
    return hour < 8;
  }).length;

  let baseXP = completedTasks * 10 + priority4Done * 5 + priority3Done * 3;

  const streak = await computeStreak(userId);

  // Streak multiplier applied to recent-days XP portion
  if (streak >= 30) {
    // Compute XP earned in last 30 days separately and apply 2x to that portion
    const cutoff30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: recent30 } = await supabase
      .from("CongViec")
      .select("MucDoUuTien")
      .eq("UserID", userId)
      .eq("TrangThaiThucHien", 2)
      .gte("UpdatedAt", cutoff30);

    if (recent30 && recent30.length > 0) {
      const r30xp =
        recent30.length * 10 +
        recent30.filter((t) => t.MucDoUuTien === 4).length * 5 +
        recent30.filter((t) => t.MucDoUuTien === 3).length * 3;
      // Replace that portion with 2x version (add extra r30xp on top)
      baseXP += r30xp;
    }
  } else if (streak >= 7) {
    const cutoff7 = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: recent7 } = await supabase
      .from("CongViec")
      .select("MucDoUuTien")
      .eq("UserID", userId)
      .eq("TrangThaiThucHien", 2)
      .gte("UpdatedAt", cutoff7);

    if (recent7 && recent7.length > 0) {
      const r7xp =
        recent7.length * 10 +
        recent7.filter((t) => t.MucDoUuTien === 4).length * 5 +
        recent7.filter((t) => t.MucDoUuTien === 3).length * 3;
      baseXP += Math.floor(r7xp * 0.5); // 1.5x = base + 0.5 extra
    }
  }

  return { xp: baseXP, streak, completedTasks, priority4Done, priority3Done, earlyTasks };
}

async function getOrCreateProfile(userId) {
  const { data: existing, error } = await supabase
    .from("UserGamification")
    .select("*")
    .eq("UserID", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error("Failed to fetch gamification profile: " + error.message);
  }

  if (!existing) {
    return refreshProfile(userId);
  }

  const lastUpdate = new Date(existing.LastXPUpdate);
  const staleThresholdMs = 60 * 60 * 1000; // 1 hour
  if (Date.now() - lastUpdate.getTime() > staleThresholdMs) {
    return refreshProfile(userId);
  }

  return existing;
}

async function evaluateBadges(userId, stats) {
  const { data: row } = await supabase
    .from("UserGamification")
    .select("Badges")
    .eq("UserID", userId)
    .single();

  const currentBadges = row?.Badges || [];
  const earnedIds = new Set(currentBadges.map((b) => b.id));
  const level = getLevelFromXP(stats.xp);

  const conditions = {
    first_task: stats.completedTasks >= 1,
    tasks_10: stats.completedTasks >= 10,
    tasks_50: stats.completedTasks >= 50,
    tasks_100: stats.completedTasks >= 100,
    tasks_500: stats.completedTasks >= 500,
    streak_3: stats.streak >= 3,
    streak_7: stats.streak >= 7,
    streak_14: stats.streak >= 14,
    streak_30: stats.streak >= 30,
    priority_king: stats.priority4Done >= 20,
    early_bird: stats.earlyTasks >= 5,
    level_5: level >= 5,
    level_10: level >= 10,
    level_15: level >= 15,
    level_20: level >= 20,
  };

  const newBadges = [];
  const earnedAt = new Date().toISOString();

  for (const badge of BADGES) {
    if (!earnedIds.has(badge.id) && conditions[badge.id]) {
      newBadges.push({ ...badge, earnedAt });
    }
  }

  const updatedBadges = [...currentBadges, ...newBadges];
  return { currentBadges: updatedBadges, newBadges };
}

async function getLeaderboard(userId) {
  const { data: friendships, error: fErr } = await supabase
    .from("Friends")
    .select("RequesterID, ReceiverID")
    .or(`RequesterID.eq.${userId},ReceiverID.eq.${userId}`)
    .eq("TrangThai", "accepted");

  if (fErr) throw new Error("Failed to fetch friends: " + fErr.message);

  const friendIds = (friendships || []).map((f) =>
    f.RequesterID === userId ? f.ReceiverID : f.RequesterID
  );
  const allIds = [...new Set([userId, ...friendIds])];

  const { data: gamRows, error: gErr } = await supabase
    .from("UserGamification")
    .select("UserID, XP, Level, Streak, Badges")
    .in("UserID", allIds);

  if (gErr) throw new Error("Failed to fetch leaderboard data: " + gErr.message);

  const { data: users, error: uErr } = await supabase
    .from("Users")
    .select("UserID, HoTen, AvatarUrl")
    .in("UserID", allIds);

  if (uErr) throw new Error("Failed to fetch user data: " + uErr.message);

  const userMap = Object.fromEntries((users || []).map((u) => [u.UserID, u]));

  const ranked = (gamRows || [])
    .map((g) => ({
      ...g,
      HoTen: userMap[g.UserID]?.HoTen || "Unknown",
      AvatarUrl: userMap[g.UserID]?.AvatarUrl || null,
      isMe: g.UserID === userId,
    }))
    .sort((a, b) => b.XP - a.XP)
    .slice(0, 20)
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

  return ranked;
}

async function refreshProfile(userId) {
  const stats = await calculateXP(userId);
  const level = getLevelFromXP(stats.xp);
  const { currentBadges } = await evaluateBadges(userId, stats);

  const row = {
    UserID: userId,
    XP: stats.xp,
    Level: level,
    Streak: stats.streak,
    Badges: currentBadges,
    LastXPUpdate: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("UserGamification")
    .upsert(row, { onConflict: "UserID" })
    .select()
    .single();

  if (error) throw new Error("Failed to save gamification profile: " + error.message);

  return data;
}

module.exports = {
  BADGES,
  LEVEL_THRESHOLDS,
  getLevelFromXP,
  getOrCreateProfile,
  calculateXP,
  evaluateBadges,
  getLeaderboard,
  refreshProfile,
};
