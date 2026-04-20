// 15-minutes-before-event reminder.
// Runs every minute; finds LichTrinh rows starting in 14-16 min for users
// who opted into ThongBao15Phut, sends a nudge, logs to prevent duplicates.

module.exports = {
  kind: "15min",
  cronExpr: "* * * * *", // every minute

  async run({ supabase, getBot, logSent, alreadySent }) {
    const now = Date.now();
    const windowStart = new Date(now + 14 * 60 * 1000).toISOString();
    const windowEnd   = new Date(now + 16 * 60 * 1000).toISOString();

    const { data: events, error } = await supabase
      .from("LichTrinh")
      .select("MaLichTrinh, UserID, MaCongViec, TieuDe, GioBatDau, GioKetThuc, DaHoanThanh")
      .gte("GioBatDau", windowStart)
      .lte("GioBatDau", windowEnd)
      .eq("DaHoanThanh", false);

    if (error) {
      console.error("[15min] query failed:", error.message);
      return;
    }
    if (!events?.length) return;

    // Batch-fetch opt-in flags for all involved users (avoid N+1).
    const userIds = [...new Set(events.map((e) => e.UserID))];
    const { data: prefs } = await supabase
      .from("TelegramConnections")
      .select("UserID, TelegramChatId, TrangThaiKetNoi, ThongBao15Phut")
      .in("UserID", userIds);

    const prefMap = new Map((prefs || []).map((p) => [p.UserID, p]));
    const bot = getBot();

    for (const ev of events) {
      const p = prefMap.get(ev.UserID);
      if (!p?.TrangThaiKetNoi || !p.ThongBao15Phut) continue;

      // Dedup: the event might sit in the 14-16 min window across 2-3 cron
      // ticks, don't hammer the user.
      if (await alreadySent(ev.UserID, ev.MaLichTrinh, "15min", 60)) continue;

      const start = new Date(ev.GioBatDau);
      const hhmm = start.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh",
      });

      const msg =
        `⏰ <b>Sắp đến lịch</b>\n\n` +
        `<b>${ev.TieuDe || "Công việc"}</b>\n` +
        `Bắt đầu lúc <b>${hhmm}</b> (còn ~15 phút)\n\n` +
        `Dùng /daily để xem và đánh dấu hoàn thành.`;

      try {
        await bot.sendMessageToUser(ev.UserID, msg);
        await logSent(ev.UserID, ev.MaLichTrinh, "15min");
      } catch (err) {
        console.error(`[15min] send failed user ${ev.UserID}:`, err.message);
      }
    }
  },
};
