(function () {
  "use strict";

  if (window.getSelection) {
    const originalGetSelection = window.getSelection;
    window.getSelection = function () {
      try {
        const sel = originalGetSelection();
        if (sel && typeof sel.rangeCount === "number") {
          return sel;
        }
        return { rangeCount: 0, getRangeAt: () => null };
      } catch (e) {
        console.warn(
          "⚠️ Selection error suppressed from extension:",
          e.message
        );
        return { rangeCount: 0, getRangeAt: () => null };
      }
    };
  }

  if (window.ProfileManager) {
    console.log(" ProfileManager already exists");
    return;
  }

  const ProfileManager = {
    initialized: false,
    currentUser: null,

    init() {
      if (this.initialized) {
        console.log(" ProfileManager already initialized");
        return;
      }

      console.log(" ProfileManager initialization started");

      this.loadUserData();

      this.bindEvents();

      this.initialized = true;
      console.log(" ProfileManager initialized successfully");
    },

    loadUserData() {
      try {
        const userData = localStorage.getItem("user_data");
        if (userData) {
          this.currentUser = JSON.parse(userData);
          console.log(" User data loaded:", this.currentUser);
        }
      } catch (err) {
        console.error(" Error loading user data:", err);
      }
    },

    bindEvents() {
      console.log("🔗 Binding profile modal events...");

      // Save button
      const saveBtn = document.getElementById("saveProfileBtn");
      if (saveBtn) {
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        newSaveBtn.addEventListener("click", (e) => {
          e.preventDefault();
          this.saveProfile();
        });
        console.log("  ✅ Save button bound");
      }

      // Close button (X)
      const closeBtn = document.getElementById("closeProfileModal");
      if (closeBtn) {
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        newCloseBtn.addEventListener("click", (e) => {
          e.preventDefault();
          this.closeModal();
        });
        console.log("  ✅ Close button bound");
      }

      // Cancel button
      const cancelBtn = document.getElementById("cancelProfileBtn");
      if (cancelBtn) {
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        newCancelBtn.addEventListener("click", (e) => {
          e.preventDefault();
          this.closeModal();
        });
        console.log("  ✅ Cancel button bound");
      }

      // Avatar upload
      const avatarInput = document.getElementById("avatarInput");
      if (avatarInput) {
        avatarInput.addEventListener("change", (e) =>
          this.handleAvatarUpload(e)
        );
        console.log("  ✅ Avatar input bound");
      }

      // ESC key
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          const modal = document.getElementById("profileModal");
          if (modal && !modal.classList.contains("hidden")) {
            this.closeModal();
          }
        }
      });

      console.log("✅ All profile events bound successfully");
    },

    waitForModalThenBind() {
      const checkModal = () => {
        const modal = document.getElementById("profileModal");
        if (modal) {
          console.log("✅ Profile modal found in DOM");
          this.bindEvents();
        } else {
          console.log("⏳ Waiting for profile modal...");
          setTimeout(checkModal, 100);
        }
      };
      checkModal();
    },

    async init() {
      if (this.initialized) {
        console.log("ℹ️ ProfileManager already initialized");
        return;
      }

      console.log("🔧 ProfileManager initialization started");

      // Load user data từ localStorage hoặc API
      await this.loadUserData();

      // Đợi modal tồn tại rồi mới bind events
      this.waitForModalThenBind();

      this.initialized = true;
      console.log("✅ ProfileManager initialized successfully");
    },

    async openProfileModal() {
      console.log("🟢 Opening profile modal...");

      // ALWAYS reload data from API to ensure fresh data
      await this.loadUserData();

      const modal = document.getElementById("profileModal");
      if (!modal) {
        console.error("❌ Profile modal not found");
        return;
      }

      // Fill form with loaded data
      this.fillFormWithUserData();

      // Show modal
      if (window.ModalManager?.showModalById) {
        window.ModalManager.showModalById("profileModal");
      } else {
        modal.classList.remove("hidden");
        modal.classList.add("active", "show");
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
      }

      console.log("✅ Profile modal opened");
    },

    async loadUserData() {
      try {
        console.log("📦 Loading user data...");

        // Thử lấy từ localStorage trước
        let userData = localStorage.getItem("user_data");

        if (userData) {
          try {
            this.currentUser = JSON.parse(userData);
            console.log(
              "✅ User data loaded from localStorage:",
              this.currentUser
            );
            return;
          } catch (parseError) {
            console.warn(
              "⚠️ Failed to parse localStorage user_data, fetching from API..."
            );
          }
        }

        // Nếu không có trong localStorage, fetch từ API
        console.log("🔍 No local data, fetching from API...");
        const token = localStorage.getItem("auth_token");

        if (!token) {
          console.warn("⚠️ No auth token found");
          return;
        }

        const response = await fetch("/api/users/profile", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("📡 API response:", data);

        if (!data.success || !data.data) {
          throw new Error("Invalid API response structure");
        }

        // Lưu vào localStorage và currentUser
        this.currentUser = data.data;
        localStorage.setItem("user_data", JSON.stringify(data.data));

        console.log("✅ User data fetched and saved:", this.currentUser);
      } catch (err) {
        console.error("❌ Error loading user data:", err);
        this.showStatus(
          `Không thể tải thông tin người dùng: ${err.message}`,
          "error"
        );
      }
    },

    async loadUserDataFromAPI() {
      try {
        console.log(" Fetching user profile from API...");
        const response = await fetch("/api/profile", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(" User profile fetched from API:", data);

        if (data && data.data) {
          this.currentUser = data.data;
          localStorage.setItem("user_data", JSON.stringify(data.data));
          console.log(" User data updated from API");
        }
      } catch (error) {
        console.error(" Error fetching user profile from API:", error);
      }
    },

    fillFormWithUserData() {
      console.log("📄 Filling form with user data...");

      if (!this.currentUser) {
        console.error("❌ No user data available");
        return;
      }

      console.log("📋 Current user data:", this.currentUser);

      const form = document.getElementById("profileForm");
      if (!form) {
        console.error("❌ Profile form not found");
        return;
      }

      // Hỗ trợ nhiều naming conventions
      const getValue = (field) => {
        return (
          this.currentUser[field] ||
          this.currentUser[field.toLowerCase()] ||
          this.currentUser[field.charAt(0).toUpperCase() + field.slice(1)] ||
          ""
        );
      };

      // Map các fields
      const fields = {
        hoten:
          getValue("hoten") || getValue("HoTen") || getValue("fullname") || "",
        username: getValue("username") || getValue("Username") || "",
        email: getValue("email") || getValue("Email") || "",
        phone:
          getValue("phone") ||
          getValue("SoDienThoai") ||
          getValue("sodienthoai") ||
          "",
        ngaysinh: getValue("ngaysinh") || getValue("NgaySinh") || "",
        gioitinh: getValue("gioitinh") || getValue("GioiTinh") || "",
        bio: getValue("bio") || getValue("Bio") || "",
      };

      console.log("📊 Fields to fill:", fields);

      // Fill form
      Object.entries(fields).forEach(([fieldName, value]) => {
        const element = form.elements[fieldName];
        if (element) {
          element.value = value || "";
          console.log(`  ✅ ${fieldName} = "${value}"`);
        } else {
          console.warn(`  ⚠️ Element not found: ${fieldName}`);
        }
      });

      // Update avatar
      const userName = fields.hoten || fields.username || "?";
      this.updateAvatarDisplay(userName);

      console.log("✅ Form filled successfully");
    },

    updateAvatarDisplay(userName) {
      const avatar = document.getElementById("profileAvatar");
      if (avatar) {
        const letter = (userName || "?").charAt(0).toUpperCase();
        avatar.textContent = letter;
      }
    },

    handleAvatarUpload(e) {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        this.showStatus(" File quá lớn! Tối đa 5MB", "error");
        return;
      }

      if (!file.type.startsWith("image/")) {
        this.showStatus(" Vui lòng chọn tệp ảnh!", "error");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.currentUser.avatar = e.target.result;
          console.log(" Avatar updated (base64)");
          this.showStatus(" Avatar được cập nhật", "success");
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    async saveProfile() {
      console.log("💾 Saving profile...");

      const form = document.getElementById("profileForm");
      if (!form) {
        console.error("❌ Form not found");
        return;
      }

      // Validate
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      // Lấy userId từ nhiều nguồn
      let userId = null;

      if (this.currentUser) {
        userId =
          this.currentUser.id ||
          this.currentUser.UserID ||
          this.currentUser.userid ||
          this.currentUser.userId ||
          this.currentUser._id;
      }

      console.log("🔑 User ID:", userId);
      console.log("📋 Current user object:", this.currentUser);

      if (!userId) {
        this.showStatus(
          "❌ Không tìm thấy ID người dùng. Vui lòng đăng nhập lại.",
          "error"
        );
        return;
      }

      // Lấy data từ form
      const formData = new FormData(form);
      const updatedUser = {
        HoTen: formData.get("hoten")?.trim() || "",
        Email: formData.get("email")?.trim() || "",
        SoDienThoai: formData.get("phone")?.trim() || "",
      };

      // Chỉ thêm password nếu có nhập
      const password = formData.get("password")?.trim();
      if (password && password.length > 0) {
        updatedUser.Password = password;
      }

      console.log("📦 Data to send:", updatedUser);

      // Disable button
      const saveBtn = document.getElementById("saveProfileBtn");
      if (!saveBtn) return;

      const originalText = saveBtn.innerHTML;
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';

      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("Không tìm thấy token xác thực");
        }

        console.log(`🔄 Sending PUT request to /api/users/${userId}`);

        const response = await fetch(`/api/users/${userId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updatedUser),
        });

        console.log("📡 Response status:", response.status);

        const responseData = await response.json();
        console.log("📡 Response data:", responseData);

        if (!response.ok) {
          throw new Error(responseData.message || `HTTP ${response.status}`);
        }

        // Update local data
        const newUserData = responseData.data || {
          ...this.currentUser,
          ...updatedUser,
          hoten: updatedUser.HoTen,
          email: updatedUser.Email,
          phone: updatedUser.SoDienThoai,
        };

        localStorage.setItem("user_data", JSON.stringify(newUserData));
        this.currentUser = newUserData;

        console.log("✅ Local data updated:", newUserData);

        // Update sidebar
        if (window.updateSidebarUser) {
          window.updateSidebarUser(newUserData);
        }

        this.showStatus("✅ Cập nhật thông tin thành công!", "success");

        // Close modal after 1.5s
        setTimeout(() => this.closeModal(), 1500);
      } catch (error) {
        console.error("❌ Save error:", error);
        this.showStatus(`❌ Lỗi: ${error.message}`, "error");
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
      }
    },

    closeModal() {
      console.log("🚪 Closing profile modal");

      const modal = document.getElementById("profileModal");
      if (!modal) return;

      if (window.ModalManager && window.ModalManager.close) {
        window.ModalManager.close("profileModal");
      } else {
        modal.classList.add("hidden");
        modal.classList.remove("active", "show");
        modal.style.display = "none";
        document.body.style.overflow = "";
      }

      console.log("✅ Profile modal closed");
    },

    showStatus(message, type = "info") {
      const statusEl = document.getElementById("profileStatusMessage");
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

    cleanup() {
      console.log(" ProfileManager cleanup");
    },
  };

  window.ProfileManager = ProfileManager;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      console.log(" DOMContentLoaded - initializing ProfileManager...");
      setTimeout(() => {
        ProfileManager.init();
      }, 500);
    });
  } else {
    console.log(" Document already loaded - initializing ProfileManager...");
    setTimeout(() => {
      ProfileManager.init();
    }, 500);
  }

  console.log(" ProfileManager script loaded");

  window.addEventListener(
    "error",
    (event) => {
      if (event.message && event.message.includes("getRangeAt")) {
        console.warn(" Extension selection error suppressed");
        event.preventDefault();
        return true;
      }
    },
    true
  );
})();
