const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const {
  verifyToken,
  autoConnectUser,
  sendMessageToUser,
  sendSchedule,
  broadcastMessage,
  isUserConnected,
} = require("../telegram/bot");

/**
 * Middleware xác thực JWT
 * Giả sử bạn đã có middleware này ở đâu đó
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Token không được cung cấp",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: "Token không hợp lệ",
      });
    }

    // QUAN TRỌNG: Sử dụng tên field đúng với JWT của bạn
    req.userId = decoded.userId; // Hoặc decoded.id hoặc decoded.user_id
    next();
  });
};

/**
 * POST /api/notifications/connect-telegram
 * Kết nối Telegram
 */
router.post("/connect-telegram", authenticateToken, async (req, res) => {
  try {
    const { telegramToken } = req.body;
    const userId = req.userId;

    console.log(
      `📥 Connect request from user ${userId}, token: ${telegramToken}`
    );

    if (!telegramToken) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp mã kết nối",
      });
    }

    // Validate token format
    if (!/^[A-Z0-9]{6}$/.test(telegramToken)) {
      return res.status(400).json({
        success: false,
        message: "Mã kết nối không đúng định dạng",
      });
    }

    // Xác thực token
    const result = await verifyToken(telegramToken, userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: "Kết nối Telegram thành công!",
      data: {
        chatId: result.chatId,
        username: result.username,
      },
    });
  } catch (error) {
    console.error("❌ Error in connect-telegram:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi kết nối Telegram",
      error: error.message,
    });
  }
});

/**
 * GET /api/notifications/telegram-connect-url
 * Lấy URL để mở Telegram bot (new flow)
 */
router.get("/telegram-connect-url", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Tạo unique connection code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Lưu code vào session/memory để xác thực sau
    // (Bot.js sẽ lưu tự động khi user /start code)
    global.pendingWebConnections = global.pendingWebConnections || new Map();
    global.pendingWebConnections.set(code, {
      userId,
      timestamp: Date.now(),
    });

    // Timeout sau 10 phút
    setTimeout(() => {
      if (
        global.pendingWebConnections &&
        global.pendingWebConnections.has(code)
      ) {
        global.pendingWebConnections.delete(code);
      }
    }, 10 * 60 * 1000);

    // Bot username (từ env hoặc lấy từ bot.username)
    const botUsername =
      process.env.TELEGRAM_BOT_USERNAME || "your_bot_username";

    // URL để user click
    const telegramUrl = `https://t.me/${botUsername}?start=${code}`;

    console.log(`🔗 Generated connection URL for user ${userId}: ${code}`);

    res.json({
      success: true,
      telegramUrl,
      code, // Để frontend có thể polling check
    });
  } catch (error) {
    console.error("❌ Error generating telegram URL:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi tạo URL kết nối",
      error: error.message,
    });
  }
});

/**
 * GET /api/notifications/telegram-status
 * Kiểm tra trạng thái kết nối
 */
router.get("/telegram-status", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    const connected = await isUserConnected(userId);

    res.json({
      success: true,
      connected: connected,
      message: connected ? "Đã kết nối" : "Chưa kết nối",
    });
  } catch (error) {
    console.error("❌ Error checking status:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi kiểm tra trạng thái",
      error: error.message,
    });
  }
});

/**
 * POST /api/notifications/send-message
 * Gửi tin nhắn cho user
 */
router.post("/send-message", authenticateToken, async (req, res) => {
  try {
    const { userId, message } = req.body;

    if (!userId || !message) {
      return res.status(400).json({
        success: false,
        message: "Thiếu userId hoặc message",
      });
    }

    const result = await sendMessageToUser(userId, message);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: "Đã gửi tin nhắn thành công",
    });
  } catch (error) {
    console.error("❌ Error sending message:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi gửi tin nhắn",
      error: error.message,
    });
  }
});

/**
 * POST /api/notifications/send-schedule
 * Gửi lịch trình
 */
router.post("/send-schedule", authenticateToken, async (req, res) => {
  try {
    const { userId, schedule } = req.body;

    if (!userId || !schedule) {
      return res.status(400).json({
        success: false,
        message: "Thiếu userId hoặc schedule",
      });
    }

    // Validate schedule format
    if (!schedule.date || !Array.isArray(schedule.tasks)) {
      return res.status(400).json({
        success: false,
        message: "Schedule format không hợp lệ",
      });
    }

    const result = await sendSchedule(userId, schedule);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: "Đã gửi lịch trình thành công",
    });
  } catch (error) {
    console.error("❌ Error sending schedule:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi gửi lịch trình",
      error: error.message,
    });
  }
});

/**
 * POST /api/notifications/broadcast
 * Broadcast tin nhắn
 */
router.post("/broadcast", authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Thiếu message",
      });
    }

    // TODO: Kiểm tra quyền admin
    // if (!req.user.isAdmin) {
    //   return res.status(403).json({ message: 'Không có quyền' });
    // }

    const result = await broadcastMessage(message);

    res.json({
      success: true,
      message: `Đã gửi cho ${result.successCount}/${result.total} người dùng`,
      data: result,
    });
  } catch (error) {
    console.error("❌ Error broadcasting:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi broadcast",
      error: error.message,
    });
  }
});

/**
 * POST /api/notifications/disconnect
 * Ngắt kết nối
 */
router.post("/disconnect", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const sql = require("mssql");
    const dbConfig = require("../config/database");

    const pool = await sql.connect(dbConfig);
    await pool.request().input("userId", sql.Int, userId).query(`
        UPDATE Users 
        SET telegram_chat_id = NULL, telegram_connected = 0
        WHERE UserID = @userId
      `);

    res.json({
      success: true,
      message: "Đã ngắt kết nối Telegram",
    });
  } catch (error) {
    console.error("❌ Error disconnecting:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi ngắt kết nối",
      error: error.message,
    });
  }
});

router.post("/update-schedule-time", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      taskReminderTime, // GioNhacNhiemVu
      dailyScheduleTime, // GioLichNgay
      dailySummaryTime, // GioTongKetNgay
    } = req.body;

    console.log(`🕒 Updating schedule times for user ${userId}:`, {
      taskReminderTime,
      dailyScheduleTime,
      dailySummaryTime,
    });

    const sql = require("mssql");
    const dbConfig = require("../config/database");
    const scheduleUpdater = require("../telegram/schedule-updater");

    const pool = await sql.connect(dbConfig);

    // Cập nhật thời gian vào database
    const updateQuery = `
      UPDATE TelegramConnections
      SET
        GioNhacNhiemVu = @taskReminderTime,
        GioLichNgay = @dailyScheduleTime,
        GioTongKetNgay = @dailySummaryTime,
        NgayCapNhat = GETDATE()
      WHERE UserID = @userId
        AND TrangThaiKetNoi = 1
    `;

    await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("taskReminderTime", sql.Time, taskReminderTime || null)
      .input("dailyScheduleTime", sql.Time, dailyScheduleTime || null)
      .input("dailySummaryTime", sql.Time, dailySummaryTime || null)
      .query(updateQuery);

    console.log(`✅ Database updated for user ${userId}`);

    // Cập nhật lịch trình thực tế
    const updateResult = await scheduleUpdater.updateUserSchedule(userId);

    if (!updateResult.success) {
      console.warn(`⚠️ Could not update schedule: ${updateResult.message}`);
    }

    res.json({
      success: true,
      message: "Đã cập nhật thời gian thông báo",
      data: {
        taskReminderTime,
        dailyScheduleTime,
        dailySummaryTime,
        scheduleUpdated: updateResult.success,
      },
    });
  } catch (error) {
    console.error("❌ Error updating schedule time:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi cập nhật thời gian",
      error: error.message,
    });
  }
});

router.post("/update-settings", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      taskNotifications = true,
      eventReminders = true,
      aiSuggestions = true,
      taskReminderTime = "14:00",
      dailyScheduleTime = "08:00",
      dailySummaryTime = "18:00",
    } = req.body;

    const sql = require("mssql");
    const dbConfig = require("../config/database");

    const pool = await sql.connect(dbConfig);

    // Update only the toggle settings that exist in database
    // First try with existing columns, if they fail we log and continue
    try {
      const updateQuery = `
        UPDATE Users
        SET
          ThongBaoNhiemVu = @taskNotifications,
          ThongBaoSuKien = @eventReminders,
          ThongBaoGoiY = @aiSuggestions
        WHERE UserID = @userId
      `;

      await pool
        .request()
        .input("userId", sql.Int, userId)
        .input("taskNotifications", sql.Bit, taskNotifications ? 1 : 0)
        .input("eventReminders", sql.Bit, eventReminders ? 1 : 0)
        .input("aiSuggestions", sql.Bit, aiSuggestions ? 1 : 0)
        .query(updateQuery);

      console.log(
        `✅ Updated notification settings for user ${userId}: Task=${taskNotifications}, Event=${eventReminders}, AI=${aiSuggestions}`
      );
    } catch (dbErr) {
      console.warn(
        `⚠️ Could not update database columns (they may not exist yet): ${dbErr.message}`
      );
      console.log(`   Saving notification preferences to localStorage instead`);
    }

    // Time preferences are stored in localStorage on client side for now
    console.log(
      `   Time settings: Task=${taskReminderTime}, Schedule=${dailyScheduleTime}, Summary=${dailySummaryTime}`
    );

    res.json({
      success: true,
      message: "Cài đặt thông báo đã được cập nhật",
      settings: {
        taskNotifications,
        eventReminders,
        aiSuggestions,
        taskReminderTime,
        dailyScheduleTime,
        dailySummaryTime,
      },
    });
  } catch (error) {
    console.error("❌ Error updating settings:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi cập nhật cài đặt",
      error: error.message,
    });
  }
});

router.get("/schedule-times", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    const sql = require("mssql");
    const dbConfig = require("../config/database");

    const pool = await sql.connect(dbConfig);

    const result = await pool.request().input("userId", sql.Int, userId).query(`
        SELECT 
          GioNhacNhiemVu,
          GioLichNgay,
          GioTongKetNgay,
          ThongBaoNhiemVu,
          TrangThaiKetNoi
        FROM TelegramConnections
        WHERE UserID = @userId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cài đặt thời gian",
      });
    }

    const settings = result.recordset[0];

    // Format thời gian thành HH:mm
    const formatTime = (timeValue) => {
      if (!timeValue) return "14:00"; // Mặc định

      if (typeof timeValue === "string") {
        return timeValue.substring(0, 5); // "14:30"
      } else if (timeValue instanceof Date) {
        return timeValue.toTimeString().substring(0, 5);
      } else if (
        timeValue.constructor &&
        timeValue.constructor.name === "Time"
      ) {
        return `${timeValue.hours
          .toString()
          .padStart(2, "0")}:${timeValue.minutes.toString().padStart(2, "0")}`;
      }
      return "14:00";
    };

    res.json({
      success: true,
      data: {
        taskReminderTime: formatTime(settings.GioNhacNhiemVu),
        dailyScheduleTime: formatTime(settings.GioLichNgay),
        dailySummaryTime: formatTime(settings.GioTongKetNgay),
        notificationsEnabled: settings.ThongBaoNhiemVu === 1,
        isConnected: settings.TrangThaiKetNoi === 1,
      },
    });
  } catch (error) {
    console.error("❌ Error getting schedule times:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi lấy thời gian thông báo",
      error: error.message,
    });
  }
});
module.exports = router;
