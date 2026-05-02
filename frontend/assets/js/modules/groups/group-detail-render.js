// group-detail-render.js — Pure render helpers for group detail view (members, tasks, layout)
(function () {
  "use strict";

  window.GroupDetailRender = {

    detailHeader(g, members) {
      return `
        <div class="group-detail-header">
          <div class="flex items-start gap-4">
            <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
              style="background:var(--accent-gradient, linear-gradient(135deg,#2563EB,#1d4ed8))">
              ${(g.TenNhom || "N")[0].toUpperCase()}
            </div>
            <div class="flex-1">
              <h2 class="text-xl font-bold text-slate-800">${g.TenNhom}</h2>
              ${g.MoTa ? `<p class="text-sm text-slate-500 mt-0.5">${g.MoTa}</p>` : ""}
              <div class="flex gap-4 mt-2 text-xs text-slate-400">
                <span><i class="fas fa-users mr-1"></i>${members.length}/${g.MaxMembers || 10} thành viên</span>
                <span><i class="fas fa-calendar mr-1"></i>${new Date(g.NgayTao).toLocaleDateString("vi-VN")}</span>
              </div>
            </div>
          </div>
        </div>`;
    },

    membersPanel(members, canManage) {
      const addBtn = canManage
        ? `<button onclick="GroupDetailSection.showAddMember()" class="text-xs px-3 py-1.5 rounded-lg font-semibold text-white" style="background:var(--accent,#2563EB)"><i class="fas fa-user-plus mr-1"></i>Thêm</button>`
        : "";
      const addForm = canManage ? `
        <div id="add-member-form" class="hidden mb-3">
          <p class="text-xs text-slate-500 mb-2"><i class="fas fa-user-friends mr-1"></i>Chọn bạn bè để thêm vào nhóm</p>
          <div id="add-member-friends-list" class="space-y-1 max-h-48 overflow-y-auto"></div>
        </div>` : "";
      return `
        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm font-semibold text-slate-800"><i class="fas fa-users mr-1" style="color:var(--accent,#2563EB)"></i>Thành viên</p>
            ${addBtn}
          </div>
          ${addForm}
          <div class="group-members-list space-y-2">${this.memberRows(members, canManage)}</div>
        </div>`;
    },

    memberRows(members, canManage) {
      if (!members.length) return `<p class="text-xs text-slate-400 text-center py-4">Chưa có thành viên</p>`;
      return members.map((m) => {
        const initial = (m.HoTen || m.Email || "?")[0].toUpperCase();
        const roleLabel = m.VaiTro === "owner" ? "Chủ nhóm" : m.VaiTro === "admin" ? "Quản trị" : "Thành viên";
        const roleClass = m.VaiTro === "owner" ? "role-owner" : m.VaiTro === "admin" ? "role-admin" : "role-member";
        const removeBtn = (canManage && m.VaiTro !== "owner")
          ? `<button onclick="GroupDetailSection.removeMember(${m.UserID},'${(m.HoTen || m.Email || "").replace(/'/g, "\\'")}')" class="text-xs text-slate-300 hover:text-red-500 transition"><i class="fas fa-times"></i></button>`
          : "";
        return `
          <div class="flex items-center gap-2 p-2 rounded-xl bg-slate-50">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style="background:var(--accent,#2563EB)">${initial}</div>
            <div class="flex-1 min-w-0">
              <div class="text-xs font-semibold text-slate-800 truncate">${m.HoTen || "Người dùng"}</div>
              <div class="text-xs text-slate-400 truncate">${m.Email || ""}</div>
            </div>
            <span class="role-badge ${roleClass}">${roleLabel}</span>
            ${removeBtn}
          </div>`;
      }).join("");
    },

    tasksPanel(members, tasks) {
      const memberOpts = members.map((m) => `<option value="${m.UserID}">${m.HoTen || m.Email}</option>`).join("");
      const stats = this._taskStats(tasks);
      return `
        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm font-semibold text-slate-800"><i class="fas fa-tasks mr-1" style="color:var(--accent,#2563EB)"></i>Công việc</p>
            <button onclick="GroupDetailSection.showAddTask()" class="text-xs px-3 py-1.5 rounded-lg font-semibold text-white" style="background:var(--accent,#2563EB)"><i class="fas fa-plus mr-1"></i>Thêm</button>
          </div>
          ${stats}
          <div id="add-task-form" class="hidden mb-3 space-y-2">
            <input id="task-title-input" type="text" placeholder="Tiêu đề công việc *"
              class="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-1" />
            <textarea id="task-desc-input" placeholder="Mô tả (tuỳ chọn)" rows="2"
              class="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-1 resize-none"></textarea>
            <select id="task-assignee-input" class="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none">
              <option value="">-- Giao cho --</option>${memberOpts}
            </select>
            <div class="grid grid-cols-2 gap-2">
              <select id="task-priority-input" class="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none">
                <option value="2">Bình thường</option>
                <option value="1">Khẩn cấp</option>
                <option value="3">Thấp</option>
              </select>
              <input id="task-deadline-input" type="date" class="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none" />
            </div>
            <div class="flex gap-2 justify-end">
              <button onclick="GroupDetailSection.hideAddTask()" class="px-3 py-1.5 rounded-lg text-xs border border-slate-200 text-slate-500">Huỷ</button>
              <button onclick="GroupDetailSection.addTask()" class="px-3 py-1.5 rounded-xl text-xs font-semibold text-white" style="background:var(--accent,#2563EB)">Tạo</button>
            </div>
          </div>
          <div class="group-tasks-list space-y-2">${this.taskRows(tasks)}</div>
        </div>`;
    },

    _taskStats(tasks) {
      if (!tasks.length) return "";
      const total = tasks.length;
      const done = tasks.filter((t) => t.TrangThai === "completed").length;
      const inProgress = tasks.filter((t) => t.TrangThai === "in_progress").length;
      const pending = total - done - inProgress;
      const pct = Math.round((done / total) * 100);
      return `
        <div class="flex items-center gap-3 mb-3 p-2.5 rounded-xl bg-slate-50">
          <div class="flex-1">
            <div class="flex justify-between text-xs text-slate-500 mb-1">
              <span>${done}/${total} hoàn thành</span>
              <span>${pct}%</span>
            </div>
            <div class="group-progress"><div class="group-progress-fill" style="width:${pct}%"></div></div>
          </div>
          <div class="flex gap-2 text-xs">
            <span class="task-status-badge status-pending">${pending}</span>
            <span class="task-status-badge status-progress">${inProgress}</span>
            <span class="task-status-badge status-done">${done}</span>
          </div>
        </div>`;
    },

    taskRows(tasks) {
      if (!tasks.length) return `<p class="text-xs text-slate-400 text-center py-4">Chưa có công việc</p>`;
      const statusMap = { pending: ["Chờ xử lý", "status-pending", "far fa-clock"], in_progress: ["Đang làm", "status-progress", "fas fa-spinner"], completed: ["Hoàn thành", "status-done", "fas fa-check"], cancelled: ["Huỷ", "status-pending", "fas fa-ban"] };
      const prioLabels = ["", "Khẩn cấp", "Bình thường", "Thấp", "Rất thấp"];
      const prioColors = ["", "#ef4444", "#f59e0b", "#3b82f6", "#94a3b8"];
      return tasks.map((t) => {
        const [statusLabel, statusClass, statusIcon] = statusMap[t.TrangThai] || ["Chờ", "status-pending", "far fa-clock"];
        const prio = Math.min(4, Math.max(1, t.MucDoUuTien || 2));
        const assignee = t.Assignee?.HoTen || t.assigneeName || "";
        const deadline = t.HanChot ? new Date(t.HanChot).toLocaleDateString("vi-VN") : "";
        const isOverdue = t.HanChot && t.TrangThai !== "completed" && new Date(t.HanChot) < new Date();
        return `
          <div class="group-task-item p-3 rounded-xl bg-slate-50">
            <div class="flex items-center gap-2">
              <span class="priority-dot" style="background:${prioColors[prio]}" title="${prioLabels[prio]}"></span>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-semibold text-slate-800 truncate">${t.TieuDe}</div>
              </div>
              <span class="task-status-badge ${statusClass}" onclick="GroupDetailSection.cycleStatus(${t.GroupTaskID},'${t.TrangThai}')" title="Nhấn để đổi trạng thái">
                <i class="${statusIcon} mr-0.5"></i>${statusLabel}
              </span>
              <button onclick="GroupDetailSection.deleteTask(${t.GroupTaskID})" class="text-xs text-slate-300 hover:text-red-500 transition"><i class="fas fa-times"></i></button>
            </div>
            <div class="flex items-center gap-3 mt-1.5 text-xs text-slate-400 ml-4">
              ${assignee ? `<span><i class="fas fa-user mr-1"></i>${assignee}</span>` : ""}
              ${deadline ? `<span class="${isOverdue ? "text-red-500 font-semibold" : ""}"><i class="fas fa-calendar-alt mr-1"></i>${deadline}${isOverdue ? " (quá hạn)" : ""}</span>` : ""}
              ${t.MoTa ? `<span class="truncate max-w-[150px]" title="${t.MoTa}"><i class="fas fa-align-left mr-1"></i>${t.MoTa}</span>` : ""}
            </div>
          </div>`;
      }).join("");
    },
  };
})();
