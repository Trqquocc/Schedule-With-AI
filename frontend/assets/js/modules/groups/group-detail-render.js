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
        <div id="add-member-form" class="hidden mb-3 flex gap-2">
          <input id="add-member-email" type="text" placeholder="Email thành viên..."
            class="flex-1 px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-1" />
          <button onclick="GroupDetailSection.addMember()" class="px-3 py-2 rounded-xl text-xs font-semibold text-white" style="background:var(--accent,#2563EB)">Thêm</button>
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
      return `
        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm font-semibold text-slate-800"><i class="fas fa-tasks mr-1" style="color:var(--accent,#2563EB)"></i>Công việc</p>
            <button onclick="GroupDetailSection.showAddTask()" class="text-xs px-3 py-1.5 rounded-lg font-semibold text-white" style="background:var(--accent,#2563EB)"><i class="fas fa-plus mr-1"></i>Thêm</button>
          </div>
          <div id="add-task-form" class="hidden mb-3 space-y-2">
            <input id="task-title-input" type="text" placeholder="Tiêu đề công việc *"
              class="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-1" />
            <select id="task-assignee-input" class="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none">
              <option value="">-- Giao cho --</option>${memberOpts}
            </select>
            <select id="task-priority-input" class="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none">
              <option value="2">Ưu tiên bình thường</option>
              <option value="1">Khẩn cấp</option>
              <option value="3">Thấp</option>
            </select>
            <div class="flex gap-2 justify-end">
              <button onclick="GroupDetailSection.hideAddTask()" class="px-3 py-1.5 rounded-lg text-xs border border-slate-200 text-slate-500">Huỷ</button>
              <button onclick="GroupDetailSection.addTask()" class="px-3 py-1.5 rounded-xl text-xs font-semibold text-white" style="background:var(--accent,#2563EB)">Tạo</button>
            </div>
          </div>
          <div class="group-tasks-list space-y-2">${this.taskRows(tasks)}</div>
        </div>`;
    },

    taskRows(tasks) {
      if (!tasks.length) return `<p class="text-xs text-slate-400 text-center py-4">Chưa có công việc</p>`;
      const statusMap = { pending: ["Chờ", "status-pending"], in_progress: ["Đang làm", "status-progress"], completed: ["Xong", "status-done"] };
      const prioColors = ["", "#ef4444", "#f59e0b", "#3b82f6", "#94a3b8"];
      return tasks.map((t) => {
        const [statusLabel, statusClass] = statusMap[t.TrangThai] || ["Chờ", "status-pending"];
        const prio = Math.min(4, Math.max(1, t.MucDoUuTien || 2));
        return `
          <div class="group-task-item flex items-center gap-2 p-2.5 rounded-xl bg-slate-50">
            <span class="priority-dot" style="background:${prioColors[prio]}"></span>
            <div class="flex-1 min-w-0">
              <div class="text-xs font-semibold text-slate-800 truncate">${t.TieuDe}</div>
              ${t.Assignee?.HoTen || t.assigneeName ? `<div class="text-xs text-slate-400">${t.Assignee?.HoTen || t.assigneeName}</div>` : ""}
            </div>
            <span class="task-status-badge ${statusClass}" onclick="GroupDetailSection.cycleStatus(${t.GroupTaskID},'${t.TrangThai}')">${statusLabel}</span>
            <button onclick="GroupDetailSection.deleteTask(${t.GroupTaskID})" class="text-xs text-slate-300 hover:text-red-500 transition"><i class="fas fa-times"></i></button>
          </div>`;
      }).join("");
    },
  };
})();
