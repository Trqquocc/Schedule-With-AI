/**
 * Profile Manager - Manages user profile and settings
 * WRAPPED VERSION: Prevents duplicate initialization
 */

(function () {
  "use strict";

  if (window.ProfileManager) {
    console.log("⏭️ ProfileManager already loaded");
    return;
  }

  window.ProfileManager = {
    initialized: false,
    eventListeners: [],

    init() {
      if (this.initialized) {
        console.log("ℹ️ ProfileManager already initialized");
        return;
      }

      console.log("🚀 Initializing ProfileManager...");
      this.initialized = true;

      this.loadUserProfile();
      this.bindEvents();

      console.log("✅ ProfileManager initialized successfully");
    },

    loadUserProfile() {
      const user = JSON.parse(localStorage.getItem("user_data") || "{}");

      if (!user.ID) {
        console.warn("⚠️ No user ID found in localStorage");
        return;
      }

      console.log("📄 Loading user profile for:", user.username);

      // Điền vào form
      const fields = {
        hoten: user.hoten || "",
        username: user.username || "",
        email: user.email || "",
        phone: user.SoDienThoai || "",
        address: user.DiaChi || "",
      };

      Object.entries(fields).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
          element.value = value;
        }
      });

      // Cập nhật avatar chữ cái đầu
      const avatar = document.querySelector(".avatar-letter");
      if (avatar) {
        avatar.textContent = (user.hoten || user.username || "?")
          .charAt(0)
          .toUpperCase();
      }

      console.log("✅ User profile loaded");
    },

    bindEvents() {
      const saveButton = document.getElementById("save-profile");
      if (saveButton) {
        const handler = () => this.saveProfile();
        saveButton.addEventListener("click", handler);
        this.eventListeners.push({
          element: saveButton,
          event: "click",
          handler,
        });
      }

      const logoutButton = document.getElementById("logout-btn");
      if (logoutButton) {
        const handler = () => this.handleLogout();
        logoutButton.addEventListener("click", handler);
        this.eventListeners.push({
          element: logoutButton,
          event: "click",
          handler,
        });
      }

      console.log("✅ ProfileManager events bound");
    },

    async saveProfile() {
      try {
        const formData = {
          hoten: document.getElementById("hoten")?.value || "",
          SoDienThoai: document.getElementById("phone")?.value || "",
          DiaChi: document.getElementById("address")?.value || "",
        };

        console.log("💾 Saving profile:", formData);

        if (typeof Utils === "undefined") {
          throw new Error("Utils module not available");
        }

        const result = await Utils.makeRequest(
          "/api/profile/update",
          "PUT",
          formData
        );

        if (result.success) {
          Utils.showToast("Cập nhật thông tin thành công", "success");

          // Cập nhật localStorage
          const user = JSON.parse(localStorage.getItem("user_data") || "{}");
          const updatedUser = { ...user, ...formData };
          localStorage.setItem("user_data", JSON.stringify(updatedUser));

          // Cập nhật UI toàn bộ app
          if (window.App && App.updateUserInfo) {
            App.updateUserInfo();
          }

          console.log("✅ Profile saved successfully");
        } else {
          throw new Error(result.message || "Không thể cập nhật");
        }
      } catch (error) {
        console.error("❌ Error saving profile:", error);
        if (typeof Utils !== "undefined" && Utils.showToast) {
          Utils.showToast("Lỗi cập nhật: " + error.message, "error");
        }
      }
    },

    handleLogout() {
      if (confirm("Bạn có chắc muốn đăng xuất?")) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_data");
        window.location.href = "/login.html";
      }
    },

    cleanup() {
      console.log("🧹 Cleaning up ProfileManager...");

      this.eventListeners.forEach(({ element, event, handler }) => {
        if (element && element.removeEventListener) {
          element.removeEventListener(event, handler);
        }
      });

      this.eventListeners = [];
      this.initialized = false;

      console.log("✅ ProfileManager cleaned up");
    },
  };

  console.log("✅ ProfileManager loaded");
})();
