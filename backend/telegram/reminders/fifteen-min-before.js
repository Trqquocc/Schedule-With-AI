// Pre-event reminder.
// Runs every minute; for each connected user with ThongBao15Phut on,
// finds LichTrinh rows starting in (PhutNhacTruoc ± 1) minutes,
// sends a nudge. Uses in-memory + DB dedup to prevent duplicates.

const _recentlySent = new Map();

function dedupKey(userId, startIso, title) {
  return `${userId}:${startIso}:${title}`;
}

function wasRecentlySent(key) {
  const ts = _recentlySent.get(key);
  if (!ts) return false;
  if (Date.now() - ts > 60 * 60 * 1000) {
    _recentlySent.delete(key);
    return false;
  }
  return true;
}

function markSent(key) {
  _recentlySent.set(key, Date.now());
  // Prune old entries periodically
  if (_recentlySent.size > 500) {
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const [k, ts] of _recentlySent) {
      if (ts < cutoff) _recentlySent.delete(k);
    }
  }
}

module.exports = {
  kind: "15min",
  cronExpr: "* * * * *",

  async run({ supabase, getBot, logSent, alreadySent }) {
    const now = Date.now();

    const { data: prefs, error: prefErr } = await supabase
      .from("KetNoiTelegram")
      .select("MaNguoiDung, TelegramChatId, TrangThaiKetNoi, ThongBao15Phut, PhutNhacTruoc")
      .eq("TrangThaiKetNoi", true)
      .eq("ThongBao15Phut", true);

    if (prefErr || !prefs?.length) return;

    const prefMap = new Map(prefs.map((p) => [p.MaNguoiDung, p]));
    const minutesList = prefs.map((p) => Number(p.PhutNhacTruoc) || 15);
    const minM = Math.min(...minutesList);
    const maxM = Math.max(...minutesList);

    const windowStart = new Date(now + (minM - 1) * 60 * 1000).toISOString();
    const windowEnd   = new Date(now + (maxM + 1) * 60 * 1000).toISOString();

    const { data: events, error } = await supabase
      .from("LichTrinh")
      .select("MaLichTrinh, MaNguoiDung, MaCongViec, TieuDe, GioBatDau, GioKetThuc, DaHoanThanh")
      .in("MaNguoiDung", prefs.map((p) => p.MaNguoiDung))
      .gte("GioBatDau", windowStart)
      .lte("GioBatDau", windowEnd)
      .eq("DaHoanThanh", false);

    if (error || !events?.length) return;

    const bot = getBot();

    for (const ev of events) {
      const p = prefMap.get(ev.MaNguoiDung);
      if (!p) continue;

      const M = Number(p.PhutNhacTruoc) || 15;
      const diffMin = (new Date(ev.GioBatDau).getTime() - now) / 60000;
      if (diffMin < M - 1 || diffMin > M + 1) continue;

      // In-memory dedup (primary — survives even if DB dedup fails)
      const key = dedupKey(ev.MaNguoiDung, ev.GioBatDau, ev.TieuDe || "");
      if (wasRecentlySent(key)) continue;

      // DB dedup (secondary)
      try {
        if (await alreadySent(ev.MaNguoiDung, ev.MaLichTrinh, "15min", 60)) continue;
      } catch (_) {}

      const start = new Date(ev.GioBatDau);
      const hhmm = start.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh",
      });

      const msg =
        `⏰ <b>Sắp đến lịch</b>\n\n` +
        `<b>${ev.TieuDe || "Công việc"}</b>\n` +
        `Bắt đầu lúc <b>${hhmm}</b> (còn ~${M} phút)\n\n` +
        `Dùng /daily để xem và đánh dấu hoàn thành.`;

      try {
        await bot.sendMessageToUser(ev.MaNguoiDung, msg);
        markSent(key);
        await logSent(ev.MaNguoiDung, ev.MaLichTrinh, "15min");
      } catch (err) {
        console.error(`[15min] send failed user ${ev.MaNguoiDung}:`, err.message);
      }
    }
  },
};
