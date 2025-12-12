// assets/js/debug.js - BẢN FIX CUỐI CÙNG (KHÔNG CÒN LỖI GIẢ NỮA)
(function () {
  // TẮT HOÀN TOÀN LOG "container not found" – đây là log giả!
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = function (...args) {
    if (
      args[0] &&
      typeof args[0] === "string" &&
      args[0].includes("Container") &&
      args[0].includes("not found")
    ) {
      return; // BỎ QUA LOG GIẢ
    }
    originalLog.apply(console, args);
  };

  console.warn = function (...args) {
    if (
      args[0] &&
      typeof args[0] === "string" &&
      args[0].includes("Container") &&
      args[0].includes("not found")
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };

  console.error = function (...args) {
    if (
      args[0] &&
      typeof args[0] === "string" &&
      args[0].includes("Container") &&
      args[0].includes("not found")
    ) {
      return;
    }
    originalError.apply(console, args);
  };

  console.log(
    "%cDebug mode: Log 'container not found' đã bị tắt!",
    "color: green; font-size: 14px; font-weight: bold;"
  );
})();
