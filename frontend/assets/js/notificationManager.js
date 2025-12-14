/**
 * NotificationManager v1.0
 * Xử lý kết nối Telegram và cài đặt thông báo
 */

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

    /**
     * ✅ INIT
     */
    init() {
      if (this.initialized) {
        console.log("ℹ️ NotificationManager already initialized");
        return;
      }

      console.log("🔧 NotificationManager initialization started");

      // Load user data
      this.loadUserData();

      // Check telegram connection status
      this.checkTelegramStatus();

      // Bind events
      this.bindEvents();

      this.initialized = true;
      console.log("✅ NotificationManager initialized successfully");
    },

    /**
     * ✅ LOAD USER DATA
     */
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

    /**
     * ✅ BIND EVENTS
     */
    bindEvents() {
      // Open modal button - từ openNotificationBtn hoặc thông báo trong settings
      document.addEventListener("click", (e) => {
        if (e.target.closest("#openNotificationBtn")) {
          e.preventDefault();
          e.stopPropagation();
          this.openNotificationModal();
        }
      });

      // Close buttons
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

      // Close on backdrop click
      const modal = document.getElementById("notificationModal");
      if (modal) {
        modal.addEventListener("click", (e) => {
          if (e.target === modal) {
            this.closeModal();
          }
        });
      }

      // Connect button
      const connectBtn = document.getElementById("connectTelegramBtn");
      if (connectBtn) {
        connectBtn.addEventListener("click", (e) => {
          e.preventDefault();
          this.connectTelegram();
        });
      }

      // Close on ESC key
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

    /**
     * ✅ OPEN MODAL
     */
    openNotificationModal() {
      console.log("🟢 Opening notification modal");

      const modal = document.getElementById("notificationModal");
      if (!modal) {
        console.error("❌ Notification modal not found");
        return;
      }

      // Load saved settings
      this.loadNotificationSettings();

      // Show modal using ModalManager if available
      if (window.ModalManager && window.ModalManager.showModalById) {
        window.ModalManager.showModalById("notificationModal");
      } else {
        // Fallback: Show modal by removing hidden class
        modal.classList.remove("hidden");
        modal.classList.add("active", "show");
        document.body.style.overflow = "hidden";
      }

      console.log("✅ Notification modal opened");
    },

    /**
     * ✅ CHECK TELEGRAM STATUS
     */
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
        }
      } catch (err) {
        console.warn("⚠️ Could not check telegram status:", err);
      }
    },

    /**
     * ✅ LOAD NOTIFICATION SETTINGS
     */
    loadNotificationSettings() {
      try {
        const settings = localStorage.getItem("notification_settings");
        if (settings) {
          const parsed = JSON.parse(settings);

          // Update checkboxes
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

    /**
     * ✅ CONNECT TELEGRAM
     */
    async connectTelegram() {
      console.log("🔗 Connecting to Telegram...");

      const tokenInput = document.getElementById("telegramToken");
      const token = tokenInput?.value?.trim();

      if (!token) {
        this.showStatus("❌ Vui lòng nhập mã token", "error");
        return;
      }

      // Validate token format (should be alphanumeric, length > 10)
      if (!/^[a-zA-Z0-9_-]{10,}$/.test(token)) {
        this.showStatus(
          "❌ Mã token không hợp lệ! Kiểm tra lại mã từ bot",
          "error"
        );
        return;
      }

      // Show loading state
      const connectBtn = document.getElementById("connectTelegramBtn");
      const originalText = connectBtn.innerHTML;
      connectBtn.disabled = true;
      connectBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i>Đang kết nối...';

      try {
        // Send to server
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

        // Save settings
        this.saveNotificationSettings();

        // Update status
        this.telegramConnected = true;
        this.updateConnectionStatus(true);

        this.showStatus("✅ Kết nối Telegram thành công!", "success");

        // Clear token input
        tokenInput.value = "";

        // Close modal after 2s
        setTimeout(() => {
          this.closeModal();
        }, 2000);

        console.log("✅ Telegram connected successfully");
      } catch (error) {
        console.error("❌ Error connecting to Telegram:", error);
        this.showStatus(`❌ Lỗi: ${error.message}`, "error");
      } finally {
        // Restore button
        connectBtn.disabled = false;
        connectBtn.innerHTML = originalText;
      }
    },

    /**
     * ✅ SAVE NOTIFICATION SETTINGS
     */
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

    /**
     * ✅ UPDATE CONNECTION STATUS DISPLAY
     */
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

    /**
     * ✅ SHOW STATUS MESSAGE
     */
    showStatus(message, type = "info") {
      const statusEl = document.getElementById("notificationStatusMessage");
      if (!statusEl) return;

      // Determine colors
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

      // Auto-hide after 5s
      setTimeout(() => {
        statusEl.classList.add("hidden");
      }, 5000);
    },

    /**
     * ✅ CLOSE MODAL
     */
    closeModal() {
      console.log("🚪 Closing notification modal");

      const modal = document.getElementById("notificationModal");
      if (!modal) return;

      // Hide modal using ModalManager if available
      if (window.ModalManager && window.ModalManager.close) {
        window.ModalManager.close("notificationModal");
      } else {
        // Fallback: Hide modal by adding hidden class
        modal.classList.add("hidden");
        modal.classList.remove("active", "show");
      }

      document.body.style.overflow = "";
      console.log("✅ Notification modal closed");
    },

    /**
     * ✅ CLEANUP
     */
    cleanup() {
      console.log("🧹 NotificationManager cleanup");
      // Perform any cleanup if needed
    },
  };

  // Export
  window.NotificationManager = NotificationManager;

  // Auto-init when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      NotificationManager.init();
    });
  } else {
    setTimeout(() => NotificationManager.init(), 100);
  }

  console.log("✅ NotificationManager loaded");
})();
