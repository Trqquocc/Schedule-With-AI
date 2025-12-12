const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { dbPoolPromise, sql } = require("../config/database");
require("dotenv").config();

// GEMINI AI INITIALIZATION
let geminiModel = null;
let geminiAvailable = false;

try {
  const { GoogleGenerativeAI } = require("@google/generative-ai");

  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "") {
    console.log("Initializing Gemini AI...");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    geminiModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });

    geminiAvailable = true;
    console.log(
      "Gemini AI initialized successfully with model: gemini-2.5-flash"
    );
  } else {
    console.warn("GEMINI_API_KEY is missing or empty in .env file");
    console.log("AI will run in simulation mode");
  }
} catch (error) {
  console.error("Error initializing Gemini AI:", error.message);
  console.log("AI will run in simulation mode");
}

// HELPER FUNCTIONS

async function getTaskDetailsFromDatabase(taskIds, userId) {
  try {
    if (!taskIds || taskIds.length === 0) {
      return [];
    }

    const pool = await dbPoolPromise;
    const taskIdList = taskIds.join(",");

    // SỬA QUERY NÀY - LẤY MauSac TỪ CongViec
    const query = `
      SELECT 
        cv.MaCongViec as id,
        cv.TieuDe as title,
        cv.ThoiGianUocTinh as estimatedMinutes,
        cv.MucDoUuTien as priority,
        cv.MucDoPhucTap as complexity,
        cv.MucDoTapTrung as focusLevel,
        cv.ThoiDiemThichHop as suitableTimeCode,
        cv.MauSac as color  -- LẤY TỪ CongViec
      FROM CongViec cv
      WHERE cv.MaCongViec IN (${taskIdList}) 
        AND cv.UserID = @userId
        AND cv.TrangThaiThucHien = 0
    `;

    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(query);

    const taskDetails = result.recordset.map((task) => {
      const timeMap = {
        1: "morning",
        2: "noon",
        3: "afternoon",
        4: "evening",
        5: "anytime",
      };

      return {
        id: task.id,
        title: task.title,
        estimatedMinutes: task.estimatedMinutes || 60,
        priority: task.priority || 2,
        complexity: task.complexity || 2,
        focusLevel: task.focusLevel || 2,
        suitableTime: timeMap[task.suitableTimeCode] || "anytime",
        color: task.color || this.getColorByPriority(task.priority || 2), // Dùng màu từ database hoặc fallback
      };
    });

    console.log(`Loaded ${taskDetails.length} task details from database`);
    return taskDetails;
  } catch (error) {
    console.error("Error fetching task details:", error);
    return [];
  }
}

// Thêm hàm helper để tạo màu từ priority (fallback)
function getColorByPriority(priority) {
  switch (priority) {
    case 1:
      return "#10B981"; // Xanh lá
    case 2:
      return "#3B82F6"; // Xanh dương
    case 3:
      return "#F59E0B"; // Vàng cam
    case 4:
      return "#EF4444"; // Đỏ
    default:
      return "#8B5CF6"; // Tím
  }
}

// Thêm hàm helper (nếu chưa có)
function getColorByPriority(priority) {
  switch (priority) {
    case 1:
      return "#10B981"; // Xanh lá
    case 2:
      return "#3B82F6"; // Xanh dương
    case 3:
      return "#F59E0B"; // Vàng cam
    case 4:
      return "#EF4444"; // Đỏ
    default:
      return "#8B5CF6"; // Tím
  }
}

async function getExistingEvents(userId, startDate, endDate) {
  try {
    const pool = await dbPoolPromise;

    const query = `
      SELECT 
        lt.MaLichTrinh as id,
        lt.GioBatDau as start_time,
        lt.GioKetThuc as end_time,
        cv.TieuDe as title,
        cv.MucDoUuTien as priority,
        lt.AI_DeXuat as ai_suggested
      FROM LichTrinh lt
      INNER JOIN CongViec cv ON lt.MaCongViec = cv.MaCongViec
      WHERE cv.UserID = @userId
        AND lt.GioBatDau >= @startDate
        AND lt.GioBatDau <= @endDate
      ORDER BY lt.GioBatDau
    `;

    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("startDate", sql.DateTime, new Date(startDate))
      .input("endDate", sql.DateTime, new Date(endDate))
      .query(query);

    console.log(`Found ${result.recordset.length} existing events`);
    return result.recordset.map((event) => ({
      ...event,
      start: event.start_time,
      end: event.end_time,
      AI_DeXuat: event.ai_suggested,
    }));
  } catch (error) {
    console.error("Error fetching existing events:", error.message);
    return [];
  }
}

function buildGeminiPrompt(
  taskDetails,
  startDate,
  endDate,
  options,
  existingEvents,
  additionalInstructions = ""
) {
  const taskList = taskDetails
    .map(
      (task) => `
    - Công việc "${task.title}" (ID: ${task.id}):
      + Thời lượng: ${task.estimatedMinutes} phút
      + Ưu tiên: ${task.priority}/4
      + Thời điểm thích hợp: ${task.suitableTime}
      + Độ phức tạp: ${task.complexity}/5
      + Màu: ${task.color}
  `
    )
    .join("\n");

  const existingSchedule = existingEvents
    .map(
      (event) => `
    - "${event.title}": ${new Date(event.start).toLocaleString("vi-VN")}
  `
    )
    .join("\n");

  const additionalInstructionsText = additionalInstructions.trim()
    ? `\nHƯỚNG DẪN THÊM CỦA NGƯỜI DÙNG: ${additionalInstructions}\n`
    : "";

  return `Bạn là trợ lý lập lịch thông minh. Hãy sắp xếp các công việc sau vào lịch:

CÁC CÔNG VIỆC CẦN SẮP XẾP:
${taskList}

KHOẢNG THỜI GIAN: Từ ${startDate} đến ${endDate}

LỊCH HIỆN CÓ (tránh trùng):
${existingEvents.length > 0 ? existingSchedule : "Không có lịch"}

YÊU CẦU:
1. ${options.considerPriority ? "Ưu tiên việc quan trọng trước" : "Bình thường"}
2. ${options.avoidConflict ? "Tránh trùng lịch có sẵn" : "Không cần tránh"}
3. ${
    options.balanceWorkload
      ? "Cân bằng công việc các ngày"
      : "Không cần cân bằng"
  }
4. Xếp việc vào thời điểm thích hợp của nó (morning/noon/afternoon/evening)
5. Mỗi ngày không quá 8 tiếng làm việc
6. Làm việc từ 8:00 đến 22:00${additionalInstructionsText}

Hãy trả về KẾT QUẢ dưới dạng JSON (CHỈ TRẢ VỀ JSON, KHÔNG GIẢI THÍCH):

{
  "suggestions": [
    {
      "taskId": [số],
      "scheduledTime": "YYYY-MM-DDTHH:mm:ss",
      "durationMinutes": [số],
      "reason": "lý do bằng tiếng Việt"
    }
  ],
  "summary": "tóm tắt bằng tiếng Việt",
  "statistics": {
    "totalTasks": [số],
    "totalHours": [số],
    "daysUsed": [số]
  }
}

Ví dụ scheduledTime: "2025-12-04T09:00:00"
Thời gian phải nằm trong khoảng từ ${startDate} đến ${endDate}.`;
}

async function callGeminiAI(prompt) {
  try {
    console.log("Calling Gemini AI API...");

    if (!geminiAvailable || !geminiModel) {
      throw new Error("Gemini AI is not available");
    }

    const maxRetries = 2;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}`);

        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("Gemini AI response received");

        const jsonMatch = text.match(/{[\s\S]*}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in response");
        }

        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);

        if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
          throw new Error("Invalid response format: missing suggestions array");
        }

        console.log(`Parsed ${parsed.suggestions.length} suggestions`);
        return parsed;
      } catch (attemptError) {
        lastError = attemptError;
        console.log(`Attempt ${attempt} failed:`, attemptError.message);

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    throw lastError;
  } catch (error) {
    console.error("Gemini AI API error:", error.message);
    throw error;
  }
}

async function generateSimulatedSchedule(
  taskDetails,
  startDate,
  endDate,
  options,
  existingEvents
) {
  console.log("Generating simulated schedule...");

  const suggestions = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const days = Math.max(1, Math.min(daysDiff, 7));

  const sortedTasks = [...taskDetails].sort((a, b) => b.priority - a.priority);

  const dailySlots = [
    { hour: 9, label: "sáng" },
    { hour: 13, label: "chiều" },
    { hour: 16, label: "chiều muộn" },
    { hour: 19, label: "tối" },
  ];

  for (let i = 0; i < sortedTasks.length; i++) {
    const task = sortedTasks[i];

    const dayIndex = i % days;
    const scheduleDate = new Date(start);
    scheduleDate.setDate(scheduleDate.getDate() + dayIndex);

    let slotIndex = 0;
    switch (task.suitableTime) {
      case "morning":
        slotIndex = 0;
        break;
      case "noon":
        slotIndex = 1;
        break;
      case "afternoon":
        slotIndex = 2;
        break;
      case "evening":
        slotIndex = 3;
        break;
      default:
        slotIndex = i % dailySlots.length;
    }

    const slot = dailySlots[slotIndex];
    scheduleDate.setHours(slot.hour, 0, 0, 0);

    let hasConflict = false;
    if (options.avoidConflict && existingEvents.length > 0) {
      const taskEnd = new Date(
        scheduleDate.getTime() + task.estimatedMinutes * 60000
      );
      hasConflict = existingEvents.some((event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return scheduleDate < eventEnd && taskEnd > eventStart;
      });

      if (hasConflict) {
        slotIndex = (slotIndex + 1) % dailySlots.length;
        scheduleDate.setHours(dailySlots[slotIndex].hour);
      }
    }

    const reasons = [
      `Ưu tiên ${task.priority}, xếp vào buổi ${slot.label}`,
      `Phù hợp với thời điểm ${task.suitableTime}`,
      `Công việc quan trọng, cần hoàn thành sớm`,
      `Phân bố hợp lý trong kế hoạch tuần`,
    ];

    const reason = reasons[Math.floor(Math.random() * reasons.length)];

    suggestions.push({
      taskId: task.id,
      scheduledTime: scheduleDate.toISOString(),
      durationMinutes: task.estimatedMinutes,
      reason: reason,
      color: task.color,
    });
  }

  const uniqueDays = new Set(
    suggestions.map((s) => new Date(s.scheduledTime).toDateString())
  ).size;

  const totalMinutes = suggestions.reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );

  return {
    suggestions,
    summary: `Đã tạo ${
      suggestions.length
    } khung giờ trong ${uniqueDays} ngày. Tổng thời lượng: ${Math.round(
      totalMinutes / 60
    )} giờ.`,
    statistics: {
      totalTasks: suggestions.length,
      totalHours: Math.round(totalMinutes / 60),
      daysUsed: uniqueDays,
    },
  };
}

// API ENDPOINTS

router.post("/suggest-schedule", authenticateToken, async (req, res) => {
  console.log("\n" + "=".repeat(50));
  console.log("AI SCHEDULE REQUEST RECEIVED");
  console.log("=".repeat(50));

  try {
    const userId = req.userId;
    const { tasks: taskIds, startDate, endDate, options = {} } = req.body;
    const additionalInstructions = req.body.additionalInstructions || "";

    console.log("Additional instructions:", additionalInstructions);

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn ít nhất một công việc",
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn khoảng thời gian",
      });
    }

    console.log(`User ID: ${userId}`);
    console.log(`Tasks: ${taskIds.length} tasks`);
    console.log(`Date range: ${startDate} to ${endDate}`);

    const taskDetails = await getTaskDetailsFromDatabase(taskIds, userId);
    if (taskDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy công việc được chọn",
      });
    }

    console.log(`Task details loaded: ${taskDetails.length} tasks`);

    let existingEvents = [];
    if (options.avoidConflict) {
      try {
        existingEvents = await getExistingEvents(userId, startDate, endDate);
        console.log(`Existing events: ${existingEvents.length}`);
      } catch (eventError) {
        console.log(`Could not load existing events: ${eventError.message}`);
        existingEvents = [];
      }
    }

    let aiResult;
    let mode = "simulation";

    if (geminiAvailable) {
      try {
        console.log("Attempting to use Gemini AI...");

        const prompt = buildGeminiPrompt(
          taskDetails,
          startDate,
          endDate,
          options,
          existingEvents,
          additionalInstructions
        );

        console.log(
          "Prompt with additional instructions:",
          prompt.substring(0, 500) + "..."
        );

        aiResult = await callGeminiAI(prompt);
        mode = "gemini";
        console.log(
          "Gemini AI processed successfully with additional instructions"
        );
      } catch (aiError) {
        console.error("Gemini AI failed:", aiError.message);
        aiResult = await generateSimulatedSchedule(
          taskDetails,
          startDate,
          endDate,
          options,
          existingEvents
        );
        mode = "simulation_fallback";
      }
    } else {
      aiResult = await generateSimulatedScheduleWithInstructions(
        taskDetails,
        startDate,
        endDate,
        options,
        existingEvents,
        additionalInstructions
      );
      mode = "simulation";
    }

    if (!aiResult.suggestions || !Array.isArray(aiResult.suggestions)) {
      throw new Error("Invalid response format from AI");
    }

    const response = {
      success: true,
      data: {
        suggestions: aiResult.suggestions.map((suggestion) => ({
          taskId: suggestion.taskId,
          scheduledTime: suggestion.scheduledTime,
          durationMinutes: suggestion.durationMinutes,
          reason: suggestion.reason || "Được xếp tự động",
          color: suggestion.color || "#8B5CF6",
        })),
        summary:
          aiResult.summary || `Đã tạo ${aiResult.suggestions.length} khung giờ`,
        statistics: aiResult.statistics || {
          totalTasks: aiResult.suggestions.length,
          totalHours: Math.round(
            aiResult.suggestions.reduce(
              (sum, s) => sum + s.durationMinutes,
              0
            ) / 60
          ),
          daysUsed: Math.min(
            new Set(
              aiResult.suggestions.map((s) =>
                new Date(s.scheduledTime).toDateString()
              )
            ).size,
            7
          ),
        },
        mode: mode,
      },
      message:
        mode === "gemini"
          ? "AI đã tạo lịch trình thành công" +
            (additionalInstructions ? " với hướng dẫn bổ sung" : "")
          : "Đã tạo lịch trình (chế độ mô phỏng)",
    };

    console.log(`Generated ${response.data.suggestions.length} suggestions`);
    console.log(`Mode: ${mode}`);
    console.log("AI request completed successfully");
    console.log("=".repeat(50) + "\n");

    res.json(response);
  } catch (error) {
    console.error("AI processing failed:", error);

    res.status(500).json({
      success: false,
      message: "Lỗi xử lý AI",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      mode: "error",
    });
  }
});

async function generateSimulatedScheduleWithInstructions(
  taskDetails,
  startDate,
  endDate,
  options,
  existingEvents,
  additionalInstructions = ""
) {
  console.log("Generating simulated schedule with instructions...");
  console.log("Additional instructions:", additionalInstructions);

  // Sử dụng hàm cũ và thêm xử lý cho instructions nếu cần
  const baseSchedule = await generateSimulatedSchedule(
    taskDetails,
    startDate,
    endDate,
    options,
    existingEvents
  );

  // Nếu có additionalInstructions, có thể điều chỉnh schedule ở đây
  if (additionalInstructions.trim()) {
    console.log("Applying additional instructions to simulated schedule...");

    // Có thể thêm logic xử lý instructions đơn giản ở đây
    // Ví dụ: thêm note về instructions vào reason
    baseSchedule.suggestions = baseSchedule.suggestions.map((suggestion) => ({
      ...suggestion,
      reason: suggestion.reason + " (Có hướng dẫn bổ sung từ người dùng)",
    }));

    baseSchedule.summary = `Đã tạo ${baseSchedule.suggestions.length} khung giờ với hướng dẫn bổ sung`;
  }

  return baseSchedule;
}

router.post("/save-ai-suggestions", authenticateToken, async (req, res) => {
  const { suggestions } = req.body;
  const userId = req.userId;

  if (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) {
    return res.status(400).json({ success: false, message: "Danh sách rỗng" });
  }

  try {
    const pool = await dbPoolPromise;

    // ✅ 1. XÓA TẤT CẢ AI SUGGESTIONS CŨ
    await pool.request().input("userId", sql.Int, userId).query(`
        DELETE FROM LichTrinh 
        WHERE UserID = @userId AND AI_DeXuat = 1
      `);

    // ✅ 2. LƯU AI SUGGESTIONS MỚI
    const savedIds = [];
    for (const s of suggestions) {
      const start = new Date(s.scheduledTime);
      const end = new Date(start.getTime() + s.durationMinutes * 60000);

      const result = await pool
        .request()
        .input("taskId", sql.Int, s.taskId)
        .input("startTime", sql.DateTime, start)
        .input("endTime", sql.DateTime, end)
        .input("note", sql.NVarChar, s.reason || "AI đề xuất")
        .input("color", sql.NVarChar, s.color || "#8B5CF6")
        .input("userId", sql.Int, userId).query(`
          INSERT INTO LichTrinh 
            (MaCongViec, GioBatDau, GioKetThuc, GhiChu, AI_DeXuat, UserID)
          OUTPUT INSERTED.MaLichTrinh
          VALUES 
            (@taskId, @startTime, @endTime, @note, 1, @userId)
        `);

      if (result.recordset[0]) {
        savedIds.push(result.recordset[0].MaLichTrinh);
      }
    }

    console.log(
      `✅ Đã lưu ${savedIds.length} lịch AI mới, xóa lịch cũ cho user ${userId}`
    );

    res.json({
      success: true,
      saved: savedIds.length,
      savedIds: savedIds,
    });
  } catch (err) {
    console.error("❌ Lỗi lưu AI suggestions:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// SỬA ENDPOINT GET /ai-events
router.get("/ai-events", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const pool = await dbPoolPromise;

    const result = await pool.request().input("userId", sql.Int, userId).query(`
      SELECT 
        lt.MaLichTrinh,
        lt.MaCongViec,
        lt.GioBatDau,
        lt.GioKetThuc,
        lt.GhiChu,
        lt.AI_DeXuat,
        cv.TieuDe,
        cv.MucDoUuTien,
        ISNULL(cv.MauSac, 
          CASE cv.MucDoUuTien
            WHEN 1 THEN '#34D399'
            WHEN 2 THEN '#60A5FA'
            WHEN 3 THEN '#FBBF24'
            WHEN 4 THEN '#F87171'
            ELSE '#8B5CF6'
          END) AS Color
      FROM LichTrinh lt
      LEFT JOIN CongViec cv ON lt.MaCongViec = cv.MaCongViec
      WHERE lt.UserID = @userId
        AND lt.AI_DeXuat = 1
      ORDER BY lt.GioBatDau DESC
    `);

    const events = result.recordset.map((ev) => ({
      MaLichTrinh: ev.MaLichTrinh,
      MaCongViec: ev.MaCongViec,
      TieuDe: ev.TieuDe || "AI Đề xuất",
      GioBatDau: ev.GioBatDau,
      GioKetThuc: ev.GioKetThuc,
      GhiChu: ev.GhiChu || "Được đề xuất bởi AI",
      Color: ev.Color, // SỬA: Lấy trực tiếp từ query
      priority: ev.MucDoUuTien,
      AI_DeXuat: ev.AI_DeXuat,
    }));

    console.log(`✅ Trả về ${events.length} AI events với màu sắc`);

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error("❌ Lỗi lấy AI events:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy AI events",
      error: error.message,
    });
  }
});

router.get("/test", authenticateToken, (req, res) => {
  res.json({
    success: true,
    geminiAvailable: geminiAvailable,
    model: "gemini-2.5-flash",
    message: geminiAvailable
      ? "Gemini AI is ready to use"
      : "Gemini AI is not available (check GEMINI_API_KEY in .env)",
    timestamp: new Date().toISOString(),
  });
});

router.delete("/clear-old-suggestions", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const pool = await dbPoolPromise;

    // 1. Đếm số lượng AI suggestions cũ
    const countResult = await pool.request().input("userId", sql.Int, userId)
      .query(`
        SELECT COUNT(*) as count 
        FROM LichTrinh 
        WHERE UserID = @userId AND AI_DeXuat = 1
      `);

    const oldCount = countResult.recordset[0]?.count || 0;

    // 2. Xóa tất cả AI suggestions cũ
    const deleteResult = await pool.request().input("userId", sql.Int, userId)
      .query(`
        DELETE FROM LichTrinh 
        WHERE UserID = @userId AND AI_DeXuat = 1
      `);

    console.log(`🗑️ Cleared ${oldCount} old AI suggestions for user ${userId}`);

    res.json({
      success: true,
      clearedCount: oldCount,
      message: `Đã xóa ${oldCount} lịch trình AI cũ`,
    });
  } catch (error) {
    console.error("❌ Error clearing old AI suggestions:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa lịch trình AI cũ",
      error: error.message,
    });
  }
});

router.get("/events/ai", authenticateToken, async (req, res) => {
  const userId = req.userId;

  try {
    const pool = await dbPoolPromise;
    const result = await pool.request().input("userId", sql.Int, userId).query(`
        SELECT 
          lt.MaLichTrinh,
          lt.MaCongViec,
          lt.GioBatDau,
          lt.GioKetThuc,
          lt.GhiChu,
          cv.TieuDe,
          cv.MucDoUuTien,
          cv.MauSac AS Color  -- ĐÚNG: Lấy từ CongViec
        FROM LichTrinh lt
        INNER JOIN CongViec cv ON lt.MaCongViec = cv.MaCongViec
        WHERE lt.UserID = @userId  -- SỬA: Dùng lt.UserID thay vì cv.UserID
          AND lt.AI_DeXuat = 1
        ORDER BY lt.GioBatDau DESC
      `);

    const events = result.recordset.map((ev) => ({
      MaLichTrinh: ev.MaLichTrinh,
      MaCongViec: ev.MaCongViec,
      TieuDe: ev.TieuDe,
      GioBatDau: ev.GioBatDau,
      GioKetThuc: ev.GioKetThuc,
      GhiChu: ev.GhiChu || "AI đề xuất",
      Color: ev.Color || getColorByPriority(ev.MucDoUuTien || 2),
      priority: ev.MucDoUuTien,
      AI_DeXuat: 1,
    }));

    console.log(`✅ Trả về ${events.length} AI events cho user ${userId}`);

    res.json({ success: true, data: events });
  } catch (err) {
    console.error("Lỗi lấy lịch AI:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/debug-ai-events", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const pool = await dbPoolPromise;

    // Debug 1: Kiểm tra có AI events không
    const countResult = await pool.request().input("userId", sql.Int, userId)
      .query(`
      SELECT COUNT(*) as count 
      FROM LichTrinh 
      WHERE UserID = @userId AND AI_DeXuat = 1
    `);

    // Debug 2: Lấy danh sách chi tiết
    const detailResult = await pool.request().input("userId", sql.Int, userId)
      .query(`
      SELECT 
        lt.MaLichTrinh,
        lt.MaCongViec,
        lt.GioBatDau,
        lt.GioKetThuc,
        lt.AI_DeXuat,
        cv.TieuDe,
        cv.UserID as TaskUserID
      FROM LichTrinh lt
      LEFT JOIN CongViec cv ON lt.MaCongViec = cv.MaCongViec
      WHERE lt.UserID = @userId
        AND lt.AI_DeXuat = 1
      ORDER BY lt.GioBatDau DESC
    `);

    res.json({
      success: true,
      debug: {
        totalAIEvents: countResult.recordset[0]?.count || 0,
        events: detailResult.recordset,
        queryConditions: {
          userId: userId,
          AI_DeXuat: 1,
        },
      },
    });
  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/test-database-ai", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const pool = await dbPoolPromise;

    // 1. Kiểm tra tất cả events của user
    const allEvents = await pool.request().input("userId", sql.Int, userId)
      .query(`
      SELECT 
        MaLichTrinh,
        MaCongViec,
        GioBatDau,
        GioKetThuc,
        AI_DeXuat,
        UserID
      FROM LichTrinh
      WHERE UserID = @userId
      ORDER BY GioBatDau DESC
    `);

    // 2. Kiểm tra events vừa được tạo (last 10)
    const recentEvents = await pool.request().input("userId", sql.Int, userId)
      .query(`
      SELECT TOP 10 
        MaLichTrinh,
        MaCongViec,
        GioBatDau,
        GioKetThuc,
        AI_DeXuat
      FROM LichTrinh
      WHERE UserID = @userId
      ORDER BY MaLichTrinh DESC
    `);

    res.json({
      success: true,
      data: {
        totalEvents: allEvents.recordset.length,
        allEvents: allEvents.recordset,
        recentEvents: recentEvents.recordset,
        userInfo: {
          userId: userId,
          hasAIEvents: allEvents.recordset.some((e) => e.AI_DeXuat === 1),
        },
      },
    });
  } catch (error) {
    console.error("Test database error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
module.exports = router;
