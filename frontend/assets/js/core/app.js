(function () {
  "use strict";

  if (window.App) {
    return;
  }

  window.App = {
    initialized: false,

    async init() {
      if (this.initialized) {
        return;
      }

      this.initialized = true;

      await this.waitForFontAwesome();

      const authLoading = document.getElementById("auth-loading");
      const mainApp = document.getElementById("main-app");

      if (authLoading) authLoading.style.display = "none";
      if (mainApp) mainApp.classList.add("ready");

      document.addEventListener('auth-success', () => this.onAuthSuccess());
      document.addEventListener('auth-logout', () => this.onAuthLogout());

      // Always load UI — calendar works in demo mode, other sections require login
      await this.initApp();
    },

    async initApp() {
      try {
        await ComponentLoader.init();
      } catch (err) {
        console.error("Component loading failed:", err);
      }

      if (this.isAuthenticated()) {
        this.updateUserInfo();
        this.updateSidebarAuthState(true);
      } else {
        this.updateSidebarAuthState(false);
      }

      if (window.AppNavigation?.init) AppNavigation.init();
      if (window.ModalManager?.init) ModalManager.init();
      if (window.AuthModalController) AuthModalController.init();

      if (this.isAuthenticated() && window.StatsManager?.init) {
        try { await StatsManager.init(); } catch (_) {}
      }

      setTimeout(() => this.refreshIcons(), 300);
      this.verifyInitialization();
    },

    // initAuthenticated removed — initApp handles both guest and auth states

    async onAuthSuccess() {
      this.updateUserInfo();
      if (window.updateSidebarUser) {
        const user = JSON.parse(localStorage.getItem('user_data') || '{}');
        updateSidebarUser(user);
      }
      this.updateSidebarAuthState(true);

      // Remove login-required overlays so sections can render
      document.querySelectorAll('.login-required-overlay').forEach(el => el.remove());

      // Reload calendar with real data
      if (window.CalendarModule?.isInitialized) {
        const events = await CalendarModule.loadEvents();
        CalendarModule.renderCalendar(events);
      }

      // Reload calendar sidebar tasks
      if (window.loadUserTasks) loadUserTasks(true);

      // Reset sections so they fully reload with real data
      ["work", "ai", "salary", "notifications", "habits", "friends", "groups", "chat"].forEach(s => {
        ComponentLoader.loadedComponents.delete(s + '-section');
        const el = document.getElementById(s + '-section');
        if (el) { el.innerHTML = ''; el._sectionLoaded = false; }
      });

      // Re-init current active section if it was blocked
      const active = document.querySelector('.section.active');
      if (active) {
        const name = active.id.replace('-section', '');
        if (name !== 'schedule') {
          await ComponentLoader.loadPageContent(name);
        }
      }

      if (window.StatsManager?.init) { try { await StatsManager.init(); } catch (_) {} }
      this.refreshIcons();
    },

    onAuthLogout() {
      ["auth_token", "token", "user_data", "user_id", "user_avatar", "user_avatar_url",
       "cal_working_hours_v1", "pomodoroConfig", "__calendar_refresh", "__task_refresh_trigger"
      ].forEach(k => localStorage.removeItem(k));

      window.RealtimeBadgeWatcher?.stop();
      this.updateSidebarAuthState(false);

      // Reload calendar with demo data
      if (window.CalendarModule?.isInitialized && window.CalendarModule.getDemoEvents) {
        CalendarModule.renderCalendar(CalendarModule.getDemoEvents());
      }

      // Clear authenticated sections, reset loaded state
      ["work", "ai", "salary", "notifications", "habits", "friends", "groups", "chat"].forEach(s => {
        ComponentLoader.loadedComponents.delete(s + '-section');
        const el = document.getElementById(s + '-section');
        if (el) { el.innerHTML = ''; el._sectionLoaded = false; }
      });

      // Switch to calendar section
      if (window.AppNavigation?.switchSection) AppNavigation.switchSection('schedule');
    },

    updateSidebarAuthState(isLoggedIn) {
      const profileArea = document.getElementById('sidebarProfileBtn');
      const settingsBtn = document.getElementById('settingsBtn');

      if (profileArea) profileArea.style.display = isLoggedIn ? 'flex' : 'none';
      if (settingsBtn) settingsBtn.style.display = isLoggedIn ? 'flex' : 'none';
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
            document.body.classList.add("fa-loaded");
            resolve(true);
          } else if (Date.now() - startTime < timeout) {
            setTimeout(check, 50);
          } else {
            document.body.classList.add("fa-loaded");
            resolve(false);
          }
        };

        check();
      });
    },

    refreshIcons() {
      const icons = document.querySelectorAll(
        'i[class*="fa-"], span[class*="fa-"]'
      );

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
    },

    verifyInitialization() {
      const sections = document.querySelectorAll(".section");
      const navButtons = document.querySelectorAll("[data-section]");
      const icons = document.querySelectorAll(
        'i[class*="fa-"], span[class*="fa-"]'
      );
    },

    isAuthenticated() {
      const token = localStorage.getItem("auth_token");
      if (!token) return false;

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const isValid = Date.now() < payload.exp * 1000;
        return isValid;
      } catch (err) {
        console.error(" Token validation error:", err);
        return false;
      }
    },

    updateUserInfo() {
      const user = JSON.parse(localStorage.getItem("user_data") || "{}");

      const userName = user.hoten || user.username || "Người dùng";
      const userEmail = user.email || "";
      const avatarLetter = userName.charAt(0).toUpperCase();

      window.BadgeDisplay?.storeMyBadge(user.equippedBadge || user.EquippedBadge);
      const badgeHtml = window.BadgeDisplay?.inline(user.equippedBadge || user.EquippedBadge, 12) || "";
      document
        .querySelectorAll(".user-name, [data-user-name], #nav-user-name")
        .forEach((el) => {
          el.innerHTML = userName + badgeHtml;
        });

      document
        .querySelectorAll(".user-email, [data-user-email]")
        .forEach((el) => {
          el.textContent = userEmail;
        });

      document.querySelectorAll(".avatar-letter").forEach((el) => {
        el.textContent = avatarLetter;
      });
    },

    testNavigation(sectionName) {
      if (window.AppNavigation && AppNavigation.navigateToSection) {
        AppNavigation.navigateToSection(sectionName);
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
    document.addEventListener("DOMContentLoaded", () => {
      App.init();
    });
  } else {
    setTimeout(() => App.init(), 100);
  }

})();

window.debugApp = function () {
  const state = window.App?.getState();
  console.table(state);
};

window.refreshUI = function () {
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
};

window.testNav = function (section) {
  window.App?.testNavigation(section);
};

window.debugIcons = function () {
  const icons = document.querySelectorAll(
    'i[class*="fa-"], span[class*="fa-"]'
  );

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
};

window.fixIcons = function () {
  window.App?.refreshIcons();
  setTimeout(() => {
    window.debugIcons();
  }, 500);
};
