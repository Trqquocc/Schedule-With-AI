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

    async init() {
      if (this.isInitialized && this.calendar) this.destroy();

      console.log(" Khởi tạo CalendarModule với kéo thả...");

      try {
        await this._initInternal();
        this.isInitialized = true;

        setTimeout(() => {
          this.setupDropZone();
          this.setupTaskDragListeners();
        }, 1000);

        console.log(" CalendarModule khởi tạo thành công với kéo thả!");
      } catch (err) {
        console.error("Calendar initialization failed:", err);
        this.showError(err);
      }
    },

    setupTaskDragListeners() {
      console.log(
        "🔗 Setting up task drag listeners with FullCalendar.Draggable..."
      );

      this.initializeExternalDraggable();

      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1) {
                if (node.classList && node.classList.contains("task-item")) {
                  this.makeTaskDraggable(node);
                }
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
      const taskList = document.getElementById("task-list");
      if (taskList) {
        observer.observe(taskList, {
          childList: true,
          subtree: true,
        });
      }

      console.log(" Task drag listeners setup complete");
    },

    initializeExternalDraggable() {
      console.log(
        "🏄 Initializing FullCalendar.Draggable for sidebar tasks..."
      );

      const taskList = document.getElementById("task-list");
      if (!taskList) {
        console.warn(" task-list container not found");
        return;
      }

      const taskItems = taskList.querySelectorAll(".task-item");
      console.log(` Found ${taskItems.length} task items to make draggable`);

      taskItems.forEach((item) => {
        this.makeTaskDraggable(item);
      });
    },

    makeTaskDraggable(element) {
      if (element.hasAttribute("data-draggable-init")) return;
      const taskId = element.dataset.taskId;
      const title = element.dataset.taskTitle || element.textContent.trim();
      const priority = parseInt(element.dataset.taskPriority) || 2;
      const description = element.dataset.taskDescription || "";
      const color = this.getPriorityColor(priority);

      if (!taskId) {
        console.warn(" Task element missing taskId");
        return;
      }
      try {
        if (typeof FullCalendar !== "undefined" && FullCalendar.Draggable) {
          const draggable = new FullCalendar.Draggable(element, {
            eventData: {
              id: `drag-${taskId}`,
              title: title,
              backgroundColor: color,
              borderColor: color,

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
            ` Made draggable: ${title} (ID: ${taskId}, Priority: ${priority}, Color: ${color})`
          );
        } else {
          this.bindHTML5DragEvents(element);
        }
      } catch (err) {
        console.warn(
          " Error creating FullCalendar.Draggable, using HTML5 fallback:",
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
        const priority = parseInt(element.dataset.taskPriority) || 2;

        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", taskId);
        e.dataTransfer.setData("taskId", taskId);
        e.dataTransfer.setData(
          "application/json",
          JSON.stringify({ taskId, title, color, priority })
        );

        element.classList.add("dragging");
        console.log(
          `📤 HTML5 drag start: ${title} (ID: ${taskId}, Priority: ${priority}, Color: ${color})`
        );
      });

      element.addEventListener("dragend", () => {
        element.classList.remove("dragging");
        console.log(" HTML5 drag end");
      });
    },
    async _initInternal() {
      const calendarEl = await this.waitForElement("calendar", 8000);
      if (!calendarEl) throw new Error("Không tìm thấy phần tử #calendar");

      await Promise.all([this.waitForFullCalendar(), this.waitForUtils()]);
      calendarEl.style.minHeight = "700px";

      const events = await this.loadEvents();
      this.renderCalendar(events);

      setTimeout(() => {
        this.initializeNavbarEvents();
      }, 200);
    },
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

    async loadEvents() {
      if (!Utils?.makeRequest) {
        console.warn("Utils.makeRequest không tồn tại → trả về mảng rỗng");
        return [];
      }

      try {
        console.log(" Loading calendar events...");
        const res = await Utils.makeRequest("/api/calendar/events", "GET");
        if (!res.success || !Array.isArray(res.data)) {
          console.warn(" Invalid response from /api/calendar/events");
          return [];
        }

        console.log(` Received ${res.data.length} total events from server`);

        const aiEvents = res.data.filter(
          (ev) =>
            ev.AI_DeXuat === 1 || ev.AI_DeXuat === "1" || ev.AI_DeXuat === true
        );
        if (aiEvents.length > 0) {
          console.warn(
            ` FOUND ${aiEvents.length} AI EVENTS - WILL BE FILTERED OUT:`,
            aiEvents.map((e) => ({
              id: e.MaLichTrinh,
              title: e.TieuDe || e.title,
              AI_DeXuat: e.AI_DeXuat,
              start: e.GioBatDau,
            }))
          );
        }

        const normalEvents = res.data
          .filter((ev) => {
            const isAI =
              ev.AI_DeXuat === 1 ||
              ev.AI_DeXuat === "1" ||
              ev.AI_DeXuat === true;

            if (isAI) {
              console.log(
                `⏭️  SKIPPING AI EVENT: ${ev.TieuDe || ev.title} | AI_DeXuat=${
                  ev.AI_DeXuat
                } (type: ${typeof ev.AI_DeXuat})`
              );
            }
            return !isAI;
          })
          .map((ev) => {
            const color =
              ev.MauSac || this.getPriorityColor(ev.MucDoUuTien) || "#3788d8";

            const completed =
              ev.DaHoanThanh === true ||
              ev.DaHoanThanh === 1 ||
              ev.DaHoanThanh === "1" ||
              ev.extendedProps?.completed === true ||
              false;

            // Tính toán start và end time
            const startTime = new Date(
              ev.start || ev.GioBatDau || new Date().toISOString()
            );
            let endTime = null;

            if (ev.end || ev.GioKetThuc) {
              endTime = new Date(ev.end || ev.GioKetThuc);
            } else {
              // Nếu không có end time, mặc định là start + 1 giờ
              endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
            }

            return {
              id: ev.id || ev.MaLichTrinh || 0,
              title: ev.title || ev.TieuDe || "Không tiêu đề",
              start: startTime,
              end: endTime,
              backgroundColor: color,
              borderColor: color,
              allDay: ev.allDay || false,
              extendedProps: {
                note: ev.GhiChu || ev.extendedProps?.note || "",
                completed: completed,
                taskId: ev.MaCongViec || ev.extendedProps?.taskId || null,
                isFromDrag: ev.isFromDrag || false,
                isAIEvent: false,
                priority: ev.MucDoUuTien || 2,
                originalColor: color,
              },
            };
          });

        console.log(
          ` FINAL: ${res.data.length} total → ${aiEvents.length} AI filtered → ${normalEvents.length} normal events shown`
        );

        return normalEvents;
      } catch (err) {
        console.error("Load events error:", err);
        return [];
      }
    },

    getPriorityColor(priority) {
      const colors = {
        1: "#34D399",
        2: "#60A5FA",
        3: "#FBBF24",
        4: "#F87171",
      };
      return colors[priority] || "#3788d8";
    },

    renderCalendar(events) {
      const el = document.getElementById("calendar");
      if (!el) return;

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
        droppable: true,
        selectable: true,
        selectMirror: true,
        dayMaxEvents: true,
        headerToolbar: false,
        nowIndicator: true,
        events: events,

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

        select: (info) => {
          this._showQuickCreateModal(info.start, info.end, info.allDay);
          this.calendar.unselect();
        },

        eventClick: (info) => {
          info.jsEvent.preventDefault();
          this._showEventDetails(info.event);
        },

        datesSet: () => this.updateCalendarTitle(),

        eventDidMount: (info) => {
          const el = info.el;
          el.style.cursor = "pointer";

          el.setAttribute("data-event-id", info.event.id);
          el.setAttribute("data-eventid", info.event.id);

          const priority = info.event.extendedProps.priority || 2;
          if (priority === 1) {
            el.classList.add("event-priority-low");
          } else if (priority === 3) {
            el.classList.add("event-priority-medium");
          } else if (priority === 4) {
            el.classList.add("event-priority-high");
          }
          if (info.event.extendedProps.aiSuggested) {
            el.classList.add("event-ai-suggested");
          }

          // ✅ QUAN TRỌNG: Apply completed CSS ngay khi mount
          if (info.event.extendedProps.completed) {
            console.log(
              `🎨 Applying completed CSS to event ${info.event.id} on mount`
            );

            el.classList.add("event-completed");

            // Apply inline styles để đảm bảo hiển thị ngay
            el.style.opacity = "0.6";
            el.style.textDecoration = "line-through";
            el.style.filter = "grayscale(50%)";
            el.style.background = `repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      rgba(255, 255, 255, 0.15) 10px,
      rgba(255, 255, 255, 0.15) 20px
    )`;

            // Apply to title and time
            const titleEl = el.querySelector(".fc-event-title");
            if (titleEl) {
              titleEl.style.textDecoration = "line-through";
              titleEl.style.textDecorationThickness = "2px";
              titleEl.style.color = "rgba(0, 0, 0, 0.5)";
            }

            const timeEl = el.querySelector(".fc-event-time");
            if (timeEl) {
              timeEl.style.opacity = "0.6";
              timeEl.style.color = "rgba(0, 0, 0, 0.5)";
            }
          }

          // Tooltip
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
      this.initMiniCalendar();

      this.setupDropZone();

      console.log(" FullCalendar đã render với chức năng kéo thả");
    },

    hasTimeConflict(newEvent, excludeTempEvents = true) {
      const events = this.calendar.getEvents();
      const s1 = newEvent.start;
      const e1 = newEvent.end || new Date(s1.getTime() + 3600000);

      for (const ev of events) {
        if (ev.id === newEvent.id) continue;

        if (excludeTempEvents && ev.id?.startsWith("temp-")) continue;

        const s2 = ev.start;
        const e2 = ev.end || new Date(s2.getTime() + 3600000);

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

    async _handleEventReceive(info) {
      try {
        console.log("🎯 FullCalendar eventReceive triggered:", info);
        const draggedEl = info.draggedEl;
        let taskId, title, color, priority, duration;

        if (draggedEl) {
          taskId = draggedEl.dataset.taskId;
          title = draggedEl.dataset.taskTitle || "Công việc";
          color = draggedEl.dataset.taskColor || "#3B82F6";
          priority = parseInt(draggedEl.dataset.taskPriority) || 2;
          duration = parseInt(draggedEl.dataset.taskDuration) || 60;
          console.log(
            ` draggedEl found - taskId: ${taskId}, duration: ${duration}, attr: ${draggedEl.dataset.taskDuration}`
          );
        } else {
          console.log(
            " No draggedEl - trying to get data from jsEvent.dataTransfer"
          );
          taskId = info.jsEvent?.dataTransfer?.getData("text/plain");
          const jsonData =
            info.jsEvent?.dataTransfer?.getData("application/json");
          if (jsonData) {
            const data = JSON.parse(jsonData);
            title = data.title || "Công việc";
            color = data.color || "#3B82F6";
            priority = data.priority || 2;
            duration = data.duration || 60;
            console.log(` JSON data parsed - duration: ${duration}`);
          } else {
            console.warn(" No JSON data in dataTransfer");
            duration = 60;
          }
        }

        if (!color || color === "#3B82F6") {
          color = this.getPriorityColor(priority);
          console.log(` Priority ${priority} → Color: ${color}`);
        }

        if (!taskId) {
          console.error(" No taskId found");
          info.event.remove();
          Utils.showToast?.("Lỗi: Không tìm thấy ID công việc", "error");
          return;
        }

        console.log(" Task dropped from sidebar:", {
          taskId,
          title,
          color,
          duration,
        });

        const start = info.event.start;
        const end = new Date(start.getTime() + duration * 60 * 1000);

        // ✅ CẬP NHẬT END TIME NGAY LẬP TỨC
        info.event.setEnd(end);

        console.log(` Updated event times:`, {
          start: start.toLocaleString("vi-VN"),
          end: end.toLocaleString("vi-VN"),
          durationMinutes: (end - start) / 60000,
        });

        const existingEvents = this.calendar.getEvents();
        const hasConflict = existingEvents.some((existingEvent) => {
          if (existingEvent.id === info.event.id) return false;
          if (existingEvent.id?.startsWith("temp-")) return false;

          const s1 = start;
          const e1 = end;
          const s2 = existingEvent.start;
          const e2 =
            existingEvent.end || new Date(s2.getTime() + duration * 60 * 1000);

          return s1 < e2 && e1 > s2;
        });

        if (hasConflict) {
          Utils.showToast?.("Thời gian này đã có sự kiện khác!", "error");
          info.event.remove();
          return;
        }

        await this.saveDroppedEvent(
          taskId,
          title,
          color,
          start,
          end,
          priority,
          duration
        );
      } catch (err) {
        console.error(" Event receive error:", err);
        info.event.remove();
        Utils.showToast?.("Lỗi kéo thả công việc", "error");
      }
    },

    async _handleEventUpdate(info) {
      try {
        console.log(" Event updated:", info.event);

        const eventId = info.event.id;
        if (!eventId) {
          throw new Error("Event không có ID");
        }

        // Chặn kéo thả công việc đã hoàn thành đến thời gian tương lai
        if (info.event.extendedProps.completed) {
          const newStart = info.event.start;
          const now = new Date();
          if (newStart > now) {
            Utils.showToast?.("Không thể kéo công việc đã hoàn thành đến thời gian chưa xảy ra!", "warning");
            info.revert();
            return;
          }
        }

        if (
          eventId.toString().startsWith("temp-") ||
          eventId.toString().startsWith("drag-")
        ) {
          console.log(
            ` Event ${eventId} chưa lưu server, cập nhật local. POST sẽ gửi lên sau...`
          );

          return;
        }

        const eventIdNum = parseInt(eventId, 10);
        if (isNaN(eventIdNum)) {
          console.warn(` Event ID ${eventId} không hợp lệ, chỉ cập nhật local`);
          return;
        }

        const newStart = info.event.start;
        const newEnd =
          info.event.end || new Date(newStart.getTime() + 60 * 60 * 1000);
        if (this.hasTimeConflict(info.event)) {
          Utils.showToast?.("Thời gian này đã có sự kiện khác!", "error");
          info.revert();
          return;
        }
        Utils.showToast?.("Đang cập nhật thời gian...", "info");

        const updateData = {
          start: newStart.toISOString(),
          end: newEnd.toISOString(),
        };

        console.log(` Updating event ${eventIdNum}:`, updateData);

        const result = await Utils.makeRequest(
          `/api/calendar/events/${eventIdNum}`,
          "PUT",
          updateData
        );

        if (!result.success) {
          throw new Error(result.message || "Cập nhật thất bại");
        }

        Utils.showToast?.("Đã cập nhật thời gian sự kiện", "success");

        const eventElement = document.querySelector(
          `[data-event-id="${eventId}"]`
        );
        if (eventElement) {
          eventElement.classList.add("bg-green-50", "border-green-200");
          setTimeout(() => {
            eventElement.classList.remove("bg-green-50", "border-green-200");
          }, 1500);
        }

        console.log(" Event updated successfully");
      } catch (error) {
        console.error(" Error in eventUpdate:", error);

        let errorMessage = "Lỗi khi cập nhật thời gian";
        if (
          error.message.includes("conflict") ||
          error.message.includes("trùng")
        ) {
          errorMessage = "Không thể di chuyển: Thời gian đã có sự kiện khác!";
        } else if (error.message.includes("validation")) {
          errorMessage = " Thời gian không hợp lệ!";
        } else {
          errorMessage = error.message || "Lỗi khi cập nhật thời gian";
        }

        Utils.showToast?.(errorMessage, "error");
        info.revert();
      }
    },

    setupDropZone() {
      console.log(" Setting up calendar drop zone...");

      const calendarEl = document.getElementById("calendar");
      if (!calendarEl) {
        console.error(" Calendar element not found");
        return;
      }

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
      } catch (e) {}

      this._boundCalendarDragOver = this.handleDragOver.bind(this);
      this._boundCalendarDragLeave = this.handleDragLeave.bind(this);
      this._boundCalendarDrop = this.handleDrop.bind(this);

      calendarEl.addEventListener("dragover", this._boundCalendarDragOver);
      calendarEl.addEventListener("dragleave", this._boundCalendarDragLeave);
      calendarEl.addEventListener("drop", this._boundCalendarDrop);

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
            console.log(" Document-level drop handler activated");
            e.preventDefault();
            this.handleDrop(e);
          }
        };

        document.addEventListener("drop", this._docDropListener);
      } catch (e) {
        console.warn("Could not attach document-level drop listener:", e);
      }

      console.log(" Drop zone setup complete");
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
        const durationMinutes = taskData.duration || 60;
        const priority = taskData.priority || 2;

        console.log(
          `🎯 Dropping task ${taskId}: ${title} (Duration: ${durationMinutes}min, Priority: ${priority})`
        );

        const calendar = this.calendar;

        const point = {
          clientX: e.clientX,
          clientY: e.clientY,
        };

        let dropDate = new Date();

        try {
          const calendarApi = calendar;
          const calendarElRect = calendar.el.getBoundingClientRect();

          const relativeX = point.clientX - calendarElRect.left;
          const relativeY = point.clientY - calendarElRect.top;

          const dateStr = calendarApi.currentData.viewApi.dateEnv
            .toDate(new Date())
            .toISOString();

          dropDate = new Date();
          dropDate.setMinutes(0);
          dropDate.setSeconds(0);
          dropDate.setMilliseconds(0);
        } catch (err) {
          console.warn(
            "Could not calculate drop position, using current time:",
            err
          );
        }

        // ✅ TẠO endDate NGAY TỪ ĐẦU
        const startDate = dropDate;
        const endDate = new Date(
          startDate.getTime() + durationMinutes * 60 * 1000
        );

        const newEvent = {
          id: `temp-${Date.now()}`,
          title: title,
          start: startDate,
          end: endDate, // ✅ SỬ DỤNG endDate ĐÃ TÍNH
          backgroundColor: color,
          borderColor: color,
          editable: true,
          durationEditable: true,
          startEditable: true,
          extendedProps: {
            taskId: taskId,
            isFromDrag: true,
            color: color,
            priority: priority,
          },
        };

        console.log(`⏰ New event times:`, {
          start: startDate.toLocaleString("vi-VN"),
          end: endDate.toLocaleString("vi-VN"),
          durationMinutes: (endDate - startDate) / 60000,
        });

        const existingEvents = calendar.getEvents();
        const hasConflict = existingEvents.some((existingEvent) => {
          if (existingEvent.id?.startsWith("temp-")) return false;

          const s1 = newEvent.start;
          const e1 = newEvent.end;
          const s2 = existingEvent.start;
          const e2 =
            existingEvent.end || new Date(s2.getTime() + 60 * 60 * 1000);

          return s1 < e2 && e1 > s2;
        });

        if (hasConflict) {
          Utils.showToast?.("Thời gian này đã có sự kiện khác!", "error");
          return;
        }

        calendar.addEvent(newEvent);

        // ✅ TRUYỀN ĐẦY ĐỦ THAM SỐ
        await this.saveDroppedEvent(
          taskId,
          title,
          color,
          startDate,
          endDate,
          priority,
          durationMinutes
        );
      } catch (error) {
        console.error("❌ Drop error:", error);
        Utils.showToast?.("Lỗi khi kéo thả công việc", "error");
      } finally {
        this._handlingDrop = false;
      }
    },

    async saveDroppedEvent(
      taskId,
      title,
      color,
      start,
      end,
      priority = 2,
      duration = 60
    ) {
      try {
        console.log("💾 Saving dropped event to server...");
        console.log(`   Start: ${start.toLocaleString("vi-VN")}`);
        console.log(`   End: ${end.toLocaleString("vi-VN")}`);
        console.log(
          `   Duration: ${duration} minutes (${
            (end.getTime() - start.getTime()) / 60000
          } actual)`
        );

        const eventData = {
          MaCongViec: parseInt(taskId),
          TieuDe: title,
          GioBatDau: start.toISOString(),
          GioKetThuc: end.toISOString(),
          MauSac: color,
          MucDoUuTien: priority,
          AI_DeXuat: 0,
        };

        console.log("📤 Sending to API:", eventData);

        const res = await Utils.makeRequest(
          "/api/calendar/events",
          "POST",
          eventData
        );

        if (res.success) {
          const newEventId =
            res.eventId || res.data?.MaLichTrinh || res.data?.id;

          console.log(`📌 New event created with ID: ${newEventId}`);

          const events = this.calendar.getEvents();
          let tempEvent = events.find((e) => e.id === `drag-${taskId}`);

          if (!tempEvent) {
            tempEvent = events.find(
              (e) => e.id?.startsWith(`temp-`) || e.id?.startsWith(`drag-`)
            );
          }

          if (tempEvent) {
            console.log(
              `🔄 Updating event ${tempEvent.id} with real ID ${newEventId}...`
            );

            // ✅ SỬ DỤNG setStart/setEnd THAY VÌ setProp
            tempEvent.setProp("id", newEventId);
            tempEvent.setStart(start);
            tempEvent.setEnd(end);
            tempEvent.setProp("backgroundColor", color);
            tempEvent.setProp("borderColor", color);
            tempEvent.setExtendedProp("taskId", taskId);
            tempEvent.setExtendedProp("isFromDrag", true);
            tempEvent.setExtendedProp("priority", priority);
            tempEvent.setExtendedProp("completed", false);

            tempEvent.setProp("editable", true);
            tempEvent.setProp("durationEditable", true);
            tempEvent.setProp("startEditable", true);

            const actualDuration = (tempEvent.end - tempEvent.start) / 60000;
            console.log(`✅ Event ${newEventId} updated successfully:`, {
              start: tempEvent.start.toLocaleString("vi-VN"),
              end: tempEvent.end.toLocaleString("vi-VN"),
              durationMinutes: actualDuration,
            });
          } else {
            console.warn(
              `⚠️ Could not find event with ID drag-${taskId}. Available events:`,
              events.map((e) => e.id)
            );
          }

          await Utils.makeRequest(`/api/tasks/${taskId}`, "PUT", {
            TrangThaiThucHien: 1,
          });

          Utils.showToast?.("Đã lên lịch thành công!", "success");

          if (window.loadUserTasks) {
            window.loadUserTasks(true);
          }

          this.triggerSidebarRefresh();
        } else {
          throw new Error(res.message || "Lỗi thêm vào lịch");
        }
      } catch (error) {
        console.error("❌ Error saving dropped event:", error);

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

      document.dispatchEvent(
        new CustomEvent("task-scheduled", {
          detail: { action: "refresh" },
        })
      );

      if (window.loadUserTasks && typeof window.loadUserTasks === "function") {
        setTimeout(() => {
          window.loadUserTasks(true);
        }, 500);
      }

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

      const workTasks = document.querySelectorAll(
        "#work-items-container .work-item"
      );

      workTasks.forEach((task) => {
        const taskId = task.dataset.taskId;
        if (taskId) {
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

    _showEventDetails(event) {
      const p = event.extendedProps;
      const startStr = event.start
        ? event.start.toLocaleString("vi-VN")
        : "N/A";
      const endStr = event.end ? event.end.toLocaleString("vi-VN") : "N/A";

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

      document.getElementById("eventDetailModal")?.remove();
      document.body.insertAdjacentHTML("beforeend", modalHtml);

      document.getElementById("closeEventDetail").onclick = () =>
        document.getElementById("eventDetailModal").remove();

      document.getElementById("saveEventStatus").onclick = () =>
        this._updateEventStatus(event);

      const completionCheckbox = document.getElementById(
        "eventCompletedCheckbox"
      );
      completionCheckbox.addEventListener("change", async () => {
        this._updateEventStatus(event);
      });

      const handleSaveShortcut = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
          e.preventDefault();
          document.getElementById("saveEventStatus").click();
          document.removeEventListener("keydown", handleSaveShortcut);
        }
      };
      document.addEventListener("keydown", handleSaveShortcut);

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

      confirmDeleteBtn.addEventListener("click", () => {
        if (deleteConfirmInput.value.trim() === event.title.substring(0, 20)) {
          this._deleteEvent(event);
        }
      });

      deleteConfirmInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !confirmDeleteBtn.disabled) {
          confirmDeleteBtn.click();
        }
      });
    },

    async _deleteEvent(event) {
      const eventId = event.id;

      if (!eventId || eventId.toString().startsWith("temp-")) {
        Utils.showToast?.("Sự kiện chưa được lưu vào database", "warning");
        document.getElementById("eventDetailModal")?.remove();
        event.remove();
        return;
      }

      try {
        const confirmBtn = document.getElementById("confirmDeleteBtn");
        const originalText = confirmBtn.innerHTML;
        confirmBtn.innerHTML =
          '<i class="fas fa-spinner fa-spin mr-2"></i> Đang xóa...';
        confirmBtn.disabled = true;

        const result = await Utils.makeRequest(
          `/api/calendar/events/${eventId}`,
          "DELETE"
        );

        if (!result.success) {
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

        const modal = document.getElementById("eventDetailModal");
        if (modal) {
          modal.style.animation = "fadeOut 0.3s ease forwards";
          setTimeout(() => modal.remove(), 300);
        }

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
            ` Event element with ID ${eventId} not found in DOM, removing from calendar`
          );
          event.remove();
        }

        Utils.showToast?.("Đã xóa sự kiện thành công!", "success");

        console.log(` Event ${eventId} deleted successfully`);

        document.dispatchEvent(
          new CustomEvent("eventDeleted", {
            detail: { eventId, eventTitle: event.title },
          })
        );
      } catch (error) {
        console.error(" Error deleting event:", error);

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
          errorMessage = " " + error.message;
        } else {
          errorMessage = error.message || "Lỗi khi xóa sự kiện";
        }

        Utils.showToast?.(errorMessage, "error");
      }
    },

    // ==========================================================
    // QUICK CREATE MODAL - Kéo thả trên lịch để tạo công việc
    // ==========================================================
    _showQuickCreateModal(start, end, allDay) {
      const startISO = start instanceof Date ? start.toISOString() : start;
      const endISO = end instanceof Date ? end.toISOString() : end;
      const startLabel = start instanceof Date
        ? start.toLocaleString("vi-VN", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" })
        : startISO;

      document.getElementById("quickCreateModal")?.remove();

      const html = `
      <div id="quickCreateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
          <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center">
            <h3 class="text-white font-bold text-lg flex items-center gap-2">
              <i class="fas fa-plus-circle"></i> Tạo công việc mới
            </h3>
            <button id="closeQuickCreate" class="text-white/70 hover:text-white text-xl">&times;</button>
          </div>
          <div class="px-6 py-5 space-y-4">
            <div class="bg-blue-50 rounded-lg px-4 py-2 text-sm text-blue-700 flex items-center gap-2">
              <i class="fas fa-clock"></i> ${startLabel}
            </div>

            <div>
              <input type="text" id="qc-title" placeholder="Tên công việc *"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-gray-800 font-medium" />
            </div>

            <div>
              <textarea id="qc-note" placeholder="Ghi chú (không bắt buộc)" rows="2"
                class="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-gray-700 resize-none"></textarea>
            </div>

            <div>
              <p class="text-sm font-semibold text-gray-600 mb-2">Độ ưu tiên</p>
              <div class="grid grid-cols-4 gap-2" id="qc-priority-group">
                <label class="cursor-pointer">
                  <input type="radio" name="qc-priority" value="1" class="hidden" />
                  <div class="priority-opt rounded-xl py-2 text-center text-xs font-semibold border-2 border-transparent transition-all" style="background:#d1fae5;color:#065f46;">Thấp</div>
                </label>
                <label class="cursor-pointer">
                  <input type="radio" name="qc-priority" value="2" class="hidden" checked />
                  <div class="priority-opt rounded-xl py-2 text-center text-xs font-semibold border-2 border-blue-500 transition-all" style="background:#dbeafe;color:#1e40af;">Trung bình</div>
                </label>
                <label class="cursor-pointer">
                  <input type="radio" name="qc-priority" value="3" class="hidden" />
                  <div class="priority-opt rounded-xl py-2 text-center text-xs font-semibold border-2 border-transparent transition-all" style="background:#fef3c7;color:#92400e;">Cao</div>
                </label>
                <label class="cursor-pointer">
                  <input type="radio" name="qc-priority" value="4" class="hidden" />
                  <div class="priority-opt rounded-xl py-2 text-center text-xs font-semibold border-2 border-transparent transition-all" style="background:#fee2e2;color:#991b1b;">Rất cao</div>
                </label>
              </div>
            </div>

            <div>
              <label class="text-sm font-semibold text-gray-600 mb-2 block flex items-center gap-1">
                <i class="fas fa-tag text-purple-400 text-xs"></i> Loại công việc
              </label>
              <div id="qc-category-chips" class="flex flex-wrap gap-2 min-h-[36px]">
                <span class="text-xs text-gray-400 italic">Đang tải...</span>
              </div>
              <input type="hidden" id="qc-category" value="" />
            </div>

            <div>
              <label class="text-sm font-semibold text-gray-600 mb-1 block flex items-center gap-1">
                <i class="fas fa-clock text-blue-400 text-xs"></i> Thời gian ước tính
              </label>
              <div class="flex items-center gap-2">
                <input type="range" id="qc-duration" value="60" min="15" max="480" step="15"
                  class="flex-1 accent-blue-500" />
                <span id="qc-duration-label" class="text-sm font-bold text-blue-600 w-16 text-right">60 phút</span>
              </div>
            </div>
          </div>
          <div class="px-6 pb-5 flex gap-3">
            <button id="closeQuickCreate2" class="flex-1 py-3 border-2 border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition">Hủy</button>
            <button id="saveQuickCreate" class="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2">
              <i class="fas fa-plus"></i> Tạo công việc
            </button>
          </div>
        </div>
      </div>`;

      document.body.insertAdjacentHTML("beforeend", html);

      // Priority selector
      document.querySelectorAll("#qc-priority-group input[type=radio]").forEach(radio => {
        radio.addEventListener("change", () => {
          document.querySelectorAll("#qc-priority-group .priority-opt").forEach(opt => {
            opt.style.borderColor = "transparent";
          });
          const colors = { "1":"#059669","2":"#3b82f6","3":"#d97706","4":"#dc2626" };
          radio.closest("label").querySelector(".priority-opt").style.borderColor = colors[radio.value] || "#3b82f6";
        });
      });

      // Load categories as chips
      Utils.makeRequest("/api/categories", "GET").then(res => {
        const chips = document.getElementById("qc-category-chips");
        const hidden = document.getElementById("qc-category");
        if (!chips || !res.success || !res.data?.length) {
          if (chips) chips.innerHTML = '<span class="text-xs text-gray-400 italic">Không có danh mục</span>';
          return;
        }
        chips.innerHTML = "";
        res.data.forEach((c, i) => {
          const id = c.MaLoai || c.id;
          const name = c.TenLoai || c.name || "Không tên";
          const colors = ["bg-purple-100 text-purple-700 border-purple-200","bg-blue-100 text-blue-700 border-blue-200","bg-green-100 text-green-700 border-green-200","bg-amber-100 text-amber-700 border-amber-200","bg-pink-100 text-pink-700 border-pink-200","bg-cyan-100 text-cyan-700 border-cyan-200"];
          const chip = document.createElement("button");
          chip.type = "button";
          chip.dataset.catId = id;
          chip.className = `px-3 py-1 rounded-full text-xs font-semibold border-2 transition-all ${colors[i % colors.length]} border-transparent`;
          chip.textContent = name;
          chip.onclick = () => {
            chips.querySelectorAll("button").forEach(b => b.classList.remove("ring-2","ring-offset-1","ring-blue-500","scale-105"));
            if (hidden.value === String(id)) {
              hidden.value = "";
            } else {
              hidden.value = id;
              chip.classList.add("ring-2","ring-offset-1","ring-blue-500","scale-105");
            }
          };
          chips.appendChild(chip);
        });
      }).catch(() => {
        const chips = document.getElementById("qc-category-chips");
        if (chips) chips.innerHTML = '<span class="text-xs text-gray-400 italic">Không tải được danh mục</span>';
      });

      // Duration slider
      const durSlider = document.getElementById("qc-duration");
      const durLabel = document.getElementById("qc-duration-label");
      if (durSlider && durLabel) {
        durSlider.addEventListener("input", () => { durLabel.textContent = durSlider.value + " phút"; });
      }

      const close = () => document.getElementById("quickCreateModal")?.remove();
      document.getElementById("closeQuickCreate").onclick = close;
      document.getElementById("closeQuickCreate2").onclick = close;
      document.getElementById("quickCreateModal").addEventListener("click", e => { if (e.target.id === "quickCreateModal") close(); });

      document.getElementById("qc-title").focus();

      document.getElementById("saveQuickCreate").onclick = async () => {
        const title = document.getElementById("qc-title").value.trim();
        if (!title) {
          document.getElementById("qc-title").classList.add("border-red-500");
          document.getElementById("qc-title").placeholder = "Vui lòng nhập tên công việc!";
          return;
        }
        const priority = parseInt(document.querySelector("#qc-priority-group input[type=radio]:checked")?.value || "2");
        const note = document.getElementById("qc-note").value.trim();
        const duration = parseInt(document.getElementById("qc-duration")?.value || "60");
        const categoryId = document.getElementById("qc-category")?.value || undefined;
        const color = this.getPriorityColor(priority);

        const btn = document.getElementById("saveQuickCreate");
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tạo...';

        try {
          // 1. Tạo công việc mới
          const taskRes = await Utils.makeRequest("/api/tasks", "POST", {
            TieuDe: title,
            MoTa: note,
            MucDoUuTien: priority,
            ThoiGianUocTinh: duration,
            ...(categoryId ? { MaLoai: categoryId } : {}),
            TrangThaiThucHien: 1,
          });
          if (!taskRes.success) throw new Error(taskRes.message || "Lỗi tạo công việc");

          const taskId = taskRes.data?.MaCongViec || taskRes.data?.id || taskRes.taskId;

          // 2. Tạo lịch trình
          const startDate = new Date(startISO);
          const endDate = new Date(endISO);
          const eventRes = await Utils.makeRequest("/api/calendar/events", "POST", {
            MaCongViec: taskId,
            TieuDe: title,
            GioBatDau: startDate.toISOString(),
            GioKetThuc: endDate.toISOString(),
            MauSac: color,
            MucDoUuTien: priority,
            GhiChu: note,
            AI_DeXuat: 0,
          });

          if (!eventRes.success) throw new Error(eventRes.message || "Lỗi tạo lịch trình");

          // 3. Thêm event lên calendar
          const newEventId = eventRes.eventId || eventRes.data?.MaLichTrinh || eventRes.data?.id;
          this.calendar.addEvent({
            id: newEventId,
            title,
            start: startDate,
            end: endDate,
            backgroundColor: color,
            borderColor: color,
            extendedProps: { note, completed: false, taskId, priority },
          });

          close();
          Utils.showToast?.("Đã tạo công việc thành công!", "success");
          this.triggerSidebarRefresh();
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-plus"></i> Tạo công việc';
          Utils.showToast?.(err.message || "Lỗi tạo công việc", "error");
        }
      };
    },

    // ==========================================================
    // SHOW EVENT DETAILS MODAL
    // ==========================================================
    _showEventDetails(event) {
      const p = event.extendedProps;
      const now = new Date();
      const eventStart = event.start || now;
      const isFuture = eventStart > now;

      const startStr = event.start ? event.start.toLocaleString("vi-VN") : "N/A";
      const endStr = event.end ? event.end.toLocaleString("vi-VN") : "N/A";
      const dateStr = event.start ? event.start.toLocaleDateString("vi-VN") : "";
      const timeStr = event.start
        ? event.start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
        : "";

      const priorityColors = { 1:"#34d399", 2:"#60a5fa", 3:"#fbbf24", 4:"#f87171" };
      const priorityTexts = { 1:"Thấp", 2:"Trung bình", 3:"Cao", 4:"Rất cao" };
      const pri = p.priority || 2;
      const dotColor = priorityColors[pri] || "#60a5fa";

      const canComplete = !isFuture || p.completed;
      const completeDisabledAttr = canComplete ? "" : "disabled";
      const completeTitle = isFuture ? "Chưa đến thời gian làm việc" : "";

      const modalHtml = `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9998]" id="eventDetailModal">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4 rounded-t-2xl flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <span class="w-3 h-3 rounded-full flex-shrink-0" style="background:${dotColor}"></span>
            <h3 class="text-white font-bold text-lg leading-tight truncate">${event.title}</h3>
          </div>
          <button id="closeEventDetail" class="text-white/60 hover:text-white text-2xl leading-none flex-shrink-0">&times;</button>
        </div>

        <div class="p-6 space-y-4">
          <!-- Thông tin thời gian -->
          <div class="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div class="flex items-center gap-2 text-gray-700">
              <i class="fas fa-calendar-alt text-blue-500 w-4"></i>
              <span class="font-medium">${dateStr}</span>
              <span class="text-gray-400">|</span>
              <span>${timeStr} — ${event.end ? event.end.toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"}) : ""}</span>
            </div>
            ${p.note ? `<div class="flex items-start gap-2 text-gray-600"><i class="fas fa-sticky-note text-amber-400 w-4 mt-0.5"></i><span>${p.note}</span></div>` : ""}
            <div class="flex items-center gap-2">
              <i class="fas fa-flag w-4" style="color:${dotColor}"></i>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full" style="background:${dotColor}22;color:${dotColor}">${priorityTexts[pri]}</span>
            </div>
          </div>

          <!-- Đánh dấu hoàn thành -->
          <div class="rounded-xl border-2 p-4 ${p.completed ? "border-green-200 bg-green-50" : isFuture ? "border-gray-200 bg-gray-50 opacity-60" : "border-blue-100 bg-blue-50"}">
            <label class="flex items-center gap-3 ${canComplete ? "cursor-pointer" : "cursor-not-allowed"}">
              <input type="checkbox" id="eventCompletedCheckbox"
                     class="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                     ${p.completed ? "checked" : ""} ${completeDisabledAttr}
                     title="${completeTitle}" />
              <div>
                <p class="font-semibold text-gray-800">${p.completed ? "Đã hoàn thành" : "Đánh dấu hoàn thành"}</p>
                ${isFuture && !p.completed ? '<p class="text-xs text-gray-500 mt-0.5">Chưa đến thời gian làm việc</p>' : ""}
              </div>
            </label>
          </div>

          <!-- Buttons -->
          <div class="flex gap-3 pt-2">
            <button id="saveEventStatus"
                    class="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2">
              <i class="fas fa-save"></i> Lưu
            </button>
            <button id="deleteEventBtn"
                    class="py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-semibold border border-red-200 transition flex items-center gap-2">
              <i class="fas fa-trash"></i> Xóa
            </button>
          </div>
        </div>
      </div>
    </div>`;

      document.getElementById("eventDetailModal")?.remove();
      document.body.insertAdjacentHTML("beforeend", modalHtml);

      document.getElementById("closeEventDetail").onclick = () =>
        document.getElementById("eventDetailModal")?.remove();

      document.getElementById("eventDetailModal").addEventListener("click", (e) => {
        if (e.target.id === "eventDetailModal")
          document.getElementById("eventDetailModal")?.remove();
      });

      document.getElementById("saveEventStatus").onclick = () =>
        this._updateEventStatus(event);

      const completionCheckbox = document.getElementById("eventCompletedCheckbox");
      if (completionCheckbox && !completionCheckbox.disabled) {
        completionCheckbox.addEventListener("change", () => this._updateEventStatus(event));
      }

      document.getElementById("deleteEventBtn").onclick = async () => {
        const confirmed = confirm(`Xóa sự kiện "${event.title}"?\nThao tác này không thể hoàn tác.`);
        if (confirmed) this._deleteEvent(event);
      };
    },

    async _deleteEvent(event) {
      const eventId = event.id;

      if (!eventId || eventId.toString().startsWith("temp-")) {
        Utils.showToast?.("Sự kiện chưa được lưu vào database", "warning");
        document.getElementById("eventDetailModal")?.remove();
        event.remove();
        return;
      }

      try {
        const confirmBtn = document.getElementById("confirmDeleteBtn");
        const originalText = confirmBtn.innerHTML;
        confirmBtn.innerHTML =
          '<i class="fas fa-spinner fa-spin mr-2"></i> Đang xóa...';
        confirmBtn.disabled = true;

        const result = await Utils.makeRequest(
          `/api/calendar/events/${eventId}`,
          "DELETE"
        );

        if (!result.success) {
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

        const modal = document.getElementById("eventDetailModal");
        if (modal) {
          modal.style.animation = "fadeOut 0.3s ease forwards";
          setTimeout(() => modal.remove(), 300);
        }

        const eventEl =
          document.querySelector(`[data-event-id="${eventId}"]`) ||
          document.querySelector(
            `.fc-event[title*="${event.title.substring(0, 20)}"]`
          );

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

        Utils.showToast?.("Đã xóa sự kiện thành công!", "success");

        console.log(`✅ Event ${eventId} deleted successfully`);

        document.dispatchEvent(
          new CustomEvent("eventDeleted", {
            detail: { eventId, eventTitle: event.title },
          })
        );
      } catch (error) {
        console.error("❌ Error deleting event:", error);

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

        const wasCompleted = event.extendedProps.completed;

        const saveBtn = document.getElementById("saveEventStatus");
        const originalBtnText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML =
          '<i class="fas fa-spinner fa-spin mr-2"></i> Đang cập nhật...';
        const eventEls = document.querySelectorAll(
          `[data-event-id="${
            event.id
          }"], .fc-event[title*="${event.title.substring(0, 20)}"]`
        );
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
          event.setExtendedProp("completed", completed);

          // Re-render the event to apply CSS changes
          const calendar = this.getCalendar();
          if (calendar) {
            event.remove();
            calendar.addEvent(event.toPlainObject());
          }

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
          Utils.showToast?.(
            completed
              ? "Đã hoàn thành công việc!"
              : "Bỏ đánh dấu hoàn thành",
            "success"
          );

          saveBtn.disabled = false;
          saveBtn.innerHTML = originalBtnText;
          setTimeout(() => {
            document.getElementById("eventDetailModal")?.remove();
          }, 600);
        } else {
          eventEls.forEach((el) => {
            if (wasCompleted) {
              el.classList.add("event-completed");
              el.style.textDecoration = "line-through";
              el.style.opacity = "0.6";
            } else {
              el.classList.remove("event-completed");
              el.style.textDecoration = "none";
              el.style.opacity = "1";
            }
          });

          saveBtn.disabled = false;
          saveBtn.innerHTML = originalBtnText;
          checkbox.checked = wasCompleted;

          throw new Error(res.message || "Cập nhật trạng thái thất bại");
        }
      } catch (err) {
        console.error("❌ Cập nhật trạng thái lỗi:", err);

        Utils.showToast?.(
          "" + (err.message || "Lỗi cập nhật trạng thái"),
          "error"
        );

        const saveBtn = document.getElementById("saveEventStatus");
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = '<i class="fas fa-save mr-2"></i> Lưu thay đổi';
        }

        // Restore checkbox
        const checkbox = document.getElementById("eventCompletedCheckbox");
        if (checkbox) {
          checkbox.checked = event.extendedProps.completed;
        }
      }
    },

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

    initMiniCalendar() {
      // Prefer the dedicated mini-cal container so the task list below is preserved
      const sidebar = document.getElementById("mini-cal-container") || document.getElementById("calendar-sidebar");
      if (!sidebar) return;

      const today = new Date();
      this._miniDate = new Date(today.getFullYear(), today.getMonth(), 1);

      const render = () => {
        const d = this._miniDate;
        const year = d.getFullYear();
        const month = d.getMonth();
        const monthNames = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];
        const days = ["CN","T2","T3","T4","T5","T6","T7"];
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const todayNum = today.getDate();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

        let cells = "";
        for (let i = 0; i < firstDay; i++) cells += `<div></div>`;
        for (let i = 1; i <= daysInMonth; i++) {
          const isToday = isCurrentMonth && i === todayNum;
          cells += `<button class="mini-cal-day${isToday ? " today-day" : ""}"
            data-date="${year}-${String(month+1).padStart(2,"0")}-${String(i).padStart(2,"0")}">${i}</button>`;
        }

        sidebar.innerHTML = `
          <div class="p-4 select-none">
            <div class="flex items-center justify-between mb-3">
              <button id="mini-prev" class="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition">
                <i class="fas fa-chevron-left text-xs"></i>
              </button>
              <span class="text-sm font-bold text-gray-800">${monthNames[month]} ${year}</span>
              <button id="mini-next" class="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition">
                <i class="fas fa-chevron-right text-xs"></i>
              </button>
            </div>
            <div class="grid grid-cols-7 gap-0.5 mb-1">
              ${days.map(d => `<div class="text-center text-xs font-semibold text-gray-400 py-1">${d}</div>`).join("")}
            </div>
            <div class="grid grid-cols-7 gap-0.5">${cells}</div>
            <button id="mini-today" class="mt-3 w-full text-xs text-blue-600 font-semibold hover:bg-blue-50 py-1.5 rounded-lg transition">
              Hôm nay
            </button>
          </div>`;

        document.getElementById("mini-prev").onclick = () => {
          this._miniDate = new Date(year, month - 1, 1);
          render();
        };
        document.getElementById("mini-next").onclick = () => {
          this._miniDate = new Date(year, month + 1, 1);
          render();
        };
        document.getElementById("mini-today").onclick = () => {
          this._miniDate = new Date(today.getFullYear(), today.getMonth(), 1);
          render();
          this.calendar?.today();
        };
        sidebar.querySelectorAll(".mini-cal-day").forEach(btn => {
          btn.addEventListener("click", () => {
            const dateStr = btn.dataset.date;
            if (this.calendar) {
              this.calendar.gotoDate(dateStr);
              if (this.currentView === "dayGridMonth") {
                this.calendar.changeView("timeGridDay", dateStr);
                this.currentView = "timeGridDay";
                this.setActiveView("timeGridDay");
              }
            }
          });
        });
      };

      render();
    },

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

  window.CalendarModule = CalendarModule;
  console.log("CalendarModule v6.5 FIXED đã sẵn sàng!");
})();
