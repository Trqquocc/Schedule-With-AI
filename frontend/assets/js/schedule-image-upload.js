/**
 * schedule-image-upload.js
 * Controller for the "Import lịch từ ảnh" modal.
 * Flow: pick/paste/drop image → Canvas resize → POST parse-schedule-image
 *       → render editable items → Save (bulk POST task-instances)
 *       OR Apply (POST /api/schedule/apply with priority override + dry-run preview).
 *
 * Exposes: window.ScheduleImageUpload = { open, close, init }
 */
(function () {
  if (window.ScheduleImageUpload) return;

  const MAX_EDGE = 1600; // client-side resize target (long edge, px)
  const JPEG_QUALITY = 0.85;
  const MODAL_ID = "scheduleImportModal";
  const MODAL_PATH = "components/modals/schedule-import-modal.html";

  const state = {
    type: "study",
    level: "dai_hoc",
    file: null,
    base64: null,
    mimeType: null,
    items: [],
    warnings: [],
    wiredDom: false,
  };

  const $ = (id) => document.getElementById(id);

  // ---- DOM boot (idempotent) -------------------------------------------
  function init() {
    if (state.wiredDom) return;
    if (!$("scheduleImportDropzone")) return; // modal HTML not loaded yet
    wireEvents();
    state.wiredDom = true;
  }

  async function open() {
    if (!document.getElementById("scheduleImportDropzone")) {
      await window.ComponentLoader.loadComponent(MODAL_ID, MODAL_PATH, {
        executeScripts: true,
      });
      init();
    }
    const host = $(MODAL_ID);
    host.classList.remove("hidden");
    host.classList.add("active");
    resetForNextScan();
  }

  function close() {
    const host = $(MODAL_ID);
    if (!host) return;
    host.classList.add("hidden");
    host.classList.remove("active");
  }

  function resetForNextScan() {
    state.file = null;
    state.base64 = null;
    state.mimeType = null;
    state.items = [];
    state.warnings = [];
    $("scheduleImportThumbWrap")?.classList.add("hidden");
    $("scheduleImportPreview")?.classList.add("hidden");
    $("scheduleImportFooter")?.classList.add("hidden");
    hideStatus();
  }

  // ---- Event wiring ----------------------------------------------------
  function wireEvents() {
    const dz = $("scheduleImportDropzone");
    const fi = $("scheduleImportFileInput");

    dz.addEventListener("click", () => fi.click());
    dz.addEventListener("dragover", (e) => {
      e.preventDefault();
      dz.style.background = "#eff6ff";
    });
    dz.addEventListener("dragleave", () => (dz.style.background = "#f8fafc"));
    dz.addEventListener("drop", (e) => {
      e.preventDefault();
      dz.style.background = "#f8fafc";
      const f = e.dataTransfer?.files?.[0];
      if (f) handleFilePicked(f);
    });
    fi.addEventListener("change", (e) => {
      const f = e.target.files?.[0];
      if (f) handleFilePicked(f);
    });

    // Paste anywhere in document while modal is open
    document.addEventListener("paste", (e) => {
      const host = $(MODAL_ID);
      if (!host || host.classList.contains("hidden")) return;
      const item = [...(e.clipboardData?.items || [])].find((i) =>
        i.type.startsWith("image/")
      );
      if (item) {
        const f = item.getAsFile();
        if (f) handleFilePicked(f);
      }
    });

    $("scheduleImportCloseBtn").addEventListener("click", close);
    $("scheduleImportParseBtn").addEventListener("click", parse);
    $("scheduleImportAddBtn").addEventListener("click", () => {
      addBlankRow();
      renderItems();
    });
    $("scheduleImportRescanBtn").addEventListener("click", resetForNextScan);
    $("scheduleImportSaveBtn").addEventListener("click", save);
    $("scheduleImportApplyBtn").addEventListener("click", applyWithPreview);

    // Type + level sync
    document
      .querySelectorAll('input[name="si-type"]')
      .forEach((r) => r.addEventListener("change", (e) => (state.type = e.target.value)));
    $("scheduleImportLevel").addEventListener(
      "change",
      (e) => (state.level = e.target.value)
    );
  }

  // ---- File handling + resize -----------------------------------------
  async function handleFilePicked(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      showStatus("error", "Định dạng ảnh không hỗ trợ (chỉ JPG/PNG/WEBP)");
      return;
    }
    state.file = file;
    const resized = await resizeImage(file);
    state.base64 = resized.base64;
    state.mimeType = resized.mimeType;

    $("scheduleImportThumb").src = `data:${resized.mimeType};base64,${resized.base64}`;
    $("scheduleImportFileName").textContent = file.name;
    $("scheduleImportFileMeta").textContent =
      `${(resized.bytes / 1024).toFixed(0)} KB sau nén — ${resized.width}×${resized.height}`;
    $("scheduleImportThumbWrap").classList.remove("hidden");
  }

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const mimeType = "image/jpeg";
        const dataUrl = canvas.toDataURL(mimeType, JPEG_QUALITY);
        const base64 = dataUrl.split(",")[1];
        resolve({
          base64,
          mimeType,
          width: w,
          height: h,
          bytes: Math.floor((base64.length * 3) / 4),
        });
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  // ---- Parse call -----------------------------------------------------
  function weekWindow() {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay() + 1); // Monday
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { windowStart: start.toISOString(), windowEnd: end.toISOString() };
  }

  async function parse() {
    if (!state.base64) {
      showStatus("error", "Vui lòng chọn ảnh trước");
      return;
    }
    showStatus("loading", "Đang phân tích ảnh…");
    setButtonsDisabled(true);

    const { windowStart, windowEnd } = weekWindow();
    const res = await window.Utils.makeRequest(
      "/api/ai/parse-schedule-image",
      "POST",
      {
        imageBase64: state.base64,
        mimeType: state.mimeType,
        type: state.type,
        windowStart,
        windowEnd,
        forceLevel: state.level,
      }
    );

    setButtonsDisabled(false);

    if (!res || !res.success) {
      showStatus("error", res?.message || "Phân tích thất bại");
      return;
    }
    state.items = res.data.items || [];
    state.warnings = res.data.warnings || [];
    hideStatus();
    renderItems();
  }

  // ---- Items rendering + edit -----------------------------------------
  function renderItems() {
    const tbody = $("scheduleImportTbody");
    tbody.innerHTML = "";
    state.items.forEach((it, i) => {
      const tr = document.createElement("tr");
      tr.className = "border-t border-slate-100";
      tr.innerHTML = `
        <td class="px-2 py-1"><input data-f="title" class="w-full px-1 py-1 text-xs border border-slate-200 rounded" value="${escapeAttr(it.title || "")}"></td>
        <td class="px-2 py-1"><input data-f="startAt" type="datetime-local" class="w-full px-1 py-1 text-xs border border-slate-200 rounded" value="${toLocal(it.startAt)}"></td>
        <td class="px-2 py-1"><input data-f="endAt" type="datetime-local" class="w-full px-1 py-1 text-xs border border-slate-200 rounded" value="${toLocal(it.endAt)}"></td>
        <td class="px-2 py-1"><input data-f="note" class="w-full px-1 py-1 text-xs border border-slate-200 rounded" value="${escapeAttr(buildDisplayNote(it))}"></td>
        <td class="px-2 py-1 text-right"><button data-del="${i}" class="text-rose-600 text-xs">✕</button></td>
      `;
      tr.querySelectorAll("input").forEach((inp) =>
        inp.addEventListener("input", (e) => {
          const f = e.target.getAttribute("data-f");
          state.items[i][f] =
            f === "startAt" || f === "endAt" ? fromLocal(e.target.value) : e.target.value;
        })
      );
      tr.querySelector("[data-del]").addEventListener("click", () => {
        state.items.splice(i, 1);
        renderItems();
      });
      tbody.appendChild(tr);
    });
    $("scheduleImportCount").textContent = state.items.length;
    $("scheduleImportPreview").classList.remove("hidden");
    $("scheduleImportFooter").classList.toggle("hidden", state.items.length === 0);

    const wrap = $("scheduleImportWarnings");
    if (state.warnings.length) {
      wrap.innerHTML = state.warnings.map((w) => `• ${w}`).join("<br>");
      wrap.classList.remove("hidden");
    } else wrap.classList.add("hidden");
  }

  function addBlankRow() {
    const now = new Date();
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    state.items.push({
      title: "",
      startAt: now.toISOString(),
      endAt: end.toISOString(),
      note: "",
    });
  }

  // ---- Save (additive) ------------------------------------------------
  async function save() {
    if (!state.items.length) return;
    setButtonsDisabled(true);
    showStatus("loading", "Đang lưu…");
    let ok = 0;
    let fail = 0;
    for (const it of state.items) {
      const r = await window.Utils.makeRequest("/api/task-instances", "POST", {
        start_at: it.startAt,
        end_at: it.endAt,
        title: it.title,
        note: buildDisplayNote(it),
      });
      if (r && r.success) ok++;
      else fail++;
    }
    setButtonsDisabled(false);
    showStatus(
      fail ? "error" : "success",
      `Đã lưu ${ok}/${state.items.length} công việc${fail ? ` (${fail} thất bại)` : ""}`
    );
    document.dispatchEvent(new CustomEvent("taskCreated"));
    if (!fail) setTimeout(close, 1200);
  }

  // ---- Apply (priority override) --------------------------------------
  async function applyWithPreview() {
    if (!state.items.length) return;
    const source = state.type === "study" ? "ocr_study" : "ocr_work";
    setButtonsDisabled(true);
    showStatus("loading", "Đang kiểm tra trùng giờ…");
    const dry = await window.Utils.makeRequest("/api/schedule/apply", "POST", {
      source,
      items: state.items,
      dryRun: true,
    });
    setButtonsDisabled(false);
    if (!dry || !dry.success) {
      showStatus("error", dry?.message || "Kiểm tra thất bại");
      return;
    }
    const d = dry.data;
    const ok = confirm(
      `Áp dụng sẽ:\n• Thêm ${d.inserted} công việc mới\n• Xoá ${d.deleted} công việc cũ trùng giờ (ưu tiên thấp hơn)\n• Bỏ qua ${d.skipped} công việc bị chặn bởi lịch ưu tiên cao hơn\n\nTiếp tục?`
    );
    if (!ok) {
      hideStatus();
      return;
    }
    setButtonsDisabled(true);
    showStatus("loading", "Đang áp dụng…");
    const r = await window.Utils.makeRequest("/api/schedule/apply", "POST", {
      source,
      items: state.items,
      dryRun: false,
    });
    setButtonsDisabled(false);
    if (!r || !r.success) {
      showStatus("error", r?.message || "Áp dụng thất bại");
      return;
    }
    showStatus(
      "success",
      `Đã áp dụng: +${r.data.inserted} / -${r.data.deleted} / bỏ qua ${r.data.skipped}`
    );
    document.dispatchEvent(new CustomEvent("taskCreated"));
    setTimeout(close, 1500);
  }

  // ---- Helpers --------------------------------------------------------
  function buildDisplayNote(it) {
    if (it.note && !it.courseCode && !it.campus && !it.location) return it.note;
    const parts = [];
    if (it.courseCode) parts.push(`Mã môn: ${it.courseCode}`);
    if (it.campus) parts.push(`Cơ sở: ${it.campus}`);
    if (it.location) parts.push(`Phòng: ${it.location}`);
    if (it.note) parts.push(it.note);
    return parts.join(" | ");
  }

  function toLocal(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function fromLocal(s) {
    if (!s) return null;
    return new Date(s).toISOString();
  }
  function escapeAttr(s) {
    return String(s ?? "").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function showStatus(kind, msg) {
    const el = $("scheduleImportStatus");
    if (!el) return;
    const styles = {
      loading: "background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe",
      success: "background:#f0fdf4;color:#166534;border:1px solid #bbf7d0",
      error: "background:#fef2f2;color:#991b1b;border:1px solid #fecaca",
    };
    el.style.cssText = styles[kind] || styles.loading;
    el.textContent = msg;
    el.classList.remove("hidden");
  }
  function hideStatus() {
    $("scheduleImportStatus")?.classList.add("hidden");
  }
  function setButtonsDisabled(d) {
    [
      "scheduleImportParseBtn",
      "scheduleImportSaveBtn",
      "scheduleImportApplyBtn",
    ].forEach((id) => {
      const b = $(id);
      if (b) b.disabled = d;
      if (b) b.style.opacity = d ? "0.6" : "1";
    });
  }

  window.ScheduleImageUpload = { open, close, init };
})();
