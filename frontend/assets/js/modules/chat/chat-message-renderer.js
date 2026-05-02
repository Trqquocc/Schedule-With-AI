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
      const resolvedName = msg.senderName || this._nameCache[String(msg.SenderID)] || null;
      const isSent = String(msg.SenderID) === String(this.currentUserId);
      const side = isSent ? "sent" : "received";
      const deleted = msg.DaXoa;
      const timeStr = ChatUtils.relativeTimeLong(msg.NgayGui ? new Date(msg.NgayGui) : new Date());
      const initial = (resolvedName || "?")[0].toUpperCase();

      const avatarHtml = !isSent
        ? `<div class="msg-sender-avatar" title="${ChatUtils.esc(resolvedName || "")}">${initial}</div>`
        : "";

      const deleteBtn =
        isSent && !deleted
          ? `<button onclick="ChatConversation.deleteMessage(${msg.MessageID})"
               class="msg-delete-btn" title="Xoá" style="position:absolute;top:-6px;right:-6px;
               width:16px;height:16px;border-radius:50%;border:none;background:rgba(0,0,0,0.25);
               color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center">
               <i class="fas fa-times" style="font-size:8px"></i>
             </button>`
          : "";

      const content = deleted
        ? `<span class="text-xs" style="opacity:0.7">Tin nhắn đã bị xoá</span>`
        : ChatUtils.esc(msg.NoiDung || "");

      return `<div class="msg-row ${side}" style="display:flex;align-items:flex-end;gap:6px" data-msg-id="${msg.MessageID}">${avatarHtml}<div class="msg-content-wrap"><div class="message-bubble ${side}${deleted ? " deleted" : ""}" style="position:relative">${content}${deleteBtn}</div><div class="msg-time">${timeStr}</div></div></div>`;
    },

    // Render a full message list into #messages-inner, with date dividers
    renderAll(messages) {
      const inner = document.getElementById("messages-inner");
      if (!inner) return;

      if (!messages.length) {
        inner.innerHTML = `<p class="text-xs text-center text-slate-400 py-8">
          Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>`;
        return;
      }

      let html = "";
      let lastDate = null;

      messages.forEach((msg) => {
        const date = msg.NgayGui ? new Date(msg.NgayGui) : new Date();
        const dateStr = date.toLocaleDateString("vi-VN", {
          day: "2-digit", month: "2-digit", year: "numeric",
        });
        if (dateStr !== lastDate) {
          html += `<div class="msg-date-divider">${ChatUtils.formatDateDivider(date)}</div>`;
          lastDate = dateStr;
        }
        html += this.buildBubble(msg);
      });

      inner.innerHTML = html;
    },

    // Append a single optimistic bubble while send is in-flight
    appendOptimistic(tempId, text) {
      const inner = document.getElementById("messages-inner");
      if (!inner) return;
      const emptyP = inner.querySelector("p");
      if (emptyP) emptyP.remove();
      inner.insertAdjacentHTML(
        "beforeend",
        `<div class="msg-row sent" style="display:flex;align-items:flex-end;gap:6px" data-msg-id="${tempId}"><div class="msg-content-wrap"><div class="message-bubble sent" style="opacity:0.7">${ChatUtils.esc(text)}</div><div class="msg-time">Đang gửi...</div></div></div>`
      );
    },
  };
})();
