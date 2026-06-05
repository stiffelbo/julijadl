// =============================
// CONFIG
// =============================

const API_BASE = "./api/babyevents";
const CACHE_KEY = "baby-tracker-cache-v2";
const SETTINGS_KEY = "baby-tracker-settings-v1";

const DEFAULT_SETTINGS = {
  dailyScoopsNorm: 28,
  alarmAfterMinutes: 150,
  alarmSpanMinutes: 15,
};

const TIMER_CLASSES = [
  "timer-before",
  "timer-feeding",
  "timer-overdue",
  "timer-empty",
];

const $ = (id) => document.getElementById(id);


// =============================
// STATE
// =============================

const state = {
  page: "add",
  rows: loadCache(),
  editingId: null,
  settings: loadSettings(),
};


// =============================
// DOM REFERENCES
// =============================

const dom = {
  pages: {
    add: $("page-add"),
    table: $("page-table"),
    settings: $("page-settings"),
  },

  nav: {
    add: $("addNav"),
    table: $("tableNav"),
    settings: $("settingsNav"),
  },

  dashboard: {
    lastFeedingTimer: $("lastFeedingTimer"),
    todayScoops: $("todayScoops"),
  },

  settings: {
    dailyScoopsNorm: $("dailyScoopsNorm"),
    alarmAfterHours: $("alarmAfterHours"),
    alarmAfterMinutes: $("alarmAfterMinutes"),
    saveBtn: $("saveSettingsBtn"),
  },

  table: {
    wrap: $("tableWrap"),
    refreshBtn: $("refreshBtn"),
    clearLocalBtn: $("clearLocalBtn"),
  },

  edit: {
    panel: $("editPanel"),
    value: $("editValue"),
    date: $("editDate"),
    time: $("editTime"),
    saveBtn: $("saveEditBtn"),
    cancelBtn: $("cancelEditBtn"),
  },

  notice: $("notice"),

  quickButtons: document.querySelectorAll("[data-value]"),
};


// =============================
// API
// =============================

const api = {
  async get() {
    return parseResponse(await fetch(`${API_BASE}/get.php`));
  },

  async create(payload) {
    return parseResponse(await fetch(`${API_BASE}/create.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }));
  },

  async update(payload) {
    return parseResponse(await fetch(`${API_BASE}/update.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }));
  },

  async delete(id) {
    return parseResponse(await fetch(`${API_BASE}/delete.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }));
  },
};

async function parseResponse(res) {
  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.success) {
    throw new Error(json?.error || `HTTP ${res.status}`);
  }

  return json;
}


// =============================
// STORAGE
// =============================

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCache() {
  localStorage.setItem(CACHE_KEY, JSON.stringify(state.rows));
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return {
      ...DEFAULT_SETTINGS,
      ...(raw ? JSON.parse(raw) : {}),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}


// =============================
// PURE HELPERS
// =============================

function isFeedingValue(value) {
  return ["1", "2", "3", "4"].includes(String(value));
}

function normalizeRows(rows) {
  return rows.map(row => ({
    id: Number(row.id),
    date: row.date,
    time: normalizeTime(row.time),
    value: String(row.value),
  }));
}

function normalizeTime(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function roundTo10Minutes(time) {
  if (!time) return "";

  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m;
  const rounded = Math.round(total / 10) * 10;

  const hh = String(Math.floor(rounded / 60) % 24).padStart(2, "0");
  const mm = String(rounded % 60).padStart(2, "0");

  return `${hh}:${mm}`;
}

function toDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function toPlDate(value) {
  if (!value || !String(value).includes("-")) return value || "";

  const [y, m, d] = String(value).split("-");
  return `${d}.${m}.${y}`;
}

function getRowDateTime(row) {
  return new Date(`${row.date}T${normalizeTime(row.time)}:00`);
}

function getLastFeeding(rows) {
  return rows
    .filter(row => isFeedingValue(row.value))
    .sort((a, b) => getRowDateTime(b) - getRowDateTime(a))[0] || null;
}

function getTodayScoops(rows, date = new Date()) {
  const today = toDateInputValue(date);

  return rows
    .filter(row => row.date === today && isFeedingValue(row.value))
    .reduce((sum, row) => sum + Number(row.value), 0);
}

function getTimerStatus(lastFeeding, settings, now = new Date()) {
  if (!lastFeeding) return "empty";

  const lastTime = getRowDateTime(lastFeeding).getTime();
  const alarmTime = lastTime + settings.alarmAfterMinutes * 60000;
  const span = settings.alarmSpanMinutes * 60000;

  const feedingStart = alarmTime - span;
  const feedingEnd = alarmTime + span;
  const nowTime = now.getTime();

  if (nowTime > feedingEnd) return "overdue";
  if (nowTime >= feedingStart && nowTime <= feedingEnd) return "feeding";

  return "before";
}

function formatDuration(ms) {
  if (ms < 0) ms = 0;

  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function nowPayload(value) {
  const d = new Date();

  return {
    date: toDateInputValue(d),
    time: d.toTimeString().slice(0, 5),
    value: String(value),
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// =============================
// RENDER
// =============================

function renderApp() {
  renderDashboard();

  if (state.page === "table") {
    renderTable();
  }

  if (state.page === "settings") {
    renderSettings();
  }
}

function renderDashboard() {
  const timerEl = dom.dashboard.lastFeedingTimer;
  const scoopsEl = dom.dashboard.todayScoops;

  const last = getLastFeeding(state.rows);
  const status = getTimerStatus(last, state.settings);

  if (timerEl) {
    timerEl.classList.remove(...TIMER_CLASSES);
    timerEl.classList.add(`timer-${status}`);

    timerEl.textContent = last
      ? formatDuration(Date.now() - getRowDateTime(last).getTime())
      : "Brak karmienia";
  }

  if (scoopsEl) {
    scoopsEl.textContent = `${getTodayScoops(state.rows)} / ${state.settings.dailyScoopsNorm}`;
  }
}

function renderSettings() {
  dom.settings.dailyScoopsNorm.value = state.settings.dailyScoopsNorm;

  const h = Math.floor(state.settings.alarmAfterMinutes / 60);
  const m = state.settings.alarmAfterMinutes % 60;

  dom.settings.alarmAfterHours.value = h;
  dom.settings.alarmAfterMinutes.value = m;
}

function renderTable() {
  const wrap = dom.table.wrap;

  if (!state.rows.length) {
    wrap.innerHTML = `<div class="empty">Brak zapisów.</div>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>Godzina</th>
          <th>Wartość</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${state.rows.map(row => `
          <tr>
            <td>${escapeHtml(toPlDate(row.date))}</td>
            <td>${escapeHtml(normalizeTime(row.time))}</td>
            <td class="value">${escapeHtml(String(row.value))}</td>
            <td class="actions">
              <button class="icon-btn" data-edit="${escapeHtml(row.id)}" title="Edytuj">✏️</button>
              <button class="icon-btn danger" data-delete="${escapeHtml(row.id)}" title="Usuń">🗑️</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  wrap.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => startEdit(Number(btn.dataset.edit)));
  });

  wrap.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", () => deleteRow(Number(btn.dataset.delete)));
  });
}

function showNotice(text, error = false) {
  const n = dom.notice;

  n.textContent = text;
  n.classList.toggle("error", error);
  n.classList.add("show");

  clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(() => n.classList.remove("show"), 1600);
}


// =============================
// PAGE ACTIONS
// =============================

function setPage(page) {
  state.page = page;

  dom.pages.add.classList.toggle("active", page === "add");
  dom.pages.table.classList.toggle("active", page === "table");
  dom.pages.settings.classList.toggle("active", page === "settings");

  dom.nav.add.classList.toggle("active", page === "add");
  dom.nav.table.classList.toggle("active", page === "table");
  dom.nav.settings.classList.toggle("active", page === "settings");

  if (page === "table") {
    loadRemote();
  }

  renderApp();
}


// =============================
// DATA ACTIONS
// =============================

async function loadRemote() {
  try {
    const result = await api.get();
    state.rows = normalizeRows(result.data || []);
    saveCache();
    renderApp();
  } catch (err) {
    renderApp();
    showNotice(`Offline/cache: ${err.message}`, true);
  }
}

async function addValue(value) {
  const payload = nowPayload(value);

  try {
    const result = await api.create(payload);

    state.rows.unshift({
      id: Number(result.id),
      ...payload,
    });

    saveCache();
    showNotice(`Zapisano: ${value}`);
    renderApp();
  } catch (err) {
    showNotice(`Błąd zapisu: ${err.message}`, true);
  }
}

async function deleteRow(id) {
  if (!confirm("Usunąć ten zapis?")) return;

  try {
    await api.delete(id);

    state.rows = state.rows.filter(row => Number(row.id) !== Number(id));

    if (state.editingId === id) {
      cancelEdit();
    }

    saveCache();
    renderApp();
  } catch (err) {
    alert(`Błąd usuwania: ${err.message}`);
  }
}

function clearLocalCache() {
  localStorage.removeItem(CACHE_KEY);
  state.rows = [];
  renderApp();
}


// =============================
// EDIT ACTIONS
// =============================

function startEdit(id) {
  const row = state.rows.find(r => Number(r.id) === Number(id));
  if (!row) return;

  state.editingId = Number(id);

  dom.edit.value.value = String(row.value);
  dom.edit.date.value = row.date;
  dom.edit.time.value = normalizeTime(row.time);

  dom.edit.panel.classList.add("active");
  dom.edit.panel.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function cancelEdit() {
  state.editingId = null;
  dom.edit.panel.classList.remove("active");
}

async function saveEdit() {
  if (!state.editingId) return;

  const id = state.editingId;

  const payload = {
    id,
    value: dom.edit.value.value,
    date: dom.edit.date.value,
    time: roundTo10Minutes(dom.edit.time.value),
  };

  if (!payload.date || !payload.time || !payload.value) {
    alert("Uzupełnij wartość, datę i godzinę.");
    return;
  }

  try {
    await api.update(payload);

    const index = state.rows.findIndex(r => Number(r.id) === Number(id));

    if (index >= 0) {
      state.rows[index] = payload;
    }

    saveCache();
    cancelEdit();
    renderApp();
  } catch (err) {
    alert(`Błąd zapisu: ${err.message}`);
  }
}


// =============================
// SETTINGS ACTIONS
// =============================

function saveSettingsFromForm() {
  const hours = Number(dom.settings.alarmAfterHours.value || 0);
  const minutes = Number(dom.settings.alarmAfterMinutes.value || 0);

  state.settings = {
    ...state.settings,
    dailyScoopsNorm: Number(dom.settings.dailyScoopsNorm.value || DEFAULT_SETTINGS.dailyScoopsNorm),
    alarmAfterMinutes: hours * 60 + minutes,
  };

  saveSettings();
  showNotice("Zapisano ustawienia");
  renderApp();
}


// =============================
// EVENTS
// =============================

function bindEvents() {
  dom.quickButtons.forEach(btn => {
    btn.addEventListener("click", () => addValue(btn.dataset.value));
  });

  dom.nav.add.addEventListener("click", () => setPage("add"));
  dom.nav.table.addEventListener("click", () => setPage("table"));
  dom.nav.settings.addEventListener("click", () => setPage("settings"));

  dom.table.refreshBtn.addEventListener("click", loadRemote);
  dom.table.clearLocalBtn.addEventListener("click", clearLocalCache);

  dom.edit.saveBtn.addEventListener("click", saveEdit);
  dom.edit.cancelBtn.addEventListener("click", cancelEdit);

  dom.settings.saveBtn.addEventListener("click", saveSettingsFromForm);
}


// =============================
// PWA
// =============================

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}


// =============================
// INIT
// =============================

function init() {
  bindEvents();
  registerServiceWorker();

  renderApp();
  renderTable();
  loadRemote();

  setInterval(renderDashboard, 3000);
}

init();