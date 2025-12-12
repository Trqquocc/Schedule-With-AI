/**
 * AI Module v2.1 - INTEGRATED WITH AI HANDLER
 * Xử lý lịch trình đề xuất bởi AI và hiển thị lên calendar
 */

(function () {
  "use strict";

  // SINGLETON PATTERN - Chỉ một instance duy nhất
  if (window.AIModule && window.AIModule._singleton) {
    console.log("🤖 AIModule singleton already exists, reusing...");
    return window.AIModule;
  }

  const AIModule = {
    _singleton: true,
    calendar: null,
    isInitialized: false,
    initPromise: null,
    currentView: "timeGridWeek",
    suggestedEvents: [],

    // IDs động (có thể config từ bên ngoài để tránh xung đột)
    calendarElementId: "ai-calendar",
    titleElementId: "ai-calendar-title",
    prevBtnId: "ai-cal-prev-btn",
    nextBtnId: "ai-cal-next-btn",
    todayBtnId: "ai-cal-today-btn",
    dayBtnId: "ai-cal-day-view",
    weekBtnId: "ai-cal-week-view",
    monthBtnId: "ai-cal-month-view",

    // ==========================================================
    // PUBLIC: init()
    // ==========================================================
    async init() {
      // Nếu đã init và calendar còn sống -> chỉ refresh
      if (this.isInitialized && this.calendar) {
        console.log("🤖 AIModule already initialized, refreshing UI...");
        this.refreshUI();
        return;
      }

      if (this.initPromise) {
        console.log("🤖 Waiting for existing init promise...");
        return this.initPromise;
      }

      console.log("🤖 Khởi tạo AIModule v2.1...");
      this.initPromise = this._initInternal();

      try {
        await this.initPromise;
        this.isInitialized = true;
        console.log("✅ AIModule khởi tạo thành công!");
      } catch (err) {
        console.error("❌ AI Module initialization failed:", err);
        this.showError(err);
        this.isInitialized = false;
      } finally {
        this.initPromise = null;
      }
    },

    // ==========================================================
    // PRIVATE: _initInternal()
    // ==========================================================
    async _initInternal() {
      const calendarEl = await this.waitForElement(
        this.calendarElementId,
        8000
      );
      if (!calendarEl)
        throw new Error(`Không tìm thấy phần tử #${this.calendarElementId}`);

      await Promise.all([this.waitForFullCalendar(), this.waitForUtils()]);

      // Xóa loading spinner và render calendar
      calendarEl.innerHTML = "";
      calendarEl.style.minHeight = "700px";

      // Tải events thực tế (lịch đã có của người dùng)
      const existingEvents = await this.loadEventsForAI();

      // Render calendar với events hiện có
      this.renderCalendar(existingEvents);
      await this.refreshFromDatabase();

      document.addEventListener("tab-shown", (e) => {
        if (
          e.detail &&
          (e.detail.tabId === "ai-calendar-tab" || e.detail.tabId === "ai-tab")
        ) {
          // Thêm nhiều ID có thể để fallback
          this.refreshFromDatabase();
          console.log("✅ Refresh từ tab-shown event");
        }
      });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && this.calendar) {
          // Chỉ khi tab visible và calendar tồn tại
          this.refreshFromDatabase();
          console.log("✅ Refresh từ visibilitychange (tab active)");
        }
      });
      // Setup navbar và nút AI
      setTimeout(() => {
        this.initializeNavbarEvents();
        this.setupAIButton();
        this.updateCalendarTitle();
      }, 100);
    },

    async loadEventsForAI() {
      try {
        console.log("Đang tải lịch AI (dùng MauSac từ CongViec)...");
        const res = await Utils.makeRequest("/api/ai/events/ai", "GET");
        if (!res.success || !Array.isArray(res.data)) return [];

        const events = res.data.map((ev) => ({
          id: ev.MaLichTrinh || `ai-${ev.MaCongViec}-${Date.now()}`,
          title: ev.TieuDe || "AI Đề xuất",
          start: ev.GioBatDau,
          end: ev.GioKetThuc,
          backgroundColor: ev.Color || "#8B5CF6", // Dùng Color từ backend
          borderColor: ev.Color || "#8B5CF6",
          classNames: ["event-ai-suggested"],
          extendedProps: {
            taskId: ev.MaCongViec,
            reason: ev.GhiChu,
            aiSuggested: true,
          },
        }));

        console.log(`Đã tải ${events.length} lịch AI với màu đúng`);
        return events;
      } catch (err) {
        console.error("Lỗi load lịch AI:", err);
        return [];
      }
    },

    // ==========================================================
    // ⭐ LOAD AI SUGGESTIONS - Hàm chính để hiển thị AI suggestions
    // ==========================================================
    async loadAISuggestions(suggestions) {
      try {
        console.log("🤖 Loading AI suggestions:", suggestions);

        if (
          !suggestions ||
          !Array.isArray(suggestions) ||
          suggestions.length === 0
        ) {
          if (Utils && Utils.showToast) {
            Utils.showToast("Không có đề xuất từ AI", "warning");
          }
          return [];
        }

        // ✅ KIỂM TRA CALENDAR ĐÃ ĐƯỢC KHỞI TẠO CHƯA
        if (!this.calendar) {
          console.error("❌ Calendar chưa được khởi tạo");
          throw new Error("Calendar chưa sẵn sàng. Vui lòng đợi.");
        }

        // Convert AI suggestions to calendar events
        const aiEvents = suggestions.map((suggestion, index) => {
          const start = new Date(suggestion.scheduledTime);
          const end = new Date(
            start.getTime() + (suggestion.durationMinutes || 60) * 60000
          );

          return {
            id: `ai-suggestion-${suggestion.taskId || index}-${Date.now()}`,
            title:
              suggestion.taskTitle ||
              suggestion.title ||
              `Công việc #${suggestion.taskId || index}`,
            start: start.toISOString(),
            end: end.toISOString(),
            backgroundColor: suggestion.color || "#8B5CF6",
            borderColor: suggestion.color || "#7c3aed",
            classNames: ["event-ai-suggested"], // CSS class để tạo style đặc biệt
            extendedProps: {
              taskId: suggestion.taskId,
              reason: suggestion.reason || "AI đề xuất",
              aiSuggested: true,
              durationMinutes: suggestion.durationMinutes || 60,
              priority: suggestion.priority || "medium",
            },
          };
        });

        // Lưu AI events
        this.suggestedEvents = aiEvents;

        console.log(`📅 Adding ${aiEvents.length} AI events to calendar...`);

        // ✅ XÓA CÁC AI EVENTS CŨ TRƯỚC KHI THÊM MỚI
        const existingAIEvents = this.calendar
          .getEvents()
          .filter((event) => event.id && event.id.includes("ai-suggestion-"));

        console.log(`🗑️ Removing ${existingAIEvents.length} old AI events...`);
        existingAIEvents.forEach((event) => {
          event.remove();
        });

        // ✅ THÊM AI EVENTS MỚI
        let addedCount = 0;
        aiEvents.forEach((event) => {
          try {
            this.calendar.addEvent(event);
            addedCount++;
          } catch (error) {
            console.error("❌ Error adding event:", event.title, error);
          }
        });

        console.log(`✅ Added ${addedCount}/${aiEvents.length} events`);

        // ✅ REFRESH CALENDAR ĐỂ HIỂN THỊ
        this.calendar.render();

        // ✅ NAVIGATE TO FIRST AI EVENT
        if (aiEvents.length > 0) {
          const firstEventDate = new Date(aiEvents[0].start);
          this.calendar.gotoDate(firstEventDate);
          console.log("📅 Navigated to first event:", firstEventDate);
        }

        if (Utils && Utils.showToast) {
          Utils.showToast(`✅ Đã thêm ${addedCount} đề xuất từ AI`, "success");
        }

        console.log("✅ AI suggestions loaded successfully");
        return this.suggestedEvents;
      } catch (err) {
        console.error("❌ Error loading AI suggestions:", err);
        if (Utils && Utils.showToast) {
          Utils.showToast("Lỗi tải đề xuất AI: " + err.message, "error");
        }
        throw err; // ✅ THROW ERROR ĐỂ HANDLER BIẾT
      }
    },

    // ==========================================================
    // ⭐ FIXED: OPEN AI SUGGESTION MODAL - CẢI THIỆN VỚI AIHandler
    // ==========================================================
    // Thêm vào hoặc thay thế hàm openAiSuggestionModal trong aiModule.js

    /**
     * ✅ SIMPLIFIED VERSION - Mở modal và init AIHandler
     */
    // Thay thế hàm openAiSuggestionModal() trong aiModule.js
    // Tìm hàm này (khoảng dòng 238) và thay bằng code dưới đây

    /**
     * ✅ SIMPLIFIED VERSION - Mở modal và init AIHandler
     */
    openAiSuggestionModal() {
      console.log("🤖 Opening AI suggestion modal...");

      try {
        const modal = document.getElementById("aiSuggestionModal");

        if (!modal) {
          console.error("❌ AI modal element not found");
          alert("Không tìm thấy modal AI. Vui lòng tải lại trang.");
          return;
        }

        // Hiển thị modal
        modal.classList.add("active", "show");
        modal.style.display = "flex";
        document.body.classList.add("modal-open");

        console.log("✅ Modal displayed");

        // Wait 500ms rồi init AIHandler
        setTimeout(() => {
          console.log("🔄 Initializing AIHandler...");

          if (window.AIHandler && window.AIHandler.initAIModal) {
            AIHandler.initAIModal()
              .then(() => {
                console.log("✅ AIHandler initialized successfully");
              })
              .catch((error) => {
                console.error("❌ AIHandler init failed:", error);
                this.showModalError(error.message);
              });
          } else {
            console.error("❌ AIHandler not available");
            this.showModalError(
              "AIHandler không khả dụng. Vui lòng tải lại trang."
            );
          }
        }, 500);
      } catch (error) {
        console.error("❌ Error opening modal:", error);
        alert("Lỗi mở modal: " + error.message);
      }
    },

    /**
     * Hiển thị lỗi trong modal
     */
    showModalError(message) {
      const modalBody = document.querySelector(
        "#aiSuggestionModal .ai-modal-body"
      );
      if (modalBody) {
        modalBody.innerHTML = `
      <div class="error-state" style="text-align: center; padding: 40px;">
        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #EF4444; margin-bottom: 20px;"></i>
        <p style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">Không thể tải dữ liệu</p>
        <p style="color: #666; margin-bottom: 20px;">${message}</p>
        <button class="btn btn-primary" onclick="AIModule.openAiSuggestionModal()" style="padding: 10px 20px; background: #3B82F6; color: white; border: none; border-radius: 8px; cursor: pointer;">
          <i class="fas fa-redo"></i>
          Thử lại
        </button>
      </div>
    `;
      }
    },

    /**
     * Helper để đóng modal
     */
    closeModal() {
      const modal = document.getElementById("aiSuggestionModal");
      if (modal) {
        modal.classList.remove("active", "show");
        modal.style.display = "none";
        document.body.classList.remove("modal-open");
        console.log("✅ Modal closed");
      }
    },

    /**
     * Initialize AI modal content với AIHandler
     */
    async initAIModalContent() {
      try {
        console.log("🔄 Initializing AI modal content...");

        // Chờ cho modal và AIHandler sẵn sàng
        await this.waitForModalReady();

        // Gọi AIHandler để populate tasks
        if (window.AIHandler && window.AIHandler.populateAIModal) {
          console.log("📋 Calling AIHandler.populateAIModal...");
          await AIHandler.populateAIModal();
        } else {
          console.warn(
            "⚠️ AIHandler not available or missing populateAIModal method"
          );
          this.showModalError("AIHandler không khả dụng");
        }
      } catch (error) {
        console.error("❌ Error initializing AI modal:", error);
        this.showModalError(error.message);
      }
    },

    /**
     * Chờ modal và dependencies sẵn sàng
     */
    async waitForModalReady() {
      return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 20;

        const check = () => {
          attempts++;

          const modal = document.getElementById("aiSuggestionModal");
          const taskList = modal?.querySelector(".task-list");

          if (modal && taskList && window.AIHandler) {
            console.log("✅ Modal and dependencies ready");
            resolve(true);
          } else if (attempts >= maxAttempts) {
            reject(new Error("Modal not ready after maximum attempts"));
          } else {
            console.log(`⏳ Waiting for modal... (${attempts}/${maxAttempts})`);
            setTimeout(check, 100);
          }
        };

        check();
      });
    },

    /**
     * Phương pháp fallback: Tự hiển thị modal
     */
    showAIModalFallback() {
      console.log("🔄 Using fallback method to show AI modal");

      // Tạo modal HTML tạm thời
      const modalHtml = `
        <div class="modal active show" id="aiSuggestionModal" style="display: flex; z-index: 10001;">
          <div class="modal-overlay"></div>
          <div class="modal-content">
            <div class="ai-modal-content">
              <div class="ai-modal-header">
                <div class="modal-header-left">
                  <div class="modal-icon">
                    <i class="fas fa-robot"></i>
                  </div>
                  <div class="modal-title">
                    <h3>🤖 Trợ lý AI Lập Lịch</h3>
                    <p class="modal-subtitle">AI sẽ giúp bạn sắp xếp công việc thông minh</p>
                  </div>
                </div>
                <button class="modal-close" onclick="document.getElementById('aiSuggestionModal').remove()">
                  <i class="fas fa-times"></i>
                </button>
              </div>
              
              <div class="ai-modal-body">
                <div class="loading-state">
                  <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                  </div>
                  <p>Đang tải danh sách công việc...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Remove existing modal
      document.getElementById("aiSuggestionModal")?.remove();

      // Add modal to body
      document.body.insertAdjacentHTML("beforeend", modalHtml);
      document.body.classList.add("modal-open");

      // Gọi AIHandler để load tasks
      setTimeout(() => {
        if (window.AIHandler && window.AIHandler.populateAIModal) {
          AIHandler.populateAIModal();
        }
      }, 300);
    },

    // ==========================================================
    // REFRESH UI
    // ==========================================================
    refreshUI() {
      if (this.calendar) {
        this.calendar.render();
        this.updateCalendarTitle();
        this.initializeNavbarEvents();
        this.setActiveView(this.currentView);
      }
    },

    // ==========================================================
    // UTILS
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

    waitForUtils(timeout = 10000) {
      return new Promise((resolve, reject) => {
        if (typeof Utils !== "undefined") return resolve();

        const start = Date.now();
        const check = () => {
          if (typeof Utils !== "undefined") resolve();
          else if (Date.now() - start > timeout)
            reject(new Error("Utils timeout"));
          else setTimeout(check, 100);
        };
        check();
      });
    },

    showError(error) {
      const el = document.getElementById(this.calendarElementId);
      if (!el) return;

      el.innerHTML = `
        <div class="flex items-center justify-center h-96">
          <div class="text-center p-10 bg-red-50 rounded-xl">
            <div class="text-6xl mb-4">❌</div>
            <h3 class="text-2xl font-bold text-red-700 mb-3">Không tải được lịch AI</h3>
            <p class="text-gray-600 mb-6">${error.message || error}</p>
            <button onclick="location.reload()" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Tải lại trang
            </button>
          </div>
        </div>
      `;
    },

    // ==========================================================
    // RENDER CALENDAR
    // ==========================================================
    renderCalendar(events) {
      const containerEl = document.getElementById(this.calendarElementId);

      if (this.calendar) {
        this.calendar.destroy();
        this.calendar = null;
      }

      this.calendar = new FullCalendar.Calendar(containerEl, {
        headerToolbar: false,
        initialView: this.currentView,
        height: "100%",
        editable: false,
        selectable: false,
        events: events,
        eventResizableFromStart: false,
        eventDurationEditable: false,
        eventDisplay: "block",
        allDaySlot: false,
        slotMinTime: "00:00:00",
        slotMaxTime: "24:00:00",
        slotDuration: "00:30:00",
        slotLabelFormat: {
          hour: "numeric",
          minute: "2-digit",
          hour12: false,
        },
        eventTimeFormat: {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        },
        views: {
          timeGridWeek: {
            type: "timeGrid",
            duration: { weeks: 1 },
            buttonText: "Tuần",
          },
          timeGridDay: {
            type: "timeGrid",
            duration: { days: 1 },
            buttonText: "Ngày",
          },
          dayGridMonth: {
            type: "dayGrid",
            duration: { months: 1 },
            buttonText: "Tháng",
          },
        },
        eventClick: (info) => this.handleEventClick(info),
        locale: "vi",
        firstDay: 1,
        nowIndicator: true,
        businessHours: {
          daysOfWeek: [1, 2, 3, 4, 5],
          startTime: "08:00",
          endTime: "17:00",
        },
      });

      this.calendar.render();
      console.log("✅ AI Calendar rendered");
    },

    // ==========================================================
    // EVENT HANDLING
    // ==========================================================
    handleEventClick(info) {
      const props = info.event.extendedProps;
      console.log("Event clicked:", info.event.title, props);

      // Hiển thị thông tin sự kiện
      const isAI = props.aiSuggested;
      const modalTitle = isAI ? "🤖 Sự kiện do AI đề xuất" : "📅 Sự kiện";

      const startTime = new Date(info.event.start).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const endTime = new Date(info.event.end).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (window.Utils && Utils.showToast) {
        Utils.showToast(
          `${modalTitle}\n${info.event.title}\n${startTime} - ${endTime}\n${
            props.reason || props.note || ""
          }`,
          "info"
        );
      }
    },

    // ==========================================================
    // AI BUTTON SETUP
    // ==========================================================
    setupAIButton() {
      const btn = document.getElementById("ai-suggest-btn");
      if (btn) {
        // Remove old listeners
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener("click", () => this.openAiSuggestionModal());
      }
    },

    // ==========================================================
    // VIEW MANAGEMENT
    // ==========================================================
    changeView(view) {
      this.currentView = view;
      if (this.calendar) {
        this.calendar.changeView(view);
        this.updateCalendarTitle();
        this.setActiveView(view);
      }
    },

    setActiveView(view) {
      [this.dayBtnId, this.weekBtnId, this.monthBtnId].forEach((id) => {
        const btn = document.getElementById(id);
        if (!btn) return;

        const isActive =
          (view === "timeGridDay" && id === this.dayBtnId) ||
          (view === "timeGridWeek" && id === this.weekBtnId) ||
          (view === "dayGridMonth" && id === this.monthBtnId);

        if (isActive) {
          btn.classList.add("bg-white", "text-gray-900", "shadow-sm");
          btn.classList.remove("text-gray-700", "hover:bg-white");
        } else {
          btn.classList.remove("bg-white", "text-gray-900", "shadow-sm");
          btn.classList.add("text-gray-700", "hover:bg-white");
        }
      });
    },

    updateCalendarTitle() {
      const titleEl = document.getElementById(this.titleElementId);
      if (titleEl && this.calendar) {
        titleEl.textContent = this.calendar.view.title;
      }
    },

    // ==========================================================
    // NAVBAR BUTTONS
    // ==========================================================
    initializeNavbarEvents() {
      const controls = {
        [this.prevBtnId]: () => {
          this.calendar.prev();
          this.updateCalendarTitle();
        },
        [this.nextBtnId]: () => {
          this.calendar.next();
          this.updateCalendarTitle();
        },
        [this.todayBtnId]: () => {
          this.calendar.today();
          this.updateCalendarTitle();
        },
        [this.dayBtnId]: () => this.changeView("timeGridDay"),
        [this.weekBtnId]: () => this.changeView("timeGridWeek"),
        [this.monthBtnId]: () => this.changeView("dayGridMonth"),
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
          });
        }
      });

      this.setActiveView(this.currentView);
    },

    // ==========================================================
    // DESTROY & CLEANUP
    // ==========================================================
    destroy() {
      if (this.calendar) {
        try {
          this.calendar.destroy();
        } catch (e) {}
        this.calendar = null;
      }
      this.isInitialized = false;
      console.log("🤖 AIModule đã được cleanup");
    },

    refresh() {
      if (this.calendar && this.isInitialized) {
        console.log("🤖 Refreshing AI calendar...");
        this.refreshUI();
      } else {
        console.log("🤖 AIModule not initialized, calling init()...");
        this.init();
      }
    },

    // THAY THẾ hàm refreshFromDatabase trong aiModule.js
    async refreshFromDatabase() {
      try {
        console.log("🔄 Refreshing AI calendar from database...");

        if (!this.calendar) {
          console.log("Calendar not ready, calling init()...");
          await this.init();
          return;
        }

        // 1. Lấy tất cả events từ database (bao gồm cả thường và AI)
        const allEvents = await this.loadEventsForAI();

        // 2. Lấy AI events riêng
        const aiEvents = await this.loadAIEventsFromDatabase();

        console.log(
          `📊 Events loaded: ${allEvents.length} total, ${aiEvents.length} AI`
        );

        // 3. Xóa tất cả events cũ trong calendar
        const existingEvents = this.calendar.getEvents();
        existingEvents.forEach((event) => {
          try {
            event.remove();
          } catch (e) {
            // Ignore errors
          }
        });

        // 4. Thêm tất cả events mới (gộp cả thường và AI)
        // Ưu tiên AI events (tránh trùng lặp)
        const uniqueEvents = [];
        const addedIds = new Set();

        // Thêm AI events trước
        aiEvents.forEach((event) => {
          if (event.id && !addedIds.has(event.id)) {
            try {
              this.calendar.addEvent(event);
              uniqueEvents.push(event);
              addedIds.add(event.id);
            } catch (error) {
              console.error("Error adding AI event:", error);
            }
          }
        });

        // Thêm các events thường (không phải AI)
        allEvents.forEach((event) => {
          if (
            event.id &&
            !addedIds.has(event.id) &&
            !event.extendedProps?.aiSuggested
          ) {
            try {
              this.calendar.addEvent(event);
              uniqueEvents.push(event);
              addedIds.add(event.id);
            } catch (error) {
              console.error("Error adding normal event:", error);
            }
          }
        });

        // 5. Lưu AI events vào memory
        this.suggestedEvents = aiEvents;

        // 6. Render lại calendar
        this.calendar.render();

        // 7. Cập nhật title
        this.updateCalendarTitle();

        console.log(`✅ Refreshed with ${uniqueEvents.length} unique events`);

        return uniqueEvents.length;
      } catch (error) {
        console.error("❌ Error refreshing from database:", error);
        return 0;
      }
    },

    // THÊM HÀM MỚI: Tải AI suggestions từ database
    async loadAISuggestionsFromDB() {
      try {
        console.log("🤖 Loading AI suggestions from database...");

        if (!Utils?.makeRequest) {
          console.warn("Utils.makeRequest không tồn tại");
          return [];
        }

        // API endpoint mới để lấy AI suggestions
        const res = await Utils.makeRequest("/api/calendar/ai-events", "GET");

        if (!res.success || !Array.isArray(res.data)) return [];

        const aiEvents = res.data.map((ev) => ({
          id: ev.MaLichTrinh || ev.ID || `ai-${ev.taskId}-${Date.now()}`,
          title: ev.TieuDe || ev.title || `Công việc #${ev.taskId}`,
          start: ev.GioBatDau || ev.start,
          end: ev.GioKetThuc || ev.end,
          backgroundColor: ev.Color || ev.color || "#8B5CF6",
          borderColor: ev.Color || ev.color || "#7c3aed",
          classNames: ["event-ai-suggested"],
          extendedProps: {
            note: ev.GhiChu || ev.reason || "AI đề xuất",
            completed: ev.DaHoanThanh === 1,
            taskId: ev.MaCongViec || ev.taskId,
            aiSuggested: true, // Đánh dấu đây là AI suggestion
            reason: ev.reason || "",
            durationMinutes: ev.durationMinutes || 60,
            priority: ev.priority || "medium",
            // ⭐ GIỮ LẠI MÀU TỪ DATABASE
            originalColor: ev.Color || ev.color,
          },
        }));

        console.log(`✅ Loaded ${aiEvents.length} AI events from database`);
        return aiEvents;
      } catch (err) {
        console.error("❌ Load AI suggestions error:", err);
        return [];
      }
    },

    async loadAIEventsFromDatabase() {
      try {
        console.log("🤖 Loading AI events from database (AI_DeXuat = 1)...");

        if (!Utils?.makeRequest) {
          console.warn("Utils.makeRequest không tồn tại");
          return [];
        }

        // Gọi API endpoint mới hoặc sửa query
        const res = await Utils.makeRequest("/api/calendar/events", "GET");

        if (!res.success || !Array.isArray(res.data)) return [];

        // Lọc các event có AI_DeXuat = true hoặc được AI đề xuất
        const aiEvents = res.data.filter(
          (ev) =>
            ev.extendedProps?.aiSuggested === true ||
            ev.AI_DeXuat === true ||
            ev.isAISuggestion === true
        );

        console.log(`✅ Found ${aiEvents.length} AI events in database`);

        // Chuyển đổi sang định dạng calendar
        const calendarEvents = aiEvents.map((ev) => {
          return {
            id: ev.MaLichTrinh || ev.ID || `ai-${Date.now()}-${Math.random()}`,
            title: ev.TieuDe || ev.title || "AI Đề xuất",
            start: ev.ThoiGianBatDau || ev.start,
            end: ev.ThoiGianKetThuc || ev.end,
            backgroundColor: ev.MaMau || ev.Color || "#8B5CF6",
            borderColor: ev.MaMau || ev.Color || "#7c3aed",
            classNames: ["event-ai-suggested"],
            extendedProps: {
              note: ev.GhiChu || ev.reason || "AI đề xuất",
              completed: ev.DaHoanThanh === 1,
              taskId: ev.MaCongViec || ev.taskId,
              aiSuggested: true,
              reason: ev.reason || "",
              durationMinutes: ev.durationMinutes || 60,
              priority: ev.priority || "medium",
              originalColor: ev.MaMau || ev.Color,
            },
          };
        });

        return calendarEvents;
      } catch (err) {
        console.error("❌ Error loading AI events from database:", err);
        return [];
      }
    },

    async testAIEventCreation() {
      try {
        console.log("🧪 Testing AI event creation...");

        const testPayload = {
          MaCongViec: 5015, // Thay bằng taskId thực tế
          GioBatDau: new Date().toISOString(),
          GioKetThuc: new Date(Date.now() + 60 * 60000).toISOString(),
          GhiChu: "Test AI event",
          AI_DeXuat: true,
        };

        console.log("Test payload:", testPayload);

        const response = await Utils.makeRequest(
          "/api/calendar/events",
          "POST",
          testPayload
        );
        console.log("Test response:", response);

        return response;
      } catch (error) {
        console.error("❌ Test failed:", error);
        return { success: false, error: error.message };
      }
    },

    // THÊM: Hàm để lưu AI suggestions vào database (đã có trong AIHandler)
    async saveAISuggestions(suggestions) {
      try {
        console.log(`💾 Saving ${suggestions.length} AI suggestions...`);

        // Gọi AIHandler để lưu vào database
        if (window.AIHandler && window.AIHandler.saveAISuggestionsToDatabase) {
          const result = await AIHandler.saveAISuggestionsToDatabase(
            suggestions
          );
          console.log("✅ AI suggestions saved:", result);
          return result;
        }

        console.warn("⚠️ AIHandler not available for saving suggestions");
        return { success: false, message: "AIHandler not available" };
      } catch (error) {
        console.error("❌ Error saving AI suggestions:", error);
        throw error;
      }
    },

    getCalendar() {
      return this.calendar;
    },

    restoreCalendar() {
      if (!this.calendar) return;

      console.log("🤖 Restoring AI calendar...");

      const aiCalendar = document.getElementById(this.calendarElementId);
      if (aiCalendar) {
        // Hiển thị lại calendar
        aiCalendar.style.opacity = "1";
        aiCalendar.style.pointerEvents = "auto";
        aiCalendar.style.position = "relative";
        aiCalendar.style.left = "0";

        // Khôi phục view nếu có
        if (this.lastView && this.calendar.view.type !== this.lastView) {
          this.changeView(this.lastView);
        }

        // Khôi phục ngày nếu có
        if (this.lastDate) {
          this.calendar.gotoDate(this.lastDate);
        }

        // Refresh nếu cần
        this.refreshUI();
      }
    },
  };

  // Export singleton
  window.AIModule = AIModule;
  console.log("🤖 AIModule v2.1 (Integrated with AIHandler) đã sẵn sàng!");
})();
