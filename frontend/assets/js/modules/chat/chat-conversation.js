// chat-conversation.js — Active conversation: load, send, delete, realtime wiring
// Depends on: chat-utils.js, chat-message-renderer.js, chat-realtime-client.js
(function () {
  "use strict";

  const ChatConversation = {
    _convId: null,
    _sending: false,

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

    init() {
      // Resolve current user id from JWT payload
      try {
        const token = localStorage.getItem("auth_token");
        if (token) {
          const payload = JSON.parse(atob(token.split(".")[1]));
          ChatMessageRenderer.currentUserId =
            payload.userId || payload.id || payload.sub || null;
        }
      } catch (_) {}

      // Input events
      document.getElementById("chat-input")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
      });
      document.getElementById("chat-send-btn")?.addEventListener("click", () => this.sendMessage());

      // Back button (mobile)
      document.getElementById("chat-back-btn")?.addEventListener("click", () => {
        document.getElementById("chat-sidebar")?.classList.remove("hidden-mobile");
        document.getElementById("chat-active")?.classList.add("hidden");
        document.getElementById("chat-empty-state")?.classList.remove("hidden");
      });

      // Wire realtime → append incoming messages
      ChatRealtimeClient.onMessage((msg) => this.onNewMessage(msg));
    },

    async loadConversation(conversationId, displayName, subtitle) {
      this._convId = conversationId;

      // Show active panel
      document.getElementById("chat-empty-state")?.classList.add("hidden");
      document.getElementById("chat-active")?.classList.remove("hidden");

      // Update header
      document.getElementById("chat-header-name").textContent = displayName || "Cuộc trò chuyện";
      document.getElementById("chat-header-sub").textContent = subtitle || "";
      document.getElementById("chat-header-avatar").textContent =
        (displayName || "?")[0].toUpperCase();

      // Loading placeholder
      const inner = document.getElementById("messages-inner");
      if (inner) inner.innerHTML =
        `<p class="text-xs text-center text-slate-400 py-6">Đang tải...</p>`;

      try {
        await this._loadMessages(conversationId);
      } catch (_) {
        if (inner) inner.innerHTML =
          `<p class="text-xs text-center text-slate-400 py-6">Không thể tải tin nhắn</p>`;
      }

      ChatRealtimeClient.subscribe(conversationId);
      document.getElementById("chat-input")?.focus();
    },

    async _loadMessages(conversationId, before = null) {
      let url = `/api/messages?conversationId=${conversationId}&limit=30`;
      if (before) url += `&before=${encodeURIComponent(before)}`;
      const json = await this._api(url);
      const msgs = (json.data || []).reverse(); // newest-first → reverse for top-to-bottom
      ChatMessageRenderer.renderAll(msgs);
      this._scrollToBottom();
    },

    async sendMessage() {
      const input = document.getElementById("chat-input");
      const text = input?.value.trim();
      if (!text || !this._convId || this._sending) return;

      this._sending = true;
      input.value = "";
      const sendBtn = document.getElementById("chat-send-btn");
      if (sendBtn) sendBtn.disabled = true;

      const tempId = "temp-" + Date.now();
      ChatMessageRenderer.appendOptimistic(tempId, text);
      this._scrollToBottom();

      try {
        const json = await this._api("/api/messages", {
          method: "POST",
          body: JSON.stringify({ conversationId: this._convId, noiDung: text }),
        });
        const realMsg = json.data || {
          MessageID: tempId, NoiDung: text,
          SenderID: ChatMessageRenderer.currentUserId,
          NgayGui: new Date().toISOString(),
        };
        document.querySelector(`[data-msg-id="${tempId}"]`)?.outerHTML === undefined
          ? null
          : (document.querySelector(`[data-msg-id="${tempId}"]`).outerHTML =
              ChatMessageRenderer.buildBubble(realMsg));
        window.ChatListSection?.refresh();
      } catch (_) {
        // Dim the optimistic bubble to signal failure; restore input
        const bubble = document.querySelector(`[data-msg-id="${tempId}"] .message-bubble`);
        if (bubble) bubble.style.opacity = "0.4";
        input.value = text;
      } finally {
        this._sending = false;
        if (sendBtn) sendBtn.disabled = false;
        input.focus();
      }
    },

    onNewMessage(msg) {
      if (!msg || String(msg.ConversationID) !== String(this._convId)) return;
      // Skip own messages already shown via optimistic UI
      if (String(msg.SenderID) === String(ChatMessageRenderer.currentUserId)) return;

      const inner = document.getElementById("messages-inner");
      if (!inner) return;
      inner.querySelector("p.text-xs")?.remove();
      inner.insertAdjacentHTML("beforeend", ChatMessageRenderer.buildBubble(msg));
      this._scrollToBottom();
      window.ChatListSection?.refresh();
    },

    async deleteMessage(id) {
      if (!confirm("Xoá tin nhắn này?")) return;
      try {
        await this._api(`/api/messages/${id}`, { method: "DELETE" });
        const bubble = document.querySelector(`[data-msg-id="${id}"] .message-bubble`);
        if (bubble) {
          bubble.classList.add("deleted");
          bubble.innerHTML = `<span class="text-xs" style="opacity:0.7">Tin nhắn đã bị xoá</span>`;
        }
      } catch (e) {
        alert("Không thể xoá: " + e.message);
      }
    },

    _scrollToBottom() {
      const area = document.getElementById("message-area");
      if (area) area.scrollTop = area.scrollHeight;
    },
  };

  window.ChatConversation = ChatConversation;
})();
