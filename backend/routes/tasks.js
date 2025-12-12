const express = require("express");
const router = express.Router();
const { dbPoolPromise, sql } = require("../config/database");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

// Mapping trạng thái
const STATUS_MAP = {
  pending: 0,
  in_progress: 1,
  "in-progress": 1,
  completed: 2,
  cancelled: 3,
  canceled: 3,
};

// Mapping màu theo độ ưu tiên
const PRIORITY_COLORS = {
  1: "#34D399", // Xanh lá - Thấp
  2: "#60A5FA", // Xanh lam - Trung bình (mặc định)
  3: "#FBBF24", // Vàng - Cao
  4: "#F87171", // Đỏ - Rất cao
};

// Middleware xác thực JWT
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

// GET /api/tasks - Lấy danh sách công việc
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { status } = req.query;

    const pool = await dbPoolPromise;
    let query = `
      SELECT 
        cv.MaCongViec AS ID,
        cv.UserID,
        cv.MaLoai,
        cv.TieuDe,
        cv.MoTa,
        cv.Tag,
        cv.CoThoiGianCoDinh,
        cv.GioBatDauCoDinh,
        cv.GioKetThucCoDinh,
        cv.LapLai,
        cv.TrangThaiThucHien,
        cv.NgayTao,
        cv.ThoiGianUocTinh,
        cv.MucDoUuTien,
        cv.MucDoPhucTap,
        cv.MucDoTapTrung,
        cv.ThoiDiemThichHop,
        cv.LuongTheoGio,
        -- Thay vì lấy màu từ LoaiCongViec, chúng ta sẽ lấy theo độ ưu tiên
        CASE cv.MucDoUuTien
          WHEN 1 THEN '#34D399'  -- Thấp: Xanh lá
          WHEN 2 THEN '#60A5FA'  -- Trung bình: Xanh lam
          WHEN 3 THEN '#FBBF24'  -- Cao: Vàng
          WHEN 4 THEN '#F87171'  -- Rất cao: Đỏ
          ELSE '#60A5FA'         -- Mặc định: Xanh lam
        END AS MauSac,
        lc.TenLoai  -- Vẫn lấy tên danh mục nếu cần
      FROM CongViec cv
      LEFT JOIN LoaiCongViec lc ON cv.MaLoai = lc.MaLoai
      WHERE cv.UserID = @userId
    `;

    const request = pool.request().input("userId", sql.Int, userId);

    if (status) {
      const statusNumber = STATUS_MAP[status.toLowerCase()];
      if (statusNumber !== undefined) {
        query += ` AND cv.TrangThaiThucHien = @status`;
        request.input("status", sql.TinyInt, statusNumber);
      }
    }

    query += ` ORDER BY cv.NgayTao DESC`;
    const result = await request.query(query);

    // Thêm màu theo độ ưu tiên vào kết quả (đảm bảo có cả ở backend)
    const tasks = result.recordset.map((task) => {
      return {
        ...task,
        MauSac: PRIORITY_COLORS[task.MucDoUuTien] || "#60A5FA",
      };
    });

    res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error("Lỗi lấy công việc:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
});

// POST /api/tasks - Tạo công việc mới (ĐÃ BỔ SUNG THỜI GIAN CỐ ĐỊNH + LẶP LẠI)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const d = req.body;

    if (!d.TieuDe?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tiêu đề là bắt buộc",
      });
    }

    // Xử lý thời gian cố định
    let gioBatDauCoDinh = null;
    let gioKetThucCoDinh = null;
    let thoiGianUocTinh = parseInt(d.ThoiGianUocTinh) || 60;

    if (d.CoThoiGianCoDinh && d.GioBatDauCoDinh) {
      gioBatDauCoDinh = new Date(d.GioBatDauCoDinh);

      if (isNaN(gioBatDauCoDinh.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Ngày giờ bắt đầu không hợp lệ",
        });
      }

      // Ưu tiên giờ kết thúc nếu có gửi lên
      if (d.GioKetThucCoDinh) {
        gioKetThucCoDinh = new Date(d.GioKetThucCoDinh);
        if (isNaN(gioKetThucCoDinh.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Giờ kết thúc không hợp lệ",
          });
        }
      } else {
        // Tự động tính giờ kết thúc từ thời lượng
        const durationMinutes = d.ThoiGianUocTinh
          ? parseInt(d.ThoiGianUocTinh)
          : 60;
        gioKetThucCoDinh = new Date(
          gioBatDauCoDinh.getTime() + durationMinutes * 60000
        );
        thoiGianUocTinh = durationMinutes;
      }
    }

    const pool = await dbPoolPromise;
    const result = await pool
      .request()
      .input("UserID", sql.Int, userId)
      .input("MaLoai", sql.Int, d.MaLoai || null)
      .input("TieuDe", sql.NVarChar, d.TieuDe.trim())
      .input("MoTa", sql.NVarChar, d.MoTa || "")
      .input("Tag", sql.NVarChar, d.Tag || "")
      .input("CoThoiGianCoDinh", sql.Bit, d.CoThoiGianCoDinh ? 1 : 0)
      .input("GioBatDauCoDinh", sql.DateTime, gioBatDauCoDinh)
      .input("GioKetThucCoDinh", sql.DateTime, gioKetThucCoDinh)
      .input("LapLai", sql.NVarChar(50), d.LapLai || null)
      .input("TrangThaiThucHien", sql.TinyInt, 0)
      .input("NgayTao", sql.DateTime, new Date())
      .input("ThoiGianUocTinh", sql.Int, thoiGianUocTinh)
      .input("MucDoUuTien", sql.TinyInt, parseInt(d.MucDoUuTien) || 2)
      .input("MucDoPhucTap", sql.TinyInt, parseInt(d.MucDoPhucTap) || null)
      .input("MucDoTapTrung", sql.TinyInt, parseInt(d.MucDoTapTrung) || null)
      .input("ThoiDiemThichHop", sql.NVarChar, d.ThoiDiemThichHop || null)
      .input(
        "LuongTheoGio",
        sql.Decimal(18, 2),
        parseFloat(d.LuongTheoGio) || 0
      ).query(`
        INSERT INTO CongViec (
          UserID, MaLoai, TieuDe, MoTa, Tag,
          CoThoiGianCoDinh, GioBatDauCoDinh, GioKetThucCoDinh, LapLai,
          TrangThaiThucHien, NgayTao, ThoiGianUocTinh,
          MucDoUuTien, MucDoPhucTap, MucDoTapTrung,
          ThoiDiemThichHop, LuongTheoGio
        )
        OUTPUT INSERTED.*
        VALUES (
          @UserID, @MaLoai, @TieuDe, @MoTa, @Tag,
          @CoThoiGianCoDinh, @GioBatDauCoDinh, @GioKetThucCoDinh, @LapLai,
          @TrangThaiThucHien, @NgayTao, @ThoiGianUocTinh,
          @MucDoUuTien, @MucDoPhucTap, @MucDoTapTrung,
          @ThoiDiemThichHop, @LuongTheoGio
        )
      `);

    // Thêm màu theo độ ưu tiên vào response
    const createdTask = result.recordset[0];
    const responseTask = {
      ...createdTask,
      MauSac: PRIORITY_COLORS[createdTask.MucDoUuTien] || "#60A5FA",
    };

    res.status(201).json({
      success: true,
      data: responseTask,
      message: "Tạo công việc thành công",
    });
  } catch (error) {
    console.error("Lỗi tạo công việc:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tạo công việc",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const taskId = parseInt(req.params.id);

    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: "ID không hợp lệ",
      });
    }

    const pool = await dbPoolPromise;
    const result = await pool
      .request()
      .input("MaCongViec", sql.Int, taskId)
      .input("UserID", sql.Int, userId).query(`
        SELECT 
          cv.MaCongViec AS ID,
          cv.UserID,
          cv.MaLoai,
          cv.TieuDe,
          cv.MoTa,
          cv.Tag,
          cv.CoThoiGianCoDinh,
          cv.GioBatDauCoDinh,
          cv.GioKetThucCoDinh,
          cv.LapLai,
          cv.TrangThaiThucHien,
          cv.NgayTao,
          cv.ThoiGianUocTinh,
          cv.MucDoUuTien,
          cv.MucDoPhucTap,
          cv.MucDoTapTrung,
          cv.ThoiDiemThichHop,
          cv.LuongTheoGio,
          CASE cv.MucDoUuTien
            WHEN 1 THEN '#34D399'
            WHEN 2 THEN '#60A5FA'
            WHEN 3 THEN '#FBBF24'
            WHEN 4 THEN '#F87171'
            ELSE '#60A5FA'
          END AS MauSac
        FROM CongViec cv
        WHERE cv.MaCongViec = @MaCongViec 
          AND cv.UserID = @UserID
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy công việc",
      });
    }

    const task = result.recordset[0];
    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error("Lỗi lấy chi tiết công việc:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
});

// PUT /api/tasks/:id - Cập nhật công việc (cũng hỗ trợ các trường mới)
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const taskId = req.params.id;
    const d = req.body;

    const pool = await dbPoolPromise;
    const fields = [];
    const request = pool
      .request()
      .input("MaCongViec", sql.Int, taskId)
      .input("UserID", sql.Int, userId);

    // Xử lý thời gian cố định khi cập nhật
    if (d.CoThoiGianCoDinh !== undefined) {
      fields.push("CoThoiGianCoDinh = @CoThoiGianCoDinh");
      request.input("CoThoiGianCoDinh", sql.Bit, d.CoThoiGianCoDinh ? 1 : 0);

      if (d.GioBatDauCoDinh) {
        const start = new Date(d.GioBatDauCoDinh);
        if (isNaN(start.getTime())) {
          return res
            .status(400)
            .json({ success: false, message: "Giờ bắt đầu không hợp lệ" });
        }
        fields.push("GioBatDauCoDinh = @GioBatDauCoDinh");
        request.input("GioBatDauCoDinh", sql.DateTime, start);

        // Tính giờ kết thúc nếu không có
        if (!d.GioKetThucCoDinh && d.ThoiGianUocTinh) {
          const end = new Date(
            start.getTime() + (parseInt(d.ThoiGianUocTinh) || 60) * 60000
          );
          fields.push("GioKetThucCoDinh = @GioKetThucCoDinh_Auto");
          request.input("GioKetThucCoDinh_Auto", sql.DateTime, end);
        }
      }

      if (d.GioKetThucCoDinh) {
        const end = new Date(d.GioKetThucCoDinh);
        if (!isNaN(end.getTime())) {
          fields.push("GioKetThucCoDinh = @GioKetThucCoDinh");
          request.input("GioKetThucCoDinh", sql.DateTime, end);
        }
      }

      if (d.LapLai !== undefined) {
        fields.push("LapLai = @LapLai");
        request.input("LapLai", sql.NVarChar(50), d.LapLai || null);
      }
    }

    // Các trường khác (giữ nguyên như cũ)
    if (d.TieuDe) {
      fields.push("TieuDe = @TieuDe");
      request.input("TieuDe", sql.NVarChar, d.TieuDe);
    }
    if (d.MoTa !== undefined) {
      fields.push("MoTa = @MoTa");
      request.input("MoTa", sql.NVarChar, d.MoTa);
    }
    if (d.MaLoai !== undefined) {
      fields.push("MaLoai = @MaLoai");
      request.input("MaLoai", sql.Int, d.MaLoai);
    }
    if (d.Tag !== undefined) {
      fields.push("Tag = @Tag");
      request.input("Tag", sql.NVarChar, d.Tag);
    }
    if (d.ThoiGianUocTinh !== undefined) {
      fields.push("ThoiGianUocTinh = @ThoiGianUocTinh");
      request.input("ThoiGianUocTinh", sql.Int, d.ThoiGianUocTinh);
    }
    if (d.MucDoUuTien !== undefined) {
      fields.push("MucDoUuTien = @MucDoUuTien");
      request.input("MucDoUuTien", sql.TinyInt, d.MucDoUuTien);
    }
    if (d.TrangThaiThucHien !== undefined) {
      let status =
        typeof d.TrangThaiThucHien === "string"
          ? STATUS_MAP[d.TrangThaiThucHien.toLowerCase()] ?? 0
          : d.TrangThaiThucHien;
      fields.push("TrangThaiThucHien = @TrangThaiThucHien");
      request.input("TrangThaiThucHien", sql.TinyInt, status);
    }

    if (fields.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Không có dữ liệu để cập nhật" });
    }

    const query = `
      UPDATE CongViec SET ${fields.join(", ")}
      WHERE MaCongViec = @MaCongViec AND UserID = @UserID
    `;

    const result = await request.query(query);

    if (result.rowsAffected[0] === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy công việc" });
    }

    res.json({ success: true, message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật công việc:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// DELETE /api/tasks/:id - Xóa công việc (giữ nguyên như cũ)
router.delete("/:id", authenticateToken, async (req, res) => {
  const userId = req.userId;
  const taskId = parseInt(req.params.id);

  if (isNaN(taskId)) {
    return res.status(400).json({ success: false, message: "ID không hợp lệ" });
  }

  const pool = await dbPoolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // Kiểm tra công việc
    const taskCheck = await pool
      .request()
      .input("MaCongViec", sql.Int, taskId)
      .input("UserID", sql.Int, userId)
      .query(
        `SELECT TieuDe FROM CongViec WHERE MaCongViec = @MaCongViec AND UserID = @UserID`
      );

    if (taskCheck.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy công việc hoặc không có quyền",
      });
    }
    const taskTitle = taskCheck.recordset[0].TieuDe;

    // Đếm lịch trình
    const countRes = await pool
      .request()
      .input("MaCongViec", sql.Int, taskId)
      .query(
        `SELECT COUNT(*) AS Count FROM LichTrinh WHERE MaCongViec = @MaCongViec`
      );
    const scheduleCount = countRes.recordset[0].Count;

    if (scheduleCount === 0) {
      await pool
        .request()
        .input("MaCongViec", sql.Int, taskId)
        .input("UserID", sql.Int, userId)
        .query(
          `DELETE FROM CongViec WHERE MaCongViec = @MaCongViec AND UserID = @UserID`
        );
      await transaction.commit();
      return res.json({ success: true, message: "Xóa thành công" });
    }

    const force = req.query.force === "true" || req.body.force === true;
    if (!force) {
      return res.status(200).json({
        success: false,
        requireConfirmation: true,
        message: `Công việc "${taskTitle}" có ${scheduleCount} lịch trình`,
        details: "Xóa công việc sẽ xóa luôn toàn bộ lịch trình liên quan",
        scheduleCount,
        taskTitle,
      });
    }

    // Xóa cascade thủ công
    await transaction
      .request()
      .input("MaCongViec", sql.Int, taskId)
      .query(`DELETE FROM LichTrinh WHERE MaCongViec = @MaCongViec`);

    await transaction
      .request()
      .input("MaCongViec", sql.Int, taskId)
      .input("UserID", sql.Int, userId)
      .query(
        `DELETE FROM CongViec WHERE MaCongViec = @MaCongViec AND UserID = @UserID`
      );

    await transaction.commit();
    return res.json({
      success: true,
      message: `Đã xóa công việc và ${scheduleCount} lịch trình`,
      deletedSchedules: scheduleCount,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Lỗi xóa công việc:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa công việc",
    });
  }
});

module.exports = router;
