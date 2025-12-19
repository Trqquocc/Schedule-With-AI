
(function () {
  "use strict";

  async function waitForModalContent(modalId, timeout = 5000) {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkContent = () => {
        const modal = document.getElementById(modalId);
        const content = modal?.querySelector(".modal-content");

        if (!modal || !content) {
          console.error("❌ Modal or content not found");
          reject(new Error("Modal structure missing"));
          return;
        }

        const hasChildren = content.children.length > 0;
        const hasHTML = content.innerHTML.trim().length > 100;

        console.log("🔍 Content check:", {
          children: content.children.length,
          htmlLength: content.innerHTML.length,
          hasChildren,
          hasHTML,
        });

        if (hasChildren && hasHTML) {
          console.log("✅ Modal content is populated!");
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          console.error("❌ Timeout waiting for content");
          reject(new Error("Content not populated in time"));
        } else {
          console.log("⏳ Waiting for content...");
          setTimeout(checkContent, 100);
        }
      };

      checkContent();
    });
  }

  async function forceLoadModalContent() {
    try {
      console.log("🔄 Force loading AI modal content...");

      const modal = document.getElementById("aiSuggestionModal");
      if (!modal) {
        throw new Error("Modal not found");
      }

      const existingContent = modal.querySelector(".modal-content");
      if (existingContent && existingContent.children.length > 0) {
        console.log("✅ Content already loaded");
        return true;
      }

      const response = await fetch(
        "components/modals/ai-suggestion-modal.html"
      );
      if (!response.ok) {
        throw new Error("Failed to load modal HTML");
      }

      const html = await response.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const newContent = doc.querySelector(".modal-content");
      if (!newContent) {
        throw new Error("No .modal-content in HTML file");
      }

      const oldContent = modal.querySelector(".modal-content");
      if (oldContent) {
        modal.replaceChild(newContent, oldContent);
      } else {
        modal.appendChild(newContent);
      }

      console.log("✅ Modal content reloaded");
      return true;
    } catch (error) {
      console.error("❌ Error loading modal content:", error);
      return false;
    }
  }

  async function initializeAIModalFull() {
    try {
      console.log("🚀 Initializing AI modal (full flow)...");

      const modal = document.getElementById("aiSuggestionModal");
      const content = modal?.querySelector(".modal-content");

      if (!content || content.children.length === 0) {
        console.log("⚠️ Content empty, reloading...");
        await forceLoadModalContent();
      }

      await waitForModalContent("aiSuggestionModal");

      const modalContent = modal.querySelector(".modal-content");
      if (modalContent) {
        modalContent.style.cssText = `
          display: flex !important;
          flex-direction: column !important;
          width: 800px !important;
          max-width: 90vw !important;
          min-width: 600px !important;
          min-height: 400px !important;
          max-height: 90vh !important;
          background: white !important;
          border-radius: 12px !important;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
          overflow: hidden !important;
          position: relative !important;
          z-index: 10001 !important;
          opacity: 1 !important;
          visibility: visible !important;
        `;

        void modalContent.offsetHeight;

        console.log("✅ Modal display forced");
      }

      if (window.AIHandler && window.AIHandler.initAIModal) {
        console.log("🔧 Calling AIHandler.initAIModal...");
        await AIHandler.initAIModal();
      }

      setTimeout(() => {
        const finalContent = document.querySelector(
          "#aiSuggestionModal .modal-content"
        );
        if (finalContent) {
          console.log("📦 Final dimensions:", {
            width: finalContent.offsetWidth,
            height: finalContent.offsetHeight,
            display: window.getComputedStyle(finalContent).display,
          });

          if (finalContent.offsetWidth === 0) {
            console.error("❌ STILL 0x0 - Check modal HTML file!");
          } else {
            console.log("✅ Modal is now visible!");
          }
        }
      }, 200);

      return true;
    } catch (error) {
      console.error("❌ Error initializing modal:", error);
      return false;
    }
  }

  const originalShowModalById = window.ModalManager?.showModalById;

  if (originalShowModalById) {
    window.ModalManager.showModalById = function (modalId) {
      console.log(`🎯 Intercepting showModalById: ${modalId}`);

      const result = originalShowModalById.call(this, modalId);

      if (modalId === "aiSuggestionModal") {
        console.log("🤖 AI Modal detected, initializing...");

        setTimeout(async () => {
          await initializeAIModalFull();
        }, 100);
      }

      return result;
    };

    console.log("✅ ModalManager.showModalById overridden for AI modal");
  }

  window.initAIModalFull = initializeAIModalFull;
  window.forceLoadModalContent = forceLoadModalContent;

  console.log("✅ Modal Content Loader ready");
  console.log("💡 Manual: initAIModalFull() or forceLoadModalContent()");
})();
