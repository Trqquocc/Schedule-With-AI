/**
 * Sort-controls: renders a row of 3 chips (Danh mục / Ưu tiên / Thời gian).
 *
 * Interaction model (option B — single criterion at a time):
 *   - Click inactive chip  -> activate with its DEFAULT direction
 *   - Click active chip    -> flip direction (asc <-> desc)
 *   - Click while holding  -> (future) multi-criterion; not implemented
 *
 * Defaults per criterion:
 *   - category: asc   (A -> Z)
 *   - priority: desc  (4 Cao -> 1 Thấp)
 *   - duration: asc   (ngắn -> dài)
 *
 * State persistence: localStorage under opts.storageKey.
 *
 * Usage:
 *   const ctrl = SortControls.mount(containerEl, {
 *     storageKey: "sort.work",
 *     onChange: (state) => rerender(state),
 *   });
 *   ctrl.getState(); // { criterion: "priority" | null, direction: "asc" | "desc" }
 *   ctrl.destroy();
 */
(function () {
  "use strict";
  if (window.SortControls) return;

  const CRITERIA = [
    { key: "category", label: "Danh mục", icon: "fa-folder", defaultDir: "asc" },
    { key: "priority", label: "Ưu tiên", icon: "fa-flag", defaultDir: "desc" },
    { key: "duration", label: "Thời gian", icon: "fa-clock", defaultDir: "asc" },
  ];

  function readState(storageKey) {
    if (!storageKey) return { criterion: null, direction: "asc" };
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return { criterion: null, direction: "asc" };
      const parsed = JSON.parse(raw);
      const valid = CRITERIA.some((c) => c.key === parsed.criterion);
      return {
        criterion: valid ? parsed.criterion : null,
        direction: parsed.direction === "desc" ? "desc" : "asc",
      };
    } catch {
      return { criterion: null, direction: "asc" };
    }
  }

  function writeState(storageKey, state) {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* storage full / disabled — silently ignore */
    }
  }

  function chipHTML(c, active, direction) {
    const dirIcon =
      active && direction === "desc"
        ? "fa-arrow-down-wide-short"
        : active
        ? "fa-arrow-up-short-wide"
        : "fa-sort";
    const bg = active ? "#dc2626" : "#fff";
    const color = active ? "#fff" : "#374151";
    const border = active ? "#dc2626" : "#e2e8f0";
    return `
      <button type="button"
        class="sort-chip flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all select-none"
        data-sort-key="${c.key}"
        aria-pressed="${active ? "true" : "false"}"
        style="background:${bg};color:${color};border-color:${border}">
        <i class="fas ${c.icon} text-[11px]"></i>
        <span>${c.label}</span>
        <i class="fas ${dirIcon} text-[10px] opacity-80"></i>
      </button>
    `;
  }

  function rootHTML(state) {
    const chips = CRITERIA.map((c) =>
      chipHTML(c, c.key === state.criterion, state.direction)
    ).join("");
    const resetVisible = state.criterion ? "" : "hidden";
    return `
      <div class="sort-controls flex items-center gap-2 flex-wrap">
        <span class="text-xs font-medium" style="color:#64748b">
          <i class="fas fa-arrow-down-wide-short mr-1"></i>Sắp xếp:
        </span>
        ${chips}
        <button type="button"
          class="sort-clear text-xs underline ${resetVisible}"
          style="color:#64748b"
          title="Bỏ sắp xếp">Mặc định</button>
      </div>
    `;
  }

  function mount(container, opts) {
    if (!container) return null;
    opts = opts || {};
    const storageKey = opts.storageKey || null;
    const onChange = typeof opts.onChange === "function" ? opts.onChange : null;

    let state = readState(storageKey);
    container.innerHTML = rootHTML(state);

    function rerender() {
      container.innerHTML = rootHTML(state);
      wire();
    }

    function commit(next) {
      state = next;
      writeState(storageKey, state);
      rerender();
      if (onChange) onChange({ ...state });
    }

    function wire() {
      container.querySelectorAll(".sort-chip").forEach((btn) => {
        btn.addEventListener("click", () => {
          const key = btn.getAttribute("data-sort-key");
          const def = CRITERIA.find((c) => c.key === key);
          if (!def) return;
          if (state.criterion === key) {
            commit({ criterion: key, direction: state.direction === "asc" ? "desc" : "asc" });
          } else {
            commit({ criterion: key, direction: def.defaultDir });
          }
        });
      });
      const clearBtn = container.querySelector(".sort-clear");
      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          commit({ criterion: null, direction: "asc" });
        });
      }
    }

    wire();

    return {
      getState: () => ({ ...state }),
      setState: (s) => commit({
        criterion: CRITERIA.some((c) => c.key === s?.criterion) ? s.criterion : null,
        direction: s?.direction === "desc" ? "desc" : "asc",
      }),
      destroy: () => { container.innerHTML = ""; },
    };
  }

  window.SortControls = { mount };
})();
