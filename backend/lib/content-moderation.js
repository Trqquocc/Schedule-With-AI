/**
 * content-moderation.js
 * Keyword-based content moderation for user messages.
 * Checks for illegal activity, violence, drugs, fraud, harassment, etc.
 * Used by message-service.js before persisting messages.
 */

// Each category: array of patterns (lowercase, diacritics-insensitive matching)
const BLOCKED_PATTERNS = {
  ma_tuy: [
    "ma túy", "ma tuy", "heroin", "cocaine", "cần sa", "can sa",
    "ketamine", "thuốc lắc", "thuoc lac", "ecstasy", "methamphetamine",
    "hít keo", "hit keo", "chích choác", "chich choac",
    "bán cỏ", "ban co", "mua cỏ", "mua co",
    "bán hàng trắng", "hàng trắng", "hàng đá", "hang da",
    "đá tổng hợp", "da tong hop",
  ],
  bao_luc: [
    "giết người", "giet nguoi", "đâm chết", "dam chet",
    "chém chết", "chem chet", "bắn chết", "ban chet",
    "đánh bom", "danh bom", "khủng bố", "khung bo",
    "tấn công", "tàn sát", "tan sat", "thảm sát", "tham sat",
  ],
  lua_dao: [
    "lừa đảo", "lua dao", "hack tài khoản", "hack tai khoan",
    "đánh cắp thông tin", "danh cap thong tin",
    "chiếm đoạt", "chiem doat", "rửa tiền", "rua tien",
    "giả mạo", "gia mao", "phishing",
    "scam", "ponzi",
  ],
  khieu_dam: [
    "mại dâm", "mai dam", "mua dâm", "mua dam",
    "khiêu dâm trẻ em", "khieu dam tre em",
    "ấu dâm", "au dam", "dâm ô", "dam o",
    "buôn người", "buon nguoi",
  ],
  vu_khi: [
    "bán súng", "ban sung", "mua súng", "mua sung",
    "chế tạo bom", "che tao bom", "thuốc nổ", "thuoc no",
    "vũ khí", "vu khi", "đạn dược", "dan duoc",
  ],
  cam_khac: [
    "cá độ", "ca do", "đánh bạc online", "danh bac online",
    "cờ bạc", "co bac", "cho vay nặng lãi", "cho vay nang lai",
    "tín dụng đen", "tin dung den",
    "bán nội tạng", "ban noi tang",
  ],
};

// Flatten all patterns into a single list with category labels
const ALL_RULES = [];
for (const [category, patterns] of Object.entries(BLOCKED_PATTERNS)) {
  for (const pattern of patterns) {
    ALL_RULES.push({ pattern: pattern.toLowerCase(), category });
  }
}

const CATEGORY_LABELS = {
  ma_tuy: "ma túy / chất cấm",
  bao_luc: "bạo lực / khủng bố",
  lua_dao: "lừa đảo / tội phạm mạng",
  khieu_dam: "nội dung khiêu dâm / buôn người",
  vu_khi: "vũ khí / chất nổ",
  cam_khac: "cờ bạc / hoạt động phi pháp",
};

/**
 * Remove Vietnamese diacritics for fuzzy matching.
 */
function removeDiacritics(str) {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}

/**
 * Check message content for violations.
 * @param {string} content - message text
 * @returns {{ blocked: boolean, category?: string, label?: string }}
 */
function moderateContent(content) {
  if (!content || typeof content !== "string") return { blocked: false };

  const normalized = content.toLowerCase();
  const noDiacritics = removeDiacritics(normalized);

  for (const rule of ALL_RULES) {
    const patternNoDiacritics = removeDiacritics(rule.pattern);
    if (normalized.includes(rule.pattern) || noDiacritics.includes(patternNoDiacritics)) {
      return {
        blocked: true,
        category: rule.category,
        label: CATEGORY_LABELS[rule.category],
      };
    }
  }

  return { blocked: false };
}

module.exports = { moderateContent, BLOCKED_PATTERNS, CATEGORY_LABELS };
