(function () {
  "use strict";

  if (window.CalendarModule) {
    console.warn("CalendarModule already exists → destroying old instance");
    window.CalendarModule.destroy?.();
  }

  const CalendarModule = {
    calendar: null,
    draggableInstance: null,
    isInitialized: false,
    initPromise: null,
    currentView: "timeGridWeek",
    isDragging: false,

    // ==========================================================
    // PUBLIC: init()
    // ==========================================================
    async init() {
      if (this.isInitialized && this.calendar) this.destroy();

      console.log("🚀 Khởi tạo CalendarModule với kéo thả...");

      try {
        await this._initInternal();
        this.isInitialized = true;

        // ✅ ĐẢM BẢO SETUP DROP ZONE SAU KHI INIT
        setTimeout(() => {
          this.setupDropZone();
          this.setupTaskDragListeners(); // ĐÃ SỬA TỪ etupTaskDragListeners
        }, 1000);

        console.log("✅ CalendarModule khởi tạo thành công với kéo thả!");
      } catch (err) {
        console.error("Calendar initialization failed:", err);
        this.showError(err);
      }
    },

    setupTaskDragListeners() {
      console.log(
        "🔗 Setting up task drag listeners with FullCalendar.Draggable..."
      );

      // Setup draggable cho tasks hiện có
      this.initializeExternalDraggable();

      // Theo dõi thay đổi DOM để bind Draggable cho task mới
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1) {
                // Nếu chính node là task item
                if (node.classList && node.classList.contains("task-item")) {
                  this.makeTaskDraggable(node);
                }

                // Hoặc tìm task items bên trong
                const taskItems = node.querySelectorAll
                  ? node.querySelectorAll(".task-item")
                  : [];

                taskItems.forEach((item) => {
                  this.makeTaskDraggable(item);
                });
              }
            });
          }
        });
      });

      // Quan sát task-list container
      const taskList = document.getElementById("task-list");
      if (taskList) {
        observer.observe(taskList, {
          childList: true,
          subtree: true,
        });
      }

      console.log("✅ Task drag listeners setup complete");
    },

    initializeExternalDraggable() {
      console.log(
        "🏄 Initializing FullCalendar.Draggable for sidebar tasks..."
      );

      const taskList = document.getElementById("task-list");
      if (!taskList) {
        console.warn("⚠️ task-list container not found");
        return;
      }

      const taskItems = taskList.querySelectorAll(".task-item");
      console.log(`📦 Found ${taskItems.length} task items to make draggable`);

      taskItems.forEach((item) => {
        this.makeTaskDraggable(item);
      });
    },

    makeTaskDraggable(element) {
      // Skip if already draggable
      if (element.hasAttribute("data-draggable-init")) return;

      const taskId = element.dataset.taskId;
      const title = element.dataset.taskTitle || element.textContent.trim();
      const priority = parseInt(element.dataset.taskPriority) || 2; // Default to priority 2
      const description = element.dataset.taskDescription || "";

      // Get color based on PRIORITY, not stored color
      const color = this.getPriorityColor(priority);

      if (!taskId) {
        console.warn("⚠️ Task element missing taskId");
        return;
      }

      // Sử dụng FullCalendar.Draggable
      try {
        if (typeof FullCalendar !== "undefined" && FullCalendar.Draggable) {
          const draggable = new FullCalendar.Draggable(element, {
            eventData: {
              id: `drag-${taskId}`,
              title: title,
              // IMPORTANT: Don't set color here, let eventDidMount apply CSS classes based on priority
              extendedProps: {
                taskId: taskId,
                priority: priority,
                description: description,
                isFromDrag: true,
              },
            },
          });

          element.setAttribute("data-draggable-init", "true");
          console.log(
            `✅ Made draggable: ${title} (ID: ${taskId}, Priority: ${priority})`
          );
        } else {
          // Fallback: HTML5 drag/drop nếu FullCalendar.Draggable không available
          this.bindHTML5DragEvents(element);
        }
      } catch (err) {
        console.warn(
          "⚠️ Error creating FullCalendar.Draggable, using HTML5 fallback:",
          err
        );
        this.bindHTML5DragEvents(element);
      }
    },

    bindHTML5DragEvents(element) {
      if (element.hasAttribute("data-html5-drag-bound")) return;

      element.setAttribute("draggable", "true");
      element.setAttribute("data-html5-drag-bound", "true");

      element.addEventListener("dragstart", (e) => {
        const taskId = element.dataset.taskId;
        const title = element.dataset.taskTitle || element.textContent.trim();
        const color = element.dataset.taskColor || "#3B82F6";

        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", taskId);
        e.dataTransfer.setData("taskId", taskId);
        e.dataTransfer.setData(
          "application/json",
          JSON.stringify({ taskId, title, color })
        );

        element.classList.add("dragging");
        console.log(`📤 HTML5 drag start: ${title} (ID: ${taskId})`);
      });

      element.addEventListener("dragend", () => {
        element.classList.remove("dragging");
        console.log("📥 HTML5 drag end");
      });
    },

    // ==========================================================
    // PRIVATE: _initInternal()
    // ==========================================================
    async _initInternal() {
      const calendarEl = await this.waitForElement("calendar", 8000);
      if (!calendarEl) throw new Error("Không tìm thấy phần tử #calendar");

      await Promise.all([this.waitForFullCalendar(), this.waitForUtils()]);
      calendarEl.style.minHeight = "700px";

      const events = await this.loadEvents();
      this.renderCalendar(events);

      // Setup cả hai phương thức kéo thả
      setTimeout(() => {
        this.initializeNavbarEvents();
      }, 200);
    },

    // ==========================================================
    // UTILS (giữ nguyên)
    // ==========================================================
    waitForElement(id, timeout = 8000) {
      return new Promise((resolve) => {
        const el = document.getElementById(id);
        if (el) return resolve(el);

        const observer = new MutationObserver(() => {
          const el = document.getElementById(id);
          if (el) {
            observer.disconnect();
            resolve(el);
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => {
          observer.disconnect();
          resolve(null);
        }, timeout);
      });
    },

    waitForFullCalendar(timeout = 10000) {
      return new Promise((resolve, reject) => {
        if (typeof FullCalendar !== "undefined") return resolve();

        const start = Date.now();
        const check = () => {
          if (typeof FullCalendar !== "undefined") resolve();
          else if (Date.now() - start > timeout)
            reject(new Error("FullCalendar timeout"));
          else setTimeout(check, 100);
        };
        check();
      });
    },

    waitForUtils() {
      return new Promise((resolve) => {
        if (typeof Utils !== "undefined") return resolve();
        const check = () =>
          typeof Utils !== "undefined" ? resolve() : setTimeout(check, 100);
        check();
      });
    },

    showError(error) {
      const el = document.getElementById("calendar");
      if (!el) return;

      el.innerHTML = `
        <div class="flex items-center justify-center h-96">
          <div class="text-center p-10 bg-red-50 rounded-xl">
            <div class="text-6xl mb-4">Lỗi</div>
            <h3 class="text-2xl font-bold text-red-700 mb-3">Không tải được lịch</h3>
            <p class="text-gray-600 mb-6">${error.message || error}</p>
            <button onclick="location.reload()" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Tải lại trang
            </button>
          </div>
        </div>
      `;
    },

    // SỬA HÀM loadEvents()
    async loadEvents() {
      if (!Utils?.makeRequest) {
        console.warn("Utils.makeRequest không tồn tại → trả về mảng rỗng");
        return [];
      }

      try {
        console.log("📅 Loading calendar events...");
        const res = await Utils.makeRequest("/api/calendar/events", "GET");
        if (!res.success || !Array.isArray(res.data)) {
          console.warn("⚠️ Invalid response from /api/calendar/events");
          return [];
        }

        console.log(`📊 Received ${res.data.length} total events from server`);

        // ============================================================
        // 🔴 FILTER LOẠI BỎ AI EVENTS - ENHANCED VERSION
        // ============================================================
        const aiEvents = res.data.filter(
          (ev) =>
            ev.AI_DeXuat === 1 || ev.AI_DeXuat === "1" || ev.AI_DeXuat === true
        );
        if (aiEvents.length > 0) {
          console.warn(
            `🤖 FOUND ${aiEvents.length} AI EVENTS - WILL BE FILTERED OUT:`,
            aiEvents.map((e) => ({
              id: e.MaLichTrinh,
              title: e.TieuDe || e.title,
              AI_DeXuat: e.AI_DeXuat,
              start: e.GioBatDau,
            }))
          );
        }

        // ✅ FILTER LOẠI BỎ AI EVENTS VÀ ĐẢM BẢO MÀU SẮC
        const normalEvents = res.data
          .filter((ev) => {
            // ⚠️ LOẠI BỎ NẾU AI_DeXuat = 1 (tất cả variation)
            const isAI =
              ev.AI_DeXuat === 1 ||
              ev.AI_DeXuat === "1" ||
              ev.AI_DeXuat === true;

            if (isAI) {
              console.log(
                `⏭️ ❌ SKIPPING AI EVENT: ${
                  ev.TieuDe || ev.title
                } | AI_DeXuat=${ev.AI_DeXuat} (type: ${typeof ev.AI_DeXuat})`
              );
            }
            return !isAI; // ✅ Chỉ trả về events KHÔNG phải AI
          })
          .map((ev) => {
            // ĐẢM BẢO LUÔN CÓ MÀU SẮC
            const color =
              ev.MauSac || this.getPriorityColor(ev.MucDoUuTien) || "#3788d8";

            return {
              id: ev.id || ev.MaLichTrinh || 0,
              title: ev.title || ev.TieuDe || "Không tiêu đề",
              start: ev.start || ev.GioBatDau || new Date().toISOString(),
              end: ev.end || ev.GioKetThuc || null,
              backgroundColor: color,
              borderColor: color,
              allDay: ev.allDay || false,
              extendedProps: {
                note: ev.GhiChu || ev.extendedProps?.note || "",
                completed:
                  ev.DaHoanThanh === 1 || ev.extendedProps?.completed || false,
                taskId: ev.MaCongViec || ev.extendedProps?.taskId || null,
                isFromDrag: ev.isFromDrag || false,
                isAIEvent: false, // ✅ Set = false vì đã filter AI events
                priority: ev.MucDoUuTien || 2,
                originalColor: color, // Lưu màu gốc
              },
            };
          });

        console.log(
          `✅ FINAL: ${res.data.length} total → ${aiEvents.length} AI filtered → ${normalEvents.length} normal events shown`
        );

        return normalEvents;
      } catch (err) {
        console.error("Load events error:", err);
        return [];
      }
    },

    // THÊM HÀM HELPER ĐỂ LẤY MÀU THEO ĐỘ ƯU TIÊN
    getPriorityColor(priority) {
      const colors = {
        1: "#34D399", // Xanh lá - Thấp
        2: "#60A5FA", // Xanh dương - Trung bình
        3: "#FBBF24", // Vàng - Cao
        4: "#F87171", // Đỏ - Rất cao
      };
      return colors[priority] || "#3788d8"; // Màu mặc định
    },

    // ==========================================================
    // RENDER CALENDAR - FIXED EVENT HANDLERS
    // ==========================================================
    renderCalendar(events) {
      const el = document.getElementById("calendar");
      if (!el) return;

      // Destroy old calendar
      if (this.calendar) {
        try {
          this.calendar.destroy();
        } catch (e) {}
        this.calendar = null;
      }
      el.innerHTML = "";

      this.calendar = new FullCalendar.Calendar(el, {
        initialView: this.currentView,
        locale: "vi",
        height: "100%",
        editable: true,
        droppable: true, // ✅ BẬT CHẾ ĐỘ DROP
        selectable: true,
        selectMirror: true,
        dayMaxEvents: true,
        headerToolbar: false,
        nowIndicator: true,
        events: events,

        // ✅ THÊM CẤU HÌNH ĐỂ NHẬN DRAG TỪ NGOÀI
        dropAccept: ".task-item, [draggable='true'], [data-task-id]",

        slotMinTime: "06:00:00",
        slotMaxTime: "23:00:00",
        slotDuration: "00:30:00",
        scrollTime: "08:00:00",

        buttonText: {
          today: "Hôm nay",
          month: "Tháng",
          week: "Tuần",
          day: "Ngày",
          list: "Danh sách",
        },
        allDayText: "Cả ngày",
        moreLinkText: (n) => `+ ${n} thêm`,
        noEventsText: "Không có sự kiện",

        // ✅ THÊM HÀM eventReceive ĐỂ XỬ LÝ KÉO THẢ
        eventReceive: (info) => {
          console.log("🎯 Task dropped onto calendar!", info);
          this._handleEventReceive(info);
        },

        eventDrop: async (info) => {
          await this._handleEventUpdate(info);
        },

        eventResize: async (info) => {
          await this._handleEventUpdate(info);
        },

        eventClick: (info) => {
          info.jsEvent.preventDefault();
          this._showEventDetails(info.event);
        },

        datesSet: () => this.updateCalendarTitle(),

        eventDidMount: (info) => {
          const el = info.el;
          el.style.cursor = "pointer";

          // ✅ THÊM ATTRIBUTE để query dễ dàng theo ID
          el.setAttribute("data-event-id", info.event.id);

          // Apply priority class based on priority level
          // Priority 1 = Low (Green), 2 = Medium (Blue), 3 = High (Yellow), 4 = Very High (Red)
          const priority = info.event.extendedProps.priority || 2;
          if (priority === 1) {
            el.classList.add("event-priority-low");
          } else if (priority === 3) {
            el.classList.add("event-priority-medium");
          } else if (priority === 4) {
            el.classList.add("event-priority-high");
          }
          // Priority 2 is default (Blue) - no class needed

          // Apply AI suggested styling if applicable
          if (info.event.extendedProps.aiSuggested) {
            el.classList.add("event-ai-suggested");
          }

          if (info.event.extendedProps.completed) {
            el.classList.add("event-completed");
            el.style.opacity = "0.6";
            el.style.textDecoration = "line-through";
          }

          const start =
            info.event.start?.toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            }) || "";
          const end =
            info.event.end?.toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            }) || "";
          el.title = `${info.event.title}\n${start} - ${end}`;
        },

        views: {
          dayGridMonth: { dayMaxEventRows: 4 },
          timeGridWeek: { slotDuration: "00:30:00" },
          timeGridDay: { slotDuration: "00:15:00" },
        },
      });

      this.calendar.render();
      window.calendar = this.calendar;
      this.updateCalendarTitle();

      // ✅ KÍCH HOẠT DROP ZONES
      this.setupDropZone();

      console.log("✅ FullCalendar đã render với chức năng kéo thả");
    },

    // ==========================================================
    // TIME CONFLICT CHECK
    // ==========================================================
    hasTimeConflict(newEvent, excludeTempEvents = true) {
      const events = this.calendar.getEvents();
      const s1 = newEvent.start;
      const e1 = newEvent.end || new Date(s1.getTime() + 3600000); // 1 giờ mặc định

      for (const ev of events) {
        // Bỏ qua event cần kiểm tra
        if (ev.id === newEvent.id) continue;

        // Bỏ qua event tạm nếu cần
        if (excludeTempEvents && ev.id?.startsWith("temp-")) continue;

        const s2 = ev.start;
        const e2 = ev.end || new Date(s2.getTime() + 3600000);

        // Kiểm tra overlap chính xác
        if (s1 < e2 && e1 > s2) {
          console.log(`⛔ Overlap detected with event: "${ev.title}"`);
          console.log(
            `   New event: ${this.formatDate(s1)} - ${this.formatDate(e1)}`
          );
          console.log(
            `   Existing:  ${this.formatDate(s2)} - ${this.formatDate(e2)}`
          );
          return true;
        }
      }
      return false;
    },

    // Thêm hàm formatDate helper
    formatDate(date) {
      if (!date) return "N/A";
      return date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },

    // ==========================================================
    // EVENT RECEIVE (drag from task list) - FIXED
    // ==========================================================
    async _handleEventReceive(info) {
      try {
        console.log("🎯 FullCalendar eventReceive triggered:", info);

        // Lấy thông tin từ dragged element
        const draggedEl = info.draggedEl;
        let taskId, title, color;

        if (draggedEl) {
          taskId = draggedEl.dataset.taskId;
          title = draggedEl.dataset.taskTitle || "Công việc";
          color = draggedEl.dataset.taskColor || "#3B82F6";
        } else {
          // Fallback: lấy từ dataTransfer
          taskId = info.jsEvent?.dataTransfer?.getData("text/plain");
          const jsonData =
            info.jsEvent?.dataTransfer?.getData("application/json");
          if (jsonData) {
            const data = JSON.parse(jsonData);
            title = data.title || "Công việc";
            color = data.color || "#3B82F6";
          }
        }

        if (!taskId) {
          console.error("❌ No taskId found");
          info.event.remove();
          Utils.showToast?.("Lỗi: Không tìm thấy ID công việc", "error");
          return;
        }

        console.log("📥 Task dropped from sidebar:", { taskId, title, color });

        const start = info.event.start;
        const end =
          info.event.end || new Date(start.getTime() + 60 * 60 * 1000);

        // Kiểm tra trùng lịch - SỬA CÁCH KIỂM TRA
        const existingEvents = this.calendar.getEvents();
        const hasConflict = existingEvents.some((existingEvent) => {
          // Bỏ qua chính event này và các event tạm
          if (existingEvent.id === info.event.id) return false;
          if (existingEvent.id?.startsWith("temp-")) return false;

          const s1 = start;
          const e1 = end;
          const s2 = existingEvent.start;
          const e2 =
            existingEvent.end || new Date(s2.getTime() + 60 * 60 * 1000);

          // Kiểm tra overlap
          return s1 < e2 && e1 > s2;
        });

        if (hasConflict) {
          Utils.showToast?.("⛔ Thời gian này đã có sự kiện khác!", "error");
          info.event.remove();
          return;
        }

        // Gọi hàm save
        await this.saveDroppedEvent(taskId, title, color, start, end);
      } catch (err) {
        console.error("❌ Event receive error:", err);
        info.event.remove();
        Utils.showToast?.("Lỗi kéo thả công việc", "error");
      }
    },

    // ==========================================================
    // EVENT UPDATE (move / resize) - FIXED FIELD NAMES
    // ==========================================================
    async _handleEventUpdate(info) {
      try {
        console.log("🔄 Event updated:", info.event);

        const eventId = info.event.id;
        if (!eventId) {
          throw new Error("Event không có ID");
        }

        // ✅ QUAN TRỌNG: Nếu event ID vẫn là temp-xxx hoặc drag-xxx thì chưa được lưu server
        // Chỉ cập nhật local, không gửi lên server, và KHÔNG báo toast (đây là hành động bình thường)
        if (
          eventId.toString().startsWith("temp-") ||
          eventId.toString().startsWith("drag-")
        ) {
          console.log(
            `⏳ Event ${eventId} chưa lưu server, cập nhật local. POST sẽ gửi lên sau...`
          );
          // ⚠️ ĐẶC BIỆT: Không báo toast ở đây vì user đang drag/resize, event sẽ được lưu server
          // trong callback eventReceive. Chỉ báo toast khi có thực sự lỗi
          return; // Không gửi request, FullCalendar sẽ tự update local
        }

        // Chỉ gửi update nếu ID là số hợp lệ
        const eventIdNum = parseInt(eventId, 10);
        if (isNaN(eventIdNum)) {
          console.warn(
            `⚠️ Event ID ${eventId} không hợp lệ, chỉ cập nhật local`
          );
          return;
        }

        const newStart = info.event.start;
        const newEnd =
          info.event.end || new Date(newStart.getTime() + 60 * 60 * 1000);

        // Kiểm tra trùng lịch (loại trừ chính nó)
        if (this.hasTimeConflict(info.event)) {
          Utils.showToast?.("⛔ Thời gian này đã có sự kiện khác!", "error");
          info.revert();
          return;
        }

        // Hiển thị loading thông báo
        Utils.showToast?.("🔄 Đang cập nhật thời gian...", "info");

        // Sử dụng field names ĐÚNG theo backend calendar.js
        const updateData = {
          start: newStart.toISOString(),
          end: newEnd.toISOString(),
        };

        console.log(`📤 Updating event ${eventIdNum}:`, updateData);

        const result = await Utils.makeRequest(
          `/api/calendar/events/${eventIdNum}`,
          "PUT",
          updateData
        );

        if (!result.success) {
          throw new Error(result.message || "Cập nhật thất bại");
        }

        // Thông báo thành công
        Utils.showToast?.("✅ Đã cập nhật thời gian sự kiện", "success");

        // Hiệu ứng visual cho event vừa cập nhật
        const eventElement = document.querySelector(
          `[data-event-id="${eventId}"]`
        );
        if (eventElement) {
          eventElement.classList.add("bg-green-50", "border-green-200");
          setTimeout(() => {
            eventElement.classList.remove("bg-green-50", "border-green-200");
          }, 1500);
        }

        console.log("✅ Event updated successfully");
      } catch (error) {
        console.error("❌ Error in eventUpdate:", error);

        // Thông báo lỗi chi tiết
        let errorMessage = "Lỗi khi cập nhật thời gian";
        if (
          error.message.includes("conflict") ||
          error.message.includes("trùng")
        ) {
          errorMessage =
            "⛔ Không thể di chuyển: Thời gian đã có sự kiện khác!";
        } else if (error.message.includes("validation")) {
          errorMessage = "⚠️ Thời gian không hợp lệ!";
        } else {
          errorMessage = error.message || "Lỗi khi cập nhật thời gian";
        }

        Utils.showToast?.(errorMessage, "error");
        info.revert();
      }
    },

    setupDropZone() {
      console.log("🎯 Setting up calendar drop zone...");

      const calendarEl = document.getElementById("calendar");
      if (!calendarEl) {
        console.error("❌ Calendar element not found");
        return;
      }

      // Xóa event listeners cũ (nếu đã bind trước đó)
      try {
        if (this._boundCalendarDragOver) {
          calendarEl.removeEventListener(
            "dragover",
            this._boundCalendarDragOver
          );
        }
        if (this._boundCalendarDragLeave) {
          calendarEl.removeEventListener(
            "dragleave",
            this._boundCalendarDragLeave
          );
        }
        if (this._boundCalendarDrop) {
          calendarEl.removeEventListener("drop", this._boundCalendarDrop);
        }
      } catch (e) {
        /* ignore */
      }

      // Thêm event listeners mới (lưu reference để dễ remove sau này)
      this._boundCalendarDragOver = this.handleDragOver.bind(this);
      this._boundCalendarDragLeave = this.handleDragLeave.bind(this);
      this._boundCalendarDrop = this.handleDrop.bind(this);

      calendarEl.addEventListener("dragover", this._boundCalendarDragOver);
      calendarEl.addEventListener("dragleave", this._boundCalendarDragLeave);
      calendarEl.addEventListener("drop", this._boundCalendarDrop);

      // Thêm CSS cho drop zone
      const style = document.createElement("style");
      style.textContent = `
    .drop-zone-active {
      background-color: rgba(59, 130, 246, 0.1) !important;
      border: 2px dashed #3b82f6 !important;
    }
    .task-item.dragging {
      opacity: 0.7;
      transform: scale(0.95);
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
    }
  `;
      document.head.appendChild(style);

      // ✅ Document-level fallback for drops that escape calendar element
      try {
        if (this._docDropListener) {
          document.removeEventListener("drop", this._docDropListener);
        }

        this._docDropListener = (e) => {
          const calendarRect = calendarEl.getBoundingClientRect();
          const isOverCalendar =
            e.clientX >= calendarRect.left &&
            e.clientX <= calendarRect.right &&
            e.clientY >= calendarRect.top &&
            e.clientY <= calendarRect.bottom;

          if (isOverCalendar) {
            console.log("📥 Document-level drop handler activated");
            e.preventDefault();
            this.handleDrop(e);
          }
        };

        document.addEventListener("drop", this._docDropListener);
      } catch (e) {
        console.warn("Could not attach document-level drop listener:", e);
      }

      console.log("✅ Drop zone setup complete");
    },

    handleDragOver(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      const calendarEl = document.getElementById("calendar");
      if (calendarEl) {
        calendarEl.classList.add("drop-zone-active");
      }
    },

    handleDragLeave(e) {
      e.preventDefault();

      const calendarEl = document.getElementById("calendar");
      if (calendarEl && !calendarEl.contains(e.relatedTarget)) {
        calendarEl.classList.remove("drop-zone-active");
      }
    },

    async handleDrop(e) {
      // Guard against duplicate handling
      if (this._handlingDrop) {
        console.log("⚠️ Drop already being handled, ignoring duplicate");
        return;
      }
      this._handlingDrop = true;

      try {
        e.preventDefault();

        const calendarEl = document.getElementById("calendar");
        if (calendarEl) {
          calendarEl.classList.remove("drop-zone-active");
        }

        console.log(
          "📥 handleDrop called, dataTransfer types:",
          e.dataTransfer?.types
        );

        // Lấy dữ liệu từ drag - try multiple sources
        let taskId = e.dataTransfer.getData("text/plain");
        let taskData = {};

        const jsonData = e.dataTransfer.getData("application/json");
        if (jsonData) {
          try {
            taskData = JSON.parse(jsonData);
          } catch (err) {
            console.warn("Could not parse JSON drag data:", err);
          }
        }

        // Fallback: check for taskId in alternate data key
        if (!taskId) {
          taskId = e.dataTransfer.getData("taskId") || taskData.taskId;
        }

        if (!taskId) {
          console.error("❌ No task ID found in drop data");
          console.log("Available dataTransfer types:", e.dataTransfer.types);
          return;
        }

        const title = taskData.title || "Công việc mới";
        const color = taskData.color || "#3B82F6";

        console.log(`🎯 Dropping task ${taskId}: ${title}`);

        // Lấy thông tin vị trí drop từ FullCalendar
        const calendar = this.calendar;

        // Chuyển tọa độ chuột sang tọa độ calendar
        const point = {
          clientX: e.clientX,
          clientY: e.clientY,
        };

        // Dùng FullCalendar's public API để lấy date từ điểm drop
        let dropDate = new Date(); // Mặc định

        try {
          // Thử lấy date từ calendar
          const calendarApi = calendar;
          const calendarElRect = calendar.el.getBoundingClientRect();

          // Tính toán relative position
          const relativeX = point.clientX - calendarElRect.left;
          const relativeY = point.clientY - calendarElRect.top;

          // Tìm cell tại vị trí drop
          const dateStr = calendarApi.currentData.viewApi.dateEnv
            .toDate(new Date())
            .toISOString();

          // Tạo event với thời gian hợp lý (bắt đầu từ giờ hiện tại)
          dropDate = new Date();
          dropDate.setMinutes(0); // Làm tròn đến giờ
          dropDate.setSeconds(0);
          dropDate.setMilliseconds(0);
        } catch (err) {
          console.warn(
            "Could not calculate drop position, using current time:",
            err
          );
        }

        // Tạo event mới
        const newEvent = {
          id: `temp-${Date.now()}`,
          title: title,
          start: dropDate,
          end: new Date(dropDate.getTime() + 60 * 60 * 1000), // 1 giờ mặc định
          backgroundColor: color,
          borderColor: color,
          editable: true, // ✅ QUAN TRỌNG: Cho phép kéo dịch chuyển
          durationEditable: true, // Cho phép thay đổi độ dài
          startEditable: true, // Cho phép thay đổi thời gian bắt đầu
          extendedProps: {
            taskId: taskId,
            isFromDrag: true,
            color: color,
          },
        };

        // Kiểm tra conflict (CHỈ KIỂM TRA NẾU EVENT ĐÃ CÓ TRONG CALENDAR)
        const existingEvents = calendar.getEvents();
        const hasConflict = existingEvents.some((existingEvent) => {
          // Bỏ qua event tạm thời
          if (existingEvent.id?.startsWith("temp-")) return false;

          const s1 = newEvent.start;
          const e1 = newEvent.end;
          const s2 = existingEvent.start;
          const e2 =
            existingEvent.end || new Date(s2.getTime() + 60 * 60 * 1000);

          // Kiểm tra overlap
          return s1 < e2 && e1 > s2;
        });

        if (hasConflict) {
          Utils.showToast?.("⛔ Thời gian này đã có sự kiện khác!", "error");
          return;
        }

        // Thêm event vào calendar
        calendar.addEvent(newEvent);

        // Lưu vào server
        await this.saveDroppedEvent(
          taskId,
          title,
          color,
          newEvent.start,
          newEvent.end
        );
      } catch (error) {
        console.error("❌ Drop error:", error);
        Utils.showToast?.("Lỗi khi kéo thả công việc", "error");
      } finally {
        this._handlingDrop = false;
      }
    },

    async saveDroppedEvent(taskId, title, color, start, end) {
      try {
        console.log("💾 Saving dropped event to server...");

        const eventData = {
          MaCongViec: parseInt(taskId),
          TieuDe: title,
          GioBatDau: start.toISOString(),
          GioKetThuc: end.toISOString(),
          MauSac: color,
          AI_DeXuat: 0,
        };

        const res = await Utils.makeRequest(
          "/api/calendar/events",
          "POST",
          eventData
        );

        if (res.success) {
          const newEventId =
            res.eventId || res.data?.MaLichTrinh || res.data?.id;

          console.log(`📌 New event created with ID: ${newEventId}`);

          // ✅ FIX: Tìm event chính xác theo ID
          // Thường là drag-{taskId} từ FullCalendar.Draggable
          const events = this.calendar.getEvents();
          let tempEvent = events.find((e) => e.id === `drag-${taskId}`);

          // Fallback: Nếu không tìm được exact match, tìm event đầu tiên bắt đầu với temp- hoặc drag-
          if (!tempEvent) {
            tempEvent = events.find(
              (e) => e.id?.startsWith(`temp-`) || e.id?.startsWith(`drag-`)
            );
          }

          if (tempEvent) {
            console.log(
              `🔄 Updating event ${tempEvent.id} with real ID ${newEventId}...`
            );

            // Cập nhật tất cả properties để FullCalendar re-render
            tempEvent.setProp("id", newEventId);
            tempEvent.setExtendedProp("taskId", taskId);
            tempEvent.setExtendedProp("isFromDrag", true);

            // ✅ QUAN TRỌNG: Đảm bảo event editable
            tempEvent.setProp("editable", true);
            tempEvent.setProp("durationEditable", true);
            tempEvent.setProp("startEditable", true);

            console.log(
              `✅ Event ${newEventId} now has real ID and is draggable`
            );
          } else {
            console.warn(
              `⚠️ Could not find event with ID drag-${taskId}. Available events:`,
              events.map((e) => e.id)
            );
          }

          // Cập nhật trạng thái task thành "đang thực hiện"
          await Utils.makeRequest(`/api/tasks/${taskId}`, "PUT", {
            TrangThaiThucHien: 1,
          });

          Utils.showToast?.("✅ Đã lên lịch thành công!", "success");

          // Reload sidebar để ẩn task đã lên lịch
          if (window.loadUserTasks) {
            window.loadUserTasks(true);
          }

          // Trigger refresh
          this.triggerSidebarRefresh();
        } else {
          throw new Error(res.message || "Lỗi thêm vào lịch");
        }
      } catch (error) {
        console.error("❌ Error saving dropped event:", error);

        // Xóa event tạm nếu lỗi
        const events = this.calendar.getEvents();
        const tempEvent = events.find((e) => e.id?.startsWith(`temp-`));
        if (tempEvent) {
          tempEvent.remove();
        }

        Utils.showToast?.(error.message || "Lỗi khi lưu sự kiện", "error");
      }
    },

    triggerSidebarRefresh() {
      console.log("📢 Triggering sidebar refresh...");

      // Cách 1: Dispatch event
      document.dispatchEvent(
        new CustomEvent("task-scheduled", {
          detail: { action: "refresh" },
        })
      );

      // Cách 2: Gọi trực tiếp nếu hàm tồn tại
      if (window.loadUserTasks && typeof window.loadUserTasks === "function") {
        setTimeout(() => {
          window.loadUserTasks(true);
        }, 500);
      }

      // Cách 3: Storage event
      try {
        localStorage.setItem("__calendar_refresh", Date.now().toString());
        setTimeout(() => {
          localStorage.removeItem("__calendar_refresh");
        }, 100);
      } catch (e) {
        console.log("Cannot use localStorage:", e);
      }
    },

    linkWorkTasksToCalendar() {
      console.log("🔗 Linking work tasks to calendar drag & drop...");

      // Đảm bảo các tasks trong work section có đủ attributes cho drag
      const workTasks = document.querySelectorAll(
        "#work-items-container .work-item"
      );

      workTasks.forEach((task) => {
        const taskId = task.dataset.taskId;
        if (taskId) {
          // Thêm attributes cần thiết nếu chưa có
          if (!task.hasAttribute("draggable")) {
            task.setAttribute("draggable", "true");
          }

          if (!task.dataset.taskTitle) {
            const titleEl = task.querySelector("h4");
            if (titleEl) {
              task.dataset.taskTitle = titleEl.textContent.trim();
            }
          }

          if (!task.dataset.taskColor) {
            const borderLeft =
              task.style.borderLeftColor ||
              getComputedStyle(task).borderLeftColor;
            task.dataset.taskColor = borderLeft || "#3B82F6";
          }
        }
      });
    },

    // refreshDragDrop() {
    //   console.log("🔄 Refreshing drag & drop...");
    //   setTimeout(() => {
    //     this.setupNativeDragDrop();
    //     this.setupExternalDraggable();
    //   }, 100);
    // },

    // ==========================================================
    // SHOW EVENT DETAILS MODAL - SIMPLIFIED VERSION
    // ==========================================================
    // ==========================================================
    // SHOW EVENT DETAILS MODAL - WITH DELETE BUTTON
    // ==========================================================
    // ==========================================================
    // SHOW EVENT DETAILS MODAL - WITH DANGER ZONE DELETE
    // ==========================================================
    _showEventDetails(event) {
      const p = event.extendedProps;
      const startStr = event.start
        ? event.start.toLocaleString("vi-VN")
        : "N/A";
      const endStr = event.end ? event.end.toLocaleString("vi-VN") : "N/A";

      // Format thời gian cho cảnh báo
      const dateStr = event.start
        ? event.start.toLocaleDateString("vi-VN")
        : "";
      const timeStr = event.start
        ? event.start.toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";

      const modalHtml = `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="eventDetailModal">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <!-- Header với tiêu đề và ID -->
          <div class="flex justify-between items-start mb-5">
            <h3 class="text-2xl font-bold text-gray-800">${event.title}</h3>
            <span class="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">ID: ${
              event.id || "Tạm thời"
            }</span>
          </div>
          
          <!-- Thông tin chi tiết -->
          <div class="space-y-4 mb-6">
            <div class="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h4 class="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <i class="fas fa-info-circle"></i> Thông tin sự kiện
              </h4>
              <div class="space-y-2">
                <div class="flex">
                  <span class="w-32 text-gray-600 font-medium">Thời gian:</span>
                  <span>${dateStr} ${timeStr}</span>
                </div>
                <div class="flex">
                  <span class="w-32 text-gray-600 font-medium">Khoảng thời gian:</span>
                  <span>${startStr} → ${endStr}</span>
                </div>
                <div class="flex">
                  <span class="w-32 text-gray-600 font-medium">Ghi chú:</span>
                  <span class="flex-1">${p.note || "Không có ghi chú"}</span>
                </div>
                <div class="flex">
                  <span class="w-32 text-gray-600 font-medium">Trạng thái:</span>
                  <span class="${
                    p.completed
                      ? "text-green-600 font-semibold"
                      : "text-orange-600 font-semibold"
                  } flex items-center gap-2">
                    ${
                      p.completed
                        ? '<i class="fas fa-check-circle"></i> Đã hoàn thành'
                        : '<i class="fas fa-clock"></i> Chưa hoàn thành'
                    }
                  </span>
                </div>
                ${
                  p.taskId
                    ? `
                <div class="flex">
                  <span class="w-32 text-gray-600 font-medium">Liên kết công việc:</span>
                  <span class="text-blue-600 font-medium">
                    <i class="fas fa-link"></i> Công việc #${p.taskId}
                  </span>
                </div>
                `
                    : ""
                }
              </div>
            </div>

            <!-- Toggle hoàn thành -->
            <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label class="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" id="eventCompletedCheckbox" 
                       class="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                       ${p.completed ? "checked" : ""}>
                <span class="text-lg font-medium">Đánh dấu đã hoàn thành</span>
              </label>
              <p class="text-sm text-gray-500 mt-2">
                ${
                  p.completed
                    ? "Sự kiện đã hoàn thành sẽ được ẩn khỏi lịch sau 1 giây"
                    : "Đánh dấu hoàn thành sẽ tự động xóa sự kiện khỏi lịch"
                }
              </p>
            </div>

            <!-- KHU VỰC NGUY HIỂM - XÓA SỰ KIỆN -->
            <div class="p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 class="font-semibold text-red-800 mb-3 flex items-center gap-2">
                <i class="fas fa-exclamation-triangle"></i> Khu vực nguy hiểm
              </h4>
              
              <!-- Cảnh báo xóa -->
              <div class="mb-4">
                <p class="text-red-700 mb-2 font-medium">Xóa vĩnh viễn sự kiện này?</p>
                <div class="space-y-2 text-sm text-red-600">
                  <p class="flex items-start gap-2">
                    <i class="fas fa-times-circle mt-0.5"></i>
                    <span>Sự kiện sẽ bị xóa hoàn toàn khỏi hệ thống</span>
                  </p>
                  <p class="flex items-start gap-2">
                    <i class="fas fa-history mt-0.5"></i>
                    <span>Không thể khôi phục sau khi xóa</span>
                  </p>
                  ${
                    p.taskId
                      ? `
                  <p class="flex items-start gap-2">
                    <i class="fas fa-unlink mt-0.5"></i>
                    <span>Chỉ xóa sự kiện lịch trình, không xóa công việc gốc</span>
                  </p>
                  `
                      : ""
                  }
                </div>
              </div>

              <!-- Nút xóa với xác nhận kép -->
              <div class="space-y-3">
                <button id="showDeleteConfirmBtn" 
                        class="w-full px-4 py-3 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg">
                  <i class="fas fa-trash"></i>
                  Xóa sự kiện
                </button>
                
                <!-- Xác nhận xóa (ẩn ban đầu) -->
                <div id="deleteConfirmation" class="hidden space-y-3">
                  <div class="p-3 bg-red-100 border border-red-300 rounded-lg">
                    <p class="text-red-800 font-semibold text-center mb-2">Xác nhận xóa?</p>
                    <p class="text-sm text-red-700 text-center">
                      Nhập "<span class="font-bold">${event.title.substring(
                        0,
                        20
                      )}</span>" để xác nhận
                    </p>
                  </div>
                  
                  <div class="space-y-3">
                    <input type="text" 
                           id="deleteConfirmInput" 
                           class="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" 
                           placeholder="Nhập tiêu đề sự kiện để xác nhận">
                    
                    <div class="flex gap-3">
                      <button id="cancelDeleteBtn" 
                              class="flex-1 px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg font-medium transition">
                        Hủy bỏ
                      </button>
                      <button id="confirmDeleteBtn" 
                              class="flex-1 px-4 py-2 bg-red-700 text-white hover:bg-red-800 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled>
                        <i class="fas fa-skull-crossbones mr-2"></i>
                        Xóa vĩnh viễn
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button id="closeEventDetail" 
                    class="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition">
              Đóng
            </button>
            <button id="saveEventStatus" 
                    class="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition">
              <i class="fas fa-save mr-2"></i>
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>
    </div>`;

      // Remove old modal
      document.getElementById("eventDetailModal")?.remove();
      document.body.insertAdjacentHTML("beforeend", modalHtml);

      // Event listeners
      document.getElementById("closeEventDetail").onclick = () =>
        document.getElementById("eventDetailModal").remove();

      document.getElementById("saveEventStatus").onclick = () =>
        this._updateEventStatus(event);

      // Real-time checkbox completion - AUTO SAVE when clicked
      const completionCheckbox = document.getElementById(
        "eventCompletedCheckbox"
      );
      completionCheckbox.addEventListener("change", async () => {
        // Auto-save immediately without waiting for button click
        this._updateEventStatus(event);
      });

      // Allow Ctrl+S to save quickly
      const handleSaveShortcut = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
          e.preventDefault();
          document.getElementById("saveEventStatus").click();
          document.removeEventListener("keydown", handleSaveShortcut);
        }
      };
      document.addEventListener("keydown", handleSaveShortcut);

      // Xử lý xóa với xác nhận kép
      const deleteBtn = document.getElementById("showDeleteConfirmBtn");
      const deleteConfirmation = document.getElementById("deleteConfirmation");
      const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
      const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
      const deleteConfirmInput = document.getElementById("deleteConfirmInput");

      deleteBtn.addEventListener("click", () => {
        deleteConfirmation.classList.remove("hidden");
        deleteBtn.classList.add("hidden");
      });

      cancelDeleteBtn.addEventListener("click", () => {
        deleteConfirmation.classList.add("hidden");
        deleteBtn.classList.remove("hidden");
        deleteConfirmInput.value = "";
        confirmDeleteBtn.disabled = true;
      });

      // Kiểm tra input xác nhận
      deleteConfirmInput.addEventListener("input", (e) => {
        const inputText = e.target.value.trim();
        const eventTitleShort = event.title.substring(0, 20);

        confirmDeleteBtn.disabled = inputText !== eventTitleShort;

        if (inputText === eventTitleShort) {
          confirmDeleteBtn.classList.remove("bg-red-700");
          confirmDeleteBtn.classList.add("bg-red-800", "animate-pulse");
        } else {
          confirmDeleteBtn.classList.remove("bg-red-800", "animate-pulse");
          confirmDeleteBtn.classList.add("bg-red-700");
        }
      });

      // Xác nhận xóa
      confirmDeleteBtn.addEventListener("click", () => {
        if (deleteConfirmInput.value.trim() === event.title.substring(0, 20)) {
          this._deleteEvent(event);
        }
      });

      // Cho phép Enter để xác nhận
      deleteConfirmInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !confirmDeleteBtn.disabled) {
          confirmDeleteBtn.click();
        }
      });
    },

    // ==========================================================
    // DELETE EVENT WITH EXTRA CONFIRMATION
    // ==========================================================
    async _deleteEvent(event) {
      const eventId = event.id;

      if (!eventId || eventId.toString().startsWith("temp-")) {
        Utils.showToast?.("⚠️ Sự kiện chưa được lưu vào database", "warning");
        document.getElementById("eventDetailModal")?.remove();
        event.remove();
        return;
      }

      try {
        // Hiệu ứng loading cho nút xóa
        const confirmBtn = document.getElementById("confirmDeleteBtn");
        const originalText = confirmBtn.innerHTML;
        confirmBtn.innerHTML =
          '<i class="fas fa-spinner fa-spin mr-2"></i> Đang xóa...';
        confirmBtn.disabled = true;

        // Gọi API xóa sự kiện
        const result = await Utils.makeRequest(
          `/api/calendar/events/${eventId}`,
          "DELETE"
        );

        if (!result.success) {
          // Kiểm tra nếu có lỗi liên quan đến task
          if (
            (result.message && result.message.includes("liên quan")) ||
            result.message.includes("task")
          ) {
            throw new Error(
              "Sự kiện đang liên kết với công việc. Vui lòng kiểm tra lại."
            );
          }
          throw new Error(result.message || "Xóa sự kiện thất bại");
        }

        // Hiệu ứng visual trước khi xóa
        const modal = document.getElementById("eventDetailModal");
        if (modal) {
          modal.style.animation = "fadeOut 0.3s ease forwards";
          setTimeout(() => modal.remove(), 300);
        }

        // ✅ CHỈ TÌM VÀ XÓA EVENT CỤ THỂ THEO ID
        const eventEl = document.querySelector(`[data-event-id="${eventId}"]`);

        if (eventEl) {
          console.log(`🎯 Found event element with ID ${eventId} for deletion`);
          eventEl.style.animation = "shrinkOut 0.5s ease forwards";
          eventEl.style.transformOrigin = "center";
          setTimeout(() => {
            event.remove();
          }, 500);
        } else {
          console.warn(
            `⚠️ Event element with ID ${eventId} not found in DOM, removing from calendar`
          );
          event.remove();
        }

        // Thông báo thành công với hiệu ứng
        Utils.showToast?.("🗑️ Đã xóa sự kiện thành công!", "success");

        console.log(`✅ Event ${eventId} deleted successfully`);

        // Dispatch event để các component khác biết
        document.dispatchEvent(
          new CustomEvent("eventDeleted", {
            detail: { eventId, eventTitle: event.title },
          })
        );
      } catch (error) {
        console.error("❌ Error deleting event:", error);

        // Khôi phục nút xóa
        const confirmBtn = document.getElementById("confirmDeleteBtn");
        if (confirmBtn) {
          confirmBtn.innerHTML =
            '<i class="fas fa-skull-crossbones mr-2"></i> Xóa vĩnh viễn';
          confirmBtn.disabled = false;
        }

        let errorMessage = "Lỗi khi xóa sự kiện";
        if (
          error.message.includes("liên kết") ||
          error.message.includes("task")
        ) {
          errorMessage = "⛔ " + error.message;
        } else if (
          error.message.includes("database") ||
          error.message.includes("ID hợp lệ")
        ) {
          errorMessage = "⚠️ " + error.message;
        } else {
          errorMessage = error.message || "Lỗi khi xóa sự kiện";
        }

        Utils.showToast?.(errorMessage, "error");
      }
    },
    // ==========================================================
    // UPDATE EVENT STATUS - REAL-TIME WITH IMMEDIATE FEEDBACK
    // ==========================================================
    async _updateEventStatus(event) {
      try {
        console.log("🔍 Updating event status:", {
          id: event.id,
          title: event.title,
          currentCompleted: event.extendedProps.completed,
        });

        const checkbox = document.getElementById("eventCompletedCheckbox");
        if (!checkbox) {
          console.error("❌ Checkbox not found");
          return;
        }

        const completed = checkbox.checked;
        console.log(`📝 Event ${event.id}: Setting completed to ${completed}`);

        // Store original state for rollback
        const wasCompleted = event.extendedProps.completed;

        // Immediate visual feedback
        const saveBtn = document.getElementById("saveEventStatus");
        const originalBtnText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML =
          '<i class="fas fa-spinner fa-spin mr-2"></i> Đang cập nhật...';

        // ✅ CHỈ TÌM EVENT CỤ THỂ THEO ID - KHÔNG DÙNG TITLE
        const eventEl = document.querySelector(`[data-event-id="${event.id}"]`);

        if (!eventEl) {
          console.warn(`⚠️ Could not find event element with ID ${event.id}`);
        } else {
          console.log(`🎨 Found event element for ID ${event.id}`);

          // Apply visual changes immediately
          if (completed) {
            eventEl.classList.add("event-completed", "completing");
            eventEl.style.textDecoration = "line-through";
            eventEl.style.opacity = "0.6";
          } else {
            eventEl.classList.remove("event-completed", "completing");
            eventEl.style.textDecoration = "none";
            eventEl.style.opacity = "1";
          }
        }

        // ✅ Gửi request với field đúng
        const updateData = {
          completed: completed,
        };

        console.log(
          `📤 Sending PUT to /api/calendar/events/${event.id}:`,
          updateData
        );

        const res = await Utils.makeRequest(
          `/api/calendar/events/${event.id}`,
          "PUT",
          updateData
        );

        console.log("📥 Response:", res);

        if (res.success) {
          console.log("✅ Event status updated successfully");

          // Update event state in FullCalendar
          event.setExtendedProp("completed", completed);

          // Update modal status text
          const statusEl = document.querySelector(
            '[class*="text-green-600"], [class*="text-orange-600"]'
          );
          if (statusEl) {
            if (completed) {
              statusEl.className =
                "text-green-600 font-semibold flex items-center gap-2";
              statusEl.innerHTML =
                '<i class="fas fa-check-circle"></i> Đã hoàn thành';
            } else {
              statusEl.className =
                "text-orange-600 font-semibold flex items-center gap-2";
              statusEl.innerHTML =
                '<i class="fas fa-clock"></i> Chưa hoàn thành';
            }
          }

          // Show success toast
          Utils.showToast?.(
            completed
              ? "✅ Đã hoàn thành công việc!"
              : "↩️ Bỏ đánh dấu hoàn thành",
            "success"
          );

          // Dispatch event to notify salary manager and other components
          document.dispatchEvent(
            new CustomEvent("eventCompleted", {
              detail: {
                eventId: event.id,
                title: event.title,
                completed: completed,
                taskId: event.extendedProps?.taskId,
              },
            })
          );
          console.log("📢 Dispatched eventCompleted event");

          // Restore button
          saveBtn.disabled = false;
          saveBtn.innerHTML = originalBtnText;

          // Close modal after short delay
          setTimeout(() => {
            document.getElementById("eventDetailModal")?.remove();
          }, 600);
        } else {
          console.error("❌ Update failed:", res.message);

          // ✅ ROLLBACK CHỈ EVENT CỤ THỂ - KHÔNG ẢNH HƯỞNG EVENTS KHÁC
          if (eventEl) {
            if (wasCompleted) {
              eventEl.classList.add("event-completed");
              eventEl.style.textDecoration = "line-through";
              eventEl.style.opacity = "0.6";
            } else {
              eventEl.classList.remove("event-completed");
              eventEl.style.textDecoration = "none";
              eventEl.style.opacity = "1";
            }
          }

          // Restore button and checkbox
          saveBtn.disabled = false;
          saveBtn.innerHTML = originalBtnText;
          checkbox.checked = wasCompleted;

          throw new Error(res.message || "Cập nhật trạng thái thất bại");
        }
      } catch (err) {
        console.error("❌ Cập nhật trạng thái lỗi:", err);

        // ✅ ROLLBACK AN TOÀN - CHỈ EVENT ĐANG XỬ LÝ
        const eventEl = document.querySelector(`[data-event-id="${event.id}"]`);
        const wasCompleted = event.extendedProps.completed;

        if (eventEl) {
          if (wasCompleted) {
            eventEl.classList.add("event-completed");
            eventEl.style.textDecoration = "line-through";
            eventEl.style.opacity = "0.6";
          } else {
            eventEl.classList.remove("event-completed");
            eventEl.style.textDecoration = "none";
            eventEl.style.opacity = "1";
          }
        }

        Utils.showToast?.(
          "❌ " + (err.message || "Lỗi cập nhật trạng thái"),
          "error"
        );

        // Restore button
        const saveBtn = document.getElementById("saveEventStatus");
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = '<i class="fas fa-save mr-2"></i> Lưu thay đổi';
        }

        // Restore checkbox
        const checkbox = document.getElementById("eventCompletedCheckbox");
        if (checkbox) {
          checkbox.checked = wasCompleted;
        }
      }
    },

    // ==========================================================
    // EXTERNAL DRAGGABLE (FullCalendar method)
    // ==========================================================
    // setupExternalDraggable() {
    //   console.log("🔍 Searching for draggable items...");

    //   // CHỈ TÌM KIẾM TRONG SIDEBAR, KHÔNG PHẢI TOÀN BỘ TRANG
    //   const selectors = [
    //     '#task-list div[draggable="true"]',
    //     "#task-list > div",
    //     "#task-list [data-task-id]",
    //   ];

    //   let draggableItems = [];

    //   selectors.forEach((selector) => {
    //     const items = document.querySelectorAll(selector);
    //     console.log(
    //       `📦 Found ${items.length} items with selector: ${selector}`
    //     );
    //     items.forEach((item) => draggableItems.push(item));
    //   });

    //   console.log(`🎯 Total draggable items found: ${draggableItems.length}`);

    //   if (draggableItems.length === 0) {
    //     console.log("⚠️ No draggable items found!");
    //     return;
    //   }

    //   // CHỈ SETUP DRAG CHO ITEMS TRONG SIDEBAR
    //   this.setupDragForItems(draggableItems);
    // },

    // ==========================================================
    // NAVBAR BUTTONS
    // ==========================================================
    initializeNavbarEvents() {
      const controls = {
        "cal-prev-btn": () => this.calendar.prev(),
        "cal-next-btn": () => this.calendar.next(),
        "cal-today-btn": () => this.calendar.today(),
        "cal-day-view": () => this.changeView("timeGridDay"),
        "cal-week-view": () => this.changeView("timeGridWeek"),
        "cal-month-view": () => this.changeView("dayGridMonth"),
      };

      Object.entries(controls).forEach(([id, handler]) => {
        const btn = document.getElementById(id);
        if (btn) {
          // Remove old listeners by cloning
          const newBtn = btn.cloneNode(true);
          btn.parentNode.replaceChild(newBtn, btn);
          newBtn.addEventListener("click", (e) => {
            e.preventDefault();
            handler();
            this.updateCalendarTitle();
          });
        }
      });

      this.setActiveView(this.currentView);
    },

    changeView(view) {
      this.currentView = view;
      this.calendar.changeView(view);
      this.updateCalendarTitle();
      this.setActiveView(view);
    },

    setActiveView(view) {
      ["cal-day-view", "cal-week-view", "cal-month-view"].forEach((id) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        if (
          (view === "timeGridDay" && id === "cal-day-view") ||
          (view === "timeGridWeek" && id === "cal-week-view") ||
          (view === "dayGridMonth" && id === "cal-month-view")
        ) {
          btn.classList.add("bg-white", "text-gray-900", "shadow-sm");
          btn.classList.remove("hover:bg-white");
        } else {
          btn.classList.remove("bg-white", "text-gray-900", "shadow-sm");
          btn.classList.add("hover:bg-white");
        }
      });
    },

    updateCalendarTitle() {
      const titleEl = document.getElementById("calendar-title");
      if (titleEl && this.calendar)
        titleEl.textContent = this.calendar.view.title;
    },

    // setupDragForItems(items) {
    //   if (!items || items.length === 0) return;

    //   items.forEach((item) => {
    //     // Xóa listener cũ nếu có
    //     item.removeEventListener("dragstart", this.handleDragStart);

    //     item.addEventListener("dragstart", this.handleDragStart.bind(this));
    //     item.setAttribute("draggable", "true");

    //     // Thêm data để biết task ID
    //     const taskId = item.dataset.taskId || item.getAttribute("data-task-id");
    //     if (taskId) {
    //       item.dataset.taskId = taskId;
    //     }
    //   });

    //   console.log(`Setup drag cho ${items.length} task items`);
    // },

    // handleDragStart(e) {
    //   const taskItem = e.target.closest(".task-item"); // Tìm item gần nhất để lấy đầy đủ data
    //   const taskId = taskItem.dataset.taskId;
    //   const title = taskItem.dataset.taskTitle || "Công việc";
    //   const priority = parseInt(taskItem.dataset.taskPriority) || 2; // Lấy từ dataset (nếu sidebar set)
    //   const color =
    //     taskItem.dataset.taskColor || this.getPriorityColor(priority); // Ưu tiên color từ dataset

    //   if (taskId) {
    //     e.dataTransfer.setData("text/plain", taskId);
    //     e.dataTransfer.setData("taskId", taskId);
    //     e.dataTransfer.setData("title", title);
    //     e.dataTransfer.setData("priority", priority);
    //     e.dataTransfer.setData("color", color);
    //     console.log("Dragging task:", { taskId, title, priority, color });
    //   } else {
    //     console.error("No taskId found");
    //   }
    // },

    // ==========================================================
    // DESTROY & REFRESH
    // ==========================================================
    destroy() {
      if (this.draggableInstance) {
        try {
          this.draggableInstance.destroy();
        } catch (e) {}
        this.draggableInstance = null;
      }
      if (this.calendar) {
        try {
          this.calendar.destroy();
        } catch (e) {}
        this.calendar = null;
      }
      this.isInitialized = false;
      console.log("CalendarModule đã được destroy");
    },

    refresh() {
      console.log("Refresh calendar...");
      this.init();
    },

    getCalendar() {
      return this.calendar;
    },
  };

  // Export
  window.CalendarModule = CalendarModule;
  console.log("CalendarModule v6.5 FIXED đã sẵn sàng!");
})();
