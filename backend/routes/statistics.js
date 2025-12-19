const express = require("express");
const router = express.Router();
const { dbPoolPromise, sql } = require("../config/database");
const { authenticateToken } = require("../middleware/auth");

router.get("/", async (req, res) => {
  try {
    const userId = req.userId;
    const { from, to } = req.query;

    const endDate = to ? new Date(to) : new Date();
    const startDate = from
      ? new Date(from)
      : new Date(endDate.getTime() - 30 * 24 * 3600 * 1000);

    const pool = await dbPoolPromise;

    const totalRes = await pool
      .request()
      .input("UserID", sql.Int, userId)
      .input("StartDate", sql.DateTime, startDate)
      .input("EndDate", sql.DateTime, endDate).query(`
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
    const percent =
      total === 0 ? 0 : Math.round((completed / total) * 10000) / 100;

    const dailyRes = await pool
      .request()
      .input("UserID", sql.Int, userId)
      .input("StartDate", sql.DateTime, startDate)
      .input("EndDate", sql.DateTime, endDate).query(`
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

    // Lấy danh sách chi tiết tất cả công việc
    const entriesRes = await pool
      .request()
      .input("UserID", sql.Int, userId)
      .input("StartDate", sql.DateTime, startDate)
      .input("EndDate", sql.DateTime, endDate).query(`
        SELECT
          lt.MaLichTrinh,
          lt.GioBatDau,
          lt.GioKetThuc,
          lt.GhiChu,
          lt.DaHoanThanh,
          cv.MaCongViec,
          cv.TieuDe AS CongViecTieuDe,
          cv.LuongTheoGio,
          cv.ThoiGianUocTinh
        FROM LichTrinh lt
        LEFT JOIN CongViec cv ON lt.MaCongViec = cv.MaCongViec
        WHERE lt.UserID = @UserID
          AND lt.GioBatDau >= @StartDate
          AND lt.GioBatDau <= @EndDate
        ORDER BY lt.GioBatDau DESC
      `);

    const entries = entriesRes.recordset.map((r) => {
      let hours = 0;
      if (r.GioBatDau && r.GioKetThuc) {
        const start = new Date(r.GioBatDau);
        const end = new Date(r.GioKetThuc);
        hours = Math.round(((end - start) / (1000 * 60) / 60) * 100) / 100;
      } else if (r.ThoiGianUocTinh) {
        hours = Math.round((r.ThoiGianUocTinh / 60) * 100) / 100;
      }

      const rate = r.LuongTheoGio ? parseFloat(r.LuongTheoGio) : 0;
      const amount = Math.round(hours * rate * 100) / 100;

      return {
        id: r.MaLichTrinh,
        title: r.CongViecTieuDe || "(Không có tiêu đề)",
        date: r.GioKetThuc || r.GioBatDau,
        rate,
        hours,
        note: r.GhiChu || "",
        amount,
        completed: Number(r.DaHoanThanh) === 1,
      };
    });

    res.json({
      success: true,
      data: {
        total,
        completed,
        pending,
        percent,
        daily,
        entries,
      },
    });
  } catch (error) {
    console.error("Lỗi statistics:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

module.exports = router;
