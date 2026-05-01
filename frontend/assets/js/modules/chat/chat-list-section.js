// chat-list-section.js — Conversation list: load, render, select, new direct chat
// Depends on: chat-utils.js, chat-conversation.js, chat-realtime-client.js
(function () {
  "use strict";

  const ChatListSection = {
    _conversations: [],
    _activeId: null,
    _initialized: false,

    _authHeader() {
      const token = localStorage.getItem("auth_token");
      return { Authorization: "Bearer " + token, "Content-Type": "application/json" };
    },

    async _api(path, opts = {}) {
      const res = await fetch(path, { headers: this._authHeader(), ...opts });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "Lỗi");
      return json;
    },

    async init() {
      if (this._initialized) return;
      this._initialized = true;
      await ChatRealtimeClient.init();
      this._bindEvents();
      await this.loadConversations();
    },

    _bindEvents() {
      document.getElementById("new-chat-btn")
        ?.addEventListener("click", () => this._openNewChatModal());
      document.getElementById("cancel-new-chat")
        ?.addEventListener("click", () => this._closeNewChatModal());
      document.getElementById("new-chat-modal")
        ?.addEventListener("click", (e) => {
          if (e.target === e.currentTarget) this._closeNewChatModal();
        });

      // Debounced friend search
      let debounce = null;
      document.getElementById("new-chat-search")
        ?.addEventListener("input", (e) => {
          clearTimeout(debounce);
          debounce = setTimeout(() => this._searchFriends(e.target.value.trim()), 280);
        });
    },

    async loadConversations() {
      try {
        const json = await this._api("/api/conversations");
        this._conversations = json.data || [];
      } catch (_) {
        this._conversations = [];
      }
      this._renderConversations();
    },

    _renderConversations() {
      const list = document.getElementById("conversation-list");
      if (!list) return;

      if (!this._conversations.length) {
        list.innerHTML = `
          <p class="conv-empty text-xs text-center py-8" style="color:rgba(255,255,255,0.3)">
            <i class="fas fa-comment-dots text-2xl mb-2 block"></i>
            Chưa có cuộc trò chuyện nào
          </p>`;
        return;
      }

      list.innerHTML = this._conversations.map((c) => this._convItemHtml(c)).join("");

      if (this._activeId) {
        list.querySelector(`[data-conv-id="${this._activeId}"]`)?.classList.add("active");
      }
    },

    _convItemHtml(conv) {
      const name = ChatUtils.esc(conv.displayName || "Người dùng");
      const last = ChatUtils.esc(ChatUtils.truncate(conv.TinNhanCuoi || "Chưa có tin nhắn", 36));
      const time = conv.ThoiGianCuoi ? ChatUtils.relativeTimeShort(new Date(conv.ThoiGianCuoi)) : "";
      const isGroup = conv.LoaiHoiThoai === "group";
      const unreadDot = conv.unread > 0 ? `<div class="unread-dot"></div>` : "";
      const avatar = isGroup
        ? `<div class="conv-avatar" style="background:var(--accent-gradient,linear-gradient(135deg,#2563EB,#1d4ed8))">
             <i class="fas fa-users" style="font-size:14px"></i></div>`
        : `<div class="conv-avatar">${(conv.displayName || "?")[0].toUpperCase()}</div>`;

      return `
        <div class="conversation-item" data-conv-id="${conv.ConversationID}"
          onclick="ChatListSection.selectConversation(${conv.ConversationID})">
          ${avatar}
          <div class="conv-info">
            <div class="conv-name">${name}</div>
            <div class="conv-last">${last}</div>
          </div>
          <div class="conv-meta">
            <span class="conv-time">${time}</span>
            ${unreadDot}
          </div>
        </div>`;
    },

    async selectConversation(id) {
      this._activeId = id;

      document.querySelectorAll(".conversation-item")
        .forEach((el) => el.classList.remove("active"));
      document.querySelector(`[data-conv-id="${id}"]`)?.classList.add("active");

      // Mobile: slide to message panel
      if (window.innerWidth < 768) {
        document.getElementById("chat-sidebar")?.classList.add("hidden-mobile");
      }

      const conv = this._conversations.find((c) => c.ConversationID === id);
      const name = conv?.displayName || "Cuộc trò chuyện";
      const sub = conv?.LoaiHoiThoai === "group" ? "Nhóm" : "";

      // Mark read (fire-and-forget) and clear unread dot
      this._api(`/api/conversations/${id}/read`, { method: "PUT" }).catch(() => {});
      if (conv) { conv.unread = 0; this._renderConversations(); }

      await ChatConversation.loadConversation(id, name, sub);
    },

    async startDirectChat(userId) {
      try {
        const json = await this._api(`/api/conversations/direct/${userId}`);
        const conv = json.data;
        if (!conv) throw new Error("Không tìm thấy cuộc trò chuyện");
        if (!this._conversations.find((c) => c.ConversationID === conv.ConversationID)) {
          this._conversations.unshift(conv);
          this._renderConversations();
        }
        this.selectConversation(conv.ConversationID);
      } catch (e) {
        alert("Không thể mở cuộc trò chuyện: " + e.message);
      }
    },

    async refresh() {
      await this.loadConversations();
    },

    // ===== New chat modal =====
    _openNewChatModal() {
      document.getElementById("new-chat-modal")?.classList.remove("hidden");
      const input = document.getElementById("new-chat-search");
      if (input) { input.value = ""; input.focus(); }
      const results = document.getElementById("new-chat-results");
      if (results) results.innerHTML = "";
    },

    _closeNewChatModal() {
      document.getElementById("new-chat-modal")?.classList.add("hidden");
    },

    async _searchFriends(query) {
      const results = document.getElementById("new-chat-results");
      if (!results) return;
      if (!query) { results.innerHTML = ""; return; }

      results.innerHTML = `<p class="text-xs text-slate-400 text-center py-2">Đang tìm...</p>`;
      try {
        const json = await this._api(`/api/friends?q=${encodeURIComponent(query)}`);
        const friends = json.data || [];
        if (!friends.length) {
          results.innerHTML = `<p class="text-xs text-slate-400 text-center py-2">Không tìm thấy</p>`;
          return;
        }
        results.innerHTML = friends.map((f) => {
          const initial = (f.HoTen || f.Email || "?")[0].toUpperCase();
          const uid = f.NguoiDungID || f.UserID;
          return `
            <div class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition"
              onclick="ChatListSection._pickFriend(${uid})">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style="background:var(--accent,#2563EB)">${initial}</div>
              <div>
                <div class="text-sm font-medium text-slate-800">${ChatUtils.esc(f.HoTen || "Người dùng")}</div>
                <div class="text-xs text-slate-400">${ChatUtils.esc(f.Email || "")}</div>
              </div>
            </div>`;
        }).join("");
      } catch (_) {
        results.innerHTML = `<p class="text-xs text-red-400 text-center py-2">Lỗi tìm kiếm</p>`;
      }
    },

    _pickFriend(userId) {
      this._closeNewChatModal();
      this.startDirectChat(userId);
    },
  };

  window.ChatListSection = ChatListSection;
})();
