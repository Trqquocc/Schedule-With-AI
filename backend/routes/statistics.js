const express = require("express");
const router = express.Router();
const { dbPoolPromise, sql } = require("../config/database");

router.get("/", async (req, res) => {
  try {
    const userId = req.userId;
    const { from, to } = req.query;

    const endDate = to ? new Date(to) : new Date();
    const startDate = from ? new Date(from) : new Date(endDate.getTime() - 30 * 24 * 3600 * 1000);

    const pool = await dbPoolPromise;

    const totalRes = await pool
      .request()
      .input("UserID", sql.Int, userId)
      .input("StartDate", sql.DateTime, startDate)
      .input("EndDate", sql.DateTime, endDate)
      .query(`
        SELECT
          COUNT(*) AS Total,
          SUM(CASE WHEN DaHoanThanh = 1 THEN 1 ELSE 0 END) AS Completed
        FROM LichTrinh
        WHERE UserID = @UserID
          AND GioBatDau >= @StartDate
          AND GioBatDau <= @EndDate
      `);

    const total = totalRes.recordset[0].Total || 0;
    const completed = totalRes.recordset[0].Completed || 0;
    const pending = total - completed;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 10000) / 100;

    const dailyRes = await pool
      .request()
      .input("UserID", sql.Int, userId)
      .input("StartDate", sql.DateTime, startDate)
      .input("EndDate", sql.DateTime, endDate)
      .query(`
        SELECT CONVERT(date, GioBatDau) AS Day,
          COUNT(*) AS Total,
          SUM(CASE WHEN DaHoanThanh = 1 THEN 1 ELSE 0 END) AS Completed
        FROM LichTrinh
        WHERE UserID = @UserID
          AND GioBatDau >= @StartDate
          AND GioBatDau <= @EndDate
        GROUP BY CONVERT(date, GioBatDau)
        ORDER BY Day ASC
      `);

    const daily = dailyRes.recordset.map((r) => ({
      date: r.Day,
      total: r.Total,
      completed: r.Completed,
    }));

    res.json({
      success: true,
      data: {
        total,
        completed,
        pending,
        percent,
        daily,
      },
    });
  } catch (error) {
    console.error("Lỗi statistics:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

module.exports = router;
