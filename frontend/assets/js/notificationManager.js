(function () {
  "use strict";

  if (window.NotificationManager) {
    console.log(" NotificationManager already exists");
    return;
  }

  const NotificationManager = {
    initialized: false,
    currentUser: null,
    telegramConnected: false,

    init() {
      if (this.initialized) {
        console.log(" NotificationManager already initialized");
        return;
      }

      console.log(" NotificationManager initialization started");

      this.loadUserData();

      this.checkTelegramStatus();

      this.bindEvents();

      this.initialized = true;
      console.log(" NotificationManager initialized successfully");
    },

    loadUserData() {
      try {
        const userData = localStorage.getItem("user_data");
        if (userData) {
          this.currentUser = JSON.parse(userData);
          console.log(" User data loaded");
        }
      } catch (err) {
        console.error(" Error loading user data:", err);
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

      console.log(" Events bound");
    },

    openNotificationModal() {
      console.log(" Opening notification modal");

      const modal = document.getElementById("notificationModal");
      if (!modal) {
        console.error(" Notification modal not found");
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

      this.checkTelegramStatusInModal();

      setTimeout(() => {
        const connectBtn = document.getElementById("connectTelegramBtn");
        if (connectBtn) {
          connectBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.connectTelegram();
          };
          console.log(" Connect button re-bound");
        }

        const saveBtn = document.getElementById("saveNotificationSettingsBtn");
        if (saveBtn) {
          saveBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.saveSettingsAndClose();
          };
          console.log(" Save button re-bound");
        }
      }, 100);

      console.log(" Notification modal opened");
    },

    async checkTelegramStatusInModal() {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          this.updateConnectionStatus(false);
          this.toggleConnectionSection(true);
          return;
        }

        const response = await fetch("/api/notifications/telegram-status", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const connected = data.connected || false;
          this.telegramConnected = connected;

          this.updateConnectionStatus(connected);
          this.toggleConnectionSection(!connected);

          if (connected) {
            console.log(" Telegram is connected - hiding connection section");
          }
        } else {
          this.updateConnectionStatus(false);
          this.toggleConnectionSection(true);
        }
      } catch (err) {
        console.warn(" Could not check telegram status:", err);
        this.updateConnectionStatus(false);
        this.toggleConnectionSection(true);
      }
    },

    toggleConnectionSection(show) {
      const connectionSection = document.getElementById("connectionSection");
      const connectButtonGroup = document.getElementById("connectButtonGroup");
      const connectionStatusText = document.getElementById(
        "connectionStatusText"
      );

      if (show) {
        if (connectionSection) connectionSection.classList.remove("hidden");
        if (connectButtonGroup) connectButtonGroup.classList.remove("hidden");
        if (connectionStatusText) {
          connectionStatusText.textContent =
            "Để nhận thông báo công việc và lịch trình, bạn cần kết nối với Telegram bot.";
        }
      } else {
        if (connectionSection) connectionSection.classList.add("hidden");
        if (connectButtonGroup) connectButtonGroup.classList.add("hidden");
        if (connectionStatusText) {
          connectionStatusText.textContent =
            "Bạn đã kết nối thành công với Telegram. Bây giờ bạn sẽ nhận thông báo tự động.";
        }
      }
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
            console.log(" Telegram connected");
            this.updateConnectionStatus(true);
          }
        } else if (response.status === 404) {
          console.log("⏳ Telegram status endpoint not yet implemented");
        }
      } catch (err) {
        console.warn(" Could not check telegram status:", err);
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

          const taskReminderTime = document.getElementById("taskReminderTime");
          if (taskReminderTime && parsed.taskReminderTime) {
            taskReminderTime.value = parsed.taskReminderTime;
          }

          const dailyScheduleTime =
            document.getElementById("dailyScheduleTime");
          if (dailyScheduleTime && parsed.dailyScheduleTime) {
            dailyScheduleTime.value = parsed.dailyScheduleTime;
          }

          const dailySummaryTime = document.getElementById("dailySummaryTime");
          if (dailySummaryTime && parsed.dailySummaryTime) {
            dailySummaryTime.value = parsed.dailySummaryTime;
          }

          console.log(" Settings loaded");
        }
      } catch (err) {
        console.warn(" Could not load settings:", err);
      }
    },

    async connectTelegram() {
      console.log("🔗 Starting Telegram connection...");

      const connectBtn = document.getElementById("connectTelegramBtn");
      if (!connectBtn) {
        console.error(" Connect button not found!");
        this.showStatus(" Lỗi: Nút kết nối không được tìm thấy", "error");
        return;
      }

      const originalText = connectBtn.innerHTML;
      connectBtn.disabled = true;
      connectBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Đang mở Telegram...';

      try {
        const response = await fetch(
          "/api/notifications/telegram-connect-url",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
          }
        );

        if (!response.ok) {
          const error = await response.json();
          this.showStatus(` ${error.message}`, "error");
          connectBtn.disabled = false;
          connectBtn.innerHTML = originalText;
          return;
        }

        const result = await response.json();
        const { telegramUrl } = result;

        console.log(" Opening Telegram bot...");
        this.showStatus(
          " Đang mở Telegram... Hãy nhấn /start hoặc click link",
          "info"
        );

        window.open(telegramUrl, "_blank", "width=500,height=600");

        setTimeout(() => {
          if (connectBtn) {
            connectBtn.disabled = false;
            connectBtn.innerHTML = originalText;
          }
        }, 2000);

        let checkCount = 0;
        const connectionCheckInterval = setInterval(async () => {
          checkCount++;
          try {
            const token = localStorage.getItem("auth_token");
            if (!token) {
              clearInterval(connectionCheckInterval);
              return;
            }

            const statusResponse = await fetch(
              "/api/notifications/telegram-status",
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              if (statusData.connected) {
                console.log(" Connection confirmed!");
                this.telegramConnected = true;
                this.updateConnectionStatus(true);
                this.toggleConnectionSection(false);
                this.showStatus(" Kết nối Telegram thành công!", "success");
                clearInterval(connectionCheckInterval);

                setTimeout(() => {
                  this.closeModal();
                }, 1500);
              }
            }
          } catch (err) {
            console.warn(" Error checking connection status:", err);
          }

          if (checkCount >= 15) {
            clearInterval(connectionCheckInterval);
            console.log(" Connection check timeout - user may need to refresh");
          }
        }, 2000);
      } catch (error) {
        console.error(" Error starting connection:", error);
        this.showStatus(` Lỗi: ${error.message}`, "error");
        if (connectBtn) {
          connectBtn.disabled = false;
          connectBtn.innerHTML = originalText;
        }
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
        taskReminderTime:
          document.getElementById("taskReminderTime")?.value ?? "14:00",
        dailyScheduleTime:
          document.getElementById("dailyScheduleTime")?.value ?? "08:00",
        dailySummaryTime:
          document.getElementById("dailySummaryTime")?.value ?? "18:00",
      };

      localStorage.setItem("notification_settings", JSON.stringify(settings));
      console.log(" Notification settings saved", settings);
      return settings;
    },

    async saveSettingsAndClose() {
      try {
        const settings = this.saveNotificationSettings();

        const token = localStorage.getItem("auth_token");
        if (token) {
          const response = await fetch("/api/notifications/update-settings", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(settings),
          });

          if (response.ok) {
            this.showStatus(" Cài đặt đã được lưu thành công", "success");
          }
        } else {
          this.showStatus(" Cài đặt đã được lưu", "success");
        }

        setTimeout(() => {
          this.closeModal();
        }, 1000);
      } catch (error) {
        console.error(" Error saving settings:", error);
        this.showStatus(` Lỗi: ${error.message}`, "error");
      }
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
      console.log(" Notification modal closed");
    },

    cleanup() {
      console.log(" NotificationManager cleanup");
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

  console.log(" NotificationManager loaded");
})();
