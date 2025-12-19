(function () {
  "use strict";

  if (window.WorkManager) {
    console.log("⏭️ WorkManager already loaded");
    return;
  }

  window.WorkManager = {
    initialized: false,
    eventListeners: [],

    async init() {
      if (this.initialized) {
        console.log(" WorkManager already initialized");
        return;
      }

      console.log(" Khởi tạo WorkManager...");
      this.initialized = true;

      if (!(await this.waitForContainer())) {
        this.showErrorState();
        return;
      }

      await this.loadTasks();
      this.setupGlobalEvents();
    },

    async waitForContainer(retries = 10, delay = 100) {
      return new Promise((resolve) => {
        const checkContainer = (attempt = 0) => {
          const container = document.getElementById("work-items-container");
          if (container) {
            console.log(" Work container found");
            this.hideErrorState();
            resolve(true);
          } else if (attempt < retries) {
            setTimeout(() => checkContainer(attempt + 1), delay);
          } else {
            console.error(" Work container not found");
            resolve(false);
          }
        };
        checkContainer();
      });
    },

    showErrorState() {
      const errorContainer = document.getElementById("work-error-container");
      const workContainer = document.getElementById("work-items-container");

      if (errorContainer) errorContainer.classList.remove("hidden");
      if (workContainer) workContainer.style.display = "none";
    },

    hideErrorState() {
      const errorContainer = document.getElementById("work-error-container");
      const workContainer = document.getElementById("work-items-container");

      if (errorContainer) errorContainer.classList.add("hidden");
      if (workContainer) workContainer.style.display = "block";
    },

    async loadTasks() {
      try {
        console.log("📡 Loading tasks...");

        if (typeof Utils === "undefined") {
          throw new Error("Utils module not available");
        }

        const result = await Utils.makeRequest("/api/tasks", "GET");

        if (!result.success) {
          throw new Error(result.message || "Lỗi tải công việc");
        }

        const tasks = result.data || [];
        this.renderTasks(tasks);
      } catch (err) {
        console.error(" Error loading tasks:", err);
        this.showErrorState();
        if (typeof Utils !== "undefined" && Utils.showToast) {
          Utils.showToast(err.message || "Không thể tải công việc", "error");
        }
      }
    },

    reload() {
      console.log("🔄 Reloading tasks...");
      this.loadTasks();
    },

    showSuccessOverlayTimeout: null,
    hideSuccessOverlayTimeout: null,

    showSuccessOverlay(message = "Thành công!") {
      if (this.showSuccessOverlayTimeout) {
        clearTimeout(this.showSuccessOverlayTimeout);
        this.showSuccessOverlayTimeout = null;
      }

      if (this.hideSuccessOverlayTimeout) {
        clearTimeout(this.hideSuccessOverlayTimeout);
        this.hideSuccessOverlayTimeout = null;
      }

      let overlay = document.getElementById("success-overlay");
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "success-overlay";
        overlay.className =
          "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[10060] hidden transition-opacity duration-300";
        overlay.innerHTML = `
      <div class="bg-white rounded-xl p-8 max-w-md mx-4 shadow-2xl transform transition-all duration-300 scale-95 opacity-0">
        <div class="text-center">
          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-check text-green-600 text-2xl"></i>
          </div>
          <h3 id="overlay-title" class="text-xl font-bold text-gray-800 mb-2">${message}</h3>
          <p id="overlay-description" class="text-gray-600 mb-6">Thao tác đã được thực hiện thành công!</p>
          <button id="close-overlay-btn" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
            Đóng
          </button>
        </div>
      </div>
    `;
        document.body.appendChild(overlay);

        document
          .getElementById("close-overlay-btn")
          .addEventListener("click", () => {
            this.hideSuccessOverlay();
          });

        overlay.addEventListener("click", (e) => {
          if (e.target === overlay) {
            this.hideSuccessOverlay();
          }
        });
      }

      const overlayTitle = document.getElementById("overlay-title");
      if (overlayTitle) {
        overlayTitle.textContent = message;
      }

      this.hideSuccessOverlayImmediately();

      this.showSuccessOverlayTimeout = setTimeout(() => {
        overlay.classList.remove("hidden");
        this.showSuccessOverlayTimeout = setTimeout(() => {
          const content = overlay.querySelector("div > div");
          content.classList.remove("scale-95", "opacity-0");
          content.classList.add("scale-100", "opacity-100");
        }, 10);
      }, 10);

      this.hideSuccessOverlayTimeout = setTimeout(() => {
        this.hideSuccessOverlay();
      }, 3000);
    },

    hideSuccessOverlayImmediately() {
      const overlay = document.getElementById("success-overlay");
      if (overlay) {
        overlay.classList.add("hidden");
        const content = overlay.querySelector("div > div");
        content.classList.remove("scale-100", "opacity-100");
        content.classList.add("scale-95", "opacity-0");
      }
    },

    hideSuccessOverlay() {
      const overlay = document.getElementById("success-overlay");
      if (overlay) {
        overlay.classList.add("opacity-0");
        setTimeout(() => {
          overlay.remove();
        }, 300);
      }
    },

    renderTasks(tasks) {
      const container = document.getElementById("work-items-container");
      if (!container) {
        console.error(" No container for rendering tasks");
        return;
      }

      const getPriorityColor = (priority) => {
        const priorityColors = {
          1: "#34D399",
          2: "#60A5FA",
          3: "#FBBF24",
          4: "#F87171",
        };
        return priorityColors[priority] || "#60A5FA";
      };

      const getPriorityClass = (priority) => {
        const priorityMap = {
          1: "low",
          2: "medium",
          3: "high",
          4: "very-high",
        };
        return priorityMap[priority] || "medium";
      };

      const getPriorityText = (priority) => {
        const textMap = {
          1: "Thấp",
          2: "Trung bình",
          3: "Cao",
          4: "Rất cao",
        };
        return textMap[priority] || "Trung bình";
      };

      const loadingIndicator = document.getElementById("loading-indicator");
      if (loadingIndicator) {
        loadingIndicator.classList.add("hidden");
      }

      const emptyState = document.getElementById("empty-state-indicator");

      if (tasks.length === 0) {
        if (emptyState) {
          emptyState.classList.remove("hidden");
        }

        const table = container.querySelector(".work-table-container");
        if (table) {
          table.remove();
        }

        return;
      }
      if (emptyState) {
        emptyState.classList.add("hidden");
      }

      const pendingTasks = tasks.filter((task) => task.TrangThaiThucHien !== 2);
      const completedTasks = tasks.filter(
        (task) => task.TrangThaiThucHien === 2
      );

      let html = `
    <!-- Công việc đang chờ -->
    <div class="mb-10">
      <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <i class="fas fa-clock mr-2 text-yellow-500"></i>
        Công việc đang chờ (${pendingTasks.length})
      </h3>
      <div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
  `;

      if (pendingTasks.length === 0) {
        html += `
      <div class="text-center py-8">
        <i class="fas fa-check-circle text-4xl text-green-400 mb-2"></i>
        <p class="text-gray-500">Không có công việc đang chờ</p>
      </div>
    `;
      } else {
        html += `
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
              <input type="checkbox" id="select-all-pending" class="rounded">
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Công việc</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Ưu tiên</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Thời gian</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Thao tác</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
    `;

        pendingTasks.forEach((task) => {
          const taskId = task.ID || task.MaCongViec || 0;
          const priority = task.MucDoUuTien || 2;
          const priorityClass = getPriorityClass(priority);
          const priorityText = getPriorityText(priority);
          const categoryColor = getPriorityColor(priority);

          html += `
        <tr id="task-${taskId}" class="task-row" data-task-id="${taskId}">
          <td class="px-6 py-4 whitespace-nowrap">
            <input type="checkbox" class="task-checkbox pending-checkbox rounded">
          </td>
          <td class="px-6 py-4">
            <div class="flex items-center">
              <div class="flex-shrink-0 w-3 h-10 rounded-sm mr-3" style="background-color: ${categoryColor}"></div>
              <div>
                <div class="font-medium text-gray-900">${
                  task.TieuDe || ""
                }</div>
                ${
                  task.MoTa
                    ? `<div class="text-sm text-gray-600 mt-1">${task.MoTa}</div>`
                    : ""
                }
              </div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
              ${
                priorityClass === "very-high"
                  ? "bg-red-100 text-red-800"
                  : priorityClass === "high"
                  ? "bg-yellow-100 text-yellow-800"
                  : priorityClass === "medium"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-green-100 text-green-800"
              }">
              ${priorityText}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
            <i class="fas fa-clock mr-1"></i>${task.ThoiGianUocTinh || 60} phút
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <button type="button" class="action-btn-complete text-green-600 hover:text-green-900 mr-3"
                    data-task-id="${taskId}"
                    title="Hoàn thành">
              <i class="fas fa-check"></i> Hoàn thành
            </button>
            <button type="button" class="action-btn-edit text-blue-600 hover:text-blue-900 mr-3"
                    data-task-id="${taskId}"
                    title="Sửa">
              <i class="fas fa-edit"></i> Sửa
            </button>
            <button type="button" class="action-btn-delete text-red-600 hover:text-red-900"
                    data-task-id="${taskId}"
                    title="Xóa">
              <i class="fas fa-trash"></i> Xóa
            </button>
          </td>
        </tr>
      `;
        });

        html += `
        </tbody>
      </table>
    `;
      }

      html += `
      </div>
    </div>
  `;

      if (completedTasks.length > 0) {
        html += `
    <div>
      <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <i class="fas fa-check-circle mr-2 text-green-500"></i>
        Công việc đã hoàn thành (${completedTasks.length})
      </h3>
      <div class="bg-gray-50 rounded-lg shadow border border-gray-200 overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                <input type="checkbox" id="select-all-completed" class="rounded">
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Công việc</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Ưu tiên</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Thời gian</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Thao tác</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
    `;

        completedTasks.forEach((task) => {
          const taskId = task.ID || task.MaCongViec || 0;
          const priority = task.MucDoUuTien || 2;
          const priorityClass = getPriorityClass(priority);
          const priorityText = getPriorityText(priority);
          const categoryColor = getPriorityColor(priority);

          html += `
        <tr id="task-${taskId}" class="task-row completed-row" data-task-id="${taskId}">
          <td class="px-6 py-4 whitespace-nowrap">
            <input type="checkbox" class="task-checkbox completed-checkbox rounded">
          </td>
          <td class="px-6 py-4">
            <div class="flex items-center">
              <div class="flex-shrink-0 w-3 h-10 rounded-sm mr-3" style="background-color: ${categoryColor}"></div>
              <div>
                <div class="font-medium text-gray-500 line-through">${
                  task.TieuDe || ""
                }</div>
                ${
                  task.MoTa
                    ? `<div class="text-sm text-gray-400 mt-1 line-through">${task.MoTa}</div>`
                    : ""
                }
              </div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
              ${
                priorityClass === "very-high"
                  ? "bg-red-100 text-red-800"
                  : priorityClass === "high"
                  ? "bg-yellow-100 text-yellow-800"
                  : priorityClass === "medium"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-green-100 text-green-800"
              }">
              ${priorityText}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <i class="fas fa-clock mr-1"></i>${task.ThoiGianUocTinh || 60} phút
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <button type="button" class="action-btn-reopen text-yellow-600 hover:text-yellow-900 mr-3"
                    data-task-id="${taskId}"
                    title="Mở lại">
              <i class="fas fa-undo"></i> Mở lại
            </button>
            <button type="button" class="action-btn-edit text-blue-600 hover:text-blue-900 mr-3"
                    data-task-id="${taskId}"
                    title="Sửa">
              <i class="fas fa-edit"></i> Sửa
            </button>
            <button type="button" class="action-btn-delete text-red-600 hover:text-red-900"
                    data-task-id="${taskId}"
                    title="Xóa">
              <i class="fas fa-trash"></i> Xóa
            </button>
          </td>
        </tr>
      `;
        });

        html += `
          </tbody>
        </table>
      </div>
    </div>
  `;
      }

      container.innerHTML = html;

      setTimeout(() => {
        this.setupTableEvents();
        this.setupFilters();
        this.setupCreateTaskButton();
      }, 50);
    },

    setupGlobalEvents() {
      console.log("🔗 Setting up global events");

      this.removeEventListeners();

      const refreshBtn = document.getElementById("refresh-tasks-btn");
      if (refreshBtn) {
        const refreshHandler = (e) => {
          e.preventDefault();
          this.loadTasks();
        };
        refreshBtn.addEventListener("click", refreshHandler);
        this.eventListeners.push({
          element: refreshBtn,
          event: "click",
          handler: refreshHandler,
        });
      }

      this.setupCreateTaskButton();

      console.log(" Global events setup complete");
    },

    setupCreateTaskButton() {
      const createBtn = document.getElementById("create-task-btn");
      if (createBtn) {
        createBtn.removeEventListener("click", createBtn._handler);

        const createHandler = (e) => {
          e.preventDefault();
          if (window.ModalManager) {
            window.ModalManager.showModalById("createTaskModal");
          }
        };

        createBtn._handler = createHandler;
        createBtn.addEventListener("click", createHandler);

        this.eventListeners.push({
          element: createBtn,
          event: "click",
          handler: createHandler,
        });
      }
    },

    setupTableEvents() {
      console.log("🔗 Setting up table events with event delegation");

      const container = document.getElementById("work-items-container");
      if (!container) return;

      if (container._clickHandler) {
        container.removeEventListener("click", container._clickHandler);
      }

      const clickHandler = (e) => {
        const target = e.target;

        if (
          target.tagName === "BUTTON" &&
          target.classList.contains("action-btn-")
        ) {
          return;
        }

        const actionBtn = e.target.closest('[class*="action-btn-"]');
        if (!actionBtn || !actionBtn.dataset.taskId) return;

        const taskId = actionBtn.dataset.taskId;
        console.log(
          `🔘 Action clicked: ${actionBtn.className} for task ${taskId}`
        );

        e.preventDefault();
        e.stopPropagation();

        if (actionBtn.classList.contains("action-btn-complete")) {
          this.updateTaskStatus(taskId, true);
        } else if (actionBtn.classList.contains("action-btn-reopen")) {
          this.updateTaskStatus(taskId, false);
        } else if (actionBtn.classList.contains("action-btn-edit")) {
          this.editTask(taskId);
        } else if (actionBtn.classList.contains("action-btn-delete")) {
          this.deleteTask(taskId);
        }
      };

      container._clickHandler = clickHandler;
      container.addEventListener("click", clickHandler);

      const selectAllPending = document.getElementById("select-all-pending");
      if (selectAllPending) {
        const selectAllHandler = (e) => {
          const checkboxes = document.querySelectorAll(".pending-checkbox");
          checkboxes.forEach((cb) => (cb.checked = e.target.checked));
        };
        selectAllPending._handler = selectAllHandler;
        selectAllPending.addEventListener("change", selectAllHandler);
        this.eventListeners.push({
          element: selectAllPending,
          event: "change",
          handler: selectAllHandler,
        });
      }

      const selectAllCompleted = document.getElementById(
        "select-all-completed"
      );
      if (selectAllCompleted) {
        const selectAllHandler = (e) => {
          const checkboxes = document.querySelectorAll(".completed-checkbox");
          checkboxes.forEach((cb) => (cb.checked = e.target.checked));
        };
        selectAllCompleted._handler = selectAllHandler;
        selectAllCompleted.addEventListener("change", selectAllHandler);
        this.eventListeners.push({
          element: selectAllCompleted,
          event: "change",
          handler: selectAllHandler,
        });
      }

      console.log(" Table events setup complete");
    },

    setupFilters() {
      const statusFilter = document.getElementById("status-filter");
      const priorityFilter = document.getElementById("priority-filter");
      const searchInput = document.getElementById("task-search");

      if (statusFilter && statusFilter._changeHandler) {
        statusFilter.removeEventListener("change", statusFilter._changeHandler);
      }
      if (priorityFilter && priorityFilter._changeHandler) {
        priorityFilter.removeEventListener(
          "change",
          priorityFilter._changeHandler
        );
      }
      if (searchInput && searchInput._inputHandler) {
        searchInput.removeEventListener("input", searchInput._inputHandler);
      }

      if (statusFilter) {
        const changeHandler = () => this.filterTasks();
        statusFilter._changeHandler = changeHandler;
        statusFilter.addEventListener("change", changeHandler);
        this.eventListeners.push({
          element: statusFilter,
          event: "change",
          handler: changeHandler,
        });
      }

      if (priorityFilter) {
        const changeHandler = () => this.filterTasks();
        priorityFilter._changeHandler = changeHandler;
        priorityFilter.addEventListener("change", changeHandler);
        this.eventListeners.push({
          element: priorityFilter,
          event: "change",
          handler: changeHandler,
        });
      }

      if (searchInput) {
        const inputHandler = () => this.filterTasks();
        searchInput._inputHandler = inputHandler;
        searchInput.addEventListener("input", inputHandler);
        this.eventListeners.push({
          element: searchInput,
          event: "input",
          handler: inputHandler,
        });
      }
    },

    filterTasks() {
      const statusFilter =
        document.getElementById("status-filter")?.value || "all";
      const priorityFilter =
        document.getElementById("priority-filter")?.value || "all";
      const searchText =
        document.getElementById("task-search")?.value.toLowerCase() || "";

      const pendingRows = document.querySelectorAll(
        ".task-row:not(.completed-row)"
      );
      const completedRows = document.querySelectorAll(
        ".task-row.completed-row"
      );

      let visibleCount = 0;

      const processRow = (row) => {
        const taskId = row.dataset.taskId;
        const isCompleted = row.classList.contains("completed-row");

        const prioritySpan = row.querySelector("td:nth-child(3) span");
        let priorityValue = "medium";
        if (prioritySpan) {
          if (prioritySpan.classList.contains("bg-red-100"))
            priorityValue = "high";
          else if (prioritySpan.classList.contains("bg-green-100"))
            priorityValue = "low";
        }

        const title =
          row
            .querySelector("td:nth-child(2) .font-medium")
            ?.textContent.toLowerCase() || "";
        const description =
          row
            .querySelector("td:nth-child(2) .text-sm")
            ?.textContent.toLowerCase() || "";

        let statusMatch = true;
        if (statusFilter === "pending") {
          statusMatch = !isCompleted;
        } else if (statusFilter === "completed") {
          statusMatch = isCompleted;
        }

        let priorityMatch = true;
        if (priorityFilter !== "all") {
          priorityMatch = priorityValue === priorityFilter;
        }

        let searchMatch = true;
        if (searchText) {
          searchMatch =
            title.includes(searchText) || description.includes(searchText);
        }

        const shouldShow = statusMatch && priorityMatch && searchMatch;
        row.style.display = shouldShow ? "" : "none";

        if (shouldShow) visibleCount++;
      };

      pendingRows.forEach(processRow);
      completedRows.forEach(processRow);

      const pendingSection = document.querySelector(".mb-10");
      const completedSection = document.querySelector("div:not(.mb-10)");

      if (pendingSection) {
        const hasVisiblePending = Array.from(pendingRows).some(
          (row) => row.style.display !== "none"
        );
        pendingSection.style.display = hasVisiblePending ? "" : "none";
      }

      if (completedSection) {
        const hasVisibleCompleted = Array.from(completedRows).some(
          (row) => row.style.display !== "none"
        );
        completedSection.style.display = hasVisibleCompleted ? "" : "none";
      }
    },

    async updateTaskStatus(taskId, completed) {
      try {
        console.log(
          ` Updating task ${taskId} to ${completed ? "completed" : "pending"}`
        );

        if (typeof Utils === "undefined") {
          throw new Error("Utils module not available");
        }

        const result = await Utils.makeRequest(`/api/tasks/${taskId}`, "PUT", {
          TrangThaiThucHien: completed ? 2 : 0,
        });

        if (!result.success) {
          throw new Error(result.message || "Cập nhật thất bại");
        }

        this.triggerSidebarRefresh();

        const successMessage = completed
          ? "Đã hoàn thành công việc"
          : "Đã mở lại công việc";
        this.showSuccessOverlay(successMessage);

        await this.loadTasks();
      } catch (err) {
        console.error(" Error updating task:", err);
        if (typeof Utils !== "undefined" && Utils.showToast) {
          Utils.showToast("Cập nhật trạng thái thất bại", "error");
        }
      }
    },

    async deleteTask(taskId) {
      try {
        if (typeof Utils === "undefined") {
          throw new Error("Utils module not available");
        }

        const taskRow = document.getElementById(`task-${taskId}`);
        let taskTitle = "";

        if (taskRow) {
          taskTitle =
            taskRow.querySelector("td:nth-child(2) .font-medium")
              ?.textContent || "Công việc này";
        }

        if (typeof Swal === "undefined") {
          const confirmDelete = confirm(
            `Bạn có chắc chắn muốn xóa công việc "${taskTitle}"?`
          );
          if (!confirmDelete) {
            if (typeof Utils !== "undefined" && Utils.showToast) {
              Utils.showToast("Đã hủy xóa", "info");
            }
            return;
          }

          const result = await Utils.makeRequest(
            `/api/tasks/${taskId}`,
            "DELETE"
          );

          if (result.success) {
            if (typeof Utils !== "undefined" && Utils.showToast) {
              Utils.showToast("Đã xóa công việc thành công", "success");
            }
            await this.loadTasks();

            document.dispatchEvent(
              new CustomEvent("taskDeleted", {
                detail: { taskId: taskId },
              })
            );

            this.triggerSidebarRefresh();
          } else {
            throw new Error(result.message || "Xóa thất bại");
          }
          return;
        }

        const confirmation = await Swal.fire({
          title: "Xác nhận xóa",
          html: `Bạn có chắc chắn muốn xóa công việc "<strong>${taskTitle}</strong>"?`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#d33",
          cancelButtonColor: "#3085d6",
          confirmButtonText: "Xóa",
          cancelButtonText: "Hủy",
          reverseButtons: true,
        });

        if (!confirmation.isConfirmed) {
          if (typeof Utils !== "undefined" && Utils.showToast) {
            Utils.showToast("Đã hủy xóa", "info");
          }
          return;
        }

        const result = await Utils.makeRequest(
          `/api/tasks/${taskId}`,
          "DELETE"
        );

        if (result.success) {
          await Swal.fire({
            title: "Đã xóa!",
            text: result.message || "Công việc đã được xóa thành công.",
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          });

          const taskRow = document.getElementById(`task-${taskId}`);
          if (taskRow) {
            taskRow.style.animation = "fadeOut 0.3s ease-out forwards";
            setTimeout(() => {
              taskRow.remove();
            }, 300);
          }

          await this.loadTasks();
          document.dispatchEvent(
            new CustomEvent("taskDeleted", {
              detail: { taskId: taskId },
            })
          );
        } else {
          if (result.requireConfirmation) {
            const forceConfirmation = await Swal.fire({
              title: "Xác nhận thêm",
              html: `${result.message}<br><br>${result.details}<br><br>Bạn vẫn muốn xóa?`,
              icon: "warning",
              showCancelButton: true,
              confirmButtonColor: "#d33",
              cancelButtonColor: "#3085d6",
              confirmButtonText: "Vẫn xóa",
              cancelButtonText: "Hủy",
            });

            if (forceConfirmation.isConfirmed) {
              const forceResult = await Utils.makeRequest(
                `/api/tasks/${taskId}?force=true`,
                "DELETE"
              );

              if (forceResult.success) {
                await Swal.fire({
                  title: "Đã xóa!",
                  text:
                    forceResult.message || "Công việc đã được xóa thành công.",
                  icon: "success",
                  timer: 2000,
                  showConfirmButton: false,
                });

                await this.loadTasks();
                document.dispatchEvent(
                  new CustomEvent("taskDeleted", {
                    detail: { taskId: taskId },
                  })
                );
              } else {
                throw new Error(forceResult.message || "Xóa thất bại");
              }
            }
          } else {
            throw new Error(result.message || "Xóa thất bại");
          }
        }
      } catch (err) {
        console.error(" Error deleting task:", err);

        if (typeof Swal !== "undefined") {
          await Swal.fire({
            title: "Lỗi!",
            text: err.message || "Không thể xóa công việc. Vui lòng thử lại.",
            icon: "error",
            confirmButtonText: "Đóng",
          });
        } else if (typeof Utils !== "undefined" && Utils.showToast) {
          Utils.showToast(err.message || "Không thể xóa công việc", "error");
        }
      }
    },

    editTask(taskId) {
      console.log(`✏️ Editing task ${taskId}`);

      Utils.makeRequest(`/api/tasks/${taskId}`, "GET")
        .then((result) => {
          if (result.success && result.data) {
            console.log(" Task data loaded:", result.data);

            if (window.ModalManager && window.ModalManager.showModalById) {
              window.ModalManager.showModalById("createTaskModal");

              setTimeout(() => {
                if (window.loadTaskDataIntoForm) {
                  window.loadTaskDataIntoForm(result.data);
                  console.log(" Form loaded with task data");
                } else {
                  console.error(" loadTaskDataIntoForm function not found");
                  if (typeof Utils !== "undefined" && Utils.showToast) {
                    Utils.showToast("Không thể tải form chỉnh sửa", "error");
                  }
                }
              }, 500);
            } else {
              console.error(" ModalManager not found");
              if (typeof Utils !== "undefined" && Utils.showToast) {
                Utils.showToast("Không thể mở chỉnh sửa", "error");
              }
            }
          } else {
            console.error(" Task not found in response");
            if (typeof Utils !== "undefined" && Utils.showToast) {
              Utils.showToast("Không tìm thấy công việc", "error");
            }
          }
        })
        .catch((error) => {
          console.error(" Error loading task:", error);

          console.error("Error details:", {
            taskId: taskId,
            endpoint: `/api/tasks/${taskId}`,
            error: error.message,
            stack: error.stack,
          });

          if (typeof Utils !== "undefined" && Utils.showToast) {
            Utils.showToast("Lỗi tải công việc: " + error.message, "error");
          }
        });
    },

    removeEventListeners() {
      console.log(" Removing event listeners...");

      this.eventListeners.forEach(({ element, event, handler }) => {
        if (element && element.removeEventListener) {
          element.removeEventListener(event, handler);
        }
      });

      this.eventListeners = [];

      const container = document.getElementById("work-items-container");
      if (container && container._clickHandler) {
        container.removeEventListener("click", container._clickHandler);
        container._clickHandler = null;
      }

      const createBtn = document.getElementById("create-task-btn");
      if (createBtn && createBtn._handler) {
        createBtn.removeEventListener("click", createBtn._handler);
        createBtn._handler = null;
      }

      const selectAllPending = document.getElementById("select-all-pending");
      if (selectAllPending && selectAllPending._handler) {
        selectAllPending.removeEventListener(
          "change",
          selectAllPending._handler
        );
        selectAllPending._handler = null;
      }

      const selectAllCompleted = document.getElementById(
        "select-all-completed"
      );
      if (selectAllCompleted && selectAllCompleted._handler) {
        selectAllCompleted.removeEventListener(
          "change",
          selectAllCompleted._handler
        );
        selectAllCompleted._handler = null;
      }

      console.log(" Event listeners removed");
    },

    triggerSidebarRefresh: function () {
      console.log("📢 WorkManager: Triggering sidebar refresh");

      const event = new CustomEvent("task-changed", {
        detail: {
          action: "refresh",
          source: "workManager",
          timestamp: Date.now(),
        },
      });
      document.dispatchEvent(event);

      if (typeof window.triggerSidebarRefresh === "function") {
        setTimeout(() => {
          window.triggerSidebarRefresh();
        }, 300);
      }

      try {
        localStorage.setItem("__task_refresh_trigger", Date.now().toString());
        setTimeout(() => {
          localStorage.removeItem("__task_refresh_trigger");
        }, 100);
      } catch (e) {
        console.log("Cannot use localStorage:", e);
      }
    },

    cleanup() {
      console.log(" Cleaning up WorkManager...");

      if (this.showSuccessOverlayTimeout) {
        clearTimeout(this.showSuccessOverlayTimeout);
        this.showSuccessOverlayTimeout = null;
      }

      if (this.hideSuccessOverlayTimeout) {
        clearTimeout(this.hideSuccessOverlayTimeout);
        this.hideSuccessOverlayTimeout = null;
      }

      this.removeEventListeners();
      this.initialized = false;
      console.log(" WorkManager cleaned up");
    },
  };

  document.addEventListener("work-tab-activated", () => {
    console.log("📢 Work tab activated event received");
    if (window.WorkManager) {
      window.WorkManager.loadTasks();
    }
  });

  document.addEventListener("section-changed", (e) => {
    if (e.detail && e.detail.section === "work") {
      console.log("📢 Section changed to work - reloading tasks");
      setTimeout(() => {
        if (window.WorkManager) {
          window.WorkManager.loadTasks();
        }
      }, 300);
    }
  });

  document.addEventListener("taskCreated", () => {
    console.log("📢 Task created - refreshing work manager");
    setTimeout(() => {
      if (window.WorkManager) {
        window.WorkManager.loadTasks();
      }
    }, 500);
  });

  document.addEventListener("taskUpdated", () => {
    console.log("📢 Task updated - refreshing work manager");
    setTimeout(() => {
      if (window.WorkManager) {
        window.WorkManager.loadTasks();
      }
    }, 500);
  });

  document.addEventListener("taskDeleted", () => {
    console.log("📢 Task deleted - refreshing work manager");
    setTimeout(() => {
      if (window.WorkManager) {
        window.WorkManager.loadTasks();
      }
    }, 500);
  });

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      const workSection = document.getElementById("work-section");
      if (workSection && workSection.classList.contains("active")) {
        console.log(" Work section is active on page load");
        if (window.WorkManager && !window.WorkManager.initialized) {
          window.WorkManager.init();
        } else if (window.WorkManager) {
          window.WorkManager.loadTasks();
        }
      }
    }, 1000);
  });

  window.WorkManager.refresh = function () {
    console.log("🔄 WorkManager.refresh() called");
    this.loadTasks();
  };

  window.WorkManager.checkAndReload = function () {
    const workSection = document.getElementById("work-section");
    if (workSection && workSection.classList.contains("active")) {
      console.log(" Work section is active - reloading tasks");
      this.loadTasks();
    }
  };

  console.log(" WorkManager loaded");
})();
