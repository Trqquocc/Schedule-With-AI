// chat-message-renderer.js — Build message bubble HTML for the chat thread
(function () {
  "use strict";

  window.ChatMessageRenderer = {
    currentUserId: null,
    _nameCache: {},
    _avatarCache: {},

    _buildAvatar(name, avatarUrl) {
      const ini = (name || "?")[0].toUpperCase();
      const title = ChatUtils.esc(name || "");
      if (avatarUrl) {
        return `<img src="${avatarUrl}" class="msg-avatar" title="${title}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="msg-avatar msg-avatar-ini" style="display:none" title="${title}">${ini}</div>`;
      }
      return `<div class="msg-avatar msg-avatar-ini" title="${title}">${ini}</div>`;
    },

    buildBubble(msg) {
      const uid = String(msg.NguoiGui);
      if (msg.senderName) this._nameCache[uid] = msg.senderName;
      if (msg.senderAvatar) this._avatarCache[uid] = msg.senderAvatar;

      const rn = msg.senderName || this._nameCache[uid] || null;
      const avatarUrl = msg.senderAvatar || this._avatarCache[uid] || null;
      const me = uid === String(this.currentUserId);
      const del = msg.DaXoa;
      const ts = ChatUtils.relativeTimeLong(msg.NgayGui ? new Date(msg.NgayGui) : new Date());

      const av = this._buildAvatar(rn, avatarUrl);

      const menu = me && !del
        ? `<div class="msg-menu-wrap"><button class="msg-menu-btn" onclick="ChatConversation.toggleMsgMenu(${msg.MaTinNhan})"><i class="fas fa-ellipsis-v"></i></button><div class="msg-menu hidden" id="msg-menu-${msg.MaTinNhan}"><button onclick="ChatConversation.startEdit(${msg.MaTinNhan})"><i class="fas fa-pen"></i> Chỉnh sửa</button><button onclick="ChatConversation.recallMessage(${msg.MaTinNhan})"><i class="fas fa-undo"></i> Thu hồi</button></div></div>`
        : "";

      const body = del
        ? `<span class="text-xs" style="opacity:0.7">Tin nhắn đã bị thu hồi</span>`
        : ChatUtils.esc(msg.NoiDung || "");

      const dir = me ? "flex-row-reverse" : "flex-row";
      const bClass = me ? "msg-bubble msg-bubble-out" : "msg-bubble msg-bubble-in";
      const tAlign = me ? "text-right" : "text-left";
      const menuAlign = me ? "flex-row-reverse" : "flex-row";

      return `<div class="flex ${dir} items-end gap-1.5" data-msg-id="${msg.MaTinNhan}">${av}<div style="max-width:75%"><div class="flex ${menuAlign} items-center gap-1 msg-row-hover"><div class="${bClass}${del ? " msg-bubble-del" : ""}">${body}</div>${menu}</div><div class="msg-ts ${tAlign}">${ts}</div></div></div>`;
    },

    getClearKey(convId) { return `chat_clear_${convId}`; },

    renderAll(messages, conversationId) {
      const inner = document.getElementById("messages-inner");
      if (!inner) return;

      // Filter out messages before "cleared at" timestamp
      const clearTs = conversationId ? localStorage.getItem(this.getClearKey(conversationId)) : null;
      const filtered = clearTs
        ? messages.filter(m => m.NgayGui && new Date(m.NgayGui) > new Date(clearTs))
        : messages;

      if (!filtered.length) {
        inner.innerHTML = `<p class="text-xs text-center text-slate-400 py-8">Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>`;
        return;
      }

      let html = "";
      let lastDate = null;

      filtered.forEach((msg) => {
        const date = msg.NgayGui ? new Date(msg.NgayGui) : new Date();
        const dateStr = date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
        if (dateStr !== lastDate) {
          html += `<div class="msg-date-sep">${ChatUtils.formatDateDivider(date)}</div>`;
          lastDate = dateStr;
        }
        html += this.buildBubble(msg);
      });

      inner.innerHTML = html;
    },

    appendOptimistic(tempId, text) {
      const inner = document.getElementById("messages-inner");
      if (!inner) return;
      const emptyP = inner.querySelector("p");
      if (emptyP) emptyP.remove();
      inner.insertAdjacentHTML(
        "beforeend",
        `<div class="flex flex-row-reverse items-end gap-1.5" data-msg-id="${tempId}"><div style="max-width:75%"><div class="msg-bubble msg-bubble-out" style="opacity:0.7">${ChatUtils.esc(text)}</div><div class="msg-ts text-right">Đang gửi...</div></div></div>`
      );
    },
  };
})();
