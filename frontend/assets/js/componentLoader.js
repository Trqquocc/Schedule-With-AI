/**
 * ComponentLoader v3.0 - SIMPLIFIED & STABLE VERSION
 * Quản lý load components một cách đơn giản, tránh xung đột
 */

(function () {
  "use strict";

  if (window.ComponentLoader) {
    console.log("⚠️ ComponentLoader already exists, skipping...");
    return;
  }

  window.ComponentLoader = {
    // Cache để tránh load lại
    loadedComponents: new Set(),
    loadedScripts: new Set(),
    currentSection: null,

    // Mapping các section tới file HTML
    PAGE_MAP: {
      schedule: "pages/calendar-content.html",
      work: "pages/work.html",
      salary: "pages/salary.html",
      profile: "pages/profile.html",
      ai: "pages/ai-content.html",
    },

    // ==========================================================
    // LOAD COMPONENT - Core function
    // ==========================================================
    async loadComponent(containerId, filePath, options = {}) {
      const { forceReload = false, executeScripts = true } = options;
      const container = document.getElementById(containerId);

      if (!container) {
        console.warn(`⚠️ Container not found: #${containerId}`);
        return false;
      }

      // Nếu đã load và không force reload
      if (this.loadedComponents.has(containerId) && !forceReload) {
        console.log(`✓ Component already loaded: ${containerId}`);
        return true;
      }

      try {
        console.log(`📥 Loading: ${filePath} → #${containerId}`);
        const response = await fetch(filePath);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${filePath}`);
        }

        const html = await response.text();
        container.innerHTML = html;

        // Execute scripts nếu cần
        if (executeScripts) {
          await this.executeScripts(container);
        }
        if (
          containerId.includes("Modal") &&
          container.innerHTML.includes(`id="${containerId}"`)
        ) {
          console.warn(`⚠️ Possible nested modal structure in ${containerId}`);
          // Tìm và xóa div ngoài cùng nếu nó có cùng ID
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = html;
          const nestedModal = tempDiv.querySelector(`#${containerId}`);
          if (nestedModal) {
            console.log(`🔄 Fixing nested modal: ${containerId}`);
            container.innerHTML = nestedModal.innerHTML;
          }
        }

        this.loadedComponents.add(containerId);
        container.dataset.loaded = "true";

        console.log(`✅ Loaded successfully: ${containerId}`);
        return true;
      } catch (err) {
        console.error(`❌ Error loading ${filePath}:`, err);
        container.innerHTML = `
          <div class="flex items-center justify-center h-96">
            <div class="text-center p-8 bg-red-50 rounded-xl">
              <div class="text-5xl mb-4">⚠️</div>
              <h3 class="text-xl font-bold text-red-700 mb-2">Lỗi tải nội dung</h3>
              <p class="text-gray-600">${err.message}</p>
            </div>
          </div>
        `;
        return false;
      }
    },

    // ==========================================================
    // EXECUTE SCRIPTS - Chạy script an toàn
    // ==========================================================
    async executeScripts(container) {
      const scripts = container.querySelectorAll("script");

      for (const script of scripts) {
        try {
          const newScript = document.createElement("script");

          // External script
          if (script.src) {
            // Kiểm tra đã load chưa
            if (this.loadedScripts.has(script.src)) {
              console.log(`⏭️ Script already loaded: ${script.src}`);
              script.remove();
              continue;
            }

            newScript.src = script.src;

            // Promise để đợi script load xong
            await new Promise((resolve, reject) => {
              newScript.onload = () => {
                this.loadedScripts.add(script.src);
                console.log(`✓ Script loaded: ${script.src}`);
                resolve();
              };
              newScript.onerror = () => {
                console.error(`❌ Script error: ${script.src}`);
                reject(new Error(`Failed to load: ${script.src}`));
              };
              document.head.appendChild(newScript);
            });
          } else {
            // Inline script
            newScript.textContent = script.textContent;
            document.head.appendChild(newScript);
          }

          script.remove();
        } catch (err) {
          console.error("Script execution error:", err);
        }
      }
    },

    // ==========================================================
    // LOAD PAGE CONTENT - Main function cho việc chuyển tab
    // ==========================================================
    async loadPageContent(sectionName) {
      console.log(`\n🔄 Loading section: ${sectionName}`);

      const filePath = this.PAGE_MAP[sectionName];
      if (!filePath) {
        console.error(`❌ Unknown section: ${sectionName}`);
        return false;
      }

      const containerId = `${sectionName}-section`;

      // Load nội dung chính
      const success = await this.loadComponent(containerId, filePath);
      if (!success) return false;

      // Load các phần bổ sung theo section
      await this.loadSectionExtras(sectionName);

      // Cập nhật section hiện tại
      this.currentSection = sectionName;

      // Khởi động module tương ứng
      setTimeout(() => {
        this.initializeSection(sectionName);
      }, 200);

      return true;
    },

    // ==========================================================
    // LOAD SECTION EXTRAS - Các phần bổ sung cho từng section
    // ==========================================================
    async loadSectionExtras(sectionName) {
      switch (sectionName) {
        case "schedule":
          await this.loadComponent(
            "calendar-sidebar",
            "components/calendar-sidebar.html"
          );
          break;

        case "ai":
          // AI section không cần phần bổ sung
          console.log("🤖 AI section - no extras needed");
          break;

        // Thêm các section khác nếu cần
      }
    },

    // ==========================================================
    // INITIALIZE SECTION - Khởi động module tương ứng
    // ==========================================================
    initializeSection(sectionName) {
      console.log(`🚀 Initializing section: ${sectionName}`);

      const initMap = {
        schedule: () => {
          if (window.CalendarModule?.init) {
            console.log("📅 Initializing CalendarModule...");
            CalendarModule.init();
          }
        },

        ai: () => {
          if (window.AIModule?.init) {
            console.log("🤖 Initializing AIModule...");
            AIModule.init();
          } else {
            console.error("❌ AIModule not found!");
          }
        },

        work: () => {
          if (window.WorkManager?.init) {
            console.log("💼 Initializing WorkManager...");
            WorkManager.init();
          }
        },

        salary: () => {
          if (window.SalaryManager?.init) {
            console.log("💰 Initializing SalaryManager...");
            SalaryManager.init();
          }
          if (window.TabManager?.init) {
            TabManager.init();
          }
        },

        profile: () => {
          if (window.ProfileManager?.init) {
            console.log("👤 Initializing ProfileManager...");
            ProfileManager.init();
          }
        },
      };

      const initFn = initMap[sectionName];
      if (initFn) {
        try {
          initFn();
        } catch (err) {
          console.error(`❌ Error initializing ${sectionName}:`, err);
        }
      } else {
        console.log(`ℹ️ No initialization needed for: ${sectionName}`);
      }
    },

    // ==========================================================
    // INITIALIZE APP - Khởi động toàn bộ ứng dụng
    // ==========================================================
    async init() {
      console.log("🚀 ComponentLoader v3.0 - Initializing...\n");

      try {
        // Load các component cố định
        await this.loadComponent(
          "sidebar-container",
          "components/sidebar.html"
        );

        await this.loadComponent("navbar-container", "components/navbar.html");

        // Load modals
        await this.loadModals();

        // Tìm section đang active và load
        const activeSection = document.querySelector(".section.active");
        if (activeSection) {
          const sectionName = activeSection.id.replace("-section", "");
          await this.loadPageContent(sectionName);
        } else {
          console.log("ℹ️ No active section found");
        }

        console.log("\n✅ ComponentLoader initialization complete!");
      } catch (err) {
        console.error("❌ ComponentLoader initialization failed:", err);
      }
    },

    // ==========================================================
    // LOAD MODALS - Load các modal cần thiết
    // ==========================================================
    async loadModals() {
      console.log("📦 Loading modals...");

      const modals = [
        {
          id: "createTaskModal",
          path: "components/modals/create-task-modal.html",
        },
        { id: "settingsModal", path: "components/modals/settings-modal.html" },
        {
          id: "eventDetailModal",
          path: "components/modals/event-detail-modal.html",
        },
        {
          id: "aiSuggestionModal",
          path: "components/modals/ai-suggestion-modal.html",
        },
        {
          id: "createCategoryModal",
          path: "components/modals/create-category-modal.html",
        },
      ];

      for (const modal of modals) {
        try {
          await this.loadComponent(modal.id, modal.path, {
            executeScripts: true,
          });
        } catch (err) {
          console.warn(`⚠️ Failed to load modal: ${modal.id}`, err);
        }
      }
    },

    // ==========================================================
    // UTILITY METHODS
    // ==========================================================

    // Force reload một component
    async reloadComponent(containerId, filePath) {
      this.loadedComponents.delete(containerId);
      return await this.loadComponent(containerId, filePath, {
        forceReload: true,
      });
    },

    // Kiểm tra component đã load chưa
    isLoaded(containerId) {
      return this.loadedComponents.has(containerId);
    },

    // Reset toàn bộ cache
    reset() {
      console.log("🔄 Resetting ComponentLoader...");
      this.loadedComponents.clear();
      this.currentSection = null;
      console.log("✅ ComponentLoader reset complete");
    },

    // Debug info
    debug() {
      console.log("\n=== ComponentLoader Debug ===");
      console.log("Current section:", this.currentSection);
      console.log("Loaded components:", [...this.loadedComponents]);
      console.log("Loaded scripts:", [...this.loadedScripts]);
      console.log("============================\n");
    },
  };

  // Global debug helper
  window.debugLoader = () => window.ComponentLoader.debug();

  console.log("✅ ComponentLoader v3.0 ready!\n");
})();
