/**
 * badge-display-helper.js
 * Shared utility for rendering equipped badge icons inline next to user names.
 * Uses GamificationBadges for icon/color mappings.
 *
 * Usage: BadgeDisplay.inline(badgeId)        → small inline HTML
 *        BadgeDisplay.storeMyBadge(badgeId)  → persist current user's badge
 *        BadgeDisplay.getMyBadge()           → read current user's badge
 */
(function () {
  "use strict";
  if (window.BadgeDisplay) return;

  const LS_KEY = "equipped_badge";

  window.BadgeDisplay = {
    inline(badgeId, size) {
      if (!badgeId) return "";
      const B = window.GamificationBadges;
      if (!B) return "";
      const icon = B.getIcon(badgeId);
      const color = B.getColor(badgeId);
      const sz = size || 14;
      return `<i class="fas ${icon} equipped-badge-icon" style="color:${color};font-size:${sz}px;margin-left:4px;flex-shrink:0" title="${this._badgeName(badgeId)}"></i>`;
    },

    chip(badgeId) {
      if (!badgeId) return "";
      const B = window.GamificationBadges;
      if (!B) return "";
      const icon = B.getIcon(badgeId);
      const color = B.getColor(badgeId);
      const name = this._badgeName(badgeId);
      return `<span class="equipped-badge-chip" style="display:inline-flex;align-items:center;gap:3px;padding:1px 6px;border-radius:10px;font-size:10px;font-weight:600;background:color-mix(in srgb, ${color} 12%, transparent);color:${color};border:1px solid color-mix(in srgb, ${color} 25%, transparent);white-space:nowrap;flex-shrink:0" title="${name}"><i class="fas ${icon}" style="font-size:9px"></i>${name}</span>`;
    },

    storeMyBadge(badgeId) {
      if (badgeId) {
        localStorage.setItem(LS_KEY, badgeId);
      } else {
        localStorage.removeItem(LS_KEY);
      }
    },

    getMyBadge() {
      return localStorage.getItem(LS_KEY) || null;
    },

    _badgeName(badgeId) {
      const NAMES = {
        first_task: "Khởi Đầu Vững Chắc", tasks_10: "Người Hành Động", tasks_50: "Chuyên Gia Hiệu Suất",
        tasks_100: "Bậc Thầy Kỷ Luật", tasks_500: "Huyền Thoại",
        streak_3: "Ngọn Lửa Đầu Tiên", streak_7: "Ý Chí Kiên Cường", streak_14: "Kỷ Luật Thép", streak_30: "Không Gì Cản Nổi",
        priority_king: "Người Dẫn Đầu", early_bird: "Chinh Phục Bình Minh",
        level_5: "Đang Tiến Bước", level_10: "Tầm Cao Mới", level_15: "Đỉnh Cao Phong Độ", level_20: "Bất Khả Chiến Bại",
      };
      return NAMES[badgeId] || badgeId;
    },
  };
})();
