// realtime-badge-watcher.js — Polls for friend requests & unread messages, updates sidebar badges, plays notification sound
(function () {
  "use strict";

  const POLL_INTERVAL = 15000;
  let _prevFriendCount = -1;
  let _prevUnreadCount = -1;
  let _timer = null;

  function authHeader() {
    const token = localStorage.getItem("auth_token");
    return token ? { Authorization: "Bearer " + token } : null;
  }

  function playNotificationSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(830, now);
      osc1.frequency.setValueAtTime(990, now + 0.08);

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1245, now + 0.08);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.setValueAtTime(0.22, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.start(now);
      osc1.stop(now + 0.16);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.35);
    } catch (_) {}
  }

  function updateBadge(elementId, count) {
    const badge = document.getElementById(elementId);
    if (!badge) return;
    badge.textContent = count > 99 ? "99+" : count;
    badge.classList.toggle("hidden", count === 0);
  }

  async function pollFriendRequests() {
    const headers = authHeader();
    if (!headers) return;
    try {
      const res = await fetch("/api/friends/requests", { headers });
      if (!res.ok) return;
      const json = await res.json();
      const count = (json.data || []).length;
      updateBadge("sidebar-friend-badge", count);

      if (_prevFriendCount >= 0 && count > _prevFriendCount) {
        playNotificationSound();
      }
      _prevFriendCount = count;

      if (window.FriendsSection) {
        FriendsSection.requests = json.data || [];
      }
    } catch (_) {}
  }

  async function pollUnreadMessages() {
    const headers = authHeader();
    if (!headers) return;
    try {
      const res = await fetch("/api/conversations", { headers });
      if (!res.ok) return;
      const json = await res.json();
      const convs = json.data || [];
      const count = convs.filter((c) => c.isRead === false).length;
      updateBadge("sidebar-chat-badge", count);

      if (_prevUnreadCount >= 0 && count > _prevUnreadCount) {
        playNotificationSound();
      }
      _prevUnreadCount = count;
    } catch (_) {}
  }

  async function poll() {
    await Promise.all([pollFriendRequests(), pollUnreadMessages()]);
  }

  function start() {
    if (_timer) return;
    poll();
    _timer = setInterval(poll, POLL_INTERVAL);
  }

  function stop() {
    if (_timer) {
      clearInterval(_timer);
      _timer = null;
    }
  }

  document.addEventListener("auth-success", () => {
    _prevFriendCount = -1;
    _prevUnreadCount = -1;
    start();
  });
  document.addEventListener("auth-logout", stop);

  if (localStorage.getItem("auth_token")) {
    setTimeout(start, 2000);
  }

  window.RealtimeBadgeWatcher = { start, stop, poll, playNotificationSound };
})();
