(function () {
  "use strict";

  if (window.ComponentLoader) {
    console.log(" ComponentLoader already exists, skipping...");
    return;
  }

  window.ComponentLoader = {
    loadedComponents: new Set(),
    loadedScripts: new Set(),
    currentSection: null,

    PAGE_MAP: {
      schedule: "pages/calendar-content.html",
      work: "pages/work.html",
      salary: "pages/salary.html",
      profile: "pages/profile.html",
      ai: "pages/ai-content.html",
    },

    async loadComponent(containerId, filePath, options = {}) {
      const { forceReload = false, executeScripts = true } = options;
      const container = document.getElementById(containerId);

      if (!container) {
        console.warn(` Container not found: #${containerId}`);
        return false;
      }

      if (this.loadedComponents.has(containerId) && !forceReload) {
        console.log(`✓ Component already loaded: ${containerId}`);
        return true;
      }

      try {
        console.log(` Loading: ${filePath} → #${containerId}`);
        const response = await fetch(filePath);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${filePath}`);
        }

        const html = await response.text();

        if (containerId === "sidebar-container") {
          console.log(`🎭 SIDEBAR LOADING STARTED`);
          try {
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = html;
            console.log(` HTML parsed`);

            const styleTag = tempDiv.querySelector("style");
            if (styleTag) {
              const newStyle = document.createElement("style");
              newStyle.innerHTML = styleTag.innerHTML;
              document.head.appendChild(newStyle);
              console.log(` Sidebar styles injected into <head>`);

              await new Promise((r) => setTimeout(r, 50));
            }

            const asideElement = tempDiv.querySelector("aside");
            if (!asideElement) {
              throw new Error("No <aside> element found in sidebar.html");
            }
            console.log(` <aside> element found`);

            container.innerHTML = asideElement.outerHTML;
            console.log(` Sidebar HTML inserted into #sidebar-container`);

            const settingsModal = tempDiv.querySelector("#settingsModal");
            if (settingsModal) {
              const settingsContainer =
                document.getElementById("settingsModal");
              if (settingsContainer) {
                settingsContainer.outerHTML = settingsModal.outerHTML;
                console.log(` SettingsModal injected`);
              }
            }

            const scripts = tempDiv.querySelectorAll("script");
            for (let idx = 0; idx < scripts.length; idx++) {
              const newScript = document.createElement("script");
              newScript.innerHTML = scripts[idx].innerHTML;
              document.body.appendChild(newScript);
              console.log(` Script ${idx + 1}/${scripts.length} executed`);
            }

            console.log(` SIDEBAR LOADING COMPLETE`);

            const forceSidebarVisibility = () => {
              const style = document.createElement("style");
              style.innerHTML = `
                #sidebar-container {
                  display: block !important;
                  position: fixed !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 256px !important;
                  height: 100vh !important;
                  z-index: 999 !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                }
                #sidebar-container aside {
                  display: flex !important;
                  flex-direction: column !important;
                  width: 256px !important;
                  height: 100vh !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                }
                #sidebar-container aside > * {
                  visibility: visible !important;
                  opacity: 1 !important;
                }
              `;
              document.head.appendChild(style);
              console.log(" Sidebar visibility CSS injected");
            };
            setTimeout(forceSidebarVisibility, 50);
          } catch (error) {
            console.error(` SIDEBAR LOADING FAILED:`, error);
            container.innerHTML = html;
          }
        } else if (containerId.includes("Modal")) {
          console.log(`🎭 Loading modal: ${containerId}`);
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = html;

          const nestedModal = tempDiv.querySelector(`#${containerId}`);

          if (nestedModal) {
            console.log(`🔄 Fixing nested modal structure: ${containerId}`);

            const nestedInsideNested = nestedModal.querySelector(
              `#${containerId}`
            );
            if (nestedInsideNested) {
              console.warn(` DOUBLE NESTED MODAL DETECTED!`);

              let deepestModal = nestedInsideNested;
              while (deepestModal.querySelector(`#${containerId}`)) {
                deepestModal = deepestModal.querySelector(`#${containerId}`);
              }

              container.innerHTML = deepestModal.outerHTML;
            } else {
              container.innerHTML = nestedModal.outerHTML;
            }

            setTimeout(() => {
              this.fixNestedModals(containerId);
              this.checkModalStructure(containerId);
            }, 50);
          } else {
            container.innerHTML = html;
          }
        } else {
          container.innerHTML = html;
        }

        if (executeScripts) {
          await this.executeScripts(container);
        }

        this.loadedComponents.add(containerId);
        container.dataset.loaded = "true";

        console.log(` Loaded successfully: ${containerId}`);
        return true;
      } catch (err) {
        console.error(` Error loading ${filePath}:`, err);
        container.innerHTML = `
          <div class="flex items-center justify-center h-96">
            <div class="text-center p-8 bg-red-50 rounded-xl">
              <div class="text-5xl mb-4"></div>
              <h3 class="text-xl font-bold text-red-700 mb-2">Lỗi tải nội dung</h3>
              <p class="text-gray-600">${err.message}</p>
            </div>
          </div>
        `;
        return false;
      }
    },

    async executeScripts(container) {
      const scripts = container.querySelectorAll("script");

      for (const script of scripts) {
        try {
          const newScript = document.createElement("script");

          if (script.src) {
            if (this.loadedScripts.has(script.src)) {
              console.log(`⏭️ Script already loaded: ${script.src}`);
              script.remove();
              continue;
            }

            newScript.src = script.src;

            await new Promise((resolve, reject) => {
              newScript.onload = () => {
                this.loadedScripts.add(script.src);
                console.log(`✓ Script loaded: ${script.src}`);
                resolve();
              };
              newScript.onerror = () => {
                console.error(` Script error: ${script.src}`);
                reject(new Error(`Failed to load: ${script.src}`));
              };
              document.head.appendChild(newScript);
            });
          } else {
            newScript.textContent = script.textContent;
            document.head.appendChild(newScript);
          }

          script.remove();
        } catch (err) {
          console.error("Script execution error:", err);
        }
      }
    },
    async loadPageContent(sectionName) {
      console.log(`\n🔄 Loading section: ${sectionName}`);

      const filePath = this.PAGE_MAP[sectionName];
      if (!filePath) {
        console.error(` Unknown section: ${sectionName}`);
        return false;
      }

      const containerId = `${sectionName}-section`;

      const success = await this.loadComponent(containerId, filePath);
      if (!success) return false;

      await this.loadSectionExtras(sectionName);

      this.currentSection = sectionName;

      setTimeout(() => {
        this.initializeSection(sectionName);
      }, 200);

      return true;
    },
    async loadSectionExtras(sectionName) {
      switch (sectionName) {
        case "schedule":
          await this.loadComponent(
            "calendar-sidebar",
            "components/calendar-sidebar.html"
          );
          break;

        case "ai":
          console.log(" AI section - no extras needed");
          break;
      }
    },

    initializeSection(sectionName) {
      console.log(` Initializing section: ${sectionName}`);

      const initMap = {
        schedule: () => {
          if (window.CalendarModule?.init) {
            console.log(" Initializing CalendarModule...");
            CalendarModule.init();
          }
        },

        ai: () => {
          if (window.AIModule?.init) {
            console.log(" Initializing AIModule...");
            AIModule.init();
          } else {
            console.error(" AIModule not found!");
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
            console.log(" Initializing ProfileManager...");
            ProfileManager.init();
          }
        },

        settings: () => {
          if (window.ProfileManager?.init) ProfileManager.init();
          if (window.NotificationManager?.init) NotificationManager.init();
          console.log("👤 Initialized managers for settings modal");
        },
      };

      const initFn = initMap[sectionName];
      if (initFn) {
        try {
          initFn();
        } catch (err) {
          console.error(` Error initializing ${sectionName}:`, err);
        }
      } else {
        console.log(` No initialization needed for: ${sectionName}`);
      }
    },

    async init() {
      console.log(" ComponentLoader v3.0 - Initializing...\n");

      try {
        console.log(" Loading sidebar...");
        await this.loadComponent(
          "sidebar-container",
          "components/sidebar.html"
        );
        console.log(" Sidebar loaded\n");

        const navbarContainer = document.getElementById("navbar-container");
        if (navbarContainer) {
          console.log(" Loading navbar...");
          await this.loadComponent(
            "navbar-container",
            "components/navbar.html"
          );
          console.log(" Navbar loaded\n");
        } else {
          console.log(" navbar-container not found, skipping\n");
        }

        console.log(" Loading modals...");
        await this.loadModals();
        console.log(" Modals loaded\n");

        const activeSection = document.querySelector(".section.active");
        if (activeSection) {
          const sectionName = activeSection.id.replace("-section", "");
          console.log(`📄 Loading active section: ${sectionName}`);
          await this.loadPageContent(sectionName);
        } else {
          console.log(" No active section found");
        }

        console.log("\n ComponentLoader initialization complete!");
      } catch (err) {
        console.error(" ComponentLoader initialization failed:", err);
        throw err;
      }
    },

    async loadModals() {
      console.log(" Loading modals...");

      const modals = [
        {
          id: "createTaskModal",
          path: "components/modals/create-task-modal.html",
        },
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
        {
          id: "profileModal",
          path: "components/modals/profile-modal.html",
        },
        {
          id: "notificationModal",
          path: "components/modals/notification-modal.html",
        },
      ];

      for (const modal of modals) {
        try {
          await this.loadComponent(modal.id, modal.path, {
            executeScripts: true,
          });
          setTimeout(() => {
            this.fixNestedModals(modal.id);
          }, 100);
        } catch (err) {
          console.warn(` Failed to load modal: ${modal.id}`, err);
        }
      }
    },

    fixNestedModals(modalId = null) {
      console.log(" Checking for nested modals...");

      const modalIds = modalId
        ? [modalId]
        : [
            "aiSuggestionModal",
            "createTaskModal",
            "eventDetailModal",
            "createCategoryModal",
            "profileModal",
            "notificationModal",
          ];

      modalIds.forEach((id) => {
        const modals = document.querySelectorAll(`#${id}`);

        if (modals.length > 1) {
          console.warn(` Multiple ${id} modals found: ${modals.length}`);
          console.log(" Fixing nested structure...");

          const mainModal = modals[0];
          const isHidden = mainModal.classList.contains("hidden");

          for (let i = 1; i < modals.length; i++) {
            const duplicate = modals[i];

            while (duplicate.firstChild) {
              if (duplicate.firstChild.id === id) {
                duplicate.firstChild.remove();
                continue;
              }
              mainModal.appendChild(duplicate.firstChild);
            }

            duplicate.remove();
          }

          if (!isHidden) {
            mainModal.classList.remove("hidden");
            mainModal.style.display = "flex";
            mainModal.style.visibility = "visible";
            mainModal.style.opacity = "1";
          }

          console.log(` Fixed nested modal: ${id}`);
        }
      });
    },

    checkModalStructure(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) {
        console.warn(` Modal not found: ${modalId}`);
        return false;
      }

      const nested = modal.querySelector(`#${modalId}`);
      if (nested) {
        console.error(` NESTED MODAL DETECTED: ${modalId} inside itself!`);
        return false;
      }

      console.log(` Modal structure OK: ${modalId}`);
      return true;
    },

    fixAllModals() {
      console.log("🛠️ Fixing ALL nested modals...");
      this.fixNestedModals();

      document.querySelectorAll(".modal.active.show").forEach((modal) => {
        if (getComputedStyle(modal).display === "none") {
          modal.style.display = "flex";
          modal.style.visibility = "visible";
          modal.style.opacity = "1";
        }
      });

      console.log(" All modals fixed");
      return true;
    },

    debugModal(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) {
        console.error(` Modal not found: ${modalId}`);
        return;
      }

      console.log(`=== DEBUG MODAL: ${modalId} ===`);
      console.log("Classes:", modal.className);
      console.log("Display:", getComputedStyle(modal).display);
      console.log("Children:", modal.children.length);

      const nested = modal.querySelector(`#${modalId}`);
      console.log("Has nested self?", !!nested);

      if (nested) {
        console.log(" NESTED FOUND! Structure:");
        console.log(modal.outerHTML.substring(0, 500) + "...");
      }

      console.log("======================");
    },

    async reloadComponent(containerId, filePath) {
      this.loadedComponents.delete(containerId);
      return await this.loadComponent(containerId, filePath, {
        forceReload: true,
      });
    },

    isLoaded(containerId) {
      return this.loadedComponents.has(containerId);
    },

    reset() {
      console.log("🔄 Resetting ComponentLoader...");
      this.loadedComponents.clear();
      this.currentSection = null;
      console.log(" ComponentLoader reset complete");
    },

    debug() {
      console.log("\n=== ComponentLoader Debug ===");
      console.log("Current section:", this.currentSection);
      console.log("Loaded components:", [...this.loadedComponents]);
      console.log("Loaded scripts:", [...this.loadedScripts]);
      console.log("============================\n");
    },
  };

  window.debugLoader = () => window.ComponentLoader.debug();

  window.fixModal = function (modalId = "aiSuggestionModal") {
    if (window.ComponentLoader && ComponentLoader.fixNestedModals) {
      console.log(` Manual fix for modal: ${modalId}`);
      ComponentLoader.fixNestedModals(modalId);

      const modal = document.getElementById(modalId);
      if (modal) {
        modal.style.display = "flex";
        modal.style.visibility = "visible";
        modal.style.opacity = "1";

        const content = modal.querySelector(".modal-content");
        if (content) {
          console.log(" Content dimensions:", {
            width: content.offsetWidth,
            height: content.offsetHeight,
            display: getComputedStyle(content).display,
          });
        }
      }
    } else {
      console.error(" ComponentLoader not available");
    }
  };

  setTimeout(() => {
    if (window.ComponentLoader) {
      ComponentLoader.fixNestedModals("aiSuggestionModal");
    }
  }, 1000);

  console.log(" ComponentLoader v3.0 ready!\n");
})();
