
(function () {
  "use strict";

  if (window.NotificationManager) {
    console.log("⚠️ NotificationManager already exists");
    return;
  }

  const NotificationManager = {
    initialized: false,
    currentUser: null,
    telegramConnected: false,

    init() {
      if (this.initialized) {
        console.log("ℹ️ NotificationManager already initialized");
        return;
      }

      console.log("🔧 NotificationManager initialization started");

      this.loadUserData();

      this.bindEvents();

      this.initialized = true;
      console.log("✅ NotificationManager initialized successfully");
    },

    loadUserData() {
      try {
        const userData = localStorage.getItem("user_data");
        if (userData) {
          this.currentUser = JSON.parse(userData);
          console.log("📦 User data loaded");
        }
      } catch (err) {
        console.error("❌ Error loading user data:", err);
      }
    },

    bindEvents() {
      document.addEventListener("click", (e) => {
        if (e.target.closest("#openNotificationBtn")) {
          e.preventDefault();
          e.stopPropagation();
          this.openNotificationModal();
        }
      });

      const closeBtn = document.getElementById("closeNotificationModal");
      const cancelBtn = document.getElementById("cancelNotificationBtn");
      if (closeBtn) {
        closeBtn.addEventListener("click", (e) => {
          e.preventDefault();
          this.closeModal();
        });
      }
      if (cancelBtn) {
        cancelBtn.addEventListener("click", (e) => {
          e.preventDefault();
          this.closeModal();
        });
      }

      const modal = document.getElementById("notificationModal");
      if (modal) {
        modal.addEventListener("click", (e) => {
          if (e.target === modal) {
            this.closeModal();
          }
        });
      }

      const connectBtn = document.getElementById("connectTelegramBtn");
      if (connectBtn) {
        connectBtn.addEventListener("click", (e) => {
          e.preventDefault();
          this.connectTelegram();
        });
      }

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          const modal = document.getElementById("notificationModal");
          if (modal && !modal.classList.contains("hidden")) {
            this.closeModal();
          }
        }
      });

      console.log("✅ Events bound");
    },

    openNotificationModal() {
      console.log("🟢 Opening notification modal");

      const modal = document.getElementById("notificationModal");
      if (!modal) {
        console.error("❌ Notification modal not found");
        return;
      }

      this.loadNotificationSettings();

      if (window.ModalManager && window.ModalManager.showModalById) {
        window.ModalManager.showModalById("notificationModal");
      } else {
        modal.classList.remove("hidden");
        modal.classList.add("active", "show");
        document.body.style.overflow = "hidden";
      }

      console.log("✅ Notification modal opened");
    },

    async checkTelegramStatus() {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) return;

        const response = await fetch("/api/notifications/telegram-status", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          this.telegramConnected = data.connected || false;

          if (this.telegramConnected) {
            console.log("✅ Telegram connected");
            this.updateConnectionStatus(true);
          }
        } else if (response.status === 404) {
          console.log("⏳ Telegram status endpoint not yet implemented");
        }
      } catch (error) {
        console.log("ℹ️ Telegram status check skipped");
      }
    },

    loadNotificationSettings() {
      try {
        const settings = localStorage.getItem("notification_settings");
        if (settings) {
          const parsed = JSON.parse(settings);
          const taskNotif = document.getElementById("taskNotifications");
          const eventReminders = document.getElementById("eventReminders");
          const aiSuggestions = document.getElementById("aiSuggestions");

          if (taskNotif) taskNotif.checked = parsed.taskNotifications !== false;
          if (eventReminders)
            eventReminders.checked = parsed.eventReminders !== false;
          if (aiSuggestions)
            aiSuggestions.checked = parsed.aiSuggestions !== false;

          console.log("✅ Settings loaded");
        }
      } catch (err) {
        console.warn("⚠️ Could not load settings:", err);
      }
    },

    async connectTelegram() {
      console.log("🔗 Connecting to Telegram...");

      const tokenInput = document.getElementById("telegramToken");
      const token = tokenInput?.value?.trim();

      if (!token) {
        this.showStatus("❌ Vui lòng nhập mã token", "error");
        return;
      }

      if (!/^[a-zA-Z0-9_-]{10,}$/.test(token)) {
        this.showStatus(
          "❌ Mã token không hợp lệ! Kiểm tra lại mã từ bot",
          "error"
        );
        return;
      }

      const connectBtn = document.getElementById("connectTelegramBtn");
      const originalText = connectBtn.innerHTML;
      connectBtn.disabled = true;
      connectBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i>Đang kết nối...';

      try {
        const response = await fetch("/api/notifications/connect-telegram", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
          body: JSON.stringify({ telegramToken: token }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Kết nối thất bại");
        }

        const result = await response.json();

        this.saveNotificationSettings();

        this.telegramConnected = true;
        this.updateConnectionStatus(true);

        this.showStatus("✅ Kết nối Telegram thành công!", "success");

        tokenInput.value = "";

        setTimeout(() => {
          this.closeModal();
        }, 2000);

        console.log("✅ Telegram connected successfully");
      } catch (error) {
        console.error("❌ Error connecting to Telegram:", error);
        this.showStatus(`❌ Lỗi: ${error.message}`, "error");
      } finally {
        connectBtn.disabled = false;
        connectBtn.innerHTML = originalText;
      }
    },

    saveNotificationSettings() {
      const settings = {
        taskNotifications:
          document.getElementById("taskNotifications")?.checked ?? true,
        eventReminders:
          document.getElementById("eventReminders")?.checked ?? true,
        aiSuggestions:
          document.getElementById("aiSuggestions")?.checked ?? true,
      };

      localStorage.setItem("notification_settings", JSON.stringify(settings));
      console.log("✅ Notification settings saved");
    },

    updateConnectionStatus(connected) {
      const statusEl = document.getElementById("connectionStatus");
      if (!statusEl) return;

      if (connected) {
        statusEl.className =
          "flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 font-medium text-sm";
        statusEl.innerHTML =
          '<span class="w-2 h-2 rounded-full bg-green-500"></span><span>Đã kết nối</span>';
      } else {
        statusEl.className =
          "flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 text-red-700 font-medium text-sm";
        statusEl.innerHTML =
          '<span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span><span>Chưa kết nối</span>';
      }
    },

    showStatus(message, type = "info") {
      const statusEl = document.getElementById("notificationStatusMessage");
      if (!statusEl) return;

      let bgColor = "bg-blue-50";
      let borderColor = "border-blue-200";
      let textColor = "text-blue-700";

      if (type === "success") {
        bgColor = "bg-green-50";
        borderColor = "border-green-200";
        textColor = "text-green-700";
      } else if (type === "error") {
        bgColor = "bg-red-50";
        borderColor = "border-red-200";
        textColor = "text-red-700";
      }

      statusEl.className = `${bgColor} border ${borderColor} ${textColor} rounded-lg p-4 text-sm`;
      statusEl.innerHTML = message;
      statusEl.classList.remove("hidden");

      setTimeout(() => {
        statusEl.classList.add("hidden");
      }, 5000);
    },

    closeModal() {
      console.log("🚪 Closing notification modal");

      const modal = document.getElementById("notificationModal");
      if (!modal) return;

      if (window.ModalManager && window.ModalManager.close) {
        window.ModalManager.close("notificationModal");
      } else {
        modal.classList.add("hidden");
        modal.classList.remove("active", "show");
      }

      document.body.style.overflow = "";
      console.log("✅ Notification modal closed");
    },

    cleanup() {
      console.log("🧹 NotificationManager cleanup");
    },
  };

  window.NotificationManager = NotificationManager;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      NotificationManager.init();
    });
  } else {
    setTimeout(() => NotificationManager.init(), 100);
  }

  console.log("✅ NotificationManager loaded");
})();
