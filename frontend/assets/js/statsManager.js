(function () {
  "use strict";

  window.StatsManager = {
    async init() {
      await this.loadStats();
      this.setupEventListeners();
    },

    setupEventListeners() {

      const applyStatsBtn = document.getElementById("apply-stats-btn");
      if (applyStatsBtn) {
        applyStatsBtn.addEventListener("click", () => {
          const fromInput = document.getElementById("stats-from");
          const toInput = document.getElementById("stats-to");
          const from = fromInput ? fromInput.value : "";
          const to = toInput ? toInput.value : "";
          this.loadStatsWithDateRange(from, to);
        });
      }
    },

    async loadStatsWithDateRange(from, to) {
      try {

        const params = new URLSearchParams();
        if (from) params.append("from", from);
        if (to) params.append("to", to);

        const endpoint = `/api/statistics?${params.toString()}`;
        const statsResult = await Utils.makeRequest(endpoint, "GET");

        if (!statsResult.success || !statsResult.data) {
          console.warn("Không lấy được dữ liệu thống kê");
          return;
        }

        const statsData = statsResult.data;

        const tasksResult = await Utils.makeRequest("/api/tasks", "GET");
        const tasks = tasksResult.data || [];

        const stats = {
          totalTasks: statsData.total || 0,
          completedTasks: statsData.completed || 0,
          pendingTasks: statsData.pending || 0,
          completionRate: statsData.percent || 0,
          inProgressTasks: 0,
          fixedTimeTasks: tasks.filter((t) => t.CoThoiGianCoDinh).length,
          hourlyRate:
            tasks.reduce((sum, t) => sum + (t.LuongTheoGio || 0), 0) /
            (tasks.length || 1),
          dailyStats: statsData.daily || [],
        };

        this.updateStatsUI(stats);

        localStorage.setItem("user_stats", JSON.stringify(stats));

        return stats;
      } catch (error) {
        console.error("Lỗi tải thống kê với khoảng ngày:", error);
      }
    },

    async loadStats() {
      try {

        const statsResult = await Utils.makeRequest("/api/statistics", "GET");

        if (!statsResult.success || !statsResult.data) {
          console.warn("Không lấy được dữ liệu thống kê, sử dụng API cũ");
          return await this.loadStatsLegacy();
        }

        const statsData = statsResult.data;

        const tasksResult = await Utils.makeRequest("/api/tasks", "GET");
        const tasks = tasksResult.data || [];

        const stats = {
          totalTasks: tasks.length,
          completedTasks:
            statsData.completed ||
            tasks.filter((t) => t.TrangThaiThucHien === 2).length,
          pendingTasks:
            statsData.pending ||
            tasks.filter((t) => t.TrangThaiThucHien === 0).length,
          inProgressTasks: tasks.filter((t) => t.TrangThaiThucHien === 1)
            .length,
          completionRate: statsData.percent || 0,
          fixedTimeTasks: tasks.filter((t) => t.CoThoiGianCoDinh).length,
          hourlyRate:
            tasks.reduce((sum, t) => sum + (t.LuongTheoGio || 0), 0) /
            (tasks.length || 1),
          dailyStats: statsData.daily || [],
        };

        this.updateStatsUI(stats);

        localStorage.setItem("user_stats", JSON.stringify(stats));

        return stats;
      } catch (error) {
        console.error("Lỗi tải thống kê:", error);
        return await this.loadStatsLegacy();
      }
    },

    async loadStatsLegacy() {
      try {

        const tasksResult = await Utils.makeRequest("/api/tasks", "GET");
        const tasks = tasksResult.data || [];

        const stats = {
          totalTasks: tasks.length,
          completedTasks: tasks.filter((t) => t.TrangThaiThucHien === 2).length,
          pendingTasks: tasks.filter((t) => t.TrangThaiThucHien === 0).length,
          inProgressTasks: tasks.filter((t) => t.TrangThaiThucHien === 1)
            .length,
          fixedTimeTasks: tasks.filter((t) => t.CoThoiGianCoDinh).length,
          hourlyRate:
            tasks.reduce((sum, t) => sum + (t.LuongTheoGio || 0), 0) /
            (tasks.length || 1),
        };

        this.updateStatsUI(stats);

        localStorage.setItem("user_stats", JSON.stringify(stats));

        return stats;
      } catch (error) {
        console.error("Lỗi tải thống kê fallback:", error);
        return null;
      }
    },

    updateStatsUI(stats) {

      const elements = {
        "stats-total-tasks": stats.totalTasks,
        "stats-completed-tasks": stats.completedTasks,
        "stats-completion-rate":
          Math.round((stats.completedTasks / stats.totalTasks) * 100) || 0,
        "stats-pending-tasks": stats.pendingTasks,
        "stats-fixed-tasks": stats.fixedTimeTasks,
        "stats-total": stats.totalTasks,
        "stats-completed": stats.completedTasks,
        "stats-pending": stats.pendingTasks,
      };

      Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) {
          el.textContent = value;
        }
      });

      if (stats.dailyStats && stats.dailyStats.length > 0) {
        this.renderCharts(stats);
      }
    },

    renderCharts(stats) {

      if (typeof Chart === "undefined") {
        console.warn("Chart.js chưa được load");
        return;
      }

      const dailyData = stats.dailyStats || [];
      const labels = dailyData.map((d) =>
        new Date(d.date).toLocaleDateString("vi-VN")
      );
      const completedData = dailyData.map((d) => d.completed || 0);
      const totalData = dailyData.map((d) => d.total || 0);

      this.renderBarChart(labels, completedData, totalData);

      this.renderDonutChart(stats);
    },

    renderBarChart(labels, completedData, totalData) {
      const ctx = document.getElementById("bar-chart");
      if (!ctx) return;

      if (window.barChartInstance) {
        window.barChartInstance.destroy();
      }

      window.barChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Hoàn thành",
              data: completedData,
              backgroundColor: "#34D399",
              borderColor: "#10B981",
              borderWidth: 1,
            },
            {
              label: "Chưa hoàn thành",
              data: totalData.map((t, i) => t - (completedData[i] || 0)),
              backgroundColor: "#FBBF24",
              borderColor: "#F59E0B",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: "bottom",
            },
          },
          scales: {
            x: {
              stacked: true,
            },
            y: {
              stacked: true,
              beginAtZero: true,
            },
          },
        },
      });
    },

    renderDonutChart(stats) {
      const ctx = document.getElementById("donut-chart");
      if (!ctx) return;

      if (window.donutChartInstance) {
        window.donutChartInstance.destroy();
      }

      const completed = stats.completedTasks || 0;
      const pending = stats.pendingTasks || 0;

      window.donutChartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["Hoàn thành", "Chưa hoàn thành"],
          datasets: [
            {
              data: [completed, pending],
              backgroundColor: ["#34D399", "#FBBF24"],
              borderColor: ["#10B981", "#F59E0B"],
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: "bottom",
            },
          },
        },
      });
    },
  };

  window.updateStats = function () {
    StatsManager.loadStats();
  };

  console.log(" StatsManager loaded");
})();
