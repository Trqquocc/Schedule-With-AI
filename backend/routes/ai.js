const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { dbPoolPromise, sql } = require("../config/database");
require("dotenv").config();

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
        maxOutputTokens: 4096,
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

function analyzeRecurringPatterns(additionalInstructions) {
  if (!additionalInstructions?.trim()) return [];

  const patterns = [];
  const text = additionalInstructions.toLowerCase().trim();

  console.log(`🔍 Analyzing text: "${text}"`);

  const isDailyPattern =
    /mỗi ngày|hàng ngày|every day|daily|từ.*đến|t2.*cn|thứ 2.*chủ nhật|monday.*sunday|trong tuần|weekday/.test(
      text
    );
  const isWeeklyPattern =
    /hàng tuần|mỗi tuần|every week|weekly|từ.*t\d|được học/.test(text);
  const hasSpecificDays =
    /t\d|thứ \d|monday|tuesday|wednesday|thursday|friday|saturday|sunday|cn|chủ nhật/.test(
      text
    );

  console.log(`  isDailyPattern: ${isDailyPattern}`);
  console.log(`  isWeeklyPattern: ${isWeeklyPattern}`);
  console.log(`  hasSpecificDays: ${hasSpecificDays}`);

  const timeRegex =
    /(\d{1,2})(?::(\d{2}))?\s*(?:h|giờ|am|pm)(?:\s*(?:sáng|chiều|tối|đêm))?\s*(?:(?:đến|-)\s*)?(\d{1,2})?(?::(\d{2}))?\s*(?:h|giờ|am|pm)?/gi;

  const times = [];
  let timeMatch;
  const textLower = additionalInstructions.toLowerCase();
  const seenTimes = new Set(); 

  while ((timeMatch = timeRegex.exec(textLower)) !== null) {
    let startHour = parseInt(timeMatch[1]);
    const startMin = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    let endHour = timeMatch[3] ? parseInt(timeMatch[3]) : null;
    const endMin = timeMatch[4] ? parseInt(timeMatch[4]) : 0;

    const beforeText = textLower.substring(
      Math.max(0, timeMatch.index - 30),
      timeMatch.index
    );
    const afterText = textLower.substring(
      timeMatch.index,
      Math.min(textLower.length, timeMatch.index + 50)
    );
    const context = beforeText + afterText;

    if (
      (context.includes("tối") ||
        context.includes("chiều") ||
        context.includes("đêm")) &&
      startHour < 12
    ) {
      startHour += 12;
      if (endHour && endHour < 12) endHour += 12;
    }

    const timeKey = `${startHour}:${startMin}-${endHour || "end"}:${endMin}`;
    if (seenTimes.has(timeKey)) {
      console.log(`  ⏭️ Skipping duplicate time: ${timeKey}`);
      continue;
    }
    seenTimes.add(timeKey);

    times.push({
      startHour,
      startMin,
      endHour,
      endMin,
    });

    console.log(
      `  ✅ Found time: ${startHour.toString().padStart(2, "0")}:${startMin
        .toString()
        .padStart(2, "0")}${
        endHour ? ` - ${endHour.toString().padStart(2, "0")}:${endMin}` : ""
      }`
    );
  }

  const dayMap = {
    "\\bt2\\b|thứ\\s*2|thứ\\s*hai|monday": 2,
    "\\bt3\\b|thứ\\s*3|thứ\\s*ba|tuesday": 3,
    "\\bt4\\b|thứ\\s*4|thứ\\s*tư|wednesday": 4,
    "\\bt5\\b|thứ\\s*5|thứ\\s*năm|thursday": 5,
    "\\bt6\\b|thứ\\s*6|thứ\\s*sáu|friday": 6,
    "\\bt7\\b|thứ\\s*7|thứ\\s*bảy|saturday": 7,
    "\\bcn\\b|chủ\\s*nhật|sunday": 1,
  };

  const days = [];

  if (isDailyPattern && !hasSpecificDays) {
    days.push(1, 2, 3, 4, 5, 6, 7);
    console.log(`  Daily pattern detected: all days (1-7)`);
  } else if (isDailyPattern && hasSpecificDays) {
    Object.entries(dayMap).forEach(([pattern, dayNum]) => {
      if (new RegExp(pattern, "i").test(text)) {
        if (!days.includes(dayNum)) days.push(dayNum);
      }
    });
    if (days.length === 0) days.push(1, 2, 3, 4, 5, 6, 7);
    console.log(`  Daily + specific days: ${days}`);
  } else {
    Object.entries(dayMap).forEach(([pattern, dayNum]) => {
      if (new RegExp(pattern, "i").test(text)) {
        if (!days.includes(dayNum)) days.push(dayNum);
      }
    });

    if (isWeeklyPattern && days.length === 0) {
      days.push(1, 2, 3, 4, 5, 6, 7);
      console.log(`  Weekly pattern, no specific days: defaulting to all days`);
    }

    console.log(`  Extracted days: ${days}`);
  }

  if (times.length > 0 && days.length > 0) {
    const pattern = {
      frequency: isDailyPattern ? "daily" : "weekly",
      times: times,
      days: days.sort((a, b) => a - b),
      rawText: additionalInstructions,
    };
    patterns.push(pattern);
    console.log(`✅ Pattern created:`, pattern);
  } else {
    console.log(
      `⚠️ Not enough data for pattern - times: ${times.length}, days: ${days.length}`
    );
  }

  console.log(`📋 Total patterns found: ${patterns.length}`);
  return patterns;
}

async function getTaskDetailsFromDatabase(taskIds, userId) {
  try {
    if (!taskIds || taskIds.length === 0) {
      return [];
    }

    const pool = await dbPoolPromise;
    const taskIdList = taskIds.join(",");

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

    const timeMap = {
      1: "morning",
      2: "noon",
      3: "afternoon",
      4: "evening",
      5: "anytime",
    };

    const taskDetails = result.recordset.map((task) => {
      return {
        id: task.id,
        title: task.title,
        estimatedMinutes: task.estimatedMinutes || 60,
        priority: task.priority || 2,
        complexity: task.complexity || 2,
        focusLevel: task.focusLevel || 2,
        suitableTime: timeMap[task.suitableTimeCode] || "anytime",
        color: task.color || getColorByPriority(task.priority || 2), 
      };
    });

    console.log(`Loaded ${taskDetails.length} task details from database`);
    return taskDetails;
  } catch (error) {
    console.error("Error fetching task details:", error);
    return [];
  }
}


function getColorByPriority(priority) {
  switch (priority) {
    case 1:
      return "#10B981"; 
    case 2:
      return "#3B82F6"; 
    case 3:
      return "#F59E0B"; 
    case 4:
      return "#EF4444"; 
    default:
      return "#8B5CF6"; 
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

  const recurringPatterns = analyzeRecurringPatterns(additionalInstructions);

  const recurringPatternsText =
    recurringPatterns.length > 0
      ? `\n📅 CÁC YÊU CẦU LẶP LẠI ĐÃ PHÁT HIỆN:
${recurringPatterns
  .map(
    (p, idx) => `
  ${idx + 1}. Tần suất: ${p.frequency === "daily" ? "Hàng ngày" : "Hàng tuần"}
     Ngày: ${p.days
       .map((d) => ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d])
       .join(", ")}
     Thời gian: ${p.times
       .map(
         (t) =>
           `${t.startHour.toString().padStart(2, "0")}:${t.startMin
             .toString()
             .padStart(2, "0")}${
             t.endHour
               ? ` - ${t.endHour.toString().padStart(2, "0")}:${t.endMin
                   .toString()
                   .padStart(2, "0")}`
               : ""
           }`
       )
       .join(", ")}
`
  )
  .join("\n")}
`
      : "";

  const dayNames = {
    1: "Chủ nhật",
    2: "Thứ hai",
    3: "Thứ ba",
    4: "Thứ tư",
    5: "Thứ năm",
    6: "Thứ sáu",
    7: "Thứ bảy",
  };

  const additionalInstructionsText = additionalInstructions.trim()
    ? `\n📝 HƯỚNG DẪN THÊM CỦA NGƯỜI DÙNG:\n${additionalInstructions}\n`
    : "";

  return `Bạn là trợ lý lập lịch thông minh chuyên biệt. NHIỆM VỤ: Sắp xếp TẤT CẢ ${
    taskDetails.length
  } công việc dưới đây vào lịch.

⚠️ QUAN TRỌNG: BẠN PHẢI TẠO SUGGESTIONS CHO TẤT CẢ CÁC CÔNG VIỆC SAU, KHÔNG ĐƯỢC BỎ SÓT CÔNG VIỆC NÀO:

═══════════════════════════════════════════════════════════════
CÁC CÔNG VIỆC BẮT BUỘC PHẢI SẮP XẾP (${taskDetails.length} cái):
═══════════════════════════════════════════════════════════════
${taskList}

═══════════════════════════════════════════════════════════════
KHOẢNG THỜI GIAN:
═══════════════════════════════════════════════════════════════
Từ ${startDate} đến ${endDate}

═══════════════════════════════════════════════════════════════
LỊCH HIỆN CÓ (TRÁNH TRÙNG):
═══════════════════════════════════════════════════════════════
${existingEvents.length > 0 ? existingSchedule : "Không có lịch hiện tại"}

═══════════════════════════════════════════════════════════════
YÊU CẦU CẤU HÌNH CHUNG:
═══════════════════════════════════════════════════════════════
1. ${
    options.considerPriority
      ? "✓ Ưu tiên việc quan trọng (priority cao) trước"
      : "○ Không cần ưu tiên"
  }
2. ${
    options.avoidConflict
      ? "✓ Tránh trùng với lịch hiện tại"
      : "○ Không cần tránh trùng"
  }
3. ${
    options.balanceWorkload
      ? "✓ Cân bằng công việc giữa các ngày"
      : "○ Không cần cân bằng"
  }
4. Mỗi ngày không quá 8 tiếng làm việc
5. Làm việc trong khung giờ 08:00 đến 22:00

═══════════════════════════════════════════════════════════════
YÊU CẦU TỪ NGƯỜI DÙNG:
═══════════════════════════════════════════════════════════════
${
  additionalInstructions.trim()
    ? additionalInstructions
    : "(Không có yêu cầu đặc biệt)"
}

═══════════════════════════════════════════════════════════════
HƯỚNG DẪN XỬ LÝ CHI TIẾT:
═══════════════════════════════════════════════════════════════

🔴 QUAN TRỌNG: NẾU YÊU CẦU CÓ "LẶP LẠI", "HÀNG NGÀY", "HÀNG TUẦN", v.v:
   → TẠO NHIỀU ENTRIES (một cho mỗi ngày/lần lặp)
   
   Ví dụ yêu cầu: "công việc ABCD được làm vào 6h sáng hằng ngày trong tuần"
   → Phải tạo 7 events (một T2, T3, T4, T5, T6, T7, CN) tất cả lúc 06:00
   
   Ví dụ yêu cầu: "lịch dạy môn A từ 6h-9h tối T2 và T7 hàng tuần"
   → Phải tạo 2 events mỗi tuần (T2 18:00-21:00 và T7 18:00-21:00) cho mỗi tuần
   
   Ví dụ yêu cầu: "tập gym 6h sáng mỗi ngày (từ T2-CN)"
   → Phải tạo 6 events lúc 06:00 cho mỗi ngày làm việc

👉 PHÂN TÍCH THỜI GIAN TRONG YÊU CẦU:
   - "6h sáng" → 06:00
   - "6h tối" / "6h chiều muộn" / "18h" → 18:00
   - "6h-9h" → từ 06:00 đến 09:00 (duration = 180 phút)
   - "10h30" / "10:30" → 10:30

👉 PHÂN TÍCH NGÀY TRONG YÊU CẦU (đây là điều QUAN TRỌNG):
   - "T2" = Thứ 2 (${dayNames[2]})
   - "T3" = Thứ 3 (${dayNames[3]})
   - "T4" = Thứ 4 (${dayNames[4]})
   - "T5" = Thứ 5 (${dayNames[5]})
   - "T6" = Thứ 6 (${dayNames[6]})
   - "T7" = Thứ 7 (${dayNames[7]})
   - "CN" = Chủ nhật (${dayNames[1]})
   - "hằng ngày" / "mỗi ngày" / "trong tuần" = T2-CN (7 ngày)
   - "hàng tuần" = lặp lại hàng tuần theo ngày chỉ định
   - "từ T2 đến T6" = T2, T3, T4, T5, T6 (5 ngày)
   - "T2 và T7" / "T2,T7" = chỉ T2 và T7

👉 THỰC HIỆN LẶP LẠI TRONG KHOẢNG NGÀY:
   - Khoảng ngày: ${startDate} đến ${endDate}
   - Nếu yêu cầu "hàng ngày", tạo 1 event cho mỗi ngày trong khoảng
   - Nếu yêu cầu "hàng tuần", tạo 1 event cho mỗi lần ngày đó xuất hiện trong khoảng
   - KHÔNG chỉ tạo 1 event duy nhất!

═══════════════════════════════════════════════════════════════
ĐỊNH DẠNG RESPONSE (CHỈ TRẢ VỀ JSON HỢPLỆ, KHÔNG GIẢI THÍCH):
═══════════════════════════════════════════════════════════════

{
  "suggestions": [
    {
      "taskId": 3013,
      "scheduledTime": "2025-12-15T06:00:00",
      "durationMinutes": 60,
      "reason": "Công việc ABCD 6h sáng T2",
      "isRecurring": true
    },
    {
      "taskId": 3013,
      "scheduledTime": "2025-12-16T06:00:00",
      "durationMinutes": 60,
      "reason": "Công việc ABCD 6h sáng T3",
      "isRecurring": true
    }
  ],
  "summary": "Đã tạo 7 events lặp lại mỗi ngày cho công việc ABCD lúc 06:00 từ T2-CN",
  "statistics": {
    "totalTasks": 1,
    "totalHours": 7,
    "daysUsed": 7,
    "recurringEvents": 7
  }
}

═══════════════════════════════════════════════════════════════
LUẬT BẮT BUỘC:
═══════════════════════════════════════════════════════════════
1. LUÔN trả JSON hợp lệ, không kèm giải thích
2. scheduledTime PHẢI nằm trong khoảng: ${startDate} - ${endDate}
3. Nếu là lặp lại, PHẢI có nhiều entries (đừng chỉ 1)
4. Mỗi entry = 1 event cụ thể tại 1 ngày/giờ
5. "reason" bằng Tiếng Việt, giải thích tại sao chọn thời gian này
6. Nếu không hiểu yêu cầu, dùng "suitableTime" từ danh sách công việc`;
}

async function callGeminiAI(prompt) {
  try {
    console.log("Calling Gemini AI API...");

    if (!geminiAvailable || !geminiModel) {
      throw new Error("Gemini AI is not available");
    }

    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}`);

        if (attempt > 1) {
          const delayMs = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Waiting ${delayMs}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("Gemini AI response received");
        console.log(`Response length: ${text.length} chars`);
        console.log(`First 200 chars: ${text.substring(0, 200)}`);
        console.log(`Gemini response: ${text.substring(0, 300)}`);

        let jsonMatch = text.match(/{[\s\S]*}/);

        if (!jsonMatch) {
          const backtickMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (backtickMatch) {
            const cleaned = backtickMatch[1].trim();
            jsonMatch = cleaned.match(/{[\s\S]*}/);
          }
        }

        if (!jsonMatch && text.trim().startsWith("{")) {
          jsonMatch = [text.trim()];
        }

        if (!jsonMatch) {
          console.error("❌ Gemini response:", text.substring(0, 500));
          throw new Error("No JSON found in response");
        }

        const jsonStr = jsonMatch[0];
        console.log(`✅ Extracted JSON (${jsonStr.length} chars)`);

        let parsed;
        try {
          parsed = JSON.parse(jsonStr);
        } catch (parseError) {
          console.error("❌ JSON parse error:", parseError.message);
          console.error("Attempted JSON:", jsonStr.substring(0, 300));
          throw new Error(`Invalid JSON: ${parseError.message}`);
        }

        if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
          throw new Error("Invalid response format: missing suggestions array");
        }

        if (parsed.suggestions.length === 0) {
          throw new Error("AI returned empty suggestions array");
        }

        console.log(
          `✅ Parsed ${parsed.suggestions.length} suggestions successfully`
        );
        return parsed;
      } catch (attemptError) {
        lastError = attemptError;
        console.log(`❌ Attempt ${attempt} failed:`, attemptError.message);
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
          "📋 Prompt length:",
          prompt.length,
          "chars | First 300 chars:"
        );
        console.log(prompt.substring(0, 300) + "...\n");

        aiResult = await callGeminiAI(prompt);
        mode = "gemini";
        console.log(
          "✅ Gemini AI processed successfully with",
          aiResult.suggestions?.length || 0,
          "suggestions"
        );
      } catch (aiError) {
        console.error(
          "❌ Gemini AI failed:",
          aiError.message,
          "| Falling back to simulation..."
        );
        aiResult = await generateSimulatedScheduleWithInstructions(
          taskDetails,
          startDate,
          endDate,
          options,
          existingEvents,
          additionalInstructions
        );
        mode = "simulation_fallback";
      }
    } else {
      console.log("⚠️ Gemini not available, using simulation mode...");
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
  console.log("🎯 Generating simulated schedule WITH instruction analysis...");
  console.log("Additional instructions:", additionalInstructions);

  const recurringPatterns = analyzeRecurringPatterns(additionalInstructions);
  console.log(`📋 Found ${recurringPatterns.length} recurring pattern(s)`);

  const suggestions = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  if (recurringPatterns.length > 0) {
    console.log(
      `\n🔄 Processing ${recurringPatterns.length} recurring pattern(s)...`
    );

    for (const pattern of recurringPatterns) {
      console.log(
        `\n  Pattern: ${pattern.frequency} on days [${pattern.days.join(
          ", "
        )}] at times:`,
        pattern.times.map(
          (t) =>
            `${t.startHour.toString().padStart(2, "0")}:${t.startMin
              .toString()
              .padStart(2, "0")}`
        )
      );

      let selectedTask = null;
      const instructionLower = additionalInstructions.toLowerCase();

      for (const task of taskDetails) {
        const taskTitle = task.title.toLowerCase();
        if (instructionLower.includes(taskTitle)) {
          selectedTask = task;
          console.log(`    ✓ Found task in instructions: "${task.title}"`);
          break;
        }
      }

      if (!selectedTask) {
        selectedTask = taskDetails[0];
        console.log(
          `    ⚠️ No specific task found, using first task: "${selectedTask.title}"`
        );
      }

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
              const startTotalMin = time.startHour * 60 + time.startMin;
              const endTotalMin = time.endHour * 60 + time.endMin;
              durationMinutes = endTotalMin - startTotalMin;
            }

            suggestions.push({
              taskId: selectedTask.id,
              scheduledTime: eventDate.toISOString(),
              durationMinutes: Math.max(durationMinutes, 30), 
              reason: `${selectedTask.title} - Lúc ${time.startHour
                .toString()
                .padStart(2, "0")}:${time.startMin
                .toString()
                .padStart(2, "0")}${
                time.endHour
                  ? ` - ${time.endHour
                      .toString()
                      .padStart(2, "0")}:${time.endMin
                      .toString()
                      .padStart(2, "0")}`
                  : ""
              }`,
              color: selectedTask.color,
              isRecurring: true,
            });

            const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
            console.log(
              `    ✅ ${dayNames[dayOfWeek]} ${eventDate.toLocaleDateString(
                "vi-VN"
              )} ${time.startHour.toString().padStart(2, "0")}:${time.startMin
                .toString()
                .padStart(2, "0")} → "${selectedTask.title}"`
            );
          }
        }
      }
    }

    console.log(`\n📊 Total recurring events created: ${suggestions.length}`);
  }

  if (suggestions.length === 0) {
    console.log("⚠️ No recurring patterns found, using default scheduling...");
    const baseSchedule = await generateSimulatedSchedule(
      taskDetails,
      startDate,
      endDate,
      options,
      existingEvents
    );
    return {
      ...baseSchedule,
      summary:
        baseSchedule.summary + " (Chế độ mặc định, không có yêu cầu cụ thể)",
    };
  }

  const uniqueDays = new Set(
    suggestions.map((s) => new Date(s.scheduledTime).toDateString())
  ).size;

  const totalMinutes = suggestions.reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );

  const recurringCount = suggestions.filter((s) => s.isRecurring).length;

  return {
    suggestions: suggestions.map(({ isRecurring, recurringDay, ...rest }) => ({
      ...rest,
    })),
    summary: `Đã tạo ${
      suggestions.length
    } khung giờ (bao gồm ${recurringCount} events lặp lại) từ các yêu cầu cụ thể trong ${uniqueDays} ngày. Tổng thời lượng: ${Math.round(
      totalMinutes / 60
    )} giờ.`,
    statistics: {
      totalTasks: suggestions.length,
      totalHours: Math.round(totalMinutes / 60),
      daysUsed: uniqueDays,
      recurringEvents: recurringCount,
    },
  };
}

router.post("/save-ai-suggestions", authenticateToken, async (req, res) => {
  const { suggestions } = req.body;
  const userId = req.userId;

  console.log(`\n📝 SAVE AI SUGGESTIONS REQUEST`);
  console.log(`   User: ${userId}`);
  console.log(`   Suggestions: ${suggestions?.length || 0}`);
  if (suggestions?.length > 0) {
    console.log(
      `   First suggestion:`,
      JSON.stringify(suggestions[0], null, 2)
    );
  }

  if (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) {
    return res.status(400).json({ success: false, message: "Danh sách rỗng" });
  }

  const uniqueKey = `${userId}_${suggestions
    .map((s) => s.taskId)
    .sort()
    .join("_")}`;
  if (
    global.lastAISaveKey === uniqueKey &&
    Date.now() - global.lastAISaveTime < 5000
  ) {
    console.log("⚠️ Duplicate save attempt detected - skipping");
    return res.json({
      success: true,
      saved: 0,
      message: "Đã lưu rồi, không lưu lại",
    });
  }
  global.lastAISaveKey = uniqueKey;
  global.lastAISaveTime = Date.now();

  try {
    const pool = await dbPoolPromise;

    const deleteResult = await pool.request().input("userId", sql.Int, userId)
      .query(`
        DELETE FROM LichTrinh 
        WHERE UserID = @userId AND AI_DeXuat = 1
      `);

    const deletedCount = deleteResult.rowsAffected?.[0] || 0;
    console.log(`🗑️ Deleted ${deletedCount} old AI events (kept normal tasks)`);

    const savedIds = [];
    const saveStartTime = Date.now();

    for (const s of suggestions) {
      const start = new Date(s.scheduledTime);
      const end = new Date(start.getTime() + s.durationMinutes * 60000);

      console.log(
        `\n   Saving: "${s.title || "AI Schedule"}" (Task ${s.taskId})`
      );
      console.log(
        `   Time: ${start.toLocaleString("vi-VN")} → ${end.toLocaleString(
          "vi-VN"
        )}`
      );
      console.log(`   Duration: ${s.durationMinutes} min`);

      const checkDuplicate = await pool
        .request()
        .input("taskId", sql.Int, s.taskId)
        .input("startTime", sql.DateTime, start)
        .input("userId", sql.Int, userId).query(`
          SELECT TOP 1 MaLichTrinh 
          FROM LichTrinh 
          WHERE MaCongViec = @taskId 
            AND GioBatDau = @startTime 
            AND UserID = @userId
            AND AI_DeXuat = 1
        `);

      if (checkDuplicate.recordset.length > 0) {
        console.log(`   ⚠️ Event already exists - skipping`);
        savedIds.push(checkDuplicate.recordset[0].MaLichTrinh);
        continue;
      }

      const result = await pool
        .request()
        .input("taskId", sql.Int, s.taskId)
        .input("startTime", sql.DateTime, start)
        .input("endTime", sql.DateTime, end)
        .input("note", sql.NVarChar, s.reason || "Được đề xuất bởi AI")
        .input("color", sql.NVarChar, s.color || "#8B5CF6")
        .input("userId", sql.Int, userId).query(`
          INSERT INTO LichTrinh 
            (MaCongViec, GioBatDau, GioKetThuc, GhiChu, AI_DeXuat, UserID)
          OUTPUT INSERTED.MaLichTrinh
          VALUES 
            (@taskId, @startTime, @endTime, @note, 1, @userId)
        `);

      if (result.recordset[0]) {
        const newId = result.recordset[0].MaLichTrinh;
        savedIds.push(newId);
        console.log(`   ✅ Saved with ID: ${newId}`);
      }
    }

    const saveTime = Date.now() - saveStartTime;
    console.log(
      `\n✅ Đã lưu ${savedIds.length}/${suggestions.length} lịch AI mới (${saveTime}ms)`
    );
    console.log(`   IDs: ${savedIds.join(", ")}`);

    try {
      const summaryContent = suggestions
        .map(
          (s, i) =>
            `${i + 1}. ${s.title || "Công việc"} - ${
              s.durationMinutes || 60
            } phút`
        )
        .join("\n");

      await pool
        .request()
        .input("userId", sql.Int, userId)
        .input("content", sql.NVarChar, `AI Proposal:\n${summaryContent}`)
        .input("applyTime", sql.DateTime, new Date()).query(`
          IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
                     WHERE TABLE_NAME='PhienAIDeXuat')
          BEGIN
            INSERT INTO PhienAIDeXuat (UserID, NgayDeXuat, NoiDungYeuCau, DaApDung, ThoiGianApDung)
            VALUES (@userId, GETDATE(), @content, 1, @applyTime)
          END
        `);

      console.log("✅ Tracked AI proposal");
    } catch (trackError) {
      console.warn("⚠️ Could not track:", trackError.message);
    }

    res.json({
      success: true,
      saved: savedIds.length,
      savedIds: savedIds,
      deletedOld: deletedCount,
    });
  } catch (err) {
    console.error("❌ Lỗi lưu AI suggestions:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/ai-events", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    console.log(`\n📡 GET /ai-events - User ${userId} đang yêu cầu AI events`);
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

    const totalRecords = result.recordset.length;
    console.log(`   📦 Total: ${totalRecords}`);

    const eventMap = new Map();
    result.recordset.forEach((r) => {
      const key = `${r.MaCongViec}_${r.GioBatDau.getTime()}`;
      if (!eventMap.has(key)) {
        eventMap.set(key, r);
      }
    });

    const uniqueRecords = Array.from(eventMap.values());
    console.log(
      `   ✅ Unique: ${uniqueRecords.length} (removed ${
        totalRecords - uniqueRecords.length
      })`
    );

    const events = uniqueRecords.map((ev) => ({
      MaLichTrinh: ev.MaLichTrinh,
      MaCongViec: ev.MaCongViec,
      TieuDe: ev.TieuDe || "Lịch trình AI",
      GioBatDau: ev.GioBatDau,
      GioKetThuc: ev.GioKetThuc,
      GhiChu: ev.GhiChu || "✨ Được AI tối ưu",
      Color: ev.Color,
      priority: ev.MucDoUuTien,
      AI_DeXuat: ev.AI_DeXuat,
    }));

    console.log(`✅ Returned ${events.length} unique AI events`);

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error("❌ Error fetching AI events:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
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

    const countResult = await pool.request().input("userId", sql.Int, userId)
      .query(`
        SELECT COUNT(*) as count 
        FROM LichTrinh 
        WHERE UserID = @userId AND AI_DeXuat = 1
      `);

    const oldCount = countResult.recordset[0]?.count || 0;

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

    const countResult = await pool.request().input("userId", sql.Int, userId)
      .query(`
      SELECT COUNT(*) as count 
      FROM LichTrinh 
      WHERE UserID = @userId AND AI_DeXuat = 1
    `);

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

router.get("/history", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 20, offset = 0 } = req.query;

    const pool = await dbPoolPromise;

    const tableCheckResult = await pool.request().query(`
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME='PhienAIDeXuat'
    `);

    if (tableCheckResult.recordset.length === 0) {
      console.warn("⚠️ PhienAIDeXuat table không tồn tại");
      return res.json({
        success: true,
        data: [],
        message: "PhienAIDeXuat table chưa được tạo",
      });
    }

    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("limit", sql.Int, parseInt(limit))
      .input("offset", sql.Int, parseInt(offset)).query(`
        SELECT TOP (@limit)
          MaPhienDeXuat,
          UserID,
          NgayDeXuat,
          NoiDungYeuCau,
          DaApDung,
          ThoiGianApDung,
          GhiChu
        FROM PhienAIDeXuat
        WHERE UserID = @userId
        ORDER BY NgayDeXuat DESC
        OFFSET @offset ROWS
      `);

    const countResult = await pool.request().input("userId", sql.Int, userId)
      .query(`
        SELECT COUNT(*) as total FROM PhienAIDeXuat WHERE UserID = @userId
      `);

    const total = countResult.recordset[0]?.total || 0;

    const stats = await pool.request().input("userId", sql.Int, userId).query(`
        SELECT 
          COUNT(*) as totalProposals,
          SUM(CASE WHEN DaApDung = 1 THEN 1 ELSE 0 END) as appliedCount,
          SUM(CASE WHEN DaApDung = 0 THEN 1 ELSE 0 END) as pendingCount
        FROM PhienAIDeXuat
        WHERE UserID = @userId
      `);

    const statsData = stats.recordset[0] || {
      totalProposals: 0,
      appliedCount: 0,
      pendingCount: 0,
    };

    console.log(
      `📊 Got AI proposal history for user ${userId}: ${result.recordset.length} records`
    );

    res.json({
      success: true,
      data: result.recordset,
      stats: {
        total: total,
        totalProposals: statsData.totalProposals || 0,
        appliedCount: statsData.appliedCount || 0,
        pendingCount: statsData.pendingCount || 0,
        appliedPercentage: statsData.totalProposals
          ? Math.round(
              ((statsData.appliedCount || 0) / statsData.totalProposals) * 100
            )
          : 0,
      },
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: total,
      },
    });
  } catch (error) {
    console.error("❌ Error getting AI history:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


router.put("/history/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const proposalId = req.params.id;
    const { DaApDung } = req.body;

    const pool = await dbPoolPromise;

    const checkResult = await pool
      .request()
      .input("id", sql.Int, proposalId)
      .input("userId", sql.Int, userId).query(`
        SELECT 1 FROM PhienAIDeXuat 
        WHERE MaPhienDeXuat = @id AND UserID = @userId
      `);

    if (checkResult.recordset.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền truy cập proposal này",
      });
    }

    const updateResult = await pool
      .request()
      .input("id", sql.Int, proposalId)
      .input("DaApDung", sql.Bit, DaApDung ? 1 : 0)
      .input("ThoiGianApDung", sql.DateTime2, new Date()).query(`
        UPDATE PhienAIDeXuat
        SET DaApDung = @DaApDung,
            ThoiGianApDung = CASE WHEN @DaApDung = 1 THEN @ThoiGianApDung ELSE NULL END
        WHERE MaPhienDeXuat = @id
      `);

    console.log(
      `✅ Updated proposal ${proposalId}: DaApDung=${DaApDung ? 1 : 0}`
    );

    res.json({
      success: true,
      message: `Đã cập nhật proposal #${proposalId}`,
    });
  } catch (error) {
    console.error("❌ Error updating proposal:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const pool = await dbPoolPromise;

    const tableCheckResult = await pool.request().query(`
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME='PhienAIDeXuat'
    `);

    if (tableCheckResult.recordset.length === 0) {
      return res.json({
        success: true,
        data: {
          totalRequests: 0,
          appliedRequests: 0,
          pendingRequests: 0,
          appliedPercentage: 0,
          lastUsed: null,
        },
        message: "PhienAIDeXuat table chưa được tạo",
      });
    }

    const result = await pool.request().input("userId", sql.Int, userId).query(`
        SELECT 
          COUNT(*) as totalRequests,
          SUM(CASE WHEN DaApDung = 1 THEN 1 ELSE 0 END) as appliedRequests,
          SUM(CASE WHEN DaApDung = 0 THEN 1 ELSE 0 END) as pendingRequests,
          MAX(CASE WHEN DaApDung = 1 THEN ThoiGianApDung END) as lastApplied,
          MAX(NgayDeXuat) as lastRequested
        FROM PhienAIDeXuat
        WHERE UserID = @userId
      `);

    const stats = result.recordset[0] || {
      totalRequests: 0,
      appliedRequests: 0,
      pendingRequests: 0,
    };

    const appliedPercentage = stats.totalRequests
      ? Math.round((stats.appliedRequests / stats.totalRequests) * 100)
      : 0;

    console.log(`📈 AI stats for user ${userId}:`, {
      total: stats.totalRequests,
      applied: stats.appliedRequests,
      appliedPercent: appliedPercentage,
    });

    res.json({
      success: true,
      data: {
        totalRequests: stats.totalRequests || 0,
        appliedRequests: stats.appliedRequests || 0,
        pendingRequests: stats.pendingRequests || 0,
        appliedPercentage: appliedPercentage,
        lastUsed: stats.lastApplied || stats.lastRequested || null,
      },
    });
  } catch (error) {
    console.error("❌ Error getting AI stats:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
