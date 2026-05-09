// stats-advanced-charts.js — Advanced chart renders: streak, comparison bar, heatmap.
// Exports window.StatsAdvancedCharts. Requires Chart.js 4.x and optionally CalendarHeatmap.
(function () {
  "use strict";

  let comparisonChart = null;
  let currentMode = "weekly";  // 'weekly' | 'monthly'
  let cachedDaily = [];

  // ─── Theme helpers ──────────────────────────────────────────────────────────

  function isDark() { return document.body.classList.contains("dark"); }
  function accent() { return getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#2563eb"; }
  function themeColors() {
    return {
      grid: isDark() ? "rgba(51,65,85,0.6)" : "rgba(226,232,240,0.6)",
      tick: isDark() ? "#64748b" : "#94a3b8",
      legend: isDark() ? "#cbd5e1" : "#475569",
    };
  }

  // ─── Streak ─────────────────────────────────────────────────────────────────

  function renderStreak(count) {
    const el = document.getElementById("streak-count");
    if (el) el.textContent = count;
  }

  // ─── Comparison chart ───────────────────────────────────────────────────────

  /**
   * Group daily records by ISO week (Monday key) or calendar month.
   * @returns {Array<{label, total, completed}>}
   */
  function groupPeriods(dailyData, mode) {
    const map = {};
    dailyData.forEach((d) => {
      let key, label;
      if (mode === "monthly") {
        key = d.date.slice(0, 7);
        const [y, m] = key.split("-");
        label = `T${parseInt(m)}/${y}`;
      } else {
        const date = new Date(d.date);
        const ws = new Date(date);
        ws.setDate(date.getDate() - date.getDay() + 1); // Monday
        key = ws.toISOString().split("T")[0];
        label = key.slice(5); // MM-DD
      }
      if (!map[key]) map[key] = { label, total: 0, completed: 0 };
      map[key].total += d.total;
      map[key].completed += d.completed;
    });
    return Object.values(map);
  }

  function renderComparison(dailyData, mode) {
    cachedDaily = dailyData || [];
    currentMode = mode || "weekly";

    const canvas = document.getElementById("comparison-chart");
    if (!canvas) return;
    if (comparisonChart) { comparisonChart.destroy(); comparisonChart = null; }

    const periods = groupPeriods(cachedDaily, currentMode);
    const c = themeColors();

    comparisonChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: periods.map((p) => p.label),
        datasets: [
          { label: "Kế hoạch", data: periods.map((p) => p.total), backgroundColor: "#94a3b8", borderRadius: 5, maxBarThickness: 24 },
          { label: "Hoàn thành", data: periods.map((p) => p.completed), backgroundColor: accent(), borderRadius: 5, maxBarThickness: 24 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { position: "top", labels: { usePointStyle: true, pointStyle: "circle", padding: 12, font: { size: 11, weight: "600" }, color: c.legend, boxWidth: 8 } },
          tooltip: { backgroundColor: "rgba(15,23,42,0.92)", titleColor: "#f1f5f9", bodyColor: "#cbd5e1", padding: 10, cornerRadius: 8 },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: c.tick, font: { size: 10 } }, border: { display: false } },
          y: { beginAtZero: true, grid: { color: c.grid, drawTicks: false }, ticks: { stepSize: 1, color: c.tick, font: { size: 10 }, padding: 6 }, border: { display: false } },
        },
      },
    });

    // Sync toggle button active state
    document.querySelectorAll(".comparison-toggle").forEach((btn) => {
      const active = btn.dataset.mode === currentMode;
      btn.classList.toggle("active", active);
      btn.classList.toggle("bg-blue-100", active);
      btn.classList.toggle("text-blue-700", active);
      btn.classList.toggle("bg-gray-100", !active);
      btn.classList.toggle("text-gray-600", !active);
    });
  }

  // ─── Toggle binding (event delegation) ─────────────────────────────────────

  document.addEventListener("click", function (e) {
    const btn = e.target.closest(".comparison-toggle");
    if (btn && btn.dataset.mode && btn.dataset.mode !== currentMode) {
      renderComparison(cachedDaily, btn.dataset.mode);
    }
  });

  // ─── Cleanup ────────────────────────────────────────────────────────────────

  function destroy() {
    if (comparisonChart) { comparisonChart.destroy(); comparisonChart = null; }
  }

  window.StatsAdvancedCharts = { renderStreak, renderComparison, destroy };
})();
