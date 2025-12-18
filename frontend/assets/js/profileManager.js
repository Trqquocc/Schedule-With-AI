/**
 * ProfileManager v1.0
 * Xử lý cập nhật thông tin hồ sơ người dùng
 */

(function () {
  "use strict";

  // Suppress Selection Range errors from extensions
  if (window.getSelection) {
    const originalGetSelection = window.getSelection;
    window.getSelection = function () {
      try {
        return originalGetSelection();
      } catch (e) {
        console.warn("⚠️ Selection error suppressed:", e.message);
        return { rangeCount: 0, getRangeAt: () => null };
      }
    };
  }

  if (window.ProfileManager) {
    console.log("⚠️ ProfileManager already exists");
    return;
  }

  const ProfileManager = {
    initialized: false,
    currentUser: null,

    /**
     * ✅ INIT
     */
    init() {
      if (this.initialized) {
        console.log("ℹ️ ProfileManager already initialized");
        return;
      }

      console.log("🔧 ProfileManager initialization started");

      // Load user data
      this.loadUserData();

      // Bind events
      this.bindEvents();

      this.initialized = true;
      console.log("✅ ProfileManager initialized successfully");
    },

    /**
     * ✅ LOAD USER DATA
     */
    loadUserData() {
      try {
        const userData = localStorage.getItem("user_data");
        if (userData) {
          this.currentUser = JSON.parse(userData);
          console.log("📦 User data loaded:", this.currentUser);
        }
      } catch (err) {
        console.error("❌ Error loading user data:", err);
      }
    },

    /**
     * ✅ BIND EVENTS
     */
    bindEvents() {
      // Open modal from openProfileBtn
      const openProfileBtn = document.getElementById("openProfileBtn");
      console.log(
        "🔍 Looking for #openProfileBtn:",
        openProfileBtn ? "✅ FOUND" : "❌ NOT FOUND"
      );

      if (openProfileBtn) {
        openProfileBtn.addEventListener("click", (e) => {
          console.log("🎯 Profile button clicked!");
          e.preventDefault();
          e.stopPropagation();
          this.openProfileModal();
        });
        console.log("✅ Profile button event listener attached");
      }

      // Also attach to document for dynamic elements
      document.addEventListener("click", (e) => {
        if (e.target.closest("#openProfileBtn")) {
          console.log("🎯 Profile button clicked (delegated)!");
          e.preventDefault();
          e.stopPropagation();
          this.openProfileModal();
        }
      });

      // Close buttons
      const closeBtn = document.getElementById("closeProfileModal");
      const cancelBtn = document.getElementById("cancelProfileBtn");
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
      const modal = document.getElementById("profileModal");
      if (modal) {
        modal.addEventListener("click", (e) => {
          if (e.target === modal) {
            this.closeModal();
          }
        });
      }

      // Save button
      const saveBtn = document.getElementById("saveProfileBtn");
      if (saveBtn) {
        saveBtn.addEventListener("click", (e) => {
          e.preventDefault();
          this.saveProfile();
        });
      }

      // Avatar upload
      const avatarInput = document.getElementById("avatarInput");
      if (avatarInput) {
        avatarInput.addEventListener("change", (e) =>
          this.handleAvatarUpload(e)
        );
      }

      // Close on ESC key
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          const modal = document.getElementById("profileModal");
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
    openProfileModal() {
      console.log("🟢 Opening profile modal");
      console.log("📦 Current user:", this.currentUser);

      const modal = document.getElementById("profileModal");
      console.log("🔍 Modal element:", modal ? "✅ FOUND" : "❌ NOT FOUND");

      if (!modal) {
        console.error("❌ Profile modal not found in DOM");
        return;
      }

      // Fill form with current user data
      this.fillFormWithUserData();

      // Show modal using ModalManager if available
      if (window.ModalManager && window.ModalManager.showModalById) {
        console.log("📤 Using ModalManager.showModalById");
        window.ModalManager.showModalById("profileModal");
      } else {
        console.log("📤 Using fallback modal display");
        // Fallback: Show modal by removing hidden class
        modal.classList.remove("hidden");
        modal.classList.add("active", "show");
        document.body.style.overflow = "hidden";
      }

      console.log("✅ Profile modal opened");
    },

    /**
     * ✅ FILL FORM WITH USER DATA
     */
    fillFormWithUserData() {
      console.log("🔄 Filling form with user data...");

      if (!this.currentUser) {
        console.error("❌ No current user data available");
        return;
      }

      // Populate form fields - map by name attribute, not by id
      const form = document.getElementById("profileForm");
      console.log("🔍 Form element:", form ? "✅ FOUND" : "❌ NOT FOUND");

      if (!form) {
        console.error("❌ Profile form not found");
        return;
      }

      // Map form field names to user data properties
      const fieldMap = {
        hoten: this.currentUser.hoten || "",
        username: this.currentUser.username || "",
        email: this.currentUser.email || "",
        phone: this.currentUser.phone || "",
        ngaysinh: this.currentUser.ngaysinh || "",
        gioitinh: this.currentUser.gioitinh || "",
        bio: this.currentUser.bio || "",
      };

      // Fill form fields by name attribute
      Object.entries(fieldMap).forEach(([fieldName, value]) => {
        try {
          const element = form.elements[fieldName];
          if (element) {
            element.value = value;
            console.log(`  ✅ ${fieldName} = ${value || "(empty)"}`);
          } else {
            console.warn(`  ⚠️ Field ${fieldName} not found`);
          }
        } catch (e) {
          console.warn(`  ⚠️ Error setting ${fieldName}:`, e.message);
        }
      });

      // Update avatar display
      this.updateAvatarDisplay(
        this.currentUser.hoten || this.currentUser.username
      );

      console.log("✅ Form filled with user data");
    },

    /**
     * ✅ UPDATE AVATAR DISPLAY
     */
    updateAvatarDisplay(userName) {
      const avatar = document.getElementById("profileAvatar");
      if (avatar) {
        const letter = (userName || "?").charAt(0).toUpperCase();
        avatar.textContent = letter;
      }
    },

    /**
     * ✅ HANDLE AVATAR UPLOAD
     */
    handleAvatarUpload(e) {
      const file = e.target.files[0];
      if (!file) return;

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.showStatus("❌ File quá lớn! Tối đa 5MB", "error");
        return;
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        this.showStatus("❌ Vui lòng chọn tệp ảnh!", "error");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Store avatar as base64
          this.currentUser.avatar = e.target.result;
          console.log("✅ Avatar updated (base64)");
          this.showStatus("✅ Avatar được cập nhật", "success");
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    /**
     * ✅ SAVE PROFILE
     */
    async saveProfile() {
      console.log("💾 Saving profile...");

      const form = document.getElementById("profileForm");
      if (!form) {
        console.error("❌ Form not found");
        return;
      }

      // Validate form
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      // Collect form data by name attribute
      const formData = new FormData(form);
      const updatedUser = {
        ...this.currentUser,
        hoten: formData.get("hoten") || "",
        username: this.currentUser.username, // Cannot change username
        email: formData.get("email") || "",
        phone: formData.get("phone") || "",
        ngaysinh: formData.get("ngaysinh") || "",
        gioitinh: formData.get("gioitinh") || "",
        bio: formData.get("bio") || "",
      };

      console.log("📦 Updated user data:", updatedUser);

      // Show loading state
      const saveBtn = document.getElementById("saveProfileBtn");
      if (!saveBtn) {
        console.error("❌ Save button not found");
        return;
      }

      const originalText = saveBtn.innerHTML;
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';

      try {
        // Get user ID - try multiple property names for compatibility
        let userId = null;
        if (this.currentUser.id) {
          userId = this.currentUser.id;
        } else if (this.currentUser._id) {
          userId = this.currentUser._id;
        } else if (this.currentUser.userId) {
          userId = this.currentUser.userId;
        } else if (this.currentUser.UserID) {
          userId = this.currentUser.UserID;
        }

        if (!userId) {
          console.error("Current user:", this.currentUser);
          throw new Error("Không tìm thấy ID người dùng");
        }

        // Send to server - use correct endpoint
        const endpoint = `/api/users/${userId}`;
        console.log(`📤 Sending PUT request to: ${endpoint}`);
        console.log(`📤 User ID: ${userId}`);

        const response = await fetch(endpoint, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
          body: JSON.stringify(updatedUser),
        });

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.message || "Cập nhật thất bại");
        }

        // Update localStorage with new data
        const updatedUserData = responseData.data || updatedUser;
        localStorage.setItem("user_data", JSON.stringify(updatedUserData));
        this.currentUser = updatedUserData;

        // Update UI
        if (window.updateSidebarUser) {
          window.updateSidebarUser(updatedUserData);
        }
        if (window.App && window.App.updateUserInfo) {
          window.App.updateUserInfo();
        }

        this.showStatus(
          "✅ Thông tin cá nhân được cập nhật thành công!",
          "success"
        );

        // Close modal after 1.5s
        setTimeout(() => {
          this.closeModal();
        }, 1500);

        console.log("✅ Profile saved successfully");
      } catch (error) {
        console.error("❌ Error saving profile:", error);
        this.showStatus(`❌ Lỗi: ${error.message}`, "error");
      } finally {
        // Restore button
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
      }
    },

    /**
     * ✅ CLOSE MODAL
     */
    closeModal() {
      console.log("🚪 Closing profile modal");

      const modal = document.getElementById("profileModal");
      if (!modal) return;

      // Hide modal using ModalManager if available
      if (window.ModalManager && window.ModalManager.close) {
        window.ModalManager.close("profileModal");
      } else {
        // Fallback: Hide modal by adding hidden class
        modal.classList.add("hidden");
        modal.classList.remove("active", "show");
      }

      document.body.style.overflow = "";
      console.log("✅ Profile modal closed");
    },

    /**
     * ✅ SHOW STATUS MESSAGE
     */
    showStatus(message, type = "info") {
      const statusEl = document.getElementById("profileStatusMessage");
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
     * ✅ CLEANUP
     */
    cleanup() {
      console.log("🧹 ProfileManager cleanup");
      // Perform any cleanup if needed
    },
  };

  // Export
  window.ProfileManager = ProfileManager;

  // Auto-init when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      console.log("⏳ DOMContentLoaded - initializing ProfileManager...");
      setTimeout(() => {
        ProfileManager.init();
      }, 500);
    });
  } else {
    console.log("⏳ Document already loaded - initializing ProfileManager...");
    setTimeout(() => {
      ProfileManager.init();
    }, 500);
  }

  console.log("✅ ProfileManager script loaded");

  // Global error handler for selection errors from extensions
  window.addEventListener(
    "error",
    (event) => {
      if (event.message && event.message.includes("getRangeAt")) {
        console.warn("⚠️ Extension selection error suppressed");
        event.preventDefault();
        return true;
      }
    },
    true
  );
})();
