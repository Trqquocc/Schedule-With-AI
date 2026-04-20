const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { supabase } = require("../config/database");

// Education level enum mirrors CHECK constraint on Users.HocVan (migration 004).
const ALLOWED_HOCVAN = new Set(["thcs", "thpt", "dai_hoc", "di_lam", "khac"]);

// Supabase Storage bucket holding user avatars. Must exist and be PUBLIC.
// Create it via Dashboard → Storage → New bucket → name "avatars" → public.
const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_AVATAR_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

// Default palette (mirrors frontend :root --prio-1..4 in main.css).
const DEFAULT_PRIORITY_COLORS = {
  1: "#10B981",
  2: "#3B82F6",
  3: "#F59E0B",
  4: "#DC2626",
};
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

// GET /api/users/priority-colors — returns user's stored palette or defaults.
router.get("/priority-colors", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.UserID;
    const { data: row, error } = await supabase
      .from("Users")
      .select("PriorityColors")
      .eq("UserID", userId)
      .single();

    if (error) {
      // Column missing (migration not yet run) → graceful fallback.
      if (error.code === "42703" || /PriorityColors/.test(error.message || "")) {
        return res.json({ success: true, data: DEFAULT_PRIORITY_COLORS, _fallback: "defaults" });
      }
      return res.status(500).json({ success: false, message: "Load failed" });
    }

    const stored = row?.PriorityColors || null;
    res.json({ success: true, data: { ...DEFAULT_PRIORITY_COLORS, ...(stored || {}) } });
  } catch (err) {
    console.error("GET /priority-colors:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// PUT /api/users/priority-colors — save palette.
// Body: { "1": "#RRGGBB", "2": ..., ... } — partial accepted, merged with stored.
router.put("/priority-colors", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.UserID;
    const payload = req.body || {};

    // Validate each field.
    const cleaned = {};
    for (const key of ["1", "2", "3", "4"]) {
      if (payload[key] !== undefined) {
        if (!HEX_RE.test(String(payload[key]))) {
          return res.status(400).json({ success: false, message: `Màu ưu tiên ${key} không hợp lệ (cần #RRGGBB)` });
        }
        cleaned[key] = String(payload[key]).toUpperCase();
      }
    }
    if (Object.keys(cleaned).length === 0) {
      return res.status(400).json({ success: false, message: "Không có màu nào để cập nhật" });
    }

    // Merge with existing to preserve keys not in payload.
    const { data: existingRow } = await supabase
      .from("Users")
      .select("PriorityColors")
      .eq("UserID", userId)
      .single();
    const merged = { ...DEFAULT_PRIORITY_COLORS, ...(existingRow?.PriorityColors || {}), ...cleaned };

    const { error: updateErr } = await supabase
      .from("Users")
      .update({ PriorityColors: merged })
      .eq("UserID", userId);

    if (updateErr) {
      if (updateErr.code === "42703" || /PriorityColors/.test(updateErr.message || "")) {
        return res.status(503).json({
          success: false,
          message: "Tính năng chưa sẵn sàng — chạy migration 002_add_priority_colors.sql",
        });
      }
      console.error("PUT /priority-colors:", updateErr);
      return res.status(500).json({ success: false, message: "Save failed" });
    }

    res.json({ success: true, data: merged });
  } catch (err) {
    console.error("PUT /priority-colors:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/users/profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.UserID;

    const { data: user, error } = await supabase
      .from("Users")
      .select("UserID, Username, Email, HoTen, Phone, NgaySinh, GioiTinh, Bio, HocVan, AvatarUrl")
      .eq("UserID", userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      data: {
        id: user.UserID,
        username: user.Username,
        email: user.Email,
        hoten: user.HoTen,
        phone: user.Phone,
        ngaysinh: user.NgaySinh,
        gioitinh: user.GioiTinh,
        bio: user.Bio,
        hocvan: user.HocVan || null,
        avatarUrl: user.AvatarUrl || null,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res
      .status(500)
      .json({ message: "Error fetching profile", error: error.message });
  }
});

// PUT /api/users/:id
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUserId = req.user.UserID;

    if (userId !== currentUserId && currentUserId !== 1) {
      return res
        .status(403)
        .json({ message: "Không có quyền cập nhật thông tin này" });
    }

    const { hoten, email, phone, ngaysinh, gioitinh, bio, hocvan } = req.body;

    if (!hoten || !email) {
      return res.status(400).json({ message: "Họ tên và email là bắt buộc" });
    }

    // Validate education enum (nullable → skip).
    let hocvanClean = null;
    if (hocvan !== undefined && hocvan !== null && hocvan !== "") {
      if (!ALLOWED_HOCVAN.has(String(hocvan))) {
        return res.status(400).json({ message: "Học vấn không hợp lệ" });
      }
      hocvanClean = String(hocvan);
    }

    const { data: updated, error } = await supabase
      .from("Users")
      .update({
        HoTen: hoten || "",
        Email: email || "",
        Phone: phone || null,
        NgaySinh: ngaysinh || null,
        GioiTinh: gioitinh || null,
        Bio: bio || null,
        HocVan: hocvanClean,
      })
      .eq("UserID", userId)
      .select("UserID, Username, Email, HoTen, Phone, NgaySinh, GioiTinh, Bio, HocVan, AvatarUrl");

    if (error || !updated || updated.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const u = updated[0];
    res.json({
      success: true,
      message: "Thông tin cá nhân được cập nhật thành công",
      data: {
        id: u.UserID,
        username: u.Username,
        email: u.Email,
        hoten: u.HoTen,
        phone: u.Phone,
        ngaysinh: u.NgaySinh,
        gioitinh: u.GioiTinh,
        bio: u.Bio,
        hocvan: u.HocVan || null,
        avatarUrl: u.AvatarUrl || null,
      },
    });

    console.log(`User ${userId} profile updated`);
  } catch (error) {
    console.error("Error updating user profile:", error);
    res
      .status(500)
      .json({ message: "Error updating profile", error: error.message });
  }
});

// GET /api/users/:id
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUserId = req.user.UserID;

    if (userId !== currentUserId && currentUserId !== 1) {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    const { data: user, error } = await supabase
      .from("Users")
      .select("UserID, Username, Email, HoTen, Phone, NgaySinh, GioiTinh, Bio")
      .eq("UserID", userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      data: {
        id: user.UserID,
        username: user.Username,
        email: user.Email,
        hoten: user.HoTen,
        phone: user.Phone,
        ngaysinh: user.NgaySinh,
        gioitinh: user.GioiTinh,
        bio: user.Bio,
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res
      .status(500)
      .json({ message: "Error fetching user", error: error.message });
  }
});

// DELETE /api/users/:id
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUserId = req.user.UserID;

    if (userId !== currentUserId && currentUserId !== 1) {
      return res
        .status(403)
        .json({ message: "Không có quyền xóa tài khoản này" });
    }

    const { error } = await supabase
      .from("Users")
      .delete()
      .eq("UserID", userId);

    if (error) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      message: "Tài khoản được xóa thành công",
    });

    console.log(`User ${userId} account deleted`);
  } catch (error) {
    console.error("Error deleting user:", error);
    res
      .status(500)
      .json({ message: "Error deleting user", error: error.message });
  }
});

// PUT /api/users/:id/password
// Body: { oldPassword, newPassword }. Verifies oldPassword via bcrypt,
// hashes newPassword, updates Users.Password. Self-only.
router.put("/:id/password", authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const currentUserId = req.user.UserID;
    if (userId !== currentUserId) {
      return res.status(403).json({ message: "Không có quyền đổi mật khẩu người khác" });
    }
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Thiếu mật khẩu cũ hoặc mới" });
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({ message: "Mật khẩu mới tối thiểu 6 ký tự" });
    }

    const { data: user, error: loadErr } = await supabase
      .from("Users")
      .select("UserID, Password")
      .eq("UserID", userId)
      .single();
    if (loadErr || !user) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }

    const ok = await bcrypt.compare(String(oldPassword), user.Password || "");
    if (!ok) {
      return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
    }

    const hashed = await bcrypt.hash(String(newPassword), 12);
    const { error: updErr } = await supabase
      .from("Users")
      .update({ Password: hashed })
      .eq("UserID", userId);
    if (updErr) {
      console.error("password update error:", updErr);
      return res.status(500).json({ message: "Không đổi được mật khẩu" });
    }

    return res.json({ success: true, message: "Đổi mật khẩu thành công" });
  } catch (err) {
    console.error("PUT /users/:id/password:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

// POST /api/users/avatar
// Body: { dataUrl: "data:image/png;base64,..." }
// Decodes, uploads to Supabase Storage bucket "avatars" as
// {userId}/{timestamp}.{ext}, then saves the public URL to Users.AvatarUrl.
router.post("/avatar", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.UserID;
    const dataUrl = req.body?.dataUrl;
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
      return res.status(400).json({ message: "Thiếu dataUrl hợp lệ" });
    }
    const m = dataUrl.match(/^data:([\w/+.-]+);base64,(.+)$/);
    if (!m) {
      return res.status(400).json({ message: "dataUrl sai định dạng" });
    }
    const mime = m[1].toLowerCase();
    if (!ALLOWED_AVATAR_MIME.has(mime)) {
      return res.status(400).json({ message: "Chỉ chấp nhận PNG / JPG / WebP" });
    }
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > MAX_AVATAR_BYTES) {
      return res.status(413).json({ message: "Ảnh quá lớn (tối đa 2MB)" });
    }

    const ext = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, buf, {
        contentType: mime,
        cacheControl: "3600",
        upsert: true,
      });
    if (upErr) {
      console.error("avatar upload:", upErr);
      if (/bucket/i.test(upErr.message || "")) {
        return res.status(503).json({
          message:
            'Chưa có bucket "avatars" trên Supabase Storage — tạo bucket public cùng tên.',
        });
      }
      return res.status(500).json({ message: "Upload thất bại" });
    }

    const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    const publicUrl = pub?.publicUrl || null;
    if (!publicUrl) {
      return res.status(500).json({ message: "Không lấy được URL công khai" });
    }

    const { error: saveErr } = await supabase
      .from("Users")
      .update({ AvatarUrl: publicUrl })
      .eq("UserID", userId);
    if (saveErr) {
      console.error("avatar save:", saveErr);
      return res.status(500).json({ message: "Không lưu được AvatarUrl" });
    }

    return res.json({ success: true, data: { avatarUrl: publicUrl } });
  } catch (err) {
    console.error("POST /users/avatar:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;
