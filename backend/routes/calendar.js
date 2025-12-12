// backend/routes/calendar.js - BACKEND VERSION
// Quản lý lịch trình người dùng

const express = require("express");
const router = express.Router();
const { dbPoolPromise, sql } = require("../config/database");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware xác thực
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token)
    return res.status(401).json({ success: false, message: "Không có token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res
      .status(403)
      .json({ success: false, message: "Token không hợp lệ" });
  }
};

// Mapping màu theo độ ưu tiên - phải trùng với tasks.js
const PRIORITY_COLORS = {
  1: "#34D399", // Xanh lá - Thấp
  2: "#60A5FA", // Xanh lam - Trung bình (mặc định)
  3: "#FBBF24", // Vàng - Cao
  4: "#F87171", // Đỏ - Rất cao
};

// GET tất cả lịch trình - ĐÃ SỬA để lấy màu theo độ ưu tiên
router.get("/events", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const pool = await dbPoolPromise;

    const result = await pool.request().input("UserID", sql.Int, userId).query(`
        SELECT 
          lt.MaLichTrinh,
          lt.MaCongViec,
          lt.UserID,
          lt.TieuDe AS LichTrinhTieuDe,
          lt.GioBatDau,
          lt.GioKetThuc,
          lt.DaHoanThanh,
          lt.GhiChu,
          lt.AI_DeXuat,
          lt.NgayTao AS LichTrinhNgayTao,
          cv.TieuDe AS CongViecTieuDe,
          cv.MoTa,
          cv.MucDoUuTien,
          -- Lấy màu theo độ ưu tiên của công việc
          CASE cv.MucDoUuTien
            WHEN 1 THEN '#34D399'  -- Thấp: Xanh lá
            WHEN 2 THEN '#60A5FA'  -- Trung bình: Xanh lam
            WHEN 3 THEN '#FBBF24'  -- Cao: Vàng
            WHEN 4 THEN '#F87171'  -- Rất cao: Đỏ
            ELSE '#60A5FA'         -- Mặc định: Xanh lam
          END AS MauSac
        FROM LichTrinh lt
        LEFT JOIN CongViec cv ON lt.MaCongViec = cv.MaCongViec
        WHERE lt.UserID = @UserID
        ORDER BY lt.GioBatDau DESC
      `);

    // Xử lý dữ liệu để đảm bảo format phù hợp với frontend
    const events = result.recordset.map((event) => {
      // Ưu tiên tiêu đề từ công việc, nếu không có thì dùng tiêu đề lịch trình
      const title =
        event.CongViecTieuDe || event.LichTrinhTieuDe || "Không có tiêu đề";

      return {
        id: event.MaLichTrinh,
        MaLichTrinh: event.MaLichTrinh,
        MaCongViec: event.MaCongViec,
        UserID: event.UserID,
        title: title,
        TieuDe: title,
        start: event.GioBatDau ? new Date(event.GioBatDau).toISOString() : null,
        end: event.GioKetThuc ? new Date(event.GioKetThuc).toISOString() : null,
        GioBatDau: event.GioBatDau,
        GioKetThuc: event.GioKetThuc,
        DaHoanThanh: event.DaHoanThanh || false,
        GhiChu: event.GhiChu || "",
        AI_DeXuat: event.AI_DeXuat || false,
        NgayTao: event.LichTrinhNgayTao,
        // Màu sắc theo độ ưu tiên
        backgroundColor: event.MauSac || "#60A5FA",
        borderColor: event.MauSac || "#60A5FA",
        textColor: "#FFFFFF",
        extendedProps: {
          note: event.GhiChu || "",
          completed: event.DaHoanThanh || false,
          aiSuggested: event.AI_DeXuat || false,
          taskId: event.MaCongViec || null,
          description: event.MoTa || "",
          priority: event.MucDoUuTien || 2,
          priorityColor: event.MauSac || "#60A5FA",
        },
      };
    });

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error("Lỗi load lịch:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tải lịch trình",
      error: error.message,
    });
  }
});

// GET lịch trình trong khoảng thời gian (cho FullCalendar)
router.get("/range", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: "Thiếu tham số start hoặc end",
      });
    }

    const pool = await dbPoolPromise;

    const result = await pool
      .request()
      .input("UserID", sql.Int, userId)
      .input("StartDate", sql.DateTime, start)
      .input("EndDate", sql.DateTime, end).query(`
        SELECT 
          lt.MaLichTrinh,
          lt.MaCongViec,
          lt.UserID,
          lt.TieuDe AS LichTrinhTieuDe,
          lt.GioBatDau,
          lt.GioKetThuc,
          lt.DaHoanThanh,
          lt.GhiChu,
          lt.AI_DeXuat,
          lt.NgayTao AS LichTrinhNgayTao,
          cv.TieuDe AS CongViecTieuDe,
          cv.MoTa,
          cv.MucDoUuTien,
          -- Lấy màu theo độ ưu tiên
          CASE cv.MucDoUuTien
            WHEN 1 THEN '#34D399'
            WHEN 2 THEN '#60A5FA'
            WHEN 3 THEN '#FBBF24'
            WHEN 4 THEN '#F87171'
            ELSE '#60A5FA'
          END AS MauSac
        FROM LichTrinh lt
        LEFT JOIN CongViec cv ON lt.MaCongViec = cv.MaCongViec
        WHERE lt.UserID = @UserID
          AND lt.GioBatDau >= @StartDate
          AND lt.GioBatDau <= @EndDate
        ORDER BY lt.GioBatDau ASC
      `);

    const events = result.recordset.map((event) => {
      const title =
        event.CongViecTieuDe || event.LichTrinhTieuDe || "Không có tiêu đề";

      return {
        id: event.MaLichTrinh,
        MaLichTrinh: event.MaLichTrinh,
        MaCongViec: event.MaCongViec,
        title: title,
        start: event.GioBatDau,
        end: event.GioKetThuc,
        GioBatDau: event.GioBatDau,
        GioKetThuc: event.GioKetThuc,
        DaHoanThanh: event.DaHoanThanh || false,
        GhiChu: event.GhiChu || "",
        AI_DeXuat: event.AI_DeXuat || false,
        backgroundColor: event.MauSac || "#60A5FA",
        borderColor: event.MauSac || "#60A5FA",
        textColor: "#FFFFFF",
        extendedProps: {
          note: event.GhiChu || "",
          completed: event.DaHoanThanh || false,
          aiSuggested: event.AI_DeXuat || false,
          taskId: event.MaCongViec || null,
          description: event.MoTa || "",
          priority: event.MucDoUuTien || 2,
        },
      };
    });

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error("Lỗi load lịch theo range:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
});

// GET events do AI đề xuất
router.get("/ai-events", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const pool = await dbPoolPromise;

    const result = await pool.request().input("UserID", sql.Int, userId).query(`
        SELECT 
          lt.MaLichTrinh,
          lt.MaCongViec,
          lt.UserID,
          lt.TieuDe AS LichTrinhTieuDe,
          lt.GioBatDau,
          lt.GioKetThuc,
          lt.DaHoanThanh,
          lt.GhiChu,
          lt.AI_DeXuat,
          lt.NgayTao AS LichTrinhNgayTao,
          cv.TieuDe AS CongViecTieuDe,
          cv.MoTa,
          cv.MucDoUuTien,
          -- Lấy màu theo độ ưu tiên (AI events cũng theo độ ưu tiên)
          CASE cv.MucDoUuTien
            WHEN 1 THEN '#34D399'
            WHEN 2 THEN '#60A5FA'
            WHEN 3 THEN '#FBBF24'
            WHEN 4 THEN '#F87171'
            ELSE '#8B5CF6'  -- Màu tím cho AI events không có priority
          END AS MauSac
        FROM LichTrinh lt
        LEFT JOIN CongViec cv ON lt.MaCongViec = cv.MaCongViec
        WHERE lt.UserID = @UserID
          AND lt.AI_DeXuat = 1
        ORDER BY lt.GioBatDau ASC
      `);

    const events = result.recordset.map((event) => {
      const title =
        event.CongViecTieuDe || event.LichTrinhTieuDe || "AI Đề xuất";

      return {
        id: event.MaLichTrinh,
        MaLichTrinh: event.MaLichTrinh,
        MaCongViec: event.MaCongViec,
        title: title,
        start: event.GioBatDau,
        end: event.GioKetThuc,
        GioBatDau: event.GioBatDau,
        GioKetThuc: event.GioKetThuc,
        DaHoanThanh: event.DaHoanThanh || false,
        GhiChu: event.GhiChu || "",
        AI_DeXuat: event.AI_DeXuat || true,
        backgroundColor: event.MauSac || "#8B5CF6", // Màu tím cho AI
        borderColor: event.MauSac || "#8B5CF6",
        textColor: "#FFFFFF",
        extendedProps: {
          note: event.GhiChu || "",
          completed: event.DaHoanThanh || false,
          aiSuggested: true,
          taskId: event.MaCongViec || null,
          description: event.MoTa || "",
          priority: event.MucDoUuTien || null,
        },
      };
    });

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error("Lỗi load AI events:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tải AI events",
    });
  }
});

// POST – tạo sự kiện
router.post("/events", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const d = req.body;

    // Validate
    if (!d.TieuDe || !d.GioBatDau) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc",
      });
    }

    const pool = await dbPoolPromise;

    const result = await pool
      .request()
      .input("UserID", sql.Int, userId)
      .input("MaCongViec", sql.Int, d.MaCongViec || null)
      .input("TieuDe", sql.NVarChar, d.TieuDe)
      .input("GioBatDau", sql.DateTime, new Date(d.GioBatDau))
      .input(
        "GioKetThuc",
        sql.DateTime,
        d.GioKetThuc ? new Date(d.GioKetThuc) : null
      )
      .input("DaHoanThanh", sql.Bit, d.DaHoanThanh || 0)
      .input("GhiChu", sql.NVarChar, d.GhiChu || null)
      .input("AI_DeXuat", sql.Bit, d.AI_DeXuat || 0)
      .input("NgayTao", sql.DateTime, new Date()).query(`
        INSERT INTO LichTrinh (
          UserID, MaCongViec, TieuDe,
          GioBatDau, GioKetThuc,
          DaHoanThanh, GhiChu, AI_DeXuat, NgayTao
        )
        OUTPUT INSERTED.MaLichTrinh
        VALUES (
          @UserID, @MaCongViec, @TieuDe,
          @GioBatDau, @GioKetThuc,
          @DaHoanThanh, @GhiChu, @AI_DeXuat, @NgayTao
        )
      `);

    // Nếu có MaCongViec, cập nhật trạng thái công việc
    if (d.MaCongViec) {
      await pool
        .request()
        .input("MaCongViec", sql.Int, d.MaCongViec)
        .input("UserID", sql.Int, userId).query(`
          UPDATE CongViec 
          SET TrangThaiThucHien = 1 
          WHERE MaCongViec = @MaCongViec AND UserID = @UserID
        `);
    }

    res.json({
      success: true,
      eventId: result.recordset[0].MaLichTrinh,
      message: "Tạo sự kiện thành công",
    });
  } catch (error) {
    console.error("Lỗi tạo lịch:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tạo sự kiện",
      error: error.message,
    });
  }
});

// PUT – cập nhật sự kiện
router.put("/events/:id", authenticateToken, async (req, res) => {
  try {
    const pool = await dbPoolPromise;
    const d = req.body;

    const request = pool
      .request()
      .input("MaLichTrinh", sql.Int, req.params.id)
      .input("UserID", sql.Int, req.userId);

    const updates = [];

    if (d.title !== undefined) {
      updates.push("TieuDe = @TieuDe");
      request.input("TieuDe", sql.NVarChar, d.title);
    }

    if (d.note !== undefined) {
      updates.push("GhiChu = @GhiChu");
      request.input("GhiChu", sql.NVarChar, d.note);
    }

    if (d.start !== undefined) {
      updates.push("GioBatDau = @GioBatDau");
      request.input("GioBatDau", sql.DateTime, new Date(d.start));
    }

    if (d.end !== undefined) {
      updates.push("GioKetThuc = @GioKetThuc");
      request.input("GioKetThuc", sql.DateTime, d.end ? new Date(d.end) : null);
    }

    if (d.completed !== undefined) {
      updates.push("DaHoanThanh = @DaHoanThanh");
      request.input("DaHoanThanh", sql.Bit, d.completed ? 1 : 0);
    }

    if (updates.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "Không có gì để cập nhật" });

    const query = `
      UPDATE LichTrinh SET ${updates.join(", ")}
      WHERE MaLichTrinh = @MaLichTrinh AND UserID = @UserID
    `;

    await request.query(query);

    res.json({
      success: true,
      message: "Cập nhật sự kiện thành công",
    });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật sự kiện",
    });
  }
});

// DELETE – xoá event
router.delete("/events/:id", authenticateToken, async (req, res) => {
  try {
    const pool = await dbPoolPromise;

    await pool
      .request()
      .input("MaLichTrinh", sql.Int, req.params.id)
      .input("UserID", sql.Int, req.userId).query(`
        DELETE FROM LichTrinh
        WHERE MaLichTrinh = @MaLichTrinh AND UserID = @UserID
      `);

    res.json({
      success: true,
      message: "Xóa sự kiện thành công",
    });
  } catch (error) {
    console.error("Lỗi xóa:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa sự kiện",
    });
  }
});

module.exports = router;
