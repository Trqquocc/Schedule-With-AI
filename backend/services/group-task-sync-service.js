// group-task-sync-service.js — Bidirectional status sync between GroupTasks and CongViec
const { supabase } = require("../config/database");

const STATUS_INT_TO_STR = { 0: "pending", 1: "in_progress", 2: "completed", 3: "cancelled" };
const STATUS_STR_TO_INT = { pending: 0, in_progress: 1, completed: 2, cancelled: 3 };

async function ensureDefaultCategory(userId) {
  const { data } = await supabase.from("LoaiCongViec").select("MaLoai").eq("MaNguoiDung", userId).limit(1).maybeSingle();
  if (data?.MaLoai) return data.MaLoai;
  const { data: created, error } = await supabase
    .from("LoaiCongViec")
    .insert({ MaNguoiDung: userId, TenLoai: "Chưa phân loại", MoTa: "Danh mục mặc định" })
    .select("MaLoai").single();
  if (error) throw error;
  return created.MaLoai;
}

async function createPersonalTaskForGroupTask(groupTask, groupName) {
  try {
    const maLoai = await ensureDefaultCategory(groupTask.NguoiNhan);
    const { error } = await supabase.from("CongViec").insert({
      MaNguoiDung: groupTask.NguoiNhan,
      MaLoai: maLoai,
      TieuDe: groupTask.TieuDe,
      MoTa: groupTask.MoTa || "",
      TrangThaiThucHien: 0,
      MucDoUuTien: groupTask.MucDoUuTien || 2,
      ThoiGianUocTinh: 60,
      NgayTao: new Date().toISOString(),
      MaCongViecNhom: groupTask.MaCongViecNhom,
      CoThoiGianCoDinh: false,
      LuongTheoGio: 0,
    });
    if (error) console.error("[sync] createPersonalTask error:", error.message);
  } catch (e) {
    console.error("[sync] createPersonalTask failed:", e.message);
  }
}

async function syncStatusToGroupTask(congViecId, newStatusInt) {
  try {
    const { data: cv } = await supabase.from("CongViec").select("MaCongViecNhom").eq("MaCongViec", congViecId).maybeSingle();
    if (!cv?.MaCongViecNhom) return;

    const mapped = STATUS_INT_TO_STR[newStatusInt];
    if (!mapped) return;

    const { data: gt } = await supabase.from("CongViecNhom").select("TrangThai").eq("MaCongViecNhom", cv.MaCongViecNhom).maybeSingle();
    if (!gt || gt.TrangThai === mapped) return;

    await supabase.from("CongViecNhom").update({ TrangThai: mapped, NgayCapNhat: new Date().toISOString() }).eq("MaCongViecNhom", cv.MaCongViecNhom);
  } catch (e) {
    console.error("[sync] syncToGroupTask failed:", e.message);
  }
}

async function syncStatusToPersonalTask(groupTaskId, newStatusStr) {
  try {
    const mapped = STATUS_STR_TO_INT[newStatusStr];
    if (mapped === undefined) return;

    const { data: cv } = await supabase.from("CongViec").select("MaCongViec, TrangThaiThucHien").eq("MaCongViecNhom", groupTaskId).maybeSingle();
    if (!cv || cv.TrangThaiThucHien === mapped) return;

    await supabase.from("CongViec").update({ TrangThaiThucHien: mapped }).eq("MaCongViec", cv.MaCongViec);

    if (mapped === 2) {
      await supabase.from("LichTrinh").update({ DaHoanThanh: true }).eq("MaCongViec", cv.MaCongViec);
    }
  } catch (e) {
    console.error("[sync] syncToPersonalTask failed:", e.message);
  }
}

async function getGroupInfoForTasks(taskIds) {
  const result = new Map();
  if (!taskIds.length) return result;

  const { data } = await supabase
    .from("CongViec")
    .select("MaCongViec, MaCongViecNhom")
    .in("MaCongViec", taskIds)
    .not("MaCongViecNhom", "is", null);

  if (!data?.length) return result;

  const gtIds = data.map((d) => d.MaCongViecNhom);
  const { data: gts } = await supabase
    .from("CongViecNhom")
    .select("MaCongViecNhom, MaNhom, HanChot")
    .in("MaCongViecNhom", gtIds);

  const nhomIds = [...new Set((gts || []).map(g => g.MaNhom).filter(Boolean))];
  let nhomMap = {};
  if (nhomIds.length > 0) {
    const { data: nhoms } = await supabase.from("NhomLamViec").select("MaNhom, TenNhom").in("MaNhom", nhomIds);
    (nhoms || []).forEach(n => { nhomMap[n.MaNhom] = n.TenNhom; });
  }

  const gtMap = new Map((gts || []).map((g) => [g.MaCongViecNhom, g]));
  for (const cv of data) {
    const gt = gtMap.get(cv.MaCongViecNhom);
    if (gt) {
      result.set(cv.MaCongViec, {
        MaCongViecNhom: cv.MaCongViecNhom,
        GroupName: nhomMap[gt.MaNhom] || null,
        Deadline: gt.HanChot || null,
      });
    }
  }
  return result;
}

async function getSessionProgress(groupTaskIds) {
  const result = new Map();
  if (!groupTaskIds.length) return result;

  const { data: linked } = await supabase
    .from("CongViec")
    .select("MaCongViec, MaCongViecNhom")
    .in("MaCongViecNhom", groupTaskIds);

  if (!linked?.length) return result;

  const cvIds = linked.map((l) => l.MaCongViec);
  const { data: sessions } = await supabase
    .from("LichTrinh")
    .select("MaCongViec, DaHoanThanh")
    .in("MaCongViec", cvIds);

  const cvToGt = new Map(linked.map((l) => [l.MaCongViec, l.MaCongViecNhom]));
  const progress = new Map();

  for (const s of sessions || []) {
    const gtId = cvToGt.get(s.MaCongViec);
    if (!gtId) continue;
    if (!progress.has(gtId)) progress.set(gtId, { total: 0, done: 0 });
    progress.get(gtId).total++;
    if (s.DaHoanThanh) progress.get(gtId).done++;
  }

  for (const gtId of groupTaskIds) {
    const hasPersonal = linked.some((l) => l.MaCongViecNhom === gtId);
    const p = progress.get(gtId) || { total: 0, done: 0 };
    result.set(gtId, { ...p, hasPersonalTask: hasPersonal, percent: p.total > 0 ? Math.round((p.done / p.total) * 100) : 0 });
  }
  return result;
}

async function autoCompleteIfAllSessionsDone(congViecId) {
  try {
    const { data: sessions } = await supabase
      .from("LichTrinh")
      .select("DaHoanThanh")
      .eq("MaCongViec", congViecId);

    if (!sessions?.length) return;
    const allDone = sessions.every((s) => s.DaHoanThanh);
    if (!allDone) return;

    const { data: cv } = await supabase.from("CongViec").select("TrangThaiThucHien, MaCongViecNhom").eq("MaCongViec", congViecId).maybeSingle();
    if (!cv || cv.TrangThaiThucHien === 2) return;

    await supabase.from("CongViec").update({ TrangThaiThucHien: 2 }).eq("MaCongViec", congViecId);

    if (cv.MaCongViecNhom) {
      await supabase.from("CongViecNhom").update({ TrangThai: "completed", NgayCapNhat: new Date().toISOString() }).eq("MaCongViecNhom", cv.MaCongViecNhom);
    }
  } catch (e) {
    console.error("[sync] autoComplete failed:", e.message);
  }
}

module.exports = {
  createPersonalTaskForGroupTask,
  syncStatusToGroupTask,
  syncStatusToPersonalTask,
  getGroupInfoForTasks,
  getSessionProgress,
  autoCompleteIfAllSessionsDone,
};
