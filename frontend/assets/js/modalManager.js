

(function () {
  "use strict";

  if (window.ModalManager) {
    console.log(" ModalManager already exists, replacing...");
    delete window.ModalManager;
  }

  const ModalManager = {
    activeModal: null,
    initialized: false,
    cachedContent: new Map(),

    init() {
      if (this.initialized) {
        console.log(" ModalManager already initialized");
        return;
      }

      console.log("🎯 ModalManager initialization started");
      this.fixNestedModals();
      this.setupGlobalEventListeners();
      this.initialized = true;
      console.log(" ModalManager initialized successfully");
    },

    fixNestedModals() {

      const allModals = document.querySelectorAll("#aiSuggestionModal");
      if (allModals.length > 1) {
        console.log(
          ` Phát hiện ${allModals.length} modals với ID aiSuggestionModal (nested)`
        );

        const modalsArray = Array.from(allModals);

        const parentModal = modalsArray.find(
          (m) => m.classList.contains("active") && m.classList.contains("show")
        );
        const childModal = modalsArray.find((m) =>
          m.classList.contains("hidden")
        );

        if (parentModal && childModal && parentModal !== childModal) {
          console.log(" Đang fix nested modal structure...");

          while (childModal.firstChild) {
            parentModal.appendChild(childModal.firstChild);
          }

          childModal.remove();

          console.log(" Đã xoá modal duplicate!");
        }
      }
    },

    showModalById(modalId) {
      console.log(` showModalById called for: ${modalId}`);

      const modal = document.getElementById(modalId);
      if (!modal) {
        console.error(` Modal not found: ${modalId}`);
        return false;
      }

      console.log(` Modal found, current classes: ${modal.className}`);

      modal.classList.remove("hidden");
      modal.classList.add("active", "show");

      document.body.style.overflow = "hidden";

      this.activeModal = modalId;

      console.log(`🎯 Modal ${modalId} updated classes: ${modal.className}`);

      window.dispatchEvent(
        new CustomEvent("modalShown", {
          detail: { modalId },
        })
      );

      setTimeout(() => {
        const computed = window.getComputedStyle(modal);
        console.log(`   - Computed Display: ${computed.display}`);
        console.log(`   - Computed Opacity: ${computed.opacity}`);
        console.log(`   - Computed Visibility: ${computed.visibility}`);
      }, 0);

      window.dispatchEvent(
        new CustomEvent("modalOpened", {
          detail: { modalId },
        })
      );

      this.reinitializeModalHandlers(modal);

      setTimeout(() => this.verifyModalVisibility(modalId), 100);

      return true;
    },

    verifyModalVisibility(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) return;

      const rect = modal.getBoundingClientRect();
      const computed = window.getComputedStyle(modal);

      console.log(` Verification for ${modalId}:`);
      console.log(`   - Width: ${rect.width}px, Height: ${rect.height}px`);
      console.log(`   - Display: ${computed.display}`);
      console.log(`   - Visibility: ${computed.visibility}`);
      console.log(`   - Opacity: ${computed.opacity}`);
      console.log(`   - Z-index: ${computed.zIndex}`);

      if (computed.display === "none") {
        console.error(" Modal display is NONE! Forcing flex...");
        modal.style.display = "flex";
      }

      if (parseFloat(computed.opacity) < 1) {
        console.warn(" Modal opacity < 1, forcing 1");
        modal.style.opacity = "1";
      }

      const content = modal.querySelector(".modal-content");
      if (content) {
        const contentRect = content.getBoundingClientRect();
        console.log(`   - Content rect:`, contentRect);

        if (contentRect.height > window.innerHeight) {
          console.warn(
            " Modal content taller than viewport, enabling scroll"
          );
          modal.style.overflow = "auto";
        }
      }
    },

    close(modalId) {
      const targetModal = modalId || this.activeModal;
      const modal = document.getElementById(targetModal);

      if (!modal) {
        console.warn(` Modal not found for closing: ${targetModal}`);
        return;
      }

      console.log(`🚪 Closing modal: ${targetModal}`);

      modal.classList.remove("active", "show");

      modal.classList.add("hidden");

      modal.style.display = "";
      modal.style.opacity = "";
      modal.style.visibility = "";

      document.body.style.overflow = "";

      this.activeModal = null;

      window.dispatchEvent(
        new CustomEvent("modalClosed", {
          detail: { modalId: targetModal },
        })
      );

      console.log(` Modal ${targetModal} closed`);
    },

    setupGlobalEventListeners() {

      document.addEventListener("click", (e) => {
        if (!this.activeModal) return;

        const categoryModal = document.getElementById("createCategoryModal");
        const isCategoryModalOpen =
          categoryModal &&
          !categoryModal.classList.contains("hidden") &&
          categoryModal.style.display !== "none";

        if (isCategoryModalOpen) {
          console.log(" Category modal is open, ignoring backdrop click");
          return;
        }

        if (e.target.classList.contains("modal") && this.activeModal) {
          console.log("🎯 Backdrop clicked, closing modal");
          this.close(this.activeModal);
        }
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.activeModal) {
          console.log("⌨️ ESC pressed, closing modal");
          this.close(this.activeModal);
        }
      });

      console.log(" Global event listeners setup complete");
    },

    reinitializeModalHandlers(modal) {
      if (!modal) return;

      console.log(`🔄 Reinitializing handlers for: ${modal.id}`);

      const closeButtons = modal.querySelectorAll(
        ".modal-close, [data-modal-close], [id*='cancel'], [id*='close']"
      );

      closeButtons.forEach((btn) => {

        const newBtn = btn.cloneNode(true);
        btn.parentNode?.replaceChild(newBtn, btn);

        newBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log(`🎯 Close button clicked in ${modal.id}`);
          this.close(modal.id);
        });
      });

      console.log(`    Reinitialized ${closeButtons.length} close buttons`);
    },

    showCreateTaskModal(taskData = null) {
      console.log(" [ModalManager] Opening create task modal...");

      const modal = document.getElementById("createTaskModal");
      if (!modal) {
        console.error(" Create task modal not found");
        return false;
      }

      const success = this.showModalById("createTaskModal");

      if (window.loadCategoriesForModal) {
        setTimeout(() => {
          console.log("  📂 Triggering category load...");
          window.loadCategoriesForModal();
        }, 300);
      }

      if (taskData && window.loadTaskDataIntoForm) {
        setTimeout(() => {
          window.loadTaskDataIntoForm(taskData);
        }, 400);
      }

      return success;
    },

    hideModal(modalId) {
      this.close(modalId);
    },

    hideModalById(modalId) {
      this.close(modalId);
    },

    debug() {
      console.log("=== MODAL MANAGER DEBUG ===");
      console.log("Initialized:", this.initialized);
      console.log("Active modal:", this.activeModal);

      const modals = document.querySelectorAll(".modal");
      console.log(`\nFound ${modals.length} modals:`);

      modals.forEach((modal) => {
        const computed = window.getComputedStyle(modal);
        const rect = modal.getBoundingClientRect();

        console.log(`\n ${modal.id}:`);
        console.log("  Classes:", modal.className);
        console.log("  Display:", computed.display);
        console.log("  Visibility:", computed.visibility);
        console.log("  Opacity:", computed.opacity);
        console.log("  Z-index:", computed.zIndex);
        console.log("  Position:", computed.position);
        console.log("  Dimensions:", `${rect.width}x${rect.height}`);
      });

      console.log("\n========================");
    },
  };

  window.ModalManager = ModalManager;

  window.testModal = (modalId = "createTaskModal") => {
    console.log(`🧪 Testing modal: ${modalId}`);
    ModalManager.showModalById(modalId);
  };

  window.debugModals = () => ModalManager.debug();

  console.log(" ModalManager v2.2 loaded");
})();
