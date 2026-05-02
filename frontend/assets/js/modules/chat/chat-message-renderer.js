// chat-message-renderer.js — Build message bubble HTML for the chat thread
(function () {
  "use strict";

  window.ChatMessageRenderer = {
    currentUserId: null,
    _nameCache: {},

    buildBubble(msg) {
      if (msg.senderName && msg.SenderID) {
        this._nameCache[String(msg.SenderID)] = msg.senderName;
      }
      const rn = msg.senderName || this._nameCache[String(msg.SenderID)] || null;
      const me = String(msg.SenderID) === String(this.currentUserId);
      const del = msg.DaXoa;
      const ts = ChatUtils.relativeTimeLong(msg.NgayGui ? new Date(msg.NgayGui) : new Date());
      const ini = (rn || "?")[0].toUpperCase();

      const av = me ? "" : `<div class="msg-avatar flex items-center justify-center" title="${ChatUtils.esc(rn || "")}">${ini}</div>`;

      const delBtn = me && !del
        ? `<button class="msg-del-btn flex items-center justify-center" onclick="ChatConversation.deleteMessage(${msg.MessageID})" title="Xoá"><i class="fas fa-times"></i></button>`
        : "";

      const body = del
        ? `<span class="text-xs" style="opacity:0.7">Tin nhắn đã bị xoá</span>`
        : ChatUtils.esc(msg.NoiDung || "");

      const dir = me ? "flex-row-reverse" : "flex-row";
      const bClass = me ? "msg-bubble msg-bubble-out" : "msg-bubble msg-bubble-in";
      const tAlign = me ? "text-right" : "text-left";

      return `<div class="flex ${dir} items-end gap-1.5" data-msg-id="${msg.MessageID}">${av}<div style="max-width:75%"><div class="${bClass}${del ? " msg-bubble-del" : ""}">${body}${delBtn}</div><div class="msg-ts ${tAlign}">${ts}</div></div></div>`;
    },

    renderAll(messages) {
      const inner = document.getElementById("messages-inner");
      if (!inner) return;

      if (!messages.length) {
        inner.innerHTML = `<p class="text-xs text-center text-slate-400 py-8">Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>`;
        return;
      }

      let html = "";
      let lastDate = null;

      messages.forEach((msg) => {
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
