// group-detail-section.js — Group detail controller: data loading, member/task actions
(function () {
  "use strict";

  const GroupDetailSection = {
    current: null,  // { group, members[] }
    tasks: [],
    currentUser: null,

    _authHeader() {
      const token = localStorage.getItem("auth_token");
      return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    },

    async _api(path, opts = {}) {
      const res = await fetch(path, { headers: this._authHeader(), ...opts });
      const json = await res.json().catch(() => ({ success: false }));
      if (!res.ok || !json.success) throw new Error(json.message || "Lỗi");
      return json;
    },

    _currentUserId() {
      try {
        const token = localStorage.getItem("auth_token");
        return JSON.parse(atob(token.split(".")[1])).id;
      } catch { return null; }
    },

    _isOwnerOrAdmin() {
      const role = this.current?.myRole;
      return role === "owner" || role === "admin";
    },

    async load(groupId) {
      this.currentUser = this._currentUserId();

      // Wire back button once
      const backBtn = document.getElementById("back-to-groups");
      if (backBtn) backBtn.onclick = () => GroupListSection.backToList();

      const el = document.getElementById("group-detail-content");
      if (el) el.innerHTML = `<p class="text-slate-400 text-sm text-center py-10">Đang tải...</p>`;

      try {
        const [detailRes, tasksRes] = await Promise.all([
          this._api(`/api/groups/${groupId}`),
          this._api(`/api/group-tasks?groupId=${groupId}`),
        ]);
        this.current = detailRes.data;
        this.tasks = tasksRes.data || [];
      } catch (err) {
        if (el) el.innerHTML = `<p class="text-red-500 text-sm text-center py-10">${err.message}</p>`;
        return;
      }
      this._render();
    },

    _render() {
      const el = document.getElementById("group-detail-content");
      if (!el || !this.current) return;

      const R = window.GroupDetailRender;
      const g = this.current;
      const members = (this.current.members || []).map((m) => ({
        UserID: m.Users?.UserID || m.UserID,
        HoTen: m.Users?.HoTen || m.HoTen || "",
        Email: m.Users?.Email || m.Email || "",
        AvatarUrl: m.Users?.AvatarUrl || m.AvatarUrl || "",
        VaiTro: m.VaiTro,
        NgayThamGia: m.NgayThamGia,
      }));
      const canManage = this._isOwnerOrAdmin();

      el.innerHTML = `
        ${R.detailHeader(g, members)}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
          ${R.membersPanel(members, canManage)}
          ${R.tasksPanel(members, this.tasks)}
        </div>`;
    },

    // ── Member actions ──

    async showAddMember() {
      const form = document.getElementById("add-member-form");
      if (!form) return;
      const isHidden = form.classList.contains("hidden");
      form.classList.toggle("hidden");
      if (!isHidden) return;

      const list = document.getElementById("add-member-friends-list");
      if (!list) return;
      list.innerHTML = `<p class="text-xs text-slate-400 text-center py-3">Đang tải...</p>`;

      try {
        const friendsRes = await this._api("/api/friends");
        const friends = friendsRes.data || [];
        const memberIds = new Set((this.current.members || []).map((m) => m.Users?.UserID || m.UserID));
        const available = friends.filter((f) => !memberIds.has(f.UserID));

        if (!available.length) {
          list.innerHTML = `<p class="text-xs text-slate-400 text-center py-3">Không có bạn bè nào để thêm</p>`;
          return;
        }
        list.innerHTML = available.map((f) => {
          const initial = (f.HoTen || f.Email || "?")[0].toUpperCase();
          return `
            <div class="add-member-item flex items-center gap-2 p-2 rounded-xl cursor-pointer hover:bg-slate-100 transition"
              onclick="GroupDetailSection.addMemberById(${f.UserID}, '${(f.HoTen || "").replace(/'/g, "\\'")}')">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style="background:var(--accent,#2563EB)">${initial}</div>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-semibold text-slate-800 truncate">${f.HoTen || "Người dùng"}</div>
                <div class="text-xs text-slate-400 truncate">${f.Email || ""}</div>
              </div>
              <button class="text-xs px-2.5 py-1 rounded-lg font-semibold text-white flex-shrink-0" style="background:var(--accent,#2563EB)">
                <i class="fas fa-plus"></i>
              </button>
            </div>`;
        }).join("");
      } catch (err) {
        list.innerHTML = `<p class="text-xs text-red-500 text-center py-3">${err.message}</p>`;
      }
    },

    async addMemberById(userId, name) {
      try {
        await this._api(`/api/groups/${this.current.GroupID}/members`, {
          method: "POST",
          body: JSON.stringify({ userId }),
        });
        Utils?.showToast?.(`Đã thêm ${name}!`, "success");
        await this.load(this.current.GroupID);
      } catch (err) { Utils?.showToast?.(err.message, "error"); }
    },

    async removeMember(userId, name) {
      const ok = await Utils?.confirmDanger?.(`Xoá "${name}" khỏi nhóm?`, "Xoá thành viên");
      if (!ok) return;
      try {
        await this._api(`/api/groups/${this.current.GroupID}/members/${userId}`, { method: "DELETE" });
        Utils?.showToast?.("Đã xoá thành viên", "info");
        await this.load(this.current.GroupID);
      } catch (err) { Utils?.showToast?.(err.message, "error"); }
    },

    // ── Task actions ──

    showAddTask() { document.getElementById("add-task-form")?.classList.remove("hidden"); },
    hideAddTask() { document.getElementById("add-task-form")?.classList.add("hidden"); },

    async addTask() {
      const title = document.getElementById("task-title-input")?.value.trim();
      const desc = document.getElementById("task-desc-input")?.value.trim();
      const assignedTo = document.getElementById("task-assignee-input")?.value;
      const priority = parseInt(document.getElementById("task-priority-input")?.value || "2", 10);
      const deadline = document.getElementById("task-deadline-input")?.value || null;
      if (!title) { Utils?.showToast?.("Nhập tiêu đề công việc", "error"); return; }
      if (!assignedTo) { Utils?.showToast?.("Chọn người thực hiện", "error"); return; }
      try {
        await this._api("/api/group-tasks", {
          method: "POST",
          body: JSON.stringify({
            groupId: this.current.GroupID,
            tieuDe: title,
            moTa: desc || undefined,
            assignedTo: parseInt(assignedTo, 10),
            mucDoUuTien: priority,
            hanChot: deadline || undefined,
          }),
        });
        this.hideAddTask();
        Utils?.showToast?.("Đã tạo công việc!", "success");
        await this.load(this.current.GroupID);
      } catch (err) { Utils?.showToast?.(err.message, "error"); }
    },

    async cycleStatus(taskId, current) {
      const next = { pending: "in_progress", in_progress: "completed", completed: "pending" };
      try {
        await this._api(`/api/group-tasks/${taskId}`, {
          method: "PUT",
          body: JSON.stringify({ trangThai: next[current] || "pending" }),
        });
        await this.load(this.current.GroupID);
      } catch (err) { Utils?.showToast?.(err.message, "error"); }
    },

    async deleteTask(taskId) {
      const ok = await Utils?.confirmDanger?.("Xoá công việc này?", "Xoá công việc");
      if (!ok) return;
      try {
        await this._api(`/api/group-tasks/${taskId}`, { method: "DELETE" });
        Utils?.showToast?.("Đã xoá công việc", "info");
        await this.load(this.current.GroupID);
      } catch (err) { Utils?.showToast?.(err.message, "error"); }
    },
  };

  window.GroupDetailSection = GroupDetailSection;
})();
