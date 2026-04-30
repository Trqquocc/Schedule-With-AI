const express = require("express");
const router = express.Router();
const { supabase } = require("../config/database");

// GET /api/statistics?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/", async (req, res) => {
  try {
    const userId = req.userId;
    const { from, to } = req.query;

    const endDate = to ? new Date(to) : new Date();
    const startDate = from
      ? new Date(from)
      : new Date(endDate.getTime() - 30 * 24 * 3600 * 1000);

    // Lấy tất cả lịch trình trong khoảng
    const { data: records, error } = await supabase
      .from("LichTrinh")
      .select("GioBatDau, DaHoanThanh")
      .eq("UserID", userId)
      .gte("GioBatDau", startDate.toISOString())
      .lte("GioBatDau", endDate.toISOString());

    if (error) {
      console.error("Lỗi statistics:", error);
      return res.status(500).json({ success: false, message: "Lỗi server" });
    }

    const allRecords = records || [];
    const total = allRecords.length;
    const completed = allRecords.filter((r) => r.DaHoanThanh).length;
    const pending = total - completed;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 10000) / 100;

    // Dữ liệu theo ngày cho biểu đồ
    const dailyMap = {};
    allRecords.forEach((r) => {
      const day = r.GioBatDau ? r.GioBatDau.split("T")[0] : null;
      if (!day) return;
      if (!dailyMap[day]) {
        dailyMap[day] = { date: day, total: 0, completed: 0 };
      }
      dailyMap[day].total++;
      if (r.DaHoanThanh) dailyMap[day].completed++;
    });

    const daily = Object.values(dailyMap).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    res.json({
      success: true,
      data: { total, completed, pending, percent, daily },
    });
  } catch (error) {
    console.error("Lỗi statistics:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// GET /api/statistics/heatmap?year=2026
router.get("/heatmap", async (req, res) => {
  try {
    const userId = req.userId;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const startDate = `${year}-01-01T00:00:00Z`;
    const endDate = `${year}-12-31T23:59:59Z`;

    const { data: records, error } = await supabase
      .from("LichTrinh")
      .select("GioBatDau, DaHoanThanh")
      .eq("UserID", userId)
      .gte("GioBatDau", startDate)
      .lte("GioBatDau", endDate);

    if (error) {
      console.error("Lỗi statistics/heatmap:", error);
      return res.status(500).json({ success: false, message: "Lỗi server" });
    }

    // Group by date
    const dailyMap = {};
    (records || []).forEach((r) => {
      const day = r.GioBatDau ? r.GioBatDau.split("T")[0] : null;
      if (!day) return;
      if (!dailyMap[day]) dailyMap[day] = { date: day, total: 0, completed: 0 };
      dailyMap[day].total++;
      if (r.DaHoanThanh) dailyMap[day].completed++;
    });

    // Build full year array with ratio values
    const entries = [];
    const cursor = new Date(`${year}-01-01T00:00:00Z`);
    const limit = new Date(`${year + 1}-01-01T00:00:00Z`);

    while (cursor < limit) {
      const dateStr = cursor.toISOString().split("T")[0];
      const day = dailyMap[dateStr];
      entries.push({
        date: dateStr,
        total: day ? day.total : 0,
        completed: day ? day.completed : 0,
        value: day && day.total > 0 ? day.completed / day.total : null,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    res.json({ success: true, data: entries });
  } catch (err) {
    console.error("Lỗi GET /statistics/heatmap:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

module.exports = router;
