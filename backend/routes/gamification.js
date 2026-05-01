// gamification.js — routes for XP/level/badge/leaderboard endpoints
const express = require("express");
const router = express.Router();
const {
  getOrCreateProfile,
  getLeaderboard,
  refreshProfile,
} = require("../services/gamification-service");

// GET /api/gamification/profile — return cached profile, auto-refresh if stale (>1h)
router.get("/profile", async (req, res) => {
  try {
    const data = await getOrCreateProfile(req.userId);
    return res.json({ success: true, data });
  } catch (err) {
    console.error("GET /gamification/profile error:", err.message);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// GET /api/gamification/leaderboard — friends + self ranked by XP
router.get("/leaderboard", async (req, res) => {
  try {
    const data = await getLeaderboard(req.userId);
    return res.json({ success: true, data });
  } catch (err) {
    console.error("GET /gamification/leaderboard error:", err.message);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// POST /api/gamification/refresh — force full recalculation (rate-limited to once/min)
router.post("/refresh", async (req, res) => {
  try {
    const { supabase } = require("../config/database");

    const { data: existing } = await supabase
      .from("UserGamification")
      .select("LastXPUpdate")
      .eq("UserID", req.userId)
      .single();

    if (existing?.LastXPUpdate) {
      const elapsedMs = Date.now() - new Date(existing.LastXPUpdate).getTime();
      if (elapsedMs < 60 * 1000) {
        return res.status(429).json({
          success: false,
          message: "Vui lòng chờ ít nhất 1 phút trước khi làm mới lại",
        });
      }
    }

    const data = await refreshProfile(req.userId);
    return res.json({ success: true, data });
  } catch (err) {
    console.error("POST /gamification/refresh error:", err.message);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

module.exports = router;
