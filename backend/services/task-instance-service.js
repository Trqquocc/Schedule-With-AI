/**
 * task-instance-service.js
 * Pure business logic for LichCongViec table (was task_instances) — no req/res.
 * Used by task-instance-controller.js.
 */

const { supabase } = require("../config/database");
const { matchShift } = require("../lib/shift-matcher");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIORITY_COLORS = {
  1: "#10B981",
  2: "#3B82F6",
  3: "#F59E0B",
  4: "#DC2626",
};

const VALID_STATUSES = new Set(["scheduled", "completed", "cancelled"]);

// ---------------------------------------------------------------------------
// Table availability guard
// ---------------------------------------------------------------------------

let _instancesTableMissingWarned = false;

function isInstancesTableMissing(error) {
  if (!error) return false;
  if (error.code === "PGRST205" || error.code === "42P01") return true;
  const msg = String(error.message || "").toLowerCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    msg.includes("schema cache")
  );
}

function warnInstancesTableMissing() {
  if (!_instancesTableMissingWarned) {
    _instancesTableMissingWarned = true;
    console.warn(
      "[instances] table missing — using LichTrinh fallback; run migrations/001_add_task_instances.sql"
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse & validate an ISO timestamp string. Returns null if invalid. */
function parseTimestamp(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/** Build the joined event shape returned to the frontend. */
function buildEventShape(instance, task) {
  const priorityColor = task?.MucDoUuTien
    ? PRIORITY_COLORS[task.MucDoUuTien] || "#3B82F6"
    : "#60A5FA";

  return {
    id: instance.MaLich,
    task_id: instance.MaCongViec || null,
    title: instance.TieuDe || task?.TieuDe || "Untitled",
    start: instance.GioBatDau,
    end: instance.GioKetThuc,
    start_at: instance.GioBatDau,
    end_at: instance.GioKetThuc,
    status: instance.TrangThai,
    is_ai_suggested: instance.AI_DeXuat,
    is_fixed: task?.CoThoiGianCoDinh || false,
    priority: task?.MucDoUuTien || null,
    category: task?.MaLoai || null,
    color: priorityColor,
    backgroundColor: priorityColor,
    borderColor: priorityColor,
    textColor: "#FFFFFF",
    note: instance.GhiChu || "",
    created_at: instance.NgayTao,
    updated_at: instance.NgayCapNhat,
    extendedProps: {
      instanceId: instance.MaLich,
      taskId: instance.MaCongViec || null,
      note: instance.GhiChu || "",
      completed: instance.TrangThai === "completed",
      cancelled: instance.TrangThai === "cancelled",
      aiSuggested: instance.AI_DeXuat,
      priority: task?.MucDoUuTien || null,
      description: task?.MoTa || "",
      isFixed: task?.CoThoiGianCoDinh || false,
    },
  };
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Create a new task instance.
 * Throws { status, message } on validation or DB error.
 * Throws { status: 503, migration: true } when table is missing.
 */
async function createInstance(userId, body) {
  const { task_id, start_at, end_at, title, note, is_ai_suggested } = body;

  const parsedStart = parseTimestamp(start_at);
  const parsedEnd = parseTimestamp(end_at);

  if (!parsedStart) {
    throw { status: 400, message: "start_at is required and must be a valid ISO timestamp" };
  }
  if (!parsedEnd) {
    throw { status: 400, message: "end_at is required and must be a valid ISO timestamp" };
  }
  if (parsedEnd <= parsedStart) {
    throw { status: 400, message: "end_at must be after start_at" };
  }

  const numericUserId = parseInt(userId, 10) || userId;

  let taskRow = null;
  let parsedTaskId = null;
  if (task_id !== undefined && task_id !== null && task_id !== "") {
    parsedTaskId = parseInt(task_id, 10);
    if (isNaN(parsedTaskId) || parsedTaskId <= 0) {
      throw { status: 400, message: "task_id must be a positive integer" };
    }

    const { data: t, error: taskErr } = await supabase
      .from("CongViec")
      .select("MaCongViec, TieuDe, MoTa, MucDoUuTien, MaLoai, CoThoiGianCoDinh, GioBatDauCoDinh, GioKetThucCoDinh, LoaiLuong, CauHinhCa")
      .eq("MaCongViec", parsedTaskId)
      .eq("MaNguoiDung", numericUserId)
      .single();

    if (taskErr || !t) {
      // Diagnostic log for debugging ownership mismatches
      const { data: anyTask } = await supabase
        .from("CongViec")
        .select("MaCongViec, MaNguoiDung")
        .eq("MaCongViec", parsedTaskId)
        .single();
      console.error("[instances] Task lookup failed:", { parsedTaskId, userId, numericUserId, taskErr });
      console.error("[instances] Task without MaNguoiDung filter:", anyTask);
      throw { status: 404, message: "Task not found or not owned by user" };
    }
    taskRow = t;
  }

  let { data: instance, error: insertErr } = await supabase
    .from("LichCongViec")
    .insert({
      MaCongViec: parsedTaskId,
      MaNguoiDung: numericUserId,
      GioBatDau: parsedStart,
      GioKetThuc: parsedEnd,
      TieuDe: title || null,
      GhiChu: note || null,
      TrangThai: "scheduled",
      AI_DeXuat: is_ai_suggested === true,
    })
    .select()
    .single();

  if (insertErr) {
    if (isInstancesTableMissing(insertErr)) {
      warnInstancesTableMissing();
      throw { status: 503, migration: true, message: "Feature not available — migration pending. Run migrations/001_add_task_instances.sql" };
    }
    console.error("Error creating LichCongViec:", insertErr);
    throw { status: 500, message: "Failed to create instance", devDetail: insertErr.message };
  }

  // Shift auto-assign for part-time tasks
  if (taskRow?.LoaiLuong === "part_time" && Array.isArray(taskRow.CauHinhCa)) {
    const shiftName = matchShift(parsedStart, taskRow.CauHinhCa);
    if (shiftName) {
      const meta = { ...(instance.DuLieuPhu || {}), shift_name: shiftName };
      const { data: updated } = await supabase
        .from("LichCongViec")
        .update({ DuLieuPhu: meta, NgayCapNhat: new Date().toISOString() })
        .eq("MaLich", instance.MaLich)
        .select()
        .single();
      if (updated) instance = updated;
    }
  }

  return buildEventShape(instance, taskRow);
}

/**
 * List task instances for a user.
 * Returns [] with _fallback flag when table is missing (graceful degradation).
 */
async function listInstances(userId, query) {
  const { task_id, start, end, status } = query || {};

  let dbQuery = supabase
    .from("LichCongViec")
    .select("*")
    .eq("MaNguoiDung", userId)
    .order("GioBatDau", { ascending: true });

  if (task_id) {
    const tid = parseInt(task_id, 10);
    if (!isNaN(tid) && tid > 0) dbQuery = dbQuery.eq("MaCongViec", tid);
  }
  if (start) dbQuery = dbQuery.gte("GioBatDau", new Date(start).toISOString());
  if (end)   dbQuery = dbQuery.lte("GioBatDau", new Date(end).toISOString());
  if (status && VALID_STATUSES.has(status)) dbQuery = dbQuery.eq("TrangThai", status);

  const { data: instances, error } = await dbQuery;

  if (error) {
    if (isInstancesTableMissing(error)) {
      warnInstancesTableMissing();
      return { data: [], _fallback: "lichTrinh" };
    }
    console.error("Error fetching LichCongViec:", error);
    throw { status: 500, message: "Failed to load instances" };
  }

  const taskIds = [...new Set((instances || []).map((i) => i.MaCongViec).filter(Boolean))];
  let taskMap = {};

  if (taskIds.length > 0) {
    const { data: tasks } = await supabase
      .from("CongViec")
      .select("MaCongViec, TieuDe, MoTa, MucDoUuTien, MaLoai, CoThoiGianCoDinh, GioBatDauCoDinh, GioKetThucCoDinh")
      .in("MaCongViec", taskIds)
      .eq("MaNguoiDung", userId);

    (tasks || []).forEach((t) => { taskMap[t.MaCongViec] = t; });
  }

  const events = (instances || []).map((inst) =>
    buildEventShape(inst, inst.MaCongViec ? taskMap[inst.MaCongViec] : null)
  );

  return { data: events };
}

/**
 * Update an instance's mutable fields (GioBatDau, GioKetThuc, TrangThai, GhiChu, TieuDe).
 * Never touches the parent CongViec row.
 */
async function updateInstance(instanceId, userId, body) {
  const { start_at, end_at, status, note, title } = body;

  const { data: existing, error: fetchErr } = await supabase
    .from("LichCongViec")
    .select("MaLich, GioBatDau, GioKetThuc, TrangThai, MaCongViec, DuLieuPhu")
    .eq("MaLich", instanceId)
    .eq("MaNguoiDung", userId)
    .single();

  if (fetchErr && isInstancesTableMissing(fetchErr)) {
    warnInstancesTableMissing();
    throw { status: 503, migration: true, message: "Feature not available — migration pending. Run migrations/001_add_task_instances.sql" };
  }

  if (fetchErr || !existing) {
    throw { status: 404, message: "Instance not found" };
  }

  const updateData = { NgayCapNhat: new Date().toISOString() };

  if (start_at !== undefined) {
    const parsed = parseTimestamp(start_at);
    if (!parsed) throw { status: 400, message: "Invalid start_at" };
    updateData.GioBatDau = parsed;
  }

  if (end_at !== undefined) {
    const parsed = parseTimestamp(end_at);
    if (!parsed) throw { status: 400, message: "Invalid end_at" };
    updateData.GioKetThuc = parsed;
  }

  const finalStart = updateData.GioBatDau || existing.GioBatDau;
  const finalEnd   = updateData.GioKetThuc || existing.GioKetThuc;
  if (new Date(finalEnd) <= new Date(finalStart)) {
    throw { status: 400, message: "end_at must be after start_at" };
  }

  if (status !== undefined) {
    if (!VALID_STATUSES.has(status)) {
      throw { status: 400, message: `status must be one of: ${[...VALID_STATUSES].join(", ")}` };
    }
    updateData.TrangThai = status;
  }

  if (note !== undefined) updateData.GhiChu = note;
  if (title !== undefined) updateData.TieuDe = title;

  let { data: updated, error: updateErr } = await supabase
    .from("LichCongViec")
    .update(updateData)
    .eq("MaLich", instanceId)
    .eq("MaNguoiDung", userId)
    .select()
    .single();

  if (updateErr) {
    console.error("Error updating LichCongViec:", updateErr);
    throw { status: 500, message: "Failed to update instance" };
  }

  // Shift re-match when GioBatDau changed and parent task is part_time
  if (updateData.GioBatDau && updated?.MaCongViec) {
    const { data: parent } = await supabase
      .from("CongViec")
      .select("LoaiLuong, CauHinhCa")
      .eq("MaCongViec", updated.MaCongViec)
      .eq("MaNguoiDung", userId)
      .single();
    if (parent?.LoaiLuong === "part_time" && Array.isArray(parent.CauHinhCa)) {
      const shiftName = matchShift(updated.GioBatDau, parent.CauHinhCa);
      const baseMeta = updated.DuLieuPhu || {};
      const nextMeta = shiftName
        ? { ...baseMeta, shift_name: shiftName }
        : (() => { const { shift_name, ...rest } = baseMeta; return rest; })();
      const { data: reupdated } = await supabase
        .from("LichCongViec")
        .update({ DuLieuPhu: nextMeta, NgayCapNhat: new Date().toISOString() })
        .eq("MaLich", instanceId)
        .eq("MaNguoiDung", userId)
        .select()
        .single();
      if (reupdated) updated = reupdated;
    }
  }

  return updated;
}

/** Delete a single task instance. Throws 404 if not found or not owned. */
async function deleteInstance(instanceId, userId) {
  const { data: existing, error: fetchErr } = await supabase
    .from("LichCongViec")
    .select("MaLich")
    .eq("MaLich", instanceId)
    .eq("MaNguoiDung", userId)
    .single();

  if (fetchErr && isInstancesTableMissing(fetchErr)) {
    warnInstancesTableMissing();
    throw { status: 503, migration: true, message: "Feature not available — migration pending. Run migrations/001_add_task_instances.sql" };
  }

  if (fetchErr || !existing) {
    throw { status: 404, message: "Instance not found" };
  }

  const { error: deleteErr } = await supabase
    .from("LichCongViec")
    .delete()
    .eq("MaLich", instanceId)
    .eq("MaNguoiDung", userId);

  if (deleteErr) {
    console.error("Error deleting LichCongViec:", deleteErr);
    throw { status: 500, message: "Failed to delete instance" };
  }
}

module.exports = {
  createInstance,
  listInstances,
  updateInstance,
  deleteInstance,
  // Expose for testing
  isInstancesTableMissing,
  buildEventShape,
};
