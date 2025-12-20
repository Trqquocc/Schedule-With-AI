// 📁 /telegram/schedule-updater.js

const cron = require("node-cron");
const { sql, dbPoolPromise } = require("../config/database");
const scheduleSender = require("./scheduleSender");
// Tránh circular dependency - import bot khi cần
let bot = null;
const getBotInstance = () => {
  if (!bot) {
    bot = require("./bot").bot;
  }
  return bot;
};

class ScheduleUpdater {
  constructor() {
    this.jobs = new Map();
  }

  /**
   * Khởi động lại toàn bộ lịch trình từ database
   */
  async restartAllSchedules() {
    try {
      // Dừng tất cả job hiện tại
      this.stopAllJobs();

      // Lấy cài đặt thời gian của tất cả người dùng
      const pool = await dbPoolPromise;
      const result = await pool.request().query(`
        SELECT 
          tc.UserID,
          tc.GioNhacNhiemVu,
          tc.GioLichNgay,
          tc.GioTongKetNgay,
          tc.ThongBaoNhiemVu
        FROM TelegramConnections tc
        WHERE tc.TrangThaiKetNoi = 1
        AND tc.ThongBaoNhiemVu = 1
        ORDER BY tc.UserID
      `);

      // Tạo jobs theo nhóm giờ để tối ưu
      this.groupAndScheduleJobs(result.recordset);
    } catch (error) {
      console.error("❌ Error restarting schedules:", error);
    }
  }

  /**
   * Nhóm người dùng theo giờ và tạo schedule jobs
   */
  groupAndScheduleJobs(users) {
    const schedulesByTime = {
      morning: new Map(), // GioLichNgay
      afternoon: new Map(), // GioNhacNhiemVu
      evening: new Map(), // GioTongKetNgay
    };

    // Nhóm người dùng theo từng loại giờ
    users.forEach((user) => {
      if (user.GioLichNgay) {
        const timeKey = this.formatTimeForCron(user.GioLichNgay);
        if (!schedulesByTime.morning.has(timeKey)) {
          schedulesByTime.morning.set(timeKey, []);
        }
        schedulesByTime.morning.get(timeKey).push(user);
      }

      if (user.GioNhacNhiemVu) {
        const timeKey = this.formatTimeForCron(user.GioNhacNhiemVu);
        if (!schedulesByTime.afternoon.has(timeKey)) {
          schedulesByTime.afternoon.set(timeKey, []);
        }
        schedulesByTime.afternoon.get(timeKey).push(user);
      }

      if (user.GioTongKetNgay) {
        const timeKey = this.formatTimeForCron(user.GioTongKetNgay);
        if (!schedulesByTime.evening.has(timeKey)) {
          schedulesByTime.evening.set(timeKey, []);
        }
        schedulesByTime.evening.get(timeKey).push(user);
      }
    });

    // Tạo jobs cho từng nhóm giờ
    this.createJobsFromGroups(schedulesByTime);
  }

  /**
   * Tạo cron jobs từ các nhóm đã phân loại
   */
  createJobsFromGroups(schedulesByTime) {
    // Morning schedules (GioLichNgay)
    schedulesByTime.morning.forEach((users, cronTime) => {
      const jobId = `morning-${cronTime}`;
      this.createJob(jobId, cronTime, async () => {
        await this.sendSchedulesForUsers(users, "morning");
      });
    });

    // Afternoon reminders (GioNhacNhiemVu)
    schedulesByTime.afternoon.forEach((users, cronTime) => {
      const jobId = `afternoon-${cronTime}`;
      this.createJob(jobId, cronTime, async () => {
        await this.sendRemindersForUsers(users);
      });
    });

    // Evening summaries (GioTongKetNgay)
    schedulesByTime.evening.forEach((users, cronTime) => {
      const jobId = `evening-${cronTime}`;
      this.createJob(jobId, cronTime, async () => {
        await this.sendSummariesForUsers(users);
      });
    });
  }

  /**
   * Tạo một cron job mới
   */
  createJob(jobId, cronTime, callback) {
    // Dừng job cũ nếu tồn tại
    if (this.jobs.has(jobId)) {
      this.jobs.get(jobId).stop();
    }

    try {
      const job = cron.schedule(cronTime, callback, {
        timezone: "Asia/Ho_Chi_Minh",
        scheduled: true,
      });

      this.jobs.set(jobId, job);
    } catch (error) {
      console.error(`Error creating job ${jobId}:`, error);
    }
  }

  /**
   * Cập nhật lịch trình cho một người dùng cụ thể
   */
  async updateUserSchedule(userId) {
    try {
      const pool = await dbPoolPromise;
      const result = await pool.request().input("UserID", sql.Int, userId)
        .query(`
          SELECT 
            GioNhacNhiemVu,
            GioLichNgay,
            GioTongKetNgay,
            ThongBaoNhiemVu,
            TrangThaiKetNoi
          FROM TelegramConnections
          WHERE UserID = @UserID
        `);

      if (result.recordset.length === 0) {
        console.log(`⏭️ User ${userId} not found or not connected`);
        return;
      }

      const user = result.recordset[0];

      if (!user.TrangThaiKetNoi || !user.ThongBaoNhiemVu) {
        console.log(`⏭️ User ${userId} has notifications disabled`);
        return;
      }

      // Xóa các jobs cũ của user này
      this.removeUserJobs(userId);

      // Tạo jobs mới cho user
      if (user.GioLichNgay) {
        const jobId = `user-${userId}-morning`;
        const cronTime = this.formatTimeForCron(user.GioLichNgay);
        this.createJob(jobId, cronTime, async () => {
          console.log(`📅 Sending morning schedule for user ${userId}`);
          await this.sendScheduleToUser(userId, "morning");
        });
      }

      if (user.GioNhacNhiemVu) {
        const jobId = `user-${userId}-afternoon`;
        const cronTime = this.formatTimeForCron(user.GioNhacNhiemVu);
        this.createJob(jobId, cronTime, async () => {
          console.log(`⏰ Sending afternoon reminder for user ${userId}`);
          await this.sendReminderToUser(userId);
        });
      }

      if (user.GioTongKetNgay) {
        const jobId = `user-${userId}-evening`;
        const cronTime = this.formatTimeForCron(user.GioTongKetNgay);
        this.createJob(jobId, cronTime, async () => {
          console.log(`🌆 Sending evening summary for user ${userId}`);
          await this.sendSummaryToUser(userId);
        });
      }

      console.log(`✅ Updated schedule for user ${userId}`);
      return { success: true, message: "Cập nhật lịch trình thành công" };
    } catch (error) {
      console.error(`❌ Error updating schedule for user ${userId}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Gửi lịch trình buổi sáng cho một nhóm người dùng
   */
  async sendSchedulesForUsers(users, timeOfDay) {
    for (const user of users) {
      try {
        await this.sendScheduleToUser(user.UserID, timeOfDay);
      } catch (error) {
        console.error(` Error for user ${user.UserID}:`, error.message);
      }
    }
  }

  /**
   * Gửi nhắc nhở buổi chiều cho một nhóm người dùng
   */
  async sendRemindersForUsers(users) {
    for (const user of users) {
      try {
        await this.sendReminderToUser(user.UserID);
      } catch (error) {
        console.error(` Error for user ${user.UserID}:`, error.message);
      }
    }
  }

  /**
   * Gửi tổng kết buổi tối cho một nhóm người dùng
   */
  async sendSummariesForUsers(users) {
    for (const user of users) {
      try {
        await this.sendSummaryToUser(user.UserID);
      } catch (error) {
        console.error(` Error for user ${user.UserID}:`, error.message);
      }
    }
  }

  /**
   * Gửi lịch trình cho một người dùng cụ thể
   */
  async sendScheduleToUser(userId, timeOfDay = "morning") {
    try {
      const pool = await dbPoolPromise;

      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      // Lấy công việc trong ngày
      const tasksResult = await pool
        .request()
        .input("userId", sql.Int, userId)
        .input("startDate", sql.DateTime, startOfDay)
        .input("endDate", sql.DateTime, endOfDay).query(`
          SELECT 
            TieuDe, 
            MoTa, 
            GioBatDauCoDinh,
            TrangThai
          FROM CongViec
          WHERE UserID = @userId
            AND GioBatDauCoDinh >= @startDate
            AND GioBatDauCoDinh <= @endDate
          ORDER BY GioBatDauCoDinh
        `);

      if (tasksResult.recordset.length === 0) {
        console.log(`⏭️ No tasks for user ${userId} today`);
        // Vẫn gửi thông báo nhưng nói là không có việc
        await this.sendNoTasksMessage(userId, timeOfDay);
        return;
      }

      // Lấy thông tin user
      const userResult = await pool.request().input("userId", sql.Int, userId)
        .query(`
          SELECT TelegramChatId FROM TelegramConnections 
          WHERE UserID = @userId AND TrangThaiKetNoi = 1
        `);

      if (userResult.recordset.length === 0) {
        console.log(`⏭️ User ${userId} not connected`);
        return;
      }

      const chatId = userResult.recordset[0].TelegramChatId;

      // Format tin nhắn
      let message = `📅 <b>Lịch trình ngày hôm nay</b>\n\n`;
      message += `Hôm nay bạn có <b>${tasksResult.recordset.length}</b> công việc:\n\n`;

      tasksResult.recordset.forEach((task, index) => {
        const startTime = new Date(task.GioBatDauCoDinh).toLocaleTimeString(
          "vi-VN",
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        );

        let statusEmoji = "⏳";
        if (task.TrangThai === "completed") statusEmoji = "✅";
        if (task.TrangThai === "in_progress") statusEmoji = "🔄";

        message += `${index + 1}. ${statusEmoji} <b>${task.TieuDe}</b>\n`;
        message += `   ⏰ ${startTime}\n`;
        if (task.MoTa) {
          message += `   📝 ${task.MoTa}\n`;
        }
        message += `\n`;
      });

      message += "Chúc bạn một ngày làm việc hiệu quả! 💪";

      await getBotInstance().sendMessage(chatId, message, {
        parse_mode: "HTML",
      });
      console.log(`✅ Sent schedule to user ${userId}`);
    } catch (error) {
      console.error(`❌ Error sending schedule to user ${userId}:`, error);
    }
  }

  /**
   * Gửi nhắc nhở cho một người dùng
   */
  async sendReminderToUser(userId) {
    try {
      const pool = await dbPoolPromise;

      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      // Lấy công việc chưa hoàn thành
      const tasksResult = await pool
        .request()
        .input("userId", sql.Int, userId)
        .input("now", sql.DateTime, now)
        .input("endDate", sql.DateTime, endOfDay).query(`
          SELECT TieuDe, GioBatDauCoDinh
          FROM CongViec
          WHERE UserID = @userId
            AND GioBatDauCoDinh >= @now
            AND GioBatDauCoDinh <= @endDate
            AND TrangThai != 'completed'
          ORDER BY GioBatDauCoDinh
        `);

      const userResult = await pool.request().input("userId", sql.Int, userId)
        .query(`
          SELECT TelegramChatId FROM TelegramConnections 
          WHERE UserID = @userId AND TrangThaiKetNoi = 1
        `);

      if (userResult.recordset.length === 0) {
        return;
      }

      const chatId = userResult.recordset[0].TelegramChatId;

      if (tasksResult.recordset.length === 0) {
        const message =
          "🎉 <b>Nhắc nhở buổi chiều</b>\n\nTất cả công việc hôm nay đã hoàn thành! Xuất sắc! 🎯";
        await getBotInstance().sendMessage(chatId, message, {
          parse_mode: "HTML",
        });
        return;
      }

      let message = "⏰ <b>Nhắc nhở buổi chiều</b>\n\n";
      message += `Bạn còn <b>${tasksResult.recordset.length}</b> công việc cần chú ý:\n\n`;

      tasksResult.recordset.forEach((task, index) => {
        const time = new Date(task.GioBatDauCoDinh).toLocaleTimeString(
          "vi-VN",
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        );
        message += `${index + 1}. ${task.TieuDe}\n`;
        message += `   ⏱️ ${time}\n`;
      });

      message += "\nHãy cố gắng hoàn thành nhé! 💪";

      await getBotInstance().sendMessage(chatId, message, {
        parse_mode: "HTML",
      });
      console.log(`✅ Sent reminder to user ${userId}`);
    } catch (error) {
      console.error(`❌ Error sending reminder to user ${userId}:`, error);
    }
  }

  /**
   * Gửi tổng kết cho một người dùng
   */
  async sendSummaryToUser(userId) {
    try {
      const pool = await dbPoolPromise;

      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      // Thống kê công việc
      const statsResult = await pool
        .request()
        .input("userId", sql.Int, userId)
        .input("startDate", sql.DateTime, startOfDay)
        .input("endDate", sql.DateTime, endOfDay).query(`
          SELECT
            COUNT(*) as total,
            SUM(CASE WHEN TrangThai = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN TrangThai = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN TrangThai = 'pending' OR TrangThai IS NULL THEN 1 ELSE 0 END) as not_started
          FROM CongViec
          WHERE UserID = @userId
            AND GioBatDauCoDinh >= @startDate
            AND GioBatDauCoDinh <= @endDate
        `);

      const userResult = await pool.request().input("userId", sql.Int, userId)
        .query(`
          SELECT TelegramChatId FROM TelegramConnections 
          WHERE UserID = @userId AND TrangThaiKetNoi = 1
        `);

      if (userResult.recordset.length === 0) {
        return;
      }

      const chatId = userResult.recordset[0].TelegramChatId;
      const stats = statsResult.recordset[0];

      if (stats.total === 0) {
        const message =
          "📊 <b>Tổng kết ngày hôm nay</b>\n\nHôm nay bạn không có công việc nào. Hãy tận hưởng ngày nghỉ nhé! 😊";
        await getBotInstance().sendMessage(chatId, message, {
          parse_mode: "HTML",
        });
        return;
      }

      let message = "🌆 <b>Tổng kết ngày hôm nay</b>\n\n";
      message += `📊 Tổng số: <b>${stats.total}</b> công việc\n`;
      message += `✅ Hoàn thành: <b>${stats.completed || 0}</b>\n`;
      message += `🔄 Đang làm: <b>${stats.in_progress || 0}</b>\n`;
      message += `⏳ Chưa làm: <b>${stats.not_started || 0}</b>\n\n`;

      if (stats.completed > 0) {
        const percentage = Math.round((stats.completed / stats.total) * 100);
        message += `🎯 Tỷ lệ hoàn thành: <b>${percentage}%</b>\n\n`;

        if (percentage >= 80) {
          message += "🌟 Xuất sắc! Bạn đã có một ngày làm việc hiệu quả!";
        } else if (percentage >= 50) {
          message += "👍 Tốt lắm! Tiếp tục phát huy nhé!";
        } else {
          message += "💪 Ngày mai sẽ tốt hơn! Cố gắng lên!";
        }
      } else {
        message +=
          "📌 Bạn chưa hoàn thành công việc nào. Hãy bắt đầu từ sớm vào ngày mai nhé!";
      }

      await getBotInstance().sendMessage(chatId, message, {
        parse_mode: "HTML",
      });
      console.log(`✅ Sent summary to user ${userId}`);
    } catch (error) {
      console.error(`❌ Error sending summary to user ${userId}:`, error);
    }
  }

  /**
   * Gửi thông báo không có công việc
   */
  async sendNoTasksMessage(userId, timeOfDay) {
    try {
      const pool = await dbPoolPromise;
      const result = await pool.request().input("userId", sql.Int, userId)
        .query(`
          SELECT TelegramChatId FROM TelegramConnections 
          WHERE UserID = @userId AND TrangThaiKetNoi = 1
        `);

      if (result.recordset.length === 0) return;

      const chatId = result.recordset[0].TelegramChatId;

      let message = "";
      if (timeOfDay === "morning") {
        message =
          "📅 <b>Lịch trình ngày hôm nay</b>\n\nHôm nay bạn không có công việc nào. Hãy tận hưởng một ngày thoải mái! 😊";
      } else if (timeOfDay === "afternoon") {
        message =
          "⏰ <b>Nhắc nhở buổi chiều</b>\n\nKhông còn công việc nào cần nhắc nhở. Tuyệt vời! 🎉";
      }

      if (message) {
        await getBotInstance().sendMessage(chatId, message, {
          parse_mode: "HTML",
        });
      }
    } catch (error) {
      console.error(`❌ Error sending no tasks message:`, error);
    }
  }

  /**
   * Xóa tất cả jobs của một user
   */
  removeUserJobs(userId) {
    const jobIds = [
      `user-${userId}-morning`,
      `user-${userId}-afternoon`,
      `user-${userId}-evening`,
    ];

    jobIds.forEach((jobId) => {
      if (this.jobs.has(jobId)) {
        this.jobs.get(jobId).stop();
        this.jobs.delete(jobId);
      }
    });
  }

  /**
   * Dừng tất cả jobs
   */
  stopAllJobs() {
    this.jobs.forEach((job, jobId) => {
      job.stop();
    });
    this.jobs.clear();
  }

  /**
   * Format thời gian từ database thành cron expression
   */
  formatTimeForCron(timeValue) {
    if (!timeValue) return "0 8 * * *"; // Mặc định 8:00 AM

    // Xử lý cả string và đối tượng Time
    let hours, minutes;

    if (typeof timeValue === "string") {
      // Format: "14:30:00"
      const [h, m] = timeValue.split(":");
      hours = parseInt(h);
      minutes = parseInt(m);
    } else if (timeValue instanceof Date) {
      // Đối tượng Date hoặc Time
      hours = timeValue.getHours();
      minutes = timeValue.getMinutes();
    } else if (timeValue.constructor && timeValue.constructor.name === "Time") {
      // Đối tượng Time từ mssql
      hours = timeValue.hours || 8;
      minutes = timeValue.minutes || 0;
    } else {
      // Mặc định
      hours = 8;
      minutes = 0;
    }

    // Cron format: minute hour * * *
    return `${minutes} ${hours} * * *`;
  }

  /**
   * Lấy thông tin lịch trình hiện tại
   */
  getCurrentSchedules() {
    const schedules = [];
    this.jobs.forEach((job, jobId) => {
      const info = {
        jobId,
        isRunning: job.running || false,
        nextDate: job.nextDate ? job.nextDate() : null,
      };
      schedules.push(info);
    });
    return schedules;
  }
}

// Export singleton instance
const scheduleUpdater = new ScheduleUpdater();
module.exports = scheduleUpdater;
