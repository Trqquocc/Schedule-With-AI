// friends.js — Express router for friend system
// Endpoints: request, list, pending, accept, reject, unfriend, search
const express = require("express");
const router = express.Router();
const { supabase } = require("../config/database");

const MAX_FRIENDS = 50;

// POST /api/friends/request — send friend request
router.post("/request", async (req, res) => {
  try {
    const requesterId = req.userId;
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ success: false, message: "Email không hợp lệ" });
    }

    const { data: target, error: userErr } = await supabase
      .from("NguoiDung")
      .select("MaNguoiDung")
      .eq("Email", email.trim().toLowerCase())
      .single();

    if (userErr || !target) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    }
    if (target.MaNguoiDung === requesterId) {
      return res.status(400).json({ success: false, message: "Không thể kết bạn với chính mình" });
    }

    // Check existing friendship in either direction
    const { data: existing } = await supabase
      .from("BanBe")
      .select("MaKetBan, TrangThai, NguoiGui")
      .or(`and(NguoiGui.eq.${requesterId},NguoiNhan.eq.${target.MaNguoiDung}),and(NguoiGui.eq.${target.MaNguoiDung},NguoiNhan.eq.${requesterId})`);

    if (existing && existing.length > 0) {
      const f = existing[0];
      if (f.TrangThai === "accepted") {
        return res.status(400).json({ success: false, message: "Đã là bạn bè" });
      }
      if (f.TrangThai === "pending") {
        return res.status(400).json({ success: false, message: "Lời mời đã được gửi trước đó" });
      }
      // rejected — allow re-request by updating
      await supabase.from("BanBe").update({ TrangThai: "pending", NguoiGui: requesterId, NguoiNhan: target.MaNguoiDung, NgayCapNhat: new Date().toISOString() }).eq("MaKetBan", f.MaKetBan); // f.MaKetBan from select above
      return res.json({ success: true, message: "Đã gửi lời mời kết bạn" });
    }

    // Check limit
    const { count } = await supabase
      .from("BanBe")
      .select("MaKetBan", { count: "exact", head: true })
      .eq("TrangThai", "accepted")
      .or(`NguoiGui.eq.${requesterId},NguoiNhan.eq.${requesterId}`);

    if (count >= MAX_FRIENDS) {
      return res.status(400).json({ success: false, message: `Tối đa ${MAX_FRIENDS} bạn bè` });
    }

    const { error: insertErr } = await supabase.from("BanBe").insert({
      NguoiGui: requesterId,
      NguoiNhan: target.MaNguoiDung,
      TrangThai: "pending",
    });

    if (insertErr) throw insertErr;
    return res.json({ success: true, message: "Đã gửi lời mời kết bạn" });
  } catch (err) {
    console.error("[friends] request error:", err);
    return res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
});

// GET /api/friends — list accepted friends
router.get("/", async (req, res) => {
  try {
    const userId = req.userId;

    const { data, error } = await supabase
      .from("BanBe")
      .select(`MaKetBan, NguoiGui, NguoiNhan, NgayTao,
        Requester:NguoiDung!BanBe_NguoiGui_fkey(MaNguoiDung, HoTen, Email, AvatarUrl, EquippedBadge),
        Receiver:NguoiDung!BanBe_NguoiNhan_fkey(MaNguoiDung, HoTen, Email, AvatarUrl, EquippedBadge)`)
      .eq("TrangThai", "accepted")
      .or(`NguoiGui.eq.${userId},NguoiNhan.eq.${userId}`)
      .order("NgayTao", { ascending: false });

    if (error) throw error;

    const friends = (data || []).map((f) => {
      const friend = f.NguoiGui === userId ? f.Receiver : f.Requester;
      return {
        MaKetBan: f.MaKetBan,
        MaNguoiDung: friend.MaNguoiDung,
        HoTen: friend.HoTen,
        Email: friend.Email,
        AvatarUrl: friend.AvatarUrl,
        EquippedBadge: friend.EquippedBadge || null,
        NgayTao: f.NgayTao,
      };
    });

    // Enrich with gamification data (streak, level)
    const friendIds = friends.map((f) => f.MaNguoiDung);
    if (friendIds.length > 0) {
      const { data: gamRows } = await supabase
        .from("ThanhTich")
        .select("MaNguoiDung, CapDo, DiemKinhNghiem, ChuoiNgay")
        .in("MaNguoiDung", friendIds);
      const gamMap = Object.fromEntries((gamRows || []).map((g) => [g.MaNguoiDung, g]));
      friends.forEach((f) => {
        const g = gamMap[f.MaNguoiDung];
        f.Level = g?.CapDo || 1;
        f.XP = g?.DiemKinhNghiem || 0;
        f.Streak = g?.ChuoiNgay || 0;
      });
    }

    return res.json({ success: true, data: friends });
  } catch (err) {
    console.error("[friends] list error:", err);
    return res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
});

// GET /api/friends/requests — pending requests received
router.get("/requests", async (req, res) => {
  try {
    const userId = req.userId;

    const { data, error } = await supabase
      .from("BanBe")
      .select(`MaKetBan, NgayTao,
        Requester:NguoiDung!BanBe_NguoiGui_fkey(MaNguoiDung, HoTen, Email, AvatarUrl, EquippedBadge)`)
      .eq("NguoiNhan", userId)
      .eq("TrangThai", "pending")
      .order("NgayTao", { ascending: false });

    if (error) throw error;
    return res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error("[friends] requests error:", err);
    return res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
});

// GET /api/friends/sent — pending requests I sent
router.get("/sent", async (req, res) => {
  try {
    const userId = req.userId;

    const { data, error } = await supabase
      .from("BanBe")
      .select(`MaKetBan, NgayTao,
        Receiver:NguoiDung!BanBe_NguoiNhan_fkey(MaNguoiDung, HoTen, Email, AvatarUrl, EquippedBadge)`)
      .eq("NguoiGui", userId)
      .eq("TrangThai", "pending")
      .order("NgayTao", { ascending: false });

    if (error) throw error;
    return res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error("[friends] sent error:", err);
    return res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
});

// PUT /api/friends/:id/accept
router.put("/:id/accept", async (req, res) => {
  try {
    const userId = req.userId;
    const friendshipId = parseInt(req.params.id, 10);

    const { data, error } = await supabase
      .from("BanBe")
      .update({ TrangThai: "accepted", NgayCapNhat: new Date().toISOString() })
      .eq("MaKetBan", friendshipId)
      .eq("NguoiNhan", userId)
      .eq("TrangThai", "pending")
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lời mời" });
    }

    // Auto create 1-1 conversation
    try {
      const { getOrCreateDirect } = require("../services/conversation-service");
      await getOrCreateDirect(userId, data.NguoiGui);
    } catch (_) {}

    return res.json({ success: true, message: "Đã chấp nhận lời mời" });
  } catch (err) {
    console.error("[friends] accept error:", err);
    return res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
});

// PUT /api/friends/:id/reject
router.put("/:id/reject", async (req, res) => {
  try {
    const userId = req.userId;
    const friendshipId = parseInt(req.params.id, 10);

    const { data, error } = await supabase
      .from("BanBe")
      .update({ TrangThai: "rejected", NgayCapNhat: new Date().toISOString() })
      .eq("MaKetBan", friendshipId)
      .eq("NguoiNhan", userId)
      .eq("TrangThai", "pending")
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lời mời" });
    }
    return res.json({ success: true, message: "Đã từ chối lời mời" });
  } catch (err) {
    console.error("[friends] reject error:", err);
    return res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
});

// DELETE /api/friends/:id — unfriend
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.userId;
    const friendshipId = parseInt(req.params.id, 10);

    const { data, error } = await supabase
      .from("BanBe")
      .delete()
      .eq("MaKetBan", friendshipId)
      .or(`NguoiGui.eq.${userId},NguoiNhan.eq.${userId}`)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: "Không tìm thấy" });
    }
    return res.json({ success: true, message: "Đã huỷ kết bạn" });
  } catch (err) {
    console.error("[friends] unfriend error:", err);
    return res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
});

// GET /api/friends/search?q=keyword — search users by name or email
router.get("/search", async (req, res) => {
  try {
    const userId = req.userId;
    const q = (req.query.q || "").trim();

    if (q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    // Sanitize for PostgREST ilike filter
    const safeQ = q.replace(/[%_\\]/g, "\\$&");

    const { data, error } = await supabase
      .from("NguoiDung")
      .select("MaNguoiDung, HoTen, Email, AvatarUrl, EquippedBadge")
      .neq("MaNguoiDung", userId)
      .or(`HoTen.ilike.%${safeQ}%,Email.ilike.%${safeQ}%`)
      .limit(10);

    if (error) throw error;
    return res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error("[friends] search error:", err);
    return res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
});

module.exports = router;
