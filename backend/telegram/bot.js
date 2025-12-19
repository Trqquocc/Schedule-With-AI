require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const sql = require("mssql");
const {
  sql: sqlModule,
  config: dbConfig,
  dbPoolPromise,
} = require("../config/database");

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("❌ TELEGRAM_BOT_TOKEN is missing in .env file!");
  console.error(
    "Please create .env file with TELEGRAM_BOT_TOKEN=your_token_here"
  );
  process.exit(1);
}

// Khởi tạo bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: true,
});

// Map pending connections (token -> data)
const pendingConnections = new Map();

console.log("🤖 Telegram Bot đang chạy...");

/**
 * /start - Lấy mã kết nối hoặc xác thực từ web (auto-connect)
 */
bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || "bạn";
  const username = msg.from.username || "";
  const code = match && match[1] ? match[1].trim() : null;

  console.log(`📥 /start from chatId: ${chatId}, @${username}, code: ${code}`);

  // Nếu có code từ web, tự động kết nối
  if (code) {
    console.log(`🔐 Processing connection code: ${code}`);
    await autoConnectUser(code, chatId, username, firstName);
    return;
  }

  // Không có code - gửi hướng dẫn
  const welcomeMessage = `
🎉 <b>Chào mừng ${firstName}!</b>

Bạn đã kết nối với bot lịch trình của chúng tôi.

Bạn sẽ nhận:
✅ Lịch trình hàng ngày (8:00 AM)
✅ Nhắc nhở nhiệm vụ (2:00 PM)
✅ Tổng kết cuối ngày (6:00 PM)

<b>Gõ /help để xem các lệnh khác.</b>
  `;

  await bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
});

/**
 * /help - Hướng dẫn
 */
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;

  const helpMessage = `
📋 <b>Danh sách lệnh</b>

/start - Lấy mã kết nối mới
/help - Xem hướng dẫn
/status - Kiểm tra kết nối
/schedule - Lịch trình hôm nay
/settings - Cài đặt thông báo
/disconnect - Ngắt kết nối

💡 Bạn có thể tùy chỉnh thông báo trên web hoặc dùng /settings
  `;

  await bot.sendMessage(chatId, helpMessage, { parse_mode: "HTML" });
});

/**
 * /status - Kiểm tra kết nối
 */
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input("chatId", sql.NVarChar, chatId.toString())
      .execute("sp_GetTelegramConnectionByChatId");

    if (result.recordset.length > 0) {
      const conn = result.recordset[0];
      const statusMessage = `
✅ <b>Kết nối đang hoạt động</b>

📧 Email: ${conn.Email}
💬 Chat ID: <code>${chatId}</code>
📅 Kết nối từ: ${new Date(conn.NgayKetNoi).toLocaleDateString("vi-VN")}

<b>Cài đặt thông báo:</b>
${conn.ThongBaoNhiemVu ? "✅" : "❌"} Nhiệm vụ
${conn.ThongBaoSuKien ? "✅" : "❌"} Sự kiện
${conn.ThongBaoGoiY ? "✅" : "❌"} Gợi ý AI

Dùng /settings để thay đổi cài đặt.
      `;
      await bot.sendMessage(chatId, statusMessage, { parse_mode: "HTML" });
    } else {
      await bot.sendMessage(
        chatId,
        "❌ Bạn chưa kết nối.\n\nGõ /start để kết nối."
      );
    }
  } catch (error) {
    console.error("❌ Error checking status:", error);
    await bot.sendMessage(chatId, "❌ Lỗi kiểm tra trạng thái.");
  }
});

/**
 * /settings - Cài đặt thông báo
 */
bot.onText(/\/settings/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input("chatId", sql.NVarChar, chatId.toString())
      .execute("sp_GetTelegramConnectionByChatId");

    if (result.recordset.length === 0) {
      await bot.sendMessage(
        chatId,
        "❌ Bạn chưa kết nối.\n\nGõ /start để kết nối."
      );
      return;
    }

    const conn = result.recordset[0];

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: `${conn.ThongBaoNhiemVu ? "✅" : "☐"} Nhiệm vụ`,
            callback_data: "toggle_tasks",
          },
        ],
        [
          {
            text: `${conn.ThongBaoSuKien ? "✅" : "☐"} Sự kiện`,
            callback_data: "toggle_events",
          },
        ],
        [
          {
            text: `${conn.ThongBaoGoiY ? "✅" : "☐"} Gợi ý AI`,
            callback_data: "toggle_ai",
          },
        ],
      ],
    };

    await bot.sendMessage(
      chatId,
      "⚙️ <b>Cài đặt thông báo</b>\n\nChọn loại thông báo bạn muốn nhận:",
      {
        parse_mode: "HTML",
        reply_markup: keyboard,
      }
    );
  } catch (error) {
    console.error("❌ Error in settings:", error);
    await bot.sendMessage(chatId, "❌ Lỗi lấy cài đặt.");
  }
});

/**
 * Handle inline keyboard callbacks
 */
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const action = query.data;

  try {
    const pool = await sql.connect(dbConfig);

    // Get current user
    const userResult = await pool
      .request()
      .input("chatId", sql.NVarChar, chatId.toString())
      .execute("sp_GetTelegramConnectionByChatId");

    if (userResult.recordset.length === 0) {
      await bot.answerCallbackQuery(query.id, {
        text: "❌ Không tìm thấy kết nối",
      });
      return;
    }

    const userId = userResult.recordset[0].UserID;
    const currentSettings = userResult.recordset[0];

    // Toggle setting
    let updateParams = { userId };

    if (action === "toggle_tasks") {
      updateParams.thongBaoNhiemVu = !currentSettings.ThongBaoNhiemVu;
    } else if (action === "toggle_events") {
      updateParams.thongBaoSuKien = !currentSettings.ThongBaoSuKien;
    } else if (action === "toggle_ai") {
      updateParams.thongBaoGoiY = !currentSettings.ThongBaoGoiY;
    }

    // Update database
    await pool
      .request()
      .input("UserID", sql.Int, updateParams.userId)
      .input("ThongBaoNhiemVu", sql.Bit, updateParams.thongBaoNhiemVu)
      .input("ThongBaoSuKien", sql.Bit, updateParams.thongBaoSuKien)
      .input("ThongBaoGoiY", sql.Bit, updateParams.thongBaoGoiY)
      .execute("sp_UpdateTelegramNotificationSettings");

    // Get updated settings
    const updatedResult = await pool
      .request()
      .input("chatId", sql.NVarChar, chatId.toString())
      .execute("sp_GetTelegramConnectionByChatId");

    const updated = updatedResult.recordset[0];

    // Update keyboard
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: `${updated.ThongBaoNhiemVu ? "✅" : "☐"} Nhiệm vụ`,
            callback_data: "toggle_tasks",
          },
        ],
        [
          {
            text: `${updated.ThongBaoSuKien ? "✅" : "☐"} Sự kiện`,
            callback_data: "toggle_events",
          },
        ],
        [
          {
            text: `${updated.ThongBaoGoiY ? "✅" : "☐"} Gợi ý AI`,
            callback_data: "toggle_ai",
          },
        ],
      ],
    };

    await bot.editMessageReplyMarkup(keyboard, {
      chat_id: chatId,
      message_id: query.message.message_id,
    });

    await bot.answerCallbackQuery(query.id, { text: "✅ Đã cập nhật" });
  } catch (error) {
    console.error("❌ Error handling callback:", error);
    await bot.answerCallbackQuery(query.id, { text: "❌ Lỗi cập nhật" });
  }
});

/**
 * /disconnect - Ngắt kết nối
 */
bot.onText(/\/disconnect/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const pool = await sql.connect(dbConfig);

    // Get UserID first
    const userResult = await pool
      .request()
      .input("chatId", sql.NVarChar, chatId.toString())
      .execute("sp_GetTelegramConnectionByChatId");

    if (userResult.recordset.length === 0) {
      await bot.sendMessage(chatId, "❌ Không tìm thấy kết nối.");
      return;
    }

    const userId = userResult.recordset[0].UserID;

    // Disconnect
    await pool
      .request()
      .input("UserID", sql.Int, userId)
      .execute("sp_DisconnectTelegram");

    await bot.sendMessage(
      chatId,
      "✅ Đã ngắt kết nối.\n\nGõ /start nếu muốn kết nối lại."
    );

    console.log(`🔌 ChatId ${chatId} disconnected`);
  } catch (error) {
    console.error("❌ Error disconnecting:", error);
    await bot.sendMessage(chatId, "❌ Lỗi ngắt kết nối.");
  }
});

/**
 * /schedule - Xem lịch trình hôm nay
 */
bot.onText(/\/schedule/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const pool = await sql.connect(dbConfig);

    // Get UserID
    const userResult = await pool
      .request()
      .input("chatId", sql.NVarChar, chatId.toString())
      .execute("sp_GetTelegramConnectionByChatId");

    if (userResult.recordset.length === 0) {
      await bot.sendMessage(chatId, "❌ Bạn chưa kết nối.\n\nGõ /start.");
      return;
    }

    const userId = userResult.recordset[0].UserID;

    // Get today's schedule
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const scheduleResult = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("startDate", sql.DateTime, startOfDay)
      .input("endDate", sql.DateTime, endOfDay).query(`
        SELECT MaCongViec, TieuDe, MoTa, GioBatDauCoDinh
        FROM CongViec
        WHERE UserID = @userId 
          AND GioBatDauCoDinh >= @startDate 
          AND GioBatDauCoDinh <= @endDate
        ORDER BY GioBatDauCoDinh
      `);

    if (scheduleResult.recordset.length === 0) {
      await bot.sendMessage(chatId, "📅 Bạn không có công việc nào hôm nay.");
      return;
    }

    let message = `📅 <b>Lịch trình hôm nay</b>\n\n`;

    scheduleResult.recordset.forEach((task) => {
      const time = new Date(task.GioBatDauCoDinh).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      message += `⏰ <b>${time}</b> - ${task.TieuDe}\n`;
      if (task.MoTa) {
        message += `   ${task.MoTa}\n`;
      }
      message += "\n";
    });

    message += "Chúc bạn một ngày làm việc hiệu quả! 💪";

    await bot.sendMessage(chatId, message, { parse_mode: "HTML" });
  } catch (error) {
    console.error("❌ Error getting schedule:", error);
    await bot.sendMessage(chatId, "❌ Lỗi lấy lịch trình.");
  }
});

/**
 * Xác thực token từ web
 */
async function verifyToken(token, userId) {
  console.log(`🔍 Verifying token: ${token} for user: ${userId}`);

  const connection = pendingConnections.get(token);

  if (!connection) {
    return {
      success: false,
      message: "Mã kết nối không hợp lệ hoặc đã hết hạn",
    };
  }

  const elapsed = Date.now() - connection.timestamp;
  if (elapsed > 10 * 60 * 1000) {
    pendingConnections.delete(token);
    return {
      success: false,
      message: "Mã kết nối đã hết hạn. Vui lòng tạo mã mới.",
    };
  }

  try {
    const pool = await sql.connect(dbConfig);

    // Use stored procedure
    const result = await pool
      .request()
      .input("UserID", sql.Int, userId)
      .input("TelegramChatId", sql.NVarChar, connection.chatId)
      .input("TelegramUsername", sql.NVarChar, connection.username || null)
      .input("TelegramFirstName", sql.NVarChar, connection.firstName || null)
      .execute("sp_UpsertTelegramConnection");

    pendingConnections.delete(token);

    // Send confirmation
    const confirmMessage = `
✅ <b>Kết nối thành công!</b>

Tài khoản của bạn đã được kết nối.

Bạn sẽ nhận:
• Lịch trình hàng ngày
• Nhắc nhở nhiệm vụ
• Thông báo sự kiện

Gõ /help để xem các lệnh.
    `;

    await bot.sendMessage(connection.chatId, confirmMessage, {
      parse_mode: "HTML",
    });

    console.log(`✅ User ${userId} connected to chatId ${connection.chatId}`);

    return {
      success: true,
      message: "Kết nối thành công!",
      chatId: connection.chatId,
      username: connection.username,
    };
  } catch (error) {
    console.error("❌ Error saving connection:", error);
    return {
      success: false,
      message: "Lỗi lưu kết nối: " + error.message,
    };
  }
}

/**
 * Gửi tin nhắn cho user
 */
async function sendMessageToUser(userId, message, options = {}) {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input("UserID", sql.Int, userId)
      .execute("sp_GetTelegramConnectionByUser");

    if (result.recordset.length === 0 || !result.recordset[0].TrangThaiKetNoi) {
      return { success: false, message: "User chưa kết nối Telegram" };
    }

    const chatId = result.recordset[0].TelegramChatId;

    await bot.sendMessage(chatId, message, {
      parse_mode: "HTML",
      ...options,
    });

    // Update last notification time
    await pool
      .request()
      .input("UserID", sql.Int, userId)
      .execute("sp_UpdateLastNotificationTime");

    console.log(`✅ Message sent to user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Error sending to user ${userId}:`, error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Gửi lịch trình
 */
async function sendSchedule(userId, schedule) {
  const { date, tasks } = schedule;

  let message = `📅 <b>Lịch trình ngày ${date}</b>\n\n`;

  tasks.forEach((task) => {
    message += `⏰ <b>${task.time}</b> - ${task.title}\n`;
    if (task.description) {
      message += `   ${task.description}\n`;
    }
    message += "\n";
  });

  message += "Chúc bạn một ngày làm việc hiệu quả! 💪";

  return await sendMessageToUser(userId, message);
}

/**
 * Broadcast
 */
async function broadcastMessage(message, options = {}) {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().execute("sp_GetAllConnectedUsers");

    let successCount = 0;
    let failCount = 0;

    for (const user of result.recordset) {
      try {
        await bot.sendMessage(user.TelegramChatId, message, {
          parse_mode: "HTML",
          ...options,
        });
        successCount++;
      } catch (error) {
        console.error(`❌ Failed for user ${user.UserID}:`, error.message);
        failCount++;
      }
    }

    console.log(`📊 Broadcast: ${successCount} success, ${failCount} failed`);
    return { successCount, failCount, total: result.recordset.length };
  } catch (error) {
    console.error("❌ Broadcast error:", error);
    throw error;
  }
}

/**
 * Kiểm tra user đã kết nối
 */
async function isUserConnected(userId) {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input("UserID", sql.Int, userId)
      .execute("sp_GetTelegramConnectionByUser");

    return (
      result.recordset.length > 0 && result.recordset[0].TrangThaiKetNoi === 1
    );
  } catch (error) {
    console.error("❌ Error checking connection:", error);
    return false;
  }
}

/**
 * Tự động kết nối user từ web (auto-connect flow)
 */
async function autoConnectUser(code, chatId, username, firstName) {
  try {
    console.log(`🔐 Auto-connecting user with code: ${code}`);

    // 1️⃣ Lấy userId từ code
    global.pendingWebConnections = global.pendingWebConnections || new Map();
    const pending = global.pendingWebConnections.get(code);

    if (!pending) {
      console.log(`❌ Invalid or expired code: ${code}`);
      await bot.sendMessage(
        chatId,
        "❌ Mã kết nối không hợp lệ hoặc đã hết hạn.\n\nVui lòng thử lại từ website."
      );
      return {
        success: false,
        message: "Mã kết nối không hợp lệ",
      };
    }

    const userId = pending.userId;
    const elapsed = Date.now() - pending.timestamp;

    // Kiểm tra timeout
    if (elapsed > 10 * 60 * 1000) {
      global.pendingWebConnections.delete(code);
      await bot.sendMessage(
        chatId,
        "❌ Mã kết nối đã hết hạn (10 phút).\n\nVui lòng tạo mã mới từ website."
      );
      return {
        success: false,
        message: "Mã kết nối đã hết hạn",
      };
    }

    // 2️⃣ Lưu connection vào database
    const pool = await sql.connect(dbConfig);

    try {
      await pool
        .request()
        .input("UserID", sql.Int, userId)
        .input("TelegramChatId", sql.NVarChar, chatId.toString())
        .input("TelegramUsername", sql.NVarChar, username || null)
        .input("TelegramFirstName", sql.NVarChar, firstName || null)
        .execute("sp_UpsertTelegramConnection");

      console.log(`✅ User ${userId} connected to chatId ${chatId}`);
    } catch (dbError) {
      console.error("❌ Database error:", dbError);
      await bot.sendMessage(
        chatId,
        "❌ Lỗi lưu kết nối vào database.\n\nVui lòng thử lại sau."
      );
      return {
        success: false,
        message: "Lỗi lưu kết nối: " + dbError.message,
      };
    }

    // 3️⃣ Xóa code
    global.pendingWebConnections.delete(code);

    // 4️⃣ Gửi thông báo kết nối thành công
    const confirmMessage = `✅ <b>Kết nối Telegram thành công!</b>

Tài khoản của bạn đã được kết nối.

Bạn sẽ nhận:
📅 Lịch trình hàng ngày (8:00 AM)
⏰ Nhắc nhở nhiệm vụ (2:00 PM)
🌆 Tổng kết cuối ngày (6:00 PM)

Gõ /help để xem các lệnh.`;

    await bot.sendMessage(chatId, confirmMessage, { parse_mode: "HTML" });

    // 5️⃣ Gửi lịch trình hôm nay ngay lập tức
    await sendTodaySchedule(userId, chatId);

    return {
      success: true,
      message: "Kết nối thành công!",
      chatId: chatId.toString(),
      username: username,
      firstName: firstName,
    };
  } catch (error) {
    console.error("❌ Error auto-connecting user:", error);
    await bot.sendMessage(chatId, "❌ Lỗi kết nối: " + error.message);
    return {
      success: false,
      message: "Lỗi kết nối: " + error.message,
    };
  }
}

/**
 * Gửi lịch trình hôm nay cho user
 */
async function sendTodaySchedule(userId, chatId) {
  try {
    console.log(`📅 Sending today's schedule to user ${userId}...`);

    const pool = await sql.connect(dbConfig);

    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Lấy công việc hôm nay
    const tasksResult = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("startDate", sql.DateTime, startOfDay)
      .input("endDate", sql.DateTime, endOfDay).query(`
        SELECT TieuDe, MoTa, GioBatDauCoDinh
        FROM CongViec
        WHERE UserID = @userId 
          AND GioBatDauCoDinh >= @startDate 
          AND GioBatDauCoDinh <= @endDate
        ORDER BY GioBatDauCoDinh
      `);

    if (tasksResult.recordset.length === 0) {
      console.log(`⏭️ No tasks for user ${userId} today`);
      await bot.sendMessage(
        chatId,
        "📅 <b>Lịch trình hôm nay</b>\n\nBạn không có công việc nào hôm nay.",
        { parse_mode: "HTML" }
      );
      return;
    }

    // Format lịch trình
    let message = `📅 <b>Lịch trình ngày hôm nay</b>\n\n`;

    tasksResult.recordset.forEach((task, index) => {
      const startTime = new Date(task.GioBatDauCoDinh).toLocaleTimeString(
        "vi-VN",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );

      message += `${index + 1}. <b>${task.TieuDe}</b>\n`;
      message += `   ⏰ ${startTime}\n`;
      if (task.MoTa) {
        message += `   📝 ${task.MoTa}\n`;
      }
      message += `\n`;
    });

    message += "Chúc bạn một ngày làm việc hiệu quả! 💪";

    await bot.sendMessage(chatId, message, { parse_mode: "HTML" });

    console.log(
      `✅ Sent ${tasksResult.recordset.length} tasks to user ${userId}`
    );
    return { success: true };
  } catch (error) {
    console.error("❌ Error sending schedule:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Generate token
 */
function generateToken() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Cleanup
setInterval(() => {
  const now = Date.now();
  for (const [token, connection] of pendingConnections.entries()) {
    if (now - connection.timestamp > 10 * 60 * 1000) {
      pendingConnections.delete(token);
      console.log(`🧹 Cleaned token: ${token}`);
    }
  }
}, 5 * 60 * 1000);

module.exports = {
  bot,
  verifyToken,
  autoConnectUser,
  sendMessageToUser,
  sendSchedule,
  broadcastMessage,
  isUserConnected,
};
