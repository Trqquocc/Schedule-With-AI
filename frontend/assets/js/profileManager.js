(function () {
  "use strict";

  if (window.ProfileManager) {
    console.log("⚠️ ProfileManager already exists");
    return;
  }

  const ProfileManager = {
    initialized: false,
    currentUser: null,

    init() {
      if (this.initialized) {
        console.log("ℹ️ ProfileManager already initialized");
        return;
      }

      console.log("🔧 ProfileManager initialization started");

      this.loadUserData();

      this.bindEvents();

      this.initialized = true;
      console.log("✅ ProfileManager initialized successfully");
    },

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

    bindEvents() {
      console.log("⚠️ ProfileManager bindEvents() is now handled by profile-modal.html inline script");
      return;
    },

    openProfileModal(event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      console.log("🟢 Opening profile modal");

      const modal = document.getElementById("profileModal");
      if (!modal) {
        console.error("❌ Profile modal not found");
        return;
      }

      this.fillFormWithUserData();

      if (window.ModalManager && window.ModalManager.showModalById) {
        window.ModalManager.showModalById("profileModal");
      } else {
        modal.classList.remove("hidden");
        modal.classList.add("active", "show");
        document.body.style.overflow = "hidden";
      }

      console.log("✅ Profile modal opened");
    },

    fillFormWithUserData() {
      if (!this.currentUser) return;

      const form = document.getElementById("profileForm");
      if (!form) {
        console.error("❌ Profile form not found");
        return;
      }

      const fieldMap = {
        hoten: this.currentUser.hoten || "",
        username: this.currentUser.username || "",
        email: this.currentUser.email || "",
        phone: this.currentUser.SoDienThoai || this.currentUser.phone || "",
        ngaysinh: this.currentUser.ngaysinh || "",
        gioitinh: this.currentUser.gioitinh || "",
        bio: this.currentUser.bio || "",
      };

      Object.entries(fieldMap).forEach(([fieldName, value]) => {
        const element = form.elements[fieldName];
        if (element && fieldName === "ngaysinh" && value) {
          try {
            element.value = new Date(value).toISOString().split("T")[0];
          } catch (e) { }
        } else if (element) {
          element.value = value;
        }
      });

      this.updateAvatarDisplay(
        this.currentUser.hoten || this.currentUser.username
      );

      console.log("✅ Form filled with user data");
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
        this.showStatus("❌ File quá lớn! Tối đa 5MB", "error");
        return;
      }

      if (!file.type.startsWith("image/")) {
        this.showStatus("❌ Vui lòng chọn tệp ảnh!", "error");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.currentUser.avatar = e.target.result;
          console.log("✅ Avatar updated (base64)");
          this.showStatus("✅ Avatar được cập nhật", "success");
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

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const formData = new FormData(form);
      const updatedUser = {
        ...this.currentUser,
        hoten: formData.get("hoten") || "",
        username: formData.get("username") || "",
        email: formData.get("email") || "",
        SoDienThoai: formData.get("phone") || "", 
        ngaysinh: formData.get("ngaysinh") || "",
        gioitinh: formData.get("gioitinh") || "",
        bio: formData.get("bio") || "",
      };

      console.log("📦 Updated user data:", updatedUser);

      const saveBtn = document.getElementById("saveProfileBtn");
      if (!saveBtn) {
        console.error("❌ Save button not found");
        return;
      }

      const originalText = saveBtn.innerHTML;
      saveBtn.disabled = true;
      saveBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';

      try {
        const userData = JSON.parse(localStorage.getItem("user_data") || "{}");
        const userId = userData.ID || userData.id || userData.UserID;
        
        if (!userId) {
          throw new Error("❌ User ID not found in localStorage");
        }
        
        const endpoint = `/api/users/${userId}`;
        console.log(`📤 Sending PUT request to: ${endpoint}`);

        const payload = {
          hoten: updatedUser.hoten,
          username: updatedUser.username,
          email: updatedUser.email,
          phone: updatedUser.SoDienThoai,
          ngaysinh: updatedUser.ngaysinh,
          gioitinh: updatedUser.gioitinh,
          bio: updatedUser.bio,
        };

        console.log("📦 Payload being sent:", payload);
        
        const responseData = await Utils.makeRequest(endpoint, "PUT", payload);

        if (!responseData.success) {
          throw new Error(responseData.message || "Cập nhật thất bại");
        }

        const updatedUserData = responseData.data || updatedUser;
        localStorage.setItem("user_data", JSON.stringify(updatedUserData));
        this.currentUser = updatedUserData;

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

        setTimeout(() => {
          this.closeModal();
        }, 1500);

        console.log("✅ Profile saved successfully");
      } catch (error) {
        console.error("❌ Error saving profile:", error);
        this.showStatus(`❌ Lỗi: ${error.message}`, "error");
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
      }
    },

    closeModal() {
      console.log("🚪 closeModal() called");
      const modal = document.getElementById("profileModal");
      if (!modal) return;
      modal.classList.add("hidden");
      modal.classList.remove("show", "active");
      document.body.style.overflow = "";
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
      console.log("🧹 ProfileManager cleanup");
    },
  };
  window.ProfileManager = ProfileManager;

  setTimeout(() => {
    ProfileManager.init();
  }, 200);

  console.log("✅ ProfileManager loaded");
})();
