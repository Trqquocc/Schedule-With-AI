// salaryManager.js
// Quản lý hiển thị trang Tính lương và Thống kê
(function () {
  const api = {
  salary: "/api/salary",
    stats: "/api/statistics",
  };

  function formatCurrency(v) {
    return new Intl.NumberFormat("vi-VN").format(v) + " VND";
  }

  function buildSalaryTable(entries) {
    if (!entries || entries.length === 0) {
      return `<div class="p-6">Không có dữ liệu</div>`;
    }

    let rows = entries
      .map((e) => {
        const date = e.date ? new Date(e.date).toLocaleDateString() : "";
        return `
        <tr class="border-t">
          <td class="px-4 py-3">${escapeHtml(e.title)}</td>
          <td class="px-4 py-3">${date}</td>
          <td class="px-4 py-3">${formatCurrency(e.rate)}</td>
          <td class="px-4 py-3">${e.hours} giờ</td>
          <td class="px-4 py-3">${escapeHtml(e.note)}</td>
        </tr>`;
      })
      .join("");

    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <table class="w-full text-left table-auto">
          <thead>
            <tr class="bg-gray-50">
              <th class="px-4 py-3">Tên công việc</th>
              <th class="px-4 py-3">Ngày hoàn thành</th>
              <th class="px-4 py-3">Mức lương (VND)</th>
              <th class="px-4 py-3">Số giờ làm</th>
              <th class="px-4 py-3">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>`;
  }

  function escapeHtml(s) {
    if (!s) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function loadSalary(from, to) {
    const token = localStorage.getItem("auth_token");
    const q = [];
    if (from) q.push(`from=${encodeURIComponent(from)}`);
    if (to) q.push(`to=${encodeURIComponent(to)}`);
    const url = api.salary + (q.length ? "?" + q.join("&") : "");

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error("Không thể tải dữ liệu lương");
    return res.json();
  }

  async function loadStats(from, to) {
    const token = localStorage.getItem("auth_token");
    const q = [];
    if (from) q.push(`from=${encodeURIComponent(from)}`);
    if (to) q.push(`to=${encodeURIComponent(to)}`);
    const url = api.stats + (q.length ? "?" + q.join("&") : "");

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error("Không thể tải dữ liệu thống kê");
    return res.json();
  }

  function renderSalary(container, data) {
    const entries = data.entries || [];
    // Only keep entries that are marked completed. If the entry includes a
    // completion flag (`completed` or `DaHoanThanh`) we respect it. If no
    // completion flag exists, assume the backend already filtered and keep it.
    const filtered = entries.filter((e) => {
      if (typeof e.completed !== "undefined") return !!e.completed;
      if (typeof e.DaHoanThanh !== "undefined") return Number(e.DaHoanThanh) === 1;
      return true;
    });

    // Recompute total on the client from filtered entries so UI always matches
    // what is displayed (don't rely solely on data.totalAmount coming from API).
    const totalAmount = filtered.reduce((s, it) => s + (Number(it.amount) || 0), 0);

    // If page provides dedicated areas, render into them; otherwise replace container
    const tableArea = document.getElementById("salary-table-area");
    const totalBox = document.getElementById("salary-total");

    // build date range display from inputs (or show empty)
    const fromInput = document.getElementById("salary-from");
    const toInput = document.getElementById("salary-to");
    const formatDate = (s) => {
      if (!s) return "";
      const d = new Date(s);
      if (isNaN(d)) return s;
      return d.toLocaleDateString();
    };
    const fromLabel = fromInput ? formatDate(fromInput.value) : "";
    const toLabel = toInput ? formatDate(toInput.value) : "";

    const tableHtml = `
      <div class="mb-2">
        <div>
          <h2 class="text-xl font-semibold">Tính lương</h2>
          <div class="page-dates">Chọn mốc thời gian: Từ ngày ${fromLabel || "..."} &nbsp; Đến ngày ${toLabel || "..."}</div>
        </div>
      </div>
      <div class="mt-3">${buildSalaryTable(filtered)}</div>
    `;

    const totalHtml = `
      <div class="label">Tổng lương:</div>
      <div class="amount">${formatCurrency(totalAmount)}</div>
    `;

    if (tableArea) tableArea.innerHTML = tableHtml;
    if (totalBox) totalBox.innerHTML = totalHtml;

    if (!tableArea && !totalBox) {
      container.innerHTML = tableHtml + `<div class="mt-6">${totalHtml}</div>`;
    }
  }

  function renderStats(container, stats) {
    const { total, completed, pending, percent, daily } = stats;

    // Chart.js dynamic load
    if (!window.Chart) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/chart.js@4.3.0/dist/chart.umd.min.js";
      script.onload = () => draw(stats, container);
      document.head.appendChild(script);
    } else {
      draw(stats, container);
    }
  }

  function draw(stats, container) {
    const { total, completed, pending, percent, daily } = stats;
    const labels = daily.map((d) => new Date(d.date).toLocaleDateString());
    const totals = daily.map((d) => d.total);
    const completedArr = daily.map((d) => d.completed);

    container.innerHTML = `
      <div class="mb-6">
        <h2 class="text-xl font-semibold">Thống kê công việc</h2>
      </div>
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="bg-white p-4 rounded border">Tổng số công việc: <strong>${total}</strong></div>
        <div class="bg-white p-4 rounded border">Đã hoàn thành: <strong>${completed}</strong></div>
        <div class="bg-white p-4 rounded border">Phần trăm hoàn thành: <strong>${percent}%</strong></div>
      </div>
      <div class="bg-white p-4 rounded border">
        <canvas id="stats-bar" height="120"></canvas>
      </div>
      <div class="mt-4 bg-white p-4 rounded border">
        <canvas id="stats-donut" height="120"></canvas>
      </div>
    `;

    // Bar chart
    const ctx = document.getElementById("stats-bar").getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Tổng", data: totals, backgroundColor: "#60A5FA" },
          { label: "Hoàn thành", data: completedArr, backgroundColor: "#34D399" },
        ],
      },
      options: { responsive: true, plugins: { legend: { position: 'top' } } },
    });

    // Donut
    const ctx2 = document.getElementById("stats-donut").getContext("2d");
    new Chart(ctx2, {
      type: "doughnut",
      data: {
        labels: ["Hoàn thành", "Chưa hoàn thành"],
        datasets: [{ data: [completed, total - completed], backgroundColor: ["#60A5FA", "#C7D2FE"] }],
      },
      options: { responsive: true },
    });

    // Update side panel if present
    const sideTotal = document.getElementById("side-total");
    const sideCompleted = document.getElementById("side-completed");
    const sidePending = document.getElementById("side-pending");
    const sidePercent = document.getElementById("side-percent");
    if (sideTotal) sideTotal.textContent = total;
    if (sideCompleted) sideCompleted.textContent = completed;
    if (sidePending) sidePending.textContent = total - completed;
    if (sidePercent) sidePercent.textContent = percent + "%";
  }

  // Khởi tạo khi trang sẵn sàng
  function init() {
    // Tìm container của trang salary (được tải qua component loader)
    const salaryContainer = document.getElementById("salary-container");
    const salaryContent = document.getElementById("salary-content");
    const salaryStatsContent = document.getElementById("salary-stats-content");

    // Default: load last 30 days
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 3600 * 1000);
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);

    // Load salary
    loadSalary(fromStr, toStr)
      .then((r) => {
        if (r.success) renderSalary(salaryContainer, r.data);
        else if (salaryContainer) salaryContainer.innerHTML = `<div class=\"p-6\">Không có dữ liệu</div>`;
        else console.warn("salaryContainer not found to render no-data message");
      })
      .catch((err) => {
        if (salaryContainer) salaryContainer.innerHTML = `<div class=\"p-6 text-red-600\">${escapeHtml(err.message)}</div>`;
        else console.error("salaryContainer missing and can't display error:", err);
      });

    // Load stats
    loadStats(fromStr, toStr)
      .then((r) => {
        if (r.success) renderStats(salaryStatsContent, r.data);
        else if (salaryStatsContent) salaryStatsContent.innerHTML = `<div class=\"p-6\">Không có dữ liệu</div>`;
        else console.warn("salaryStatsContent not found to render no-data message");
      })
      .catch((err) => {
        if (salaryStatsContent) salaryStatsContent.innerHTML = `<div class=\"p-6 text-red-600\">${escapeHtml(err.message)}</div>`;
        else console.error("salaryStatsContent missing and can't display error:", err);
      });

    // Fill date inputs if present and wire apply buttons
    const salaryFromInput = document.getElementById("salary-from");
    const salaryToInput = document.getElementById("salary-to");
    const statsFromInput = document.getElementById("stats-from");
    const statsToInput = document.getElementById("stats-to");
    if (salaryFromInput) salaryFromInput.value = fromStr;
    if (salaryToInput) salaryToInput.value = toStr;
    if (statsFromInput) statsFromInput.value = fromStr;
    if (statsToInput) statsToInput.value = toStr;

    const applySalaryBtn = document.getElementById("calculate-salary-btn");
    if (applySalaryBtn) {
      applySalaryBtn.addEventListener("click", async () => {
        const f = salaryFromInput ? salaryFromInput.value : fromStr;
        const t = salaryToInput ? salaryToInput.value : toStr;
        try {
          const r = await loadSalary(f, t);
          if (r.success) renderSalary(salaryContainer, r.data);
        } catch (e) {
          console.error(e);
        }
      });
    }

    const applyStatsBtn = document.getElementById("apply-stats-btn");
    if (applyStatsBtn) {
      applyStatsBtn.addEventListener("click", async () => {
        const f = statsFromInput ? statsFromInput.value : fromStr;
        const t = statsToInput ? statsToInput.value : toStr;
        try {
          const r = await loadStats(f, t);
          if (r.success) renderStats(salaryStatsContent, r.data);
        } catch (e) {
          console.error(e);
        }
      });
    }

    // Tab switching (nếu có)
    const salaryTab = document.getElementById("salary-tab");
    const statsTab = document.getElementById("salary-stats-tab");
    if (salaryTab && statsTab) {
      const setActive = (activeBtn, inactiveBtn) => {
        if (activeBtn) activeBtn.classList.add("active");
        if (inactiveBtn) inactiveBtn.classList.remove("active");
      };

      const show = (which) => {
        const pageTitle = document.querySelector('.title');
        const sideCol = document.querySelector('.col-side');
        if (which === "salary") {
          if (salaryContainer) salaryContainer.classList.remove("hidden");
          if (salaryStatsContent) salaryStatsContent.classList.add("hidden");
          setActive(salaryTab, statsTab);
          if (pageTitle) pageTitle.textContent = "Tính lương";
          // hide right side panel in salary view
          if (sideCol) {
            sideCol.classList.add('hidden');
            sideCol.style.display = 'none';
          }
        } else {
          if (salaryContainer) salaryContainer.classList.add("hidden");
          if (salaryStatsContent) salaryStatsContent.classList.remove("hidden");
          setActive(statsTab, salaryTab);
          if (pageTitle) pageTitle.textContent = "Thống kê";
          // show right side panel in stats view
          if (sideCol) {
            sideCol.classList.remove('hidden');
            sideCol.style.display = '';
          }
        }
      };

      // Initialize visuals according to default
      show("salary");
      salaryTab.addEventListener("click", () => show("salary"));
      statsTab.addEventListener("click", () => show("stats"));
    }
  }

  // Expose init to global App if needed
  window.SalaryManager = { init };

  // Auto init with App lifecycle: try to init after DOM ready
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
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
