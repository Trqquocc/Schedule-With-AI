const { supabase } = require("../config/database");
const { moderateContent } = require("../lib/content-moderation");

const VALID_MESSAGE_TYPES = ["text", "task_share", "schedule_share"];
const MAX_CONTENT_LENGTH = 2000;
const MAX_METADATA_LENGTH = 5000;
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;

function validateMessage({ noiDung, loaiTinNhan, metaData }) {
  const trimmed = typeof noiDung === "string" ? noiDung.trim() : "";
  if (!trimmed || trimmed.length > MAX_CONTENT_LENGTH) {
    throw { status: 400, message: "Nội dung tin nhắn phải từ 1-2000 ký tự" };
  }
  if (loaiTinNhan && !VALID_MESSAGE_TYPES.includes(loaiTinNhan)) {
    throw { status: 400, message: "Loại tin nhắn không hợp lệ" };
  }
  if (metaData && JSON.stringify(metaData).length > MAX_METADATA_LENGTH) {
    throw { status: 400, message: "MetaData vượt quá giới hạn cho phép" };
  }
  const modResult = moderateContent(trimmed);
  if (modResult.blocked) {
    throw { status: 403, message: `Tin nhắn bị từ chối: nội dung vi phạm quy định (${modResult.label})` };
  }
  return trimmed;
}

async function verifyMembership(conversationId, userId) {
  const { data, error } = await supabase
    .from("ThanhVienHoiThoai")
    .select("MaThanhVien")
    .eq("MaHoiThoai", conversationId)
    .eq("MaNguoiDung", userId)
    .single();

  if (error || !data) throw { status: 403, message: "Không có quyền truy cập cuộc hội thoại này" };
}

async function sendMessage(conversationId, senderId, { noiDung, loaiTinNhan = "text", metaData = null }) {
  const trimmedContent = validateMessage({ noiDung, loaiTinNhan, metaData });

  await verifyMembership(conversationId, senderId);

  const { data: msg, error: insertErr } = await supabase
    .from("TinNhan")
    .insert({
      MaHoiThoai: conversationId,
      NguoiGui: senderId,
      NoiDung: trimmedContent,
      LoaiTinNhan: loaiTinNhan,
      MetaData: metaData,
      NgayGui: new Date().toISOString(),
      DaXoa: false,
    })
    .select()
    .single();

  if (insertErr) throw insertErr;

  const now = new Date().toISOString();

  // Update conversation's last message info
  await supabase
    .from("HoiThoai")
    .update({ TinNhanCuoi: trimmedContent, ThoiGianCuoi: now })
    .eq("MaHoiThoai", conversationId);

  // Reset DaDoc=false for all other members
  await supabase
    .from("ThanhVienHoiThoai")
    .update({ DaDoc: false })
    .eq("MaHoiThoai", conversationId)
    .neq("MaNguoiDung", senderId);

  return msg;
}

async function getMessages(conversationId, userId, { before, limit }) {
  const parsedLimit = Math.min(Math.max(parseInt(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  await verifyMembership(conversationId, userId);

  let query = supabase
    .from("TinNhan")
    .select("MaTinNhan, MaHoiThoai, NguoiGui, NoiDung, LoaiTinNhan, MetaData, NgayGui, DaXoa")
    .eq("MaHoiThoai", conversationId)
    .eq("DaXoa", false)
    .order("NgayGui", { ascending: false })
    .limit(parsedLimit);

  if (before) {
    query = query.lt("NgayGui", before);
  }

  const { data, error } = await query;
  if (error) throw error;

  const messages = (data || []).reverse();

  const senderIds = [...new Set(messages.map((m) => m.NguoiGui).filter(Boolean))];
  let userMap = {};
  if (senderIds.length > 0) {
    const { data: users } = await supabase
      .from("NguoiDung")
      .select("MaNguoiDung, HoTen, AvatarUrl")
      .in("MaNguoiDung", senderIds);
    if (users) {
      users.forEach(u => { userMap[u.MaNguoiDung] = u; });
    }
  }

  return messages.map((m) => ({
    ...m,
    senderName: userMap[m.NguoiGui]?.HoTen || null,
    senderAvatar: userMap[m.NguoiGui]?.AvatarUrl || null,
  }));
}

async function deleteMessage(messageId, userId) {
  const { data: msg, error: fetchErr } = await supabase
    .from("TinNhan")
    .select("MaTinNhan, NguoiGui, DaXoa")
    .eq("MaTinNhan", messageId)
    .single();

  if (fetchErr || !msg) throw { status: 404, message: "Không tìm thấy tin nhắn" };
  if (msg.DaXoa) throw { status: 404, message: "Tin nhắn không tồn tại" };
  if (msg.NguoiGui !== userId) throw { status: 403, message: "Không có quyền xóa tin nhắn này" };

  const { error } = await supabase
    .from("TinNhan")
    .update({ DaXoa: true })
    .eq("MaTinNhan", messageId);

  if (error) throw error;
}

async function editMessage(messageId, userId, noiDung) {
  const trimmed = typeof noiDung === "string" ? noiDung.trim() : "";
  if (!trimmed || trimmed.length > MAX_CONTENT_LENGTH) {
    throw { status: 400, message: "Nội dung tin nhắn phải từ 1-2000 ký tự" };
  }
  const modResult = moderateContent(trimmed);
  if (modResult.blocked) {
    throw { status: 403, message: `Tin nhắn bị từ chối: nội dung vi phạm quy định (${modResult.label})` };
  }

  const { data: msg, error: fetchErr } = await supabase
    .from("TinNhan")
    .select("MaTinNhan, NguoiGui, DaXoa, MaHoiThoai")
    .eq("MaTinNhan", messageId)
    .single();

  if (fetchErr || !msg) throw { status: 404, message: "Không tìm thấy tin nhắn" };
  if (msg.DaXoa) throw { status: 400, message: "Không thể sửa tin nhắn đã thu hồi" };
  if (msg.NguoiGui !== userId) throw { status: 403, message: "Không có quyền sửa tin nhắn này" };

  const { error } = await supabase
    .from("TinNhan")
    .update({ NoiDung: trimmed })
    .eq("MaTinNhan", messageId);

  if (error) throw error;
}

module.exports = { sendMessage, getMessages, deleteMessage, editMessage };
