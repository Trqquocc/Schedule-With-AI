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
        return { rangeCount: 0, getRangeAt: () => null };
      }
    };
  }

  if (window.ProfileManager) {
    return;
  }

  const ProfileManager = {
    initialized: false,
    currentUser: null,

    init() {
      if (this.initialized) {
        return;
      }

      this.loadUserData();

      this.bindEvents();

      this.initialized = true;
    },

    loadUserData() {
      try {
        const userData = localStorage.getItem("user_data");
        if (userData) {
          this.currentUser = JSON.parse(userData);
        }
      } catch (err) {
        console.error("Error loading user data:", err);
      }
    },

    bindEvents() {
      // Save/close/cancel buttons are wired by the modal's inline script
      // (profile-modal.html) which delegates to ProfileManager methods.
      // We only wire the avatar input here — the modal script doesn't know
      // about upload logic.
      const avatarInput = document.getElementById("avatarInput");
      if (avatarInput && !avatarInput._pmBound) {
        avatarInput._pmBound = true;
        avatarInput.addEventListener("change", (e) =>
          this.handleAvatarUpload(e)
        );
      }
    },

    waitForModalThenBind() {
      const checkModal = () => {
        const modal = document.getElementById("profileModal");
        if (modal) {
          this.bindEvents();
        } else {
          setTimeout(checkModal, 100);
        }
      };
      checkModal();
    },

    async init() {
      if (this.initialized) {
        return;
      }

      // Load user data từ localStorage hoặc API
      await this.loadUserData();

      // Đợi modal tồn tại rồi mới bind events
      this.waitForModalThenBind();

      this.initialized = true;
    },

    async openProfileModal() {
      // ALWAYS reload data from API to ensure fresh data
      await this.loadUserData();

      const modal = document.getElementById("profileModal");
      if (!modal) {
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
    },

    async loadUserData() {
      // Try API first so fields added later (hocvan, avatarUrl) show up
      // even when localStorage still has the old shape.
      const token = localStorage.getItem("auth_token");
      if (token) {
        try {
          const response = await fetch("/api/users/profile", {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const data = await response.json();
            if (data?.success && data.data) {
              this.currentUser = data.data;
              localStorage.setItem("user_data", JSON.stringify(data.data));
              if (data.data.avatarUrl) {
                localStorage.setItem("user_avatar_url", data.data.avatarUrl);
              }
              return;
            }
          }
        } catch (err) {
          console.warn("profile API fetch failed, falling back to localStorage:", err);
        }
      }

      // Fallback to cached localStorage.
      try {
        const cached = localStorage.getItem("user_data");
        if (cached) this.currentUser = JSON.parse(cached);
      } catch (_) {
        /* ignore */
      }
    },

    async loadUserDataFromAPI() {
      try {
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

        if (data && data.data) {
          this.currentUser = data.data;
          localStorage.setItem("user_data", JSON.stringify(data.data));
        }
      } catch (error) {
        console.error("Error fetching user profile from API:", error);
      }
    },

    fillFormWithUserData() {
      if (!this.currentUser) return;
      const form = document.getElementById("profileInfoForm");
      if (!form) return;

      const getValue = (field) =>
        this.currentUser[field] ||
        this.currentUser[field.toLowerCase()] ||
        this.currentUser[field.charAt(0).toUpperCase() + field.slice(1)] ||
        "";

      const fields = {
        hoten: getValue("hoten") || getValue("HoTen") || getValue("fullname") || "",
        username: getValue("username") || getValue("Username") || "",
        email: getValue("email") || getValue("Email") || "",
        phone:
          getValue("phone") || getValue("SoDienThoai") || getValue("sodienthoai") || "",
        hocvan: getValue("hocvan") || getValue("HocVan") || "",
      };

      Object.entries(fields).forEach(([fieldName, value]) => {
        const el = form.elements[fieldName];
        if (el) el.value = value || "";
      });

      const userName = fields.hoten || fields.username || "?";
      this.updateAvatarDisplay(userName);
    },

    updateAvatarDisplay(userName) {
      // Prefer the persisted server URL; fall back to local base64 preview;
      // otherwise render an initial letter.
      const serverUrl =
        this.currentUser?.avatarUrl ||
        this.currentUser?.AvatarUrl ||
        localStorage.getItem("user_avatar_url");
      const localB64 = localStorage.getItem("user_avatar");
      const src = serverUrl || localB64 || null;

      const paintInto = (el) => {
        if (!el) return;
        if (src) {
          el.innerHTML = "";
          el.style.backgroundImage = `url(${src})`;
          el.style.backgroundSize = "cover";
          el.style.backgroundPosition = "center";
          el.style.backgroundRepeat = "no-repeat";
        } else {
          el.style.backgroundImage = "";
          el.textContent = (userName || "?").charAt(0).toUpperCase();
        }
      };
      paintInto(document.getElementById("profileAvatar"));
      paintInto(document.getElementById("sidebarAvatarContainer"));
    },

    async handleAvatarUpload(e) {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        this.showStatus("File quá lớn! Tối đa 2MB", "error");
        return;
      }
      if (!file.type.startsWith("image/")) {
        this.showStatus("Vui lòng chọn tệp ảnh", "error");
        return;
      }

      const status = document.getElementById("avatarUploadStatus");
      const paintLocal = (dataUrl) => {
        const paint = (el) => {
          if (!el) return;
          el.innerHTML = "";
          el.style.backgroundImage = `url(${dataUrl})`;
          el.style.backgroundSize = "cover";
          el.style.backgroundPosition = "center";
        };
        paint(document.getElementById("profileAvatar"));
        paint(document.getElementById("sidebarAvatarContainer"));
      };

      // Step 1: instant preview via FileReader base64.
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      }).catch(() => null);
      if (!dataUrl) {
        this.showStatus("Không đọc được file", "error");
        return;
      }
      paintLocal(dataUrl);
      localStorage.setItem("user_avatar", dataUrl);
      if (status) {
        status.textContent = "Đang tải lên...";
        status.style.color = "#64748b";
      }

      // Step 2: persist to backend (Supabase Storage via /api/users/avatar).
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch("/api/users/avatar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ dataUrl }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j?.success) {
          throw new Error(j?.message || `HTTP ${res.status}`);
        }
        const url = j.data?.avatarUrl;
        if (url) {
          localStorage.setItem("user_avatar_url", url);
          if (this.currentUser) {
            this.currentUser.avatarUrl = url;
            this.currentUser.AvatarUrl = url;
            localStorage.setItem("user_data", JSON.stringify(this.currentUser));
          }
          // Repaint from URL so it sticks after reload (base64 in localStorage was a preview).
          const repaint = (el) => {
            if (!el) return;
            el.innerHTML = "";
            el.style.backgroundImage = `url(${url})`;
            el.style.backgroundSize = "cover";
            el.style.backgroundPosition = "center";
          };
          repaint(document.getElementById("profileAvatar"));
          repaint(document.getElementById("sidebarAvatarContainer"));
        }
        if (status) {
          status.textContent = "✓ Đã lưu avatar";
          status.style.color = "#10b981";
        }
        Utils.showToast?.("Avatar đã được cập nhật", "success");
      } catch (err) {
        console.error("avatar upload error:", err);
        if (status) {
          status.textContent = "✗ " + (err.message || "Lưu thất bại");
          status.style.color = "#ef4444";
        }
        Utils.showToast?.(err.message || "Upload avatar thất bại", "error");
      }
    },

    async saveProfile() {
      const form = document.getElementById("profileInfoForm");
      if (!form) return;
      if (!form.checkValidity()) { form.reportValidity(); return; }

      const userId =
        this.currentUser?.id ||
        this.currentUser?.UserID ||
        this.currentUser?.userid ||
        this.currentUser?.userId;
      if (!userId) {
        this.showStatus("Không tìm thấy ID người dùng. Vui lòng đăng nhập lại.", "error");
        return;
      }

      const formData = new FormData(form);
      // Backend /api/users/:id expects lowercase keys (hoten, email, phone, hocvan).
      const payload = {
        hoten: formData.get("hoten")?.trim() || "",
        email: formData.get("email")?.trim() || "",
        phone: formData.get("phone")?.trim() || "",
        hocvan: formData.get("hocvan")?.trim() || "",
      };

      const saveBtn = document.getElementById("saveProfileBtn");
      if (!saveBtn) return;
      const originalText = saveBtn.innerHTML;
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';

      try {
        const token = localStorage.getItem("auth_token");
        if (!token) throw new Error("Không tìm thấy token xác thực");

        const response = await fetch(`/api/users/${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.message || `HTTP ${response.status}`);

        const newUserData = responseData.data || { ...this.currentUser, ...payload };
        localStorage.setItem("user_data", JSON.stringify(newUserData));
        this.currentUser = newUserData;

        if (window.updateSidebarUser) window.updateSidebarUser(newUserData);

        this.showStatus("✅ Cập nhật thông tin thành công!", "success");
        setTimeout(() => this.closeModal(), 1500);
      } catch (error) {
        console.error("Save profile error:", error);
        this.showStatus(`Lỗi: ${error.message}`, "error");
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
      }
    },

    async savePassword() {
      const form = document.getElementById("profilePasswordForm");
      if (!form) return;
      if (!form.checkValidity()) { form.reportValidity(); return; }

      const userId =
        this.currentUser?.id ||
        this.currentUser?.UserID ||
        this.currentUser?.userid ||
        this.currentUser?.userId;
      if (!userId) {
        this.showPasswordStatus("Không tìm thấy ID người dùng", "error");
        return;
      }

      const oldPassword = document.getElementById("oldPassword")?.value || "";
      const newPassword = document.getElementById("newPassword")?.value || "";
      const confirmPassword = document.getElementById("confirmPassword")?.value || "";

      if (newPassword.length < 6) {
        this.showPasswordStatus("Mật khẩu mới tối thiểu 6 ký tự", "error");
        return;
      }
      if (newPassword !== confirmPassword) {
        this.showPasswordStatus("Xác nhận không khớp với mật khẩu mới", "error");
        return;
      }
      if (newPassword === oldPassword) {
        this.showPasswordStatus("Mật khẩu mới trùng với mật khẩu cũ", "error");
        return;
      }

      const saveBtn = document.getElementById("savePasswordBtn");
      const originalText = saveBtn?.innerHTML;
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đổi...';
      }

      try {
        const token = localStorage.getItem("auth_token");
        if (!token) throw new Error("Không tìm thấy token xác thực");

        const res = await fetch(`/api/users/${userId}/password`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ oldPassword, newPassword }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.success) throw new Error(j.message || `HTTP ${res.status}`);

        this.showPasswordStatus("✅ Đổi mật khẩu thành công!", "success");
        form.reset();
        setTimeout(() => this.closeModal(), 1500);
      } catch (err) {
        console.error("savePassword:", err);
        this.showPasswordStatus(err.message || "Lỗi đổi mật khẩu", "error");
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = originalText;
        }
      }
    },

    showPasswordStatus(message, type = "info") {
      const el = document.getElementById("passwordStatusMessage");
      if (!el) return;
      const palette = {
        success: ["bg-green-50", "border-green-200", "text-green-700"],
        error: ["bg-red-50", "border-red-200", "text-red-700"],
        info: ["bg-blue-50", "border-blue-200", "text-blue-700"],
      };
      const [bg, border, text] = palette[type] || palette.info;
      el.className = `p-4 rounded-lg text-sm ${bg} ${border} border ${text}`;
      el.textContent = message;
      el.classList.remove("hidden");
      if (type === "success") {
        setTimeout(() => el.classList.add("hidden"), 4000);
      }
    },

    closeModal() {
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
    },

    showStatus(message, type = "info") {
      const statusEl = document.getElementById("profileStatusMessage");
      if (!statusEl) return;

      let bgColor = "bg-red-50";
      let borderColor = "border-red-200";
      let textColor = "text-red-700";

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

    cleanup() {},
  };

  window.ProfileManager = ProfileManager;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(() => {
        ProfileManager.init();
      }, 500);
    });
  } else {
    setTimeout(() => {
      ProfileManager.init();
    }, 500);
  }

  window.addEventListener(
    "error",
    (event) => {
      if (event.message && event.message.includes("getRangeAt")) {
        event.preventDefault();
        return true;
      }
    },
    true
  );
})();
