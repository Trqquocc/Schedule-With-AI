const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { supabase } = require("../config/database");

const PRIORITY_COLORS = {
  1: "#34D399",
  2: "#60A5FA",
  3: "#FBBF24",
  4: "#F87171",
};

router.use(authenticateToken);

// GET /api/event/events
router.get("/events", async (req, res) => {
  try {
    const userId = req.user.UserID;
    console.log(`Fetching events for user: ${userId}`);

    const { data: records, error } = await supabase
      .from("LichTrinh")
      .select("*, CongViec(TieuDe, MoTa, NgayTao, MauSac)")
      .eq("UserID", userId)
      .eq("AI_DeXuat", false)
      .order("GioBatDau", { ascending: true });

    if (error) {
      console.error("Error fetching events:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi khi tải lịch trình",
        error: error.message,
      });
    }

    console.log(` Found ${(records || []).length} events for user ${userId}`);

    const events = (records || []).map((ev) => ({
      ID: ev.MaLichTrinh,
      title: ev.CongViec?.TieuDe || "Không có tiêu đề",
      TieuDe: ev.CongViec?.TieuDe || "Không có tiêu đề",
      start: ev.GioBatDau
        ? new Date(ev.GioBatDau).toISOString()
        : new Date().toISOString(),
      end: ev.GioKetThuc ? new Date(ev.GioKetThuc).toISOString() : null,
      ThoiGianBatDau: ev.GioBatDau,
      ThoiGianKetThuc: ev.GioKetThuc,
      backgroundColor: ev.CongViec?.MauSac || "#3788d8",
      MaMau: ev.CongViec?.MauSac || "#3788d8",
      extendedProps: {
        note: ev.GhiChu || "",
        completed: ev.DaHoanThanh || false,
        aiSuggested: ev.AI_DeXuat || false,
        taskId: ev.MaCongViec || null,
        description: ev.CongViec?.MoTa || "",
        created: ev.CongViec?.NgayTao || ev.NgayTao,
      },
    }));

    res.json({ success: true, data: events });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải lịch trình",
      error: error.message,
    });
  }
});

// POST /api/event/events
router.post("/events", async (req, res) => {
  try {
    const userId = req.user.UserID;
    const { MaCongViec, GioBatDau, GioKetThuc, GhiChu, AI_DeXuat = false } = req.body;

    if (!GioBatDau) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc",
      });
    }

    const startDate = new Date(GioBatDau);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Định dạng ngày bắt đầu không hợp lệ",
      });
    }

    const endDate = GioKetThuc ? new Date(GioKetThuc) : null;

    const { data: result, error } = await supabase
      .from("LichTrinh")
      .insert({
        MaCongViec: MaCongViec,
        UserID: userId,
        GioBatDau: startDate.toISOString(),
        GioKetThuc: endDate ? endDate.toISOString() : null,
        DaHoanThanh: false,
        GhiChu: GhiChu || null,
        AI_DeXuat: AI_DeXuat,
        NgayTao: new Date().toISOString(),
      })
      .select("MaLichTrinh")
      .single();

    if (error) {
      console.error("Error creating event:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi tạo sự kiện",
        error: error.message,
      });
    }

    if (MaCongViec) {
      await supabase
        .from("CongViec")
        .update({ TrangThaiThucHien: 1 })
        .eq("MaCongViec", MaCongViec)
        .eq("UserID", userId);
    }

    res.json({
      success: true,
      data: {
        id: result.MaLichTrinh,
        message: "Tạo sự kiện thành công",
      },
    });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi tạo sự kiện",
      error: error.message,
    });
  }
});

// PUT /api/event/events/:id
router.put("/events/:id", async (req, res) => {
  try {
    const userId = req.user.UserID;
    const eventId = req.params.id;
    const { ThoiGianBatDau, ThoiGianKetThuc, GhiChu, DaHoanThanh } = req.body;

    const updateData = {};
    if (ThoiGianBatDau) updateData.GioBatDau = new Date(ThoiGianBatDau).toISOString();
    if (ThoiGianKetThuc) updateData.GioKetThuc = new Date(ThoiGianKetThuc).toISOString();
    if (DaHoanThanh !== undefined) updateData.DaHoanThanh = DaHoanThanh;
    if (GhiChu !== undefined) updateData.GhiChu = GhiChu || null;

    await supabase
      .from("LichTrinh")
      .update(updateData)
      .eq("MaLichTrinh", eventId)
      .eq("UserID", userId);

    // Cập nhật trạng thái công việc nếu hoàn thành
    if (DaHoanThanh !== undefined) {
      const { data: eventData } = await supabase
        .from("LichTrinh")
        .select("MaCongViec")
        .eq("MaLichTrinh", eventId)
        .eq("UserID", userId)
        .single();

      if (eventData?.MaCongViec) {
        await supabase
          .from("CongViec")
          .update({ TrangThaiThucHien: DaHoanThanh ? 2 : 1 })
          .eq("MaCongViec", eventData.MaCongViec)
          .eq("UserID", userId);
      }
    }

    res.json({ success: true, message: "Cập nhật sự kiện thành công" });
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi cập nhật sự kiện",
      error: error.message,
    });
  }
});

// DELETE /api/event/events/:id
router.delete("/events/:id", async (req, res) => {
  try {
    const userId = req.user.UserID;
    const eventId = req.params.id;

    // Lấy MaCongViec trước khi xóa
    const { data: eventData } = await supabase
      .from("LichTrinh")
      .select("MaCongViec")
      .eq("MaLichTrinh", eventId)
      .eq("UserID", userId)
      .single();

    await supabase
      .from("LichTrinh")
      .delete()
      .eq("MaLichTrinh", eventId)
      .eq("UserID", userId);

    if (eventData?.MaCongViec) {
      await supabase
        .from("CongViec")
        .update({ TrangThaiThucHien: 0 })
        .eq("MaCongViec", eventData.MaCongViec)
        .eq("UserID", userId);
    }

    res.json({ success: true, message: "Xóa sự kiện thành công" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa sự kiện",
      error: error.message,
    });
  }
});

// GET /api/event/range
router.get("/range", async (req, res) => {
  try {
    const userId = req.user.UserID;
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: "Thiếu tham số start hoặc end",
      });
    }

    const { data: records, error } = await supabase
      .from("LichTrinh")
      .select("*, CongViec(TieuDe, MoTa, NgayTao, MauSac)")
      .eq("UserID", userId)
      .eq("AI_DeXuat", false)
      .gte("GioBatDau", start)
      .lte("GioBatDau", end)
      .order("GioBatDau", { ascending: true });

    if (error) {
      console.error("Error fetching events by range:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi khi tải lịch trình",
        error: error.message,
      });
    }

    res.json({
      success: true,
      data: records || [],
      count: (records || []).length,
    });
  } catch (error) {
    console.error("Error fetching events by range:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải lịch trình",
      error: error.message,
    });
  }
});

// GET /api/event/ai-events
router.get("/ai-events", async (req, res) => {
  try {
    const userId = req.user.UserID;
    console.log(`Fetching AI events for user: ${userId}`);

    const { data: records, error } = await supabase
      .from("LichTrinh")
      .select("*, CongViec(TieuDe, MoTa, NgayTao, MauSac, MucDoUuTien)")
      .eq("UserID", userId)
      .eq("AI_DeXuat", true)
      .order("GioBatDau", { ascending: true });

    if (error) {
      console.error("Error fetching AI events:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi khi tải lịch trình AI",
        error: error.message,
      });
    }

    console.log(`Found ${(records || []).length} AI events for user ${userId}`);

    const events = (records || []).map((ev) => ({
      ID: ev.MaLichTrinh,
      MaLichTrinh: ev.MaLichTrinh,
      TieuDe: ev.CongViec?.TieuDe || "AI Đề xuất",
      title: ev.CongViec?.TieuDe || "AI Đề xuất",
      GioBatDau: ev.GioBatDau,
      GioKetThuc: ev.GioKetThuc,
      ThoiGianBatDau: ev.GioBatDau,
      ThoiGianKetThuc: ev.GioKetThuc,
      DaHoanThanh: ev.DaHoanThanh,
      GhiChu: ev.GhiChu || "",
      AI_DeXuat: ev.AI_DeXuat,
      Color: ev.CongViec?.MauSac || "#8B5CF6",
      backgroundColor: ev.CongViec?.MauSac || "#8B5CF6",
      priority: ev.CongViec?.MucDoUuTien || 2,
      extendedProps: {
        note: ev.GhiChu || "",
        completed: ev.DaHoanThanh || false,
        aiSuggested: true,
        taskId: ev.MaCongViec || null,
        description: ev.CongViec?.MoTa || "",
        created: ev.CongViec?.NgayTao || ev.NgayTao,
      },
    }));

    res.json({ success: true, data: events });
  } catch (error) {
    console.error("Error fetching AI events:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải lịch trình AI",
      error: error.message,
    });
  }
});

module.exports = router;
