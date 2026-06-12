/**
 * app.js – Thanh Minh Các
 *
 * === ROOT CAUSE FIXES ===
 * FIX-A [SyntaxError 'http' / crash toàn bộ JS]:
 *   Bỏ `import { DH_LOGOS } from "./title-logos.js"` – file title-logos.js
 *   thiếu keyword `export const` nên parse thất bại, crash toàn bộ module.
 *   Thay bằng titleLogo() dùng emoji fallback – không phụ thuộc file ngoài.
 *
 * FIX-B [Profile trống + History lỗi failed-precondition]:
 *   Nguyên nhân gốc: Security Rules thiếu `||` → Firestore từ chối read.
 *   Rules đúng đã được cung cấp ra chat. Ngoài ra fetchUserData() thêm
 *   fallback query where("uid","==",uid) nếu getDoc trực tiếp thất bại.
 *
 * FIX-C [Admin update không phản ánh cho user]:
 *   Services/Categories dùng localStorage → mỗi trình duyệt có bản riêng.
 *   Thêm startConfigListener() lắng nghe Firestore collection system_configs
 *   realtime. Admin ghi → user thấy ngay không cần reload.
 *
 * FIX-D [Số dư sau giao dịch không sync]:
 *   Sau submitOrder/openBuyTitle, gọi fetchUserData() để re-sync balance.
 */

import { db, auth } from "./firebase-config.js";
// Import DH_LOGOS với cache-bust để tránh trình duyệt load file cũ từ cache
import { DH_LOGOS } from "./title-logos.js?v=2";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ============================================================
// ===== CONFIG ===============================================
// ============================================================
const ADMIN_UID         = "dZ1j9g4vVcSDlGDtRIEkQlY7Vbt1";
const TITLE_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const SERVICES_VERSION  = "6.0";

const TITLES = [
  { id:"luyen-khi",  name:"Luyện Khí",   price:0,      cls:"dh-luyen-khi",  icon:"🟦", discount:0,  minOrder:0,      permanent:true, free:true,   desc:"Mặc định cho mọi khách — không có ưu đãi" },
  { id:"truc-co",    name:"Trúc Cơ",     price:9900,   cls:"dh-truc-co",    icon:"🟩", discount:5,  minOrder:25000,                   desc:"Giảm 5% cho đơn từ 25,000đ · Hiệu lực 30 ngày" },
  { id:"kim-dan",    name:"Kim Đan",     price:19900,  cls:"dh-kim-dan",    icon:"🟧", discount:8,  minOrder:30000,                   desc:"Giảm 8% cho đơn từ 30,000đ · Hiệu lực 30 ngày" },
  { id:"nguyen-anh", name:"Nguyên Anh",  price:29900,  cls:"dh-nguyen-anh", icon:"🟪", discount:10, minOrder:50000,                   desc:"Giảm 10% cho đơn từ 50,000đ · Hiệu lực 30 ngày" },
  { id:"hoa-than",   name:"Hoá Thần",    price:49900,  cls:"dh-hoa-than",   icon:"🩷", discount:12, minOrder:50000,                   desc:"Giảm 12% cho đơn từ 50,000đ · Hiệu lực 30 ngày" },
  { id:"luyen-hu",   name:"Luyện Hư",    price:59900,  cls:"dh-luyen-hu",   icon:"🔷", discount:15, minOrder:60000,                   desc:"Giảm 15% cho đơn từ 60,000đ · Hiệu lực 30 ngày" },
  { id:"hop-the",    name:"Hợp Thể",     price:79900,  cls:"dh-hop-the",    icon:"🌟", discount:17, minOrder:70000,  featured:true,   desc:"Giảm 17% cho đơn từ 70,000đ · Hiệu lực 30 ngày" },
  { id:"dai-thua",   name:"Đại Thừa",    price:129000, cls:"dh-dai-thua",   icon:"❄️", discount:20, minOrder:100000,                  desc:"Giảm 20% cho đơn từ 100,000đ · Hiệu lực 30 ngày" },
  { id:"do-kiep",    name:"Độ Kiếp",     price:189000, cls:"dh-do-kiep",    icon:"⚡", discount:25, minOrder:125000,                  desc:"Giảm 25% cho đơn từ 125,000đ · Hiệu lực 30 ngày" },
  { id:"dai-de",     name:"Đại Đế Cảnh", price:0,      cls:"dh-dai-de",     icon:"👑", discount:100,minOrder:0, permanent:true, adminOnly:true, desc:"✦ Miễn 100% mọi dịch vụ · Vĩnh viễn · Chỉ chủ shop cấp" }
];

const CATEGORIES = {
  race:"👤 Lấy Tộc","race-upgrade":"⬆️ Up Tộc V2-V3","race-v4":"🔥 Tộc V4 (Gạt Cần)",
  gear:"⚙️ Nâng Gear V4",draco:"🐉 Up Draco",fruit:"🍎 Trái Ác Quỷ",other:"📦 Khác"
};

const SERVICE_OPTIONS = {
  "race-basic":{label:"Chọn tộc muốn lấy",options:["Human","Angel","Shark","Mink"]},
  "upgrade-v2-du":{label:"Chọn tộc cần up",options:["Human","Angel","Shark","Mink","Ghoul","Cyborg"]},
  "upgrade-v2-thieu":{label:"Chọn tộc cần up",options:["Human","Angel","Shark","Mink","Ghoul","Cyborg"]},
  "upgrade-v3-du":{label:"Chọn tộc cần up",options:["Human","Angel","Shark","Mink","Ghoul","Cyborg"]},
  "upgrade-v3-thieu":{label:"Chọn tộc cần up",options:["Human","Angel","Shark","Mink","Ghoul","Cyborg"]},
  "upgrade-vip-v2v3":{label:"Chọn tộc cần up",options:["Human","Angel","Shark","Mink","Ghoul","Cyborg"]},
  "upgrade-vip-all":{label:"Chọn tộc cần up",options:["Human","Angel","Shark","Mink","Ghoul","Cyborg"]},
  "gear-qca-du-g1":{label:"Chọn tộc",options:["Quỷ","Cá","Human"]},"gear-qca-du-g2":{label:"Chọn tộc",options:["Quỷ","Cá","Human"]},
  "gear-qca-du-g3":{label:"Chọn tộc",options:["Quỷ","Cá","Human"]},"gear-qca-du-g4":{label:"Chọn tộc",options:["Quỷ","Cá","Human"]},
  "gear-qca-du-vip":{label:"Chọn tộc",options:["Quỷ","Cá","Human"]},"gear-qca-du-g5":{label:"Chọn tộc",options:["Quỷ","Cá","Human"]},
  "gear-qca-thieu-g1":{label:"Chọn tộc",options:["Quỷ","Cá","Human"]},"gear-qca-thieu-g2":{label:"Chọn tộc",options:["Quỷ","Cá","Human"]},
  "gear-qca-thieu-g3":{label:"Chọn tộc",options:["Quỷ","Cá","Human"]},"gear-qca-thieu-g4":{label:"Chọn tộc",options:["Quỷ","Cá","Human"]},
  "gear-qca-thieu-vip":{label:"Chọn tộc",options:["Quỷ","Cá","Human"]},"gear-qca-thieu-g5":{label:"Chọn tộc",options:["Quỷ","Cá","Human"]},
  "gear-mac-du-g1":{label:"Chọn tộc",options:["Mink","Angel","Cyborg"]},"gear-mac-du-g2":{label:"Chọn tộc",options:["Mink","Angel","Cyborg"]},
  "gear-mac-du-g3":{label:"Chọn tộc",options:["Mink","Angel","Cyborg"]},"gear-mac-du-g4":{label:"Chọn tộc",options:["Mink","Angel","Cyborg"]},
  "gear-mac-du-vip":{label:"Chọn tộc",options:["Mink","Angel","Cyborg"]},"gear-mac-du-g5":{label:"Chọn tộc",options:["Mink","Angel","Cyborg"]},
  "gear-mac-thieu-g1":{label:"Chọn tộc",options:["Mink","Angel","Cyborg"]},"gear-mac-thieu-g2":{label:"Chọn tộc",options:["Mink","Angel","Cyborg"]},
  "gear-mac-thieu-g3":{label:"Chọn tộc",options:["Mink","Angel","Cyborg"]},"gear-mac-thieu-g4":{label:"Chọn tộc",options:["Mink","Angel","Cyborg"]},
  "gear-mac-thieu-vip":{label:"Chọn tộc",options:["Mink","Angel","Cyborg"]},"gear-mac-thieu-g5":{label:"Chọn tộc",options:["Mink","Angel","Cyborg"]},
  "draco-mas-1item-x2":{label:"Chọn item cần cày",options:["Dragon Talon","Thương Rồng","Súng Rồng"]},
  "draco-mas-1item-nox2":{label:"Chọn item cần cày",options:["Dragon Talon","Thương Rồng","Súng Rồng"]},
  "draco-dao-du-1":{label:"Chọn gear",options:["Gear 1","Gear 2","Gear 3","Gear 4"]}
};

const DEFAULT_IMAGES = {
  race:"https://i.pinimg.com/736x/a7/c5/9e/a7c59e09c734e40ee10e93e0a6467a46.jpg",
  "race-upgrade":"https://i.pinimg.com/736x/2a/62/78/2a62782e42ae1068d753fcf7ecbfb498.jpg",
  "race-v4":"https://i.pinimg.com/736x/34/8d/4f/348d4f0ac0e0a4e3bc6cc51c6be964ea.jpg",
  gear:"https://i.pinimg.com/736x/d8/2a/91/d82a91ee7ee430ca56b36e5fe5e2e3e8.jpg",
  draco:"https://i.pinimg.com/736x/ce/bf/d7/cebfd756e47f63f23f0c8cf0f0a85100.jpg",
  fruit:"https://i.pinimg.com/564x/0c/29/ab/0c29abf7d3a49b1c30de3e71e8d51354.jpg",
  other:"https://i.pinimg.com/736x/a7/c5/9e/a7c59e09c734e40ee10e93e0a6467a46.jpg"
};
const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect fill='%231e0a3c' width='400' height='200'/%3E%3Ctext x='50%25' y='50%25' fill='%23c44dff' text-anchor='middle' dominant-baseline='middle' font-size='50'%3E%F0%9F%8E%AE%3C/text%3E%3C/svg%3E";

// ============================================================
// ===== STATE ================================================
// ============================================================
let currentUser       = null;
let currentUserData   = null;
let currentOrderSvc   = null;
let selectedSubOption = null;
let historyFilter     = "all";
let selectedCardType  = "Viettel";

// FIX-A: không dùng DH_LOGOS nữa, dùng emoji trực tiếp
// FIX-C: config listener từ Firestore
let _configListener     = null;
let _orderListener      = null;
let _fruitStockListener = null;
let _knownOrderStatus   = {};
let _fruitStockCache    = {};

// Cache config từ Firestore
const _configCache = { services: null, categories: null, settings: {}, codes: [] };

// ============================================================
// ===== FIX-A: titleLogo() dùng emoji – không import SVG ====
// ============================================================
function titleLogo(t, size = 40) {
  return `<span style="font-size:${size}px;line-height:1">${t.icon}</span>`;
}

// ============================================================
// ===== FIX-C: SYSTEM_CONFIGS TỪFIRESTORE (realtime) ========
// ============================================================
function startConfigListener() {
  if (_configListener) return;
  _configListener = onSnapshot(
    collection(db, "system_configs"),
    snap => {
      snap.forEach(d => {
        const data = d.data();
        if (d.id === "services")   _configCache.services   = data.list || null;
        if (d.id === "categories") _configCache.categories = data.list || null;
        if (d.id === "settings")   _configCache.settings   = data;
        if (d.id === "codes")      _configCache.codes      = data.list || [];
      });
      // Cập nhật UI khi admin thay đổi config
      renderServices();
      applyVideoSetting();
    },
    () => {} // Lỗi mạng – bỏ qua, dùng localStorage fallback
  );
}

function getServices() {
  if (_configCache.services) return _configCache.services;
  const ver = localStorage.getItem("tmc_services_ver");
  if (ver !== SERVICES_VERSION) {
    localStorage.removeItem("tmc_services");
    localStorage.removeItem("tmc_categories");
    localStorage.setItem("tmc_services_ver", SERVICES_VERSION);
  }
  const raw = localStorage.getItem("tmc_services");
  if (raw) return JSON.parse(raw);
  const d = getDefaultServices();
  localStorage.setItem("tmc_services", JSON.stringify(d));
  return d;
}
function saveServices(svcs) {
  localStorage.setItem("tmc_services", JSON.stringify(svcs));
  if (_configCache.services) _configCache.services = svcs;
}

function getCustomCategories() {
  if (_configCache.categories) return _configCache.categories;
  const raw = localStorage.getItem("tmc_categories");
  if (raw) return JSON.parse(raw);
  const cats = Object.entries(CATEGORIES).map(([key, name]) => ({
    key, name, icon: name.match(/^\S+/)?.[0] || "📦", image: DEFAULT_IMAGES[key] || ""
  }));
  localStorage.setItem("tmc_categories", JSON.stringify(cats));
  return cats;
}
function saveCustomCategories(cats) {
  localStorage.setItem("tmc_categories", JSON.stringify(cats));
  if (_configCache.categories) _configCache.categories = cats;
}

function getShopSettings() {
  if (_configCache.settings && Object.keys(_configCache.settings).length) return _configCache.settings;
  return JSON.parse(localStorage.getItem("tmc_settings") || "{}");
}
function saveShopSettings(s) { localStorage.setItem("tmc_settings", JSON.stringify(s)); }

// ============================================================
// ===== TIỆN ÍCH =============================================
// ============================================================
const formatPrice = p => new Intl.NumberFormat("vi-VN").format(p) + "đ";

function generateOrderId() {
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "TMC-";
  for (let i = 0; i < 6; i++) id += c[Math.floor(Math.random() * c.length)];
  return id;
}

const isAdmin = () => currentUser && currentUser.uid === ADMIN_UID;

/**
 * FIX-B: Đọc user document theo uid.
 * Thêm fallback query phòng khi doc path khác uid (legacy data).
 */
async function fetchUserData(uid) {
  // Bước 1: đọc thẳng theo doc ID = uid (O(1), không cần index)
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) return snap.data();
  } catch (e) {
    console.warn("TMC fetchUserData getDoc:", e.code);
  }
  // Bước 2: fallback query field uid (dữ liệu legacy có thể dùng username làm doc ID)
  try {
    const qs = await getDocs(query(collection(db, "users"), where("uid", "==", uid)));
    if (!qs.empty) return qs.docs[0].data();
  } catch (e) {
    console.warn("TMC fetchUserData query:", e.code);
  }
  return null;
}

async function updateUserData(uid, data) {
  await updateDoc(doc(db, "users", uid), data);
}

// ============================================================
// ===== NOTIFICATION =========================================
// ============================================================
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

// ============================================================
// ===== MODAL ================================================
// ============================================================
function openModal(id)  { document.getElementById(id)?.classList.add("show"); }
function closeModal(id) { document.getElementById(id)?.classList.remove("show"); }
window.openModal  = openModal;
window.closeModal = closeModal;

document.querySelectorAll(".modal-overlay").forEach(o =>
  o.addEventListener("click", e => { if (e.target === o) o.classList.remove("show"); })
);

function togglePw(id, btn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.type = el.type === "password" ? "text" : "password";
  btn.textContent = el.type === "password" ? "👁️" : "🙈";
}
window.togglePw = togglePw;

// ============================================================
// ===== SAKURA ===============================================
// ============================================================
(function initSakura() {
  const c = document.getElementById("sakuraContainer");
  if (!c) return;
  c.innerHTML = "";
  const isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 600;
  const count = isMobile ? 5 : 12;
  const emojis = ["🌸","🌸","🌸","💮","🌸"];
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "sakura";
    p.textContent = emojis[i % emojis.length];
    const dur = 9 + Math.random() * 10;
    p.style.cssText = `left:${Math.random()*100}%;font-size:${10+Math.random()*12}px;animation-duration:${dur}s;animation-delay:${-(Math.random()*dur)}s;opacity:${0.35+Math.random()*0.55};`;
    c.appendChild(p);
  }
})();

window.addEventListener("scroll", () =>
  document.getElementById("header")?.classList.toggle("scrolled", window.scrollY > 50)
);

// ============================================================
// ===== AUTH =================================================
// ============================================================
async function handleRegister() {
  const username   = document.getElementById("regUser")?.value.trim();
  const emailInput = document.getElementById("regEmail")?.value.trim();
  const facebook   = document.getElementById("regFacebook")?.value.trim();
  const pass       = document.getElementById("regPass")?.value;
  const pass2      = document.getElementById("regPass2")?.value;

  const showErr = msg => {
    let el = document.getElementById("regErrorMsg");
    if (!el) {
      el = document.createElement("div");
      el.id = "regErrorMsg";
      el.style.cssText = "background:rgba(255,71,87,.12);border:1px solid rgba(255,71,87,.4);border-radius:10px;padding:8px 14px;font-size:.8rem;color:var(--red);font-weight:600;margin-bottom:12px;text-align:center";
      document.querySelector("#registerModal .btn-modal-submit")?.before(el);
    }
    el.textContent = "❌ " + msg; el.style.display = "block";
  };
  const clearErr = () => { const el = document.getElementById("regErrorMsg"); if (el) el.style.display = "none"; };
  clearErr();

  if (!username || username.length < 2)        return showErr("Tên đăng nhập ít nhất 2 ký tự!");
  if (emailInput && !emailInput.includes("@"))  return showErr("Email không hợp lệ!");
  if (!pass || pass.length < 6)                 return showErr("Mật khẩu ít nhất 6 ký tự!");
  if (pass !== pass2)                           return showErr("Mật khẩu nhập lại không khớp!");

  const btn = document.getElementById("regSubmitBtn");
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Đang đăng ký..."; }

  try {
    const dup = await getDocs(query(collection(db, "users"), where("username", "==", username)));
    if (!dup.empty) { showErr("Tên đăng nhập đã tồn tại!"); return; }

    const safeSlug  = username.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 30) || "user";
    const authEmail = emailInput || `${safeSlug}@tmccaythue.com`;

    const cred = await createUserWithEmailAndPassword(auth, authEmail, pass);
    const uid  = cred.user.uid;
    await updateProfile(cred.user, { displayName: username });

    await setDoc(doc(db, "users", uid), {
      uid, username,
      email: emailInput || "", facebook: facebook || "",
      titleOverride: null, titleGrantedAt: 0, titleExpiry: 0,
      balance: 0, role: "user",
      createdAt: new Date().toLocaleString("vi-VN"), createdAtTs: Date.now()
    });

    ["regUser","regEmail","regFacebook","regPass","regPass2"]
      .forEach(id => { const e = document.getElementById(id); if (e) e.value = ""; });
    clearErr();
    closeModal("registerModal");
    showNotif("🎉 Đăng ký thành công! Đang đăng nhập…", "success");

  } catch (e) {
    if      (e.code === "auth/email-already-in-use") showErr("Email này đã được dùng!");
    else if (e.code === "auth/weak-password")        showErr("Mật khẩu quá yếu!");
    else if (e.code === "auth/invalid-email")        showErr("Tên chứa ký tự không hợp lệ.");
    else                                             showErr("Lỗi: " + (e.message || "thử lại!"));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "✦ Đăng Ký"; }
  }
}
window.handleRegister = handleRegister;

async function handleLogin() {
  const nameInput = document.getElementById("loginUser")?.value.trim();
  const pass      = document.getElementById("loginPass")?.value;
  if (!nameInput || !pass) { showNotif("Vui lòng điền đầy đủ!", "error"); return; }

  const btn = document.getElementById("loginSubmitBtn");
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Đang đăng nhập..."; }

  try {
    let loginEmail  = nameInput;
    let displayName = nameInput;

    if (!nameInput.includes("@")) {
      const snap = await getDocs(query(collection(db, "users"), where("username", "==", nameInput)));
      if (!snap.empty) {
        const ud = snap.docs[0].data();
        displayName = ud.username || nameInput;
        const stored = ud.email || "";
        loginEmail = (stored && stored.includes("@") && !stored.includes("@tmc.internal") && !stored.includes("@tmccaythue.com"))
          ? stored
          : `${nameInput.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0,30)}@tmccaythue.com`;
      } else {
        loginEmail = `${nameInput.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0,30)}@tmccaythue.com`;
      }
    }

    await signInWithEmailAndPassword(auth, loginEmail, pass);
    closeModal("loginModal");
    ["loginUser","loginPass"].forEach(id => { const e = document.getElementById(id); if (e) e.value = ""; });
    showNotif(auth.currentUser?.uid === ADMIN_UID ? "🔥 Chào Thanh Minh Các Chủ!" : `👋 Chào ${displayName}! 🎮`, "success");

  } catch (e) {
    if      (e.code === "auth/user-not-found" || e.code === "auth/invalid-credential")
                                                showNotif("❌ Sai tên đăng nhập hoặc mật khẩu!", "error");
    else if (e.code === "auth/wrong-password") showNotif("❌ Sai mật khẩu!", "error");
    else if (e.code === "auth/too-many-requests") showNotif("⏳ Quá nhiều lần thử! Chờ vài phút.", "error");
    else                                        showNotif("❌ Lỗi: " + (e.message || "thử lại!"), "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "✦ Đăng Nhập"; }
  }
}
window.handleLogin = handleLogin;

async function logoutUser() {
  stopOrderListener();
  stopFruitStockListener();
  await signOut(auth);
  currentUser = null; currentUserData = null;
  showNotif("Đã đăng xuất", "info");
  updateNav(); showHome();
}
window.logoutUser = logoutUser;

// FIX-B: onAuthStateChanged dùng fetchUserData() có fallback
onAuthStateChanged(auth, async fbUser => {
  if (fbUser) {
    currentUser     = fbUser;
    currentUserData = await fetchUserData(fbUser.uid);
    updateNav();
    if (!isAdmin()) startOrderListener(fbUser.uid);
    startFruitStockListener();
  } else {
    currentUser = null; currentUserData = null;
    stopOrderListener(); stopFruitStockListener();
    updateNav();
  }
  renderServices();
  applyVideoSetting();
  loadTopNap();
});

// ============================================================
// ===== NAV ==================================================
// ============================================================
function updateNav() {
  const on  = !!currentUser;
  const adm = isAdmin();
  const usr = on && !adm;
  const s = (id, show) => { const e = document.getElementById(id); if (e) e.style.display = show ? "" : "none"; };
  s("navLoginBtn",    !on); s("navRegisterBtn", !on);
  s("navLogoutBtn",   on);  s("navHistoryBtn",  usr);
  s("navCardBtn",     usr); s("navAdminBtn",    adm);
  s("navUserBadge",   usr);

  if (usr && currentUserData) {
    const name = currentUserData.username || currentUser.displayName || currentUser.email;
    const av   = document.getElementById("navAvatar");
    const un   = document.getElementById("navUsername");
    const b    = document.getElementById("navTitleBadge");
    if (av) av.textContent = name[0].toUpperCase();
    if (un) un.textContent = name;
    const t = currentUserData.titleOverride ? TITLES.find(x => x.id === currentUserData.titleOverride) : null;
    if (b)  b.textContent = t ? `${t.icon} ${t.name}` : "";
  }
}

// ============================================================
// ===== PANELS ===============================================
// ============================================================
function hideAllPanels() {
  const mc = document.getElementById("mainContent");
  if (mc) mc.style.display = "none";
  ["adminPanel","historyPanel","profilePanel","cardPanel"]
    .forEach(id => document.getElementById(id)?.classList.remove("show"));
}
function showHome() {
  hideAllPanels();
  const mc = document.getElementById("mainContent");
  if (mc) mc.style.display = "block";
  window.scrollTo({ top:0, behavior:"smooth" });
}
function showHistory() {
  if (!currentUser || isAdmin()) { showNotif("Đăng nhập để xem lịch sử","error"); return; }
  hideAllPanels();
  document.getElementById("historyPanel")?.classList.add("show");
  loadAndRenderHistory();
  window.scrollTo({ top:0, behavior:"smooth" });
}
function showProfile() {
  if (!currentUser || isAdmin()) return;
  hideAllPanels();
  document.getElementById("profilePanel")?.classList.add("show");
  renderProfile();
  window.scrollTo({ top:0, behavior:"smooth" });
}
function showAdmin() {
  if (!isAdmin()) return;
  hideAllPanels();
  document.getElementById("adminPanel")?.classList.add("show");
  if (typeof window.loadAdminData === "function") window.loadAdminData();
  window.scrollTo({ top:0, behavior:"smooth" });
}
function showCardPanel() {
  if (!currentUser || isAdmin()) { showNotif("Đăng nhập để nạp thẻ","error"); return; }
  hideAllPanels();
  document.getElementById("cardPanel")?.classList.add("show");
  loadCardHistory();
  window.scrollTo({ top:0, behavior:"smooth" });
}
window.showHome=showHome; window.showHistory=showHistory; window.showProfile=showProfile;
window.showAdmin=showAdmin; window.showCardPanel=showCardPanel;

// ============================================================
// ===== VIDEO ================================================
// ============================================================
function getYoutubeEmbedUrl(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=0` : null;
}
function applyVideoSetting() {
  const s = getShopSettings();
  const b = document.getElementById("videoBanner");
  const f = document.getElementById("videoFrame");
  if (!b || !f) return;
  if (s.videoUrl) { const e = getYoutubeEmbedUrl(s.videoUrl); if (e) { f.src = e; b.style.display="block"; return; } }
  b.style.display = "none"; f.src = "";
}
function saveVideoSetting() {
  const url = document.getElementById("settingsVideoUrl")?.value.trim();
  const s = getShopSettings(); s.videoUrl = url; saveShopSettings(s);
  applyVideoSetting(); showNotif(url ? "✅ Đã lưu video!" : "✅ Đã tắt video","success");
}
function saveAnnounceSetting() {
  const t = document.getElementById("settingsAnnounce")?.value.trim();
  const s = getShopSettings(); s.announce = t; saveShopSettings(s);
  showNotif("✅ Đã lưu thông báo","success");
}
window.saveVideoSetting=saveVideoSetting; window.saveAnnounceSetting=saveAnnounceSetting;
window.applyVideoSetting=applyVideoSetting;

// ============================================================
// ===== SERVICES RENDER ======================================
// ============================================================
function renderServices() {
  const grid = document.getElementById("servicesGrid");
  if (!grid) return;
  const svcs = getServices();
  const loggedIn = !!(currentUser && !isAdmin());
  const cats = getCustomCategories();

  let html = `<div class="services-cat-grid">`;
  cats.forEach(({ key, name, image }) => {
    const catSvcs = svcs.filter(s => s.category === key).sort((a,b)=>(a.order||a.id)-(b.order||b.id));
    if (!catSvcs.length) return;
    const img  = image || DEFAULT_IMAGES[key] || DEFAULT_IMAGES.other;
    const fruit = key === "fruit";
    const vip   = catSvcs.some(s => s.badge==="vip"||s.badge==="svip");
    const fb    = fruit ? `<div id="catcard-fruit-stock-badge" style="position:absolute;bottom:8px;left:8px;padding:3px 8px;border-radius:8px;background:rgba(26,10,46,.85);border:1px solid rgba(196,77,255,.4);font-size:.65rem;font-weight:700;color:var(--accent);backdrop-filter:blur(4px)">🍎 ...</div>` : "";
    html += `<div class="cat-card" id="catcard-${key}" onclick="openCatPanel('${key}')">
      <div class="cat-card-img-wrap" style="position:relative">
        <img src="${img}" alt="${name}" onerror="this.src='${FALLBACK_IMG}'">
        <div class="cat-card-overlay"></div>
        ${vip?`<div style="position:absolute;top:8px;right:8px;padding:3px 8px;border-radius:8px;background:rgba(255,215,0,.2);border:1px solid rgba(255,215,0,.4);font-size:.65rem;font-weight:700;color:var(--gold)">⭐ VIP</div>`:""}
        ${fb}
      </div>
      <div class="cat-card-info">
        <div class="cat-card-title">${name}</div>
        <div class="cat-card-count">${catSvcs.length} gói dịch vụ</div>
        <div class="cat-card-btn">Xem &amp; Đặt →</div>
      </div>
    </div>`;
  });
  html += `</div>`;

  cats.forEach(({ key, name }) => {
    const catSvcs = svcs.filter(s => s.category === key).sort((a,b)=>(a.order||a.id)-(b.order||b.id));
    if (!catSvcs.length) return;
    const fruit = key === "fruit";
    html += `<div class="cat-panel" id="catpanel-${key}" style="display:none">
      <div class="cat-panel-header">
        <button class="cat-panel-back" onclick="closeCatPanel('${key}')">← Quay lại</button>
        <span class="cat-panel-title">${name}</span>
      </div>
      ${fruit?`<div id="fruitStockHeader-${key}" style="margin-bottom:12px"></div>`:""}
      <div class="svc-list">
        ${catSvcs.map(svc => {
          const sv = svc.badge==="svip", v = svc.badge==="vip";
          const rc = sv?"svc-row svc-row-svip":v?"svc-row svc-row-vip":"svc-row";
          const bc = sv?"btn-order-row btn-order-row-svip":v?"btn-order-row btn-order-row-vip":"btn-order-row";
          const bl = sv?"badge-svip":v?"badge-vip":"", bt = sv?"SSVIP":v?"VIP":"";
          const sb = fruit?`<span class="fruit-stock-badge" id="fstock-badge-${svc.id}">⏳</span>`:"";
          return `<div class="${rc}" id="svc-row-${svc.id}">
            <div class="svc-row-info">
              <div class="svc-row-name">${svc.name}${bt?` <span class="svc-row-badge ${bl}">${bt}</span>`:""}${sb}</div>
              <div class="svc-row-desc">${svc.desc}</div>
            </div>
            <div class="svc-row-price">${formatPrice(svc.price)}</div>
            <button class="${bc}" id="svc-btn-${svc.id}" ${!loggedIn?"disabled":""} onclick="openOrderModal(${svc.id})">
              ${!loggedIn?"🔒":"🛒 Đặt"}
            </button>
          </div>`;
        }).join("")}
      </div>
    </div>`;
  });

  grid.innerHTML = html;
  applyFruitStockToUI();
}

function openCatPanel(k) {
  const g = document.querySelector(".services-cat-grid");
  if (g) g.style.display = "none";
  const p = document.getElementById(`catpanel-${k}`);
  if (p) { p.style.display="block"; p.scrollIntoView({behavior:"smooth",block:"start"}); if(k==="fruit") applyFruitStockToUI(); }
}
function closeCatPanel(k) {
  const p = document.getElementById(`catpanel-${k}`); if(p) p.style.display="none";
  const g = document.querySelector(".services-cat-grid"); if(g) g.style.display="grid";
}
window.openCatPanel=openCatPanel; window.closeCatPanel=closeCatPanel;

// ============================================================
// ===== ORDER ================================================
// ============================================================
async function openOrderModal(svcId) {
  if (!currentUser || isAdmin()) { showNotif("Đăng nhập để đặt dịch vụ!","error"); openModal("loginModal"); return; }
  const svc = getServices().find(s => s.id === svcId);
  if (!svc) return;
  if (svc.category === "fruit") {
    const {inStock} = getFruitStock(svc.id);
    if (!inStock) { showNotif("❌ Trái này đang hết hàng!","error"); return; }
  }
  currentOrderSvc = svc; selectedSubOption = null;
  document.getElementById("orderServiceName").textContent  = svc.name;
  document.getElementById("orderServiceCode").textContent  = svc.code;
  document.getElementById("orderServicePrice").textContent = formatPrice(svc.price);
  document.getElementById("orderAccount").value  = "";
  document.getElementById("orderPassword").value = "";
  document.getElementById("orderNote").value     = "";
  const sw = document.getElementById("orderSubOptions");
  const opts = svc.slug ? SERVICE_OPTIONS[svc.slug] : null;
  if (opts) {
    sw.innerHTML = `<label class="sub-option-label">${opts.label}:</label>
      <div class="sub-option-grid">${opts.options.map(o=>`<button class="sub-option-btn" onclick="selectSubOption(this,'${o}')">${o}</button>`).join("")}</div>`;
    sw.style.display = "block";
  } else { sw.innerHTML=""; sw.style.display="none"; }
  openModal("orderModal");
}
function selectSubOption(btn, value) {
  document.querySelectorAll("#orderSubOptions .sub-option-btn").forEach(b=>b.classList.remove("selected"));
  btn.classList.add("selected"); selectedSubOption = value;
}
window.openOrderModal=openOrderModal; window.selectSubOption=selectSubOption;

async function submitOrder() {
  if (!currentUser || isAdmin()) return;
  const account  = document.getElementById("orderAccount")?.value.trim();
  const password = document.getElementById("orderPassword")?.value.trim();
  const note     = document.getElementById("orderNote")?.value.trim();
  if (!account)  { showNotif("Nhập tài khoản Roblox!","error"); return; }
  if (!password) { showNotif("Nhập mật khẩu Roblox!","error"); return; }
  const opts = currentOrderSvc.slug ? SERVICE_OPTIONS[currentOrderSvc.slug] : null;
  if (opts && !selectedSubOption) { showNotif("Vui lòng chọn "+opts.label.toLowerCase()+"!","error"); return; }

  let finalPrice = currentOrderSvc.price, discountInfo = "";
  if (currentUserData) {
    const di = getTitleDiscount(currentUserData);
    if (di.title && di.discount > 0 && finalPrice >= di.title.minOrder) {
      if (di.discount === 100) { finalPrice=0; discountInfo="👑 Đại Đế Cảnh — Miễn phí 100%"; }
      else { finalPrice=Math.round(finalPrice*(1-di.discount/100)); discountInfo=`${di.title.name} giảm ${di.discount}%`; }
    }
  }

  const balance = currentUserData?.balance || 0;
  if (balance < finalPrice) {
    showNotif(`❌ Số dư không đủ! Cần ${formatPrice(finalPrice)}, có ${formatPrice(balance)}.`,"error");
    return;
  }

  // Chống spam
  try {
    const rs = await getDocs(query(collection(db,"orders"),where("uid","==",currentUser.uid),where("serviceId","==",currentOrderSvc.id),where("account","==",account)));
    const dup = rs.docs.find(d=>(d.data().timestamp||0)>Date.now()-300000);
    if (dup) { showNotif(`⏳ Vừa đặt gói này! Chờ ${Math.ceil(((dup.data().timestamp+300000)-Date.now())/1000)}s.`,"error"); return; }
  } catch {}

  const orderId = generateOrderId();
  const order = {
    id:orderId, uid:currentUser.uid,
    username:currentUserData?.username||currentUser.displayName||currentUser.email,
    serviceId:currentOrderSvc.id, serviceName:currentOrderSvc.name, serviceCode:currentOrderSvc.code,
    price:finalPrice, origPrice:currentOrderSvc.price, discountInfo:discountInfo||null,
    subOption:selectedSubOption||null, account, password, note,
    time:new Date().toLocaleString("vi-VN"), timestamp:Date.now(),
    status:"pending", doneTime:null, doneMessage:null
  };

  const btn = document.getElementById("orderSubmitBtn");
  if (btn) { btn.disabled=true; btn.textContent="⏳ Đang đặt..."; }
  try {
    await setDoc(doc(db,"orders",orderId), order);
    await updateUserData(currentUser.uid, { balance: balance - finalPrice });
    // FIX-D: re-fetch để sync số dư mới
    currentUserData = await fetchUserData(currentUser.uid);
    closeModal("orderModal");
    showNotif(`🎉 Đặt đơn thành công! Mã: ${orderId}${discountInfo?" · "+discountInfo:""}`, "success");
  } catch (e) {
    showNotif("❌ Lỗi khi đặt đơn: "+(e.message||"thử lại!"),"error");
  } finally {
    if (btn) { btn.disabled=false; btn.textContent="🎯 Đặt Đơn"; }
  }
}
window.submitOrder = submitOrder;

// ============================================================
// ===== TITLE HELPERS ========================================
// ============================================================
function getTitleStatus(ud) {
  if (!ud?.titleOverride) return {active:false,expired:false,daysLeft:0};
  const t = TITLES.find(x=>x.id===ud.titleOverride);
  if (!t) return {active:false,expired:false,daysLeft:0};
  if (t.permanent||t.id==="luyen-khi") return {active:true,expired:false,daysLeft:Infinity,permanent:true};
  const exp = ud.titleExpiry||0;
  if (!exp) return {active:true,expired:false,daysLeft:30};
  const now = Date.now(), ms = exp-now;
  if (now>exp) return {active:false,expired:true,daysLeft:0,expiredDaysAgo:Math.ceil((now-exp)/86400000)};
  return {active:true,expired:false,daysLeft:Math.ceil(ms/86400000),expiry:exp,earlyRenew:Math.ceil(ms/86400000)<=3};
}
function getTitleDiscount(ud) {
  if (!ud?.titleOverride) return {discount:0,title:null};
  const t = TITLES.find(x=>x.id===ud.titleOverride);
  if (!t) return {discount:0,title:null};
  if (t.permanent) return {discount:t.discount,title:t};
  const s = getTitleStatus(ud);
  if (!s.active) return {discount:0,title:t,expired:true};
  return {discount:t.discount,title:t};
}
function getRenewalInfo(ud, titleId) {
  if (!ud?.titleOverride||ud.titleOverride!==titleId) return {type:"new",pct:100};
  const t = TITLES.find(x=>x.id===titleId);
  if (!t||t.permanent||t.adminOnly) return {type:"permanent",pct:0};
  const exp=ud.titleExpiry||0, now=Date.now(), D3=3*86400000;
  if (!exp) return {type:"new",pct:100};
  if (now<exp) return exp-now<=D3?{type:"grace",pct:50}:{type:"early",pct:40};
  if (now<exp+D3) return {type:"grace",pct:50};
  return {type:"full",pct:100};
}

// ============================================================
// ===== FIX-B: HISTORY – query đúng theo uid ================
// ============================================================
async function loadAndRenderHistory() {
  const el = document.getElementById("historyList");
  if (!el) return;
  el.innerHTML = `<div class="no-data"><p>⏳ Đang tải...</p></div>`;
  try {
    // Dùng field uid – khớp với Security Rules: resource.data.uid == request.auth.uid
    const snap = await getDocs(query(
      collection(db,"orders"),
      where("uid","==",currentUser.uid),
      orderBy("timestamp","desc")
    ));
    renderHistoryList(snap.docs.map(d=>({id:d.id,...d.data()})));
  } catch (e) {
    el.innerHTML = `<div class="no-data"><p>❌ Lỗi tải lịch sử: ${e.code||e.message}</p></div>`;
    console.error("loadAndRenderHistory:", e);
  }
}
function filterHistoryStatus(status, btn) {
  historyFilter = status;
  document.querySelectorAll(".history-filter-btn").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  loadAndRenderHistory();
}
function renderHistoryList(all) {
  const el   = document.getElementById("historyList");
  const list = historyFilter==="all" ? all : all.filter(o=>o.status===historyFilter);
  if (!list.length) { el.innerHTML=`<div class="no-data"><p>Chưa có đơn hàng nào</p></div>`; return; }
  el.innerHTML = list.map(o=>`
    <div class="history-card">
      <div class="hc-top"><div class="hc-id">${o.id}</div><div class="hc-time">${o.time}</div></div>
      <div class="hc-service">${o.serviceName}</div>
      <div style="font-size:.8rem;color:rgba(240,230,255,.5);margin-bottom:6px">
        TK: <strong style="color:var(--text)">${o.account}</strong>
        ${o.subOption?` | Chọn: <strong style="color:var(--accent)">${o.subOption}</strong>`:""}
        ${o.note?` | ${o.note}`:""}
      </div>
      <div class="hc-price">${formatPrice(o.price)}</div>
      <span class="hc-status ${o.status}">${o.status==="done"?"✅ Hoàn thành":"⏳ Đang xử lý"}</span>
      ${o.doneMessage?`<div class="hc-done-msg">${o.doneMessage}</div>`:""}
    </div>`).join("");
}
window.filterHistoryStatus = filterHistoryStatus;

// ============================================================
// ===== FIX-B: PROFILE – fetchUserData có fallback ==========
// ============================================================
async function renderProfile() {
  if (!currentUser) return;

  // FIX-B: Re-fetch fresh để đảm bảo có data dù Rules như thế nào
  const fresh = await fetchUserData(currentUser.uid);
  if (fresh) currentUserData = fresh;

  const user = currentUserData;
  if (!user) {
    const pc = document.getElementById("profileCard");
    if (pc) pc.innerHTML = `<div class="no-data"><p>❌ Không tải được hồ sơ.<br>Vui lòng thử lại hoặc kiểm tra Firestore Rules.</p></div>`;
    return;
  }

  // Đọc đơn hàng
  let orders = [];
  try {
    const os = await getDocs(query(collection(db,"orders"),where("uid","==",currentUser.uid),orderBy("timestamp","desc")));
    orders = os.docs.map(d=>({id:d.id,...d.data()}));
  } catch (e) { console.warn("renderProfile orders:", e.code); }

  const done       = orders.filter(o=>o.status==="done");
  const totalSpent = done.reduce((s,o)=>s+o.price,0);
  const title      = user.titleOverride ? TITLES.find(t=>t.id===user.titleOverride) : null;
  const status     = title ? getTitleStatus(user) : null;

  // Zeigarnik progress
  const autoT   = TITLES.filter(t=>!t.adminOnly).sort((a,b)=>(a.minOrder||0)-(b.minOrder||0));
  const nextT   = autoT.find(t=>totalSpent<(t.minOrder||0)&&!t.free);
  let progHtml  = "";
  if (nextT) {
    const prev    = autoT[autoT.indexOf(nextT)-1];
    const prevMin = prev?(prev.minOrder||0):0;
    const pct     = Math.min(100,Math.round((totalSpent-prevMin)/(nextT.minOrder-prevMin)*100));
    progHtml = `<div class="title-progress-bar">
      <div class="title-progress-label">Tiến trình → ${nextT.name}</div>
      <div class="title-progress-track"><div class="title-progress-fill" style="width:${pct}%"></div></div>
      <div class="title-progress-hint">✨ Còn ${formatPrice(nextT.minOrder-totalSpent)} nữa để đạt ${nextT.name}!</div>
    </div>`;
  }

  // FIX-D: Số dư hiển thị nổi bật
  const bal   = user.balance || 0;
  const bclr  = bal>0?"var(--green)":"rgba(240,230,255,.4)";
  const bbrd  = bal>0?"rgba(74,222,128,.4)":"rgba(255,255,255,.1)";
  const bbg   = bal>0?"rgba(74,222,128,.08)":"rgba(255,255,255,.03)";

  const pc = document.getElementById("profileCard");
  if (pc) pc.innerHTML = `
    <div class="profile-avatar">${user.username[0].toUpperCase()}</div>
    <div class="profile-name">${user.username}</div>
    ${title?`<span class="profile-title-badge ${title.cls}">${title.icon} ${title.name}</span>`
           :`<div style="color:rgba(240,230,255,.3);font-size:.8rem;margin-bottom:8px">Chưa có danh hiệu</div>`}
    <div class="profile-email">📧 ${user.email||"Chưa cập nhật"}</div>
    ${user.facebook?`<div class="profile-facebook">📘 ${user.facebook}</div>`:""}
    <div style="margin:14px 0 10px;padding:14px 20px;border-radius:14px;background:${bbg};border:1.5px solid ${bbrd};text-align:center">
      <div style="font-size:.72rem;color:rgba(240,230,255,.5);letter-spacing:.08em;margin-bottom:4px">💰 SỐ DƯ TÀI KHOẢN</div>
      <div style="font-family:'Orbitron',sans-serif;font-size:1.6rem;font-weight:700;color:${bclr};line-height:1.2">${formatPrice(bal)}</div>
      ${bal===0?`<div style="font-size:.7rem;color:rgba(240,230,255,.35);margin-top:4px">Nạp thẻ để thêm số dư</div>`:""}
    </div>
    <div class="profile-info-row">
      <div class="profile-info-item"><div class="profile-info-num">${orders.length}</div><div class="profile-info-label">Tổng Đơn</div></div>
      <div class="profile-info-item"><div class="profile-info-num">${done.length}</div><div class="profile-info-label">Đã Xong</div></div>
      <div class="profile-info-item"><div class="profile-info-num">${formatPrice(totalSpent)}</div><div class="profile-info-label">Đã Chi</div></div>
    </div>
    <div style="font-size:.72rem;color:rgba(240,230,255,.3);margin-top:12px">Tham gia: ${user.createdAt}</div>
    ${progHtml}
    ${buildExpiryHtml(user, title, status)}
  `;

  renderProfileExpiryBox(user);

  const suppEl = document.getElementById("profileContactSupp");
  if (suppEl) {
    const me = !user.email, mf = !user.facebook;
    suppEl.innerHTML = (me||mf)?`
      <div style="background:linear-gradient(135deg,rgba(255,215,0,.07),rgba(196,77,255,.05));border:1px solid rgba(255,215,0,.28);border-radius:14px;padding:16px 18px;margin-bottom:20px">
        <div style="font-weight:700;font-size:.9rem;color:var(--gold);margin-bottom:4px">📬 Bổ Sung Thông Tin Liên Hệ</div>
        <div style="font-size:.75rem;color:rgba(240,230,255,.6);margin-bottom:14px;line-height:1.6">Giúp chủ shop liên hệ bạn dễ dàng hơn.</div>
        ${me?`<div style="margin-bottom:10px"><label style="font-size:.72rem;color:rgba(240,230,255,.45);font-weight:600;display:block;margin-bottom:5px">📧 EMAIL</label><input id="suppEmailInput" class="modal-input" type="email" placeholder="email@example.com" style="margin-bottom:0"></div>`:""}
        ${mf?`<div><label style="font-size:.72rem;color:rgba(240,230,255,.45);font-weight:600;display:block;margin-bottom:5px">📘 FACEBOOK</label><input id="suppFbInput" class="modal-input" placeholder="Link hoặc tên Facebook" style="margin-bottom:0"></div>`:""}
        <button onclick="saveContactSupp()" style="margin-top:14px;width:100%;padding:10px;border-radius:10px;border:none;background:linear-gradient(135deg,var(--pink),var(--purple));color:#fff;font-family:'Quicksand',sans-serif;font-weight:700;font-size:.85rem;cursor:pointer">💾 Lưu Thông Tin</button>
      </div>`:"";
  }

  const ol = document.getElementById("profileOrderList");
  if (ol) {
    ol.innerHTML = !orders.length
      ? `<div class="no-data"><p>Chưa có đơn hàng nào</p></div>`
      : orders.slice(0,5).map(o=>`
          <div class="history-card">
            <div class="hc-top"><div class="hc-id">${o.id}</div><div class="hc-time">${o.time}</div></div>
            <div class="hc-service">${o.serviceName}</div>
            <div class="hc-price">${formatPrice(o.price)}</div>
            <span class="hc-status ${o.status}">${o.status==="done"?"✅ Hoàn thành":"⏳ Đang xử lý"}</span>
            ${o.doneMessage?`<div class="hc-done-msg">${o.doneMessage}</div>`:""}
          </div>`).join("");
  }
}

function renderProfileExpiryBox(user) {
  const el = document.getElementById("profileExpiryBox");
  if (!el) return;
  const t = user?.titleOverride ? TITLES.find(x=>x.id===user.titleOverride) : null;
  if (!t||t.adminOnly||t.free||t.id==="luyen-khi") { el.innerHTML=""; return; }
  const exp=user.titleExpiry||0, now=Date.now(), rem=exp-now, D3=3*86400000;
  const days=Math.ceil(rem/86400000);
  const r40=Math.round(t.price*.4), r50=Math.round(t.price*.5);
  let cls="title-expiry-box", cd="", rh="";
  if (rem>0) {
    if (rem<=D3) { cls+=" title-expiry-urgent"; cd=`<div class="expiry-countdown expiry-urgent-text">⚠️ Còn ${days} ngày hết hạn!</div>`; rh=`<div style="font-size:.72rem;color:rgba(240,230,255,.5);margin-bottom:8px">Gia hạn ngay 50% = ${formatPrice(r50)}</div><button class="btn-renew btn-renew-normal" onclick="openBuyTitle('${t.id}')">🔄 Gia Hạn Ngay</button>`; }
    else { cd=`<div class="expiry-countdown expiry-ok-text">✅ Còn ${days} ngày</div>`; rh=`<div style="font-size:.72rem;color:rgba(240,230,255,.5);margin-bottom:8px">Gia hạn sớm 40% = ${formatPrice(r40)}</div><button class="btn-renew btn-renew-early" onclick="openBuyTitle('${t.id}')">💚 Gia Hạn Sớm (-40%)</button>`; }
  } else {
    const od=Math.floor(-rem/86400000);
    if (-rem<=D3) { cls+=" title-expiry-urgent"; cd=`<div class="expiry-countdown expiry-urgent-text">⏰ Hết hạn ${od>0?od+" ngày trước":"hôm nay"}!</div>`; rh=`<div style="font-size:.72rem;color:rgba(240,230,255,.5);margin-bottom:8px">Gia hạn cửa sổ 3 ngày 50% = ${formatPrice(r50)}</div><button class="btn-renew btn-renew-normal" onclick="openBuyTitle('${t.id}')">🔄 Gia Hạn (50%)</button>`; }
    else { cls+=" title-expiry-expired"; cd=`<div class="expiry-countdown expiry-expired-text">❌ Hết hạn ${od} ngày trước</div>`; rh=`<div style="font-size:.72rem;color:rgba(240,230,255,.5);margin-bottom:8px">Phải mua lại giá gốc ${formatPrice(t.price)}</div><button class="btn-renew btn-renew-full" onclick="openBuyTitle('${t.id}')">🛒 Mua Lại Full Giá</button>`; }
  }
  el.innerHTML = `<div class="${cls}"><div style="font-size:.72rem;color:rgba(240,230,255,.45);margin-bottom:4px">⏱ HIỆU LỰC DANH HIỆU</div>${cd}<div style="margin-top:10px">${rh}</div></div>`;
}

function buildExpiryHtml(user, t, status) {
  if (!t||!t.price||t.permanent||t.adminOnly||t.id==="luyen-khi") return "";
  if (!status) return "";
  const r40 = Math.round(t.price*.4);
  if (status.permanent) return `<div style="margin-top:10px;padding:8px 14px;border-radius:10px;background:rgba(255,215,0,.08);border:1px solid rgba(255,215,0,.3);font-size:.75rem;color:var(--gold);text-align:center">👑 Vĩnh viễn · Miễn 100% mọi dịch vụ</div>`;
  if (status.expired) {
    const ri = getRenewalInfo(user, t.id);
    return `<div style="margin-top:10px;padding:10px 14px;border-radius:10px;background:rgba(255,71,87,.08);border:1px solid rgba(255,71,87,.35);font-size:.78rem;text-align:center">
      <div style="color:var(--red);font-weight:700;margin-bottom:6px">⚠️ Danh hiệu hết hạn ${status.expiredDaysAgo} ngày trước</div>
      <button onclick="openBuyTitle('${t.id}')" style="padding:7px 18px;border-radius:20px;border:none;background:linear-gradient(135deg,var(--pink),var(--purple));color:#fff;font-family:'Quicksand',sans-serif;font-weight:700;font-size:.78rem;cursor:pointer">
        ${ri.pct<100?`🔄 Gia hạn ${ri.pct}% = ${formatPrice(Math.round(t.price*ri.pct/100))}`:`🛒 Mua lại full = ${formatPrice(t.price)}`}
      </button></div>`;
  }
  const urg = status.daysLeft<=3, bc = urg?"#ff4757":status.daysLeft<=7?"#ffa502":"#4ade80";
  return `<div style="margin-top:10px;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid ${urg?"rgba(255,71,87,.4)":"rgba(74,222,128,.2)"};font-size:.78rem">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span style="color:rgba(240,230,255,.55);font-size:.7rem">⏳ Hiệu lực danh hiệu</span>
      <span style="font-weight:700;color:${bc}">${urg?"⚠️ ":""}Còn ${status.daysLeft} ngày</span>
    </div>
    <div style="height:4px;background:rgba(255,255,255,.08);border-radius:2px;margin-bottom:8px">
      <div style="height:4px;width:${Math.round(status.daysLeft/30*100)}%;background:${bc};border-radius:2px;transition:width .5s"></div>
    </div>
    ${urg?`<button onclick="openBuyTitle('${t.id}')" style="width:100%;padding:7px;border-radius:8px;border:none;background:linear-gradient(135deg,var(--pink),var(--purple));color:#fff;font-family:'Quicksand',sans-serif;font-weight:700;font-size:.78rem;cursor:pointer">🔄 Gia hạn sớm 40% = ${formatPrice(r40)}</button>`
         :`<div style="font-size:.7rem;color:rgba(240,230,255,.35);text-align:center">Gia hạn sớm (≤3 ngày cuối) chỉ 40% = ${formatPrice(r40)}</div>`}
  </div>`;
}

async function saveContactSupp() {
  if (!currentUser||isAdmin()) return;
  const email = document.getElementById("suppEmailInput")?.value.trim();
  const fb    = document.getElementById("suppFbInput")?.value.trim();
  if (email&&!email.includes("@")) { showNotif("Email không hợp lệ!","error"); return; }
  if (!email&&!fb) { showNotif("Điền ít nhất email hoặc Facebook!","error"); return; }
  const data={}; if(email) data.email=email; if(fb) data.facebook=fb;
  try {
    await updateUserData(currentUser.uid, data);
    currentUserData={...currentUserData,...data};
    showNotif("✅ Đã lưu thông tin liên hệ!","success");
    renderProfile();
  } catch { showNotif("Lỗi lưu thông tin!","error"); }
}
window.saveContactSupp = saveContactSupp;

// ============================================================
// ===== MUA DANH HIỆU ========================================
// ============================================================
async function openBuyTitle(titleId) {
  if (!currentUser||isAdmin()) { showNotif("Đăng nhập để mua danh hiệu!","error"); openModal("loginModal"); return; }
  const t = TITLES.find(x=>x.id===titleId);
  if (!t||t.adminOnly) return;
  if (t.free) { showNotif("Luyện Khí là danh hiệu mặc định, bạn đã có rồi!","info"); return; }
  const bal   = currentUserData?.balance||0;
  const ri    = getRenewalInfo(currentUserData, titleId);
  const price = Math.round(t.price*ri.pct/100);
  if (bal<price) { showNotif(`❌ Số dư không đủ! Cần ${formatPrice(price)}, có ${formatPrice(bal)}.`,"error"); return; }
  const msg = ri.type==="early"?`🔄 Gia hạn sớm "${t.name}"\n💚 40%: ${formatPrice(price)}\nCòn lại: ${formatPrice(bal-price)}`
            : ri.type==="grace"?`🔄 Gia hạn "${t.name}"\n✨ 50%: ${formatPrice(price)}\nCòn lại: ${formatPrice(bal-price)}`
            : `🛒 Mua "${t.icon} ${t.name}"\nGiá: ${formatPrice(price)}\nCòn lại: ${formatPrice(bal-price)}`;
  if (!confirm(msg)) return;
  try {
    await updateUserData(currentUser.uid, { balance: bal-price });
    await addDoc(collection(db,"titlepurchases"), {
      uid:currentUser.uid, username:currentUserData.username,
      titleId, titleName:t.name, price, origPrice:t.price, renewalType:ri.type,
      time:new Date().toLocaleString("vi-VN"), timestamp:Date.now(), status:"pending"
    });
    // FIX-D: sync số dư
    currentUserData = await fetchUserData(currentUser.uid);
    showNotif(`✅ Đã ${ri.type==="new"?"mua":"gia hạn"} ${t.name}! Chờ chủ shop cấp.`,"success");
    triggerCelebration();
  } catch (e) { showNotif("❌ Lỗi: "+(e.message||"thử lại!"),"error"); }
}
window.openBuyTitle = openBuyTitle;

// ============================================================
// ===== NẠP THẺ ==============================================
// ============================================================
function selectCardType(type, btn) {
  selectedCardType = type;
  document.querySelectorAll(".card-type-btn").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  const el = document.getElementById("cardType"); if(el) el.value=type;
}
window.selectCardType = selectCardType;

async function submitCard() {
  if (!currentUser||isAdmin()) { showNotif("Đăng nhập để nạp thẻ!","error"); return; }
  const serial=document.getElementById("cardSerial")?.value.trim();
  const code=document.getElementById("cardCode")?.value.trim();
  const denom=parseInt(document.getElementById("cardDenom")?.value);
  if (!serial) { showNotif("Nhập số seri thẻ!","error"); return; }
  if (!code)   { showNotif("Nhập mã số thẻ!","error"); return; }
  if (!denom)  { showNotif("Chọn mệnh giá thẻ!","error"); return; }
  const btn=document.getElementById("cardSubmitBtn");
  if (btn) { btn.disabled=true; btn.textContent="⏳ Đang gửi..."; }
  try {
    await addDoc(collection(db,"cards"), {
      uid:currentUser.uid, username:currentUserData?.username||currentUser.displayName,
      type:selectedCardType, denom, serial, code,
      time:new Date().toLocaleString("vi-VN"), timestamp:Date.now(), status:"pending", note:""
    });
    document.getElementById("cardSerial").value="";
    document.getElementById("cardCode").value="";
    showNotif("✅ Đã gửi thẻ! Chờ admin duyệt.","success");
    loadCardHistory();
  } catch { showNotif("❌ Lỗi gửi thẻ, thử lại!","error"); }
  finally { if(btn){btn.disabled=false;btn.textContent="💳 Gửi Thẻ Nạp";} }
}
window.submitCard = submitCard;

async function loadCardHistory() {
  const el=document.getElementById("cardHistoryList");
  if (!el||!currentUser) return;
  el.innerHTML=`<div class="no-data"><p>⏳ Đang tải...</p></div>`;
  try {
    const snap=await getDocs(query(collection(db,"cards"),where("uid","==",currentUser.uid),orderBy("timestamp","desc")));
    const cards=snap.docs.map(d=>({id:d.id,...d.data()}));
    if (!cards.length) { el.innerHTML=`<div class="no-data"><p>Chưa có lịch sử nạp thẻ</p></div>`; return; }
    el.innerHTML=cards.map(c=>`
      <div class="card-history-item">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <strong>${c.type} — ${formatPrice(c.denom)}</strong>
          <span class="card-status-badge card-status-${c.status}">${c.status==="done"?"✅ Đã duyệt":c.status==="failed"?"❌ Thất bại":"⏳ Chờ duyệt"}</span>
        </div>
        <div style="font-size:.75rem;color:rgba(240,230,255,.4)">${c.time}</div>
        ${c.note?`<div style="font-size:.75rem;color:var(--accent);margin-top:4px">${c.note}</div>`:""}
      </div>`).join("");
  } catch { el.innerHTML=`<div class="no-data"><p>Lỗi tải dữ liệu</p></div>`; }
}

async function loadTopNap() {
  const grid=document.getElementById("topNapGrid");
  if (!grid) return;
  try {
    const snap=await getDocs(query(collection(db,"cards"),where("status","==","done"),orderBy("timestamp","desc")));
    const cards=snap.docs.map(d=>d.data());
    const now=new Date();
    const m=cards.filter(c=>{const d=new Date(c.timestamp);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
    const tot={}; m.forEach(c=>{tot[c.username]=(tot[c.username]||0)+c.denom;});
    const sorted=Object.entries(tot).sort((a,b)=>b[1]-a[1]).slice(0,5);
    if (!sorted.length) { grid.innerHTML=`<div style="text-align:center;color:rgba(240,230,255,.3);padding:20px;font-size:.82rem">Chưa có lượt nạp tháng này</div>`; return; }
    const medals=["👑","🥈","🥉","4️⃣","5️⃣"];
    const bc=["rgba(255,215,0,.45)","rgba(192,192,192,.3)","rgba(205,127,50,.3)","rgba(196,77,255,.2)","rgba(196,77,255,.15)"];
    const bg=["rgba(255,215,0,.06)","rgba(255,255,255,.03)","rgba(255,255,255,.03)","rgba(255,255,255,.02)","rgba(255,255,255,.02)"];
    grid.innerHTML=sorted.map(([name,total],i)=>`
      <div class="top-nap-row" style="border-color:${bc[i]};background:${bg[i]}">
        <div class="top-nap-rank">${medals[i]}</div>
        <div class="top-nap-name">${name}</div>
        <div class="top-nap-amt">${formatPrice(total)}</div>
      </div>`).join("");
  } catch { grid.innerHTML=`<div style="text-align:center;color:rgba(240,230,255,.3);padding:16px">Không thể tải</div>`; }
}

// ============================================================
// ===== LISTENERS ============================================
// ============================================================
function startOrderListener(uid) {
  stopOrderListener(); _knownOrderStatus={};
  getDocs(query(collection(db,"orders"),where("uid","==",uid))).then(snap=>{
    snap.docs.forEach(d=>{_knownOrderStatus[d.id]=d.data().status;});
    _orderListener=onSnapshot(
      query(collection(db,"orders"),where("uid","==",uid)),
      snap=>{
        snap.docChanges().forEach(ch=>{
          const o={id:ch.doc.id,...ch.doc.data()};
          if (ch.type==="modified"&&_knownOrderStatus[o.id]==="pending"&&o.status==="done") { showToastDone(o); triggerCelebration(); }
          _knownOrderStatus[o.id]=o.status;
        });
      }, ()=>{}
    );
  }).catch(()=>{});
}
function stopOrderListener() {
  if (typeof _orderListener==="function") { _orderListener(); _orderListener=null; }
  _knownOrderStatus={};
}
function showToastDone(order) {
  const b=document.getElementById("toastDoneBody");
  if (b) b.innerHTML=`
    <div class="toast-done-svc">${order.serviceName}</div>
    <div style="margin-top:4px">Mã đơn: <strong style="font-family:monospace;color:var(--purple)">${order.id}</strong></div>
    ${order.doneTime?`<div style="margin-top:3px;font-size:.72rem;color:rgba(240,230,255,.45)">Xong lúc: ${order.doneTime}</div>`:""}
    <div style="margin-top:6px;color:var(--gold);font-size:.75rem">Cảm ơn đã tin tưởng Thanh Minh Các! 🐉</div>`;
  document.getElementById("toastDone")?.classList.add("show");
  setTimeout(()=>document.getElementById("toastDone")?.classList.remove("show"),12000);
}
function closeToastDone(){document.getElementById("toastDone")?.classList.remove("show");}
window.closeToastDone=closeToastDone;

function getFruitStock(svcId){const d=_fruitStockCache[String(svcId)];return{qty:d?.qty||0,inStock:(d?.qty||0)>0};}
function startFruitStockListener(){
  if (typeof _fruitStockListener==="function") return;
  _fruitStockListener=onSnapshot(collection(db,"fruitstock"),snap=>{
    snap.forEach(d=>{_fruitStockCache[d.id]=d.data();});
    snap.docChanges().forEach(ch=>{if(ch.type==="removed")delete _fruitStockCache[ch.doc.id];});
    applyFruitStockToUI();
  },()=>{});
}
function stopFruitStockListener(){
  if (typeof _fruitStockListener==="function"){_fruitStockListener();_fruitStockListener=null;}
}
function applyFruitStockToUI(){
  const fruits=getServices().filter(s=>s.category==="fruit");
  fruits.forEach(svc=>{
    const {qty,inStock}=getFruitStock(svc.id);
    const b=document.getElementById(`fstock-badge-${svc.id}`);
    if(b){b.className=`fruit-stock-badge ${inStock?"in-stock":"out-of-stock"}`;b.innerHTML=inStock?`✅ Còn ${qty}`:"❌ Hết";}
    const btn=document.getElementById(`svc-btn-${svc.id}`);
    if(btn){
      if(!inStock){btn.disabled=true;btn.textContent="Hết Hàng";btn.style.background="rgba(255,255,255,.08)";btn.style.color="rgba(240,230,255,.3)";btn.style.cursor="not-allowed";}
      else if(currentUser&&!isAdmin()){btn.disabled=false;btn.textContent="🛒 Đặt";btn.style.background="";btn.style.color="";btn.style.cursor="";}
    }
  });
  const cb=document.getElementById("catcard-fruit-stock-badge");
  if(cb){const t=fruits.length,c=fruits.filter(s=>getFruitStock(s.id).inStock).length;
    if(t>0){cb.innerHTML=c===0?"❌ Hết hàng":c<t?`🍎 Còn ${c}/${t} loại`:`✅ Đủ hàng ${t} loại`;cb.style.color=c===0?"var(--red)":c<t?"#ffa502":"var(--green)";}
  }
  const hdr=document.getElementById("fruitStockHeader-fruit");
  if(hdr){const t=fruits.length,c=fruits.filter(s=>getFruitStock(s.id).inStock).length;
    if(!t){hdr.innerHTML="";return;}
    const pct=Math.round(c/t*100),col=c===0?"var(--red)":c<t/2?"#ffa502":"var(--green)";
    hdr.innerHTML=`<div class="fruit-stock-banner"><div class="fruit-stock-banner-dot" style="background:${col}"></div><div style="flex:1"><div style="font-weight:700;font-size:.85rem;color:${col}">🍎 Tồn kho: ${c}/${t} loại còn hàng</div><div style="font-size:.7rem;color:rgba(240,230,255,.45);margin-top:2px">Dữ liệu cập nhật realtime từ chủ shop</div></div><div style="font-family:'Orbitron',sans-serif;font-size:1.1rem;font-weight:700;color:${col}">${pct}%</div></div>`;
  }
}

// ============================================================
// ===== TITLE SHOP GRID ======================================
// ============================================================
function renderTitleShopGrid(){
  const r1=document.getElementById("titleRow1"),r2=document.getElementById("titleRow2"),r3=document.getElementById("titleRow3");
  if(!r1||!r2||!r3) return;
  const tiers=["tier-1","tier-2","tier-3","tier-4","tier-5","tier-5b","tier-6","tier-7","tier-8"];
  const T=TITLES;
  const card=(t,tc,ec="")=>{
    const free=t.free||t.price===0;
    const rh=!free?`<div style="font-size:.62rem;color:rgba(240,230,255,.3);margin-bottom:6px">GH sớm: <span style="color:var(--accent)">${formatPrice(Math.round(t.price*.4))}</span> · Hết ≤3 ngày: <span style="color:var(--gold)">${formatPrice(Math.round(t.price*.5))}</span></div>`:"";
    return `<div class="dh-card ${tc} ${ec}" onclick="openBuyTitle('${t.id}')">
      <div class="dh-card-logo">${titleLogo(t)}</div>
      <div class="dh-card-name"><span class="${t.cls}" style="padding:2px 8px;border-radius:8px;display:inline-block">${t.name}</span></div>
      <div class="dh-card-price">${free?`<span style="color:var(--green);font-size:.78rem;font-family:Quicksand,sans-serif">Mặc định</span>`:formatPrice(t.price)}</div>
      ${rh}<div class="dh-card-perk">${t.desc}${t.discount>0&&t.discount<100?`<br><span class="hl">✨ -${t.discount}% đơn ≥${formatPrice(t.minOrder)}</span>`:""}</div>
      <div class="dh-card-btn">${free?"Đã có":"Mua Ngay →"}</div>
    </div>`;
  };
  r1.innerHTML=[T[0],T[1],T[2],T[3],T[4]].map((t,i)=>card(t,tiers[i])).join("");
  const lh=T[5],ht=T[6],dt=T[7];
  r2.innerHTML=card(lh,"tier-5b")
    +`<div class="dh-card tier-6 featured-card title-featured" onclick="openBuyTitle('${ht.id}')">
        <div class="dh-card-logo" style="width:80px;height:80px;margin:0 auto 12px">${titleLogo(ht,64)}</div>
        <div class="dh-card-name" style="font-size:1.05rem"><span class="${ht.cls}" style="padding:2px 10px;border-radius:8px;display:inline-block">${ht.name}</span></div>
        <div class="dh-card-price" style="font-size:1rem">${formatPrice(ht.price)}</div>
        <div style="font-size:.62rem;color:rgba(240,230,255,.3);margin-bottom:6px">GH sớm: <span style="color:var(--accent)">${formatPrice(Math.round(ht.price*.4))}</span> · ≤3 ngày: <span style="color:var(--gold)">${formatPrice(Math.round(ht.price*.5))}</span></div>
        <div class="dh-card-perk">${ht.desc}<br><span class="hl">✨ -${ht.discount}% đơn ≥${formatPrice(ht.minOrder)}</span></div>
        <div class="dh-card-btn" style="padding:9px 22px">Mua Ngay →</div>
      </div>`
    +card(dt,"tier-7");
  const dk=T[8];
  r3.innerHTML=`<div class="dh-card tier-8 banner-card" onclick="openBuyTitle('${dk.id}')">
    <div class="dh-card-logo" style="width:72px;height:72px;flex-shrink:0;margin:0">${titleLogo(dk,64)}</div>
    <div class="dh-card-body">
      <div class="dh-card-name"><span class="${dk.cls}" style="padding:2px 10px;border-radius:8px;display:inline-block">${dk.name}</span></div>
      <div class="dh-card-price">${formatPrice(dk.price)}</div>
      <div style="font-size:.62rem;color:rgba(240,230,255,.3);margin-bottom:6px">GH sớm: <span style="color:var(--accent)">${formatPrice(Math.round(dk.price*.4))}</span> · ≤3 ngày: <span style="color:var(--gold)">${formatPrice(Math.round(dk.price*.5))}</span></div>
      <div class="dh-card-perk" style="font-size:.72rem">${dk.desc}<br><span class="hl">✨ Giảm ${dk.discount}% đơn ≥${formatPrice(dk.minOrder)}</span></div>
    </div>
    <div style="flex-shrink:0"><div class="dh-card-btn" style="padding:9px 22px;font-size:.8rem">Mua Ngay →</div></div>
  </div>`;
}

// ============================================================
// ===== CELEBRATION + IMAGE UPLOAD ===========================
// ============================================================
function triggerCelebration(){
  const ov=document.createElement("div"); ov.className="celebration-overlay"; document.body.appendChild(ov);
  const colors=["#ff6b9d","#c44dff","#ffd700","#4ade80","#ff9de2"];
  for(let i=0;i<40;i++){const c=document.createElement("div");c.className="confetti";c.style.left=Math.random()*100+"vw";c.style.background=colors[Math.floor(Math.random()*colors.length)];c.style.animationDuration=(Math.random()*2+1.5)+"s";c.style.animationDelay=Math.random()*.5+"s";c.style.width=(Math.random()*8+4)+"px";c.style.height=(Math.random()*8+4)+"px";ov.appendChild(c);}
  setTimeout(()=>ov.remove(),3000);
}
function handleImgUpload(fid,uid2,pid){
  const file=document.getElementById(fid)?.files?.[0]; if(!file) return;
  if(file.size>5e6){showNotif("Ảnh quá lớn!","error");return;}
  const r=new FileReader(); r.onload=e=>{const img=new Image();img.onload=()=>{const W=800,H=600,sr=img.width/img.height,tr=W/H;let sx,sy,sw,sh;if(sr>tr){sh=img.height;sw=sh*tr;sx=(img.width-sw)/2;sy=0;}else{sw=img.width;sh=sw/tr;sx=0;sy=(img.height-sh)/2;}const cv=document.createElement("canvas");cv.width=W;cv.height=H;cv.getContext("2d").drawImage(img,sx,sy,sw,sh,0,0,W,H);const b64=cv.toDataURL("image/jpeg",.88);const ue=document.getElementById(uid2);const pv=document.getElementById(pid);if(ue)ue.value=b64;if(pv){pv.src=b64;pv.style.display="block";pv.style.height="120px";pv.style.objectFit="cover";}showNotif("✅ Ảnh đã cân chỉnh 4:3","success");};img.src=e.target.result;};r.readAsDataURL(file);
}
function previewFromUrl(uid3,pid2){const url=document.getElementById(uid3)?.value.trim();const pv=document.getElementById(pid2);if(!pv)return;if(url?.startsWith("http")){pv.src=url;pv.style.display="block";pv.onerror=()=>(pv.style.display="none");}else pv.style.display="none";}
window.handleImgUpload=handleImgUpload; window.previewFromUrl=previewFromUrl;

// ============================================================
// ===== MESSENGER + KEYBOARD =================================
// ============================================================
setTimeout(()=>{const t=document.getElementById("messengerTooltip");if(t){t.style.display="block";setTimeout(()=>(t.style.display="none"),4000);}},2000);
document.addEventListener("keydown",e=>{
  if(e.key==="Enter"){
    if(document.getElementById("loginModal")?.classList.contains("show")) handleLogin();
    if(document.getElementById("registerModal")?.classList.contains("show")) handleRegister();
    if(document.getElementById("orderModal")?.classList.contains("show")) submitOrder();
  }
});

// ============================================================
// ===== EXPOSE GLOBALS =======================================
// ============================================================
window.renderServices=renderServices;
window.__tmcGetServices=getServices;
window.__tmcGetCustomCategories=getCustomCategories;
window.__tmcGetShopSettings=getShopSettings;
window.__tmcSaveServices=saveServices;
window.__tmcSaveCustomCategories=saveCustomCategories;
window.__tmcFetchUserData=fetchUserData;
window.__tmcUpdateUserData=updateUserData;

// ============================================================
// ===== INIT =================================================
// ============================================================
(function init(){
  startConfigListener();      // FIX-C: lắng nghe config từ Firestore
  startFruitStockListener();  // Tồn kho trái – không cần auth
  renderServices();
  applyVideoSetting();
  loadTopNap();
  renderTitleShopGrid();
})();

// ============================================================
// ===== DEFAULT SERVICES =====================================
// ============================================================
function getDefaultServices(){
  const s=(id,n,p,c,b,d,slug)=>({id,name:n,price:p,category:c,badge:b,desc:d||n,image:"",slug:slug||null,order:id,code:(b==="svip"?"SSVIP-":b==="vip"?"S-":"")+"TMC-"+String(id).padStart(3,"0")});
  return [
    s(1,"Lấy tộc (Human/Angel/Shark/Mink)",10900,"race","normal","Chọn 1 trong 4 tộc","race-basic"),
    s(2,"Lấy tộc Ghoul",21900,"race","normal","Lấy tộc Ghoul"),s(3,"Lấy tộc Cyborg",42900,"race","normal","Lấy tộc Cyborg"),
    s(4,"Up V2 — đồng giá (đủ tiền)",10900,"race-upgrade","normal","Đã có V1, đủ tiền","upgrade-v2-du"),
    s(5,"Up V2 — đồng giá (thiếu tiền)",16900,"race-upgrade","normal","Đã có V1, thiếu tiền","upgrade-v2-thieu"),
    s(6,"Up V3 — đồng giá (đủ tiền)",10900,"race-upgrade","normal","Đã có V2, đủ tiền","upgrade-v3-du"),
    s(7,"Up V3 — đồng giá (thiếu tiền)",22900,"race-upgrade","normal","Đã có V2, thiếu tiền","upgrade-v3-thieu"),
    s(8,"VIP Lấy V2 + V3",29900,"race-upgrade","vip","VIP combo V2 và V3","upgrade-vip-v2v3"),
    s(9,"VIP All V2 + V3 (thiếu tiền)",49900,"race-upgrade","vip","VIP full V2-V3 thiếu tiền","upgrade-vip-all"),
    s(10,"Lấy mũ Rip_Indra",34900,"race-v4","normal","Mũ Rip cho V4"),s(11,"Lấy mảnh gương (Mirror Fractal)",47900,"race-v4","normal","Mirror Fractal"),
    s(12,"Treo đảo bí ẩn",29900,"race-v4","normal","Gạt cần V4"),s(13,"VIP All: Mũ + Gương + Đảo",99900,"race-v4","vip","VIP combo V4 đầy đủ"),
    s(14,"Gear 1 — Quỷ/Cá/Human (đủ 9250f)",10900,"gear","normal","Đủ 9250 fragment","gear-qca-du-g1"),
    s(15,"Gear 2 — Quỷ/Cá/Human (đủ f, 1kf)",12900,"gear","normal","Cần 1k fragment","gear-qca-du-g2"),
    s(16,"Gear 3 — Quỷ/Cá/Human (đủ f, 1k5f)",16900,"gear","normal","Cần 1k5 fragment","gear-qca-du-g3"),
    s(17,"Gear 4 — Quỷ/Cá/Human (đủ f, 6750f)",22900,"gear","normal","Cần 6750 fragment","gear-qca-du-g4"),
    s(18,"VIP Full Gear 1-4 — Quỷ/Cá/Human (đủ f)",59900,"gear","vip","VIP full gear đủ f","gear-qca-du-vip"),
    s(19,"Bonus Gear 5 — Quỷ/Cá/Human (đủ 17500f)",59900,"gear","vip","Gear đổi đủ 17500f","gear-qca-du-g5"),
    s(20,"Gear 1 — Quỷ/Cá/Human (thiếu f)",12900,"gear","normal","Thiếu fragment","gear-qca-thieu-g1"),
    s(21,"Gear 2 — Quỷ/Cá/Human (thiếu f, 1kf)",17900,"gear","normal","Thiếu f","gear-qca-thieu-g2"),
    s(22,"Gear 3 — Quỷ/Cá/Human (thiếu f, 1k5f)",17900,"gear","normal","Thiếu f","gear-qca-thieu-g3"),
    s(23,"Gear 4 — Quỷ/Cá/Human (thiếu f, 6750f)",39900,"gear","normal","Thiếu f","gear-qca-thieu-g4"),
    s(24,"VIP Full Gear 1-4 — Quỷ/Cá/Human (thiếu f)",79900,"gear","vip","VIP thiếu fragment","gear-qca-thieu-vip"),
    s(25,"Bonus Gear 5 — Quỷ/Cá/Human (thiếu 17500f)",89900,"gear","vip","Gear đổi thiếu f","gear-qca-thieu-g5"),
    s(26,"Gear 1 — Mink/Angel/Cyborg (đủ 9250f)",10900,"gear","normal","Đủ fragment","gear-mac-du-g1"),
    s(27,"Gear 2 — Mink/Angel/Cyborg (đủ f, 1kf)",16900,"gear","normal","Cần 1k fragment","gear-mac-du-g2"),
    s(28,"Gear 3 — Mink/Angel/Cyborg (đủ f, 1k5f)",21900,"gear","normal","Cần 1k5 fragment","gear-mac-du-g3"),
    s(29,"Gear 4 — Mink/Angel/Cyborg (đủ f, 6750f)",27900,"gear","normal","Cần 6750 fragment","gear-mac-du-g4"),
    s(30,"VIP Full Gear 1-4 — Mink/Angel/Cyborg (đủ f)",64900,"gear","vip","VIP đủ f","gear-mac-du-vip"),
    s(31,"Bonus Gear 5 — Mink/Angel/Cyborg (đủ 17500f)",69900,"gear","vip","Gear đổi đủ f","gear-mac-du-g5"),
    s(32,"Gear 1 — Mink/Angel/Cyborg (thiếu f)",12900,"gear","normal","Thiếu fragment","gear-mac-thieu-g1"),
    s(33,"Gear 2 — Mink/Angel/Cyborg (thiếu f, 1kf)",17900,"gear","normal","Thiếu f","gear-mac-thieu-g2"),
    s(34,"Gear 3 — Mink/Angel/Cyborg (thiếu f, 1k5f)",22900,"gear","normal","Thiếu f","gear-mac-thieu-g3"),
    s(35,"Gear 4 — Mink/Angel/Cyborg (thiếu f, 6750f)",44900,"gear","normal","Thiếu f","gear-mac-thieu-g4"),
    s(36,"VIP Full Gear 1-4 — Mink/Angel/Cyborg (thiếu f)",89900,"gear","vip","VIP thiếu f","gear-mac-thieu-vip"),
    s(37,"Bonus Gear 5 — Mink/Angel/Cyborg (thiếu 17500f)",99900,"gear","vip","Gear đổi thiếu f","gear-mac-thieu-g5"),
    s(38,"Đai Trắng",5900,"draco","normal","Draco đai trắng"),s(39,"Đai Vàng",5900,"draco","normal","Draco đai vàng"),
    s(40,"Đai Cam",5900,"draco","normal","Draco đai cam"),s(41,"Đai Xanh Lá",5900,"draco","normal","Draco đai xanh lá"),
    s(42,"Đai Xanh Dương",5900,"draco","normal","Draco đai xanh dương"),s(43,"Đai Hồng",5900,"draco","normal","Draco đai hồng"),
    s(44,"Đai Đỏ",10900,"draco","normal","Draco đai đỏ"),s(45,"Đai Đen",22900,"draco","normal","Draco đai đen"),
    s(46,"VIP Lấy Full Đai (Trắng→Đen)",54900,"draco","vip","VIP full đai"),
    s(47,"Draco V1",11900,"draco","normal","Lấy Draco V1"),s(48,"Draco V2 (đủ tiền)",22900,"draco","normal","Đủ tiền in-game"),
    s(49,"Draco V2 (thiếu tiền)",29900,"draco","normal","Thiếu tiền in-game"),s(50,"Draco V3 (đủ tiền)",11900,"draco","normal","Đủ tiền in-game"),
    s(51,"Draco V3 (thiếu tiền)",29900,"draco","normal","Thiếu tiền in-game"),
    s(52,"Lấy Dragon Talon V3 (đủ 500 mas)",11900,"draco","normal","Đủ 500 mas"),
    s(53,"Dragon Talon V3 (thiếu 500 mas, có x2)",22900,"draco","normal","Thiếu mas, có x2"),
    s(54,"Dragon Talon V3 (thiếu 500 mas, không x2)",34900,"draco","normal","Thiếu mas, không x2"),
    s(55,"Lấy Thương Rồng (Dragon Trident)",16900,"draco","normal","Dragon Trident"),
    s(56,"Lấy Súng Rồng (Dragon Blaster)",27900,"draco","normal","Dragon Blaster"),
    s(57,"VIP Lấy Thương + Súng Rồng",39900,"draco","vip","VIP combo vũ khí rồng"),
    s(58,"Cày mas 500 — 1 item (có x2 mas)",11900,"draco","normal","1 trong 3 item, có x2","draco-mas-1item-x2"),
    s(59,"Cày mas 500 — 1 item (không x2 mas)",22900,"draco","normal","1 trong 3 item, không x2","draco-mas-1item-nox2"),
    s(60,"VIP Cày mas 500 — Full 3 item (có x2)",29900,"draco","vip","Full Dragon Talon+Thương+Súng"),
    s(61,"VIP Cày mas 500 — Full 3 item (không x2)",59900,"draco","vip","Full 3 item không x2"),
    s(62,"Kéo tim Hydra (draco v3 + full item)",29900,"draco","normal","Draco V3 + full item"),
    s(63,"Đảo Núi Lửa — 1 gear (đủ f)",22900,"draco","normal","Đủ 9250f, đèn sáng","draco-dao-du-1"),
    s(64,"VIP Đảo Núi Lửa — Full 4 gear (đủ f)",79900,"draco","vip","Full 4 gear đủ f"),
    s(65,"Bonus Gear 5 Đảo Núi Lửa (đủ 17500f)",99900,"draco","vip","Gear đổi đủ f"),
    s(66,"Đảo Núi Lửa Gear 1 (thiếu f)",22900,"draco","normal","Thiếu fragment"),
    s(67,"Đảo Núi Lửa Gear 2 (thiếu f, 1kf)",22900,"draco","normal","Thiếu f, cần 1k f"),
    s(68,"Đảo Núi Lửa Gear 3 (thiếu f, 1k5f)",22900,"draco","normal","Thiếu f, cần 1k5 f"),
    s(69,"Đảo Núi Lửa Gear 4 (thiếu f, 6750f)",54900,"draco","normal","Thiếu f, cần 6750 f"),
    s(70,"VIP Full 4 Gear Đảo Núi Lửa (thiếu f)",109900,"draco","vip","VIP thiếu f"),
    s(71,"Bonus Gear 5 Đảo Núi Lửa (thiếu 17500f)",129900,"draco","vip","Gear đổi thiếu f"),
    s(72,"SSSVIP Draco A-Z",249900,"draco","svip","Trọn bộ Draco từ đầu đến cuối"),
    s(73,"Kitsune",60000,"fruit","vip","Trái Kitsune"),
    s(74,"Control",15000,"fruit","normal","Trái Control"),
    s(75,"Yeti",35000,"fruit","normal","Trái Yeti"),
    s(76,"Tiger",40000,"fruit","normal","Trái Tiger"),
    s(77,"Dough (Mochi)",30000,"fruit","normal","Trái Dough"),
    s(78,"Spirit",20000,"fruit","normal","Trái Spirit"),
    s(79,"Gas",25000,"fruit","normal","Trái Gas"),
    s(80,"T-Rex",10000,"fruit","normal","Trái T-Rex"),
    s(81,"Gravity",15000,"fruit","normal","Trái Gravity"),
    s(82,"Venom",20000,"fruit","normal","Trái Venom"),
    s(83,"Shadow",10000,"fruit","normal","Trái Shadow"),
    s(84,"Mammoth",10000,"fruit","normal","Trái Mammoth"),
    s(85,"Lightning",40000,"fruit","normal","Trái Lightning"),
    s(86,"Portal",20000,"fruit","normal","Trái Portal"),
    s(87,"Buddha",20000,"fruit","normal","Trái Buddha"),
    s(88,"Magma",5000,"fruit","normal","Trái Magma")
  ];
}
