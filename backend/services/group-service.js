// group-service.js — CRUD for Groups table + shared auth helpers
const { supabase } = require("../config/database");

const MAX_GROUPS_OWNED = 10;
const MAX_MEMBERS = 20;

async function getMemberRole(groupId, userId) {
  const { data } = await supabase
    .from("ThanhVienNhom")
    .select("VaiTro")
    .eq("MaNhom", groupId)
    .eq("MaNguoiDung", userId)
    .single();
  return data?.VaiTro || null;
}

async function isOwnerOrAdmin(groupId, userId) {
  const role = await getMemberRole(groupId, userId);
  return role === "owner" || role === "admin";
}

async function createGroup(ownerId, { tenNhom, moTa }) {
  tenNhom = (tenNhom || "").trim();
  if (!tenNhom || tenNhom.length > 100) throw { status: 400, message: "Tên nhóm từ 1-100 ký tự" };
  if (moTa && moTa.length > 500) throw { status: 400, message: "Mô tả tối đa 500 ký tự" };

  const { count } = await supabase
    .from("NhomLamViec")
    .select("MaNhom", { count: "exact", head: true })
    .eq("MaChuNhom", ownerId);

  if (count >= MAX_GROUPS_OWNED) {
    throw { status: 400, message: `Tối đa ${MAX_GROUPS_OWNED} nhóm do bạn tạo` };
  }

  const now = new Date().toISOString();
  const { data: group, error } = await supabase
    .from("NhomLamViec")
    .insert({ TenNhom: tenNhom, MoTa: moTa || null, MaChuNhom: ownerId, SoThanhVienToiDa: MAX_MEMBERS, NgayTao: now, NgayCapNhat: now })
    .select()
    .single();

  if (error) throw error;

  const { error: memberErr } = await supabase
    .from("ThanhVienNhom")
    .insert({ MaNhom: group.MaNhom, MaNguoiDung: ownerId, VaiTro: "owner", NgayThamGia: now });

  if (memberErr) throw memberErr;

  // Attempt to create group conversation — skip if service unavailable
  try {
    const convService = require("./conversation-service");
    if (typeof convService.createGroupConversation === "function") {
      await convService.createGroupConversation(group.MaNhom, [ownerId]);
    }
  } catch (_) {}

  return group;
}

async function listMyNhomLamViec(userId) {
  const { data: memberships, error } = await supabase
    .from("ThanhVienNhom")
    .select("MaNhom, VaiTro, NgayThamGia")
    .eq("MaNguoiDung", userId);

  if (error) throw error;

  const groupIds = (memberships || []).map(m => m.MaNhom).filter(Boolean);
  if (groupIds.length === 0) return [];

  const { data: groups } = await supabase
    .from("NhomLamViec")
    .select("MaNhom, TenNhom, MoTa, AvatarUrl, MaChuNhom, SoThanhVienToiDa, NgayTao")
    .in("MaNhom", groupIds);

  const groupMap = {};
  (groups || []).forEach(g => { groupMap[g.MaNhom] = g; });

  const { data: counts } = await supabase.from("ThanhVienNhom").select("MaNhom").in("MaNhom", groupIds);
  const countMap = {};
  (counts || []).forEach(({ MaNhom }) => { countMap[MaNhom] = (countMap[MaNhom] || 0) + 1; });

  return (memberships || []).filter(m => groupMap[m.MaNhom]).map(m => ({
    ...groupMap[m.MaNhom],
    myRole: m.VaiTro,
    joinedAt: m.NgayThamGia,
    memberCount: countMap[m.MaNhom] || 0,
  }));
}

async function getGroupDetail(groupId, userId) {
  const role = await getMemberRole(groupId, userId);
  if (!role) throw { status: 403, message: "Bạn không phải thành viên nhóm này" };

  const { data: group, error: gErr } = await supabase.from("NhomLamViec").select("*").eq("MaNhom", groupId).single();
  if (gErr || !group) throw { status: 404, message: "Không tìm thấy nhóm" };

  const { data: membersRaw, error: mErr } = await supabase
    .from("ThanhVienNhom")
    .select("MaThanhVien, MaNguoiDung, VaiTro, NgayThamGia")
    .eq("MaNhom", groupId);

  if (mErr) throw mErr;

  const userIds = (membersRaw || []).map(m => m.MaNguoiDung).filter(Boolean);
  let userMap = {};
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("NguoiDung")
      .select("MaNguoiDung, HoTen, Email, AvatarUrl, EquippedBadge")
      .in("MaNguoiDung", userIds);
    (users || []).forEach(u => { userMap[u.MaNguoiDung] = u; });
  }

  const members = (membersRaw || []).map(m => ({
    ...m,
    ...(userMap[m.MaNguoiDung] || {}),
  }));

  return { ...group, myRole: role, members };
}

async function updateGroup(groupId, userId, { tenNhom, moTa, avatarUrl }) {
  const allowed = await isOwnerOrAdmin(groupId, userId);
  if (!allowed) throw { status: 403, message: "Chỉ chủ nhóm/admin được sửa" };

  const patch = { NgayCapNhat: new Date().toISOString() };
  if (tenNhom !== undefined) {
    tenNhom = tenNhom.trim();
    if (!tenNhom || tenNhom.length > 100) throw { status: 400, message: "Tên nhóm từ 1-100 ký tự" };
    patch.TenNhom = tenNhom;
  }
  if (moTa !== undefined) {
    if (moTa && moTa.length > 500) throw { status: 400, message: "Mô tả tối đa 500 ký tự" };
    patch.MoTa = moTa || null;
  }
  if (avatarUrl !== undefined) patch.AvatarUrl = avatarUrl || null;

  const { data, error } = await supabase.from("NhomLamViec").update(patch).eq("MaNhom", groupId).select().single();
  if (error || !data) throw error || { status: 404, message: "Không tìm thấy nhóm" };
  return data;
}

async function deleteGroup(groupId, userId) {
  const role = await getMemberRole(groupId, userId);
  if (role !== "owner") throw { status: 403, message: "Chỉ chủ nhóm được xóa" };

  // Cascade delete related data
  const { data: convos } = await supabase.from("HoiThoai").select("MaHoiThoai").eq("MaNhom", groupId);
  const convoIds = (convos || []).map((c) => c.MaHoiThoai);
  if (convoIds.length > 0) {
    await supabase.from("TinNhan").delete().in("MaHoiThoai", convoIds);
    await supabase.from("HoiThoai").delete().eq("MaNhom", groupId);
  }
  await supabase.from("CongViecNhom").delete().eq("MaNhom", groupId);
  await supabase.from("ThanhVienNhom").delete().eq("MaNhom", groupId);

  const { error } = await supabase.from("NhomLamViec").delete().eq("MaNhom", groupId);
  if (error) throw error;
}

module.exports = { getMemberRole, isOwnerOrAdmin, createGroup, listMyNhomLamViec, getGroupDetail, updateGroup, deleteGroup };
