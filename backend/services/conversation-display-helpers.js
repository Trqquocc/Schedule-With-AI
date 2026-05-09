const { supabase } = require("../config/database");

// Builds a map of MaHoiThoai -> other user's HoTen for direct conversations
async function buildDirectDisplayNames(directConvIds, currentUserId) {
  if (!directConvIds.length) return {};

  const { data: others } = await supabase
    .from("ThanhVienHoiThoai")
    .select("MaHoiThoai, MaNguoiDung")
    .in("MaHoiThoai", directConvIds)
    .neq("MaNguoiDung", currentUserId);

  if (!others || others.length === 0) return {};

  const otherUserIds = [...new Set(others.map((o) => o.MaNguoiDung))];
  const { data: users } = await supabase
    .from("NguoiDung")
    .select("MaNguoiDung, HoTen, AvatarUrl, EquippedBadge")
    .in("MaNguoiDung", otherUserIds);

  const userMap = users ? Object.fromEntries(users.map((u) => [u.MaNguoiDung, u])) : {};
  return Object.fromEntries(others.map((o) => {
    const u = userMap[o.MaNguoiDung];
    return [o.MaHoiThoai, { name: u?.HoTen || "Unknown", avatarUrl: u?.AvatarUrl || null, equippedBadge: u?.EquippedBadge || null }];
  }));
}

// Builds a map of MaNhom -> TenNhom for group conversations
async function buildGroupDisplayNames(groupIds) {
  if (!groupIds.length) return {};

  const { data: groups } = await supabase
    .from("NhomLamViec")
    .select("MaNhom, TenNhom")
    .in("MaNhom", groupIds);

  return groups ? Object.fromEntries(groups.map((g) => [g.MaNhom, g.TenNhom])) : {};
}

module.exports = { buildDirectDisplayNames, buildGroupDisplayNames };
