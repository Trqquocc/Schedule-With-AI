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
      const me = this.current?.members?.find((m) => m.UserID === this.currentUser);
      return me && (me.VaiTro === "owner" || me.VaiTro === "admin");
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
      const g = this.current.group;
      const members = this.current.members || [];
      const canManage = this._isOwnerOrAdmin();

      el.innerHTML = `
        ${R.detailHeader(g, members)}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
          ${R.membersPanel(members, canManage)}
          ${R.tasksPanel(members, this.tasks)}
        </div>`;
    },

    // ── Member actions ──

    showAddMember() {
      const form = document.getElementById("add-member-form");
      if (!form) return;
      form.classList.toggle("hidden");
      if (!form.classList.contains("hidden")) document.getElementById("add-member-email")?.focus();
    },

    async addMember() {
      const emailEl = document.getElementById("add-member-email");
      const email = emailEl?.value.trim();
      if (!email) { Utils?.showToast?.("Nhập email thành viên", "error"); return; }
      try {
        const searchRes = await this._api(`/api/friends/search?q=${encodeURIComponent(email)}`);
        const user = (searchRes.data || []).find((u) => u.Email === email);
        if (!user) throw new Error("Không tìm thấy người dùng với email này");
        await this._api(`/api/groups/${this.current.group.GroupID}/members`, {
          method: "POST",
          body: JSON.stringify({ userId: user.UserID }),
        });
        if (emailEl) emailEl.value = "";
        Utils?.showToast?.("Đã thêm thành viên!", "success");
        await this.load(this.current.group.GroupID);
      } catch (err) { Utils?.showToast?.(err.message, "error"); }
    },

    async removeMember(userId, name) {
      const ok = await Utils?.confirmDanger?.(`Xoá "${name}" khỏi nhóm?`, "Xoá thành viên");
      if (!ok) return;
      try {
        await this._api(`/api/groups/${this.current.group.GroupID}/members/${userId}`, { method: "DELETE" });
        Utils?.showToast?.("Đã xoá thành viên", "info");
        await this.load(this.current.group.GroupID);
      } catch (err) { Utils?.showToast?.(err.message, "error"); }
    },

    // ── Task actions ──

    showAddTask() { document.getElementById("add-task-form")?.classList.remove("hidden"); },
    hideAddTask() { document.getElementById("add-task-form")?.classList.add("hidden"); },

    async addTask() {
      const title = document.getElementById("task-title-input")?.value.trim();
      const assignedTo = document.getElementById("task-assignee-input")?.value || null;
      const priority = parseInt(document.getElementById("task-priority-input")?.value || "2", 10);
      if (!title) { Utils?.showToast?.("Nhập tiêu đề công việc", "error"); return; }
      try {
        await this._api("/api/group-tasks", {
          method: "POST",
          body: JSON.stringify({
            groupId: this.current.group.GroupID,
            tieuDe: title,
            assignedTo: assignedTo || undefined,
            mucDoUuTien: priority,
          }),
        });
        this.hideAddTask();
        Utils?.showToast?.("Đã tạo công việc!", "success");
        await this.load(this.current.group.GroupID);
      } catch (err) { Utils?.showToast?.(err.message, "error"); }
    },

    async cycleStatus(taskId, current) {
      const next = { pending: "in_progress", in_progress: "completed", completed: "pending" };
      try {
        await this._api(`/api/group-tasks/${taskId}`, {
          method: "PUT",
          body: JSON.stringify({ trangThai: next[current] || "pending" }),
        });
        await this.load(this.current.group.GroupID);
      } catch (err) { Utils?.showToast?.(err.message, "error"); }
    },

    async deleteTask(taskId) {
      const ok = await Utils?.confirmDanger?.("Xoá công việc này?", "Xoá công việc");
      if (!ok) return;
      try {
        await this._api(`/api/group-tasks/${taskId}`, { method: "DELETE" });
        Utils?.showToast?.("Đã xoá công việc", "info");
        await this.load(this.current.group.GroupID);
      } catch (err) { Utils?.showToast?.(err.message, "error"); }
    },
  };

  window.GroupDetailSection = GroupDetailSection;
})();
