(function () {
  "use strict";

  window.StatsManager = {
    async init() {
      await this.loadStats();
    },

    async loadStats() {
      try {
        const tasksResult = await Utils.makeRequest("/api/tasks", "GET");
        const tasks = tasksResult.data || [];

        const eventsResult = await Utils.makeRequest(
          "/api/calendar/events",
          "GET"
        );
        const events = eventsResult.data || [];

        const stats = {
          totalTasks: tasks.length,
          completedTasks: tasks.filter((t) => t.TrangThaiThucHien === 2).length,
          pendingTasks: tasks.filter((t) => t.TrangThaiThucHien === 0).length,
          inProgressTasks: tasks.filter((t) => t.TrangThaiThucHien === 1)
            .length,
          totalEvents: events.length,
          completedEvents: events.filter((e) => e.DaHoanThanh).length,
          fixedTimeTasks: tasks.filter((t) => t.CoThoiGianCoDinh).length,
          hourlyRate:
            tasks.reduce((sum, t) => sum + (t.LuongTheoGio || 0), 0) /
            (tasks.length || 1),
        };

        this.updateStatsUI(stats);

        localStorage.setItem("user_stats", JSON.stringify(stats));

        return stats;
      } catch (error) {
        console.error("Lỗi tải thống kê:", error);
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
      };

      Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) {
          el.textContent = value;
        }
      });
    },
  };

  window.updateStats = function () {
    StatsManager.loadStats();
  };

  console.log("✅ StatsManager loaded");
})();
