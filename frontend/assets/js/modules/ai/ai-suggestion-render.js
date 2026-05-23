// ai-suggestion-render.js — extends AIHandler with HTML rendering methods:
// renderTasksToModal, showAIPreview, resetToFormView, setupPreviewEventListeners,
// and static HTML helpers (getEmptyStateHTML, getSuccessHTML, etc.)
// Depends on: ai-suggestion-handler.js (must be loaded first)
(function () {
  "use strict";

  const AH = window.AIHandler;
  if (!AH) {
    console.error("ai-suggestion-render.js: AIHandler not found");
    return;
  }

  // ------------------------------------------------------------------
  // Task list rendering
  // ------------------------------------------------------------------

  AH.renderTasksToModal = function (tasks, taskList) {
    if (!taskList) return;

    this._lastTasks    = Array.isArray(tasks) ? tasks.slice() : [];
    this._lastTaskList = taskList;

    if (!tasks || tasks.length === 0) {
      taskList.innerHTML = this.getEmptyStateHTML();
      this.updateTaskStats(0);
      return;
    }

    let rendered = tasks;
    if (window.TaskSorter && this._sortState.criterion) {
      rendered = window.TaskSorter.sortTasks(tasks, this._sortState.criterion, this._sortState.direction, "ai");
    }

    let html = "";
    rendered.forEach((task) => {
      const priorityClass = `priority-${task.priority}`;
      const duration = task.estimatedMinutes || 60;
      const catHtml = task.category ? `<span class="task-category"><i class="fas fa-folder"></i>${this.escapeHtml(task.category)}</span>` : "";
      html += `
        <div class="task-item selectable" data-task-id="${task.id}" data-selected="false" style="cursor:pointer">
          <input type="checkbox" class="task-checkbox" value="${task.id}" data-task-id="${task.id}" style="display:none">
          <div class="selection-checkbox" style="flex-shrink:0;font-size:18px;margin-right:8px">
            <i class="fas fa-check-circle" style="color:#ccc"></i>
          </div>
          <div class="task-content" style="flex:1;min-width:0">
            <div class="task-title">${this.escapeHtml(task.title)}</div>
            <div class="task-details">
              <span class="task-priority ${priorityClass}">Ưu tiên ${task.priority}</span>
              <span class="task-duration"><i class="far fa-clock"></i>${duration} phút</span>
              ${catHtml}
            </div>
          </div>
          <div class="task-color" style="background-color:${task.color};width:4px;border-radius:2px;align-self:stretch;flex-shrink:0"></div>
        </div>`;
    });

    taskList.innerHTML = html;
    this.updateTaskStats(tasks.length);
    this.setupTaskItemClickEvents();
  };

  AH.setupTaskItemClickEvents = function () {
    const taskItems = document.querySelectorAll("#aiSuggestionModal .task-item.selectable");
    taskItems.forEach((item) => {
      const newItem = item.cloneNode(true);
      item.parentNode.replaceChild(newItem, item);
      newItem.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleTaskSelection(newItem);
      });
    });
  };

  // ------------------------------------------------------------------
  // AI preview rendering
  // ------------------------------------------------------------------

  AH.showAIPreview = async function (suggestions, summary, statistics, originalFormData = null) {
    const modal = document.getElementById("aiSuggestionModal");
    if (!modal) return;
    const modalBody = modal.querySelector(".ai-modal-body");
    if (!modalBody) return;

    if (originalFormData) modalBody.dataset.originalFormData = JSON.stringify(originalFormData);

    let taskDetailsMap = {};
    if (originalFormData?.tasks) {
      try {
        const tasks = await this.loadPendingTasks();
        tasks.forEach((task) => {
          if (originalFormData.tasks.includes(parseInt(task.id))) {
            taskDetailsMap[task.id] = task;
          }
        });
      } catch (e) { /* non-critical */ }
    }

    const totalHours = statistics?.totalHours || Math.round(suggestions.reduce((sum, s) => sum + (s.durationMinutes || 60), 0) / 60);
    const daysUsed = statistics?.daysUsed || new Set(suggestions.map((s) => new Date(s.scheduledTime).toDateString())).size;

    const workloadWarnings = (statistics?.workloadAnalysis?.warnings || []);
    const warningHtml = workloadWarnings.length > 0
      ? `<div style="margin:12px 0;padding:10px 14px;background:#fef3c7;border-radius:8px;border-left:4px solid #f59e0b;font-size:13px;color:#92400e;">
          <i class="fas fa-exclamation-triangle" style="margin-right:6px"></i>
          <strong>Cảnh báo quá tải:</strong> ${workloadWarnings.join("; ")}
        </div>` : "";

    let listHtml = "";
    suggestions.forEach((s, i) => {
      const date = new Date(s.scheduledTime);
      const dateStr = date.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" });
      const timeStr = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      const task = taskDetailsMap[s.taskId] || {};
      const title = task.title || s.taskTitle || `Công việc #${s.taskId}`;
      const color = s.color || task.color || "#8B5CF6";

      listHtml += `
        <div style="background:#fff;border-left:4px solid ${color};border-radius:6px;padding:10px 12px;margin-bottom:8px;box-shadow:0 1px 2px rgba(0,0,0,0.04);display:flex;gap:10px;align-items:flex-start">
          <div style="width:28px;height:28px;background:${color};color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0">${i + 1}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:14px;margin-bottom:2px">${this.escapeHtml(title)}</div>
            <div style="font-size:12px;color:#6b7280"><i class="far fa-calendar" style="margin-right:4px"></i>${dateStr} • ${timeStr} • ${s.durationMinutes || 60}p</div>
            ${s.reason ? `<div style="font-size:11px;color:#6b7280;background:#f8fafc;padding:5px 8px;border-radius:4px;margin-top:4px"><i class="fas fa-lightbulb" style="color:#f59e0b;margin-right:4px"></i>${s.reason}</div>` : ""}
          </div>
        </div>`;
    });

    modalBody.innerHTML = `
      <div class="ai-preview-container" style="padding:16px">
        <div style="text-align:center;margin-bottom:16px">
          <div style="font-size:36px;color:#8B5CF6;margin-bottom:6px"><i class="fas fa-robot"></i></div>
          <h3 style="font-size:20px;font-weight:700;color:#1f2937;margin-bottom:4px">Lịch Trình AI Đề Xuất</h3>
          <p style="color:#6b7280;font-size:14px">${this.escapeHtml(summary || "")}</p>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
          <div style="background:#f5f3ff;padding:12px;border-radius:8px;text-align:center">
            <div style="font-size:24px;font-weight:700;color:#8B5CF6">${statistics?.totalTasks || suggestions.length}</div>
            <div style="font-size:12px;color:#6b7280">Công việc</div>
          </div>
          <div style="background:#ecfdf5;padding:12px;border-radius:8px;text-align:center">
            <div style="font-size:24px;font-weight:700;color:#10B981">${totalHours}</div>
            <div style="font-size:12px;color:#6b7280">Giờ</div>
          </div>
          <div style="background:#fffbeb;padding:12px;border-radius:8px;text-align:center">
            <div style="font-size:24px;font-weight:700;color:#F59E0B">${daysUsed}</div>
            <div style="font-size:12px;color:#6b7280">Ngày</div>
          </div>
        </div>

        ${warningHtml}

        <div id="aiPreviewCalendar" style="border:1px solid #e5e7eb;border-radius:8px;margin-bottom:14px;min-height:300px;background:#fff"></div>

        <details style="margin-bottom:14px">
          <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#374151;padding:8px 0">
            <i class="fas fa-list-check" style="margin-right:6px"></i>Chi tiết (${suggestions.length})
          </summary>
          <div style="max-height:250px;overflow-y:auto;padding:8px 0">${listHtml}</div>
        </details>

        <div style="display:flex;justify-content:center;gap:10px;margin-top:16px">
          <button id="aiApplyBtn" style="padding:10px 22px;background:#10B981;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:14px">
            <i class="fas fa-check-circle"></i> Áp dụng vào lịch trình
          </button>
          <button id="aiEditBtn" style="padding:10px 22px;background:#f3f4f6;color:#374151;border:1px solid #d1d5db;border-radius:8px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:14px">
            <i class="fas fa-edit"></i> Chỉnh sửa
          </button>
          <button id="aiBackBtn" style="padding:10px 22px;background:transparent;color:#6b7280;border:1px solid #d1d5db;border-radius:8px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:14px">
            <i class="fas fa-arrow-left"></i> Quay lại
          </button>
        </div>

        <div id="aiEditSection" style="display:none;margin-top:20px;padding:16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb">
          <h5 style="font-size:15px;font-weight:600;margin-bottom:10px;color:#374151"><i class="fas fa-comment-dots"></i> Hướng dẫn chỉnh sửa</h5>
          <textarea id="aiAdditionalInstructions" placeholder="Ví dụ: Chuyển công việc sang buổi sáng, tránh thứ 6 chiều..."
            style="width:100%;height:90px;padding:10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;resize:vertical;margin-bottom:10px">${originalFormData?.additionalInstructions || ""}</textarea>
          <div style="display:flex;gap:8px">
            <button id="aiResubmitBtn" style="padding:8px 16px;background:#3B82F6;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;font-size:13px"><i class="fas fa-paper-plane"></i> Gửi lại</button>
            <button id="aiCancelEditBtn" style="padding:8px 16px;background:transparent;color:#6b7280;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;font-size:13px">Hủy</button>
          </div>
        </div>
      </div>`;

    const modalFooter = modal.querySelector(".ai-modal-footer");
    if (modalFooter) modalFooter.style.display = "none";

    this._mountPreviewCalendar(suggestions, taskDetailsMap, originalFormData);
    this.setupPreviewEventListeners(originalFormData, suggestions);
  };

  AH._mountPreviewCalendar = function (suggestions, taskDetailsMap, formData) {
    const el = document.getElementById("aiPreviewCalendar");
    if (!el || typeof FullCalendar === "undefined") return;

    const events = suggestions.map((s) => {
      const task = taskDetailsMap[s.taskId] || {};
      const start = new Date(s.scheduledTime);
      const end = new Date(start.getTime() + (s.durationMinutes || 60) * 60000);
      return {
        title: task.title || s.taskTitle || `#${s.taskId}`,
        start, end,
        backgroundColor: s.color || "#8B5CF6",
        borderColor: s.color || "#8B5CF6",
        textColor: "#fff",
      };
    });

    const startDate = formData?.startDate ? formData.startDate.split("T")[0] : new Date().toISOString().split("T")[0];

    if (this._previewCal) { try { this._previewCal.destroy(); } catch (_) {} }
    this._previewCal = new FullCalendar.Calendar(el, {
      initialView: "timeGridWeek",
      initialDate: startDate,
      locale: "vi",
      height: 350,
      headerToolbar: { left: "prev,next", center: "title", right: "" },
      allDaySlot: false,
      slotMinTime: "07:00:00",
      slotMaxTime: "22:00:00",
      slotDuration: "00:30:00",
      editable: false,
      selectable: false,
      events,
      eventContent: (arg) => ({ html: `<div style="padding:2px 4px;font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${arg.event.title}</div>` }),
    });
    this._previewCal.render();
  };

  AH.setupPreviewEventListeners = function (originalFormData, suggestions) {
    const modalBody = document.querySelector("#aiSuggestionModal .ai-modal-body");
    if (!modalBody) return;

    modalBody.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      switch (button.id) {
        case "aiApplyBtn":
          event.preventDefault();
          this.applyAISuggestions(suggestions);
          break;
        case "aiEditBtn":
          event.preventDefault();
          document.getElementById("aiEditSection").style.display = "block";
          break;
        case "aiBackBtn":
          event.preventDefault();
          this.resetToFormView();
          break;
        case "aiResubmitBtn":
          event.preventDefault();
          this.resubmitWithInstructions(originalFormData);
          break;
        case "aiCancelEditBtn":
          event.preventDefault();
          document.getElementById("aiEditSection").style.display = "none";
          break;
      }
    });
  };

  // ------------------------------------------------------------------
  // Reset to form view (rebuild form HTML from scratch)
  // ------------------------------------------------------------------

  AH.resetToFormView = function () {
    const modal = document.getElementById("aiSuggestionModal");
    if (!modal) { this.showError("Modal không tồn tại"); return; }
    const modalBody = modal.querySelector(".ai-modal-body");
    if (!modalBody) { this.showError("Không thể reset form"); return; }

    // Restore the original form footer
    const modalFooter = modal.querySelector(".ai-modal-footer");
    if (modalFooter) modalFooter.style.display = "flex";

    delete modalBody.dataset.originalFormData;
    delete modalBody.dataset.suggestions;

    modalBody.innerHTML = `
      <form id="aiSuggestionForm">
        <div class="ai-form-card">
          <div class="ai-form-card-header">
            <i class="fas fa-calendar-alt"></i>
            <span>Khoảng Thời Gian</span>
          </div>
          <div class="date-range-grid">
            <div class="form-group">
              <label class="form-label">Từ ngày</label>
              <input type="date" id="aiStartDate" class="date-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">Đến ngày</label>
              <input type="date" id="aiEndDate" class="date-input" required />
            </div>
          </div>
        </div>

        <div class="ai-form-card">
          <div class="ai-form-card-header">
            <i class="fas fa-tasks"></i>
            <span>Chọn Công Việc</span>
            <button type="button" class="btn-select-all" id="selectAllTasksBtn">
              <i class="fas fa-check-double"></i><span>Chọn tất cả</span>
            </button>
          </div>
          <div id="aiSortControls" class="mb-2"></div>
          <div class="task-list-container">
            <div class="task-list" id="aiTaskList">
              <div class="loading-state">
                <div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>
                <p>Đang tải công việc...</p>
              </div>
            </div>
            <div class="task-stats" id="aiTaskStats">Đã chọn: <strong>0</strong> công việc</div>
          </div>
        </div>

        <div class="ai-form-card">
          <div class="ai-form-card-header">
            <i class="fas fa-sliders-h"></i>
            <span>Tuỳ Chọn AI</span>
          </div>
          <div class="ai-options-grid">
            <label class="ai-option">
              <input type="checkbox" id="aiOptionAvoidConflict" checked />
              <div class="option-content">
                <div class="option-icon"><i class="fas fa-shield-alt"></i></div>
                <div class="option-text"><strong>Tránh trùng lịch</strong><small>Không xếp vào khung giờ đã có</small></div>
              </div>
            </label>
            <label class="ai-option">
              <input type="checkbox" id="aiOptionConsiderPriority" checked />
              <div class="option-content">
                <div class="option-icon"><i class="fas fa-star"></i></div>
                <div class="option-text"><strong>Ưu tiên quan trọng</strong><small>Xếp việc quan trọng trước</small></div>
              </div>
            </label>
            <label class="ai-option">
              <input type="checkbox" id="aiOptionBalanceWorkload" checked />
              <div class="option-content">
                <div class="option-icon"><i class="fas fa-balance-scale"></i></div>
                <div class="option-text"><strong>Cân bằng khối lượng</strong><small>Phân đều công việc các ngày</small></div>
              </div>
            </label>
          </div>
        </div>
      </form>`;

    this.setDefaultDates();
    setTimeout(async () => {
      await this.populateAIModal();
      this.setupAllEventListeners();
    }, 100);
  };

  // ------------------------------------------------------------------
  // Static HTML helpers
  // ------------------------------------------------------------------

  AH.getLoadingHTML = function () {
    return `
      <div class="loading-state" style="text-align:center;padding:40px;">
        <div class="loading-spinner" style="display:inline-block;">
          <i class="fas fa-spinner fa-spin" style="font-size:32px;color:#8B5CF6;"></i>
        </div>
        <p style="margin-top:20px;color:#666;">Đang tải danh sách công việc...</p>
      </div>`;
  };

  AH.getEmptyStateHTML = function () {
    return `
      <div class="empty-state" style="text-align:center;padding:40px;">
        <i class="fas fa-tasks" style="font-size:48px;color:#ccc;margin-bottom:20px;"></i>
        <p style="font-size:16px;color:#666;">Không có công việc nào chưa hoàn thành</p>
        <p class="text-sm text-gray-500 mt-2">Hãy tạo công việc mới trước khi sử dụng AI</p>
      </div>`;
  };

  AH.getSuccessHTML = function (result) {
    const suggestionCount  = result.suggestions?.length || 0;
    const summary          = result.summary || `Đã tạo ${suggestionCount} khung giờ`;
    const stats            = result.statistics || {};
    const previewSuggestions = result.suggestions?.slice(0, 3) || [];

    let suggestionsHTML = "";
    previewSuggestions.forEach((suggestion) => {
      const date    = new Date(suggestion.scheduledTime);
      const timeStr = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      const dateStr = date.toLocaleDateString("vi-VN");
      suggestionsHTML += `
        <div class="suggestion-item" style="padding:15px;margin:10px 0;border-left:3px solid #8B5CF6;background:#f9fafb;">
          <i class="far fa-calendar-check" style="color:#8B5CF6;margin-right:10px;"></i>
          <div class="suggestion-info" style="display:inline-block;">
            <strong>Công việc #${suggestion.taskId}</strong>
            <small style="display:block;color:#666;">${dateStr} lúc ${timeStr} (${suggestion.durationMinutes} phút)</small>
            <div class="text-xs text-gray-500 mt-1">${suggestion.reason || ""}</div>
          </div>
        </div>`;
    });
    if (suggestionCount > 3) {
      suggestionsHTML += `<div style="text-align:center;padding:15px;color:#666;">+ ${suggestionCount - 3} đề xuất khác</div>`;
    }

    return `
      <div class="ai-summary-section" style="padding:20px;">
        <div class="summary-header success" style="text-align:center;margin-bottom:30px;">
          <i class="fas fa-check-circle" style="font-size:64px;color:#10B981;margin-bottom:20px;"></i>
          <h4 style="font-size:24px;font-weight:600;margin:0;">AI đã tạo lịch trình thành công!</h4>
        </div>
        <p style="text-align:center;font-size:16px;margin-bottom:30px;"><strong>${summary}</strong></p>
        <div class="ai-stats-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:30px;">
          <div style="text-align:center;padding:20px;background:#f9fafb;border-radius:8px;">
            <i class="fas fa-tasks" style="font-size:32px;color:#8B5CF6;margin-bottom:10px;"></i>
            <strong style="display:block;font-size:24px;">${stats.totalTasks || suggestionCount}</strong>
            <small style="color:#666;">Công việc</small>
          </div>
          <div style="text-align:center;padding:20px;background:#f9fafb;border-radius:8px;">
            <i class="fas fa-clock" style="font-size:32px;color:#3B82F6;margin-bottom:10px;"></i>
            <strong style="display:block;font-size:24px;">${stats.totalHours || Math.round(suggestionCount * 1.5)}</strong>
            <small style="color:#666;">Giờ</small>
          </div>
          <div style="text-align:center;padding:20px;background:#f9fafb;border-radius:8px;">
            <i class="fas fa-calendar-days" style="font-size:32px;color:#10B981;margin-bottom:10px;"></i>
            <strong style="display:block;font-size:24px;">${stats.daysUsed || 1}</strong>
            <small style="color:#666;">Ngày</small>
          </div>
        </div>
        <div class="suggestions-preview" style="margin-bottom:30px;">
          <h5 style="font-size:18px;font-weight:600;margin-bottom:15px;">Xem trước đề xuất:</h5>
          <div class="suggestions-list">${suggestionsHTML}</div>
        </div>
        <div style="padding:15px;background:#EEF2FF;border-radius:8px;margin-bottom:20px;">
          <i class="fas fa-lightbulb" style="color:#8B5CF6;margin-right:10px;"></i>
          Những đề xuất này đã được thêm vào lịch AI của bạn
        </div>
        <div class="mt-6 text-center">
          <button class="btn btn-primary" onclick="location.reload()" style="padding:12px 30px;background:#8B5CF6;color:white;border:none;border-radius:8px;font-size:16px;cursor:pointer;">
            <i class="fas fa-redo"></i> Tải lại trang
          </button>
        </div>
      </div>`;
  };

  AH.displaySuccessResults = function (result) {
    const modalBody = document.querySelector("#aiSuggestionModal .ai-modal-body");
    if (!modalBody) return;
    modalBody.innerHTML = this.getSuccessHTML(result);
    const modalFooter = document.querySelector("#aiSuggestionModal .ai-modal-footer");
    if (modalFooter) modalFooter.style.display = "none";
  };

  console.log("AI Suggestion Render v1.0 ready");
})();
