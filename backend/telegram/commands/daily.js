const { supabase } = require("../../config/database");
const { getConnection, todayBoundsVN } = require("../helpers");

function register(bot) {
  bot.onText(/^\/daily\b/, (msg) => handleDaily(bot, msg));

  bot.on("callback_query", async (query) => {
    if (!query.data || !query.data.startsWith("daily_done:")) return;
    await handleComplete(bot, query);
  });
}

async function handleDaily(bot, msg) {
  const chatId = msg.chat.id;

  try {
    const conn = await getConnection(chatId);
    if (!conn) {
      await bot.sendMessage(chatId, "❌ Bạn chưa kết nối. Gõ /start.");
      return;
    }

    const { startIso, endIso } = todayBoundsVN();

    const { data: events } = await supabase
      .from("LichTrinh")
      .select("MaLichTrinh, TieuDe, GioBatDau, GioKetThuc, DaHoanThanh")
      .eq("MaNguoiDung", conn.MaNguoiDung)
      .gte("GioBatDau", startIso)
      .lte("GioBatDau", endIso)
      .order("GioBatDau", { ascending: true });

    if (!events?.length) {
      await bot.sendMessage(chatId, "📅 Hôm nay không có công việc nào.");
      return;
    }

    const header = `📅 <b>Công việc hôm nay</b> (${events.length})\n`;
    const lines = events.map((e, i) => {
      const hh = new Date(e.GioBatDau).toLocaleTimeString("vi-VN", {
        hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh",
      });
      const mark = e.DaHoanThanh ? "✅" : "⏳";
      return `${i + 1}. ${mark} <b>${e.TieuDe || "Công việc"}</b> — ${hh}`;
    });

    const keyboard = {
      inline_keyboard: events
        .filter((e) => !e.DaHoanThanh)
        .map((e, i) => [{ text: `✅ Hoàn thành #${i + 1}`, callback_data: `daily_done:${e.MaLichTrinh}` }]),
    };

    await bot.sendMessage(chatId, header + "\n" + lines.join("\n"), {
      parse_mode: "HTML",
      reply_markup: keyboard.inline_keyboard.length ? keyboard : undefined,
    });
  } catch (err) {
    console.error("[/daily] failed:", err);
    await bot.sendMessage(chatId, "❌ Lỗi lấy công việc hôm nay.");
  }
}

async function handleComplete(bot, query) {
  const chatId = query.message.chat.id;
  const rawId = (query.data || "").split(":")[1];
  const id = Number(rawId);
  if (!rawId || !Number.isInteger(id) || id <= 0) {
    await bot.answerCallbackQuery(query.id, { text: "❌ ID không hợp lệ" });
    return;
  }

  try {
    const conn = await getConnection(chatId);
    if (!conn) {
      await bot.answerCallbackQuery(query.id, { text: "❌ Chưa kết nối" });
      return;
    }

    const { data, error } = await supabase
      .from("LichTrinh")
      .update({ DaHoanThanh: true })
      .eq("MaLichTrinh", id)
      .eq("MaNguoiDung", conn.MaNguoiDung)
      .select("MaLichTrinh");

    if (error) throw error;
    if (!data || data.length === 0) {
      await bot.answerCallbackQuery(query.id, { text: "❌ Không tìm thấy công việc" });
      return;
    }
    await bot.answerCallbackQuery(query.id, { text: "✅ Đã hoàn thành!" });
    await handleDaily(bot, { chat: { id: chatId } });
  } catch (err) {
    console.error("[/daily done] failed:", err);
    await bot.answerCallbackQuery(query.id, { text: "❌ Lỗi cập nhật" });
  }
}

module.exports = { register };
