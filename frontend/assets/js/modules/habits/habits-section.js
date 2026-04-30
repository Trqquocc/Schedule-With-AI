/**
 * habits-section.js
 * Habit Tracker section controller.
 * Depends on: calendar-heatmap.js
 */
window.HabitsSection = {
  habits: [],
  selectedHabitId: null,
  currentYear: new Date().getFullYear(),
  _initialized: false,

  async init() {
    if (this._initialized) {
      // Re-render on revisit without full reload
      this.renderTodayList();
      return;
    }
    this._initialized = true;
    await this.loadHabits();
    this.renderTodayList();
    this.bindEvents();
    // Auto-select first habit for heatmap if any
    if (this.habits.length > 0) {
      this.selectedHabitId = this.habits[0].HabitID;
      await this.loadHeatmap(this.selectedHabitId);
      this._renderHabitSelector();
    }
  },

  _authHeader() {
    const token = localStorage.getItem("auth_token");
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  },

  async loadHabits() {
    if (!localStorage.getItem("auth_token")) { this.habits = []; return; }
    try {
      const res = await fetch("/api/habits", { headers: this._authHeader() });
      const json = await res.json();
      if (json.success) this.habits = json.data || [];
    } catch (err) {
      this.habits = [];
    }
  },

  renderTodayList() {
    const list = document.getElementById("habit-today-list");
    if (!list) return;

    if (this.habits.length === 0) {
      list.innerHTML = `
        <div class="habits-empty">
          <div class="empty-icon"><i class="fas fa-seedling"></i></div>
          <p style="font-weight:600;font-size:15px;color:#64748b;">Chưa có thói quen nào</p>
          <p style="font-size:13px;margin-top:4px;">Nhấn "Thêm thói quen" để bắt đầu hành trình</p>
        </div>`;
      return;
    }

    list.innerHTML = "";
    this.habits.forEach((h) => {
      const row = this._buildHabitRow(h);
      list.appendChild(row);
    });
  },

  _buildHabitRow(h) {
    const row = document.createElement("div");
    row.className = "habit-row" + (h.completedToday ? " done" : "");
    row.dataset.habitId = h.HabitID;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "habit-checkbox";
    checkbox.checked = !!h.completedToday;
    checkbox.title = h.completedToday ? "Đánh dấu chưa hoàn thành" : "Hoàn thành hôm nay";
    checkbox.addEventListener("change", async (e) => {
      e.stopPropagation();
      if (!window.Utils?.requireAuth()) { checkbox.checked = !checkbox.checked; return; }
      const today = new Date().toISOString().split("T")[0];
      await this.toggleHabit(h.HabitID, today, checkbox.checked);
    });

    const icon = document.createElement("span");
    icon.className = "habit-icon";
    const iconClass = h.BieuTuong || "fas fa-bullseye";
    if (iconClass.startsWith("fas ") || iconClass.startsWith("far ") || iconClass.startsWith("fab ")) {
      icon.innerHTML = `<i class="${iconClass}"></i>`;
    } else {
      icon.textContent = iconClass;
    }

    const name = document.createElement("span");
    name.className = "habit-name";
    name.textContent = h.TenThoiQuen;

    const streak = document.createElement("span");
    streak.className = "streak-badge";
    streak.innerHTML = `<i class="fas fa-fire"></i> ${h.Streak || 0}`;

    const actions = document.createElement("div");
    actions.className = "habit-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "habit-action-btn";
    editBtn.title = "Chỉnh sửa";
    editBtn.innerHTML = '<i class="fas fa-pen"></i>';
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.openModal(h);
    });

    const delBtn = document.createElement("button");
    delBtn.className = "habit-action-btn delete";
    delBtn.title = "Xóa";
    delBtn.innerHTML = '<i class="fas fa-trash"></i>';
    delBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await this.deleteHabit(h.HabitID);
    });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    row.appendChild(checkbox);
    row.appendChild(icon);
    row.appendChild(name);
    row.appendChild(streak);
    row.appendChild(actions);

    // Click row = select for heatmap
    row.addEventListener("click", async () => {
      if (this.selectedHabitId !== h.HabitID) {
        this.selectedHabitId = h.HabitID;
        this._renderHabitSelector();
        await this.loadHeatmap(h.HabitID);
      }
    });

    return row;
  },

  async toggleHabit(habitId, date, completed) {
    try {
      let streak = 0;
      if (completed) {
        const res = await fetch(`/api/habits/${habitId}/log`, {
          method: "POST",
          headers: this._authHeader(),
          body: JSON.stringify({ date }),
        });
        const json = await res.json();
        if (json.success) streak = json.data?.streak ?? 0;
      } else {
        const res = await fetch(`/api/habits/${habitId}/log/${date}`, {
          method: "DELETE",
          headers: this._authHeader(),
        });
        const json = await res.json();
        if (json.success) streak = json.data?.streak ?? 0;
      }

      // Update local state
      const habit = this.habits.find((h) => h.HabitID === habitId);
      if (habit) {
        habit.completedToday = completed;
        habit.Streak = streak;
      }
      this.renderTodayList();

      // Reload heatmap if this habit is selected
      if (this.selectedHabitId === habitId) {
        await this.loadHeatmap(habitId);
      }
    } catch (err) {
      console.error("Lỗi toggleHabit:", err);
    }
  },

  async loadHeatmap(habitId) {
    const container = document.getElementById("habit-heatmap");
    if (!container) return;

    const yearLabel = document.getElementById("heatmap-year-label");
    if (yearLabel) yearLabel.textContent = this.currentYear;

    if (!habitId) {
      container.innerHTML =
        '<p style="text-align:center;color:#94a3b8;font-size:13px;padding:24px;">Chọn một thói quen để xem heatmap</p>';
      return;
    }

    container.innerHTML =
      '<p style="text-align:center;color:#94a3b8;font-size:13px;padding:24px;">Đang tải...</p>';

    try {
      const res = await fetch(
        `/api/habits/${habitId}/heatmap?year=${this.currentYear}`,
        { headers: this._authHeader() }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      // Map data: completed=true → value 1, false → 0, build ratio per day (binary habit)
      const data = (json.data || []).map((d) => ({
        date: d.date,
        value: d.completed ? 1 : d.completed === false && this._isPast(d.date) ? 0 : null,
      }));

      const habit = this.habits.find((h) => h.HabitID === habitId);
      window.CalendarHeatmap.render("habit-heatmap", data, {
        year: this.currentYear,
        tooltipFn: (date, value) => {
          const name = habit ? habit.TenThoiQuen : "Thói quen";
          if (value === null) return `${date}: Không có dữ liệu`;
          return `${date} — ${name}: ${value === 1 ? "Hoàn thành ✓" : "Chưa hoàn thành"}`;
        },
      });
    } catch (err) {
      console.error("Lỗi loadHeatmap:", err);
      container.innerHTML =
        '<p style="text-align:center;color:#ef4444;font-size:13px;padding:24px;">Lỗi tải dữ liệu</p>';
    }
  },

  _isPast(dateStr) {
    const today = new Date().toISOString().split("T")[0];
    return dateStr < today;
  },

  _renderHabitSelector() {
    const el = document.getElementById("habit-selector-row");
    if (!el) return;
    el.innerHTML = "";
    this.habits.forEach((h) => {
      const btn = document.createElement("button");
      btn.className =
        "habit-select-btn" + (h.HabitID === this.selectedHabitId ? " active" : "");
      btn.textContent = `${h.BieuTuong || "📌"} ${h.TenThoiQuen}`;
      btn.addEventListener("click", async () => {
        this.selectedHabitId = h.HabitID;
        this._renderHabitSelector();
        await this.loadHeatmap(h.HabitID);
      });
      el.appendChild(btn);
    });
  },

  openModal(habit = null) {
    const existing = document.getElementById("habitModalOverlay");
    if (existing) existing.remove();

    const HABIT_ICONS = [
      { icon: "fas fa-bullseye", label: "Mục tiêu" },
      { icon: "fas fa-dumbbell", label: "Tập luyện" },
      { icon: "fas fa-running", label: "Chạy bộ" },
      { icon: "fas fa-book", label: "Đọc sách" },
      { icon: "fas fa-spa", label: "Thiền" },
      { icon: "fas fa-tint", label: "Uống nước" },
      { icon: "fas fa-apple-alt", label: "Ăn lành" },
      { icon: "fas fa-bed", label: "Ngủ sớm" },
      { icon: "fas fa-pen", label: "Viết" },
      { icon: "fas fa-crosshairs", label: "Tập trung" },
      { icon: "fas fa-music", label: "Âm nhạc" },
      { icon: "fas fa-leaf", label: "Thiên nhiên" },
      { icon: "fas fa-fire", label: "Streak" },
      { icon: "fas fa-broom", label: "Dọn dẹp" },
      { icon: "fas fa-pills", label: "Thuốc" },
      { icon: "fas fa-bicycle", label: "Xe đạp" },
      { icon: "fas fa-heartbeat", label: "Sức khỏe" },
      { icon: "fas fa-brain", label: "Tư duy" },
      { icon: "fas fa-sun", label: "Dậy sớm" },
      { icon: "fas fa-code", label: "Lập trình" },
      { icon: "fas fa-pray", label: "Cầu nguyện" },
      { icon: "fas fa-walking", label: "Đi bộ" },
      { icon: "fas fa-guitar", label: "Guitar" },
      { icon: "fas fa-palette", label: "Sáng tạo" },
    ];

    let selectedIcon = habit?.BieuTuong || "fas fa-bullseye";

    const overlay = document.createElement("div");
    overlay.id = "habitModalOverlay";
    overlay.className = "habit-modal-overlay";

    const panel = document.createElement("div");
    panel.className = "habit-modal-panel";

    // Header
    const header = document.createElement("div");
    header.style.cssText =
      "background:var(--accent-header, linear-gradient(135deg,#2563EB,#1d4ed8));padding:20px 24px;display:flex;align-items:center;justify-content:space-between;";
    const title = document.createElement("h3");
    title.style.cssText = "color:#fff;font-size:17px;font-weight:700;margin:0;";
    title.textContent = habit ? "Chỉnh sửa thói quen" : "Thêm thói quen mới";
    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.style.cssText =
      "background:rgba(255,255,255,0.2);border:none;color:#fff;width:32px;height:32px;" +
      "border-radius:8px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;";
    closeBtn.onclick = () => overlay.remove();
    header.appendChild(title);
    header.appendChild(closeBtn);

    // Body
    const body = document.createElement("div");
    body.style.cssText = "padding:20px 24px;";

    // Name input
    body.innerHTML += `
      <label style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px;">Tên thói quen</label>
      <input id="hm-name" type="text" maxlength="80" placeholder="VD: Uống đủ nước mỗi ngày"
        value="${habit ? habit.TenThoiQuen.replace(/"/g, "&quot;") : ""}"
        style="width:100%;margin-top:6px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;outline:none;box-sizing:border-box;margin-bottom:16px;" />

      <label style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px;">Biểu tượng</label>
      <div id="hm-emoji-grid" class="emoji-picker-grid"></div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px;">
        <div>
          <label style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px;">Tần suất</label>
          <select id="hm-freq" style="width:100%;margin-top:6px;padding:9px 10px;border:1px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none;background:#fff;">
            <option value="daily" ${(!habit || habit.TanSuat === "daily") ? "selected" : ""}>Hàng ngày</option>
            <option value="weekly" ${habit?.TanSuat === "weekly" ? "selected" : ""}>Hàng tuần</option>
          </select>
        </div>
        <div>
          <label style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px;">Mục tiêu (lần/kỳ)</label>
          <input id="hm-target" type="number" min="1" max="99" value="${habit ? habit.MucTieu : 1}"
            style="width:100%;margin-top:6px;padding:9px 10px;border:1px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none;box-sizing:border-box;" />
        </div>
      </div>`;

    // Build icon grid
    setTimeout(() => {
      const grid = document.getElementById("hm-emoji-grid");
      if (!grid) return;
      HABIT_ICONS.forEach((entry) => {
        const item = document.createElement("div");
        item.className = "emoji-picker-item" + (entry.icon === selectedIcon ? " selected" : "");
        item.title = entry.label;
        item.innerHTML = `<i class="${entry.icon}"></i>`;
        item.addEventListener("click", () => {
          selectedIcon = entry.icon;
          grid.querySelectorAll(".emoji-picker-item").forEach((el) =>
            el.classList.remove("selected")
          );
          item.classList.add("selected");
        });
        grid.appendChild(item);
      });
    }, 0);

    // Footer
    const footer = document.createElement("div");
    footer.style.cssText =
      "padding:12px 24px 20px;display:flex;gap:10px;justify-content:flex-end;";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Hủy";
    cancelBtn.style.cssText =
      "padding:9px 20px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;font-size:14px;color:#475569;";
    cancelBtn.onclick = () => overlay.remove();

    const saveBtn = document.createElement("button");
    saveBtn.textContent = habit ? "Lưu thay đổi" : "Thêm thói quen";
    saveBtn.style.cssText =
      "padding:9px 20px;border-radius:10px;border:none;background:var(--accent, #2563EB);" +
      "color:#fff;cursor:pointer;font-size:14px;font-weight:600;";
    saveBtn.onclick = async () => {
      const name = document.getElementById("hm-name")?.value?.trim();
      const freq = document.getElementById("hm-freq")?.value;
      const target = document.getElementById("hm-target")?.value;
      if (!name) {
        document.getElementById("hm-name")?.focus();
        return;
      }
      saveBtn.disabled = true;
      saveBtn.textContent = "Đang lưu...";
      await this.saveHabit({ name, icon: selectedIcon, frequency: freq, target }, habit?.HabitID);
      overlay.remove();
    };

    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);

    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(footer);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
    const escHandler = (e) => {
      if (e.key === "Escape") { overlay.remove(); document.removeEventListener("keydown", escHandler); }
    };
    document.addEventListener("keydown", escHandler);

    setTimeout(() => document.getElementById("hm-name")?.focus(), 50);
  },

  async saveHabit(formData, habitId = null) {
    try {
      const url = habitId ? `/api/habits/${habitId}` : "/api/habits";
      const method = habitId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: this._authHeader(),
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      await this.loadHabits();
      this.renderTodayList();
      this._renderHabitSelector();

      // Auto-select new habit for heatmap
      if (!habitId && json.data?.HabitID) {
        this.selectedHabitId = json.data.HabitID;
        this._renderHabitSelector();
        await this.loadHeatmap(this.selectedHabitId);
      } else if (habitId && this.selectedHabitId === habitId) {
        await this.loadHeatmap(habitId);
      }
    } catch (err) {
      console.error("Lỗi saveHabit:", err);
      Utils?.alert?.(err.message, "Lỗi lưu thói quen", "error");
    }
  },

  async deleteHabit(id) {
    if (!await Utils.confirmDanger("Xoá thói quen này?", "Xoá thói quen")) return;
    try {
      const res = await fetch(`/api/habits/${id}`, {
        method: "DELETE",
        headers: this._authHeader(),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      await this.loadHabits();
      this.renderTodayList();
      this._renderHabitSelector();

      if (this.selectedHabitId === id) {
        this.selectedHabitId = this.habits.length > 0 ? this.habits[0].HabitID : null;
        this._renderHabitSelector();
        await this.loadHeatmap(this.selectedHabitId);
      }
    } catch (err) {
      console.error("Lỗi deleteHabit:", err);
    }
  },

  bindEvents() {
    const addBtn = document.getElementById("habit-add-btn");
    addBtn?.addEventListener("click", () => { if (!window.Utils?.requireAuth()) return; this.openModal(); });

    const prevBtn = document.getElementById("heatmap-prev-year");
    prevBtn?.addEventListener("click", async () => {
      this.currentYear--;
      const label = document.getElementById("heatmap-year-label");
      if (label) label.textContent = this.currentYear;
      await this.loadHeatmap(this.selectedHabitId);
    });

    const nextBtn = document.getElementById("heatmap-next-year");
    nextBtn?.addEventListener("click", async () => {
      this.currentYear++;
      const label = document.getElementById("heatmap-year-label");
      if (label) label.textContent = this.currentYear;
      await this.loadHeatmap(this.selectedHabitId);
    });
  },
};
