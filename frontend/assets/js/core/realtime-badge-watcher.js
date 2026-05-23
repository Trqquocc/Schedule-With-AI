// realtime-badge-watcher.js — Global realtime subscription + polling fallback
// for friend requests, unread messages, and schedule sync badges.
(function () {
  "use strict";

  const POLL_INTERVAL = 15000;
  let _prevFriendCount = -1;
  let _prevUnreadCount = -1;
  let _prevScheduleDigest = null;
  let _timer = null;

  // Global realtime state
  let _supaClient = null;
  let _globalChannel = null;
  let _myConvIds = new Set();
  let _myUserId = null;

  function authHeader() {
    const token = localStorage.getItem("auth_token");
    return token ? { Authorization: "Bearer " + token } : null;
  }

  function resolveUserId() {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) return null;
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.userId || payload.id || payload.sub || null;
    } catch (_) { return null; }
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

  // ------------------------------------------------------------------
  // Global Supabase Realtime subscription for instant message alerts
  // ------------------------------------------------------------------

  async function initRealtimeSubscription() {
    _myUserId = resolveUserId();
    if (!_myUserId) return;

    if (!window.supabase?.createClient) return;

    try {
      let url, key;
      if (window.__SUPABASE_URL__ && window.__SUPABASE_ANON_KEY__) {
        url = window.__SUPABASE_URL__;
        key = window.__SUPABASE_ANON_KEY__;
      } else {
        const res = await fetch("/api/config/public");
        if (!res.ok) return;
        const cfg = await res.json();
        url = cfg.data?.supabaseUrl;
        key = cfg.data?.supabaseAnonKey;
      }
      if (!url || !key) return;

      _supaClient = window.supabase.createClient(url, key);

      _globalChannel = _supaClient
        .channel("global-msg-notify")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "TinNhan" },
          (payload) => onRealtimeMessage(payload.new)
        )
        .subscribe();
    } catch (e) {
      console.warn("[BadgeWatcher] Realtime subscription failed:", e.message);
    }
  }

  function onRealtimeMessage(msg) {
    if (!msg) return;
    if (String(msg.NguoiGui) === String(_myUserId)) return;
    if (_myConvIds.size > 0 && !_myConvIds.has(String(msg.MaHoiThoai))) return;

    // Skip if user is actively viewing this conversation
    // (ChatConversation.onNewMessage handles sound + append there)
    const activeConvId = window.ChatConversation?._convId;
    if (activeConvId && String(msg.MaHoiThoai) === String(activeConvId)) return;

    playNotificationSound();

    // Immediate badge bump (next poll corrects exact count)
    if (_prevUnreadCount >= 0) {
      updateBadge("sidebar-chat-badge", _prevUnreadCount + 1);
    }

    // Refresh chat list if the section is open
    window.ChatListSection?.refresh();
  }

  function destroyRealtimeSubscription() {
    if (_globalChannel && _supaClient) {
      try { _supaClient.removeChannel(_globalChannel); } catch (_) {}
    }
    _globalChannel = null;
    _supaClient = null;
    _myConvIds = new Set();
    _myUserId = null;
  }

  // ------------------------------------------------------------------
  // Polling (fallback + periodic sync)
  // ------------------------------------------------------------------

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

      // Keep the global conversation ID set current for realtime filtering
      _myConvIds = new Set(
        convs.map((c) => String(c.conversationId || c.MaHoiThoai))
      );

      const count = convs.filter((c) => c.isRead === false).length;
      updateBadge("sidebar-chat-badge", count);

      // Only play sound from poll if realtime is NOT active (avoid double sound)
      if (!_globalChannel && _prevUnreadCount >= 0 && count > _prevUnreadCount) {
        playNotificationSound();
      }
      _prevUnreadCount = count;
    } catch (_) {}
  }

  async function pollScheduleSync() {
    const headers = authHeader();
    if (!headers) return;
    try {
      const res = await fetch("/api/schedule/sync-check", { headers });
      if (!res.ok) return;
      const json = await res.json();
      if (!json.success) return;

      const digest = json.digest;
      if (_prevScheduleDigest !== null && digest !== _prevScheduleDigest) {
        if (window.CalendarModule?.refreshEventsInPlace) {
          window.CalendarModule.refreshEventsInPlace();
        }
        if (window.WorkManager?.checkAndReload) {
          window.WorkManager.checkAndReload();
        }
      }
      _prevScheduleDigest = digest;
    } catch (_) {}
  }

  async function poll() {
    await Promise.all([pollFriendRequests(), pollUnreadMessages(), pollScheduleSync()]);
  }

  function start() {
    if (_timer) return;
    _myUserId = resolveUserId();
    poll();
    _timer = setInterval(poll, POLL_INTERVAL);
    initRealtimeSubscription();
  }

  function stop() {
    if (_timer) {
      clearInterval(_timer);
      _timer = null;
    }
    destroyRealtimeSubscription();
  }

  document.addEventListener("auth-success", () => {
    _prevFriendCount = -1;
    _prevUnreadCount = -1;
    _prevScheduleDigest = null;
    start();
  });
  document.addEventListener("auth-logout", stop);

  if (localStorage.getItem("auth_token")) {
    setTimeout(start, 2000);
  }

  window.RealtimeBadgeWatcher = { start, stop, poll, playNotificationSound };
})();
