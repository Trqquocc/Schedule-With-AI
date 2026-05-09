// group-task-service.js — business logic for GroupTasks
const { supabase } = require("../config/database");
const { getMemberRole, isOwnerOrAdmin } = require("./group-service");
const sync = require("./group-task-sync-service");

const VALID_STATUSES = new Set(["pending", "in_progress", "completed", "cancelled"]);
const VALID_PRIORITIES = new Set([1, 2, 3, 4]);

async function createTask(actorId, { groupId, assignedTo, tieuDe, moTa, mucDoUuTien, hanChot }) {
  groupId = parseInt(groupId, 10);
  assignedTo = parseInt(assignedTo, 10);
  if (!groupId || !assignedTo) throw { status: 400, message: "groupId và assignedTo là bắt buộc" };

  tieuDe = (tieuDe || "").trim();
  if (!tieuDe || tieuDe.length > 200) throw { status: 400, message: "Tiêu đề từ 1-200 ký tự" };

  const allowed = await isOwnerOrAdmin(groupId, actorId);
  if (!allowed) throw { status: 403, message: "Chỉ chủ nhóm/admin được tạo nhiệm vụ" };

  const assigneeRole = await getMemberRole(groupId, assignedTo);
  if (!assigneeRole) throw { status: 400, message: "Người được giao phải là thành viên nhóm" };

  const priority = mucDoUuTien ? parseInt(mucDoUuTien, 10) : 2;
  if (!VALID_PRIORITIES.has(priority)) throw { status: 400, message: "Mức độ ưu tiên từ 1-4" };

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("CongViecNhom")
    .insert({
      MaNhom: groupId,
      NguoiNhan: assignedTo,
      NguoiGiao: actorId,
      TieuDe: tieuDe,
      MoTa: moTa || null,
      TrangThai: "pending",
      MucDoUuTien: priority,
      HanChot: hanChot || null,
      NgayTao: now,
      NgayCapNhat: now,
    })
    .select()
    .single();

  if (error) throw error;

  const { data: grp } = await supabase.from("NhomLamViec").select("TenNhom").eq("MaNhom", groupId).maybeSingle();
  await sync.createPersonalTaskForGroupTask(data, grp?.TenNhom || "Nhóm");

  return data;
}

async function listTasks(actorId, groupId) {
  groupId = parseInt(groupId, 10);
  if (!groupId) throw { status: 400, message: "groupId là bắt buộc" };

  const role = await getMemberRole(groupId, actorId);
  if (!role) throw { status: 403, message: "Bạn không phải thành viên nhóm này" };

  const { data, error } = await supabase
    .from("CongViecNhom")
    .select("*")
    .eq("MaNhom", groupId)
    .order("NgayTao", { ascending: false });

  if (error) throw error;

  // Manual join for assignee names
  const assigneeIds = [...new Set((data || []).map(t => t.NguoiNhan).filter(Boolean))];
  if (assigneeIds.length > 0) {
    const { data: users } = await supabase.from("NguoiDung").select("MaNguoiDung, HoTen, AvatarUrl").in("MaNguoiDung", assigneeIds);
    const uMap = {};
    (users || []).forEach(u => { uMap[u.MaNguoiDung] = u; });
    for (const t of data || []) {
      t.Assignee = uMap[t.NguoiNhan] || null;
    }
  }

  const gtIds = (data || []).map((t) => t.MaCongViecNhom);
  const progressMap = await sync.getSessionProgress(gtIds);
  for (const t of data || []) {
    const p = progressMap.get(t.MaCongViecNhom);
    t.SessionCount = p?.total || 0;
    t.SessionDone = p?.done || 0;
    t.SessionPercent = p?.percent || 0;
    t.HasPersonalTask = p?.hasPersonalTask || false;
  }

  return data || [];
}

async function updateTask(taskId, actorId, patch) {
  const { data: task, error: fetchErr } = await supabase
    .from("CongViecNhom")
    .select("*")
    .eq("MaCongViecNhom", taskId)
    .single();

  if (fetchErr || !task) throw { status: 404, message: "Không tìm thấy nhiệm vụ" };

  const actorRole = await getMemberRole(task.MaNhom, actorId);
  if (!actorRole) throw { status: 403, message: "Bạn không phải thành viên nhóm này" };

  const isPrivileged = actorRole === "owner" || actorRole === "admin";
  const isAssignee = task.NguoiNhan === actorId;

  if (!isPrivileged && !isAssignee) throw { status: 403, message: "Không có quyền cập nhật nhiệm vụ này" };

  const update = { NgayCapNhat: new Date().toISOString() };

  if (!isPrivileged) {
    // Assignee can only update TrangThai
    if (patch.trangThai !== undefined) {
      if (!VALID_STATUSES.has(patch.trangThai)) throw { status: 400, message: "Trạng thái không hợp lệ" };
      update.TrangThai = patch.trangThai;
    }
  } else {
    if (patch.tieuDe !== undefined) {
      const tieuDe = patch.tieuDe.trim();
      if (!tieuDe || tieuDe.length > 200) throw { status: 400, message: "Tiêu đề từ 1-200 ký tự" };
      update.TieuDe = tieuDe;
    }
    if (patch.moTa !== undefined) update.MoTa = patch.moTa || null;
    if (patch.trangThai !== undefined) {
      if (!VALID_STATUSES.has(patch.trangThai)) throw { status: 400, message: "Trạng thái không hợp lệ" };
      update.TrangThai = patch.trangThai;
    }
    if (patch.mucDoUuTien !== undefined) {
      const p = parseInt(patch.mucDoUuTien, 10);
      if (!VALID_PRIORITIES.has(p)) throw { status: 400, message: "Mức độ ưu tiên từ 1-4" };
      update.MucDoUuTien = p;
    }
    if (patch.hanChot !== undefined) update.HanChot = patch.hanChot || null;
    if (patch.assignedTo !== undefined) {
      const newAssignee = parseInt(patch.assignedTo, 10);
      const assigneeRole = await getMemberRole(task.MaNhom, newAssignee);
      if (!assigneeRole) throw { status: 400, message: "Người được giao phải là thành viên nhóm" };
      update.NguoiNhan = newAssignee;
    }
  }

  const { data, error } = await supabase
    .from("CongViecNhom")
    .update(update)
    .eq("MaCongViecNhom", taskId)
    .select()
    .single();

  if (error) throw error;

  if (update.TrangThai) {
    await sync.syncStatusToPersonalTask(taskId, update.TrangThai);
  }

  return data;
}

async function deleteTask(taskId, actorId) {
  const { data: task, error: fetchErr } = await supabase
    .from("CongViecNhom")
    .select("MaNhom")
    .eq("MaCongViecNhom", taskId)
    .single();

  if (fetchErr || !task) throw { status: 404, message: "Không tìm thấy nhiệm vụ" };

  const allowed = await isOwnerOrAdmin(task.MaNhom, actorId);
  if (!allowed) throw { status: 403, message: "Chỉ chủ nhóm/admin được xóa nhiệm vụ" };

  await supabase.from("CongViec").update({ TrangThaiThucHien: 3 }).eq("MaCongViecNhom", taskId);

  const { error } = await supabase.from("CongViecNhom").delete().eq("MaCongViecNhom", taskId);
  if (error) throw error;
}

async function getProgress(actorId, groupId) {
  groupId = parseInt(groupId, 10);
  if (!groupId) throw { status: 400, message: "groupId là bắt buộc" };

  const role = await getMemberRole(groupId, actorId);
  if (!role) throw { status: 403, message: "Bạn không phải thành viên nhóm này" };

  const { data: membersRaw, error: mErr } = await supabase
    .from("ThanhVienNhom")
    .select("MaNguoiDung")
    .eq("MaNhom", groupId);

  if (mErr) throw mErr;

  const userIds = (membersRaw || []).map(m => m.MaNguoiDung).filter(Boolean);
  let userMap = {};
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("NguoiDung")
      .select("MaNguoiDung, HoTen")
      .in("MaNguoiDung", userIds);
    (users || []).forEach(u => { userMap[u.MaNguoiDung] = u; });
  }

  const { data: tasks, error: tErr } = await supabase
    .from("CongViecNhom")
    .select("NguoiNhan, TrangThai")
    .eq("MaNhom", groupId);

  if (tErr) throw tErr;

  const statsMap = {};
  (membersRaw || []).forEach(({ MaNguoiDung }) => {
    statsMap[MaNguoiDung] = { userId: MaNguoiDung, hoTen: userMap[MaNguoiDung]?.HoTen || "", total: 0, completed: 0 };
  });

  (tasks || []).forEach(({ NguoiNhan, TrangThai }) => {
    if (!statsMap[NguoiNhan]) return;
    statsMap[NguoiNhan].total += 1;
    if (TrangThai === "completed") statsMap[NguoiNhan].completed += 1;
  });

  const result = Object.values(statsMap).map((s) => ({
    ...s,
    percent: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
  }));

  return result;
}

async function getMyCalendarTasks(userId) {
  const { data: rawTasks, error } = await supabase
    .from("CongViecNhom")
    .select("*")
    .eq("NguoiNhan", userId)
    .not("HanChot", "is", null)
    .neq("TrangThai", "cancelled")
    .neq("TrangThai", "completed")
    .order("HanChot", { ascending: true });

  if (error) throw error;

  // Manual join for group names
  const groupIds = [...new Set((rawTasks || []).map(t => t.MaNhom).filter(Boolean))];
  let groupMap = {};
  if (groupIds.length > 0) {
    const { data: groups } = await supabase.from("NhomLamViec").select("MaNhom, TenNhom").in("MaNhom", groupIds);
    (groups || []).forEach(g => { groupMap[g.MaNhom] = g; });
  }

  const data = (rawTasks || []).map(t => ({
    ...t,
    NhomLamViec: groupMap[t.MaNhom] || null,
    Assignee: { HoTen: "" },
  }));

  const PRIO_COLORS = { 1: "#F87171", 2: "#60A5FA", 3: "#FBBF24", 4: "#94a3b8" };

  return (data || []).map((t) => {
    const color = PRIO_COLORS[t.MucDoUuTien] || "#60A5FA";
    const deadline = new Date(t.HanChot);
    return {
      id: `gt-${t.MaCongViecNhom}`,
      title: t.TieuDe,
      start: deadline.toISOString().slice(0, 10),
      allDay: true,
      backgroundColor: color,
      borderColor: color,
      textColor: "#FFFFFF",
      classNames: ["group-task-event"],
      extendedProps: {
        isGroupTask: true,
        groupTaskId: t.MaCongViecNhom,
        groupId: t.MaNhom,
        groupName: t.NhomLamViec?.TenNhom || "",
        description: t.MoTa || "",
        priority: t.MucDoUuTien || 2,
        status: t.TrangThai,
        deadline: t.HanChot,
        completed: t.TrangThai === "completed",
      },
    };
  });
}

module.exports = { createTask, listTasks, updateTask, deleteTask, getProgress, getMyCalendarTasks };
