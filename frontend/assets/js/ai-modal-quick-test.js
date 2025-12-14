/**
 * Quick AI Modal Test - Run this immediately after page loads
 */

window.quickTestAIModal = function () {
  console.clear();
  console.log("⚡ QUICK AI MODAL TEST\n");

  // Step 1: Check if modal exists
  const modal = document.getElementById("aiSuggestionModal");
  if (!modal) {
    console.error("❌ Modal not found in DOM");
    return false;
  }
  console.log("✅ Modal found in DOM");

  // Step 2: Force open it
  console.log("\n📋 Opening modal...");
  ModalManager.showModalById("aiSuggestionModal");

  // Step 3: Wait for render and check
  setTimeout(() => {
    const content = modal.querySelector(".modal-content");
    const rect = content.getBoundingClientRect();

    console.log("\n📊 Modal Content Dimensions:");
    console.table({
      "Width (px)": Math.round(rect.width),
      "Height (px)": Math.round(rect.height),
      Display: getComputedStyle(content).display,
      "Min-width": getComputedStyle(content).minWidth,
      "Min-height": getComputedStyle(content).minHeight,
    });

    // Step 4: Verdict
    if (rect.width > 0 && rect.height > 0) {
      console.log("\n✅ SUCCESS! Modal content is visible!");
      console.log("   Width: " + Math.round(rect.width) + "px ✓");
      console.log("   Height: " + Math.round(rect.height) + "px ✓");

      // Check all parts
      const header = content.querySelector(".ai-modal-header");
      const body = content.querySelector(".ai-modal-body");
      const footer = content.querySelector(".ai-modal-footer");

      console.log("\n🔍 Modal Parts:");
      console.log(
        "   Header visible:",
        header && header.offsetHeight > 0 ? "✅" : "❌"
      );
      console.log(
        "   Body visible:",
        body && body.offsetHeight > 0 ? "✅" : "❌"
      );
      console.log(
        "   Footer visible:",
        footer && footer.offsetHeight > 0 ? "✅" : "❌"
      );
    } else {
      console.error("\n❌ FAIL! Modal content is still 0x0");
      console.error("   Check browser cache (Ctrl+Shift+Delete)");
      console.error("   Hard reload (Ctrl+Shift+R)");
    }

    console.log("\n" + "=".repeat(50));
    console.log(
      "Test complete! Close modal with ModalManager.hideModalById('aiSuggestionModal')"
    );
  }, 300);
};

// Also add a shortcut
window.qtest = window.quickTestAIModal;

console.log("✅ Quick Test Script Loaded");
console.log("💡 Run: quickTestAIModal() or qtest()");
