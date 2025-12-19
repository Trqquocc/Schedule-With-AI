(function () {
  "use strict";

  if (window.App) {
    console.log(" App already loaded");
    return;
  }

  window.App = {
    initialized: false,

    async init() {
      if (this.initialized) {
        console.log(" App already initialized");
        return;
      }

      this.initialized = true;
      console.log(" App initialization started...");

      if (!this.isAuthenticated()) {
        console.warn(" Not authenticated, redirecting to login...");
        window.location.href = "/login.html";
        return;
      }
      console.log(" Authentication verified");

      await this.waitForFontAwesome();

      console.log("📦 Loading components...");
      try {
        await ComponentLoader.init();
        console.log(" Components loaded successfully");

        const sidebarContainer = document.getElementById("sidebar-container");
        if (sidebarContainer && sidebarContainer.children.length > 0) {
          console.log(
            " Sidebar verified in DOM:",
            sidebarContainer.children.length,
            "children"
          );
        } else {
          console.warn(" Sidebar loaded but may be empty");
        }
      } catch (err) {
        console.error(" Component loading failed:", err);
        throw err;
      }

      console.log(" Updating user info...");
      this.updateUserInfo();
      console.log(" User info updated");

      console.log("🧭 Initializing Navigation...");
      if (window.AppNavigation) {
        if (typeof AppNavigation.init === "function") {
          AppNavigation.init();
          console.log(" Navigation initialized");
          console.log("  - Current section:", AppNavigation.currentSection);
          console.log(
            "  - Nav buttons:",
            AppNavigation.navButtons?.length || 0
          );
          console.log("  - Sections:", AppNavigation.sections?.length || 0);
        } else {
          console.error(" Navigation.init is not a function!");
        }
      } else {
        console.error(" Navigation object not found!");
      }

      console.log("🎭 Initializing ModalManager...");
      if (window.ModalManager?.init) {
        ModalManager.init();
        console.log(" ModalManager initialized");
      } else {
        console.warn(" ModalManager not available");
      }

      console.log(" Initializing StatsManager...");
      if (window.StatsManager?.init) {
        try {
          await StatsManager.init();
          console.log(" StatsManager initialized");
        } catch (err) {
          console.warn(" StatsManager initialization error:", err);
        }
      } else {
        console.warn(" StatsManager not available");
      }

      const authLoading = document.getElementById("auth-loading");
      const mainApp = document.getElementById("main-app");

      if (authLoading) {
        authLoading.style.display = "none";
        console.log(" Auth loading hidden");
      }

      if (mainApp) {
        mainApp.classList.add("ready");
        console.log(" Main app displayed");
      }

      setTimeout(() => {
        this.refreshIcons();
      }, 300);

      this.verifyInitialization();

      console.log(" App fully initialized & running perfectly!");
    },

    async waitForFontAwesome(timeout = 3000) {
      return new Promise((resolve) => {
        const startTime = Date.now();

        const check = () => {
          const testEl = document.createElement("i");
          testEl.className = "fas fa-check";
          testEl.style.position = "absolute";
          testEl.style.left = "-9999px";
          document.body.appendChild(testEl);

          const computed = window.getComputedStyle(testEl, ":before");
          const hasContent =
            computed.content &&
            computed.content !== "none" &&
            computed.content !== '""';

          document.body.removeChild(testEl);

          if (hasContent) {
            console.log(" Font Awesome fully loaded");
            document.body.classList.add("fa-loaded");
            resolve(true);
          } else if (Date.now() - startTime < timeout) {
            setTimeout(check, 50);
          } else {
            console.warn(" Font Awesome load timeout, continuing...");
            document.body.classList.add("fa-loaded");
            resolve(false);
          }
        };

        check();
      });
    },

    refreshIcons() {
      console.log("🎨 Refreshing icons...");

      const icons = document.querySelectorAll(
        'i[class*="fa-"], span[class*="fa-"]'
      );
      console.log(`📍 Found ${icons.length} icon elements`);

      let fixedCount = 0;

      icons.forEach((icon) => {
        const computed = window.getComputedStyle(icon);
        const fontFamily = computed.fontFamily;

        if (!fontFamily.includes("Font Awesome")) {
          icon.style.fontFamily =
            '"Font Awesome 6 Free", "Font Awesome 6 Brands"';
          icon.style.fontWeight = "900";
          icon.style.display = "inline-block";
          fixedCount++;
        }

        if (icon.style.opacity === "0" || computed.opacity === "0") {
          icon.style.opacity = "1";
        }
      });

      if (fixedCount > 0) {
        console.log(` Fixed ${fixedCount} icons with missing font`);
      }

      console.log(" Icon refresh complete");
    },

    verifyInitialization() {
      console.log(" Verifying initialization...");

      const sections = document.querySelectorAll(".section");
      const activeSection = document.querySelector(".section.active");
      console.log(
        `   Sections: ${sections.length} total, active: ${
          activeSection?.id || "none"
        }`
      );

      const navButtons = document.querySelectorAll("[data-section]");
      console.log(`  📘 Nav buttons: ${navButtons.length}`);

      const icons = document.querySelectorAll(
        'i[class*="fa-"], span[class*="fa-"]'
      );
      const visibleIcons = Array.from(icons).filter(
        (icon) => window.getComputedStyle(icon).opacity !== "0"
      );
      console.log(
        `  🎨 Icons: ${icons.length} total, ${visibleIcons.length} visible`
      );

      if (window.AppNavigation) {
        console.log(
          `  🧭 Navigation: initialized=${AppNavigation.initialized}, current=${AppNavigation.currentSection}`
        );
      } else {
        console.error("  Navigation object missing!");
      }

      sections.forEach((section) => {
        const isActive = section.classList.contains("active");
        const display = window.getComputedStyle(section).display;
        console.log(
          `  - ${section.id}: ${isActive ? "" : ""} active, display: ${display}`
        );
      });

      if (navButtons.length > 0) {
        console.log(" 🧪 Navigation buttons registered:");
        navButtons.forEach((btn) => {
          console.log(`    - ${btn.dataset.section}: ready`);
        });
      }
    },

    isAuthenticated() {
      const token = localStorage.getItem("auth_token");
      if (!token) return false;

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const isValid = Date.now() < payload.exp * 1000;
        if (!isValid) {
          console.warn(" Token expired");
        }
        return isValid;
      } catch (err) {
        console.error(" Token validation error:", err);
        return false;
      }
    },

    updateUserInfo() {
      const user = JSON.parse(localStorage.getItem("user_data") || "{}");

      if (!user.username && !user.hoten) {
        console.warn(" No user data found in localStorage");
      }

      const userName = user.hoten || user.username || "Người dùng";
      const userEmail = user.email || "";
      const avatarLetter = userName.charAt(0).toUpperCase();

      let nameUpdates = 0;
      document
        .querySelectorAll(".user-name, [data-user-name], #nav-user-name")
        .forEach((el) => {
          el.textContent = userName;
          nameUpdates++;
        });
      console.log(`   Updated ${nameUpdates} user name elements`);

      let emailUpdates = 0;
      document
        .querySelectorAll(".user-email, [data-user-email]")
        .forEach((el) => {
          el.textContent = userEmail;
          emailUpdates++;
        });
      console.log(`   Updated ${emailUpdates} user email elements`);

      let avatarUpdates = 0;
      document.querySelectorAll(".avatar-letter").forEach((el) => {
        el.textContent = avatarLetter;
        avatarUpdates++;
      });
      console.log(`   Updated ${avatarUpdates} avatar elements`);
    },

    testNavigation(sectionName) {
      console.log(`🧪 Testing navigation to: ${sectionName}`);
      if (window.AppNavigation && AppNavigation.navigateToSection) {
        AppNavigation.navigateToSection(sectionName);
      } else {
        console.error(" Navigation not available for testing");
      }
    },

    getState() {
      return {
        initialized: this.initialized,
        authenticated: this.isAuthenticated(),
        navigationReady: !!window.AppNavigation?.initialized,
        currentSection: window.AppNavigation?.currentSection,
        sectionsCount: document.querySelectorAll(".section").length,
        navButtonsCount: document.querySelectorAll("[data-section]").length,
        activeSection: document.querySelector(".section.active")?.id,
        iconsCount: document.querySelectorAll(
          'i[class*="fa-"], span[class*="fa-"]'
        ).length,
        visibleIconsCount: Array.from(
          document.querySelectorAll('i[class*="fa-"], span[class*="fa-"]')
        ).filter((icon) => window.getComputedStyle(icon).opacity !== "0")
          .length,
        fontAwesomeLoaded: document.body.classList.contains("fa-loaded"),
      };
    },
  };

  if (document.readyState === "loading") {
    console.log(" Waiting for DOMContentLoaded...");
    document.addEventListener("DOMContentLoaded", () => {
      console.log(" DOMContentLoaded fired");
      App.init();
    });
  } else {
    console.log(" DOM already ready, initializing immediately...");
    setTimeout(() => App.init(), 100);
  }

  console.log(" App module loaded");
})();

window.debugApp = function () {
  console.log("=== APP DEBUG INFO ===");
  const state = window.App?.getState();
  console.table(state);
  console.log("Navigation:", window.AppNavigation);
  console.log("Sections:", document.querySelectorAll(".section"));
  console.log("Nav buttons:", document.querySelectorAll("[data-section]"));
  console.log("Active section:", document.querySelector(".section.active"));
};

window.refreshUI = function () {
  console.log("🔄 Global UI refresh...");

  if (window.App && window.App.updateUserInfo) {
    window.App.updateUserInfo();
  }

  if (window.CalendarModule && CalendarModule.refreshDragDrop) {
    CalendarModule.refreshDragDrop();
  }

  if (window.WorkManager && WorkManager.loadTasks) {
    WorkManager.loadTasks();
  }

  if (window.FontAwesome && FontAwesome.dom && FontAwesome.dom.i2svg) {
    setTimeout(() => FontAwesome.dom.i2svg(), 100);
  }

  console.log(" UI refreshed");
};

window.testNav = function (section) {
  window.App?.testNavigation(section);
};

window.debugIcons = function () {
  const icons = document.querySelectorAll(
    'i[class*="fa-"], span[class*="fa-"]'
  );
  console.log(`=== ICONS DEBUG (${icons.length} total) ===`);

  const iconData = Array.from(icons).map((icon, index) => {
    const computed = window.getComputedStyle(icon, "::before");
    const computedMain = window.getComputedStyle(icon);
    return {
      index: index + 1,
      tag: icon.tagName.toLowerCase(),
      className: icon.className,
      fontFamily: computedMain.fontFamily,
      content: computed.content,
      opacity: computedMain.opacity,
      display: computedMain.display,
      visible: computedMain.opacity !== "0",
    };
  });

  console.table(iconData);

  const visibleCount = iconData.filter((i) => i.visible).length;
  console.log(` Visible: ${visibleCount} / ${icons.length}`);

  if (visibleCount < icons.length) {
    console.warn(` ${icons.length - visibleCount} icons are hidden!`);
  }
};

window.fixIcons = function () {
  console.log(" Manually fixing icons...");
  window.App?.refreshIcons();
  setTimeout(() => {
    console.log(" Icon fix complete, checking results...");
    window.debugIcons();
  }, 500);
};
