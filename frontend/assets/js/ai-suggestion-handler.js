// js/ai-suggestion-handler.js - FIXED VERSION v9.2 - FE/BE SEPARATION
(() => {
  "use strict";

  // Nếu đã có rồi thì không tạo lại
  if (window.AIHandler) {
    console.log("AIHandler đã tồn tại → bỏ qua load lại");
    return;
  }

  const AIHandler = {
    API_ENDPOINTS: {
      suggestSchedule: "/api/ai/suggest-schedule",
      getTasks: "/api/tasks",
      getCalendarEvents: "/api/calendar/events",
    },

    /**
     * ======================================================
     * 1. MAIN INITIALIZATION - ĐẦY ĐỦ
     * ======================================================
     */

    async initAIModal() {
      try {
        console.log("🚀 Initializing AI modal...");

        await this.waitForModalReady();
        await this.populateAIModal();
        this.setupAllEventListeners();
        this.setDefaultDates();

        console.log("✅ AI modal initialized successfully");
      } catch (error) {
        console.error("❌ Error initializing AI modal:", error);
        this.showErrorInModal(error.message);
      }
    },

    async waitForModalReady() {
      return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50;

        const check = () => {
          attempts++;

          const modal = document.getElementById("aiSuggestionModal");
          const modalBody = modal?.querySelector(".ai-modal-body");

          if (modal && modalBody) {
            console.log("✅ Modal is ready");
            resolve(true);
          } else if (attempts >= maxAttempts) {
            console.error("❌ Modal check failed:", {
              modal: !!modal,
              modalBody: !!modalBody,
            });
            reject(new Error("Modal not ready after maximum attempts"));
          } else {
            if (attempts % 10 === 0) {
              console.log(
                `⏳ Waiting for modal... (${attempts}/${maxAttempts})`
              );
            }
            setTimeout(check, 100);
          }
        };
        check();
      });
    },

    async loadPendingTasks() {
      try {
        console.log("📋 Loading pending tasks for AI modal...");

        if (!Utils?.makeRequest) {
          console.warn("Utils.makeRequest không tồn tại");
          return [];
        }

        const res = await Utils.makeRequest("/api/tasks", "GET");

        if (!res.success || !Array.isArray(res.data)) {
          return [];
        }

        // Lọc các task chưa hoàn thành
        const pendingTasks = res.data.filter(
          (task) =>
            task.TrangThaiThucHien === 0 || task.TrangThaiThucHien === false
        );

        console.log(`📊 Found ${pendingTasks.length} pending tasks`);

        // Map data sang định dạng cho AI
        const tasks = pendingTasks.map((task) => {
          const priority = task.MucDoUuTien || task.priority || 2;

          // Tạo màu dựa trên priority
          const getColorByPriority = (priority) => {
            switch (parseInt(priority)) {
              case 1:
                return "#10B981"; // Xanh lá
              case 2:
                return "#3B82F6"; // Xanh dương
              case 3:
                return "#F59E0B"; // Vàng cam
              case 4:
                return "#EF4444"; // Đỏ
              default:
                return "#8B5CF6"; // Tím
            }
          };

          const timeMap = {
            1: "morning",
            2: "noon",
            3: "afternoon",
            4: "evening",
            5: "anytime",
          };

          return {
            id: task.MaCongViec || task.ID || `task-${Date.now()}`,
            title: task.TieuDe || task.title || "Không tiêu đề",
            estimatedMinutes:
              task.ThoiGianUocTinh || task.estimatedMinutes || 60,
            priority: priority,
            complexity: task.MucDoPhucTap || task.complexity || 2,
            focusLevel: task.MucDoTapTrung || task.focusLevel || 2,
            suitableTime: timeMap[task.ThoiDiemThichHop] || "anytime",
            color: getColorByPriority(priority),
          };
        });

        return tasks;
      } catch (error) {
        console.error("❌ Error loading pending tasks:", error);
        return [];
      }
    },

    /**
     * ======================================================
     * 2. TASK MANAGEMENT - ĐẦY ĐỦ
     * ======================================================
     */
    async populateAIModal() {
      try {
        console.log("📥 Populating AI modal with tasks...");

        const modal = document.getElementById("aiSuggestionModal");
        if (!modal) throw new Error("AI modal not found");

        const modalBody = modal.querySelector(".ai-modal-body");
        if (!modalBody) throw new Error("Modal body not found");

        // Không render form HTML vì đã có sẵn
        console.log("✅ Form HTML already exists in DOM");

        // Load tasks
        const tasks = await this.loadPendingTasks();
        console.log(`📋 Loaded ${tasks.length} tasks`);

        // Render tasks vào task list
        const taskList = modal.querySelector("#aiTaskList");
        if (taskList) {
          this.renderTasksToModal(tasks, taskList);
          console.log("✅ Tasks rendered to modal");
        } else {
          console.error("❌ Task list element not found");
        }

        console.log("✅ Modal populated with tasks");
      } catch (error) {
        console.error("❌ Error populating modal:", error);
        throw error;
      }
    },

    renderTasksToModal(tasks, taskList) {
      if (!tasks || tasks.length === 0) {
        taskList.innerHTML = this.getEmptyStateHTML();
        return;
      }

      let html = "";
      tasks.forEach((task) => {
        const priorityClass = `priority-${task.priority}`;
        const duration = task.estimatedMinutes || 60;

        // THAY ĐỔI CẤU TRÚC HTML ĐỂ TOÀN BỘ ITEM CLICK ĐƯỢC
        html += `
      <div class="task-item selectable" data-task-id="${task.id}" data-selected="false">
        <label class="task-checkbox-label">
          <input type="checkbox" 
                 class="task-checkbox" 
                 value="${task.id}"
                 data-task-id="${task.id}"
                 style="display: none;"> <!-- Ẩn checkbox thật -->
          <span class="checkmark"></span>
        </label>
        <div class="task-content">
          <div class="task-title">${task.title}</div>
          <div class="task-details">
            <span class="task-priority ${priorityClass}">
              Ưu tiên ${task.priority}
            </span>
            <span class="task-duration">
              <i class="far fa-clock"></i>
              ${duration} phút
            </span>
          </div>
        </div>
        <div class="task-color" style="background-color: ${task.color}"></div>
      </div>
    `;
      });

      taskList.innerHTML = html;
      this.updateTaskStats(tasks.length);

      // THÊM SỰ KIỆN CLICK CHO TOÀN BỘ ITEM
      this.setupTaskItemClickEvents();
    },

    setupTaskItemClickEvents() {
      const taskItems = document.querySelectorAll(
        "#aiSuggestionModal .task-item.selectable"
      );

      taskItems.forEach((item) => {
        // Xóa listener cũ để tránh trùng lặp
        item.removeEventListener("click", this.handleTaskItemClick);

        // Thêm listener mới
        item.addEventListener("click", (e) => {
          // Không xử lý nếu click vào checkbox
          if (e.target.type === "checkbox") return;

          this.toggleTaskSelection(item);
        });
      });
    },

    toggleTaskSelection(taskItem) {
      const checkbox = taskItem.querySelector(".task-checkbox");
      const isCurrentlySelected = taskItem.dataset.selected === "true";

      // Toggle trạng thái
      const newSelectedState = !isCurrentlySelected;

      // Cập nhật checkbox ẩn
      checkbox.checked = newSelectedState;

      // Cập nhật data attribute
      taskItem.dataset.selected = newSelectedState.toString();

      // Thêm/xóa class selected
      if (newSelectedState) {
        taskItem.classList.add("selected");
      } else {
        taskItem.classList.remove("selected");
      }

      // Cập nhật số lượng đã chọn
      this.updateSelectedCount();
    },

    // SỬA LẠI HÀM updateSelectedCount ĐỂ HOẠT ĐỘNG VỚI CÁCH MỚI
    updateSelectedCount() {
      const selectedCheckboxes = document.querySelectorAll(
        "#aiSuggestionModal .task-checkbox:checked"
      );
      const selectedCount = selectedCheckboxes.length;
      const totalCount = document.querySelectorAll(
        "#aiSuggestionModal .task-checkbox"
      ).length;

      console.log(`📊 Selected: ${selectedCount}/${totalCount} tasks`);

      const statsElement = document.querySelector(
        "#aiSuggestionModal #aiTaskStats"
      );
      if (statsElement) {
        statsElement.innerHTML = `Đã chọn: <strong>${selectedCount}</strong> / <strong>${totalCount}</strong> công việc`;
      }
    },

    getPriorityColor(priority) {
      const colors = {
        1: "#10B981",
        2: "#3B82F6",
        3: "#F59E0B",
        4: "#EF4444",
      };
      return colors[priority] || "#8B5CF6";
    },

    /**
     * ======================================================
     * 3. FORM SUBMIT HANDLING - ĐẦY ĐỦ
     * ======================================================
     */
    setupAllEventListeners() {
      console.log("🔗 Setting up all event listeners...");

      // Select all button
      const selectAllBtn = document.querySelector(
        "#aiSuggestionModal #selectAllTasksBtn"
      );
      if (selectAllBtn) {
        selectAllBtn.addEventListener("click", (e) => {
          e.preventDefault();
          this.toggleSelectAll();
        });
      }

      // Checkbox listeners
      this.setupCheckboxListeners();

      console.log("✅ All event listeners setup complete");
    },

    async handleFormSubmitAction() {
      try {
        console.log("📤 Bắt đầu submit form AI..."); // Debug log

        const form = document.getElementById("aiSuggestionForm");
        if (!form) throw new Error("Không tìm thấy form AI");

        // Lấy data như hiện tại
        const startDate = document.getElementById("aiStartDate")?.value;
        const endDate = document.getElementById("aiEndDate")?.value;
        if (!startDate || !endDate)
          throw new Error("Chưa chọn ngày bắt đầu/kết thúc");

        const avoidConflict =
          document.getElementById("aiOptionAvoidConflict")?.checked ?? false;
        const considerPriority =
          document.getElementById("aiOptionConsiderPriority")?.checked ?? false;
        const balanceWorkload =
          document.getElementById("aiOptionBalanceWorkload")?.checked ?? false;

        const selectedTasks = Array.from(
          document.querySelectorAll("#aiSuggestionModal .task-checkbox:checked")
        ).map((cb) => parseInt(cb.value));
        if (selectedTasks.length === 0)
          throw new Error("Vui lòng chọn ít nhất một công việc");

        // Thêm: Lấy additionalInstructions (nếu đang ở mode chỉnh sửa)
        const additionalInstructions =
          document.getElementById("aiAdditionalInstructions")?.value || "";

        const payload = {
          tasks: selectedTasks,
          startDate: `${startDate}T00:00:00`,
          endDate: `${endDate}T23:59:59`,
          options: { avoidConflict, considerPriority, balanceWorkload },
          additionalInstructions, // Thêm vào payload
        };

        console.log("Payload gửi API:", payload); // Debug: Kiểm tra payload trước khi gửi

        const res = await Utils.makeRequest(
          this.API_ENDPOINTS.suggestSchedule,
          "POST",
          payload
        );
        if (!res.success) throw new Error(res.message || "Lỗi từ server AI");

        // Hiển thị preview thay vì lưu ngay
        this.showAIPreview(
          res.data.suggestions,
          res.data.summary,
          res.data.statistics
        );
      } catch (error) {
        console.error("❌ Lỗi submit form:", error);
        this.showError(error.message || "Lỗi xử lý yêu cầu AI");
      }
    },

    showAIPreview(suggestions, summary, statistics) {
      const modalBody = document.querySelector(
        "#aiSuggestionModal .ai-modal-body"
      );
      if (!modalBody) return console.error("Không tìm thấy modal body");

      // Render preview như list (dễ xem, có thể scroll)
      let previewHTML = `
    <div class="ai-preview-section" style="padding: 20px; background: #f0f4f8; border-radius: 8px;">
      <h4 style="font-size: 18px; margin-bottom: 10px;">📅 Demo Lịch AI Đề Xuất</h4>
      <p style="margin-bottom: 15px;">${summary || "Tóm tắt lịch"}</p>
      <ul class="preview-list" style="list-style: none; padding: 0;">
        ${suggestions
          .map(
            (s, index) => `
          <li style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <strong>#${index + 1} - Công việc ID ${s.taskId}</strong><br>
            Thời gian: $$ {new Date(s.scheduledTime).toLocaleString('vi-VN')} ( $${
              s.durationMinutes
            } phút)<br>
            Lý do: ${s.reason || "Tự động"}<br>
            Màu: <span style="display: inline-block; width: 20px; height: 20px; background: ${
              s.color || "#8B5CF6"
            }; border-radius: 50%;"></span>
          </li>
        `
          )
          .join("")}
      </ul>
      <div class="preview-actions" style="margin-top: 20px; text-align: center;">
        <button id="aiApplyBtn" class="btn btn-primary" style="margin-right: 10px;">Áp dụng</button>
        <button id="aiEditBtn" class="btn btn-secondary">Chỉnh sửa</button>
      </div>
      <div id="aiEditSection" style="display:none; margin-top: 15px;">
        <textarea id="aiAdditionalInstructions" placeholder="Mô tả thay đổi (ví dụ: Di chuyển công việc 1 sang chiều, tăng thời gian công việc 2 lên 90 phút)" style="width: 100%; height: 100px; padding: 10px; border: 1px solid #ccc; border-radius: 4px;"></textarea>
        <button id="aiResubmitBtn" class="btn btn-primary" style="margin-top: 10px;">Gửi lại cho AI</button>
      </div>
    </div>
  `;

      modalBody.innerHTML = previewHTML;

      // Thêm events cho nút
      document
        .getElementById("aiApplyBtn")
        .addEventListener("click", async () => {
          try {
            await this.saveAISuggestionsToDatabase(suggestions); // Lưu vào DB (hàm hiện có)
            if (window.AIModule) await AIModule.loadAISuggestions(suggestions); // Load vào calendar
            ModalManager.hideModalById("aiSuggestionModal");
            this.showSuccess("Đã áp dụng lịch AI thành công!");
          } catch (err) {
            this.showError("Lỗi áp dụng lịch: " + err.message);
          }
        });

      document.getElementById("aiEditBtn").addEventListener("click", () => {
        document.getElementById("aiEditSection").style.display = "block";
      });

      document.getElementById("aiResubmitBtn").addEventListener("click", () => {
        this.handleFormSubmitAction(); // Submit lại với instructions mới
      });
    },

    getFormData() {
      try {
        console.log("🔍 Getting form data...");

        const selectedTasks = [];
        const checkedCheckboxes = document.querySelectorAll(
          "#aiSuggestionModal .task-checkbox:checked"
        );

        console.log(`Found ${checkedCheckboxes.length} checked checkboxes`);

        checkedCheckboxes.forEach((checkbox, index) => {
          let taskId = checkbox.value;

          if (!taskId || taskId === "on") {
            taskId = checkbox.dataset.taskId;
          }

          if (!taskId || taskId === "on") {
            const taskItem = checkbox.closest(".task-item");
            if (taskItem) {
              taskId = taskItem.dataset.taskId;
            }
          }

          if (taskId && taskId !== "on") {
            const parsedId = parseInt(taskId);
            if (!isNaN(parsedId) && parsedId > 0) {
              selectedTasks.push(parsedId);
              console.log(`✅ Task ${index + 1}: ID = ${parsedId}`);
            } else {
              console.warn(`⚠️ Invalid task ID: ${taskId}`);
            }
          }
        });

        console.log(`📋 Total selected tasks: ${selectedTasks.length}`);
        console.log(`📋 Task IDs:`, selectedTasks);

        if (selectedTasks.length === 0) {
          this.showError("Vui lòng chọn ít nhất một công việc!");
          return null;
        }

        const startDate = document.getElementById("aiStartDate")?.value;
        const endDate = document.getElementById("aiEndDate")?.value;

        if (!startDate || !endDate) {
          this.showError("Vui lòng chọn khoảng thời gian!");
          return null;
        }

        const options = {
          avoidConflict:
            document.getElementById("aiOptionAvoidConflict")?.checked !== false,
          considerPriority:
            document.getElementById("aiOptionConsiderPriority")?.checked !==
            false,
          balanceWorkload:
            document.getElementById("aiOptionBalanceWorkload")?.checked !==
            false,
        };

        const formData = {
          tasks: selectedTasks,
          startDate,
          endDate,
          options,
        };

        console.log("✅ Form data ready:", formData);
        return formData;
      } catch (error) {
        console.error("❌ Error getting form data:", error);
        this.showError("Lỗi lấy dữ liệu form: " + error.message);
        return null;
      }
    },

    validateFormData(formData) {
      if (!formData.tasks || formData.tasks.length === 0) {
        this.showError("Vui lòng chọn ít nhất một công việc!");
        return false;
      }

      if (!formData.startDate || !formData.endDate) {
        this.showError("Vui lòng chọn khoảng thời gian!");
        return false;
      }

      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end <= start) {
        this.showError("Ngày kết thúc phải sau ngày bắt đầu!");
        return false;
      }

      const invalidTasks = formData.tasks.filter((id) => isNaN(id) || id <= 0);
      if (invalidTasks.length > 0) {
        console.error("Invalid task IDs:", invalidTasks);
        this.showError("Có công việc không hợp lệ. Vui lòng thử lại.");
        return false;
      }

      return true;
    },

    async submitToAI(formData) {
      try {
        console.log("📤 Submitting to AI API...");
        console.log("Request payload:", JSON.stringify(formData, null, 2));

        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("Không tìm thấy token đăng nhập");
        }

        const response = await fetch("/api/ai/suggest-schedule", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });

        console.log("📥 AI API response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API Error response:", errorText);
          throw new Error(
            `HTTP ${response.status}: ${errorText.substring(0, 200)}`
          );
        }

        const result = await response.json();
        console.log("🤖 AI API result:", result);

        if (!result.success) {
          throw new Error(result.message || "Lỗi xử lý AI");
        }

        return {
          success: true,
          data: result.data,
          message: result.message || "Thành công",
        };
      } catch (error) {
        console.error("❌ AI submission error:", error);
        return {
          success: false,
          message: error.message || "Lỗi kết nối AI",
        };
      }
    },

    handleErrorResult(result) {
      console.error("❌ AI error:", result);
      this.showError(result.message || "Lỗi không xác định từ AI");
    },

    async addEventsToCalendar(suggestions) {
      try {
        if (!suggestions || suggestions.length === 0) return;

        console.log(`📅 Adding ${suggestions.length} events to calendar...`);

        // ✅ CHỜ AIModule SẴN SÀNG
        await this.waitForAIModule();

        if (window.AIModule && window.AIModule.loadAISuggestions) {
          console.log("🔄 Calling AIModule.loadAISuggestions...");
          await AIModule.loadAISuggestions(suggestions);
          console.log("✅ Events added to AI calendar successfully");
        } else {
          console.warn("⚠️ AIModule not available for adding events");
          this.showError("Không thể thêm lịch vào AI calendar");
        }
      } catch (error) {
        console.error("❌ Error adding events to calendar:", error);
        this.showError("Lỗi thêm sự kiện vào lịch: " + error.message);
      }
    },

    /**
     * CHỜ AIModule SẴN SÀNG
     */
    async waitForAIModule(timeout = 10000) {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const check = () => {
          if (
            window.AIModule &&
            window.AIModule.isInitialized &&
            window.AIModule.calendar
          ) {
            console.log("✅ AIModule is ready");
            resolve(true);
          } else if (Date.now() - startTime > timeout) {
            console.error("❌ AIModule timeout");
            reject(new Error("AIModule không sẵn sàng sau " + timeout + "ms"));
          } else {
            console.log("⏳ Waiting for AIModule...");
            setTimeout(check, 200);
          }
        };

        check();
      });
    },

    async saveAISuggestionsToDatabase(suggestions) {
      try {
        console.log(`Saving ${suggestions.length} AI suggestions (batch)...`);
        const token = localStorage.getItem("auth_token");
        if (!token) throw new Error("Không có token");

        const res = await fetch("/api/ai/save-ai-suggestions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ suggestions }),
        });

        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();

        return { success: true, savedCount: data.saved || suggestions.length };
      } catch (err) {
        console.error("Lưu AI thất bại:", err);
        throw err;
      }
    },
    /**
     * ✅ CẬP NHẬT handleSuccessResult ĐỂ LƯU VÀO DATABASE
     */
    async handleSuccessResult(result, formData) {
      console.log("AI thành công, đang lưu vào database...");
      this.displaySuccessResults(result.data);

      if (result.data?.suggestions?.length > 0) {
        try {
          const saveResult = await this.saveAISuggestionsToDatabase(
            result.data.suggestions
          );

          // Chờ AIModule sẵn sàng rồi reload lịch AI
          await this.waitForAIModule();
          if (window.AIModule?.refreshFromDatabase) {
            await AIModule.refreshFromDatabase();
          }

          Utils.showToast(
            `Đã lưu ${saveResult.savedCount} lịch trình AI!`,
            "success"
          );

          setTimeout(() => {
            this.closeModal();
            document.querySelector('[data-tab="ai"]')?.click();
          }, 2000);
        } catch (err) {
          Utils.showToast("Tạo lịch thành công nhưng lưu lỗi!", "warning");
          console.error(err);
        }
      }

      if (window.AIModule && AIModule.refreshFromDatabase) {
        await AIModule.refreshFromDatabase(); // Refresh calendar mà không reload trang
        console.log("✅ Calendar AI đã refresh từ DB");
      } else {
        console.warn("⚠️ AIModule không sẵn sàng, reload trang thủ công");
        location.reload(); // Fallback nếu AIModule lỗi
      }
    },
    /**
     * ======================================================
     * 4. UI HELPERS - ĐẦY ĐỦ
     * ======================================================
     */
    setDefaultDates() {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const startDateInput = document.getElementById("aiStartDate");
      const endDateInput = document.getElementById("aiEndDate");

      if (startDateInput && endDateInput) {
        startDateInput.value = today.toISOString().split("T")[0];
        endDateInput.value = nextWeek.toISOString().split("T")[0];
        console.log(
          "📅 Set default dates:",
          startDateInput.value,
          "to",
          endDateInput.value
        );
      }
    },

    setupCheckboxListeners() {
      const taskList = document.querySelector("#aiSuggestionModal #aiTaskList");
      if (!taskList) return;

      taskList.addEventListener("change", (e) => {
        if (e.target.classList.contains("task-checkbox")) {
          this.updateSelectedCount();
        }
      });
    },

    toggleSelectAll() {
      const checkboxes = document.querySelectorAll(
        "#aiSuggestionModal .task-checkbox"
      );
      const allChecked = Array.from(checkboxes).every((cb) => cb.checked);

      checkboxes.forEach((cb) => {
        cb.checked = !allChecked;
      });

      this.updateSelectedCount();
    },

    updateSelectedCount() {
      const selectedCheckboxes = document.querySelectorAll(
        "#aiSuggestionModal .task-checkbox:checked"
      );
      const selectedCount = selectedCheckboxes.length;
      const totalCount = document.querySelectorAll(
        "#aiSuggestionModal .task-checkbox"
      ).length;

      console.log(`📊 Selected: ${selectedCount}/${totalCount} tasks`);

      const statsElement = document.querySelector(
        "#aiSuggestionModal #aiTaskStats"
      );
      if (statsElement) {
        statsElement.innerHTML = `Đã chọn: <strong>${selectedCount}</strong> công việc`;
      }
    },

    updateTaskStats(count) {
      const statsElement = document.querySelector(
        "#aiSuggestionModal #aiTaskStats"
      );
      if (statsElement) {
        statsElement.innerHTML = `Đã chọn: <strong>0</strong> / <strong>${count}</strong> công việc`;
      }
    },

    showFormLoading(show) {
      const submitBtn = document.getElementById("aiSubmitBtn");

      if (submitBtn) {
        if (show) {
          submitBtn.disabled = true;
          submitBtn.innerHTML =
            '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
          console.log("⏳ Showing loading state...");
        } else {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fas fa-magic"></i> Tạo Lịch Trình';
          console.log("✅ Hiding loading state...");
        }
      }
    },

    displaySuccessResults(result) {
      const modalBody = document.querySelector(
        "#aiSuggestionModal .ai-modal-body"
      );
      if (!modalBody) return;

      const successHTML = this.getSuccessHTML(result);
      modalBody.innerHTML = successHTML;

      // Ẩn footer sau khi hiển thị kết quả
      const modalFooter = document.querySelector(
        "#aiSuggestionModal .ai-modal-footer"
      );
      if (modalFooter) {
        modalFooter.style.display = "none";
      }
    },

    closeModal() {
      const modal = document.getElementById("aiSuggestionModal");
      if (modal) {
        modal.classList.remove("active", "show");
        modal.style.display = "none";
        document.body.classList.remove("modal-open");
        console.log("✅ Modal closed");

        setTimeout(() => {
          location.reload();
        }, 100);
      }
    },

    /**
     * ======================================================
     * 5. HTML TEMPLATES - ĐẦY ĐỦ
     * ======================================================
     */
    getLoadingHTML() {
      return `
      <div class="loading-state" style="text-align: center; padding: 40px;">
        <div class="loading-spinner" style="display: inline-block;">
          <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: #8B5CF6;"></i>
        </div>
        <p style="margin-top: 20px; color: #666;">Đang tải danh sách công việc...</p>
      </div>
    `;
    },

    getEmptyStateHTML() {
      return `
      <div class="empty-state" style="text-align: center; padding: 40px;">
        <i class="fas fa-tasks" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
        <p style="font-size: 16px; color: #666;">Không có công việc nào chưa hoàn thành</p>
        <p class="text-sm text-gray-500 mt-2">Hãy tạo công việc mới trước khi sử dụng AI</p>
      </div>
    `;
    },

    getSuccessHTML(result) {
      const suggestionCount = result.suggestions?.length || 0;
      const summary = result.summary || `Đã tạo ${suggestionCount} khung giờ`;

      let suggestionsHTML = "";
      const previewSuggestions = result.suggestions?.slice(0, 3) || [];

      previewSuggestions.forEach((suggestion) => {
        const date = new Date(suggestion.scheduledTime);
        const timeStr = date.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const dateStr = date.toLocaleDateString("vi-VN");

        suggestionsHTML += `
        <div class="suggestion-item" style="padding: 15px; margin: 10px 0; border-left: 3px solid #8B5CF6; background: #f9fafb;">
          <i class="far fa-calendar-check" style="color: #8B5CF6; margin-right: 10px;"></i>
          <div class="suggestion-info" style="display: inline-block;">
            <strong>Công việc #${suggestion.taskId}</strong>
            <small style="display: block; color: #666;">${dateStr} lúc ${timeStr} (${
          suggestion.durationMinutes
        } phút)</small>
            <div class="text-xs text-gray-500 mt-1">${
              suggestion.reason || ""
            }</div>
          </div>
        </div>
      `;
      });

      if (suggestionCount > 3) {
        suggestionsHTML += `
        <div class="suggestion-more" style="text-align: center; padding: 15px; color: #666;">
          + ${suggestionCount - 3} đề xuất khác
        </div>
      `;
      }

      const stats = result.statistics || {};

      return `
      <div class="ai-summary-section" style="padding: 20px;">
        <div class="summary-header success" style="text-align: center; margin-bottom: 30px;">
          <i class="fas fa-check-circle" style="font-size: 64px; color: #10B981; margin-bottom: 20px;"></i>
          <h4 style="font-size: 24px; font-weight: 600; margin: 0;">🎉 AI đã tạo lịch trình thành công!</h4>
        </div>
        <p style="text-align: center; font-size: 16px; margin-bottom: 30px;"><strong>${summary}</strong></p>
        
        <div class="ai-stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
          <div class="stat-item" style="text-align: center; padding: 20px; background: #f9fafb; border-radius: 8px;">
            <i class="fas fa-tasks" style="font-size: 32px; color: #8B5CF6; margin-bottom: 10px;"></i>
            <div>
              <strong style="display: block; font-size: 24px;">${
                stats.totalTasks || suggestionCount
              }</strong>
              <small style="color: #666;">Công việc</small>
            </div>
          </div>
          <div class="stat-item" style="text-align: center; padding: 20px; background: #f9fafb; border-radius: 8px;">
            <i class="fas fa-clock" style="font-size: 32px; color: #3B82F6; margin-bottom: 10px;"></i>
            <div>
              <strong style="display: block; font-size: 24px;">${
                stats.totalHours || Math.round(suggestionCount * 1.5)
              }</strong>
              <small style="color: #666;">Giờ</small>
            </div>
          </div>
          <div class="stat-item" style="text-align: center; padding: 20px; background: #f9fafb; border-radius: 8px;">
            <i class="fas fa-calendar-days" style="font-size: 32px; color: #10B981; margin-bottom: 10px;"></i>
            <div>
              <strong style="display: block; font-size: 24px;">${
                stats.daysUsed || 1
              }</strong>
              <small style="color: #666;">Ngày</small>
            </div>
          </div>
        </div>
        
        <div class="suggestions-preview" style="margin-bottom: 30px;">
          <h5 style="font-size: 18px; font-weight: 600; margin-bottom: 15px;">📋 Xem trước đề xuất:</h5>
          <div class="suggestions-list">
            ${suggestionsHTML}
          </div>
        </div>
        
        <div class="summary-note" style="padding: 15px; background: #EEF2FF; border-radius: 8px; margin-bottom: 20px;">
          <i class="fas fa-lightbulb" style="color: #8B5CF6; margin-right: 10px;"></i>
          Những đề xuất này đã được thêm vào lịch AI của bạn
        </div>
        
        <div class="mt-6 text-center">
          <button class="btn btn-primary" onclick="location.reload()" style="padding: 12px 30px; background: #8B5CF6; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer;">
            <i class="fas fa-redo"></i>
            Tải lại trang
          </button>
        </div>
      </div>
    `;
    },

    /**
     * ======================================================
     * 6. UTILITIES - ĐẦY ĐỦ
     * ======================================================
     */
    showError(message) {
      console.error("❌ Error:", message);
      if (window.Utils && Utils.showToast) {
        Utils.showToast(message, "error");
      } else {
        alert("⚠️ " + message);
      }
    },

    showSuccess(message) {
      console.log("✅ Success:", message);
      if (window.Utils && Utils.showToast) {
        Utils.showToast(message, "success");
      }
    },

    showErrorInModal(message) {
      const modalBody = document.querySelector(
        "#aiSuggestionModal .ai-modal-body"
      );
      if (modalBody) {
        modalBody.innerHTML = `
        <div class="error-state" style="text-align: center; padding: 40px;">
          <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #EF4444; margin-bottom: 20px;"></i>
          <p style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">Không thể tải dữ liệu</p>
          <p style="color: #666; margin-bottom: 20px;">${
            message || "Đã xảy ra lỗi"
          }</p>
          <button class="btn btn-primary" onclick="AIHandler.initAIModal()" style="padding: 10px 20px; background: #3B82F6; color: white; border: none; border-radius: 8px; cursor: pointer;">
            <i class="fas fa-redo"></i>
            Thử lại
          </button>
        </div>
      `;
      }
    },

    debugTaskIDs() {
      console.log("🔍 Debugging task IDs in modal...");

      const taskItems = document.querySelectorAll(
        "#aiSuggestionModal .task-item"
      );
      console.log(`Found ${taskItems.length} task items`);

      taskItems.forEach((item, index) => {
        const taskId = item.dataset.taskId;
        const checkbox = item.querySelector(".task-checkbox");

        console.log(`Task ${index}:`, {
          "data-task-id": taskId,
          "checkbox.value": checkbox?.value,
          "checkbox.dataset": checkbox?.dataset,
          "checkbox.checked": checkbox?.checked,
        });
      });

      const checkedBoxes = document.querySelectorAll(
        "#aiSuggestionModal .task-checkbox:checked"
      );
      console.log(`${checkedBoxes.length} checkboxes checked`);

      checkedBoxes.forEach((cb, index) => {
        console.log(
          `Checked ${index}: value="${cb.value}", data-task-id="${cb.dataset.taskId}"`
        );
      });
    },
  };

  window.AIHandler = AIHandler;
  console.log("AIHandler v9.3 đã sẵn sàng và được gắn vào window!");

  // Auto-initialize when modal is shown
  document.addEventListener("modal-shown", (e) => {
    if (e.detail && e.detail.modalId === "aiSuggestionModal") {
      console.log("🎯 AI Modal shown, initializing...");
      setTimeout(() => {
        AIHandler.initAIModal();
      }, 300);
    }
  });

  // Debug function
  window.debugAIHandler = function () {
    console.log("=== AI Handler Debug ===");
    console.log("AIHandler available:", !!window.AIHandler);
    console.log("Methods:", Object.keys(AIHandler));

    const form = document.getElementById("aiSuggestionForm");
    console.log("Form exists:", !!form);

    if (AIHandler.debugTaskIDs) {
      AIHandler.debugTaskIDs();
    }
  };

  console.log("✅ AI Suggestion Handler v9.2 ready");
})();
