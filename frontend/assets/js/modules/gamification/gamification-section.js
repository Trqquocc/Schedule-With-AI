(function () {
  "use strict";

  // Main controller for the gamification tab: profile XP bar, badges, leaderboard
  const GamificationSection = {
    initialized: false,
    profile: null,

    _authHeader() {
      const token = localStorage.getItem("auth_token");
      return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
    },

    /** Fetch JSON from an API endpoint; throws on HTTP error or success:false */
    async _api(path) {
      const res = await fetch(path, { headers: this._authHeader() });
      const json = await res.json().catch(() => ({ success: false }));
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Lỗi khi tải dữ liệu");
      }
      return json.data;
    },

    /** Called once when the gamification tab is first activated */
    async init() {
      if (this.initialized) return;
      this.initialized = true;
      await this.loadProfile();
    },

    async loadProfile() {
      try {
        this.profile = await this._api("/api/gamification/profile");
        this.renderProfile(this.profile);
        this.renderBadges(
          this.profile.badges || [],
          this.profile.availableBadges || []
        );
        await this.loadLeaderboard();
      } catch (e) {
        this._showError(e.message);
      }
    },

    async loadLeaderboard() {
      try {
        const data = await this._api("/api/gamification/leaderboard");
        this.renderLeaderboard(data);
      } catch (_) {
        // Non-fatal: leaderboard may be empty for new users
      }
    },

    /** Render level circle, XP progress bar, streak badge */
    renderProfile(p) {
      const container = document.querySelector(
        "#gamification-view .gamification-header"
      );
      if (!container) return;

      const pct = Math.round((p.progress || 0) * 100);
      container.innerHTML = `
        <div class="level-circle"><span>${p.level}</span></div>
        <div class="xp-info">
          <div class="xp-text">Cấp ${p.level} · ${p.xp} XP</div>
          <div class="xp-bar">
            <div class="xp-bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="xp-sub">${p.xp} / ${p.nextLevelXP} XP (${pct}%)</div>
        </div>
        <div class="streak-badge">
          <i class="fas fa-fire"></i> ${p.streak} ngày
        </div>
        <button onclick="GamificationSection.refresh()" class="btn-refresh" title="Làm mới">
          <i class="fas fa-sync-alt"></i>
        </button>
      `;
    },

    /** Render earned badges then locked/available badges */
    renderBadges(earned, available) {
      const container = document.querySelector(
        "#gamification-view .gamification-badges"
      );
      if (!container) return;

      const Badges = window.GamificationBadges;
      if (!Badges) return;

      const earnedIds = new Set(earned.map((b) => b.id));
      const locked = available.filter((b) => !earnedIds.has(b.id));
      const total = earned.length + locked.length;

      const earnedHtml = earned.map((b) => Badges.renderCard(b, true)).join("");
      const lockedHtml = locked.map((b) => Badges.renderCard(b, false)).join("");

      container.innerHTML = `
        <h3 class="section-title">Huy hiệu (${earned.length}/${total})</h3>
        <div class="badge-grid">${earnedHtml}${lockedHtml}</div>
      `;
    },

    /** Render friends leaderboard rows */
    renderLeaderboard(entries) {
      const container = document.querySelector(
        "#gamification-view .gamification-leaderboard"
      );
      if (!container) return;

      const userId = parseInt(localStorage.getItem("user_id"), 10);

      if (!entries?.length) {
        container.innerHTML =
          '<p class="text-center text-sm text-gray-400 py-4">Thêm bạn bè để so sánh!</p>';
        return;
      }

      const rows = entries
        .map((e) => {
          const isSelf = e.userId === userId;
          const rankCls = e.rank <= 3 ? `rank-${e.rank}` : "";
          const avatarHtml = e.avatar
            ? `<img src="${e.avatar}" alt="${e.name || ""}">`
            : `<i class="fas fa-user"></i>`;
          return `<div class="leaderboard-row ${isSelf ? "self" : ""} ${rankCls}">
          <span class="rank-num">#${e.rank}</span>
          <div class="lb-avatar">${avatarHtml}</div>
          <div class="lb-name">${e.name || "Ẩn danh"}${isSelf ? " (bạn)" : ""}</div>
          <div class="lb-stats">Lv.${e.level} · ${e.xp} XP</div>
        </div>`;
        })
        .join("");

      container.innerHTML = `<h3 class="section-title">Bảng xếp hạng</h3>${rows}`;
    },

    /** POST /api/gamification/refresh then re-render profile + badges */
    async refresh() {
      try {
        const res = await fetch("/api/gamification/refresh", {
          method: "POST",
          headers: this._authHeader(),
        });
        const json = await res.json().catch(() => ({ success: false }));
        if (!json.success) throw new Error(json.message || "Lỗi làm mới");
        this.profile = json.data;
        this.renderProfile(this.profile);
        this.renderBadges(
          this.profile.badges || [],
          this.profile.availableBadges || []
        );
      } catch (e) {
        console.error("[GamificationSection] refresh error:", e.message);
      }
    },

    /** Display error message inside the gamification view */
    _showError(msg) {
      const container = document.querySelector(
        "#gamification-view .gamification-header"
      );
      if (!container) return;
      container.innerHTML = `<p class="text-sm text-red-500 py-2">Không tải được dữ liệu: ${msg}</p>`;
    },
  };

  window.GamificationSection = GamificationSection;
})();
