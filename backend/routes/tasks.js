const express = require("express");
const router = express.Router();
const { supabase } = require("../config/database");
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
  1: "#34D399",
  2: "#60A5FA",
  3: "#FBBF24",
  4: "#F87171",
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

// GET /api/tasks
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { status } = req.query;

    let query = supabase
      .from("CongViec")
      .select("*, LoaiCongViec(TenLoai)")
      .eq("UserID", userId);

    if (status) {
      const statusNumber = STATUS_MAP[status.toLowerCase()];
      if (statusNumber !== undefined) {
        query = query.eq("TrangThaiThucHien", statusNumber);
      }
    }

    query = query.order("NgayTao", { ascending: false });

    const { data: tasks, error } = await query;

    if (error) {
      console.error("Lỗi lấy công việc:", error);
      return res.status(500).json({ success: false, message: "Lỗi server" });
    }

    const result = (tasks || []).map((task) => ({
      ID: task.MaCongViec,
      UserID: task.UserID,
      MaLoai: task.MaLoai,
      TieuDe: task.TieuDe,
      MoTa: task.MoTa,
      Tag: task.Tag,
      CoThoiGianCoDinh: task.CoThoiGianCoDinh,
      GioBatDauCoDinh: task.GioBatDauCoDinh,
      GioKetThucCoDinh: task.GioKetThucCoDinh,
      LapLai: task.LapLai,
      TrangThaiThucHien: task.TrangThaiThucHien,
      NgayTao: task.NgayTao,
      ThoiGianUocTinh: task.ThoiGianUocTinh,
      MucDoUuTien: task.MucDoUuTien,
      MucDoPhucTap: task.MucDoPhucTap,
      MucDoTapTrung: task.MucDoTapTrung,
      ThoiDiemThichHop: task.ThoiDiemThichHop,
      LuongTheoGio: task.LuongTheoGio,
      MauSac: PRIORITY_COLORS[task.MucDoUuTien] || "#60A5FA",
      TenLoai: task.LoaiCongViec?.TenLoai || null,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Lỗi lấy công việc:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// POST /api/tasks
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

      if (d.GioKetThucCoDinh) {
        gioKetThucCoDinh = new Date(d.GioKetThucCoDinh);
        if (isNaN(gioKetThucCoDinh.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Giờ kết thúc không hợp lệ",
          });
        }
      } else {
        const durationMinutes = d.ThoiGianUocTinh
          ? parseInt(d.ThoiGianUocTinh)
          : 60;
        gioKetThucCoDinh = new Date(
          gioBatDauCoDinh.getTime() + durationMinutes * 60000
        );
        thoiGianUocTinh = durationMinutes;
      }

      gioBatDauCoDinh = gioBatDauCoDinh.toISOString();
      gioKetThucCoDinh = gioKetThucCoDinh.toISOString();
    }

    const { data: createdTask, error } = await supabase
      .from("CongViec")
      .insert({
        UserID: userId,
        MaLoai: d.MaLoai || null,
        TieuDe: d.TieuDe.trim(),
        MoTa: d.MoTa || "",
        Tag: d.Tag || "",
        CoThoiGianCoDinh: d.CoThoiGianCoDinh ? true : false,
        GioBatDauCoDinh: gioBatDauCoDinh,
        GioKetThucCoDinh: gioKetThucCoDinh,
        LapLai: d.LapLai || null,
        TrangThaiThucHien: 0,
        NgayTao: new Date().toISOString(),
        ThoiGianUocTinh: thoiGianUocTinh,
        MucDoUuTien: parseInt(d.MucDoUuTien) || 2,
        MucDoPhucTap: parseInt(d.MucDoPhucTap) || null,
        MucDoTapTrung: parseInt(d.MucDoTapTrung) || null,
        ThoiDiemThichHop: d.ThoiDiemThichHop || null,
        LuongTheoGio: parseFloat(d.LuongTheoGio) || 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Lỗi tạo công việc:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server khi tạo công việc",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }

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

// GET /api/tasks/:id
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const taskId = parseInt(req.params.id);

    if (isNaN(taskId)) {
      return res.status(400).json({ success: false, message: "ID không hợp lệ" });
    }

    const { data: task, error } = await supabase
      .from("CongViec")
      .select("*")
      .eq("MaCongViec", taskId)
      .eq("UserID", userId)
      .single();

    if (error || !task) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy công việc",
      });
    }

    res.json({
      success: true,
      data: {
        ID: task.MaCongViec,
        ...task,
        MauSac: PRIORITY_COLORS[task.MucDoUuTien] || "#60A5FA",
      },
    });
  } catch (error) {
    console.error("Lỗi lấy chi tiết công việc:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// PUT /api/tasks/:id
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const taskId = req.params.id;
    const d = req.body;

    const updateData = {};

    if (d.CoThoiGianCoDinh !== undefined) {
      updateData.CoThoiGianCoDinh = d.CoThoiGianCoDinh ? true : false;

      if (d.GioBatDauCoDinh) {
        const start = new Date(d.GioBatDauCoDinh);
        if (isNaN(start.getTime())) {
          return res
            .status(400)
            .json({ success: false, message: "Giờ bắt đầu không hợp lệ" });
        }
        updateData.GioBatDauCoDinh = start.toISOString();

        if (!d.GioKetThucCoDinh && d.ThoiGianUocTinh) {
          const end = new Date(
            start.getTime() + (parseInt(d.ThoiGianUocTinh) || 60) * 60000
          );
          updateData.GioKetThucCoDinh = end.toISOString();
        }
      }

      if (d.GioKetThucCoDinh) {
        const end = new Date(d.GioKetThucCoDinh);
        if (!isNaN(end.getTime())) {
          updateData.GioKetThucCoDinh = end.toISOString();
        }
      }

      if (d.LapLai !== undefined) {
        updateData.LapLai = d.LapLai || null;
      }
    }

    if (d.TieuDe) updateData.TieuDe = d.TieuDe;
    if (d.MoTa !== undefined) updateData.MoTa = d.MoTa;
    if (d.MaLoai !== undefined) updateData.MaLoai = d.MaLoai;
    if (d.Tag !== undefined) updateData.Tag = d.Tag;
    if (d.ThoiGianUocTinh !== undefined) updateData.ThoiGianUocTinh = d.ThoiGianUocTinh;
    if (d.MucDoUuTien !== undefined) updateData.MucDoUuTien = d.MucDoUuTien;
    if (d.TrangThaiThucHien !== undefined) {
      let status =
        typeof d.TrangThaiThucHien === "string"
          ? STATUS_MAP[d.TrangThaiThucHien.toLowerCase()] ?? 0
          : d.TrangThaiThucHien;
      updateData.TrangThaiThucHien = status;
    }

    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Không có dữ liệu để cập nhật" });
    }

    const { data, error, count } = await supabase
      .from("CongViec")
      .update(updateData)
      .eq("MaCongViec", taskId)
      .eq("UserID", userId)
      .select();

    if (error) {
      console.error("Lỗi cập nhật công việc:", error);
      return res.status(500).json({ success: false, message: "Lỗi server" });
    }

    if (!data || data.length === 0) {
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

// DELETE /api/tasks/:id
router.delete("/:id", authenticateToken, async (req, res) => {
  const userId = req.userId;
  const taskId = parseInt(req.params.id);

  if (isNaN(taskId)) {
    return res.status(400).json({ success: false, message: "ID không hợp lệ" });
  }

  try {
    // Kiểm tra công việc
    const { data: task } = await supabase
      .from("CongViec")
      .select("TieuDe")
      .eq("MaCongViec", taskId)
      .eq("UserID", userId)
      .single();

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy công việc hoặc không có quyền",
      });
    }

    // Đếm lịch trình
    const { count: scheduleCount } = await supabase
      .from("LichTrinh")
      .select("*", { count: "exact", head: true })
      .eq("MaCongViec", taskId);

    if (!scheduleCount || scheduleCount === 0) {
      await supabase
        .from("CongViec")
        .delete()
        .eq("MaCongViec", taskId)
        .eq("UserID", userId);

      return res.json({ success: true, message: "Xóa thành công" });
    }

    const force = req.query.force === "true" || req.body?.force === true;
    if (!force) {
      return res.status(200).json({
        success: false,
        requireConfirmation: true,
        message: `Công việc "${task.TieuDe}" có ${scheduleCount} lịch trình`,
        details: "Xóa công việc sẽ xóa luôn toàn bộ lịch trình liên quan",
        scheduleCount,
        taskTitle: task.TieuDe,
      });
    }

    // Xóa cascade: lịch trình trước, rồi công việc
    await supabase
      .from("LichTrinh")
      .delete()
      .eq("MaCongViec", taskId);

    await supabase
      .from("CongViec")
      .delete()
      .eq("MaCongViec", taskId)
      .eq("UserID", userId);

    return res.json({
      success: true,
      message: `Đã xóa công việc và ${scheduleCount} lịch trình`,
      deletedSchedules: scheduleCount,
    });
  } catch (error) {
    console.error("Lỗi xóa công việc:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa công việc",
    });
  }
});

module.exports = router;
