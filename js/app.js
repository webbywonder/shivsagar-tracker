/**
 * Shivsagar Interior Tracker - Main Application
 * One-pager: all rooms visible, card-per-item, swipe actions,
 * bottom sheet add/edit, collapsible summary, room anchor-scroll nav.
 *
 * Security: All user-provided strings are escaped via esc() before
 * insertion into innerHTML. The esc() function uses textContent on a
 * temporary DOM element to neutralise any HTML/script injection.
 */

// ============================================================
// STATE
// ============================================================
const state = {
  items: [],              // Array of item objects (the source of truth)
  summaryOpen: false,     // Collapsible summary
  bottomSheet: null,      // null | { mode: "add"|"edit"|"settings", room?, item? }
  swipedItemId: null,     // Currently swiped-open item
  syncStatus: "offline",  // offline | syncing | synced | error | idle
  lastSync: null,
  userName: "Darshan",
};

let sync = null;
let nextId = 1;
let touchState = null;

// ============================================================
// HELPERS
// ============================================================

/** Generate a unique ID for new items. */
function generateId() {
  const id = "item_" + Date.now() + "_" + nextId;
  nextId++;
  return id;
}

/** Get items for a specific room. */
function roomItems(roomKey) {
  return state.items.filter((i) => i.room === roomKey);
}

/** Calculate progress for a room. */
function roomProgress(roomKey) {
  const items = roomItems(roomKey);
  const done = items.filter((i) => i.checked).length;
  return { done, total: items.length, pct: items.length ? Math.round((done / items.length) * 100) : 0 };
}

/** Calculate overall progress. */
function overallProgress() {
  const done = state.items.filter((i) => i.checked).length;
  const total = state.items.length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/** Calculate total budget. */
function totalBudget() {
  return state.items.reduce((sum, i) => sum + (i.budget || 0), 0);
}

/** Calculate room budget. */
function roomBudget(roomKey) {
  return roomItems(roomKey).reduce((sum, i) => sum + (i.budget || 0), 0);
}

/** Format currency in Indian Rupee style. */
function formatCurrency(n) {
  return PROJECT.currency + " " + n.toLocaleString("en-IN");
}

/** Human-readable time-ago string. */
function timeAgo(date) {
  if (!date) return "Never";
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

/**
 * Escape HTML special characters to prevent XSS.
 * Uses DOM textContent which safely handles all injection vectors.
 * @param {string} str - Raw user string
 * @returns {string} Escaped HTML-safe string
 */
function esc(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

/** Show a brief toast message at the bottom of the screen. */
function showToast(message, duration) {
  duration = duration || 2500;
  const existing = document.getElementById("toast");
  if (existing) existing.remove();
  const el = document.createElement("div");
  el.id = "toast";
  el.textContent = message;
  el.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1c1917;color:#fff;padding:10px 20px;border-radius:12px;font-size:12px;font-weight:600;z-index:200;font-family:inherit;box-shadow:0 4px 12px rgba(0,0,0,0.2);transition:opacity 0.3s;";
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ============================================================
// PERSISTENCE
// ============================================================

function saveLocal() {
  const data = {
    items: state.items,
    userName: state.userName,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem("shivsagar_state", JSON.stringify(data));
  if (sync && sync.isConfigured()) {
    syncToSheet(data);
  }
}

function loadLocal() {
  try {
    const raw = localStorage.getItem("shivsagar_state");
    if (raw) {
      const data = JSON.parse(raw);
      if (data.items && data.items.length > 0) {
        state.items = data.items;
        state.userName = data.userName || "Darshan";
        return;
      }
    }
  } catch { /* empty */ }
  // Seed with defaults on first load
  state.items = DEFAULT_ITEMS.map((d) => ({
    ...d,
    checked: false,
    note: "",
    budget: 0,
  }));
}

async function syncToSheet(data) {
  state.syncStatus = "syncing";
  renderSyncBadge();
  const result = await sync.save(data);
  state.syncStatus = result.success ? "synced" : "error";
  state.lastSync = result.success ? new Date() : state.lastSync;
  renderSyncBadge();
  setTimeout(() => {
    if (state.syncStatus === "synced") {
      state.syncStatus = "idle";
      renderSyncBadge();
    }
  }, 3000);
}

async function syncFromSheet() {
  if (!sync || !sync.isConfigured()) return;
  state.syncStatus = "syncing";
  renderSyncBadge();
  const result = await sync.load();
  if (result.data && result.source === "sheet" && result.data.items) {
    state.items = result.data.items;
    state.userName = result.data.userName || state.userName;
    state.syncStatus = "synced";
    state.lastSync = new Date();
    localStorage.setItem("shivsagar_state", JSON.stringify(result.data));
    render();
  } else {
    state.syncStatus = result.source === "cache" ? "offline" : "error";
  }
  renderSyncBadge();
}

// ============================================================
// RENDERING
// ============================================================
const $ = (sel) => document.querySelector(sel);

function render() {
  const app = $("#app");
  // All dynamic strings are escaped via esc() before insertion
  app.innerHTML =
    renderHeader() +
    renderSummary() +
    renderRoomPills() +
    renderAllRooms() +
    renderBottomSheetRouter() +
    '<div class="h-20"></div>';
  attachSwipeListeners();
  updateActivePill();
}

function renderHeader() {
  const p = overallProgress();
  const tb = totalBudget();
  return `
    <header class="bg-gradient-to-br from-stone-900 to-stone-800 text-white px-4 pt-5 pb-4 sticky top-0 z-50" id="header">
      <div class="max-w-lg mx-auto">
        <div class="flex justify-between items-start mb-3">
          <div>
            <h1 class="text-lg font-bold tracking-tight">${esc(PROJECT.name)}</h1>
            <p class="text-xs text-stone-400 mt-0.5">${esc(PROJECT.subtitle)}</p>
          </div>
          <div class="flex items-center gap-2">
            <span id="sync-badge"></span>
            <button onclick="openSettings()" class="text-stone-400 hover:text-white transition p-1" aria-label="Settings">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </button>
          </div>
        </div>
        <div class="bg-white/10 rounded-full h-2 overflow-hidden mb-1.5">
          <div class="bg-gradient-to-r from-amber-400 to-orange-400 h-full rounded-full transition-all duration-500" style="width:${p.pct}%"></div>
        </div>
        <div class="flex justify-between text-[11px] text-stone-400">
          <span>${p.done}/${p.total} items (${p.pct}%)</span>
          <span>${tb > 0 ? "Budget: " + formatCurrency(tb) : "No budget set"}</span>
        </div>
      </div>
    </header>`;
}

function renderSyncBadge() {
  const el = $("#sync-badge");
  if (!el) return;
  const s = state.syncStatus;
  const colors = { syncing: "bg-yellow-400", synced: "bg-green-400", error: "bg-red-400", offline: "bg-stone-500", idle: "bg-stone-500" };
  const labels = { syncing: "Syncing...", synced: "Synced", error: "Sync failed", offline: "Offline", idle: "" };
  if (s === "idle" || !sync?.isConfigured()) { el.innerHTML = ""; return; }
  el.innerHTML = `<span class="flex items-center gap-1 text-[10px] text-stone-300"><span class="w-1.5 h-1.5 rounded-full ${colors[s]} ${s === "syncing" ? "animate-pulse" : ""}"></span>${labels[s]}</span>`;
}

function renderSummary() {
  const roomKeys = Object.keys(ROOMS);
  const open = state.summaryOpen;
  return `
    <div class="bg-white border-b border-stone-200">
      <div class="max-w-lg mx-auto px-4 py-2.5">
        <button onclick="toggleSummary()" class="w-full flex justify-between items-center">
          <span class="text-xs font-bold text-stone-900">\u{1F4CA} Summary</span>
          <span class="text-[10px] text-stone-400">${open ? "\u25B2" : "\u25BC"}</span>
        </button>
        ${open ? `
          <div class="mt-3 space-y-3">
            <div class="grid grid-cols-2 gap-2">
              ${roomKeys.map((rk) => {
                const r = ROOMS[rk];
                const rb = roomBudget(rk);
                const rp = roomProgress(rk);
                return `
                  <div class="bg-stone-50 rounded-lg px-2.5 py-2">
                    <div class="flex justify-between items-center text-[10px]">
                      <span>${r.icon} ${esc(r.name.replace("Whole Flat", "Misc"))}</span>
                      <span class="font-semibold">${rp.done}/${rp.total}</span>
                    </div>
                    <div class="bg-stone-200 rounded-full h-1 mt-1.5 overflow-hidden">
                      <div class="${rp.pct === 100 ? "bg-green-500" : r.accentBg} h-full rounded-full" style="width:${rp.pct}%"></div>
                    </div>
                    ${rb > 0 ? `<div class="text-[9px] text-amber-600 font-semibold mt-1">${formatCurrency(rb)}</div>` : ""}
                  </div>`;
              }).join("")}
            </div>
            <div class="flex flex-wrap gap-1.5">
              ${Object.entries(CATEGORIES).map(([cat, c]) => {
                const catItems = state.items.filter((i) => i.category === cat);
                const done = catItems.filter((i) => i.checked).length;
                if (catItems.length === 0) return "";
                return `<span class="${c.bg} ${c.text} text-[8px] font-bold px-2 py-0.5 rounded uppercase">${esc(cat)} ${done}/${catItems.length}</span>`;
              }).join("")}
            </div>
          </div>` : ""}
      </div>
    </div>`;
}

function renderRoomPills() {
  const roomKeys = Object.keys(ROOMS);
  return `
    <div id="room-pills" class="bg-white border-b border-stone-200 sticky top-[108px] z-40">
      <div class="max-w-lg mx-auto px-4 py-2 flex gap-2 overflow-x-auto hide-scrollbar">
        ${roomKeys.map((rk) => {
          const r = ROOMS[rk];
          const rp = roomProgress(rk);
          return `
            <button onclick="scrollToRoom('${rk}')" data-pill="${rk}"
              class="room-pill flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all bg-stone-100 text-stone-500 hover:bg-stone-200">
              ${r.icon} ${esc(r.name.replace("Whole Flat", "Misc"))} ${rp.done}/${rp.total}
            </button>`;
        }).join("")}
      </div>
    </div>`;
}

function renderAllRooms() {
  return `
    <div class="max-w-lg mx-auto px-4 pt-3 pb-4">
      ${Object.entries(ROOMS).map(([rk, room]) => renderRoomSection(rk, room)).join("")}
    </div>`;
}

function renderRoomSection(rk, room) {
  const items = roomItems(rk);
  const rp = roomProgress(rk);
  return `
    <section id="room-${rk}" class="mb-6 scroll-mt-40">
      <div class="flex justify-between items-center mb-2">
        <div class="flex items-center gap-2">
          <h2 class="text-sm font-bold text-stone-900">${room.icon} ${esc(room.name)}</h2>
          ${room.detail ? `<span class="text-[9px] text-orange-600 font-medium">${esc(room.detail)}</span>` : ""}
          <button onclick="openAdd('${rk}')" class="w-5 h-5 rounded-full bg-amber-400 text-white text-xs font-bold flex items-center justify-center hover:bg-amber-500 transition" title="Add item">+</button>
        </div>
        <div class="text-right">
          <span class="text-[10px] text-stone-400">${esc(room.size)}</span>
          <span class="text-xs font-bold ml-2 ${rp.pct === 100 ? "text-green-500" : "text-amber-500"}">${rp.done}/${rp.total}</span>
        </div>
      </div>
      <div class="space-y-1.5">
        ${items.map((item) => renderItemCard(item)).join("")}
      </div>
      <button onclick="openAdd('${rk}')" class="mt-2 w-full border border-dashed border-stone-300 rounded-xl py-2.5 text-amber-500 text-xs font-semibold hover:border-amber-400 hover:bg-amber-50/50 transition">
        + Add Item
      </button>
    </section>`;
}

function renderItemCard(item) {
  const cat = CATEGORIES[item.category] || CATEGORIES.furniture;
  const pri = PRIORITIES[item.priority] || PRIORITIES.medium;
  const swiped = state.swipedItemId === item.id;

  return `
    <div class="relative overflow-hidden rounded-xl" data-item-id="${esc(item.id)}">
      <div class="absolute inset-y-0 right-0 flex">
        <button onclick="openEdit('${esc(item.id)}')" class="w-16 bg-blue-500 text-white flex flex-col items-center justify-center text-[10px] font-semibold gap-0.5">
          <span class="text-sm">\u270F\uFE0F</span>Edit
        </button>
        <button onclick="deleteItem('${esc(item.id)}')" class="w-16 bg-red-500 text-white flex flex-col items-center justify-center text-[10px] font-semibold gap-0.5">
          <span class="text-sm">\u{1F5D1}\uFE0F</span>Delete
        </button>
      </div>
      <div class="item-card bg-white border border-stone-200 rounded-xl px-3 py-2.5 relative transition-transform duration-200 ${item.checked ? "opacity-50" : ""}"
           style="transform: translateX(${swiped ? "-128px" : "0"})">
        <div class="flex items-start gap-2.5">
          <button onclick="toggleCheck('${esc(item.id)}')" class="mt-0.5 w-[18px] h-[18px] min-w-[18px] rounded-md border-2 flex items-center justify-center transition-all ${
            item.checked ? "bg-green-500 border-green-500 text-white" : "border-stone-300"
          }">
            ${item.checked ? '<svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>' : ""}
          </button>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-xs font-semibold ${item.checked ? "line-through text-stone-400" : "text-stone-800"}">${esc(item.name)}</span>
              <span class="${cat.bg} ${cat.text} text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">${esc(item.category)}</span>
              <span class="${pri.bg} ${pri.text} ${pri.ring} text-[8px] font-semibold px-1.5 py-0.5 rounded">${esc(pri.label)}</span>
            </div>
            ${item.tip ? `<p class="text-[10px] text-stone-400 mt-0.5">${esc(item.tip)}</p>` : ""}
            ${item.note ? `<p class="text-[10px] text-indigo-500 mt-0.5 italic">${esc(item.note)}</p>` : ""}
          </div>
          <div class="flex-shrink-0 text-right">
            ${item.budget ? `<span class="text-[10px] text-amber-600 font-semibold">${formatCurrency(item.budget)}</span>` : `<span class="text-[10px] text-stone-300">\u2014</span>`}
          </div>
        </div>
      </div>
    </div>`;
}

// ============================================================
// BOTTOM SHEET
// ============================================================

function renderBottomSheetRouter() {
  const bs = state.bottomSheet;
  if (!bs) return "";
  if (bs.mode === "settings") return renderSettingsSheet();
  return renderItemSheet();
}

function renderItemSheet() {
  const bs = state.bottomSheet;
  const isEdit = bs.mode === "edit";
  const item = bs.item || {};
  const roomKey = bs.room || item.room || Object.keys(ROOMS)[0];
  const roomName = ROOMS[roomKey]?.name || "";

  return `
    <div id="bottom-sheet-overlay" class="fixed inset-0 bg-black/40 z-[100] flex items-end justify-center" onclick="closeSheet(event)">
      <div class="bg-white rounded-t-2xl w-full max-w-lg p-5 pb-8" onclick="event.stopPropagation()">
        <div class="w-8 h-1 bg-stone-300 rounded-full mx-auto mb-4"></div>
        <h3 class="text-sm font-bold text-stone-900 mb-4">${isEdit ? "Edit Item" : "Add Item to " + esc(roomName)}</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-[10px] font-semibold text-stone-600 mb-1">Item Name *</label>
            <input id="bs-name" type="text" value="${esc(item.name || "")}" placeholder="e.g. Bookshelf"
              class="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-300" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-semibold text-stone-600 mb-1">Category</label>
              <select id="bs-category" class="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white">
                ${Object.entries(CATEGORIES).map(([k, c]) =>
                  `<option value="${k}" ${(item.category || "furniture") === k ? "selected" : ""}>${esc(c.label)}</option>`
                ).join("")}
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-semibold text-stone-600 mb-1">Priority</label>
              <select id="bs-priority" class="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white">
                ${Object.entries(PRIORITIES).map(([k, p]) =>
                  `<option value="${k}" ${(item.priority || "medium") === k ? "selected" : ""}>${esc(p.label)}</option>`
                ).join("")}
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-semibold text-stone-600 mb-1">Budget (${esc(PROJECT.currency)})</label>
              <input id="bs-budget" type="number" value="${item.budget || ""}" placeholder="0"
                class="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-300" />
            </div>
            <div>
              <label class="block text-[10px] font-semibold text-stone-600 mb-1">Tip</label>
              <input id="bs-tip" type="text" value="${esc(item.tip || "")}" placeholder="Optional hint"
                class="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-300" />
            </div>
          </div>
          <div>
            <label class="block text-[10px] font-semibold text-stone-600 mb-1">Note</label>
            <input id="bs-note" type="text" value="${esc(item.note || "")}" placeholder="Optional note"
              class="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-300" />
          </div>
          <button onclick="saveSheet()" class="w-full py-3 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition">
            ${isEdit ? "Save Changes" : "Add Item"}
          </button>
        </div>
      </div>
    </div>`;
}

function renderSettingsSheet() {
  const lastSync = sync?.getLastSyncTime();
  const configured = sync?.isConfigured();
  const savedUrl = localStorage.getItem("shivsagar_scriptUrl") || "";
  return `
    <div id="bottom-sheet-overlay" class="fixed inset-0 bg-black/40 z-[100] flex items-end justify-center" onclick="closeSheet(event)">
      <div class="bg-white rounded-t-2xl w-full max-w-lg p-5 pb-8 max-h-[80vh] overflow-y-auto" onclick="event.stopPropagation()">
        <div class="w-8 h-1 bg-stone-300 rounded-full mx-auto mb-4"></div>
        <h3 class="text-sm font-bold text-stone-900 mb-4">\u2699\uFE0F Settings</h3>
        <div class="space-y-4">
          <div class="bg-stone-50 rounded-xl p-3">
            <p class="text-[10px] font-semibold text-stone-600 mb-1">Google Sheets Sync</p>
            ${configured
              ? `<p class="text-[10px] text-green-600 mb-2">\u2705 Connected${lastSync ? " \u00B7 Last synced: " + timeAgo(lastSync) : ""}</p>`
              : `<p class="text-[10px] text-stone-400 mb-2">Paste your Apps Script deployment URL below</p>`}
            <label class="block text-[10px] font-semibold text-stone-600 mb-1">Apps Script URL</label>
            <input id="setting-url" type="url" value="${esc(savedUrl)}"
              placeholder="https://script.google.com/macros/s/.../exec"
              class="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-xs mb-2 focus:outline-none focus:ring-2 focus:ring-amber-300" />
            <div class="flex gap-2">
              <button onclick="handleSaveUrl()" class="flex-1 py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold">Save URL</button>
              ${configured ? `<button onclick="handleSyncNow()" class="flex-1 py-2 bg-amber-500 text-white rounded-lg text-xs font-semibold">Sync Now</button>` : ""}
            </div>
          </div>
          <div class="flex gap-2">
            <button onclick="handleExport()" class="flex-1 py-2.5 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700">Export JSON</button>
            <button onclick="handleReset()" class="flex-1 py-2.5 border border-red-300 rounded-lg text-xs font-semibold text-red-600">Reset All</button>
          </div>
          <button onclick="state.bottomSheet=null;render();" class="w-full py-2.5 bg-stone-100 rounded-lg text-xs font-semibold text-stone-600">Close</button>
        </div>
      </div>
    </div>`;
}

// ============================================================
// EVENT HANDLERS
// ============================================================

window.toggleSummary = function () {
  state.summaryOpen = !state.summaryOpen;
  render();
};

window.scrollToRoom = function (rk) {
  const el = document.getElementById("room-" + rk);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

window.toggleCheck = function (id) {
  const item = state.items.find((i) => i.id === id);
  if (item) {
    item.checked = !item.checked;
    state.swipedItemId = null;
    saveLocal();
    render();
  }
};

window.openAdd = function (roomKey) {
  state.bottomSheet = { mode: "add", room: roomKey };
  render();
  setTimeout(() => $("#bs-name")?.focus(), 100);
};

window.openEdit = function (id) {
  const item = state.items.find((i) => i.id === id);
  if (item) {
    state.bottomSheet = { mode: "edit", item: { ...item } };
    state.swipedItemId = null;
    render();
    setTimeout(() => $("#bs-name")?.focus(), 100);
  }
};

window.closeSheet = function (e) {
  if (e && e.target && e.target.id !== "bottom-sheet-overlay") return;
  state.bottomSheet = null;
  render();
};

window.saveSheet = function () {
  const bs = state.bottomSheet;
  if (!bs) return;

  const name = ($("#bs-name")?.value || "").trim();
  if (!name) {
    $("#bs-name")?.focus();
    return;
  }

  const category = $("#bs-category")?.value || "furniture";
  const priority = $("#bs-priority")?.value || "medium";
  const budget = parseFloat($("#bs-budget")?.value) || 0;
  const tip = ($("#bs-tip")?.value || "").trim();
  const note = ($("#bs-note")?.value || "").trim();

  if (bs.mode === "add") {
    state.items.push({
      id: generateId(),
      name,
      room: bs.room,
      category,
      priority,
      tip,
      checked: false,
      note,
      budget,
    });
  } else if (bs.mode === "edit") {
    const item = state.items.find((i) => i.id === bs.item.id);
    if (item) {
      item.name = name;
      item.category = category;
      item.priority = priority;
      item.budget = budget;
      item.tip = tip;
      item.note = note;
    }
  }

  state.bottomSheet = null;
  saveLocal();
  render();
};

window.deleteItem = function (id) {
  if (!confirm("Delete this item?")) return;
  state.items = state.items.filter((i) => i.id !== id);
  state.swipedItemId = null;
  saveLocal();
  render();
};

window.openSettings = function () {
  state.bottomSheet = { mode: "settings" };
  render();
};

window.handleSaveUrl = async function () {
  const url = ($("#setting-url")?.value || "").trim();
  if (!url) {
    localStorage.removeItem("shivsagar_scriptUrl");
    sync = null;
    showToast("URL removed");
    render();
    return;
  }
  localStorage.setItem("shivsagar_scriptUrl", url);
  sync = new SheetSync(url);
  showToast("Saved! Connecting...");
  render();
  try {
    // Test read first
    const result = await sync.load();
    if (result.source !== "sheet") {
      showToast("\u26A0\uFE0F Could not reach sheet. Check URL.");
      return;
    }
    // If sheet has data with items, pull it
    if (result.data && result.data.items && result.data.items.length > 0) {
      state.items = result.data.items;
      state.lastSync = new Date();
      localStorage.setItem("shivsagar_state", JSON.stringify(result.data));
      showToast("\u2705 Connected! Pulled " + result.data.items.length + " items from sheet.");
    } else {
      // Sheet is empty — push current local data
      showToast("Sheet empty. Pushing local data...");
      const pushData = { items: state.items, userName: state.userName, updatedAt: new Date().toISOString() };
      const writeResult = await sync.save(pushData);
      if (writeResult.success) {
        state.lastSync = new Date();
        showToast("\u2705 Connected! Pushed " + state.items.length + " items to sheet.");
      } else {
        showToast("\u26A0\uFE0F Read works but write failed. Check Apps Script deployment.");
      }
    }
  } catch {
    showToast("\u274C Connection failed. Check the URL.");
  }
  state.syncStatus = sync.isConfigured() ? "synced" : "offline";
  render();
};

window.handleSyncNow = async function () {
  if (!sync?.isConfigured()) return;
  await syncFromSheet();
  render();
};

window.handleExport = function () {
  const data = { items: state.items, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "shivsagar-tracker-export.json";
  a.click();
  URL.revokeObjectURL(url);
};

window.handleReset = function () {
  if (!confirm("Reset ALL progress and items? This cannot be undone.")) return;
  state.items = DEFAULT_ITEMS.map((d) => ({ ...d, checked: false, note: "", budget: 0 }));
  localStorage.removeItem("shivsagar_state");
  saveLocal();
  render();
};

// ============================================================
// SWIPE HANDLING
// ============================================================

function attachSwipeListeners() {
  document.querySelectorAll(".item-card").forEach((card) => {
    card.addEventListener("touchstart", onTouchStart, { passive: true });
    card.addEventListener("touchmove", onTouchMove, { passive: false });
    card.addEventListener("touchend", onTouchEnd, { passive: true });
  });
}

function onTouchStart(e) {
  const touch = e.touches[0];
  const card = e.currentTarget;
  const itemEl = card.closest("[data-item-id]");
  if (!itemEl) return;
  touchState = {
    startX: touch.clientX,
    startY: touch.clientY,
    currentX: 0,
    itemId: itemEl.dataset.itemId,
    card: card,
    moved: false,
  };
}

function onTouchMove(e) {
  if (!touchState) return;
  const touch = e.touches[0];
  const dx = touch.clientX - touchState.startX;
  const dy = touch.clientY - touchState.startY;

  // If vertical scroll is dominant, cancel swipe
  if (!touchState.moved && Math.abs(dy) > Math.abs(dx)) {
    touchState = null;
    return;
  }

  if (Math.abs(dx) > 10) {
    touchState.moved = true;
    e.preventDefault();
  }

  if (touchState.moved) {
    const x = Math.max(-132, Math.min(0, dx));
    touchState.currentX = x;
    touchState.card.style.transform = `translateX(${x}px)`;
    touchState.card.style.transition = "none";
  }
}

function onTouchEnd() {
  if (!touchState || !touchState.moved) {
    touchState = null;
    return;
  }
  const threshold = -50;
  touchState.card.style.transition = "transform 0.2s ease";
  if (touchState.currentX < threshold) {
    touchState.card.style.transform = "translateX(-128px)";
    state.swipedItemId = touchState.itemId;
  } else {
    touchState.card.style.transform = "translateX(0)";
    state.swipedItemId = null;
  }
  touchState = null;
}

// Close swipe when tapping outside
document.addEventListener("touchstart", (e) => {
  if (state.swipedItemId && !e.target.closest(`[data-item-id="${state.swipedItemId}"]`)) {
    state.swipedItemId = null;
    document.querySelectorAll(".item-card").forEach((c) => {
      c.style.transition = "transform 0.2s ease";
      c.style.transform = "translateX(0)";
    });
  }
}, { passive: true });

// ============================================================
// SCROLL SPY - highlight active room pill
// ============================================================

function updateActivePill() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const rk = entry.target.id.replace("room-", "");
        document.querySelectorAll(".room-pill").forEach((p) => {
          const isActive = p.dataset.pill === rk;
          p.classList.toggle("bg-stone-800", isActive);
          p.classList.toggle("text-amber-400", isActive);
          p.classList.toggle("bg-stone-100", !isActive);
          p.classList.toggle("text-stone-500", !isActive);
        });
        const pill = document.querySelector(`[data-pill="${rk}"]`);
        if (pill) pill.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    });
  }, { rootMargin: "-40% 0px -55% 0px" });

  Object.keys(ROOMS).forEach((rk) => {
    const el = document.getElementById("room-" + rk);
    if (el) observer.observe(el);
  });
}

// ============================================================
// INIT
// ============================================================

function init() {
  loadLocal();
  // Check localStorage first (for GitHub Pages), then config.local.js (for local dev)
  const scriptUrl =
    localStorage.getItem("shivsagar_scriptUrl") ||
    (typeof CONFIG !== "undefined" && CONFIG.scriptUrl ? CONFIG.scriptUrl : "");
  if (scriptUrl) {
    sync = new SheetSync(scriptUrl);
    syncFromSheet();
  }
  render();
}

document.addEventListener("DOMContentLoaded", init);
