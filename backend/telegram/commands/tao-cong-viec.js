// /taocongviec <natural language>
// Parses a short Vietnamese sentence via Gemini into a task spec, then
// creates a CongViec row and a matching LichTrinh entry.
//
// Uses GEMINI_API_KEY_TELEGRAM to split rate-limit from the web task
// creator. When Gemini is unavailable, falls back to a crude parser so
// users aren't blocked entirely.

const { supabase } = require("../../config/database");

const apiKey =
  (process.env.GEMINI_API_KEY_TELEGRAM || "").trim() ||
  (process.env.GEMINI_API_KEY || "").trim();

let model = null;
if (apiKey) {
  try {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
    });
    console.log("[/taocongviec] Gemini ready");
  } catch (e) {
    console.error("[/taocongviec] Gemini init failed:", e.message);
  }
}

function register(bot) {
  bot.onText(/^\/taocongviec(?:\s+([\s\S]+))?/i, (msg, match) => {
    handleCreate(bot, msg, (match && match[1]) || "");
  });
}

async function handleCreate(bot, msg, text) {
  const chatId = msg.chat.id;

  if (!text.trim()) {
    await bot.sendMessage(
      chatId,
      "Cú pháp: <code>/taocongviec &lt;mô tả&gt;</code>\n" +
        "VD: <code>/taocongviec họp team 3h chiều mai 1 tiếng</code>",
      { parse_mode: "HTML" }
    );
    return;
  }

  try {
    const { data: conn } = await supabase
      .from("TelegramConnections")
      .select("UserID")
      .eq("TelegramChatId", chatId.toString())
      .maybeSingle();
    if (!conn) {
      await bot.sendMessage(chatId, "❌ Bạn chưa kết nối. Gõ /start.");
      return;
    }

    const parsed = await parseTask(text);
    if (!parsed?.title) {
      await bot.sendMessage(chatId, "❌ Không hiểu yêu cầu. Thử lại với mô tả rõ hơn.");
      return;
    }

    const defaultCat = await ensureDefaultCategory(conn.UserID);

    const start = parsed.startIso ? new Date(parsed.startIso) : null;
    const durationMin = Number(parsed.durationMin) || 30;
    const end =
      start
        ? new Date(start.getTime() + durationMin * 60 * 1000)
        : null;

    const { data: created, error: taskErr } = await supabase
      .from("CongViec")
      .insert({
        UserID: conn.UserID,
        MaLoai: defaultCat,
        TieuDe: parsed.title.slice(0, 120),
        MoTa: parsed.description || "",
        CoThoiGianCoDinh: !!start,
        GioBatDauCoDinh: start ? start.toISOString() : null,
        GioKetThucCoDinh: end ? end.toISOString() : null,
        TrangThaiThucHien: 0,
        ThoiGianUocTinh: durationMin,
        MucDoUuTien: 2,
        NgayTao: new Date().toISOString(),
        LuongTheoGio: 0,
      })
      .select("MaCongViec, TieuDe")
      .single();

    if (taskErr) throw taskErr;

    if (start && end) {
      await supabase.from("LichTrinh").insert({
        UserID: conn.UserID,
        MaCongViec: created.MaCongViec,
        TieuDe: created.TieuDe,
        GioBatDau: start.toISOString(),
        GioKetThuc: end.toISOString(),
        DaHoanThanh: false,
        AI_DeXuat: true,
        NgayTao: new Date().toISOString(),
      });
    }

    const whenLine =
      start
        ? `\n⏰ ${start.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} (${durationMin} phút)`
        : "";
    await bot.sendMessage(
      chatId,
      `✅ <b>Đã tạo công việc</b>\n\n<b>${created.TieuDe}</b>${whenLine}`,
      { parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("[/taocongviec] failed:", err);
    await bot.sendMessage(chatId, "❌ Lỗi tạo công việc: " + (err.message || "unknown"));
  }
}

async function ensureDefaultCategory(userId) {
  const { data: existing } = await supabase
    .from("LoaiCongViec")
    .select("MaLoai")
    .eq("UserID", userId)
    .limit(1);
  if (existing?.length) return existing[0].MaLoai;

  const { data: created, error } = await supabase
    .from("LoaiCongViec")
    .insert({ UserID: userId, TenLoai: "Khác", MoTa: "Danh mục mặc định" })
    .select("MaLoai")
    .single();
  if (error) throw error;
  return created.MaLoai;
}

async function parseTask(text) {
  if (model) {
    try {
      const todayIso = new Date().toISOString();
      const prompt =
        "Trích xuất thành JSON công việc từ câu tiếng Việt. Trả JSON thuần, KHÔNG markdown.\n" +
        `Hôm nay là ${todayIso} (Asia/Ho_Chi_Minh).\n` +
        `Schema: {"title":"...","description":"...","startIso":"ISO8601 hoặc null","durationMin": số phút (30 nếu không rõ)}\n` +
        `Câu: "${text}"`;
      const res = await model.generateContent(prompt);
      const raw = res.response.text();
      const m = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const json = JSON.parse((m ? m[1] : raw).trim());
      if (json?.title) return json;
    } catch (err) {
      console.warn("[/taocongviec] Gemini parse failed:", err.message);
    }
  }
  return fallbackParse(text);
}

// Minimal fallback: take the whole text as title, no time.
function fallbackParse(text) {
  return {
    title: text.trim().slice(0, 120),
    description: "",
    startIso: null,
    durationMin: 30,
  };
}

module.exports = { register };
