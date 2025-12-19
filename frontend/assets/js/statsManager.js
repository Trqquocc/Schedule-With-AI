(function () {
  "use strict";

  const API = {
    stats: "/api/statistics",
  };

  let barChart = null;
  let donutChart = null;

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

  function renderStatsView(data) {
    const total = data.total || 0;
    const completed = data.completed || 0;
    const pending = data.pending || 0;
    const percent = data.percent || 0;

    console.log(`📊 Stats - Total: ${total}, Completed: ${completed}, Pending: ${pending}, Percent: ${percent}%`);

    // Cập nhật số liệu tổng quan
    const statsTotal = document.getElementById("stats-total");
    const statsCompleted = document.getElementById("stats-completed");
    const statsPending = document.getElementById("stats-pending");

    if (statsTotal) statsTotal.textContent = total;
    if (statsCompleted) statsCompleted.textContent = completed;
    if (statsPending) statsPending.textContent = pending;

    // Cập nhật sidebar stats
    updateSidebarStats({ total, completed, pending, percent });

    // Render biểu đồ
    renderCharts(data);
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
    const completed = data.completed || 0;
    const pending = data.pending || 0;
    const dailyData = data.daily || [];

    // Biểu đồ cột - Công việc theo ngày
    renderBarChart(dailyData);

    // Biểu đồ tròn - Tỷ lệ hoàn thành
    renderDonutChart(completed, pending);
  }

  function renderBarChart(dailyData) {
    const barCtx = document.getElementById("bar-chart");
    if (!barCtx) return;

    if (barChart) {
      barChart.destroy();
    }

    // Chuyển đổi dữ liệu daily
    const labels = dailyData.map((item) =>
      new Date(item.date).toLocaleDateString("vi-VN", {
        month: "short",
        day: "numeric",
      })
    );
    const completedData = dailyData.map((item) => item.completed || 0);
    const pendingData = dailyData.map((item) => (item.total || 0) - (item.completed || 0));

    barChart = new Chart(barCtx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Hoàn thành",
            data: completedData,
            backgroundColor: "#1971c2",
            borderRadius: 6,
          },
          {
            label: "Chưa hoàn thành",
            data: pendingData,
            backgroundColor: "#e9ecef",
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
          y: { 
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          },
        },
      },
    });
  }

  function renderDonutChart(completed, pending) {
    const donutCtx = document.getElementById("donut-chart");
    if (!donutCtx) return;

    if (donutChart) {
      donutChart.destroy();
    }

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
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        },
      },
    });
  }

  function setupDateFilter() {
    const applyStatsBtn = document.getElementById("apply-stats-btn");
    if (applyStatsBtn) {
      applyStatsBtn.addEventListener("click", handleLoadStats);
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
        renderStatsView(result.data);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
      alert("Lỗi khi tải dữ liệu thống kê: " + error.message);
    }
  }

  function initializeDateInputs() {
    const today = new Date();
    const lastMonth = new Date(today.getTime() - 30 * 24 * 3600 * 1000);
    const formatDate = (d) => d.toISOString().split("T")[0];

    const statsFrom = document.getElementById("stats-from");
    const statsTo = document.getElementById("stats-to");

    if (statsFrom) statsFrom.value = formatDate(lastMonth);
    if (statsTo) statsTo.value = formatDate(today);
  }

  async function init() {
    console.log("📊 Initializing StatsManager...");

    initializeDateInputs();
    setupDateFilter();

    // Tự động load dữ liệu khi tab stats được active
    const statsView = document.getElementById("stats-view");
    if (statsView && !statsView.classList.contains("hidden")) {
      await handleLoadStats();
    }

    console.log("✅ StatsManager initialized successfully");
  }

  // Export public methods
  window.StatsManager = {
    init,
    loadStatsData,
    renderStatsView,
    handleLoadStats,
  };

  console.log("📊 StatsManager module loaded");
})();