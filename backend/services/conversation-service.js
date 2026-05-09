const { supabase } = require("../config/database");
const { buildDirectDisplayNames, buildGroupDisplayNames } = require("./conversation-display-helpers");

async function listConversations(userId) {
  const { data: memberships, error: mErr } = await supabase
    .from("ThanhVienHoiThoai")
    .select("MaHoiThoai, DaDoc")
    .eq("MaNguoiDung", userId);

  if (mErr) throw mErr;
  if (!memberships || memberships.length === 0) return [];

  const convIds = memberships.map((m) => m.MaHoiThoai);
  const readMap = Object.fromEntries(memberships.map((m) => [m.MaHoiThoai, m.DaDoc]));

  const { data: convs, error: cErr } = await supabase
    .from("HoiThoai")
    .select("MaHoiThoai, LoaiHoiThoai, MaNhom, TinNhanCuoi, ThoiGianCuoi")
    .in("MaHoiThoai", convIds)
    .order("ThoiGianCuoi", { ascending: false, nullsFirst: false });

  if (cErr) throw cErr;
  if (!convs || convs.length === 0) return [];

  const directIds = convs.filter((c) => c.LoaiHoiThoai === "direct").map((c) => c.MaHoiThoai);
  const groupIds = convs.filter((c) => c.LoaiHoiThoai === "group" && c.MaNhom).map((c) => c.MaNhom);

  const [directNameMap, groupNameMap] = await Promise.all([
    buildDirectDisplayNames(directIds, userId),
    buildGroupDisplayNames(groupIds),
  ]);

  return convs.map((c) => {
    const direct = directNameMap[c.MaHoiThoai];
    return {
      conversationId: c.MaHoiThoai,
      type: c.LoaiHoiThoai,
      displayName:
        c.LoaiHoiThoai === "direct"
          ? (direct?.name || "Unknown")
          : groupNameMap[c.MaNhom] || "Group",
      avatarUrl:
        c.LoaiHoiThoai === "direct" ? (direct?.avatarUrl || null) : null,
      equippedBadge:
        c.LoaiHoiThoai === "direct" ? (direct?.equippedBadge || null) : null,
      lastMessage: c.TinNhanCuoi,
      lastMessageAt: c.ThoiGianCuoi,
      isRead: readMap[c.MaHoiThoai] !== false,
    };
  });
}

async function getOrCreateDirect(userId, targetUserId) {
  const { data: friendship } = await supabase
    .from("BanBe")
    .select("MaKetBan")
    .or(
      `and(NguoiGui.eq.${userId},NguoiNhan.eq.${targetUserId}),and(NguoiGui.eq.${targetUserId},NguoiNhan.eq.${userId})`
    )
    .eq("TrangThai", "accepted")
    .single();

  if (!friendship) throw { status: 403, message: "Chưa kết bạn với người dùng này" };
  const { data: userConvs } = await supabase
    .from("ThanhVienHoiThoai")
    .select("MaHoiThoai")
    .eq("MaNguoiDung", userId);

  if (userConvs && userConvs.length > 0) {
    const userConvIds = userConvs.map((c) => c.MaHoiThoai);

    const { data: targetConvs } = await supabase
      .from("ThanhVienHoiThoai")
      .select("MaHoiThoai")
      .eq("MaNguoiDung", targetUserId)
      .in("MaHoiThoai", userConvIds);

    if (targetConvs && targetConvs.length > 0) {
      const sharedIds = targetConvs.map((c) => c.MaHoiThoai);
      const { data: direct } = await supabase
        .from("HoiThoai")
        .select("*")
        .in("MaHoiThoai", sharedIds)
        .eq("LoaiHoiThoai", "direct")
        .single();

      if (direct) return { conversation: direct, created: false };
    }
  }

  const { data: conv, error: cErr } = await supabase
    .from("HoiThoai")
    .insert({ LoaiHoiThoai: "direct", NgayTao: new Date().toISOString() })
    .select()
    .single();

  if (cErr) throw cErr;
  const { error: mErr } = await supabase.from("ThanhVienHoiThoai").insert([
    { MaHoiThoai: conv.MaHoiThoai, MaNguoiDung: userId, NgayThamGia: new Date().toISOString() },
    { MaHoiThoai: conv.MaHoiThoai, MaNguoiDung: targetUserId, NgayThamGia: new Date().toISOString() },
  ]);

  if (mErr) throw mErr;

  return { conversation: conv, created: true };
}

async function getGroupConversation(groupId, userId) {
  const { data: member } = await supabase
    .from("ThanhVienNhom")
    .select("MaThanhVien")
    .eq("MaNhom", groupId)
    .eq("MaNguoiDung", userId)
    .single();

  if (!member) throw { status: 403, message: "Không phải thành viên của nhóm này" };

  const { data: conv, error } = await supabase
    .from("HoiThoai")
    .select("*")
    .eq("MaNhom", groupId)
    .eq("LoaiHoiThoai", "group")
    .single();

  if (error || !conv) throw { status: 404, message: "Không tìm thấy cuộc hội thoại nhóm" };

  return conv;
}

async function markAsRead(conversationId, userId) {
  const { error } = await supabase
    .from("ThanhVienHoiThoai")
    .update({ DaDoc: true })
    .eq("MaHoiThoai", conversationId)
    .eq("MaNguoiDung", userId);

  if (error) throw error;
}

async function createGroupConversation(groupId, memberUserIds) {
  const { data: conv, error: cErr } = await supabase
    .from("HoiThoai")
    .insert({ LoaiHoiThoai: "group", MaNhom: groupId, NgayTao: new Date().toISOString() })
    .select()
    .single();

  if (cErr) throw cErr;

  const now = new Date().toISOString();
  const members = memberUserIds.map((uid) => ({
    MaHoiThoai: conv.MaHoiThoai,
    MaNguoiDung: uid,
    NgayThamGia: now,
  }));

  const { error: mErr } = await supabase.from("ThanhVienHoiThoai").insert(members);
  if (mErr) throw mErr;

  return conv;
}

async function addMemberToGroupConversation(groupId, userId) {
  const { data: conv } = await supabase
    .from("HoiThoai")
    .select("MaHoiThoai")
    .eq("MaNhom", groupId)
    .eq("LoaiHoiThoai", "group")
    .single();

  if (!conv) return;

  const { data: existing } = await supabase
    .from("ThanhVienHoiThoai")
    .select("MaThanhVien")
    .eq("MaHoiThoai", conv.MaHoiThoai)
    .eq("MaNguoiDung", userId)
    .single();

  if (existing) return;

  await supabase.from("ThanhVienHoiThoai").insert({
    MaHoiThoai: conv.MaHoiThoai,
    MaNguoiDung: userId,
    NgayThamGia: new Date().toISOString(),
  });
}

async function getUnreadCount(userId) {
  const { count, error } = await supabase
    .from("ThanhVienHoiThoai")
    .select("*", { count: "exact", head: true })
    .eq("MaNguoiDung", userId)
    .eq("DaDoc", false);

  if (error) throw error;
  return count || 0;
}

module.exports = {
  listConversations,
  getOrCreateDirect,
  getGroupConversation,
  markAsRead,
  createGroupConversation,
  addMemberToGroupConversation,
  getUnreadCount,
};
