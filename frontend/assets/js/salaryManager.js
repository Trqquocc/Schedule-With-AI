// frontend/assets/js/salaryManager.js
// Quản lý hiển thị trang Tính lương và Thống kê

(function () {
  "use strict";

  // API endpoints
  const API = {
    salary: "/api/salary",
    stats: "/api/statistics",
  };

  // Chart instances
  let barChart = null;
  let donutChart = null;

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  function formatCurrency(amount) {
    return new Intl.NumberFormat("vi-VN").format(amount) + " VND";
  }

  function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    return date.toLocaleDateString("vi-VN");
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getAuthToken() {
    return localStorage.getItem("auth_token");
  }

  // ============================================================================
  // API CALLS
  // ============================================================================

  async function loadSalaryData(from, to) {
    try {
      const token = getAuthToken();
      const params = new URLSearchParams();
      if (from) params.append("from", from);
      if (to) params.append("to", to);

      const url = `${API.salary}?${params.toString()}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Không thể tải dữ liệu lương");
      return await response.json();
    } catch (error) {
      console.error("Error loading salary:", error);
      throw error;
    }
  }

  async function loadStatsData(from, to) {
    try {
      const token = getAuthToken();
      const params = new URLSearchParams();
      if (from) params.append("from", from);
      if (to) params.append("to", to);

      const url = `${API.stats}?${params.toString()}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Không thể tải dữ liệu thống kê");
      return await response.json();
    } catch (error) {
      console.error("Error loading stats:", error);
      throw error;
    }
  }

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  function renderSalaryTable(entries) {
    if (!entries || entries.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div>Không có dữ liệu công việc đã hoàn thành</div>
        </div>
      `;
    }

    let tableHTML = `
      <table>
        <thead>
          <tr>
            <th>Công việc</th>
            <th>Ngày hoàn thành</th>
            <th>Đơn giá</th>
            <th>Số giờ</th>
            <th>Ghi chú</th>
            <th>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
    `;

    entries.forEach((entry) => {
      tableHTML += `
        <tr>
          <td>${escapeHtml(entry.title)}</td>
          <td>${formatDate(entry.date)}</td>
          <td>${formatCurrency(entry.rate)}</td>
          <td>${entry.hours} giờ</td>
          <td>${escapeHtml(entry.note) || "-"}</td>
          <td><strong>${formatCurrency(entry.amount)}</strong></td>
        </tr>
      `;
    });

    tableHTML += `</tbody></table>`;
    return tableHTML;
  }

  function renderSalaryView(data) {
    const entries = data.entries || [];

    // Lọc ra các công việc đã được đánh dấu hoàn thành
    const completedEntries = entries.filter((e) => {
      // Kiểm tra các trường có thể có để xác định trạng thái hoàn thành
      if (typeof e.completed !== "undefined") {
        return e.completed === true || e.completed === 1;
      }
      if (typeof e.DaHoanThanh !== "undefined") {
        return Number(e.DaHoanThanh) === 1;
      }
      // Mặc định không tính nếu không có trường trạng thái rõ ràng
      return false;
    });

    // Calculate total amount
    const totalAmount = completedEntries.reduce((sum, entry) => {
      return sum + (Number(entry.amount) || 0);
    }, 0);

    // Render table
    const tableContainer = document.getElementById("salary-table");
    if (tableContainer) {
      tableContainer.innerHTML = renderSalaryTable(completedEntries);
    }

    // Render total amount
    const totalAmountEl = document.getElementById("total-amount");
    if (totalAmountEl) {
      totalAmountEl.textContent = formatCurrency(totalAmount);
    }

    // Update quick stats
    updateQuickStats({
      total: completedEntries.length,
      completed: completedEntries.length,
      percent: 100,
    });
  }

  function renderStatsView(data) {
    // Lọc các công việc đã hoàn thành từ dữ liệu gốc
    const allEntries = data.allEntries || [];
    const completedEntries = allEntries.filter(
      (e) => Number(e.DaHoanThanh) === 1 || e.completed === true
    );

    const total = completedEntries.length;
    const completed = completedEntries.length;
    const pending = 0; // Vì chúng ta chỉ hiển thị công việc đã hoàn thành
    const percent = total > 0 ? 100 : 0;

    // Update summary stats
    const statsTotal = document.getElementById("stats-total");
    const statsCompleted = document.getElementById("stats-completed");
    const statsPending = document.getElementById("stats-pending");

    if (statsTotal) statsTotal.textContent = total; // Tổng số công việc hoàn thành
    if (statsCompleted) statsCompleted.textContent = completed; // Số công việc hoàn thành
    if (statsPending) statsPending.textContent = pending; // Số công việc chưa hoàn thành sẽ là 0

    // Update sidebar stats
    updateSidebarStats({ total, completed, pending, percent });

    // Render charts
    renderCharts(data);
  }

  function updateQuickStats(stats) {
    const quickTotal = document.getElementById("quick-total");
    const quickCompleted = document.getElementById("quick-completed");
    const quickPercent = document.getElementById("quick-percent");

    if (quickTotal) quickTotal.textContent = stats.total || 0;
    if (quickCompleted) quickCompleted.textContent = stats.completed || 0;
    if (quickPercent) quickPercent.textContent = (stats.percent || 0) + "%";
  }

  function updateSidebarStats(stats) {
    const sideTotal = document.getElementById("side-total");
    const sideCompleted = document.getElementById("side-completed");
    const sidePercent = document.getElementById("side-percent");

    if (sideTotal) sideTotal.textContent = stats.total || 0;
    if (sideCompleted) sideCompleted.textContent = stats.completed || 0;
    if (sidePercent) sidePercent.textContent = (stats.percent || 0) + "%";
  }

  function renderCharts(data) {
    // Lọc các công việc đã hoàn thành từ dữ liệu gốc
    const allEntries = data.allEntries || [];
    const completedEntries = allEntries.filter(
      (e) => Number(e.DaHoanThanh) === 1 || e.completed === true
    );

    const completed = completedEntries.length;
    const pending = 0; // Chỉ tính công việc hoàn thành

    // Prepare data for charts
    const dailyCompleted = groupCompletedByDate(completedEntries);
    const labels = Object.keys(dailyCompleted).map((date) =>
      new Date(date).toLocaleDateString("vi-VN", {
        month: "short",
        day: "numeric",
      })
    );
    const completedArr = Object.values(dailyCompleted);

    // Bar Chart
    const barCtx = document.getElementById("bar-chart");
    if (barCtx) {
      if (barChart) barChart.destroy();
      const uncompletedArr = labels.map(() => 0); // Mảng công việc chưa hoàn thành (luôn là 0)

      barChart = new Chart(barCtx, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Hoàn thành",
              data: completedArr,
              backgroundColor: "#1971c2",
              borderRadius: 6,
            },
            {
              label: "Chưa hoàn thành",
              data: uncompletedArr,
              backgroundColor: "#e9ecef", // Màu xám nhạt
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { position: "bottom" },
          },
          scales: {
            y: { beginAtZero: true },
          },
        },
      });
    }

    // Donut Chart
    const donutCtx = document.getElementById("donut-chart");
    if (donutCtx) {
      if (donutChart) donutChart.destroy();

      donutChart = new Chart(donutCtx, {
        type: "doughnut",
        data: {
          labels: ["Hoàn thành", "Chưa hoàn thành"],
          datasets: [
            {
              data: [completed, pending],
              backgroundColor: ["#1971c2", "#e7f5ff"],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { position: "bottom" },
          },
        },
      });
    }
  }

  // Hàm helper mới để nhóm các công việc đã hoàn thành theo ngày
  function groupCompletedByDate(completedEntries) {
    const dailyData = {};
    completedEntries.forEach((entry) => {
      const date = new Date(entry.date).toISOString().split("T")[0];
      if (dailyData[date]) {
        dailyData[date]++;
      } else {
        dailyData[date] = 1;
      }
    });
    // Sắp xếp theo ngày
    return Object.fromEntries(
      Object.entries(dailyData).sort(([a], [b]) => new Date(a) - new Date(b))
    );
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  function setupTabSwitching() {
    const tabs = document.querySelectorAll(".salary-page .tab");
    const salaryView = document.getElementById("salary-view");
    const statsView = document.getElementById("stats-view");
    const pageTitle = document.querySelector(".salary-page .header h1");

    tabs.forEach((tab) => {
      tab.addEventListener("click", function () {
        // Remove active class from all tabs
        tabs.forEach((t) => t.classList.remove("active"));
        
        // Add active class to clicked tab
        this.classList.add("active");

        // Switch views
        const tabType = this.getAttribute("data-tab");
        if (tabType === "salary") {
          salaryView.classList.remove("hidden");
          statsView.classList.add("hidden");
          if (pageTitle) {
            pageTitle.textContent = "Tính lương";
          }
        } else {
          salaryView.classList.add("hidden");
          statsView.classList.remove("hidden");
          if (pageTitle) {
            pageTitle.textContent = "Thống kê";
          }
          // Reload stats when switching to stats view
          handleLoadStats();
        }
      });
    });
  }

  function setupDateFilters() {
    // Salary filter
    const applySalaryBtn = document.getElementById("apply-salary-btn");
    if (applySalaryBtn) {
      applySalaryBtn.addEventListener("click", handleLoadSalary);
    }

    // Stats filter
    const applyStatsBtn = document.getElementById("apply-stats-btn");
    if (applyStatsBtn) {
      applyStatsBtn.addEventListener("click", handleLoadStats);
    }
  }

  async function handleLoadSalary() {
    const fromInput = document.getElementById("salary-from");
    const toInput = document.getElementById("salary-to");

    const from = fromInput ? fromInput.value : "";
    const to = toInput ? toInput.value : "";

    try {
      const result = await loadSalaryData(from, to);
      if (result.success) {
        renderSalaryView(result.data);
      }
    } catch (error) {
      console.error("Error loading salary:", error);
      const tableContainer = document.getElementById("salary-table");
      if (tableContainer) {
        tableContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <div>Lỗi: ${escapeHtml(error.message)}</div>
          </div>
        `;
      }
    }
  }

  async function handleLoadStats() {
    const fromInput = document.getElementById("stats-from");
    const toInput = document.getElementById("stats-to");

    const from = fromInput ? fromInput.value : "";
    const to = toInput ? toInput.value : "";

    try {
      const result = await loadStatsData(from, to);
      if (result.success) {
        // Truyền toàn bộ dữ liệu (bao gồm cả công việc chưa hoàn thành) để hàm render tự lọc
        renderStatsView({
          allEntries: result.data.entries || [],
          ...result.data,
        });
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  function initializeDateInputs() {
    const today = new Date();
    const lastMonth = new Date(today.getTime() - 30 * 24 * 3600 * 1000);
    const formatDate = (d) => d.toISOString().split("T")[0];

    const salaryFrom = document.getElementById("salary-from");
    const salaryTo = document.getElementById("salary-to");
    const statsFrom = document.getElementById("stats-from");
    const statsTo = document.getElementById("stats-to");

    if (salaryFrom) salaryFrom.value = formatDate(lastMonth);
    if (salaryTo) salaryTo.value = formatDate(today);
    if (statsFrom) statsFrom.value = formatDate(lastMonth);
    if (statsTo) statsTo.value = formatDate(today);
  }

  async function init() {
    console.log("🚀 Initializing SalaryManager...");

    // Initialize date inputs
    initializeDateInputs();

    // Setup event handlers
    setupTabSwitching();
    setupDateFilters();

    // Load initial data
    await handleLoadSalary();

    console.log("✅ SalaryManager initialized successfully");
  }

  // ============================================================================
  // EXPOSE TO GLOBAL
  // ============================================================================

  window.SalaryManager = {
    init,
    loadSalaryData,
    loadStatsData,
    renderSalaryView,
    renderStatsView,
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();