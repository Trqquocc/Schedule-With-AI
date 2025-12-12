/**
 * Salary Manager - Manages salary calculations and work shifts
 * WRAPPED VERSION: Prevents duplicate initialization
 */

(function () {
  "use strict";

  if (window.SalaryManager) {
    console.log("⏭️ SalaryManager already loaded");
    return;
  }

  window.SalaryManager = {
    initialized: false,
    eventListeners: [],

    async init() {
      if (this.initialized) {
        console.log("ℹ️ SalaryManager already initialized");
        return;
      }

      console.log("🚀 Initializing SalaryManager...");
      this.initialized = true;

      await this.loadSalaryData();
      this.bindEvents();

      console.log("✅ SalaryManager initialized successfully");
    },

    async loadSalaryData() {
      try {
        if (typeof Utils === "undefined") {
          console.warn("⚠️ Utils not available, using mock data");
          this.loadMockData();
          return;
        }

        const result = await Utils.makeRequest("/api/salary/data", "GET");

        if (!result.success) {
          throw new Error("Không tải được dữ liệu lương");
        }

        const data = result.data;

        // Cập nhật tên user
        const userNameElement = document.querySelector("[data-user-name]");
        if (userNameElement) {
          userNameElement.textContent = data.userInfo?.hoten || "Người dùng";
        }

        // Cập nhật lương giờ
        const luongGioEl = document.querySelector("#luong-gio");
        if (luongGioEl) {
          luongGioEl.textContent =
            new Intl.NumberFormat("vi-VN").format(data.luongTheoGio) + " đ/giờ";
        }

        // Load ca làm việc
        await this.loadWorkShifts();

        console.log("✅ Salary data loaded successfully");
      } catch (err) {
        console.error("❌ Error loading salary data:", err);
        if (typeof Utils !== "undefined" && Utils.showToast) {
          Utils.showToast("Lỗi tải lương: " + err.message, "error");
        }
        this.loadMockData();
      }
    },

    loadMockData() {
      // Load dữ liệu mẫu khi không có API
      const luongGioEl = document.querySelector("#luong-gio");
      if (luongGioEl) {
        luongGioEl.textContent = "29,000 đ/giờ";
      }
      this.loadWorkShifts();
    },

    async loadWorkShifts() {
      // Dữ liệu mẫu ca làm việc
      const sampleShifts = [
        {
          date: "26/05/2025",
          start: "08:00",
          end: "20:00",
          hours: "11 giờ",
          wage: "319,000",
          note: "Ca làm thêm",
        },
        {
          date: "25/05/2025",
          start: "08:00",
          end: "17:00",
          hours: "8 giờ",
          wage: "232,000",
          note: "Ca hành chính",
        },
      ];

      const container = document.getElementById("work-shifts-container");
      if (!container) {
        console.warn("⚠️ Work shifts container not found");
        return;
      }

      container.innerHTML = sampleShifts
        .map(
          (shift) => `
        <div class="grid grid-cols-[100px_100px_100px_120px_120px_1fr_100px] gap-4 text-xs py-2 border-b hover:bg-gray-50">
          <div class="text-center">${shift.date}</div>
          <div class="text-center">${shift.start}</div>
          <div class="text-center">${shift.end}</div>
          <div class="text-center">${shift.hours}</div>
          <div class="text-center font-medium">${shift.wage}</div>
          <div class="text-center text-gray-600">${shift.note}</div>
          <div class="text-center">
            <button onclick="SalaryManager.deleteShift('${shift.date}')" 
                    class="text-red-600 hover:text-red-800 text-xs">
              Xóa
            </button>
          </div>
        </div>
      `
        )
        .join("");

      console.log("✅ Work shifts rendered");
    },

    deleteShift(date) {
      if (confirm(`Bạn có chắc muốn xóa ca làm ngày ${date}?`)) {
        if (typeof Utils !== "undefined" && Utils.showToast) {
          Utils.showToast("Đã xóa ca làm việc", "success");
        }
        this.loadWorkShifts();
      }
    },

    bindEvents() {
      // Có thể thêm event cho các button tính lương tự động
      const calculateButton = document.getElementById("calculate-salary-btn");
      if (calculateButton) {
        const handler = () => this.calculateTotalSalary();
        calculateButton.addEventListener("click", handler);
        this.eventListeners.push({
          element: calculateButton,
          event: "click",
          handler,
        });
      }

      console.log("✅ SalaryManager events bound");
    },

    calculateTotalSalary() {
      // Logic tính tổng lương
      if (typeof Utils !== "undefined" && Utils.showToast) {
        Utils.showToast("Tính năng đang được phát triển", "info");
      }
    },

    cleanup() {
      console.log("🧹 Cleaning up SalaryManager...");

      this.eventListeners.forEach(({ element, event, handler }) => {
        if (element && element.removeEventListener) {
          element.removeEventListener(event, handler);
        }
      });

      this.eventListeners = [];
      this.initialized = false;

      console.log("✅ SalaryManager cleaned up");
    },
  };

  console.log("✅ SalaryManager loaded");
})();
