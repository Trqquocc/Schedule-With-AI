/**
 * calendar-bulk-complete.js
 *
 * Adds 2 bulk-completion affordances to the main calendar page:
 *   - Multi-select mode (toggle button) + Ctrl/Shift-click shortcut:
 *       clicking events while in mode OR with modifier key adds/removes
 *       them from a selection set. A floating action bar confirms the
 *       bulk complete.
 *   - Daily-check button: confirms + marks every event today as done.
 *
 * Hooks into window.CalendarModule via a public event-click pre-handler
 * (`handleEventClick`) — returns true if the click was consumed so the
 * default detail modal is skipped.
 */
(function () {
  "use strict";
  if (window.CalendarBulkComplete) return;

  const state = {
    selectMode: false,          // toggled by "Chọn nhiều" button
    selected: new Set(),        // event IDs (MaLichTrinh)
    wiredToolbar: false,
  };

  function $(id) { return document.getElementById(id); }

  function setBtnActive(btn, active) {
    if (!btn) return;
    if (active) {
      btn.style.background = "#dc2626";
      btn.style.color = "#fff";
      btn.style.borderColor = "#dc2626";
    } else {
      btn.style.background = "#fff";
      btn.style.color = "#374151";
      btn.style.borderColor = "#e2e8f0";
    }
  }

  function applyElSelectedStyle(el, selected) {
    if (!el) return;
    if (selected) {
      el.classList.add("cal-evt-selected");
      el.style.outline = "3px solid #dc2626";
      el.style.outlineOffset = "1px";
      el.style.boxShadow = "0 0 0 4px rgba(220,38,38,0.2)";
    } else {
      el.classList.remove("cal-evt-selected");
      el.style.outline = "";
      el.style.outlineOffset = "";
      el.style.boxShadow = "";
    }
  }

  function refreshEventStyles() {
    document.querySelectorAll(".fc-event[data-event-id]").forEach((el) => {
      const id = el.getAttribute("data-event-id");
      applyElSelectedStyle(el, state.selected.has(id));
    });
  }

  function updateBar() {
    const bar = $("cal-bulk-bar");
    const count = $("cal-bulk-count");
    if (!bar || !count) return;
    const n = state.selected.size;
    count.textContent = String(n);
    if (n > 0) {
      bar.classList.remove("hidden");
    } else {
      bar.classList.add("hidden");
    }
  }

  function toggleSelection(eventId, el) {
    if (!eventId) return;
    if (state.selected.has(eventId)) {
      state.selected.delete(eventId);
      applyElSelectedStyle(el, false);
    } else {
      state.selected.add(eventId);
      applyElSelectedStyle(el, true);
    }
    updateBar();
  }

  function clearSelection() {
    state.selected.clear();
    refreshEventStyles();
    updateBar();
  }

  function setSelectMode(on) {
    state.selectMode = !!on;
    const btn = $("cal-multi-toggle");
    setBtnActive(btn, state.selectMode);
    if (btn) {
      btn.title = state.selectMode
        ? "Click công việc để chọn / bỏ chọn · Click lại nút để thoát"
        : "Bật chế độ chọn nhiều";
    }
    if (!state.selectMode) {
      clearSelection();
    }
  }

  // Public: pre-handler called from CalendarModule.eventClick.
  // Returns true if click consumed (skip default modal).
  function handleEventClick(info) {
    const modifier = info?.jsEvent?.ctrlKey || info?.jsEvent?.metaKey || info?.jsEvent?.shiftKey;
    if (!state.selectMode && !modifier) return false;

    const id = info?.event?.id;
    if (!id) return false;
    // Turning on multi mode implicitly when user modifier-clicks for the first time.
    if (modifier && !state.selectMode) {
      setSelectMode(true);
    }
    toggleSelection(id, info.el);
    return true;
  }

  async function bulkComplete() {
    if (state.selected.size === 0) return;
    const ids = Array.from(state.selected);
    try {
      const result = await Utils.makeRequest(
        "/api/schedule/complete-batch",
        "POST",
        { ids }
      );
      if (!result.success) throw new Error(result.message || "Lỗi server");
      const updated = result.data?.updated ?? result.updated ?? ids.length;
      Utils.showToast?.(`Đã đánh dấu ${updated} việc là hoàn thành`, "success");
      clearSelection();
      setSelectMode(false);
      if (window.CalendarModule?.loadEvents) {
        window.CalendarModule.loadEvents();
      }
    } catch (err) {
      console.error("bulkComplete error:", err);
      Utils.showToast?.(err.message || "Lỗi khi hoàn thành", "error");
    }
  }

  async function dailyCheck() {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    let confirmed = false;
    if (window.Swal) {
      const r = await Swal.fire({
        title: "Xác nhận",
        html: `Đánh dấu <strong>tất cả công việc hôm nay</strong> (${dateStr}) là hoàn thành?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Đánh dấu",
        cancelButtonText: "Huỷ",
        confirmButtonColor: "#10b981",
      });
      confirmed = !!r.isConfirmed;
    } else {
      confirmed = window.confirm(`Đánh dấu tất cả công việc ngày ${dateStr} là hoàn thành?`);
    }
    if (!confirmed) return;

    try {
      const result = await Utils.makeRequest(
        "/api/schedule/complete-day",
        "POST",
        { date: dateStr }
      );
      if (!result.success) throw new Error(result.message || "Lỗi server");
      const updated = result.data?.updated ?? result.updated ?? 0;
      if (window.Swal) {
        Swal.fire({
          icon: "success",
          title: "Hoàn thành",
          text: updated > 0
            ? `Đã đánh dấu ${updated} việc hôm nay là hoàn thành.`
            : "Không có việc nào cần đánh dấu (đã hoàn thành trước đó hoặc không có lịch).",
          confirmButtonColor: "#10b981",
        });
      } else {
        Utils.showToast?.(`Đã đánh dấu ${updated} việc`, "success");
      }
      if (window.CalendarModule?.loadEvents) {
        window.CalendarModule.loadEvents();
      }
    } catch (err) {
      console.error("dailyCheck error:", err);
      Utils.showToast?.(err.message || "Lỗi khi daily check", "error");
    }
  }

  function showHelp() {
    const html = `
      <div style="text-align:left;font-size:14px;line-height:1.6">
        <p><strong>Chọn nhiều công việc:</strong></p>
        <ul style="padding-left:18px;list-style:disc">
          <li>Bấm <em>"Chọn nhiều"</em> → click từng việc trong lịch để chọn / bỏ chọn</li>
          <li>Hoặc giữ <kbd>Ctrl</kbd> (Windows) / <kbd>⌘</kbd> (Mac) rồi click để chọn nhanh</li>
          <li>Hoặc giữ <kbd>Shift</kbd> rồi click (cùng tác dụng Ctrl)</li>
          <li>Thanh hành động sẽ hiện bên dưới → bấm <em>"Hoàn thành"</em> để đánh dấu cả loạt</li>
        </ul>
        <p style="margin-top:10px"><strong>Hôm nay:</strong> đánh dấu 1 lần tất cả công việc trong ngày.</p>
      </div>
    `;
    if (window.Swal) {
      Swal.fire({ title: "Hướng dẫn", html, icon: "info", confirmButtonColor: "#4f46e5" });
    } else {
      window.alert("Chọn nhiều: bật nút hoặc giữ Ctrl/Shift rồi click việc cần chọn.");
    }
  }

  function wireToolbar() {
    if (state.wiredToolbar) return;
    const toggle = $("cal-multi-toggle");
    const help = $("cal-multi-help");
    const daily = $("cal-daily-check");
    const completeBtn = $("cal-bulk-complete-btn");
    const cancelBtn = $("cal-bulk-cancel-btn");

    // All five must be present; if the page hasn't rendered yet, bail — caller retries.
    if (!toggle || !help || !daily || !completeBtn || !cancelBtn) return;

    toggle.addEventListener("click", () => setSelectMode(!state.selectMode));
    help.addEventListener("click", showHelp);
    daily.addEventListener("click", dailyCheck);
    completeBtn.addEventListener("click", bulkComplete);
    cancelBtn.addEventListener("click", () => {
      clearSelection();
      setSelectMode(false);
    });

    state.wiredToolbar = true;
  }

  // Init with retry — calendar-content.html is dynamically injected.
  function init() {
    let tries = 0;
    const tick = () => {
      wireToolbar();
      if (!state.wiredToolbar && tries++ < 50) {
        setTimeout(tick, 100);
      }
    };
    tick();
  }

  // Expose + auto-init on DOM ready / section change.
  window.CalendarBulkComplete = {
    handleEventClick,
    init,
    getSelection: () => Array.from(state.selected),
    isSelectMode: () => state.selectMode,
    refreshStyles: refreshEventStyles,
  };

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("section-changed", (e) => {
    if (e?.detail?.section === "schedule") {
      state.wiredToolbar = false;
      init();
    }
  });
})();
