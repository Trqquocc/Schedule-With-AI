// friends-section.js — Friends management UI
(function () {
  "use strict";

  const FriendsSection = {
    friends: [],
    requests: [],
    sent: [],
    initialized: false,

    _authHeader() {
      const token = localStorage.getItem("auth_token");
      return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    },

    async _api(path, opts = {}) {
      const res = await fetch(path, { headers: this._authHeader(), ...opts });
      const json = await res.json().catch(() => ({ success: false }));
      if (!res.ok || !json.success) throw new Error(json.message || "Lỗi");
      return json;
    },

    async init() {
      if (this.initialized) return;
      this.initialized = true;
      this._bindEvents();
      await this.refresh();
    },

    _bindEvents() {
      const searchBtn = document.getElementById("friend-search-btn");
      const searchInput = document.getElementById("friend-search-input");
      if (searchBtn) searchBtn.onclick = () => this.search();
      if (searchInput) searchInput.onkeydown = (e) => { if (e.key === "Enter") this.search(); };
    },

    async refresh() {
      await Promise.all([this.loadFriends(), this.loadRequests(), this.loadSent()]);
    },

    // --- Friends list ---
    async loadFriends() {
      try {
        const json = await this._api("/api/friends");
        this.friends = json.data || [];
      } catch (_) {
        this.friends = [];
      }
      this._renderFriends();
    },

    _renderFriends() {
      const container = document.getElementById("friends-list");
      const countEl = document.getElementById("friend-count");
      if (!container) return;
      if (countEl) countEl.textContent = this.friends.length;

      if (this.friends.length === 0) {
        container.innerHTML = `<p class="text-sm text-center py-6 text-slate-400">Chưa có bạn bè nào</p>`;
        return;
      }
      container.innerHTML = this.friends.map((f) => this._friendRow(f)).join("");
    },

    _friendRow(f) {
      const initial = (f.HoTen || f.Email || "?")[0].toUpperCase();
      const avatar = f.AvatarUrl
        ? `<div class="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden bg-cover bg-center" style="background-image:url(${f.AvatarUrl})"></div>`
        : `<div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold" style="background:var(--accent, #2563EB)">${initial}</div>`;
      return `
        <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition">
          ${avatar}
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm text-slate-800 truncate">${f.HoTen || "Người dùng"}</div>
            <div class="text-xs text-slate-500 truncate">${f.Email || ""}</div>
          </div>
          <button onclick="FriendsSection.unfriend(${f.FriendshipID})"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 transition">
            Huỷ kết bạn
          </button>
        </div>`;
    },

    // --- Requests received ---
    async loadRequests() {
      try {
        const json = await this._api("/api/friends/requests");
        this.requests = json.data || [];
      } catch (_) {
        this.requests = [];
      }
      this._renderRequests();
    },

    _renderRequests() {
      const section = document.getElementById("friend-requests-section");
      const list = document.getElementById("friend-requests-list");
      const countEl = document.getElementById("friend-request-count");
      if (!section || !list) return;

      section.classList.toggle("hidden", this.requests.length === 0);
      if (countEl) countEl.textContent = this.requests.length;
      this.updateBadge();

      list.innerHTML = this.requests.map((r) => {
        const u = r.Requester;
        const initial = (u?.HoTen || u?.Email || "?")[0].toUpperCase();
        const avatar = u?.AvatarUrl
          ? `<div class="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden bg-cover bg-center" style="background-image:url(${u.AvatarUrl})"></div>`
          : `<div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold" style="background:var(--accent, #2563EB)">${initial}</div>`;
        return `
          <div class="flex items-center gap-3 p-3 rounded-xl" style="background:#eff6ff;border:1px solid #bfdbfe">
            ${avatar}
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-sm text-slate-800 truncate">${u?.HoTen || "Người dùng"}</div>
              <div class="text-xs text-slate-500 truncate">${u?.Email || ""}</div>
            </div>
            <div class="flex gap-2">
              <button onclick="FriendsSection.acceptRequest(${r.FriendshipID})"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style="background:#10b981">Chấp nhận</button>
              <button onclick="FriendsSection.rejectRequest(${r.FriendshipID})"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-500">Từ chối</button>
            </div>
          </div>`;
      }).join("");
    },

    // --- Requests sent ---
    async loadSent() {
      try {
        const json = await this._api("/api/friends/sent");
        this.sent = json.data || [];
      } catch (_) {
        this.sent = [];
      }
      this._renderSent();
    },

    _renderSent() {
      const section = document.getElementById("friend-sent-section");
      const list = document.getElementById("friend-sent-list");
      if (!section || !list) return;

      section.classList.toggle("hidden", this.sent.length === 0);

      list.innerHTML = this.sent.map((s) => {
        const u = s.Receiver;
        const initial = (u?.HoTen || u?.Email || "?")[0].toUpperCase();
        return `
          <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
            <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold" style="background:#94a3b8">${initial}</div>
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-sm text-slate-800 truncate">${u?.HoTen || "Người dùng"}</div>
              <div class="text-xs text-slate-500 truncate">${u?.Email || ""}</div>
            </div>
            <span class="text-xs text-amber-600 font-medium">Chờ phản hồi</span>
            <button onclick="FriendsSection.cancelRequest(${s.FriendshipID})"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-500 hover:text-red-600 transition">
              Huỷ
            </button>
          </div>`;
      }).join("");
    },

    // --- Search ---
    async search() {
      const input = document.getElementById("friend-search-input");
      const container = document.getElementById("friend-search-results");
      if (!input || !container) return;

      const q = input.value.trim();
      if (q.length < 2) {
        Utils?.showToast?.("Nhập ít nhất 2 ký tự", "error");
        return;
      }

      try {
        const json = await this._api(`/api/friends/search?q=${encodeURIComponent(q)}`);
        const results = json.data || [];

        container.classList.remove("hidden");

        if (results.length === 0) {
          container.innerHTML = `<p class="text-sm text-slate-400 text-center py-2">Không tìm thấy</p>`;
          return;
        }

        const friendIds = new Set(this.friends.map((f) => f.UserID));
        const pendingIds = new Set([
          ...this.requests.map((r) => r.Requester?.UserID),
          ...this.sent.map((s) => s.Receiver?.UserID),
        ]);

        container.innerHTML = results.map((u) => {
          const initial = (u.HoTen || u.Email || "?")[0].toUpperCase();
          const avatar = u.AvatarUrl
            ? `<div class="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden bg-cover bg-center" style="background-image:url(${u.AvatarUrl})"></div>`
            : `<div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold" style="background:#94a3b8">${initial}</div>`;

          let actionHtml;
          if (friendIds.has(u.UserID)) {
            actionHtml = `<span class="text-xs text-green-600 font-medium"><i class="fas fa-check mr-1"></i>Bạn bè</span>`;
          } else if (pendingIds.has(u.UserID)) {
            actionHtml = `<span class="text-xs text-amber-600 font-medium">Đã gửi lời mời</span>`;
          } else {
            actionHtml = `<button onclick="FriendsSection.sendRequest('${u.Email}')" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style="background:var(--accent, #2563EB)"><i class="fas fa-user-plus mr-1"></i>Kết bạn</button>`;
          }

          return `
            <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              ${avatar}
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm text-slate-800 truncate">${u.HoTen || "Người dùng"}</div>
                <div class="text-xs text-slate-500 truncate">${u.Email || ""}</div>
              </div>
              ${actionHtml}
            </div>`;
        }).join("");
      } catch (err) {
        container.classList.remove("hidden");
        container.innerHTML = `<p class="text-sm text-red-500 text-center py-2">${err.message}</p>`;
      }
    },

    // --- Actions ---
    async sendRequest(email) {
      try {
        await this._api("/api/friends/request", { method: "POST", body: JSON.stringify({ email }) });
        Utils?.showToast?.("Đã gửi lời mời kết bạn!", "success");
        await this.refresh();
        this.search();
      } catch (err) {
        Utils?.showToast?.(err.message, "error");
      }
    },

    async acceptRequest(id) {
      try {
        await this._api(`/api/friends/${id}/accept`, { method: "PUT" });
        Utils?.showToast?.("Đã chấp nhận!", "success");
        await this.refresh();
      } catch (err) {
        Utils?.showToast?.(err.message, "error");
      }
    },

    async rejectRequest(id) {
      try {
        await this._api(`/api/friends/${id}/reject`, { method: "PUT" });
        Utils?.showToast?.("Đã từ chối", "info");
        await this.refresh();
      } catch (err) {
        Utils?.showToast?.(err.message, "error");
      }
    },

    async cancelRequest(id) {
      try {
        await this._api(`/api/friends/${id}`, { method: "DELETE" });
        Utils?.showToast?.("Đã huỷ lời mời", "info");
        await this.refresh();
      } catch (err) {
        Utils?.showToast?.(err.message, "error");
      }
    },

    async unfriend(id) {
      const ok = await Utils?.confirm?.("Bạn có chắc muốn huỷ kết bạn?", "Huỷ kết bạn");
      if (!ok) return;
      try {
        await this._api(`/api/friends/${id}`, { method: "DELETE" });
        Utils?.showToast?.("Đã huỷ kết bạn", "info");
        await this.refresh();
      } catch (err) {
        Utils?.showToast?.(err.message, "error");
      }
    },

    // Update sidebar badge with pending request count
    updateBadge() {
      const badge = document.getElementById("sidebar-friend-badge");
      if (!badge) return;
      const count = this.requests.length;
      badge.textContent = count;
      badge.classList.toggle("hidden", count === 0);
    },

    // Poll for friend requests (called once on app load)
    async pollRequests() {
      if (!localStorage.getItem("auth_token")) return;
      try {
        const json = await this._api("/api/friends/requests");
        this.requests = json.data || [];
        this.updateBadge();
      } catch (_) {}
    },
  };

  window.FriendsSection = FriendsSection;

  // Auto-poll badge on page load
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => FriendsSection.pollRequests(), 3000);
  });
})();
