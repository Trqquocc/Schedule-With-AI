if (typeof window.Utils === "undefined") {
  window.Utils = {
    API_BASE: "http://localhost:3000",

    setToken(token) {
      if (token) {
        localStorage.setItem("auth_token", token);
      }
    },

    getToken() {
      return localStorage.getItem("auth_token");
    },

    clearAuth() {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_data");
    },

    isLoggedIn() {
      return !!this.getToken();
    },

    async makeRequest(
      endpoint,
      method = "GET",
      data = null,
      customHeaders = {}
    ) {
      const url = endpoint.startsWith("http")
        ? endpoint
        : this.API_BASE + endpoint;

      const token = this.getToken();

      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...customHeaders,
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const options = {
        method: method.toUpperCase(),
        headers,
        credentials: "include",
      };

      if (data && !["GET", "HEAD"].includes(method.toUpperCase())) {
        options.body = JSON.stringify(data);
      }

      if (
        (method.toUpperCase() === "GET" || method.toUpperCase() === "DELETE") &&
        data
      ) {
        const params = new URLSearchParams(data).toString();
        if (params) {
          const separator = url.includes("?") ? "&" : "?";
          options.url = url + separator + params;
        }
      }

      try {
        console.log(
          `📤 ${method} ${url}`,
          data ? `Data: ${JSON.stringify(data).slice(0, 200)}` : ""
        );

        const response = await fetch(url, options);

        if (response.status === 204) {
          return { success: true, message: "Thành công" };
        }

        let result = {};
        const text = await response.text();

        if (text && text.trim()) {
          try {
            result = JSON.parse(text);
          } catch (e) {
            console.warn("Không parse được JSON:", text);
            return {
              success: false,
              message: "Server trả về dữ liệu không hợp lệ",
              raw: text,
            };
          }
        }

        if (response.status === 401 || response.status === 403) {
          this.clearAuth();

          if (!window.location.pathname.includes("login.html")) {
            this.showToast(
              response.status === 401
                ? "Phiên đăng nhập đã hết hạn"
                : "Không có quyền truy cập",
              "warning"
            );
            setTimeout(() => {
              window.location.href = "/login.html";
            }, 1500);
          }

          return {
            success: false,
            message: result.message || "Unauthorized",
            status: response.status,
          };
        }

        if (!response.ok) {
          const errorMessage =
            result.message ||
            result.error ||
            `Lỗi ${response.status}: ${response.statusText}`;

          throw new Error(errorMessage);
        }

        if (!result.status) {
          result.status = response.status;
        }

        console.log(`📥 Response ${response.status}:`, result);
        return result;
      } catch (err) {
        console.error("❌ Request failed:", err.message, err);

        let userMessage = err.message;
        if (err.name === "TypeError" && err.message.includes("fetch")) {
          userMessage =
            "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.";
        }

        this.showToast(userMessage, "error");

        throw {
          success: false,
          message: userMessage,
          error: err,
        };
      }
    },

    async get(endpoint, params = null) {
      return this.makeRequest(endpoint, "GET", params);
    },

    async post(endpoint, data = null) {
      return this.makeRequest(endpoint, "POST", data);
    },

    async put(endpoint, data = null) {
      return this.makeRequest(endpoint, "PUT", data);
    },

    async delete(endpoint, data = null) {
      return this.makeRequest(endpoint, "DELETE", data);
    },

    async uploadFile(endpoint, formData) {
      const token = this.getToken();
      const url = endpoint.startsWith("http")
        ? endpoint
        : this.API_BASE + endpoint;

      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const options = {
        method: "POST",
        headers,
        body: formData,
        credentials: "include",
      };

      try {
        const response = await fetch(url, options);
        return await response.json();
      } catch (err) {
        console.error("Upload failed:", err);
        this.showToast("Lỗi upload file", "error");
        throw err;
      }
    },

    showToast: function (message, type = "info") {
      const toastContainer =
        document.getElementById("toast-container") ||
        (() => {
          const container = document.createElement("div");
          container.id = "toast-container";
          container.className = "fixed top-4 right-4 z-50 space-y-2";
          document.body.appendChild(container);
          return container;
        })();

      const toastId = "toast-" + Date.now();
      const icons = {
        success: "✅",
        error: "❌",
        warning: "⚠️",
        info: "ℹ️",
        loading: "🔄",
      };

      const colors = {
        success: "bg-green-50 border-green-200 text-green-800",
        error: "bg-red-50 border-red-200 text-red-800",
        warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
        info: "bg-blue-50 border-blue-200 text-blue-800",
        loading: "bg-gray-50 border-gray-200 text-gray-800",
      };

      const toast = document.createElement("div");
      toast.id = toastId;
      toast.className = `px-4 py-3 rounded-lg border shadow-lg flex items-center gap-3 ${colors[type]} animate-slide-in`;
      toast.innerHTML = `
    <span class="text-lg">${icons[type]}</span>
    <span class="font-medium">${message}</span>
  `;

      toastContainer.appendChild(toast);

      const duration = type === "success" ? 5000 : 3000;
      setTimeout(() => {
        toast.classList.add("animate-fade-out");
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      }, duration);

      return toastId;
    },


    confirm(message, title = "Xác nhận") {
      return new Promise((resolve) => {
        const modal = document.createElement("div");
        modal.className =
          "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4";
        modal.innerHTML = `
          <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div class="p-6">
              ${
                title
                  ? `<h3 class="text-lg font-semibold mb-2">${title}</h3>`
                  : ""
              }
              <p class="text-gray-700 mb-6">${message}</p>
              <div class="flex justify-end gap-3">
                <button class="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition" id="confirm-cancel">
                  Hủy
                </button>
                <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition" id="confirm-ok">
                  OK
                </button>
              </div>
            </div>
          </div>
        `;

        document.body.appendChild(modal);

        const handleConfirm = (result) => {
          modal.remove();
          resolve(result);
        };

        modal.querySelector("#confirm-ok").onclick = () => handleConfirm(true);
        modal.querySelector("#confirm-cancel").onclick = () =>
          handleConfirm(false);

        modal.onclick = (e) => {
          if (e.target === modal) handleConfirm(false);
        };
      });
    },

    formatDate(date, format = "medium") {
      if (!date) return "";

      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return "Invalid date";

      const formats = {
        short: d.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        medium: d.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        long: d.toLocaleDateString("vi-VN", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        datetime: d.toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        time: d.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      return formats[format] || formats.medium;
    },

    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    throttle(func, limit) {
      let inThrottle;
      return function (...args) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => (inThrottle = false), limit);
        }
      };
    },

    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        this.showToast("Đã sao chép vào clipboard", "success", 2000);
        return true;
      } catch (err) {
        console.error("Copy failed:", err);
        this.showToast("Không thể sao chép", "error");
        return false;
      }
    },

    downloadFile(url, filename) {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
  };

  console.log("🚀 Utils đã được khởi tạo với JWT support!");
}
