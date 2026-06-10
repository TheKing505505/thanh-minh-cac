/**
 * admin.js – Thanh Minh Các · Logic quản trị (Admin Panel)
 * Tách biệt hoàn toàn với app.js
 * Mọi thao tác ghi đều kiểm tra UID admin trước khi thực thi
 * Import Firebase v10 Modular SDK
 */

import { db, auth } from "./firebase-config.js";
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
// =========================================================================
// CODE BẢO MẬT ADMIN FIX ĐƠ: AN TOÀN TUYỆT ĐỐI - TÍNH NĂNG MƯỢT MÀ
// =========================================================================
// Đợi HTML load xong hoàn toàn rồi mới kiểm tra quyền
document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    const ADMIN_UID = "dZ1j9g4vVcSDlGDtRIEkQlY7Vbt1";
    
    if (!user || user.uid !== ADMIN_UID) {
      // Hacker: Bị trục xuất thẳng cánh
      window.location.href = "index.html";
    } else {
      // Admin thật: Gỡ bỏ lệnh ẩn của CSS, mọi tính năng nút bấm giữ nguyên 100%
      document.body.style.setProperty("display", "block", "important");
      console.log("Welcome Admin! Thần thức hoạt động, nút bấm mượt mà.");
    }
  });
});
// =========================================================================
// =========================================================================
// =========================================================================
// ============================================================
// ===== HẰNG SỐ =============================================
// ============================================================

// UID admin – phải khớp với Firebase Auth Console
// ⚠️  Thay bằng UID thật sau khi tạo tài khoản admin lần đầu
const ADMIN_UID = "dZ1j9g4vVcSDlGDtRIEkQlY7Vbt1";

const TITLE_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

const TITLES = [
  { id:"luyen-khi",  name:"Luyện Khí",   price:0,      cls:"dh-luyen-khi",  icon:"🟦", permanent:true,  free:true,   adminOnly:false },
  { id:"truc-co",    name:"Trúc Cơ",     price:9900,   cls:"dh-truc-co",    icon:"🟩", adminOnly:false },
  { id:"kim-dan",    name:"Kim Đan",     price:19900,  cls:"dh-kim-dan",    icon:"🟧", adminOnly:false },
  { id:"nguyen-anh", name:"Nguyên Anh",  price:29900,  cls:"dh-nguyen-anh", icon:"🟪", adminOnly:false },
  { id:"hoa-than",   name:"Hoá Thần",    price:49900,  cls:"dh-hoa-than",   icon:"🩷", adminOnly:false },
  { id:"luyen-hu",   name:"Luyện Hư",    price:59900,  cls:"dh-luyen-hu",   icon:"🔷", adminOnly:false },
  { id:"hop-the",    name:"Hợp Thể",     price:79900,  cls:"dh-hop-the",    icon:"🌟", adminOnly:false },
  { id:"dai-thua",   name:"Đại Thừa",    price:129000, cls:"dh-dai-thua",   icon:"❄️", adminOnly:false },
  { id:"do-kiep",    name:"Độ Kiếp",     price:189000, cls:"dh-do-kiep",    icon:"⚡", adminOnly:false },
  { id:"dai-de",     name:"Đại Đế Cảnh", price:0,      cls:"dh-dai-de",     icon:"👑", permanent:true,  adminOnly:true }
];

// ============================================================
// ===== TRẠNG THÁI NỘI BỘ ===================================
// ============================================================
let _adminUser          = null;   // Firebase Auth user đã xác thực là admin
let _adminOrderFilter   = "all";
let _adminCardFilter    = "pending";
let _titlePurchasesAll  = [];
let _titlePurchasesFilter = "pending";
let _fruitStockAdminData  = {};
let _fruitStockAdminFilter = "";
let _analyticsTimer       = null;
let _grantTitleSelected   = null;
let _addCoinUsername      = null;
let _addCoinCurrent       = 0;

// ============================================================
// ===== GUARD: Kiểm tra quyền admin trước mọi thao tác ======
// ============================================================

/**
 * Tất cả hàm ghi Firestore gọi guardAdmin() trước.
 * Nếu UID không khớp → ném lỗi, ngăn mọi thao tác.
 */
function guardAdmin() {
  const user = _adminUser || auth.currentUser;
  if (!user || user.uid !== ADMIN_UID) {
    throw new Error("UNAUTHORIZED: Không có quyền admin.");
  }
}

// ============================================================
// ===== TIỆN ÍCH ============================================
// ============================================================
const formatPrice = p => new Intl.NumberFormat("vi-VN").format(p) + "đ";
const escAttr = s => String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");

let _notifTimer = null;
function showNotif(msg, type = "success") {
  const el = document.getElementById("notification");
  if (!el) return;
  if (_notifTimer) { clearTimeout(_notifTimer); _notifTimer = null; }
  const icons = { success: "✅", error: "❌", info: "ℹ️" };
  el.className = `notification ${type}`;
  el.innerHTML = `${icons[type] || ""} ${msg}`;
  el.classList.add("show");
  _notifTimer = setTimeout(() => el.classList.remove("show"), 3500);
}

function openModal(id)  { document.getElementById(id)?.classList.add("show"); }
function closeModal(id) { document.getElementById(id)?.classList.remove("show"); }

function getServices() {
  if (typeof window.__tmcGetServices === "function") return window.__tmcGetServices();
  const raw = localStorage.getItem("tmc_services");
  return raw ? JSON.parse(raw) : [];
}
function saveServices(svcs) { localStorage.setItem("tmc_services", JSON.stringify(svcs)); }

function getCustomCategories() {
  if (typeof window.__tmcGetCustomCategories === "function") return window.__tmcGetCustomCategories();
  const raw = localStorage.getItem("tmc_categories");
  return raw ? JSON.parse(raw) : [];
}
function saveCustomCategories(cats) { localStorage.setItem("tmc_categories", JSON.stringify(cats)); }

function getShopSettings()   { return JSON.parse(localStorage.getItem("tmc_settings") || "{}"); }
function saveShopSettings(s) { localStorage.setItem("tmc_settings", JSON.stringify(s)); }

function getDiscountCodes()   { return JSON.parse(localStorage.getItem("tmc_codes") || "[]"); }
function saveDiscountCodes(c) { localStorage.setItem("tmc_codes", JSON.stringify(c)); }

// Trigger re-render services trên trang chủ (nếu app.js đã export hàm này)
function refreshServicesUI() {
  if (typeof window.renderServices === "function") window.renderServices();
}

function triggerCelebration() {
  const overlay = document.createElement("div");
  overlay.className = "celebration-overlay";
  document.body.appendChild(overlay);
  const colors = ["#ff6b9d","#c44dff","#ffd700","#4ade80","#ff9de2"];
  for (let i = 0; i < 40; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    Object.assign(c.style, {
      left            : Math.random() * 100 + "vw",
      background      : colors[Math.floor(Math.random() * colors.length)],
      animationDuration : (Math.random() * 2 + 1.5) + "s",
      animationDelay    : Math.random() * 0.5 + "s",
      width  : (Math.random() * 8 + 4) + "px",
      height : (Math.random() * 8 + 4) + "px"
    });
    overlay.appendChild(c);
  }
  setTimeout(() => overlay.remove(), 3000);
}

// ============================================================
// ===== AUTH GUARD – Chỉ render admin panel khi đúng UID ====
// ============================================================
onAuthStateChanged(auth, user => {
  if (user && user.uid === ADMIN_UID) {
    _adminUser = user;
    // Hiện nút admin trên nav (nếu app.js chưa xử lý)
    document.getElementById("navAdminBtn")?.style &&
      (document.getElementById("navAdminBtn").style.display = "");
  } else {
    _adminUser = null;
    // Ẩn admin panel nếu đang mở
    document.getElementById("adminPanel")?.classList.remove("show");
  }
});

// ============================================================
// ===== LOAD DỮ LIỆU ADMIN ==================================
// ============================================================
async function loadAdminData() {
  try {
    guardAdmin();
  } catch {
    showNotif("Không có quyền admin!", "error");
    return;
  }
  try {
    const [ordersSnap, usersSnap] = await Promise.all([
      getDocs(query(collection(db, "orders"), orderBy("timestamp", "desc"))),
      getDocs(collection(db, "users"))
    ]);
    const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const users  = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAdminOrders(orders);
    renderAdminUsers(users);
    renderAdminServices();
  } catch {
    showNotif("Không tải được dữ liệu admin!", "error");
  }
}
window.loadAdminData = loadAdminData;

// ============================================================
// ===== TABS ================================================
// ============================================================
function switchAdminTab(tab, btn) {
  try {
    guardAdmin();
  } catch {
    showNotif("Không có quyền admin!", "error");
    return;
  }
  document.querySelectorAll(".admin-tab").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".admin-section").forEach(s => s.classList.remove("show"));
  btn.classList.add("active");
  const sectionId = "admin" + tab.charAt(0).toUpperCase() + tab.slice(1);
  document.getElementById(sectionId)?.classList.add("show");

  switch (tab) {
    case "orders":
      getDocs(query(collection(db, "orders"), orderBy("timestamp", "desc")))
        .then(snap => renderAdminOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
      break;
    case "users":
      getDocs(collection(db, "users")).then(snap => renderAdminUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
      break;
    case "services":
      showAdminSvcView("categories");
      break;
    case "cards":
      loadAdminCards();
      break;
    case "analytics":
      startAnalyticsTimer();
      break;
    case "codes":
      renderAdminCodes();
      break;
    case "titlepurchases":
      loadAdminTitlePurchases();
      break;
    case "fruitstock":
      loadFruitStockAdmin();
      break;
    case "settings": {
      const s = getShopSettings();
      const urlEl = document.getElementById("settingsVideoUrl");
      const annEl = document.getElementById("settingsAnnounce");
      if (urlEl) urlEl.value = s.videoUrl || "";
      if (annEl) annEl.value = s.announce || "";
      break;
    }
  }
}
window.switchAdminTab = switchAdminTab;

// ============================================================
// ===== QUẢN LÝ ĐƠN HÀNG ===================================
// ============================================================
function filterAdminOrders(filter, btn) {
  _adminOrderFilter = filter;
  document.querySelectorAll("#adminOrders .history-filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  getDocs(query(collection(db, "orders"), orderBy("timestamp", "desc")))
    .then(snap => renderAdminOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}
window.filterAdminOrders = filterAdminOrders;

function renderAdminOrders(orders) {
  const el = document.getElementById("adminOrderList");
  if (!el) return;
  let list = orders;
  if (_adminOrderFilter !== "all") list = list.filter(o => o.status === _adminOrderFilter);
  if (!list.length) { el.innerHTML = `<div class="no-data"><p>Không có đơn nào</p></div>`; return; }
  el.innerHTML = list.map(o => `
    <div class="admin-order-card ${o.status}">
      <span class="order-status-badge ${o.status}">${o.status === "done" ? "✅ Xong" : "⏳ Chờ Cày"}</span>
      <div style="font-family:monospace;font-size:0.82rem;color:var(--purple);margin-bottom:6px">${o.id} · ${o.time}</div>
      <div style="font-weight:700;margin-bottom:8px">${o.serviceName}</div>
      <div class="order-fields">
        <div class="order-field"><span>Khách: </span><strong>${o.username || "Ẩn danh"}</strong></div>
        <div class="order-field"><span>Giá: </span><strong style="color:var(--gold)">${formatPrice(o.price)}</strong></div>
        <div class="order-field"><span>TK Roblox: </span><strong>${o.account}</strong></div>
        <div class="order-field"><span>Mật khẩu: </span><strong style="color:var(--pink)">${o.password}</strong></div>
        ${o.subOption ? `<div class="order-field"><span>Lựa chọn: </span><strong style="color:var(--accent)">${o.subOption}</strong></div>` : ""}
        ${o.note ? `<div class="order-field" style="grid-column:1/-1"><span>Ghi chú: </span><strong>${o.note}</strong></div>` : ""}
      </div>
      ${o.doneTime ? `<div style="font-size:0.75rem;color:var(--green);margin-top:6px">✅ Xong lúc: ${o.doneTime}</div>` : ""}
      <div class="order-actions">
        ${o.status === "pending" ? `<button class="btn-done-order" onclick="markOrderDone('${o.id}')">✅ Đánh Dấu Xong</button>` : ""}
        <button class="btn-notify-order" onclick="openNotifyModal('${o.id}')">💬 Thông Báo Khách</button>
        <button class="btn-delete" onclick="deleteOrder('${o.id}')">🗑️ Xóa</button>
      </div>
    </div>`).join("");
}

async function markOrderDone(id) {
  guardAdmin();
  const snap = await getDoc(doc(db, "orders", id));
  if (!snap.exists()) return;
  const o = snap.data();
  const doneTime    = new Date().toLocaleString("vi-VN");
  const doneMessage = `🎉 Đơn hàng ${id} của bạn đã hoàn thành!\n✅ Dịch vụ: ${o.serviceName}\n⏰ Xong lúc: ${doneTime}\nCảm ơn đã tin tưởng Thanh Minh Các! 🐉`;
  try {
    await updateDoc(doc(db, "orders", id), { status: "done", doneTime, doneMessage });
    showNotif("✅ Đã đánh dấu xong đơn " + id, "success");
    triggerCelebration();
    loadAdminData();
  } catch { showNotif("Lỗi!", "error"); }
}
window.markOrderDone = markOrderDone;

async function deleteOrder(id) {
  guardAdmin();
  if (!confirm(`Xóa đơn ${id}?`)) return;
  try {
    await deleteDoc(doc(db, "orders", id));
    showNotif("Đã xóa đơn", "info");
    loadAdminData();
  } catch { showNotif("Lỗi!", "error"); }
}
window.deleteOrder = deleteOrder;

async function openNotifyModal(id) {
  guardAdmin();
  const snap = await getDoc(doc(db, "orders", id));
  if (!snap.exists()) return;
  const o   = snap.data();
  const msg = o.doneMessage || `📢 Cập nhật đơn hàng!\n🆔 Mã đơn: ${o.id}\n📦 Dịch vụ: ${o.serviceName}\n⏳ Trạng thái: ${o.status === "done" ? "✅ Hoàn thành" : "🔄 Đang tiến hành"}\nMọi thắc mắc liên hệ Thanh Minh Các!`;
  const prevEl = document.getElementById("notifyPreviewText");
  const fbEl   = document.getElementById("notifyFbLink");
  if (prevEl) prevEl.textContent = msg;
  if (fbEl)   fbEl.href = "https://www.facebook.com/profile.php?id=61585785807233";
  openModal("notifyModal");
}
window.openNotifyModal = openNotifyModal;

function copyNotifyText() {
  const text = document.getElementById("notifyPreviewText")?.textContent || "";
  navigator.clipboard.writeText(text)
    .then(() => { showNotif("📋 Đã copy!", "success"); closeModal("notifyModal"); })
    .catch(() => {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
      showNotif("📋 Đã copy!", "success"); closeModal("notifyModal");
    });
}
window.copyNotifyText = copyNotifyText;

// ============================================================
// ===== QUẢN LÝ NGƯỜI DÙNG =================================
// ============================================================
function renderAdminUsers(users) {
  const el = document.getElementById("adminUserList");
  if (!el) return;
  const refreshBtn = `<div style="display:flex;justify-content:flex-end;margin-bottom:10px">
    <button onclick="_refreshAdminUsers()" style="padding:6px 14px;border-radius:8px;border:1px solid rgba(196,77,255,0.3);background:transparent;color:var(--accent);cursor:pointer;font-family:'Quicksand',sans-serif;font-size:0.78rem;font-weight:600">🔄 Làm mới</button>
  </div>`;
  if (!users?.length) {
    el.innerHTML = refreshBtn + `<div class="no-data"><p>Chưa có người dùng nào</p></div>`;
    return;
  }
  el.innerHTML = refreshBtn + users.map(u => {
    const title = u.titleOverride ? TITLES.find(t => t.id === u.titleOverride) : null;
    return `<div class="user-item">
      <div class="user-item-info">
        <div class="user-item-name">👤 ${u.username}</div>
        <div class="user-item-sub">📧 ${u.email || "—"}${u.facebook ? ` | 📘 ${u.facebook}` : ""}</div>
        <div class="user-item-sub">Tham gia: ${u.createdAt || "—"}</div>
        ${title
          ? `<span class="user-item-title ${title.cls}">${title.icon} ${title.name}</span>`
          : `<span style="font-size:0.7rem;color:rgba(240,230,255,0.3)">Chưa có danh hiệu</span>`}
        <div class="user-balance">💰 Số dư: ${formatPrice(u.balance || 0)}</div>
      </div>
      <div class="user-item-actions">
        <button class="btn-grant-title" onclick="openGrantTitle('${u.id}','${escAttr(u.username)}')">🏆 Cấp Danh Hiệu</button>
        <button class="btn-add-coin"    onclick="openAddCoin('${u.id}','${escAttr(u.username)}')">💰 Bơm Tiền</button>
        <button class="btn-delete"      onclick="deleteUser('${u.id}','${escAttr(u.username)}')">🗑️</button>
      </div>
    </div>`;
  }).join("");
}

async function _refreshAdminUsers() {
  guardAdmin();
  const el = document.getElementById("adminUserList");
  if (el) el.innerHTML = `<div class="no-data"><p>⏳ Đang tải...</p></div>`;
  const snap = await getDocs(collection(db, "users"));
  renderAdminUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}
window._refreshAdminUsers = _refreshAdminUsers;

async function deleteUser(uid, username) {
  guardAdmin();
  if (!confirm(`Xóa tài khoản "${username}"?`)) return;
  try {
    await deleteDoc(doc(db, "users", uid));
    showNotif(`Đã xóa ${username}`, "info");
    _refreshAdminUsers();
  } catch { showNotif("Lỗi!", "error"); }
}
window.deleteUser = deleteUser;

// ── Cấp danh hiệu ──────────────────────────────────────────
function openGrantTitle(uid, username) {
  guardAdmin();
  _grantTitleSelected = null;
  document.getElementById("grantTitleTarget").value    = uid;
  document.getElementById("grantTitleUsername").textContent = "Cấp danh hiệu cho: " + username;
  const grid = document.getElementById("titleSelectGrid");
  if (grid) {
    grid.innerHTML = TITLES.map(t => `
      <div class="title-option" onclick="selectTitle('${t.id}',this)">
        <div style="display:flex;align-items:center;gap:8px">
          <div>
            <div class="t-name ${t.cls}" style="padding:2px 8px;border-radius:8px;display:inline-block">${t.icon} ${t.name}</div>
            <div class="t-min" style="font-size:0.68rem;color:rgba(240,230,255,0.4);margin-top:2px">
              ${t.adminOnly ? "Chỉ chủ shop cấp" : t.price ? formatPrice(t.price) : "Mặc định"}
            </div>
          </div>
        </div>
      </div>`).join("");
  }
  openModal("grantTitleModal");
}
window.openGrantTitle = openGrantTitle;

function selectTitle(id, el) {
  _grantTitleSelected = id;
  document.querySelectorAll(".title-option").forEach(e => e.classList.remove("selected"));
  el.classList.add("selected");
}
window.selectTitle = selectTitle;

async function confirmGrantTitle() {
  guardAdmin();
  if (!_grantTitleSelected) { showNotif("Chọn danh hiệu!", "error"); return; }
  const uid = document.getElementById("grantTitleTarget")?.value;
  if (!uid) return;
  try {
    const t           = TITLES.find(x => x.id === _grantTitleSelected);
    const isPermanent = !!(t && (t.permanent || t.adminOnly));
    const now         = Date.now();
    await updateDoc(doc(db, "users", uid), {
      titleOverride  : _grantTitleSelected,
      titleGrantedAt : isPermanent ? 0 : now,
      titleExpiry    : isPermanent ? 0 : now + TITLE_DURATION_MS
    });
    closeModal("grantTitleModal");
    showNotif(`🏆 Đã cấp "${t?.name}" ${isPermanent ? "(vĩnh viễn)" : "(30 ngày)"}`, "success");
    _refreshAdminUsers();
  } catch { showNotif("Lỗi!", "error"); }
}
window.confirmGrantTitle = confirmGrantTitle;

// ── Bơm tiền ───────────────────────────────────────────────
async function openAddCoin(uid, username) {
  guardAdmin();
  _addCoinUsername = uid;
  const snap = await getDoc(doc(db, "users", uid));
  _addCoinCurrent = snap.exists() ? (snap.data().balance || 0) : 0;
  const targetEl  = document.getElementById("addCoinTarget");
  const balEl     = document.getElementById("addCoinCurrentBalance");
  const amtEl     = document.getElementById("addCoinAmount");
  const noteEl    = document.getElementById("addCoinNote");
  if (targetEl) targetEl.textContent = username;
  if (balEl)    balEl.textContent    = formatPrice(_addCoinCurrent);
  if (amtEl)    amtEl.value          = "";
  if (noteEl)   noteEl.value         = "";
  openModal("addCoinModal");
}
window.openAddCoin = openAddCoin;

function setQuickCoin(amount) {
  const el  = document.getElementById("addCoinAmount");
  const cur = parseInt(el?.value) || 0;
  if (el) el.value = cur + amount;
}
window.setQuickCoin = setQuickCoin;

async function confirmAddCoin() {
  guardAdmin();
  const amount = parseInt(document.getElementById("addCoinAmount")?.value);
  const note   = document.getElementById("addCoinNote")?.value.trim();
  if (!amount || amount <= 0) { showNotif("Nhập số tiền hợp lệ!", "error"); return; }
  if (!_addCoinUsername) return;
  const newBalance = _addCoinCurrent + amount;
  try {
    await updateDoc(doc(db, "users", _addCoinUsername), { balance: newBalance });
    await addDoc(collection(db, "coinlogs"), {
      uid     : _addCoinUsername,
      amount, note: note || "Admin bơm tiền",
      newBalance,
      time     : new Date().toLocaleString("vi-VN"),
      timestamp: Date.now()
    });
    closeModal("addCoinModal");
    showNotif(`💰 Đã bơm ${formatPrice(amount)}!`, "success");
    loadAdminData();
  } catch { showNotif("Lỗi bơm tiền!", "error"); }
}
window.confirmAddCoin = confirmAddCoin;

// ============================================================
// ===== QUẢN LÝ NẠP THẺ ====================================
// ============================================================
async function loadAdminCards() {
  guardAdmin();
  const el = document.getElementById("adminCardList");
  if (!el) return;
  el.innerHTML = `<div class="no-data"><p>⏳ Đang tải...</p></div>`;
  const snap  = await getDocs(query(collection(db, "cards"), orderBy("timestamp", "desc")));
  const cards = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  let list    = cards;
  if (_adminCardFilter !== "all") list = list.filter(c => c.status === _adminCardFilter);
  if (!list.length) { el.innerHTML = `<div class="no-data"><p>Không có thẻ nào</p></div>`; return; }
  el.innerHTML = list.map(card => `
    <div class="admin-card-item">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <strong>${card.username} — ${card.type} ${formatPrice(card.denom)}</strong>
        <span class="card-status-badge card-status-${card.status}">${card.status === "done" ? "✅ Đã duyệt" : card.status === "failed" ? "❌ Thất bại" : "⏳ Chờ duyệt"}</span>
      </div>
      <div class="admin-card-fields">
        <div class="admin-card-field"><span>Seri: </span><strong>${card.serial}</strong></div>
        <div class="admin-card-field"><span>Mã: </span><strong style="color:var(--pink)">${card.code}</strong></div>
      </div>
      <div style="font-size:0.72rem;color:rgba(240,230,255,0.35);margin-bottom:8px">${card.time}</div>
      ${card.status === "pending" ? `
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn-approve-card" onclick="approveCard('${card.id}','${card.uid}',${card.denom},'${escAttr(card.type)}','${escAttr(card.username)}')">✅ Duyệt</button>
          <button class="btn-reject-card"  onclick="rejectCard('${card.id}')">❌ Từ Chối</button>
        </div>` : ""}
    </div>`).join("");
}
window.loadAdminCards = loadAdminCards;

function filterAdminCards(filter, btn) {
  _adminCardFilter = filter;
  document.querySelectorAll("#adminCards .history-filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  loadAdminCards();
}
window.filterAdminCards = filterAdminCards;

async function approveCard(cardId, uid, denom, type, username) {
  guardAdmin();
  try {
    // Cộng tiền vào ví khách
    const userSnap = await getDoc(doc(db, "users", uid));
    if (!userSnap.exists()) { showNotif("❌ Không tìm thấy user!", "error"); return; }
    const oldBalance = userSnap.data().balance || 0;
    const newBalance = oldBalance + denom;
    await updateDoc(doc(db, "users", uid), { balance: newBalance });

    // Cập nhật trạng thái thẻ
    await updateDoc(doc(db, "cards", cardId), {
      status: "done",
      note  : `✅ Đã duyệt! +${formatPrice(denom)} vào ví`
    });

    // Lưu log
    await addDoc(collection(db, "coinlogs"), {
      uid, username, amount: denom,
      note     : `Nạp thẻ ${type} ${formatPrice(denom)}`,
      newBalance,
      time     : new Date().toLocaleString("vi-VN"),
      timestamp: Date.now()
    });

    showNotif(`✅ Đã duyệt! Cộng ${formatPrice(denom)} cho ${username}`, "success");
    loadAdminCards();
  } catch { showNotif("Lỗi duyệt thẻ!", "error"); }
}
window.approveCard = approveCard;

async function rejectCard(cardId) {
  guardAdmin();
  const reason = prompt("Lý do từ chối (tuỳ chọn):", "Thẻ không hợp lệ") || "Thẻ không hợp lệ";
  try {
    await updateDoc(doc(db, "cards", cardId), { status: "failed", note: "❌ " + reason });
    showNotif("Đã từ chối thẻ", "info");
    loadAdminCards();
  } catch { showNotif("Lỗi!", "error"); }
}
window.rejectCard = rejectCard;

// ============================================================
// ===== QUẢN LÝ DỊCH VỤ ====================================
// ============================================================
function showAdminSvcView(view) {
  document.getElementById("adminSvcViewCat")?.style &&
    (document.getElementById("adminSvcViewCat").style.display   = view === "categories" ? "block" : "none");
  document.getElementById("adminSvcViewItems")?.style &&
    (document.getElementById("adminSvcViewItems").style.display = view === "items"      ? "block" : "none");
  if (view === "categories") renderAdminCategories();
  if (view === "items")      { populateCatFilter(); renderAdminItems(); }
}
window.showAdminSvcView  = showAdminSvcView;
function renderAdminServices() { showAdminSvcView("categories"); }
window.renderAdminServices = renderAdminServices;

function renderAdminCategories() {
  const el = document.getElementById("adminCatList");
  if (!el) return;
  const cats     = getCustomCategories();
  const services = getServices();
  el.innerHTML   = cats.map(cat => {
    const count = services.filter(s => s.category === cat.key).length;
    return `<div class="admin-cat-item">
      <img src="${cat.image || ""}" onerror="this.style.display='none'" style="width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0">
      <div class="admin-svc-info">
        <div class="admin-svc-name">${cat.name}</div>
        <div class="admin-svc-code">${count} gói bên trong</div>
      </div>
      <button class="btn-edit-svc" onclick="openEditCat('${cat.key}')">✏️ Sửa ảnh</button>
    </div>`;
  }).join("") || `<div class="no-data"><p>Chưa có danh mục</p></div>`;
}

function populateCatFilter() {
  const sel = document.getElementById("filterItemCat");
  if (!sel) return;
  const cats  = getCustomCategories();
  sel.innerHTML = cats.map(c => `<option value="${c.key}">${c.name}</option>`).join("");
  renderAdminItems();
}

function renderAdminItems() {
  const catKey = document.getElementById("filterItemCat")?.value;
  const el     = document.getElementById("adminItemList");
  if (!catKey || !el) return;
  const services = getServices().filter(s => s.category === catKey).sort((a, b) => (a.order || a.id) - (b.order || b.id));
  el.innerHTML = services.map(svc => `
    <div class="admin-svc-item svc-drag-row" draggable="true" data-id="${svc.id}" data-cat="${svc.category}"
         ondragstart="dragStart(event,${svc.id})" ondragover="dragOver(event)" ondrop="dragDrop(event,'${svc.category}')" ondragleave="dragLeave(event)">
      <span class="drag-handle">⠿</span>
      <div class="admin-svc-info">
        <div class="admin-svc-name">${svc.name} ${svc.badge !== "normal" ? `<span class="svc-row-badge ${svc.badge === "svip" ? "badge-svip" : "badge-vip"}">${svc.badge.toUpperCase()}</span>` : ""}</div>
        <div class="admin-svc-code">${formatPrice(svc.price)} · ${svc.desc}</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn-edit-svc" onclick="openEditSvc(${svc.id})">✏️</button>
        <button class="btn-delete"   onclick="deleteSvc(${svc.id})">🗑️</button>
      </div>
    </div>`).join("") || `<div class="no-data"><p>Chưa có gói nào</p></div>`;
}
window.renderAdminItems = renderAdminItems;

function addNewService() {
  guardAdmin();
  const name  = document.getElementById("newSvcName")?.value.trim();
  const price = parseInt(document.getElementById("newSvcPrice")?.value);
  const cat   = document.getElementById("filterItemCat")?.value || "other";
  const badge = document.getElementById("newSvcBadge")?.value;
  const desc  = document.getElementById("newSvcDesc")?.value.trim();
  if (!name)  { showNotif("Nhập tên gói!", "error"); return; }
  if (!price || price <= 0) { showNotif("Nhập giá hợp lệ!", "error"); return; }
  const services = getServices();
  const newId    = services.reduce((m, s) => Math.max(m, s.id), 0) + 1;
  const catSvcs  = services.filter(s => s.category === cat);
  const maxOrder = catSvcs.reduce((m, s) => Math.max(m, s.order || s.id), 0);
  services.push({
    id: newId, name, price, category: cat, badge, desc: desc || name, image: "", slug: null,
    order: maxOrder + 1,
    code : (badge === "svip" ? "SSVIP-" : badge === "vip" ? "S-" : "") + "TMC-" + String(newId).padStart(3, "0")
  });
  saveServices(services);
  ["newSvcName","newSvcPrice","newSvcDesc"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  renderAdminItems(); refreshServicesUI();
  showNotif(`✅ Đã thêm: ${name}`, "success");
}
window.addNewService = addNewService;

function openEditSvc(id) {
  const svc = getServices().find(s => s.id === id);
  if (!svc) return;
  document.getElementById("editSvcId").value       = svc.id;
  document.getElementById("editSvcName").value     = svc.name;
  document.getElementById("editSvcPrice").value    = svc.price;
  document.getElementById("editSvcDesc").value     = svc.desc;
  document.getElementById("editSvcCategory").value = svc.category;
  document.getElementById("editSvcBadge").value    = svc.badge;
  openModal("editSvcModal");
}
window.openEditSvc = openEditSvc;

function saveEditService() {
  guardAdmin();
  const id    = parseInt(document.getElementById("editSvcId")?.value);
  const name  = document.getElementById("editSvcName")?.value.trim();
  const price = parseInt(document.getElementById("editSvcPrice")?.value);
  const desc  = document.getElementById("editSvcDesc")?.value.trim();
  const cat   = document.getElementById("editSvcCategory")?.value;
  const badge = document.getElementById("editSvcBadge")?.value;
  if (!name || !price) { showNotif("Điền đầy đủ!", "error"); return; }
  const services = getServices();
  const svc      = services.find(s => s.id === id);
  if (svc) {
    svc.name = name; svc.price = price; svc.desc = desc || name; svc.category = cat; svc.badge = badge;
    svc.code = (badge === "svip" ? "SSVIP-" : badge === "vip" ? "S-" : "") + "TMC-" + String(id).padStart(3, "0");
    saveServices(services); renderAdminServices(); refreshServicesUI();
    closeModal("editSvcModal"); showNotif(`Đã cập nhật: ${name}`, "success");
  }
}
window.saveEditService = saveEditService;

function deleteSvc(id) {
  guardAdmin();
  if (!confirm("Xóa dịch vụ?")) return;
  const services = getServices();
  const svc      = services.find(s => s.id === id);
  saveServices(services.filter(s => s.id !== id));
  renderAdminServices(); refreshServicesUI();
  showNotif(`Đã xóa${svc ? ": " + svc.name : ""}`, "info");
}
window.deleteSvc = deleteSvc;

function openEditCat(catKey) {
  const cats = getCustomCategories();
  const cat  = cats.find(c => c.key === catKey);
  if (!cat) return;
  const keyEl  = document.getElementById("editCatKey");
  const nameEl = document.getElementById("editCatName");
  const imgEl  = document.getElementById("editCatImageVal");
  const prevEl = document.getElementById("editCatPreview");
  if (keyEl)  keyEl.value  = catKey;
  if (nameEl) nameEl.value = cat.name.replace(/^\S+\s*/, "");
  if (imgEl)  imgEl.value  = cat.image || "";
  if (prevEl) { prevEl.src = cat.image || ""; prevEl.style.display = cat.image ? "block" : "none"; }
  openModal("editCatModal");
}
window.openEditCat = openEditCat;

function saveEditCat() {
  guardAdmin();
  const catKey = document.getElementById("editCatKey")?.value;
  const name   = document.getElementById("editCatName")?.value.trim();
  const img    = document.getElementById("editCatImageVal")?.value.trim();
  if (!name) { showNotif("Nhập tên gói lớn!", "error"); return; }
  const cats = getCustomCategories();
  const idx  = cats.findIndex(c => c.key === catKey);
  if (idx === -1) return;
  cats[idx].name  = cats[idx].icon + " " + name;
  if (img) cats[idx].image = img;
  saveCustomCategories(cats);
  closeModal("editCatModal"); renderAdminCategories(); refreshServicesUI();
  showNotif("✅ Đã cập nhật gói lớn!", "success");
}
window.saveEditCat = saveEditCat;

// ── Drag & Drop sắp xếp dịch vụ ───────────────────────────
let _dragSrcId = null;
function dragStart(e, id) { _dragSrcId = id; e.target.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; }
function dragOver(e)  { e.preventDefault(); e.dataTransfer.dropEffect = "move"; e.target.closest(".svc-drag-row")?.classList.add("drag-over"); }
function dragLeave(e) { e.target.closest(".svc-drag-row")?.classList.remove("drag-over"); }
function dragDrop(e, catKey) {
  e.preventDefault();
  document.querySelectorAll(".svc-drag-row").forEach(r => { r.classList.remove("dragging","drag-over"); });
  const targetRow = e.target.closest(".svc-drag-row");
  if (!targetRow || !_dragSrcId) return;
  const targetId  = parseInt(targetRow.dataset.id);
  if (_dragSrcId === targetId) return;
  let services = getServices();
  const catSvcs   = services.filter(s => s.category === catKey).sort((a, b) => (a.order || a.id) - (b.order || b.id));
  const srcIdx    = catSvcs.findIndex(s => s.id === _dragSrcId);
  const tgtIdx    = catSvcs.findIndex(s => s.id === targetId);
  if (srcIdx === -1 || tgtIdx === -1) return;
  catSvcs.splice(tgtIdx, 0, catSvcs.splice(srcIdx, 1)[0]);
  catSvcs.forEach((s, i) => { const si = services.findIndex(x => x.id === s.id); if (si !== -1) services[si].order = i + 1; });
  saveServices(services); renderAdminItems(); refreshServicesUI();
  showNotif("✅ Đã di chuyển", "success");
}
window.dragStart = dragStart;
window.dragOver  = dragOver;
window.dragLeave = dragLeave;
window.dragDrop  = dragDrop;

// ============================================================
// ===== CÀI ĐẶT SHOP =======================================
// ============================================================
function saveVideoSetting() {
  guardAdmin();
  const url = document.getElementById("settingsVideoUrl")?.value.trim();
  const s   = getShopSettings(); s.videoUrl = url; saveShopSettings(s);
  if (typeof window.applyVideoSetting === "function") window.applyVideoSetting();
  showNotif(url ? "✅ Đã lưu video!" : "✅ Đã tắt video", "success");
}
function saveAnnounceSetting() {
  guardAdmin();
  const txt = document.getElementById("settingsAnnounce")?.value.trim();
  const s   = getShopSettings(); s.announce = txt; saveShopSettings(s);
  showNotif("✅ Đã lưu thông báo", "success");
}
window.saveVideoSetting    = saveVideoSetting;
window.saveAnnounceSetting = saveAnnounceSetting;

// ============================================================
// ===== ANALYTICS ===========================================
// ============================================================
async function loadAnalytics() {
  guardAdmin();
  try {
    const [usersSnap, cardsSnap, ordersSnap] = await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(query(collection(db, "cards"), orderBy("timestamp", "desc"))),
      getDocs(query(collection(db, "orders"), orderBy("timestamp", "desc")))
    ]);
    const users  = usersSnap.docs.map(d => d.data());
    const cards  = cardsSnap.docs.map(d => d.data());
    const orders = ordersSnap.docs.map(d => d.data());
    const now    = new Date();
    const isMth  = ts => {
      const d = new Date(ts);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };
    const done        = cards.filter(c => c.status === "done");
    const cardMonthAmt = done.filter(c => isMth(c.timestamp)).reduce((s, c) => s + c.denom, 0);
    const usersMonth  = users.filter(u => u.createdAtTs && isMth(u.createdAtTs)).length;
    const ordersMonth = orders.filter(o => isMth(o.timestamp)).length;
    const doneMonth   = orders.filter(o => o.status === "done" && isMth(o.timestamp)).length;

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("an-users-all",          users.length);
    set("an-users-month-inline", usersMonth);
    set("an-card-all",           formatPrice(done.reduce((s, c) => s + c.denom, 0)));
    set("an-card-month-inline",  formatPrice(cardMonthAmt));
    set("an-orders-all",         orders.length);
    set("an-orders-month-inline", ordersMonth);
    set("an-done-all",           orders.filter(o => o.status === "done").length);
    set("an-done-month-inline",  doneMonth);

    // Top nạp tháng này
    const totals = {};
    done.filter(c => isMth(c.timestamp)).forEach(c => { totals[c.username] = (totals[c.username] || 0) + c.denom; });
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const topEl  = document.getElementById("analyticsTopNap");
    if (topEl) {
      topEl.innerHTML = sorted.length
        ? sorted.map(([name, total], i) => `
            <div style="background:var(--bg-card);border:1px solid rgba(255,215,0,0.1);border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <span style="font-size:1.2rem">${["👑","🥈","🥉"][i] || "🎖️"}</span>
              <div style="flex:1;font-weight:700">${name}</div>
              <span style="font-family:'Orbitron',sans-serif;font-size:0.85rem;color:var(--gold)">${formatPrice(total)}</span>
            </div>`).join("")
        : `<div class="no-data"><p>Chưa có dữ liệu tháng này</p></div>`;
    }
  } catch (e) { console.error("Analytics error:", e); }
}
window.loadAnalytics = loadAnalytics;

function startAnalyticsTimer() {
  loadAnalytics();
  if (_analyticsTimer) clearInterval(_analyticsTimer);
  _analyticsTimer = setInterval(loadAnalytics, 60000);
}
window.startAnalyticsTimer = startAnalyticsTimer;

// ============================================================
// ===== MÃ GIẢM GIÁ ========================================
// ============================================================
function createDiscountCode() {
  guardAdmin();
  const nameEl = document.getElementById("newCodeName");
  const pctEl  = document.getElementById("newCodePercent");
  const name   = nameEl?.value.trim().toUpperCase();
  const pct    = parseInt(pctEl?.value);
  if (!name)              { showNotif("Nhập tên mã!", "error"); return; }
  if (!pct || pct < 1 || pct > 50) { showNotif("Nhập % từ 1-50!", "error"); return; }
  const codes = getDiscountCodes();
  if (codes.find(x => x.name === name)) { showNotif("Mã đã tồn tại!", "error"); return; }
  codes.push({ name, percent: pct, expiry: Date.now() + 3 * 24 * 60 * 60 * 1000, createdAt: new Date().toLocaleString("vi-VN") });
  saveDiscountCodes(codes);
  if (nameEl) nameEl.value = "";
  if (pctEl)  pctEl.value  = "";
  renderAdminCodes();
  showNotif(`✅ Tạo mã "${name}" giảm ${pct}%`, "success");
}
window.createDiscountCode = createDiscountCode;

function renderAdminCodes() {
  const el = document.getElementById("adminCodeList");
  if (!el) return;
  const codes = getDiscountCodes();
  const now   = Date.now();
  if (!codes.length) { el.innerHTML = `<div class="no-data"><p>Chưa có mã nào</p></div>`; return; }
  el.innerHTML = codes.map((code, i) => {
    const exp    = now > code.expiry;
    const remain = exp ? "Đã hết hạn" : `Còn ${Math.ceil((code.expiry - now) / 86400000)} ngày`;
    return `<div class="code-item" style="${exp ? "opacity:0.4" : ""}">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-family:monospace;font-size:1rem;color:var(--accent);font-weight:700">${code.name}</span>
        <button onclick="deleteCode(${i})" style="background:transparent;border:none;color:var(--red);cursor:pointer;font-size:1rem">🗑️</button>
      </div>
      <div style="font-size:0.72rem;color:rgba(240,230,255,0.45);margin-top:4px">
        Giảm <strong style="color:var(--green)">${code.percent}%</strong> cho đơn trên 50k · ${remain} · Tạo: ${code.createdAt}
      </div>
    </div>`;
  }).join("");
}
window.renderAdminCodes = renderAdminCodes;

function deleteCode(idx) {
  guardAdmin();
  const codes = getDiscountCodes(); codes.splice(idx, 1); saveDiscountCodes(codes);
  renderAdminCodes(); showNotif("Đã xóa mã", "info");
}
window.deleteCode = deleteCode;

// ============================================================
// ===== MUA DANH HIỆU (Admin duyệt) ========================
// ============================================================
async function loadAdminTitlePurchases() {
  guardAdmin();
  const el = document.getElementById("adminTitlePurchaseList");
  if (!el) return;
  el.innerHTML = `<div class="no-data"><p>⏳ Đang tải...</p></div>`;
  try {
    const snap = await getDocs(query(collection(db, "titlepurchases"), orderBy("timestamp", "desc")));
    _titlePurchasesAll = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTitlePurchaseList();
  } catch { el.innerHTML = `<div class="no-data"><p>Lỗi tải</p></div>`; }
}
window.loadAdminTitlePurchases = loadAdminTitlePurchases;

function filterTitlePurchases(status, btn) {
  _titlePurchasesFilter = status;
  document.querySelectorAll("#adminTitlepurchases .history-filter-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderTitlePurchaseList();
}
window.filterTitlePurchases = filterTitlePurchases;

function renderTitlePurchaseList() {
  const el  = document.getElementById("adminTitlePurchaseList");
  if (!el) return;
  const now = Date.now();
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
  const list = _titlePurchasesAll.filter(p => {
    if (_titlePurchasesFilter === "all")     return true;
    if (_titlePurchasesFilter === "pending") return p.status !== "done";
    if (_titlePurchasesFilter === "done")    return p.status === "done" && (now - (p.doneAt || 0)) < THREE_DAYS;
    return true;
  });
  if (!list.length) {
    el.innerHTML = `<div class="no-data"><p>${_titlePurchasesFilter === "pending" ? "Không có đơn nào chờ cấp 🎉" : _titlePurchasesFilter === "done" ? "Không có đơn hoàn thành gần đây" : "Chưa có yêu cầu nào"}</p></div>`;
    return;
  }
  const tMap = {};
  TITLES.forEach(t => { tMap[t.id] = t; });
  el.innerHTML = list.map(p => {
    const t       = tMap[p.titleId] || {};
    const isDone  = p.status === "done";
    const doneAt  = p.doneAt || 0;
    const remDays = isDone ? Math.ceil((THREE_DAYS - (now - doneAt)) / 86400000) : 0;
    return `<div id="tprow-${p.id}" style="background:var(--bg-card);border:1px solid ${isDone ? "rgba(74,222,128,0.2)" : "rgba(255,215,0,0.2)"};border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px">
      <div style="width:40px;height:40px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:1.6rem">${t.icon || "🏆"}</div>
      <div style="flex:1;min-width:140px">
        <div style="font-weight:700;font-size:0.9rem;margin-bottom:2px">${p.username} <span style="color:rgba(240,230,255,0.4)">→</span> <span class="${t.cls || ""}" style="padding:2px 8px;border-radius:6px;font-size:0.8rem;font-weight:700">${p.titleName || t.name || "?"}</span></div>
        <div style="font-size:0.72rem;color:rgba(240,230,255,0.4)">${p.time || ""} · ${formatPrice(p.price || 0)}${isDone && remDays > 0 ? ` · <span style="color:rgba(74,222,128,0.6)">ẩn sau ${remDays} ngày</span>` : ""}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${isDone
          ? `<span style="padding:4px 12px;border-radius:8px;font-size:0.75rem;font-weight:700;background:rgba(74,222,128,0.15);color:var(--green)">✅ Đã cấp</span>`
          : `<button onclick="grantTitleFromPurchase('${p.id}','${p.uid}','${p.titleId}')" style="padding:6px 14px;border-radius:20px;border:none;background:linear-gradient(135deg,var(--pink),var(--purple));color:#fff;font-size:0.78rem;font-weight:700;cursor:pointer;font-family:'Quicksand',sans-serif">🏆 Cấp Danh Hiệu</button>
             <button onclick="markTitlePurchaseDone('${p.id}')" style="padding:6px 14px;border-radius:20px;border:1px solid rgba(74,222,128,0.4);background:transparent;color:var(--green);font-size:0.78rem;font-weight:700;cursor:pointer;font-family:'Quicksand',sans-serif">✅ Hoàn Thành</button>`}
      </div>
    </div>`;
  }).join("");
}

async function grantTitleFromPurchase(purchaseId, uid, titleId) {
  guardAdmin();
  try {
    const t           = TITLES.find(x => x.id === titleId);
    const isPermanent = !!(t && (t.permanent || t.adminOnly));
    const now         = Date.now();
    await updateDoc(doc(db, "users", uid), {
      titleOverride  : titleId,
      titleGrantedAt : isPermanent ? 0 : now,
      titleExpiry    : isPermanent ? 0 : now + TITLE_DURATION_MS
    });
    await markTitlePurchaseDone(purchaseId, true);
    showNotif(`✅ Đã cấp ${t?.name || titleId} ${isPermanent ? "(vĩnh viễn)" : "(30 ngày)"}`, "success");
  } catch (e) { showNotif("❌ Lỗi cấp danh hiệu: " + e.message, "error"); }
}
window.grantTitleFromPurchase = grantTitleFromPurchase;

async function markTitlePurchaseDone(purchaseId, skipNotif = false) {
  guardAdmin();
  try {
    const now = Date.now();
    await updateDoc(doc(db, "titlepurchases", purchaseId), { status: "done", doneAt: now });
    const idx = _titlePurchasesAll.findIndex(p => p.id === purchaseId);
    if (idx > -1) { _titlePurchasesAll[idx].status = "done"; _titlePurchasesAll[idx].doneAt = now; }
    renderTitlePurchaseList();
    if (!skipNotif) showNotif("✅ Đã đánh dấu hoàn thành", "success");
  } catch (e) { showNotif("❌ Lỗi: " + e.message, "error"); }
}
window.markTitlePurchaseDone = markTitlePurchaseDone;

// ============================================================
// ===== QUẢN LÝ TỒN KHO TRÁI ÁC QUỶ =======================
// ============================================================
async function loadFruitStockAdmin() {
  guardAdmin();
  const grid = document.getElementById("fruitStockAdminGrid");
  if (!grid) return;
  grid.innerHTML = `<div class="no-data"><p>⏳ Đang tải...</p></div>`;
  try {
    const snap = await getDocs(collection(db, "fruitstock"));
    _fruitStockAdminData = {};
    snap.forEach(d => { _fruitStockAdminData[d.id] = d.data(); });
    renderFruitStockAdmin();
  } catch { renderFruitStockAdmin(); }
}
window.loadFruitStockAdmin = loadFruitStockAdmin;

function filterFruitStockAdmin(q) {
  _fruitStockAdminFilter = q.toLowerCase();
  renderFruitStockAdmin();
}
window.filterFruitStockAdmin = filterFruitStockAdmin;

function renderFruitStockAdmin() {
  const grid   = document.getElementById("fruitStockAdminGrid");
  if (!grid) return;
  const fruits = getServices().filter(s => s.category === "fruit");
  const list   = _fruitStockAdminFilter
    ? fruits.filter(s => s.name.toLowerCase().includes(_fruitStockAdminFilter))
    : fruits;
  if (!list.length) { grid.innerHTML = `<div class="no-data"><p>Không tìm thấy trái nào</p></div>`; return; }
  grid.innerHTML = list.map(svc => {
    const d       = _fruitStockAdminData[String(svc.id)] || {};
    const qty     = d.qty || 0;
    const inStock = qty > 0;
    return `<div class="fruit-stock-item" id="fstock-admin-${svc.id}">
      <div style="display:flex;align-items:center;gap:6px">
        <div class="stock-status-dot ${inStock ? "in" : "out"}"></div>
        <div class="fruit-stock-name">${svc.name}</div>
      </div>
      <div style="font-size:0.7rem;color:${inStock ? "var(--green)" : "var(--red)"};font-weight:600">
        ${inStock ? "✅ Còn " + qty + " trái" : "❌ Hết hàng"}
      </div>
      <div class="fruit-stock-controls">
        <input type="number" min="0" max="9999" class="fruit-stock-input"
               id="fstock-input-${svc.id}" value="${qty}" placeholder="Số lượng (0=hết)">
        <button class="btn-stock-save" onclick="saveFruitStock(${svc.id})" id="fstock-btn-${svc.id}">💾 Lưu</button>
      </div>
      <div style="font-size:0.65rem;color:rgba(240,230,255,0.3)">
        ${d.updatedAt ? "Cập nhật: " + new Date(d.updatedAt).toLocaleString("vi-VN") : "Chưa có dữ liệu"}
      </div>
    </div>`;
  }).join("");
}

async function saveFruitStock(svcId) {
  guardAdmin();
  const input = document.getElementById(`fstock-input-${svcId}`);
  const btn   = document.getElementById(`fstock-btn-${svcId}`);
  if (!input) return;
  const qty  = Math.max(0, parseInt(input.value) || 0);
  const key  = String(svcId);
  if (btn) { btn.disabled = true; btn.textContent = "⏳"; }
  try {
    const data = { qty, updatedAt: Date.now() };
    await setDoc(doc(db, "fruitstock", key), data, { merge: true });
    _fruitStockAdminData[key] = data;
    if (btn) { btn.textContent = "✅"; setTimeout(() => { btn.textContent = "💾 Lưu"; btn.disabled = false; }, 1500); }
    // Thông báo cho app.js cập nhật UI realtime (nếu listener đang chạy, sẽ tự động nhận)
    showNotif(qty > 0 ? `✅ Đã cập nhật: còn ${qty} trái` : "✅ Đã đặt hết hàng", "success");
    // Cập nhật lại dòng hiển thị
    const dotEl    = document.querySelector(`#fstock-admin-${svcId} .stock-status-dot`);
    const statusEl = document.querySelector(`#fstock-admin-${svcId} div:nth-child(2)`);
    if (dotEl)    dotEl.className = `stock-status-dot ${qty > 0 ? "in" : "out"}`;
    if (statusEl) { statusEl.textContent = qty > 0 ? `✅ Còn ${qty} trái` : "❌ Hết hàng"; statusEl.style.color = qty > 0 ? "var(--green)" : "var(--red)"; }
  } catch (e) {
    if (btn) { btn.textContent = "💾 Lưu"; btn.disabled = false; }
    showNotif("❌ Lỗi lưu: " + (e.message || "thử lại"), "error");
  }
}
window.saveFruitStock = saveFruitStock;

async function saveAllFruitStock() {
  guardAdmin();
  const fruits = getServices().filter(s => s.category === "fruit");
  let ok = 0, err = 0;
  for (const svc of fruits) {
    const input = document.getElementById(`fstock-input-${svc.id}`);
    if (!input) continue;
    const qty  = Math.max(0, parseInt(input.value) || 0);
    const key  = String(svc.id);
    try {
      const data = { qty, updatedAt: Date.now() };
      await setDoc(doc(db, "fruitstock", key), data, { merge: true });
      _fruitStockAdminData[key] = data;
      ok++;
    } catch { err++; }
  }
  showNotif(err === 0 ? `✅ Đã lưu ${ok} loại trái!` : `Lưu ${ok} OK, ${err} lỗi`, "success");
  renderFruitStockAdmin();
}
window.saveAllFruitStock = saveAllFruitStock;

async function setAllOutOfStock() {
  guardAdmin();
  if (!confirm("Đặt hết hàng tất cả trái ác quỷ?")) return;
  const fruits = getServices().filter(s => s.category === "fruit");
  const now    = Date.now();
  try {
    for (const svc of fruits) {
      const key  = String(svc.id);
      const data = { qty: 0, updatedAt: now };
      await setDoc(doc(db, "fruitstock", key), data, { merge: true });
      _fruitStockAdminData[key] = data;
    }
    renderFruitStockAdmin();
    showNotif("✅ Đã đặt hết hàng tất cả!", "success");
  } catch (e) { showNotif("Lỗi: " + e.message, "error"); }
}
window.setAllOutOfStock = setAllOutOfStock;

// ============================================================
// ===== IMAGE UPLOAD HELPERS ================================
// ============================================================
function handleImgUpload(fileInputId, urlInputId, previewId) {
  const file = document.getElementById(fileInputId)?.files?.[0];
  if (!file) return;
  if (file.size > 5_000_000) { showNotif("Ảnh quá lớn! Chọn ảnh dưới 5MB", "error"); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const W = 800, H = 600, srcR = img.width / img.height, tgtR = W / H;
      let sx, sy, sw, sh;
      if (srcR > tgtR) { sh = img.height; sw = sh * tgtR; sx = (img.width - sw) / 2; sy = 0; }
      else             { sw = img.width;  sh = sw / tgtR; sx = 0; sy = (img.height - sh) / 2; }
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      canvas.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
      const base64 = canvas.toDataURL("image/jpeg", 0.88);
      const urlEl  = document.getElementById(urlInputId);
      const prev   = document.getElementById(previewId);
      if (urlEl) urlEl.value = base64;
      if (prev)  { prev.src = base64; prev.style.display = "block"; prev.style.height = "120px"; prev.style.objectFit = "cover"; }
      showNotif("✅ Ảnh đã được cân chỉnh 4:3", "success");
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function previewFromUrl(urlInputId, previewId) {
  const url  = document.getElementById(urlInputId)?.value.trim();
  const prev = document.getElementById(previewId);
  if (!prev) return;
  if (url?.startsWith("http")) { prev.src = url; prev.style.display = "block"; prev.onerror = () => (prev.style.display = "none"); }
  else prev.style.display = "none";
}
window.handleImgUpload = handleImgUpload;
window.previewFromUrl  = previewFromUrl;

// ============================================================
// ===== MODAL HELPERS (expose cho onclick trong HTML) =======
// ============================================================
window.openModal  = openModal;
window.closeModal = closeModal;
