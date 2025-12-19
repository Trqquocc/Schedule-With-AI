(function () {
>>>>>>> 426072f71e0530329486d23943d72eac896d8ba1
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
      return;
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
