/**
 * ai-reference-module.js
 *
 * Orchestrates the "Tham khảo AI → Gợi ý lịch trình" feature. Mounts into
 * #ai-section (dynamic content rendered by ai-content.html). Relies on
 *   - AIModule.calendar  (FullCalendar instance for the AI section)
 *   - window.Utils.makeRequest  (API helper)
 *   - window.Swal  (dialogs)
 *
 * Flow:
 *   1. Load pending tasks → render sidebar list with checkbox select.
 *   2. User picks tasks + clicks "Lập lịch tự động".
 *   3. Dialog asks for date range (default: today → today+7d) + instructions.
 *   4. POST /api/ai-reference/suggest-schedule → render proposals on calendar
 *      (dashed purple events, taskId:proposal-N, className: ai-ref-proposal).
 *   5. User accepts/rejects (single or all) → POST apply-proposals → replace
 *      proposal stubs with real AI events via AIModule refresh.
 */
(function () {
  "use strict";
  if (window.AIReferenceModule) return;

  const state = {
    tasks: [],           // pending CongViec rows
    selected: new Set(), // selected task MaCongViec (number)
    proposals: [],       // current unaccepted proposals from AI
    tasksLoaded: false,
    toolbarBound: false,
    eventClickPatched: false,
  };

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isoToDateInputValue(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function priorityColor(p) {
    return window.PriorityTheme
      ? PriorityTheme.getColor(p)
      : "#2563EB";
  }

  async function loadTasks() {
    const host = $("ai-ref-task-list");
    if (!host) return;
    try {
      const res = await Utils.makeRequest("/api/tasks", "GET");
      if (!res.success) throw new Error(res.message || "Lỗi tải task");
      const list = (res.data || []).filter((t) => {
        const st = t.TrangThaiThucHien ?? t.Status ?? t.DaHoanThanh ?? 0;
        return st !== 2 && st !== "completed" && st !== "done";
      });
      state.tasks = list;
      state.tasksLoaded = true;
      renderTasks();
    } catch (err) {
      console.error("[ai-ref] loadTasks:", err);
      host.innerHTML = `
        <div class="text-center text-red-600 py-8 text-sm">
          <i class="fas fa-exclamation-circle text-xl mb-2"></i>
          <p>${esc(err.message || "Lỗi tải công việc")}</p>
        </div>`;
    }
  }

  // Fields required before AI can schedule optimally.
  // Missing → card shown in warning state + "Lập lịch" validation blocks.
  function missingAiFields(task) {
    const missing = [];
    if (!task.MucDoPhucTap) missing.push("Độ phức tạp");
    if (!task.MucDoTapTrung) missing.push("Độ tập trung");
    if (!task.ThoiDiemThichHop) missing.push("Thời điểm phù hợp");
    return missing;
  }

  const PRIORITY_LABEL = { 1: "Thấp", 2: "TB", 3: "Cao", 4: "Rất cao" };
  const TIME_SLOT_LABEL = { "1": "Sáng", "2": "Trưa", "3": "Chiều", "4": "Tối" };

  function renderTasks() {
    const host = $("ai-ref-task-list");
    if (!host) return;
    if (state.tasks.length === 0) {
      host.innerHTML = `
        <div class="text-center py-10 text-sm" style="color:var(--text-muted)">
          <i class="fas fa-clipboard-list text-3xl mb-2" style="color:var(--border-hover)"></i>
          <p>Không có công việc chờ</p>
        </div>`;
      updateSelectedCount();
      return;
    }

    const html = state.tasks
      .map((task, idx) => {
        const id = task.MaCongViec || task.ID || task.id;
        const title = task.TieuDe || "Công việc";
        const priority = parseInt(task.MucDoUuTien || 2, 10);
        const dur = parseInt(task.ThoiGianUocTinh || 60, 10);
        const cat = task.TenLoai || task.LoaiCongViec?.TenLoai || "";
        const color = priorityColor(priority);
        const checked = state.selected.has(id) ? "checked" : "";
        const missing = missingAiFields(task);
        const needsAttn = missing.length > 0;

        const chips = [];
        chips.push(
          `<span class="ai-card-chip"><i class="fas fa-flag"></i>${esc(PRIORITY_LABEL[priority] || "")}</span>`
        );
        chips.push(
          `<span class="ai-card-chip"><i class="far fa-clock"></i>${dur}p</span>`
        );
        if (cat) {
          chips.push(
            `<span class="ai-card-chip"><i class="fas fa-folder"></i>${esc(cat)}</span>`
          );
        }
        if (task.MucDoPhucTap) {
          chips.push(
            `<span class="ai-card-chip"><i class="fas fa-layer-group"></i>Phức tạp ${task.MucDoPhucTap}/5</span>`
          );
        }
        if (task.MucDoTapTrung) {
          chips.push(
            `<span class="ai-card-chip"><i class="fas fa-bullseye"></i>Tập trung ${task.MucDoTapTrung}/5</span>`
          );
        }
        if (task.ThoiDiemThichHop) {
          chips.push(
            `<span class="ai-card-chip"><i class="fas fa-sun"></i>${esc(TIME_SLOT_LABEL[task.ThoiDiemThichHop] || task.ThoiDiemThichHop)}</span>`
          );
        }

        const warnBadge = needsAttn
          ? `<span class="ai-card-warn" title="Thiếu: ${missing.join(", ")}">
               <i class="fas fa-triangle-exclamation"></i>
             </span>`
          : "";

        return `
          <div class="ai-ref-card ${needsAttn ? "needs-attention" : ""}"
               data-task-id="${id}" data-task-idx="${idx}" draggable="true"
               style="border-left-color:${color}">
            <div class="ai-card-grip" title="Kéo để sắp xếp">
              <i class="fas fa-grip-vertical"></i>
            </div>
            <input type="checkbox" class="ai-ref-task-cb" data-task-id="${id}" ${checked}
                   title="Chọn cho AI gợi ý lịch">
            <div class="ai-card-body">
              <div class="ai-card-title-row">
                <span class="ai-card-dot" style="background:${color}"></span>
                <span class="ai-card-title">${esc(title)}</span>
                ${warnBadge}
              </div>
              <div class="ai-card-chips">${chips.join("")}</div>
            </div>
          </div>`;
      })
      .join("");

    host.innerHTML = html;
    wireCardDragAndClick(host);
    updateSelectedCount();
  }

  // Card interactions: click body → open edit modal; drag → reorder local list.
  function wireCardDragAndClick(host) {
    let dragSrcIdx = null;
    host.querySelectorAll(".ai-ref-card").forEach((card) => {
      // Click on body (not on checkbox or grip) → open edit modal.
      card.addEventListener("click", (e) => {
        if (e.target.closest(".ai-ref-task-cb")) return;
        if (e.target.closest(".ai-card-grip")) return;
        const id = parseInt(card.dataset.taskId, 10);
        const task = state.tasks.find(
          (t) => (t.MaCongViec || t.ID || t.id) === id
        );
        if (!task || !window.AITaskEdit) return;
        window.AITaskEdit.open(task, (updated) => {
          Object.assign(task, updated);
          renderTasks();
        });
      });
      // Drag-reorder (HTML5 native — UI-only, not persisted).
      card.addEventListener("dragstart", (e) => {
        dragSrcIdx = Number(card.dataset.taskIdx);
        card.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
      });
      card.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });
      card.addEventListener("drop", (e) => {
        e.preventDefault();
        const dstIdx = Number(card.dataset.taskIdx);
        if (dragSrcIdx == null || dragSrcIdx === dstIdx) return;
        const moved = state.tasks.splice(dragSrcIdx, 1)[0];
        state.tasks.splice(dstIdx, 0, moved);
        dragSrcIdx = null;
        renderTasks();
      });
    });
  }

  function updateSelectedCount() {
    const el = $("ai-ref-selected-count");
    if (el) el.textContent = String(state.selected.size);
    const btn = $("ai-ref-suggest-btn");
    if (btn) {
      btn.disabled = state.selected.size === 0;
      btn.style.opacity = state.selected.size === 0 ? "0.5" : "1";
      btn.style.cursor = state.selected.size === 0 ? "not-allowed" : "pointer";
    }
  }

  function toggleTask(id, on) {
    const numId = parseInt(id, 10);
    if (!Number.isFinite(numId)) return;
    if (on) state.selected.add(numId);
    else state.selected.delete(numId);
    updateSelectedCount();
  }

  function selectAll() {
    state.selected = new Set(
      state.tasks.map((t) => t.MaCongViec || t.ID || t.id).filter(Boolean)
    );
    document
      .querySelectorAll("#ai-ref-task-list .ai-ref-task-cb")
      .forEach((cb) => (cb.checked = true));
    updateSelectedCount();
  }

  function clearSelection() {
    state.selected.clear();
    document
      .querySelectorAll("#ai-ref-task-list .ai-ref-task-cb")
      .forEach((cb) => (cb.checked = false));
    updateSelectedCount();
  }

  // ----- AI suggestion dialog + API call -----------------------------------

  async function promptDateRange() {
    const today = new Date();
    const plus7 = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const defStart = isoToDateInputValue(today);
    const defEnd = isoToDateInputValue(plus7);

    if (!window.Swal) {
      // Fallback: window.prompt
      const s = window.prompt("Từ ngày (YYYY-MM-DD)", defStart);
      if (!s) return null;
      const e = window.prompt("Đến ngày (YYYY-MM-DD)", defEnd);
      if (!e) return null;
      return { dateStart: s, dateEnd: e, additionalInstructions: "" };
    }

    const result = await Swal.fire({
      title: "Gợi ý lịch trình bằng AI",
      html: `
        <div style="text-align:left;font-size:13px">
          <p style="margin-bottom:8px;color:#64748b">
            AI sẽ sắp lịch cho <strong>${state.selected.size}</strong> công việc đã chọn,
            né các slot đã có trong khoảng này.
          </p>
          <label style="font-weight:600;display:block;margin-top:10px">Từ ngày</label>
          <input id="aiRefDateStart" type="date" value="${defStart}"
            style="width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:8px;margin-top:4px">
          <label style="font-weight:600;display:block;margin-top:10px">Đến ngày</label>
          <input id="aiRefDateEnd" type="date" value="${defEnd}"
            style="width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:8px;margin-top:4px">
          <label style="font-weight:600;display:block;margin-top:10px">Yêu cầu thêm (không bắt buộc)</label>
          <textarea id="aiRefExtra" rows="2" placeholder="Ví dụ: ưu tiên buổi sáng, tránh tối thứ 6..."
            style="width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:8px;margin-top:4px;resize:vertical"></textarea>
        </div>`,
      confirmButtonText: "Gợi ý",
      cancelButtonText: "Huỷ",
      showCancelButton: true,
      confirmButtonColor: "#2563EB",
      focusConfirm: false,
      preConfirm: () => {
        const s = document.getElementById("aiRefDateStart").value;
        const e = document.getElementById("aiRefDateEnd").value;
        const extra = document.getElementById("aiRefExtra").value.trim();
        if (!s || !e) {
          Swal.showValidationMessage("Chọn cả ngày bắt đầu và kết thúc");
          return false;
        }
        if (s > e) {
          Swal.showValidationMessage("Ngày bắt đầu phải <= ngày kết thúc");
          return false;
        }
        return { dateStart: s, dateEnd: e, additionalInstructions: extra };
      },
    });
    return result.isConfirmed ? result.value : null;
  }

  // Flag + highlight cards with incomplete AI attributes so the user can
  // edit once and get good AI output long-term. Returns list of bad task ids.
  function findSelectedWithMissing() {
    const bad = [];
    for (const id of state.selected) {
      const t = state.tasks.find(
        (x) => (x.MaCongViec || x.ID || x.id) === id
      );
      if (t && missingAiFields(t).length > 0) bad.push({ id, task: t });
    }
    return bad;
  }

  async function triggerSuggest() {
    if (state.selected.size === 0) {
      Utils.showToast?.("Chọn ít nhất 1 công việc", "warning");
      return;
    }

    // Block + educate user about missing AI-critical fields.
    const missing = findSelectedWithMissing();
    if (missing.length > 0) {
      // Visually flash the first problematic card so user knows where to click.
      const firstBad = document.querySelector(
        `.ai-ref-card[data-task-id="${missing[0].id}"]`
      );
      firstBad?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      firstBad?.classList.add("flash-warn");
      setTimeout(() => firstBad?.classList.remove("flash-warn"), 1600);

      const rows = missing
        .slice(0, 6)
        .map((m) => {
          const fields = missingAiFields(m.task)
            .map(
              (f) =>
                `<span style="display:inline-block;margin:2px 4px 2px 0;padding:2px 8px;
                              font-size:11px;font-weight:500;border-radius:999px;
                              background:rgba(255,159,10,0.15);color:#b25e00;
                              border:1px solid rgba(255,159,10,0.35)">
                   <i class="fas fa-circle-exclamation" style="font-size:9px;margin-right:3px"></i>${esc(f)}
                 </span>`
            )
            .join("");
          return `
            <div style="padding:8px 10px;border-radius:8px;background:var(--bg-card);
                        border:1px solid var(--border);margin-bottom:6px">
              <div style="font-weight:600;font-size:13px;color:var(--text-primary);
                          margin-bottom:4px;
                          white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                ${esc(m.task.TieuDe || "Công việc")}
              </div>
              <div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px">
                Thiếu thông tin:
              </div>
              <div>${fields}</div>
            </div>`;
        })
        .join("");
      const more =
        missing.length > 6
          ? `<div style="margin-top:6px;font-size:12px;color:var(--text-muted);text-align:center">
               …và ${missing.length - 6} công việc khác cũng thiếu thông tin
             </div>`
          : "";
      const r = await (window.Swal?.fire({
        icon: "warning",
        title: `${missing.length} công việc thiếu thông tin`,
        html: `
          <div style="text-align:left;font-size:13px;line-height:1.5">
            <p style="margin-bottom:10px;color:var(--text-primary)">
              Các công việc bên dưới chưa đủ
              <strong>Độ phức tạp · Độ tập trung · Thời điểm phù hợp</strong>.
              Bạn vẫn muốn thêm chúng vào danh sách để AI tạo lịch chứ?
            </p>
            <div style="max-height:240px;overflow-y:auto;padding:2px;
                        border-radius:10px;background:var(--bg-card-alt)">
              <div style="padding:8px">${rows}${more}</div>
            </div>
            <p style="margin-top:10px;padding:8px 10px;border-radius:8px;
                      background:rgba(255,159,10,0.10);
                      color:#b25e00;font-size:12px;line-height:1.45">
              <i class="fas fa-triangle-exclamation" style="margin-right:4px"></i>
              Tiếp tục có thể làm <strong>giảm độ chính xác</strong> của lịch
              trình AI tạo. Khuyến nghị bấm thẻ công việc bên trái để bổ sung
              thông tin trước.
            </p>
          </div>`,
        width: 560,
        confirmButtonText: "Tôi sẽ chỉnh trước",
        showCancelButton: true,
        cancelButtonText: "Cứ tiếp tục với thông tin hiện có",
        confirmButtonColor: "#2563EB",
        cancelButtonColor: "#ff9f0a",
        reverseButtons: true,
      }) ?? Promise.resolve({ isConfirmed: true }));
      if (r.isConfirmed) return;
    }

    const range = await promptDateRange();
    if (!range) return;

    // Busy loading.
    const btn = $("ai-ref-suggest-btn");
    const origHtml = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i><span>Đang gợi ý...</span>`;
    }

    try {
      const res = await Utils.makeRequest(
        "/api/ai-reference/suggest-schedule",
        "POST",
        {
          taskIds: Array.from(state.selected),
          dateStart: range.dateStart,
          dateEnd: range.dateEnd,
          additionalInstructions: range.additionalInstructions,
        }
      );
      if (!res.success) throw new Error(res.message || "AI từ chối");
      const proposals = res.data?.proposals || [];
      if (proposals.length === 0) {
        Swal?.fire({
          icon: "info",
          title: "Không có đề xuất phù hợp",
          text:
            "AI không tìm được slot né hết conflict — thử mở rộng khoảng ngày hoặc giảm số task.",
        });
        return;
      }
      const dropped = res.data?.stats?.droppedForConflict || 0;
      clearProposalsOnCalendar();
      state.proposals = proposals;
      renderProposalsOnCalendar(proposals);
      showProposalBar(proposals.length, dropped);
    } catch (err) {
      console.error("[ai-ref] suggest:", err);
      Swal?.fire({ icon: "error", title: "Lỗi gợi ý", text: err.message || "Không gọi được AI" });
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
      updateSelectedCount();
    }
  }

  // ----- Render proposals on the AI calendar --------------------------------

  function proposalEventId(taskId) { return `proposal-${taskId}`; }

  function renderProposalsOnCalendar(proposals) {
    const cal = window.AIModule?.calendar;
    if (!cal) return;
    ensureEventClickPatched();
    proposals.forEach((p) => {
      cal.addEvent({
        id: proposalEventId(p.taskId),
        title: p.title + "  (AI đề xuất)",
        start: p.start,
        end: p.end,
        backgroundColor: "#eff6ff",
        borderColor: "#2563EB",
        textColor: "#1e40af",
        classNames: ["ai-ref-proposal"],
        extendedProps: {
          isProposal: true,
          proposal: p,
        },
      });
    });
    // Snap view to first proposal for convenience.
    if (proposals[0]?.start) {
      try { cal.gotoDate(new Date(proposals[0].start)); } catch (_) {}
    }
  }

  function clearProposalsOnCalendar() {
    const cal = window.AIModule?.calendar;
    if (!cal) return;
    cal.getEvents().forEach((ev) => {
      if (ev.extendedProps?.isProposal) ev.remove();
    });
  }

  /**
   * Patch AIModule.calendar.eventClick once to intercept proposal clicks.
   * Non-proposal events fall through to whatever AIModule sets later.
   */
  function ensureEventClickPatched() {
    if (state.eventClickPatched) return;
    const cal = window.AIModule?.calendar;
    if (!cal) return;
    cal.setOption("eventClick", (info) => {
      info.jsEvent.preventDefault();
      if (info.event.extendedProps?.isProposal) {
        handleProposalClick(info.event.extendedProps.proposal);
      }
    });
    state.eventClickPatched = true;
  }

  async function handleProposalClick(p) {
    if (!window.Swal) {
      // Simple confirm fallback.
      if (window.confirm(`Chấp nhận "${p.title}"?`)) acceptMany([p]);
      else clearProposalById(p.taskId);
      return;
    }
    const r = await Swal.fire({
      title: p.title,
      html: `
        <div style="text-align:left;font-size:13px">
          <p><strong>Bắt đầu:</strong> ${esc(new Date(p.start).toLocaleString("vi-VN"))}</p>
          <p><strong>Kết thúc:</strong> ${esc(new Date(p.end).toLocaleString("vi-VN"))}</p>
          ${p.reason ? `<p style="margin-top:6px;color:#64748b;font-style:italic">${esc(p.reason)}</p>` : ""}
        </div>`,
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: "Chấp nhận",
      denyButtonText: "Bỏ đề xuất",
      cancelButtonText: "Để sau",
      confirmButtonColor: "#10b981",
      denyButtonColor: "#ef4444",
    });
    if (r.isConfirmed) {
      await acceptMany([p]);
    } else if (r.isDenied) {
      clearProposalById(p.taskId);
      state.proposals = state.proposals.filter((x) => x.taskId !== p.taskId);
      updateProposalBar();
    }
  }

  function clearProposalById(taskId) {
    const cal = window.AIModule?.calendar;
    if (!cal) return;
    const ev = cal.getEventById(proposalEventId(taskId));
    if (ev) ev.remove();
  }

  async function acceptMany(proposals) {
    try {
      const res = await Utils.makeRequest(
        "/api/ai-reference/apply-proposals",
        "POST",
        { proposals }
      );
      if (!res.success) throw new Error(res.message || "Lưu thất bại");
      const applied = res.data?.applied || 0;
      Utils.showToast?.(`Đã lưu ${applied} lịch`, "success");
      // Remove accepted proposals from calendar + state.
      proposals.forEach((p) => clearProposalById(p.taskId));
      const acceptedIds = new Set(proposals.map((p) => p.taskId));
      state.proposals = state.proposals.filter((x) => !acceptedIds.has(x.taskId));
      updateProposalBar();
      // Refresh from DB to show the newly-saved AI events in solid style.
      if (window.AIModule?.refreshFromDatabase) {
        window.AIModule.refreshFromDatabase();
      }
    } catch (err) {
      console.error("[ai-ref] accept:", err);
      Utils.showToast?.(err.message || "Lỗi lưu", "error");
    }
  }

  function showProposalBar(count, dropped) {
    const bar = $("ai-ref-proposal-bar");
    const cnt = $("ai-ref-proposal-count");
    if (!bar || !cnt) return;
    cnt.textContent = String(count);
    bar.classList.remove("hidden");
    bar.style.display = "flex";
    if (dropped > 0) {
      Utils.showToast?.(
        `AI đã bỏ ${dropped} đề xuất do trùng lịch`,
        "warning"
      );
    }
  }

  function updateProposalBar() {
    const bar = $("ai-ref-proposal-bar");
    const cnt = $("ai-ref-proposal-count");
    if (!bar || !cnt) return;
    if (state.proposals.length === 0) {
      bar.classList.add("hidden");
      bar.style.display = "none";
      return;
    }
    cnt.textContent = String(state.proposals.length);
  }

  function acceptAll() {
    if (state.proposals.length === 0) return;
    acceptMany(state.proposals.slice());
  }

  function rejectAll() {
    state.proposals.forEach((p) => clearProposalById(p.taskId));
    state.proposals = [];
    updateProposalBar();
  }

  // ----- Bind toolbar (idempotent) -----------------------------------------

  function bindToolbar() {
    if (state.toolbarBound) return;
    const host = $("ai-ref-task-list");
    const suggestBtn = $("ai-ref-suggest-btn");
    const refreshBtn = $("ai-ref-refresh-btn");
    const selAllBtn = $("ai-ref-select-all-btn");
    const clearBtn = $("ai-ref-clear-sel-btn");
    const acceptAllBtn = $("ai-ref-accept-all-btn");
    const rejectAllBtn = $("ai-ref-reject-all-btn");
    if (!host || !suggestBtn) return;

    // Checkbox toggle — card body click is handled inside wireCardDragAndClick.
    host.addEventListener("change", (e) => {
      const cb = e.target.closest(".ai-ref-task-cb");
      if (!cb) return;
      toggleTask(cb.dataset.taskId, cb.checked);
    });
    // Stop propagation on checkbox/grip so clicks there don't open the modal.
    host.addEventListener("click", (e) => {
      if (e.target.closest(".ai-ref-task-cb") || e.target.closest(".ai-card-grip")) {
        e.stopPropagation();
      }
    });

    suggestBtn.addEventListener("click", triggerSuggest);
    refreshBtn?.addEventListener("click", () => loadTasks());
    selAllBtn?.addEventListener("click", selectAll);
    clearBtn?.addEventListener("click", clearSelection);
    acceptAllBtn?.addEventListener("click", acceptAll);
    rejectAllBtn?.addEventListener("click", rejectAll);

    state.toolbarBound = true;
  }

  // ----- Entry point -------------------------------------------------------

  function onSectionEnter() {
    bindToolbar();
    if (!state.tasksLoaded) loadTasks();
    ensureEventClickPatched();
  }

  window.AIReferenceModule = {
    onSectionEnter,
    _state: state, // exposed for debugging
  };
})();
