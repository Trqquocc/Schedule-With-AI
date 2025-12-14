/**
 * ABSOLUTE FIX: Force modal dimensions with explicit pixel values
 * Problem: Flex container with 0x0 despite having content
 * Solution: Set explicit width/height in pixels, not percentages
 */

(function () {
  "use strict";

  function absoluteFixModalDimensions() {
    console.log("🔧 ABSOLUTE FIX: Setting explicit dimensions...");

    const modal = document.getElementById("aiSuggestionModal");
    if (!modal) {
      console.error("❌ Modal not found");
      return false;
    }

    const content = modal.querySelector(".modal-content");
    if (!content) {
      console.error("❌ .modal-content not found");
      return false;
    }

    // ✅ CALCULATE VIEWPORT DIMENSIONS
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Set modal content to 800px width, 600px height (or 90% viewport if smaller)
    const modalWidth = Math.min(800, viewportWidth * 0.9);
    const modalHeight = Math.min(600, viewportHeight * 0.9);

    console.log("📐 Calculated dimensions:", {
      viewport: `${viewportWidth}x${viewportHeight}`,
      modal: `${modalWidth}x${modalHeight}`,
    });

    // ✅ SET EXPLICIT DIMENSIONS
    content.style.width = `${modalWidth}px`;
    content.style.height = `${modalHeight}px`;
    content.style.maxWidth = "none"; // Override CSS
    content.style.maxHeight = "none";
    content.style.minWidth = "0";
    content.style.minHeight = "0";
    content.style.display = "flex";
    content.style.flexDirection = "column";
    content.style.overflow = "hidden";
    content.style.background = "white";
    content.style.borderRadius = "12px";
    content.style.boxShadow = "0 20px 60px rgba(0, 0, 0, 0.3)";
    content.style.position = "relative";
    content.style.zIndex = "10001";

    // ✅ SET CHILDREN EXPLICIT HEIGHTS
    const header = content.querySelector(".ai-modal-header");
    const body = content.querySelector(".ai-modal-body");
    const footer = content.querySelector(".ai-modal-footer");

    if (header) {
      header.style.height = "80px";
      header.style.minHeight = "80px";
      header.style.maxHeight = "80px";
      header.style.flexShrink = "0";
      header.style.display = "flex";
      header.style.width = "100%";
    }

    if (footer) {
      footer.style.height = "80px";
      footer.style.minHeight = "80px";
      footer.style.maxHeight = "80px";
      footer.style.flexShrink = "0";
      footer.style.display = "flex";
      footer.style.width = "100%";
    }

    if (body) {
      // Body takes remaining space: total - header - footer
      const bodyHeight = modalHeight - 80 - 80; // 80px header, 80px footer
      body.style.height = `${bodyHeight}px`;
      body.style.minHeight = `${bodyHeight}px`;
      body.style.flex = "none"; // Don't use flex, use explicit height
      body.style.display = "block";
      body.style.overflowY = "auto";
      body.style.width = "100%";
      body.style.padding = "24px";
    }

    // Force reflow
    void content.offsetHeight;

    // Verify
    setTimeout(() => {
      const rect = content.getBoundingClientRect();
      console.log("📦 Final dimensions:", {
        width: rect.width,
        height: rect.height,
        offsetWidth: content.offsetWidth,
        offsetHeight: content.offsetHeight,
      });

      if (rect.width > 0 && rect.height > 0) {
        console.log("✅ SUCCESS! Modal is now visible!");
        return true;
      } else {
        console.error("❌ STILL FAILED!");
        console.log(
          "Last resort: Check if modal is inside another hidden element"
        );

        // Check parent chain
        let parent = content.parentElement;
        let level = 0;
        while (parent && level < 10) {
          const computed = window.getComputedStyle(parent);
          console.log(`Parent level ${level} (${parent.tagName}):`, {
            display: computed.display,
            visibility: computed.visibility,
            width: parent.offsetWidth,
            height: parent.offsetHeight,
          });
          parent = parent.parentElement;
          level++;
        }

        return false;
      }
    }, 100);

    return true;
  }

  // ✅ AUTO-RUN on modal open
  window.addEventListener("modalOpened", (e) => {
    if (e.detail?.modalId === "aiSuggestionModal") {
      console.log("🎯 AI Modal opened, applying absolute fix...");
      setTimeout(() => absoluteFixModalDimensions(), 100);
      setTimeout(() => absoluteFixModalDimensions(), 300);
      setTimeout(() => absoluteFixModalDimensions(), 500);
    }
  });

  window.addEventListener("modalShown", (e) => {
    if (e.detail?.modalId === "aiSuggestionModal") {
      console.log("🎯 AI Modal shown, applying absolute fix...");
      setTimeout(() => absoluteFixModalDimensions(), 100);
    }
  });

  // ✅ Export for manual use
  window.absoluteFixModalDimensions = absoluteFixModalDimensions;

  console.log("✅ Absolute Modal Fix loaded");
  console.log("💡 Manual: absoluteFixModalDimensions()");
})();
