/**
 * ai-schedule-service.js
 * Schedule suggestion logic: task fetching, simulation, and Gemini AI calls.
 * Split from ai-service.js to keep files under 200 lines.
 * Used by ai-controller.js.
 */

const { supabase } = require("../config/database");
const { geminiModel, geminiAvailable, genAI } = require("./ai-gemini-client");
const { analyzeRecurringPatterns, buildGeminiPrompt } = require("./ai-prompt-service");
const { generateSmartFallback } = require("./ai-schedule-fallback");

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

const TIME_MAP = { 1: "morning", 2: "noon", 3: "afternoon", 4: "evening", 5: "anytime" };

function getColorByPriority(priority) {
  switch (priority) {
    case 1: return "#10B981";
    case 2: return "#3B82F6";
    case 3: return "#F59E0B";
    case 4: return "#EF4444";
    default: return "#8B5CF6";
  }
}

/** Fetch full task details from CongViec for the given task IDs. */
async function getTaskDetailsFromDatabase(taskIds, userId) {
  try {
    if (!taskIds || taskIds.length === 0) return [];
    const { data: tasks, error } = await supabase
      .from("CongViec")
      .select("MaCongViec, TieuDe, MoTa, ThoiGianUocTinh, MucDoUuTien, MucDoPhucTap, MucDoTapTrung, ThoiDiemThichHop, CoThoiGianCoDinh, GioBatDauCoDinh, GioKetThucCoDinh, LoaiCongViec(TenLoai)")
      .in("MaCongViec", taskIds)
      .eq("MaNguoiDung", userId);
    if (error) { console.error("Error fetching task details:", error); return []; }
    return (tasks || []).map((task) => ({
      id: task.MaCongViec,
      title: task.TieuDe,
      description: (task.MoTa || "").slice(0, 100),
      category: task.LoaiCongViec?.TenLoai || null,
      estimatedMinutes: task.ThoiGianUocTinh || 60,
      priority: task.MucDoUuTien || 2,
      complexity: task.MucDoPhucTap || 2,
      focusLevel: task.MucDoTapTrung || 2,
      suitableTime: TIME_MAP[task.ThoiDiemThichHop] || "anytime",
      isFixed: !!task.CoThoiGianCoDinh,
      fixedStart: task.GioBatDauCoDinh || null,
      fixedEnd: task.GioKetThucCoDinh || null,
      color: getColorByPriority(task.MucDoUuTien || 2),
    }));
  } catch (error) {
    console.error("Error fetching task details:", error);
    return [];
  }
}

/** Fetch existing events for a user within a date range. */
async function getExistingEvents(userId, startDate, endDate) {
  try {
    const { data: records, error } = await supabase
      .from("LichTrinh")
      .select("MaLichTrinh, GioBatDau, GioKetThuc, AI_DeXuat, CongViec(TieuDe, MucDoUuTien)")
      .eq("MaNguoiDung", userId)
      .gte("GioBatDau", new Date(startDate).toISOString())
      .lte("GioBatDau", new Date(endDate).toISOString())
      .order("GioBatDau", { ascending: true });
    if (error) { console.error("Error fetching existing events:", error.message); return []; }
    return (records || []).map((event) => ({
      id: event.MaLichTrinh,
      start: event.GioBatDau,
      end: event.GioKetThuc,
      title: event.CongViec?.TieuDe,
      priority: event.CongViec?.MucDoUuTien,
      AI_DeXuat: event.AI_DeXuat,
    }));
  } catch (error) {
    console.error("Error fetching existing events:", error.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Gemini AI call
// ---------------------------------------------------------------------------

/** Call Gemini text model with retry (3 attempts, exponential backoff). */
async function callGeminiAI(prompt) {
  if (!geminiAvailable || !geminiModel) throw new Error("Gemini AI is not available");

  const maxRetries = 3;
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      const result = await geminiModel.generateContent(prompt);
      const text = (await result.response).text();

      let jsonMatch = text.match(/{[\s\S]*}/);
      if (!jsonMatch) {
        const backtickMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (backtickMatch) jsonMatch = backtickMatch[1].trim().match(/{[\s\S]*}/);
      }
      if (!jsonMatch && text.trim().startsWith("{")) jsonMatch = [text.trim()];
      if (!jsonMatch) throw new Error("No JSON found in response");

      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
        throw new Error("Invalid response format: missing suggestions array");
      }
      if (parsed.suggestions.length === 0) throw new Error("AI returned empty suggestions array");
      return parsed;
    } catch (err) {
      lastError = err;
      console.log(`Attempt ${attempt} failed:`, err.message);
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Simulation fallback
// ---------------------------------------------------------------------------

/** Generate simulated schedule respecting recurring-pattern instructions. */
async function generateSimulatedScheduleWithInstructions(
  taskDetails, startDate, endDate, options, existingEvents, additionalInstructions = ""
) {
  const recurringPatterns = analyzeRecurringPatterns(additionalInstructions);
  const suggestions = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  if (recurringPatterns.length > 0) {
    for (const pattern of recurringPatterns) {
      let selectedTask = taskDetails.find(
        (t) => additionalInstructions.toLowerCase().includes(t.title.toLowerCase())
      ) || taskDetails[0];

      for (let i = 0; i <= daysDiff; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(currentDate.getDate() + i);
        const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay();

        if (pattern.days.includes(dayOfWeek)) {
          for (const time of pattern.times) {
            const eventDate = new Date(currentDate);
            eventDate.setHours(time.startHour, time.startMin, 0, 0);

            let durationMinutes = selectedTask.estimatedMinutes || 60;
            if (time.endHour !== null) {
              durationMinutes = (time.endHour * 60 + time.endMin) - (time.startHour * 60 + time.startMin);
            }

            suggestions.push({
              taskId: selectedTask.id,
              scheduledTime: eventDate.toISOString(),
              durationMinutes: Math.max(durationMinutes, 30),
              reason: `${selectedTask.title} - Lúc ${String(time.startHour).padStart(2, "0")}:${String(time.startMin).padStart(2, "0")}${time.endHour ? ` - ${String(time.endHour).padStart(2, "0")}:${String(time.endMin).padStart(2, "0")}` : ""}`,
              color: selectedTask.color,
              isRecurring: true,
            });
          }
        }
      }
    }
  }

  if (suggestions.length === 0) {
    const base = generateSmartFallback(taskDetails, startDate, endDate, existingEvents);
    return { ...base, summary: base.summary + " (Chế độ mặc định)" };
  }

  const uniqueDays = new Set(suggestions.map((s) => new Date(s.scheduledTime).toDateString())).size;
  const totalMinutes = suggestions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const recurringCount = suggestions.filter((s) => s.isRecurring).length;

  return {
    suggestions: suggestions.map(({ isRecurring, ...rest }) => rest),
    summary: `Đã tạo ${suggestions.length} khung giờ (bao gồm ${recurringCount} events lặp lại) trong ${uniqueDays} ngày. Tổng thời lượng: ${Math.round(totalMinutes / 60)} giờ.`,
    statistics: { totalTasks: suggestions.length, totalHours: Math.round(totalMinutes / 60), daysUsed: uniqueDays, recurringEvents: recurringCount },
  };
}

// ---------------------------------------------------------------------------
// Save / retrieve AI suggestions
// ---------------------------------------------------------------------------

/** Delete old AI suggestions and insert new ones into LichTrinh. */
async function saveAiSuggestions(userId, suggestions) {
  const { data: deletedData } = await supabase
    .from("LichTrinh").delete().eq("MaNguoiDung", userId).eq("AI_DeXuat", true).select("MaLichTrinh");
  const deletedCount = deletedData?.length || 0;

  const savedIds = [];
  for (const s of suggestions) {
    const start = new Date(s.scheduledTime);
    const end = new Date(start.getTime() + s.durationMinutes * 60000);

    const { data: existing } = await supabase
      .from("LichTrinh").select("MaLichTrinh")
      .eq("MaCongViec", s.taskId).eq("GioBatDau", start.toISOString())
      .eq("MaNguoiDung", userId).eq("AI_DeXuat", true).limit(1);

    if (existing && existing.length > 0) { savedIds.push(existing[0].MaLichTrinh); continue; }

    const { data: result } = await supabase
      .from("LichTrinh")
      .insert({ MaCongViec: s.taskId, GioBatDau: start.toISOString(), GioKetThuc: end.toISOString(), GhiChu: s.reason || "Được đề xuất bởi AI", AI_DeXuat: true, MaNguoiDung: userId })
      .select("MaLichTrinh").single();
    if (result) savedIds.push(result.MaLichTrinh);
  }

  // Track proposal (optional table — ignore errors)
  try {
    const summaryContent = suggestions.map((s, i) => `${i + 1}. ${s.title || "Công việc"} - ${s.durationMinutes || 60} phút`).join("\n");
    await supabase.from("PhienAIDeXuat").insert({ MaNguoiDung: userId, NgayDeXuat: new Date().toISOString(), NoiDungYeuCau: `AI Proposal:\n${summaryContent}`, DaApDung: true, ThoiGianApDung: new Date().toISOString() });
  } catch (e) { console.warn("Could not track AI proposal:", e.message); }

  return { savedIds, deletedCount };
}

module.exports = {
  getColorByPriority,
  getTaskDetailsFromDatabase,
  getExistingEvents,
  callGeminiAI,
  generateSimulatedScheduleWithInstructions,
  saveAiSuggestions,
};
