/**
 * app.js – Thanh Minh Các · Logic phía client
 * Sử dụng Firebase v10 Modular SDK (ES Modules)
 * Xác thực qua Firebase Auth (không còn simpleHash / localStorage session)
 */

import { db, auth }  from "./firebase-config.js";
import { DH_LOGOS }  from "./title-logos.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy,
  onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ============================================================
// ===== HẰNG SỐ CẤU HÌNH =====================================
// ============================================================

// UID của tài khoản admin (lấy từ Firebase Auth Console sau khi tạo lần đầu)
// ⚠️  Thay bằng UID thật trước khi deploy
const ADMIN_UID = "REPLACE_WITH_YOUR_ADMIN_UID";

// Thời hạn danh hiệu: 30 ngày tính bằng milliseconds
const TITLE_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

// Định nghĩa tất cả danh hiệu tu luyện
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

// Danh mục dịch vụ mặc định
const CATEGORIES = {
  race         : "👤 Lấy Tộc",
  "race-upgrade": "⬆️ Up Tộc V2-V3",
  "race-v4"    : "🔥 Tộc V4 (Gạt Cần)",
  gear         : "⚙️ Nâng Gear V4",
  draco        : "🐉 Up Draco",
  fruit        : "🍎 Trái Ác Quỷ",
  other        : "📦 Khác"
};

// Các gói có lựa chọn phụ (tộc, gear…)
const SERVICE_OPTIONS = {
  "race-basic"          : { label:"Chọn tộc muốn lấy",  options:["Human","Angel","Shark","Mink"] },
  "upgrade-v2-du"       : { label:"Chọn tộc cần up",    options:["Human","Angel","Shark","Mink","Ghoul","Cyborg"] },
  "upgrade-v2-thieu"    : { label:"Chọn tộc cần up",    options:["Human","Angel","Shark","Mink","Ghoul","Cyborg"] },
  "upgrade-v3-du"       : { label:"Chọn tộc cần up",    options:["Human","Angel","Shark","Mink","Ghoul","Cyborg"] },
  "upgrade-v3-thieu"    : { label:"Chọn tộc cần up",    options:["Human","Angel","Shark","Mink","Ghoul","Cyborg"] },
  "upgrade-vip-v2v3"    : { label:"Chọn tộc cần up",    options:["Human","Angel","Shark","Mink","Ghoul","Cyborg"] },
  "upgrade-vip-all"     : { label:"Chọn tộc cần up",    options:["Human","Angel","Shark","Mink","Ghoul","Cyborg"] },
  "gear-qca-du-g1"      : { label:"Chọn tộc",           options:["Quỷ","Cá","Human"] },
  "gear-qca-du-g2"      : { label:"Chọn tộc",           options:["Quỷ","Cá","Human"] },
  "gear-qca-du-g3"      : { label:"Chọn tộc",           options:["Quỷ","Cá","Human"] },
  "gear-qca-du-g4"      : { label:"Chọn tộc",           options:["Quỷ","Cá","Human"] },
  "gear-qca-du-vip"     : { label:"Chọn tộc",           options:["Quỷ","Cá","Human"] },
  "gear-qca-du-g5"      : { label:"Chọn tộc",           options:["Quỷ","Cá","Human"] },
  "gear-qca-thieu-g1"   : { label:"Chọn tộc",           options:["Quỷ","Cá","Human"] },
  "gear-qca-thieu-g2"   : { label:"Chọn tộc",           options:["Quỷ","Cá","Human"] },
  "gear-qca-thieu-g3"   : { label:"Chọn tộc",           options:["Quỷ","Cá","Human"] },
  "gear-qca-thieu-g4"   : { label:"Chọn tộc",           options:["Quỷ","Cá","Human"] },
  "gear-qca-thieu-vip"  : { label:"Chọn tộc",           options:["Quỷ","Cá","Human"] },
  "gear-qca-thieu-g5"   : { label:"Chọn tộc",           options:["Quỷ","Cá","Human"] },
  "gear-mac-du-g1"      : { label:"Chọn tộc",           options:["Mink","Angel","Cyborg"] },
  "gear-mac-du-g2"      : { label:"Chọn tộc",           options:["Mink","Angel","Cyborg"] },
  "gear-mac-du-g3"      : { label:"Chọn tộc",           options:["Mink","Angel","Cyborg"] },
  "gear-mac-du-g4"      : { label:"Chọn tộc",           options:["Mink","Angel","Cyborg"] },
  "gear-mac-du-vip"     : { label:"Chọn tộc",           options:["Mink","Angel","Cyborg"] },
  "gear-mac-du-g5"      : { label:"Chọn tộc",           options:["Mink","Angel","Cyborg"] },
  "gear-mac-thieu-g1"   : { label:"Chọn tộc",           options:["Mink","Angel","Cyborg"] },
  "gear-mac-thieu-g2"   : { label:"Chọn tộc",           options:["Mink","Angel","Cyborg"] },
  "gear-mac-thieu-g3"   : { label:"Chọn tộc",           options:["Mink","Angel","Cyborg"] },
  "gear-mac-thieu-g4"   : { label:"Chọn tộc",           options:["Mink","Angel","Cyborg"] },
  "gear-mac-thieu-vip"  : { label:"Chọn tộc",           options:["Mink","Angel","Cyborg"] },
  "gear-mac-thieu-g5"   : { label:"Chọn tộc",           options:["Mink","Angel","Cyborg"] },
  "draco-mas-1item-x2"  : { label:"Chọn item cần cày",  options:["Dragon Talon","Thương Rồng","Súng Rồng"] },
  "draco-mas-1item-nox2": { label:"Chọn item cần cày",  options:["Dragon Talon","Thương Rồng","Súng Rồng"] },
  "draco-dao-du-1"      : { label:"Chọn gear",          options:["Gear 1","Gear 2","Gear 3","Gear 4"] }
};

// Ảnh mặc định cho từng danh mục
const DEFAULT_IMAGES = {
  race         : "https://i.pinimg.com/736x/a7/c5/9e/a7c59e09c734e40ee10e93e0a6467a46.jpg",
  "race-upgrade": "https://i.pinimg.com/736x/2a/62/78/2a62782e42ae1068d753fcf7ecbfb498.jpg",
  "race-v4"    : "https://i.pinimg.com/736x/34/8d/4f/348d4f0ac0e0a4e3bc6cc51c6be964ea.jpg",
  gear         : "https://i.pinimg.com/736x/d8/2a/91/d82a91ee7ee430ca56b36e5fe5e2e3e8.jpg",
  draco        : "https://i.pinimg.com/736x/ce/bf/d7/cebfd756e47f63f23f0c8cf0f0a85100.jpg",
  fruit        : "https://i.pinimg.com/564x/0c/29/ab/0c29abf7d3a49b1c30de3e71e8d51354.jpg",
  other        : "https://i.pinimg.com/736x/a7/c5/9e/a7c59e09c734e40ee10e93e0a6467a46.jpg"
};
const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect fill='%231e0a3c' width='400' height='200'/%3E%3Ctext x='50%25' y='50%25' fill='%23c44dff' text-anchor='middle' dominant-baseline='middle' font-size='50'%3E🎮%3C/text%3E%3C/svg%3E";

// Phiên bản dữ liệu services (tăng lên khi cần reset cache)
const SERVICES_VERSION = "6.0";

// ============================================================
// ===== TRẠNG THÁI TOÀN CỤC ==================================
// ============================================================
let currentUser       = null;   // Firebase Auth user object
let currentUserData   = null;   // Document Firestore của user
let currentOrderSvc   = null;   // Dịch vụ đang đặt
let selectedSubOption = null;   // Lựa chọn phụ (tộc, gear…)
let historyFilter     = "all";
let selectedCardType  = "Viettel";

// Unsubscribe listeners
let _orderListener      = null;
let _fruitStockListener = null;
let _knownOrderStatus   = {};
let _fruitStockCache    = {};

// ============================================================
// ===== TIỆN ÍCH CHUNG =======================================
// ============================================================

/** Định dạng số thành VNĐ */
const formatPrice = p => new Intl.NumberFormat("vi-VN").format(p) + "đ";

/** Tạo mã đơn hàng ngẫu nhiên */
function generateOrderId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "TMC-";
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

/** Kiểm tra user hiện tại có phải admin không (so sánh UID) */
const isAdmin = () => currentUser && currentUser.uid === ADMIN_UID;

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

// Đóng modal khi click bên ngoài
document.querySelectorAll(".modal-overlay").forEach(overlay => {
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.classList.remove("show"); });
});

/** Toggle hiển thị mật khẩu */
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === "password" ? "text" : "password";
  btn.textContent = input.type === "password" ? "👁️" : "🙈";
}
// Expose cho onclick trong HTML
window.togglePw = togglePw;

// ============================================================
// ===== SAKURA ANIMATION (GPU-optimized) =====================
// ============================================================
(function initSakura() {
  const container = document.getElementById("sakuraContainer");
  if (!container) return;
  container.innerHTML = "";

  // Phát hiện thiết bị mobile → giảm 50% hoặc tắt để tiết kiệm pin/CPU
  const isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 600;
  const count = isMobile ? 5 : 12;

  const emojis = ["🌸", "🌸", "🌸", "💮", "🌸"];
  for (let i = 0; i < count; i++) {
    const petal = document.createElement("div");
    petal.className = "sakura";
    petal.textContent = emojis[i % emojis.length];
    const dur   = 9 + Math.random() * 10;
    const delay = -(Math.random() * dur); // Bắt đầu ngay tại vị trí ngẫu nhiên
    petal.style.cssText = `
      left             : ${Math.random() * 100}%;
      font-size        : ${10 + Math.random() * 12}px;
      animation-duration : ${dur}s;
      animation-delay    : ${delay}s;
      opacity          : ${0.35 + Math.random() * 0.55};
    `;
    container.appendChild(petal);
  }
})();

// ============================================================
// ===== HEADER SCROLL ========================================
// ============================================================
window.addEventListener("scroll", () => {
  document.getElementById("header")?.classList.toggle("scrolled", window.scrollY > 50);
});

// ============================================================
// ===== SERVICES – LocalStorage ==============================
// ============================================================
function getServices() {
  const ver = localStorage.getItem("tmc_services_ver");
  if (ver !== SERVICES_VERSION) {
    localStorage.removeItem("tmc_services");
    localStorage.removeItem("tmc_categories");
    localStorage.setItem("tmc_services_ver", SERVICES_VERSION);
  }
  const raw = localStorage.getItem("tmc_services");
  if (raw) return JSON.parse(raw);
  const defaults = getDefaultServices();
  localStorage.setItem("tmc_services", JSON.stringify(defaults));
  return defaults;
}
function saveServices(svcs) { localStorage.setItem("tmc_services", JSON.stringify(svcs)); }

function getCustomCategories() {
  const raw = localStorage.getItem("tmc_categories");
  if (raw) return JSON.parse(raw);
  const cats = Object.entries(CATEGORIES).map(([key, name]) => ({
    key, name, icon: name.match(/^\S+/)?.[0] || "📦", image: DEFAULT_IMAGES[key] || ""
  }));
  localStorage.setItem("tmc_categories", JSON.stringify(cats));
  return cats;
}
function saveCustomCategories(cats) { localStorage.setItem("tmc_categories", JSON.stringify(cats)); }

function getShopSettings()  { return JSON.parse(localStorage.getItem("tmc_settings") || "{}"); }
function saveShopSettings(s){ localStorage.setItem("tmc_settings", JSON.stringify(s)); }

// ============================================================
// ===== FIREBASE AUTH ========================================
// ============================================================

/**
 * Đăng ký tài khoản mới qua Firebase Auth
 * Email được tạo tự động dạng: username@tmc.internal (nếu người dùng không nhập email thật)
 * Thông tin đầy đủ lưu vào Firestore collection "users"
 */
async function handleRegister() {
  const username  = document.getElementById("regUser")?.value.trim();
  const emailInput= document.getElementById("regEmail")?.value.trim();
  const facebook  = document.getElementById("regFacebook")?.value.trim();
  const pass      = document.getElementById("regPass")?.value;
  const pass2     = document.getElementById("regPass2")?.value;

  // Hiển thị lỗi nội tuyến trong modal
  const showErr = msg => {
    let errEl = document.getElementById("regErrorMsg");
    if (!errEl) {
      errEl = document.createElement("div");
      errEl.id = "regErrorMsg";
      errEl.style.cssText = "background:rgba(255,71,87,0.12);border:1px solid rgba(255,71,87,0.4);border-radius:10px;padding:8px 14px;font-size:0.8rem;color:var(--red);font-weight:600;margin-bottom:12px;text-align:center";
      document.querySelector("#registerModal .btn-modal-submit")?.before(errEl);
    }
    errEl.textContent = "❌ " + msg;
    errEl.style.display = "block";
  };
  document.getElementById("regErrorMsg")?.style && (document.getElementById("regErrorMsg").style.display = "none");

  // Validation phía client
  if (!username || username.length < 2)     return showErr("Tên đăng nhập ít nhất 2 ký tự!");
  if (emailInput && !emailInput.includes("@")) return showErr("Email không hợp lệ!");
  if (pass.length < 6)                      return showErr("Mật khẩu ít nhất 6 ký tự!");
  if (pass !== pass2)                       return showErr("Mật khẩu nhập lại không khớp!");

  const btn = document.getElementById("regSubmitBtn");
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Đang đăng ký..."; }

  try {
    // Kiểm tra trùng tên đăng nhập trước khi tạo tài khoản Auth
    const dupSnap = await getDocs(query(collection(db, "users"), where("username", "==", username)));
    if (!dupSnap.empty) {
      showErr("Tên đăng nhập đã tồn tại! Vui lòng chọn tên khác.");
      return;
    }

    // Tạo email nội bộ nếu người dùng không nhập email thật
    const authEmail = emailInput || `${username.toLowerCase().replace(/\s+/g, "_")}@tmc.internal`;

    // Tạo tài khoản Firebase Auth
    const credential = await createUserWithEmailAndPassword(auth, authEmail, pass);
    const uid = credential.user.uid;

    // Đặt displayName = username để hiển thị trên nav
    await updateProfile(credential.user, { displayName: username });

    // Lưu hồ sơ đầy đủ vào Firestore
    await setDoc(doc(db, "users", uid), {
      uid,
      username,
      email    : emailInput || "",
      facebook : facebook || "",
      titleOverride  : null,
      titleGrantedAt : 0,
      titleExpiry    : 0,
      balance        : 0,
      role           : "user",
      createdAt      : new Date().toLocaleString("vi-VN"),
      createdAtTs    : Date.now()
    });

    // Reset form
    ["regUser","regEmail","regFacebook","regPass","regPass2"]
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });

    closeModal("registerModal");
    showNotif("🎉 Đăng ký thành công! Đang đăng nhập…", "success");
    // Firebase Auth tự động đăng nhập sau khi tạo tài khoản → onAuthStateChanged sẽ kích hoạt

  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      showErr("Email hoặc tên đăng nhập này đã được dùng!");
    } else if (err.code === "auth/weak-password") {
      showErr("Mật khẩu quá yếu! Dùng ít nhất 6 ký tự.");
    } else {
      showErr("Lỗi đăng ký: " + (err.message || "thử lại!"));
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "✦ Đăng Ký"; }
  }
}
window.handleRegister = handleRegister;

/**
 * Đăng nhập qua Firebase Auth
 * Hỗ trợ cả email thật lẫn tên đăng nhập (tự tra email nội bộ trong Firestore)
 */
async function handleLogin() {
  const usernameInput = document.getElementById("loginUser")?.value.trim();
  const pass          = document.getElementById("loginPass")?.value;

  if (!usernameInput || !pass) { showNotif("Vui lòng điền đầy đủ!", "error"); return; }

  const btn = document.getElementById("loginSubmitBtn");
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Đang đăng nhập..."; }

  try {
    let loginEmail = usernameInput;

    // Nếu người dùng nhập tên (không phải email) → tra email từ Firestore
    let displayName = usernameInput;

    if (!usernameInput.includes("@")) {
      const snap = await getDocs(query(collection(db, "users"), where("username", "==", usernameInput)));
      if (snap.empty) {
        loginEmail = `${usernameInput.toLowerCase().replace(/\s+/g, "_")}@tmc.internal`;
      } else {
        const userData = snap.docs[0].data();
        displayName = userData.username || usernameInput;
        loginEmail = userData.email && userData.email.includes("@") && !userData.email.includes("@tmc.internal")
          ? userData.email
          : `${usernameInput.toLowerCase().replace(/\s+/g, "_")}@tmc.internal`;
      }
    }

    await signInWithEmailAndPassword(auth, loginEmail, pass);
    closeModal("loginModal");
    ["loginUser", "loginPass"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
    if (auth.currentUser?.uid) {
      const prof = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (prof.exists()) displayName = prof.data().username || displayName;
    }
    if (auth.currentUser?.uid === ADMIN_UID) {
      showNotif("🔥 Chào Thanh Minh Các Chủ!", "success");
    } else {
      showNotif(`👋 Chào ${displayName}! 🎮`, "success");
    }

  } catch (err) {
    if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
      showNotif("❌ Tài khoản không tồn tại hoặc sai mật khẩu!", "error");
    } else if (err.code === "auth/wrong-password") {
      showNotif("❌ Sai mật khẩu!", "error");
    } else if (err.code === "auth/too-many-requests") {
      showNotif("⏳ Quá nhiều lần thử! Chờ vài phút rồi thử lại.", "error");
    } else {
      showNotif("❌ Lỗi đăng nhập: " + (err.message || "thử lại!"), "error");
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "✦ Đăng Nhập"; }
  }
}
window.handleLogin = handleLogin;

/** Đăng xuất */
async function logoutUser() {
  stopOrderListener();
  stopFruitStockListener();
  await signOut(auth);
  currentUser = null;
  currentUserData = null;
  showNotif("Đã đăng xuất", "info");
  updateNav();
  showHome();
}
window.logoutUser = logoutUser;

// ── Theo dõi trạng thái xác thực – đây là "nguồn sự thật" duy nhất ──────
onAuthStateChanged(auth, async firebaseUser => {
  if (firebaseUser) {
    currentUser = firebaseUser;
    // Tải hồ sơ Firestore
    try {
      const snap = await getDoc(doc(db, "users", firebaseUser.uid));
      currentUserData = snap.exists() ? snap.data() : null;
    } catch { currentUserData = null; }
    updateNav();
    // Chỉ bật listener đơn hàng cho user thường
    if (!isAdmin()) startOrderListener(firebaseUser.uid);
    startFruitStockListener();
  } else {
    currentUser = null;
    currentUserData = null;
    stopOrderListener();
    stopFruitStockListener();
    updateNav();
  }
  renderServices();
  applyVideoSetting();
  loadTopNap();
});

// ============================================================
// ===== NAV UPDATE ===========================================
// ============================================================
async function updateNav() {
  const loggedIn = !!currentUser;
  const admin    = isAdmin();
  const user     = loggedIn && !admin;

  document.getElementById("navLoginBtn")?.style    && (document.getElementById("navLoginBtn").style.display    = loggedIn ? "none" : "");
  document.getElementById("navRegisterBtn")?.style && (document.getElementById("navRegisterBtn").style.display = loggedIn ? "none" : "");
  document.getElementById("navLogoutBtn")?.style   && (document.getElementById("navLogoutBtn").style.display   = loggedIn ? "" : "none");
  document.getElementById("navHistoryBtn")?.style  && (document.getElementById("navHistoryBtn").style.display  = user ? "" : "none");
  document.getElementById("navCardBtn")?.style     && (document.getElementById("navCardBtn").style.display     = user ? "" : "none");
  document.getElementById("navAdminBtn")?.style    && (document.getElementById("navAdminBtn").style.display    = admin ? "" : "none");
  document.getElementById("navUserBadge")?.style   && (document.getElementById("navUserBadge").style.display   = user ? "" : "none");

  if (user) {
    const displayName = currentUserData?.username || currentUser.displayName || currentUser.email;
    document.getElementById("navAvatar").textContent    = displayName[0].toUpperCase();
    document.getElementById("navUsername").textContent  = displayName;
    const title = currentUserData?.titleOverride ? TITLES.find(t => t.id === currentUserData.titleOverride) : null;
    const badge = document.getElementById("navTitleBadge");
    if (badge) badge.textContent = title ? `${title.icon} ${title.name}` : "";
  }
}

// ============================================================
// ===== PANELS ===============================================
// ============================================================
function hideAllPanels() {
  document.getElementById("mainContent").style.display = "none";
  ["adminPanel","historyPanel","profilePanel","cardPanel"].forEach(id => {
    document.getElementById(id)?.classList.remove("show");
  });
}
function showHome() {
  hideAllPanels();
  document.getElementById("mainContent").style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function showHistory() {
  if (!currentUser || isAdmin()) { showNotif("Đăng nhập để xem lịch sử", "error"); return; }
  hideAllPanels();
  document.getElementById("historyPanel")?.classList.add("show");
  loadAndRenderHistory();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function showProfile() {
  if (!currentUser || isAdmin()) return;
  hideAllPanels();
  document.getElementById("profilePanel")?.classList.add("show");
  renderProfile();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function showAdmin() {
  if (!isAdmin()) return;
  hideAllPanels();
  document.getElementById("adminPanel")?.classList.add("show");
  if (typeof window.loadAdminData === "function") window.loadAdminData();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function showCardPanel() {
  if (!currentUser || isAdmin()) { showNotif("Đăng nhập để nạp thẻ", "error"); return; }
  hideAllPanels();
  document.getElementById("cardPanel")?.classList.add("show");
  loadCardHistory();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
// Expose cho onclick trong HTML
window.showHome      = showHome;
window.showHistory   = showHistory;
window.showProfile   = showProfile;
window.showAdmin     = showAdmin;
window.showCardPanel = showCardPanel;

// ============================================================
// ===== VIDEO SETTING ========================================
// ============================================================
function getYoutubeEmbedUrl(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=0` : null;
}
function applyVideoSetting() {
  const settings = getShopSettings();
  const banner   = document.getElementById("videoBanner");
  const frame    = document.getElementById("videoFrame");
  if (!banner || !frame) return;
  if (settings.videoUrl) {
    const embed = getYoutubeEmbedUrl(settings.videoUrl);
    if (embed) { frame.src = embed; banner.style.display = "block"; return; }
  }
  banner.style.display = "none";
  frame.src = "";
}
function saveVideoSetting() {
  const url = document.getElementById("settingsVideoUrl")?.value.trim();
  const s = getShopSettings(); s.videoUrl = url; saveShopSettings(s);
  applyVideoSetting();
  showNotif(url ? "✅ Đã lưu video!" : "✅ Đã tắt video", "success");
}
function saveAnnounceSetting() {
  const txt = document.getElementById("settingsAnnounce")?.value.trim();
  const s = getShopSettings(); s.announce = txt; saveShopSettings(s);
  showNotif("✅ Đã lưu thông báo", "success");
}
window.saveVideoSetting   = saveVideoSetting;
window.saveAnnounceSetting = saveAnnounceSetting;

// ============================================================
// ===== SERVICES RENDER ======================================
// ============================================================
function renderServices() {
  const grid = document.getElementById("servicesGrid");
  if (!grid) return;
  const services  = getServices();
  const loggedIn  = !!(currentUser && !isAdmin());
  const customCats = getCustomCategories();

  let html = `<div class="services-cat-grid">`;
  customCats.forEach(({ key: catKey, name: catName, image: catImgCustom }) => {
    const catSvcs = services.filter(s => s.category === catKey).sort((a, b) => (a.order||a.id) - (b.order||b.id));
    if (!catSvcs.length) return;
    const catImg = catImgCustom || DEFAULT_IMAGES[catKey] || DEFAULT_IMAGES.other;
    const hasVip = catSvcs.some(s => s.badge === "vip" || s.badge === "svip");
    const isFruit = catKey === "fruit";
    const fruitBadge = isFruit
      ? `<div id="catcard-fruit-stock-badge" style="position:absolute;bottom:8px;left:8px;padding:3px 8px;border-radius:8px;background:rgba(26,10,46,0.85);border:1px solid rgba(196,77,255,0.4);font-size:0.65rem;font-weight:700;color:var(--accent);backdrop-filter:blur(4px)">🍎 ...</div>`
      : "";
    html += `<div class="cat-card" id="catcard-${catKey}" onclick="openCatPanel('${catKey}')">
      <div class="cat-card-img-wrap" style="position:relative">
        <img src="${catImg}" alt="${catName}" onerror="this.src='${FALLBACK_IMG}'">
        <div class="cat-card-overlay"></div>
        ${hasVip ? `<div style="position:absolute;top:8px;right:8px;padding:3px 8px;border-radius:8px;background:rgba(255,215,0,0.2);border:1px solid rgba(255,215,0,0.4);font-size:0.65rem;font-weight:700;color:var(--gold)">⭐ VIP</div>` : ""}
        ${fruitBadge}
      </div>
      <div class="cat-card-info">
        <div class="cat-card-title">${catName}</div>
        <div class="cat-card-count">${catSvcs.length} gói dịch vụ</div>
        <div class="cat-card-btn">Xem & Đặt →</div>
      </div>
    </div>`;
  });
  html += `</div>`;

  // Panels chi tiết từng danh mục
  customCats.forEach(({ key: catKey, name: catName }) => {
    const catSvcs = services.filter(s => s.category === catKey).sort((a, b) => (a.order||a.id) - (b.order||b.id));
    if (!catSvcs.length) return;
    const isFruit = catKey === "fruit";
    html += `<div class="cat-panel" id="catpanel-${catKey}" style="display:none">
      <div class="cat-panel-header">
        <button class="cat-panel-back" onclick="closeCatPanel('${catKey}')">← Quay lại</button>
        <span class="cat-panel-title">${catName}</span>
      </div>
      ${isFruit ? `<div id="fruitStockHeader-${catKey}" style="margin-bottom:12px"></div>` : ""}
      <div class="svc-list">
        ${catSvcs.map(svc => {
          const isVip  = svc.badge === "vip";
          const isSvip = svc.badge === "svip";
          const rowCls = isSvip ? "svc-row svc-row-svip" : isVip ? "svc-row svc-row-vip" : "svc-row";
          const btnCls = isSvip ? "btn-order-row btn-order-row-svip" : isVip ? "btn-order-row btn-order-row-vip" : "btn-order-row";
          const badgeCls  = isSvip ? "badge-svip" : isVip ? "badge-vip" : "";
          const badgeTxt  = isSvip ? "SSVIP" : isVip ? "VIP" : "";
          const stockBadge = isFruit
            ? `<span class="fruit-stock-badge" id="fstock-badge-${svc.id}">⏳</span>`
            : "";
          return `<div class="${rowCls}" id="svc-row-${svc.id}">
            <div class="svc-row-info">
              <div class="svc-row-name">${svc.name}${badgeTxt ? ` <span class="svc-row-badge ${badgeCls}">${badgeTxt}</span>` : ""}${stockBadge}</div>
              <div class="svc-row-desc">${svc.desc}</div>
            </div>
            <div class="svc-row-price">${formatPrice(svc.price)}</div>
            <button class="${btnCls}" id="svc-btn-${svc.id}" ${!loggedIn ? "disabled" : ""} onclick="openOrderModal(${svc.id})">
              ${!loggedIn ? "🔒" : "🛒 Đặt"}
            </button>
          </div>`;
        }).join("")}
      </div>
    </div>`;
  });

  grid.innerHTML = html;
  // Áp tồn kho ngay sau khi render
  applyFruitStockToUI();
}

function openCatPanel(catKey) {
  document.querySelector(".services-cat-grid")?.style && (document.querySelector(".services-cat-grid").style.display = "none");
  const panel = document.getElementById(`catpanel-${catKey}`);
  if (panel) {
    panel.style.display = "block";
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
    if (catKey === "fruit") applyFruitStockToUI();
  }
}
function closeCatPanel(catKey) {
  const p = document.getElementById(`catpanel-${catKey}`);
  if (p) p.style.display = "none";
  const g = document.querySelector(".services-cat-grid");
  if (g) g.style.display = "grid";
}
window.openCatPanel  = openCatPanel;
window.closeCatPanel = closeCatPanel;

// ============================================================
// ===== ORDER MODAL & SUBMIT =================================
// ============================================================
async function openOrderModal(svcId) {
  if (!currentUser || isAdmin()) {
    showNotif("Đăng nhập để đặt dịch vụ!", "error");
    openModal("loginModal");
    return;
  }
  const svc = getServices().find(s => s.id === svcId);
  if (!svc) return;

  // Kiểm tra tồn kho trái ác quỷ
  if (svc.category === "fruit") {
    const { inStock } = getFruitStock(svc.id);
    if (!inStock) { showNotif("❌ Trái này đang hết hàng!", "error"); return; }
  }

  currentOrderSvc   = svc;
  selectedSubOption = null;

  document.getElementById("orderServiceName").textContent  = svc.name;
  document.getElementById("orderServiceCode").textContent  = svc.code;
  document.getElementById("orderServicePrice").textContent = formatPrice(svc.price);
  document.getElementById("orderAccount").value   = "";
  document.getElementById("orderPassword").value  = "";
  document.getElementById("orderNote").value      = "";

  const subWrap = document.getElementById("orderSubOptions");
  const opts    = svc.slug ? SERVICE_OPTIONS[svc.slug] : null;
  if (opts) {
    subWrap.innerHTML = `<label class="sub-option-label">${opts.label}:</label>
      <div class="sub-option-grid">
        ${opts.options.map(o => `<button class="sub-option-btn" onclick="selectSubOption(this,'${o}')">${o}</button>`).join("")}
      </div>`;
    subWrap.style.display = "block";
  } else {
    subWrap.innerHTML = "";
    subWrap.style.display = "none";
  }
  openModal("orderModal");
}
function selectSubOption(btn, value) {
  document.querySelectorAll("#orderSubOptions .sub-option-btn").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  selectedSubOption = value;
}
window.openOrderModal  = openOrderModal;
window.selectSubOption = selectSubOption;

async function submitOrder() {
  if (!currentUser || isAdmin()) return;
  const account  = document.getElementById("orderAccount")?.value.trim();
  const password = document.getElementById("orderPassword")?.value.trim();
  const note     = document.getElementById("orderNote")?.value.trim();

  if (!account)  { showNotif("Nhập tài khoản Roblox!", "error"); return; }
  if (!password) { showNotif("Nhập mật khẩu Roblox!", "error"); return; }

  const opts = currentOrderSvc.slug ? SERVICE_OPTIONS[currentOrderSvc.slug] : null;
  if (opts && !selectedSubOption) { showNotif("Vui lòng chọn " + opts.label.toLowerCase() + "!", "error"); return; }

  // ── Tính giảm giá từ danh hiệu ──────────────────────────
  let finalPrice   = currentOrderSvc.price;
  let discountInfo = "";
  if (currentUserData) {
    const dInfo = getTitleDiscount(currentUserData);
    if (dInfo.title && dInfo.discount > 0 && finalPrice >= dInfo.title.minOrder) {
      if (dInfo.discount === 100) {
        finalPrice   = 0;
        discountInfo = "👑 Đại Đế Cảnh — Miễn phí 100%";
      } else {
        finalPrice   = Math.round(finalPrice * (1 - dInfo.discount / 100));
        discountInfo = `${dInfo.title.name} giảm ${dInfo.discount}%`;
      }
    } else if (dInfo.expired && dInfo.title) {
      showNotif(`⚠️ Danh hiệu ${dInfo.title.name} đã hết hạn! Vào Hồ Sơ để gia hạn.`, "info");
    }
  }

  // ── Kiểm tra số dư ──────────────────────────────────────
  const balance = currentUserData?.balance || 0;
  if (balance < finalPrice) {
    showNotif(`❌ Số dư không đủ! Cần ${formatPrice(finalPrice)}, bạn có ${formatPrice(balance)}.`, "error");
    return;
  }

  // ── Chống spam: không đặt cùng gói + cùng tài khoản trong 5 phút ──
  try {
    const recentSnap = await getDocs(query(
      collection(db, "orders"),
      where("uid", "==", currentUser.uid),
      where("serviceId", "==", currentOrderSvc.id),
      where("account", "==", account)
    ));
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const dup = recentSnap.docs.find(d => (d.data().timestamp || 0) > fiveMinAgo);
    if (dup) {
      const waitSec = Math.ceil(((dup.data().timestamp + 5 * 60 * 1000) - Date.now()) / 1000);
      showNotif(`⏳ Bạn vừa đặt gói này! Chờ ${waitSec}s rồi thử lại.`, "error");
      return;
    }
  } catch { /* Tiếp tục nếu không đọc được – không block user */ }

  const orderId = generateOrderId();
  const order = {
    id            : orderId,
    uid           : currentUser.uid,
    username      : currentUserData?.username || currentUser.displayName || currentUser.email,
    serviceId     : currentOrderSvc.id,
    serviceName   : currentOrderSvc.name,
    serviceCode   : currentOrderSvc.code,
    price         : finalPrice,
    origPrice     : currentOrderSvc.price,
    discountInfo  : discountInfo || null,
    subOption     : selectedSubOption || null,
    account, password, note,
    time          : new Date().toLocaleString("vi-VN"),
    timestamp     : Date.now(),
    status        : "pending",
    doneTime      : null,
    doneMessage   : null
  };

  const btn = document.getElementById("orderSubmitBtn");
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Đang đặt..."; }
  try {
    await setDoc(doc(db, "orders", orderId), order);
    // Trừ tiền
    const newBal = Math.max(0, balance - finalPrice);
    await updateDoc(doc(db, "users", currentUser.uid), { balance: newBal });
    currentUserData = { ...currentUserData, balance: newBal };
    closeModal("orderModal");
    showNotif(`🎉 Đặt đơn thành công! Mã: ${orderId}${discountInfo ? " · " + discountInfo : ""}`, "success");
  } catch (e) {
    showNotif("Lỗi khi đặt đơn, thử lại!", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "🎯 Đặt Đơn"; }
  }
}
window.submitOrder = submitOrder;

// ============================================================
// ===== TITLE HELPERS ========================================
// ============================================================
function getTitleStatus(userData) {
  if (!userData?.titleOverride) return { active: false, expired: false, daysLeft: 0 };
  const t = TITLES.find(x => x.id === userData.titleOverride);
  if (!t) return { active: false, expired: false, daysLeft: 0 };
  if (t.permanent || t.id === "luyen-khi") return { active: true, expired: false, daysLeft: Infinity, permanent: true };
  const expiry = userData.titleExpiry || 0;
  if (!expiry) return { active: true, expired: false, daysLeft: 30 };
  const now    = Date.now();
  const msLeft = expiry - now;
  if (now > expiry) {
    return { active: false, expired: true, daysLeft: 0, expiredDaysAgo: Math.ceil((now - expiry) / 86400000) };
  }
  const daysLeft = Math.ceil(msLeft / 86400000);
  return { active: true, expired: false, daysLeft, expiry, earlyRenew: daysLeft <= 3 };
}

function getTitleDiscount(userData) {
  if (!userData?.titleOverride) return { discount: 0, title: null };
  const t = TITLES.find(x => x.id === userData.titleOverride);
  if (!t) return { discount: 0, title: null };
  if (t.permanent) return { discount: t.discount, title: t };
  const status = getTitleStatus(userData);
  if (!status.active) return { discount: 0, title: t, expired: true };
  return { discount: t.discount, title: t };
}

function getRenewalInfo(userData, titleId) {
  if (!userData?.titleOverride || userData.titleOverride !== titleId) return { type: "new", pct: 100 };
  const t = TITLES.find(x => x.id === titleId);
  if (!t || t.permanent || t.adminOnly) return { type: "permanent", pct: 0 };
  const expiry = userData.titleExpiry || 0;
  const now    = Date.now();
  const DAY3   = 3 * 24 * 60 * 60 * 1000;
  if (!expiry) return { type: "new", pct: 100 };
  if (now < expiry) {
    if (expiry - now <= DAY3) return { type: "grace", pct: 50 };
    return { type: "early", pct: 40 };
  }
  if (now < expiry + DAY3) return { type: "grace", pct: 50 };
  return { type: "full", pct: 100 };
}

// ============================================================
// ===== HISTORY ==============================================
// ============================================================
async function loadAndRenderHistory() {
  const el = document.getElementById("historyList");
  if (!el) return;
  el.innerHTML = `<div class="no-data"><p>⏳ Đang tải...</p></div>`;
  const snap = await getDocs(query(
    collection(db, "orders"),
    where("uid", "==", currentUser.uid),
    orderBy("timestamp", "desc")
  ));
  const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderHistoryList(orders);
}
function filterHistoryStatus(status, btn) {
  historyFilter = status;
  document.querySelectorAll(".history-filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  loadAndRenderHistory();
}
function renderHistoryList(all) {
  const el = document.getElementById("historyList");
  const list = historyFilter === "all" ? all : all.filter(o => o.status === historyFilter);
  if (!list.length) { el.innerHTML = `<div class="no-data"><p>Chưa có đơn hàng nào</p></div>`; return; }
  el.innerHTML = list.map(o => `
    <div class="history-card">
      <div class="hc-top"><div class="hc-id">${o.id}</div><div class="hc-time">${o.time}</div></div>
      <div class="hc-service">${o.serviceName}</div>
      <div style="font-size:0.8rem;color:rgba(240,230,255,0.5);margin-bottom:6px">
        TK: <strong style="color:var(--text)">${o.account}</strong>
        ${o.subOption ? ` | Chọn: <strong style="color:var(--accent)">${o.subOption}</strong>` : ""}
        ${o.note ? ` | ${o.note}` : ""}
      </div>
      <div class="hc-price">${formatPrice(o.price)}</div>
      <span class="hc-status ${o.status}">${o.status === "done" ? "✅ Hoàn thành" : "⏳ Đang xử lý"}</span>
      ${o.doneMessage ? `<div class="hc-done-msg">${o.doneMessage}</div>` : ""}
    </div>`).join("");
}
window.filterHistoryStatus = filterHistoryStatus;

// ============================================================
// ===== PROFILE ==============================================
// ============================================================
async function renderProfile() {
  if (!currentUser || !currentUserData) return;
  const uid  = currentUser.uid;
  const user = currentUserData;

  const ordersSnap = await getDocs(query(
    collection(db, "orders"), where("uid", "==", uid), orderBy("timestamp", "desc")
  ));
  const orders     = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const done       = orders.filter(o => o.status === "done");
  const totalSpent = done.reduce((s, o) => s + o.price, 0);

  const title = user.titleOverride ? TITLES.find(t => t.id === user.titleOverride) : null;
  const status = title ? getTitleStatus(user) : null;

  // Thanh tiến trình Zeigarnik
  const autoTitles = TITLES.filter(t => !t.adminOnly).sort((a, b) => (a.minOrder||0) - (b.minOrder||0));
  const nextTitle  = autoTitles.find(t => totalSpent < (t.minOrder || 0) && !t.free);
  let progressHtml = "";
  if (nextTitle) {
    const prev   = autoTitles[autoTitles.indexOf(nextTitle) - 1];
    const prevMin = prev ? (prev.minOrder || 0) : 0;
    const pct    = Math.min(100, Math.round((totalSpent - prevMin) / (nextTitle.minOrder - prevMin) * 100));
    progressHtml = `<div class="title-progress-bar">
      <div class="title-progress-label">Tiến trình → ${nextTitle.name}</div>
      <div class="title-progress-track"><div class="title-progress-fill" style="width:${pct}%"></div></div>
      <div class="title-progress-hint">✨ Còn ${formatPrice(nextTitle.minOrder - totalSpent)} nữa để đạt ${nextTitle.name}!</div>
    </div>`;
  }

  document.getElementById("profileCard").innerHTML = `
    <div class="profile-avatar">${user.username[0].toUpperCase()}</div>
    <div class="profile-name">${user.username}</div>
    ${title
      ? `<span class="profile-title-badge ${title.cls}">${title.icon} ${title.name}</span>`
      : `<div style="color:rgba(240,230,255,0.3);font-size:0.8rem;margin-bottom:8px">Chưa có danh hiệu</div>`}
    <div class="profile-email">📧 ${user.email || "Chưa cập nhật"}</div>
    ${user.facebook ? `<div class="profile-facebook">📘 ${user.facebook}</div>` : ""}
    <div class="profile-info-row">
      <div class="profile-info-item" style="border:1px solid rgba(74,222,128,0.2);background:rgba(74,222,128,0.05)">
        <div class="profile-info-num" style="color:var(--green)">${formatPrice(user.balance || 0)}</div>
        <div class="profile-info-label">Số Dư</div>
      </div>
      <div class="profile-info-item"><div class="profile-info-num">${orders.length}</div><div class="profile-info-label">Tổng Đơn</div></div>
      <div class="profile-info-item"><div class="profile-info-num">${done.length}</div><div class="profile-info-label">Đã Xong</div></div>
      <div class="profile-info-item"><div class="profile-info-num">${formatPrice(totalSpent)}</div><div class="profile-info-label">Đã Chi</div></div>
    </div>
    <div style="font-size:0.72rem;color:rgba(240,230,255,0.3);margin-top:12px">Tham gia: ${user.createdAt}</div>
    ${progressHtml}
    ${buildExpiryHtml(user, title, status)}
  `;

  renderProfileExpiryBox(user);

  // Ô bổ sung thông tin liên hệ
  const suppEl = document.getElementById("profileContactSupp");
  if (suppEl) {
    const missingEmail = !user.email;
    const missingFb    = !user.facebook;
    suppEl.innerHTML = (missingEmail || missingFb) ? `
      <div style="background:linear-gradient(135deg,rgba(255,215,0,0.07),rgba(196,77,255,0.05));border:1px solid rgba(255,215,0,0.28);border-radius:14px;padding:16px 18px;margin-bottom:20px">
        <div style="font-weight:700;font-size:0.9rem;color:var(--gold);margin-bottom:4px">📬 Bổ Sung Thông Tin Liên Hệ</div>
        <div style="font-size:0.75rem;color:rgba(240,230,255,0.6);margin-bottom:14px;line-height:1.6">Giúp chủ shop liên hệ bạn dễ dàng hơn.</div>
        ${missingEmail ? `<div style="margin-bottom:10px"><label style="font-size:0.72rem;color:rgba(240,230,255,0.45);font-weight:600;display:block;margin-bottom:5px">📧 EMAIL</label><input id="suppEmailInput" class="modal-input" type="email" placeholder="email@example.com" style="margin-bottom:0"></div>` : ""}
        ${missingFb ? `<div><label style="font-size:0.72rem;color:rgba(240,230,255,0.45);font-weight:600;display:block;margin-bottom:5px">📘 FACEBOOK</label><input id="suppFbInput" class="modal-input" placeholder="Link hoặc tên Facebook của bạn" style="margin-bottom:0"></div>` : ""}
        <button onclick="saveContactSupp()" style="margin-top:14px;width:100%;padding:10px;border-radius:10px;border:none;background:linear-gradient(135deg,var(--pink),var(--purple));color:#fff;font-family:'Quicksand',sans-serif;font-weight:700;font-size:0.85rem;cursor:pointer">💾 Lưu Thông Tin</button>
      </div>` : "";
  }

  // 5 đơn gần nhất
  const ol = document.getElementById("profileOrderList");
  if (ol) {
    ol.innerHTML = orders.length === 0
      ? `<div class="no-data"><p>Chưa có đơn hàng nào</p></div>`
      : orders.slice(0, 5).map(o => `
          <div class="history-card">
            <div class="hc-top"><div class="hc-id">${o.id}</div><div class="hc-time">${o.time}</div></div>
            <div class="hc-service">${o.serviceName}</div>
            <div class="hc-price">${formatPrice(o.price)}</div>
            <span class="hc-status ${o.status}">${o.status === "done" ? "✅ Hoàn thành" : "⏳ Đang xử lý"}</span>
            ${o.doneMessage ? `<div class="hc-done-msg">${o.doneMessage}</div>` : ""}
          </div>`).join("");
  }
}

function renderProfileExpiryBox(user) {
  const expiryEl = document.getElementById("profileExpiryBox");
  if (!expiryEl) return;

  const tid = user?.titleOverride;
  const t   = tid ? TITLES.find(x => x.id === tid) : null;
  if (!t || t.adminOnly || t.free || tid === "luyen-khi") {
    expiryEl.innerHTML = "";
    return;
  }

  const expiry = user.titleExpiry || 0;
  const now    = Date.now();
  const remain = expiry - now;
  const days   = Math.ceil(remain / 86400000);
  const DAY3   = 3 * 24 * 60 * 60 * 1000;
  const renewPrice40 = Math.round(t.price * 0.4);
  const renewPrice50 = Math.round(t.price * 0.5);

  let boxClass = "title-expiry-box";
  let countdownHtml = "";
  let renewHtml = "";

  if (remain > 0) {
    if (remain <= DAY3) {
      boxClass += " title-expiry-urgent";
      countdownHtml = `<div class="expiry-countdown expiry-urgent-text">⚠️ Còn ${days} ngày hết hạn!</div>`;
      renewHtml = `<div style="font-size:0.72rem;color:rgba(240,230,255,.5);margin-bottom:8px">Gia hạn ngay giá <strong style="color:#ff9040">50%</strong> = ${formatPrice(renewPrice50)} (tiết kiệm ${formatPrice(t.price - renewPrice50)})</div><button class="btn-renew btn-renew-normal" onclick="openBuyTitle('${t.id}')">🔄 Gia Hạn Ngay</button>`;
    } else {
      countdownHtml = `<div class="expiry-countdown expiry-ok-text">✅ Còn ${days} ngày</div>`;
      renewHtml = `<div style="font-size:0.72rem;color:rgba(240,230,255,.5);margin-bottom:8px">Gia hạn sớm giá <strong style="color:#4ade80">40%</strong> = ${formatPrice(renewPrice40)} (tiết kiệm ${formatPrice(t.price - renewPrice40)})</div><button class="btn-renew btn-renew-early" onclick="openBuyTitle('${t.id}')">💚 Gia Hạn Sớm (-40%)</button>`;
    }
  } else {
    const overDays = Math.floor(-remain / 86400000);
    if (-remain <= DAY3) {
      boxClass += " title-expiry-urgent";
      countdownHtml = `<div class="expiry-countdown expiry-urgent-text">⏰ Hết hạn ${overDays > 0 ? overDays + " ngày trước" : "hôm nay"}!</div>`;
      renewHtml = `<div style="font-size:0.72rem;color:rgba(240,230,255,.5);margin-bottom:8px">Gia hạn trong cửa sổ 3 ngày giá <strong style="color:#ff9040">50%</strong> = ${formatPrice(renewPrice50)}</div><button class="btn-renew btn-renew-normal" onclick="openBuyTitle('${t.id}')">🔄 Gia Hạn (50%)</button>`;
    } else {
      boxClass += " title-expiry-expired";
      countdownHtml = `<div class="expiry-countdown expiry-expired-text">❌ Hết hạn ${overDays} ngày trước</div>`;
      renewHtml = `<div style="font-size:0.72rem;color:rgba(240,230,255,.5);margin-bottom:8px">Cửa sổ gia hạn đã đóng — phải mua lại giá gốc ${formatPrice(t.price)}</div><button class="btn-renew btn-renew-full" onclick="openBuyTitle('${t.id}')">🛒 Mua Lại Full Giá</button>`;
    }
  }

  expiryEl.innerHTML = `<div class="${boxClass}">
    <div style="font-size:0.72rem;color:rgba(240,230,255,.45);margin-bottom:4px">⏱ HIỆU LỰC DANH HIỆU</div>
    ${countdownHtml}
    <div style="margin-top:10px">${renewHtml}</div>
  </div>`;
}

function buildExpiryHtml(user, t, status) {
  if (!t || !t.price || t.permanent || t.adminOnly || t.id === "luyen-khi") return "";
  if (!status) return "";
  const renewPrice40 = Math.round(t.price * 0.4);
  const renewPrice50 = Math.round(t.price * 0.5);
  if (status.permanent)  return `<div style="margin-top:10px;padding:8px 14px;border-radius:10px;background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.3);font-size:0.75rem;color:var(--gold);text-align:center">👑 Vĩnh viễn · Miễn 100% mọi dịch vụ</div>`;
  if (status.expired) {
    const ri = getRenewalInfo(user, t.id);
    return `<div style="margin-top:10px;padding:10px 14px;border-radius:10px;background:rgba(255,71,87,0.08);border:1px solid rgba(255,71,87,0.35);font-size:0.78rem;text-align:center">
      <div style="color:var(--red);font-weight:700;margin-bottom:6px">⚠️ Danh hiệu đã hết hạn ${status.expiredDaysAgo} ngày trước</div>
      <button onclick="openBuyTitle('${t.id}')" style="padding:7px 18px;border-radius:20px;border:none;background:linear-gradient(135deg,var(--pink),var(--purple));color:#fff;font-family:'Quicksand',sans-serif;font-weight:700;font-size:0.78rem;cursor:pointer">
        ${ri.pct < 100 ? `🔄 Gia hạn ${ri.pct}% = ${formatPrice(Math.round(t.price * ri.pct / 100))}` : `🛒 Mua lại full = ${formatPrice(t.price)}`}
      </button>
    </div>`;
  }
  const urgency = status.daysLeft <= 3;
  const barColor = urgency ? "#ff4757" : status.daysLeft <= 7 ? "#ffa502" : "#4ade80";
  const barPct   = Math.round((status.daysLeft / 30) * 100);
  return `<div style="margin-top:10px;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid ${urgency ? "rgba(255,71,87,0.4)" : "rgba(74,222,128,0.2)"};font-size:0.78rem">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span style="color:rgba(240,230,255,0.55);font-size:0.7rem">⏳ Hiệu lực danh hiệu</span>
      <span style="font-weight:700;color:${barColor}">${urgency ? "⚠️ " : ""}Còn ${status.daysLeft} ngày</span>
    </div>
    <div style="height:4px;background:rgba(255,255,255,0.08);border-radius:2px;margin-bottom:8px">
      <div style="height:4px;width:${barPct}%;background:${barColor};border-radius:2px;transition:width 0.5s"></div>
    </div>
    ${urgency
      ? `<button onclick="openBuyTitle('${t.id}')" style="width:100%;padding:7px;border-radius:8px;border:none;background:linear-gradient(135deg,var(--pink),var(--purple));color:#fff;font-family:'Quicksand',sans-serif;font-weight:700;font-size:0.78rem;cursor:pointer">🔄 Gia hạn sớm 40% = ${formatPrice(renewPrice40)}</button>`
      : `<div style="font-size:0.7rem;color:rgba(240,230,255,0.35);text-align:center">Gia hạn sớm (≤3 ngày cuối) chỉ 40% = ${formatPrice(renewPrice40)}</div>`}
  </div>`;
}

async function saveContactSupp() {
  if (!currentUser || isAdmin()) return;
  const email = document.getElementById("suppEmailInput")?.value.trim();
  const fb    = document.getElementById("suppFbInput")?.value.trim();
  if (email && !email.includes("@")) { showNotif("Email không hợp lệ!", "error"); return; }
  if (!email && !fb) { showNotif("Điền ít nhất email hoặc Facebook!", "error"); return; }
  const data = {};
  if (email) data.email    = email;
  if (fb)    data.facebook = fb;
  try {
    await updateDoc(doc(db, "users", currentUser.uid), data);
    currentUserData = { ...currentUserData, ...data };
    showNotif("✅ Đã lưu thông tin liên hệ!", "success");
    renderProfile();
  } catch { showNotif("Lỗi lưu thông tin!", "error"); }
}
window.saveContactSupp = saveContactSupp;

// ============================================================
// ===== MUA DANH HIỆU ========================================
// ============================================================
async function openBuyTitle(titleId) {
  if (!currentUser || isAdmin()) { showNotif("Đăng nhập để mua danh hiệu!", "error"); openModal("loginModal"); return; }
  const t = TITLES.find(x => x.id === titleId);
  if (!t || t.adminOnly) return;
  if (t.free) { showNotif("Luyện Khí là danh hiệu mặc định, bạn đã có rồi!", "info"); return; }

  const user     = currentUserData;
  const balance  = user?.balance || 0;
  const ri         = getRenewalInfo(user, titleId);
  const finalPrice = Math.round(t.price * ri.pct / 100);

  if (balance < finalPrice) {
    showNotif(`❌ Số dư không đủ! Cần ${formatPrice(finalPrice)}, bạn có ${formatPrice(balance)}.`, "error");
    return;
  }

  let confirmMsg;
  if (ri.type === "early") {
    confirmMsg = `🔄 Gia hạn sớm "${t.name}"\n💚 Giá ưu đãi 40%: ${formatPrice(finalPrice)} (tiết kiệm ${formatPrice(t.price - finalPrice)})\nSố dư còn lại: ${formatPrice(balance - finalPrice)}`;
  } else if (ri.type === "grace") {
    confirmMsg = `🔄 Gia hạn "${t.name}"\n✨ Giá gia hạn 50%: ${formatPrice(finalPrice)} (tiết kiệm ${formatPrice(t.price - finalPrice)})\nSố dư còn lại: ${formatPrice(balance - finalPrice)}`;
  } else {
    confirmMsg = `🛒 Mua "${t.icon} ${t.name}"\nGiá: ${formatPrice(finalPrice)}\nSố dư còn lại: ${formatPrice(balance - finalPrice)}`;
  }
  if (!confirm(confirmMsg)) return;

  try {
    await updateDoc(doc(db, "users", currentUser.uid), { balance: balance - finalPrice });
    await addDoc(collection(db, "titlepurchases"), {
      uid: currentUser.uid, username: user.username,
      titleId, titleName: t.name,
      price: finalPrice, origPrice: t.price, renewalType: ri.type,
      time: new Date().toLocaleString("vi-VN"), timestamp: Date.now(), status: "pending"
    });
    currentUserData = { ...currentUserData, balance: balance - finalPrice };
    showNotif(`✅ Đã ${ri.type === "new" ? "mua" : "gia hạn"} ${t.name}! Chờ chủ shop cấp.`, "success");
    triggerCelebration();
  } catch { showNotif("Lỗi mua danh hiệu!", "error"); }
}
window.openBuyTitle = openBuyTitle;

// ============================================================
// ===== NẠP THẺ ==============================================
// ============================================================
function selectCardType(type, btn) {
  selectedCardType = type;
  document.querySelectorAll(".card-type-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const el = document.getElementById("cardType");
  if (el) el.value = type;
}
window.selectCardType = selectCardType;

async function submitCard() {
  if (!currentUser || isAdmin()) { showNotif("Đăng nhập để nạp thẻ!", "error"); return; }
  const serial = document.getElementById("cardSerial")?.value.trim();
  const code   = document.getElementById("cardCode")?.value.trim();
  const denom  = parseInt(document.getElementById("cardDenom")?.value);
  if (!serial) { showNotif("Nhập số seri thẻ!", "error"); return; }
  if (!code)   { showNotif("Nhập mã số thẻ!", "error"); return; }
  if (!denom)  { showNotif("Chọn mệnh giá thẻ!", "error"); return; }

  const btn = document.getElementById("cardSubmitBtn");
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Đang gửi..."; }
  try {
    await addDoc(collection(db, "cards"), {
      uid: currentUser.uid,
      username: currentUserData?.username || currentUser.displayName,
      type: selectedCardType, denom, serial, code,
      time: new Date().toLocaleString("vi-VN"), timestamp: Date.now(),
      status: "pending", note: ""
    });
    document.getElementById("cardSerial").value = "";
    document.getElementById("cardCode").value   = "";
    showNotif("✅ Đã gửi thẻ! Chờ admin duyệt.", "success");
    loadCardHistory();
  } catch { showNotif("❌ Lỗi gửi thẻ, thử lại!", "error"); }
  finally { if (btn) { btn.disabled = false; btn.textContent = "💳 Gửi Thẻ Nạp"; } }
}
window.submitCard = submitCard;

async function loadCardHistory() {
  const el = document.getElementById("cardHistoryList");
  if (!el || !currentUser) return;
  el.innerHTML = `<div class="no-data"><p>⏳ Đang tải...</p></div>`;
  try {
    const snap = await getDocs(query(
      collection(db, "cards"), where("uid", "==", currentUser.uid), orderBy("timestamp", "desc")
    ));
    const cards = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!cards.length) { el.innerHTML = `<div class="no-data"><p>Chưa có lịch sử nạp thẻ</p></div>`; return; }
    el.innerHTML = cards.map(c => `
      <div class="card-history-item">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <strong>${c.type} — ${formatPrice(c.denom)}</strong>
          <span class="card-status-badge card-status-${c.status}">${c.status === "done" ? "✅ Đã duyệt" : c.status === "failed" ? "❌ Thất bại" : "⏳ Chờ duyệt"}</span>
        </div>
        <div style="font-size:0.75rem;color:rgba(240,230,255,0.4)">${c.time}</div>
        ${c.note ? `<div style="font-size:0.75rem;color:var(--accent);margin-top:4px">${c.note}</div>` : ""}
      </div>`).join("");
  } catch { el.innerHTML = `<div class="no-data"><p>Lỗi tải dữ liệu</p></div>`; }
}

// ============================================================
// ===== TOP NẠP ==============================================
// ============================================================
async function loadTopNap() {
  const grid = document.getElementById("topNapGrid");
  if (!grid) return;
  try {
    const snap = await getDocs(query(collection(db, "cards"), where("status", "==", "done"), orderBy("timestamp", "desc")));
    const cards = snap.docs.map(d => d.data());
    const now = new Date();
    const thisMonth = cards.filter(c => {
      const d = new Date(c.timestamp);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totals = {};
    thisMonth.forEach(c => { totals[c.username] = (totals[c.username] || 0) + c.denom; });
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (!sorted.length) { grid.innerHTML = `<div style="text-align:center;color:rgba(240,230,255,0.3);padding:20px;font-size:0.82rem">Chưa có lượt nạp tháng này</div>`; return; }
    const medals = ["👑","🥈","🥉","4️⃣","5️⃣"];
    const bc = ["rgba(255,215,0,0.45)","rgba(192,192,192,0.3)","rgba(205,127,50,0.3)","rgba(196,77,255,0.2)","rgba(196,77,255,0.15)"];
    const bg = ["rgba(255,215,0,0.06)","rgba(255,255,255,0.03)","rgba(255,255,255,0.03)","rgba(255,255,255,0.02)","rgba(255,255,255,0.02)"];
    grid.innerHTML = sorted.map(([name, total], i) => `
      <div class="top-nap-row" style="border-color:${bc[i]};background:${bg[i]}">
        <div class="top-nap-rank">${medals[i]}</div>
        <div class="top-nap-name">${name}</div>
        <div class="top-nap-amt">${formatPrice(total)}</div>
      </div>`).join("");
  } catch { grid.innerHTML = `<div style="text-align:center;color:rgba(240,230,255,0.3);padding:16px">Không thể tải</div>`; }
}

// ============================================================
// ===== REALTIME ORDER LISTENER ==============================
// ============================================================
function startOrderListener(uid) {
  if (_orderListener) { _orderListener(); _orderListener = null; }
  _knownOrderStatus = {};
  // Snapshot đầu tiên để ghi nhớ trạng thái ban đầu
  getDocs(query(collection(db, "orders"), where("uid", "==", uid))).then(snap => {
    snap.docs.forEach(d => { _knownOrderStatus[d.id] = d.data().status; });
    _orderListener = onSnapshot(
      query(collection(db, "orders"), where("uid", "==", uid)),
      snapshot => {
        snapshot.docChanges().forEach(change => {
          const order = { id: change.doc.id, ...change.doc.data() };
          if (change.type === "modified") {
            if (_knownOrderStatus[order.id] === "pending" && order.status === "done") {
              showToastDone(order);
              triggerCelebration();
            }
          }
          _knownOrderStatus[order.id] = order.status;
        });
      }
    );
  }).catch(() => {});
}
function stopOrderListener() {
  if (_orderListener) { _orderListener(); _orderListener = null; }
  _knownOrderStatus = {};
}

function showToastDone(order) {
  const body = document.getElementById("toastDoneBody");
  if (body) body.innerHTML = `
    <div class="toast-done-svc">${order.serviceName}</div>
    <div style="margin-top:4px">Mã đơn: <strong style="font-family:monospace;color:var(--purple)">${order.id}</strong></div>
    ${order.doneTime ? `<div style="margin-top:3px;font-size:0.72rem;color:rgba(240,230,255,0.45)">Xong lúc: ${order.doneTime}</div>` : ""}
    <div style="margin-top:6px;color:var(--gold);font-size:0.75rem">Cảm ơn đã tin tưởng Thanh Minh Các! 🐉</div>`;
  document.getElementById("toastDone")?.classList.add("show");
  setTimeout(() => document.getElementById("toastDone")?.classList.remove("show"), 12000);
}
function closeToastDone() { document.getElementById("toastDone")?.classList.remove("show"); }
window.closeToastDone = closeToastDone;

// ============================================================
// ===== FRUIT STOCK SYSTEM ===================================
// ============================================================
function getFruitStock(svcId) {
  const d = _fruitStockCache[String(svcId)];
  return { qty: d?.qty || 0, inStock: (d?.qty || 0) > 0 };
}

function startFruitStockListener() {
  if (_fruitStockListener) return;
  _fruitStockListener = onSnapshot(collection(db, "fruitstock"), snap => {
    snap.forEach(d => { _fruitStockCache[d.id] = d.data(); });
    snap.docChanges().forEach(change => {
      if (change.type === "removed") delete _fruitStockCache[change.doc.id];
    });
    applyFruitStockToUI();
  }, () => {});
}
function stopFruitStockListener() {
  if (_fruitStockListener) { _fruitStockListener(); _fruitStockListener = null; }
}

function applyFruitStockToUI() {
  const fruits = getServices().filter(s => s.category === "fruit");
  fruits.forEach(svc => {
    const { qty, inStock } = getFruitStock(svc.id);
    const badge = document.getElementById(`fstock-badge-${svc.id}`);
    if (badge) {
      badge.className = `fruit-stock-badge ${inStock ? "in-stock" : "out-of-stock"}`;
      badge.innerHTML = inStock ? `✅ Còn ${qty}` : "❌ Hết";
    }
    const btn = document.getElementById(`svc-btn-${svc.id}`);
    if (btn) {
      if (!inStock) {
        btn.disabled = true; btn.textContent = "Hết Hàng";
        btn.style.background = "rgba(255,255,255,0.08)"; btn.style.color = "rgba(240,230,255,0.3)"; btn.style.cursor = "not-allowed";
      } else if (currentUser && !isAdmin()) {
        btn.disabled = false; btn.textContent = "🛒 Đặt";
        btn.style.background = ""; btn.style.color = ""; btn.style.cursor = "";
      }
    }
  });
  // Badge tổng quan card trái ác quỷ
  const catBadge = document.getElementById("catcard-fruit-stock-badge");
  if (catBadge) {
    const total      = fruits.length;
    const inStockCnt = fruits.filter(s => getFruitStock(s.id).inStock).length;
    if (total > 0) {
      if (inStockCnt === 0)       { catBadge.innerHTML = "❌ Hết hàng"; catBadge.style.color = "var(--red)"; }
      else if (inStockCnt < total){ catBadge.innerHTML = `🍎 Còn ${inStockCnt}/${total} loại`; catBadge.style.color = "#ffa502"; }
      else                        { catBadge.innerHTML = `✅ Đủ hàng ${total} loại`; catBadge.style.color = "var(--green)"; }
    }
  }
  updateFruitPanelHeader();
}

function updateFruitPanelHeader() {
  const el = document.getElementById("fruitStockHeader-fruit");
  if (!el) return;
  const fruits     = getServices().filter(s => s.category === "fruit");
  const total      = fruits.length;
  const inStockCnt = fruits.filter(s => getFruitStock(s.id).inStock).length;
  if (!total) { el.innerHTML = ""; return; }
  const pct   = Math.round(inStockCnt / total * 100);
  const color = inStockCnt === 0 ? "var(--red)" : inStockCnt < total / 2 ? "#ffa502" : "var(--green)";
  el.innerHTML = `<div class="fruit-stock-banner">
    <div class="fruit-stock-banner-dot" style="background:${color}"></div>
    <div style="flex:1">
      <div style="font-weight:700;font-size:0.85rem;color:${color}">🍎 Tồn kho: ${inStockCnt}/${total} loại còn hàng</div>
      <div style="font-size:0.7rem;color:rgba(240,230,255,0.45);margin-top:2px">Dữ liệu cập nhật realtime từ chủ shop</div>
    </div>
    <div style="font-family:'Orbitron',sans-serif;font-size:1.1rem;font-weight:700;color:${color}">${pct}%</div>
  </div>`;
}

// ============================================================
// ===== DANH HIỆU GRID (SHOP) ================================
// ============================================================
function titleLogo(t) {
  return DH_LOGOS[t.id] || `<span style="font-size:2rem">${t.icon}</span>`;
}

function renderTitleShopGrid() {
  const row1 = document.getElementById("titleRow1");
  const row2 = document.getElementById("titleRow2");
  const row3 = document.getElementById("titleRow3");
  if (!row1 || !row2 || !row3) return;

  const tiers = ["tier-1","tier-2","tier-3","tier-4","tier-5","tier-5b","tier-6","tier-7","tier-8"];
  const T = TITLES;

  const cardHtml = (t, tierCls, extraCls = "", extraStyle = "") => {
    const isFree = t.free || t.price === 0;
    const renewHint = !isFree
      ? `<div style="font-size:0.62rem;color:rgba(240,230,255,0.3);margin-bottom:6px">GH sớm: <span style="color:var(--accent)">${formatPrice(Math.round(t.price * 0.4))}</span> · Hết ≤3 ngày: <span style="color:var(--gold)">${formatPrice(Math.round(t.price * 0.5))}</span></div>`
      : "";
    return `<div class="dh-card ${tierCls} ${extraCls}" style="${extraStyle}" onclick="openBuyTitle('${t.id}')">
      <div class="dh-card-logo">${titleLogo(t)}</div>
      <div class="dh-card-name"><span class="${t.cls}" style="padding:2px 8px;border-radius:8px;display:inline-block">${t.name}</span></div>
      <div class="dh-card-price">${isFree ? `<span style="color:var(--green);font-size:0.78rem;font-family:Quicksand,sans-serif">Mặc định</span>` : formatPrice(t.price)}</div>
      ${renewHint}
      <div class="dh-card-perk">${t.desc}${t.discount > 0 && t.discount < 100 ? `<br><span class="hl">✨ -${t.discount}% đơn ≥${formatPrice(t.minOrder)}</span>` : ""}</div>
      <div class="dh-card-btn">${isFree ? "Đã có" : "Mua Ngay →"}</div>
    </div>`;
  };

  const bannerHtml = t => `<div class="dh-card tier-8 banner-card" onclick="openBuyTitle('${t.id}')">
    <div class="dh-card-logo" style="width:72px;height:72px;flex-shrink:0;margin:0">${titleLogo(t)}</div>
    <div class="dh-card-body">
      <div class="dh-card-name"><span class="${t.cls}" style="padding:2px 10px;border-radius:8px;display:inline-block">${t.name}</span></div>
      <div class="dh-card-price">${formatPrice(t.price)}</div>
      <div style="font-size:0.62rem;color:rgba(240,230,255,0.3);margin-bottom:6px">GH sớm: <span style="color:var(--accent)">${formatPrice(Math.round(t.price * 0.4))}</span> · Hết ≤3 ngày: <span style="color:var(--gold)">${formatPrice(Math.round(t.price * 0.5))}</span></div>
      <div class="dh-card-perk" style="font-size:0.72rem">${t.desc}<br><span class="hl">✨ Giảm ${t.discount}% đơn ≥${formatPrice(t.minOrder)}</span></div>
    </div>
    <div style="flex-shrink:0"><div class="dh-card-btn" style="padding:9px 22px;font-size:0.8rem">Mua Ngay →</div></div>
  </div>`;

  // ROW 1: Luyện Khí → Hoá Thần (5 card nhỏ)
  row1.innerHTML = [T[0], T[1], T[2], T[3], T[4]].map((t, i) => cardHtml(t, tiers[i])).join("");

  // ROW 2: Luyện Hư | Hợp Thể (featured) | Đại Thừa
  const luyenHu = T[5];
  const hopThe  = T[6];
  const daiThua = T[7];
  row2.innerHTML = cardHtml(luyenHu, "tier-5b")
    + `<div class="dh-card tier-6 featured-card title-featured" onclick="openBuyTitle('${hopThe.id}')" style="position:relative;overflow:visible">
        <div class="dh-card-logo" style="width:80px;height:80px;margin:0 auto 12px">${titleLogo(hopThe)}</div>
        <div class="dh-card-name" style="font-size:1.05rem"><span class="${hopThe.cls}" style="padding:2px 10px;border-radius:8px;display:inline-block">${hopThe.name}</span></div>
        <div class="dh-card-price" style="font-size:1rem">${formatPrice(hopThe.price)}</div>
        <div style="font-size:0.62rem;color:rgba(240,230,255,0.3);margin-bottom:6px">GH sớm: <span style="color:var(--accent)">${formatPrice(Math.round(hopThe.price * 0.4))}</span> · ≤3 ngày: <span style="color:var(--gold)">${formatPrice(Math.round(hopThe.price * 0.5))}</span></div>
        <div class="dh-card-perk">${hopThe.desc}<br><span class="hl">✨ -${hopThe.discount}% đơn ≥${formatPrice(hopThe.minOrder)}</span></div>
        <div class="dh-card-btn" style="padding:9px 22px">Mua Ngay →</div>
      </div>`
    + cardHtml(daiThua, "tier-7");

  // ROW 3: Độ Kiếp – banner ngang
  row3.innerHTML = bannerHtml(T[8]);
}

// ============================================================
// ===== CELEBRATION ==========================================
// ============================================================
function triggerCelebration() {
  const overlay = document.createElement("div");
  overlay.className = "celebration-overlay";
  document.body.appendChild(overlay);
  const colors = ["#ff6b9d","#c44dff","#ffd700","#4ade80","#ff9de2"];
  for (let i = 0; i < 40; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.style.left             = Math.random() * 100 + "vw";
    c.style.background       = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDuration  = (Math.random() * 2 + 1.5) + "s";
    c.style.animationDelay     = Math.random() * 0.5 + "s";
    c.style.width  = (Math.random() * 8 + 4) + "px";
    c.style.height = (Math.random() * 8 + 4) + "px";
    overlay.appendChild(c);
  }
  setTimeout(() => overlay.remove(), 3000);
}

// ============================================================
// ===== IMAGE UPLOAD (admin) =================================
// ============================================================
function handleImgUpload(fileInputId, urlInputId, previewId) {
  const file = document.getElementById(fileInputId)?.files?.[0];
  if (!file) return;
  if (file.size > 5_000_000) { showNotif("Ảnh quá lớn! Chọn ảnh dưới 5MB", "error"); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const TARGET_W = 800, TARGET_H = 600;
      const srcRatio = img.width / img.height, tgtRatio = TARGET_W / TARGET_H;
      let sx, sy, sw, sh;
      if (srcRatio > tgtRatio) { sh = img.height; sw = sh * tgtRatio; sx = (img.width - sw) / 2; sy = 0; }
      else                     { sw = img.width;  sh = sw / tgtRatio; sx = 0; sy = (img.height - sh) / 2; }
      const canvas = document.createElement("canvas");
      canvas.width = TARGET_W; canvas.height = TARGET_H;
      canvas.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, TARGET_W, TARGET_H);
      const base64 = canvas.toDataURL("image/jpeg", 0.88);
      const urlEl  = document.getElementById(urlInputId);
      const prev   = document.getElementById(previewId);
      if (urlEl) urlEl.value = base64;
      if (prev)  { prev.src = base64; prev.style.display = "block"; prev.style.height = "120px"; prev.style.objectFit = "cover"; }
      showNotif("✅ Ảnh đã được cân chỉnh tự động 4:3", "success");
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
// ===== MESSENGER TOOLTIP ====================================
// ============================================================
setTimeout(() => {
  const t = document.getElementById("messengerTooltip");
  if (t) { t.style.display = "block"; setTimeout(() => (t.style.display = "none"), 4000); }
}, 2000);

// ============================================================
// ===== KEYBOARD SHORTCUTS ===================================
// ============================================================
document.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    if (document.getElementById("loginModal")?.classList.contains("show"))    handleLogin();
    if (document.getElementById("registerModal")?.classList.contains("show")) handleRegister();
    if (document.getElementById("orderModal")?.classList.contains("show"))    submitOrder();
  }
});

// ============================================================
// ===== MODAL EXPOSE =========================================
// ============================================================
window.openModal  = openModal;
window.closeModal = closeModal;
window.renderServices    = renderServices;
window.applyVideoSetting = applyVideoSetting;
// Dùng chung với admin.js (tránh logic getServices bị lệch)
window.__tmcGetServices         = getServices;
window.__tmcGetCustomCategories = getCustomCategories;

// ============================================================
// ===== INIT =================================================
// ============================================================
(function init() {
  renderServices();
  applyVideoSetting();
  loadTopNap();
  renderTitleShopGrid();
  // updateNav() sẽ được gọi bởi onAuthStateChanged khi Firebase khởi động
})();

// ============================================================
// ===== DEFAULT SERVICES =====================================
// ============================================================
function getDefaultServices() {
  const s = (id, n, p, c, b, d, slug) => ({
    id, name: n, price: p, category: c, badge: b, desc: d || n, image: "", slug: slug || null,
    order: id, code: (b === "svip" ? "SSVIP-" : b === "vip" ? "S-" : "") + "TMC-" + String(id).padStart(3, "0")
  });
  return [
    s(1,"Lấy tộc (Human/Angel/Shark/Mink)",10900,"race","normal","Chọn 1 trong 4 tộc","race-basic"),
    s(2,"Lấy tộc Ghoul",21900,"race","normal","Lấy tộc Ghoul"),
    s(3,"Lấy tộc Cyborg",42900,"race","normal","Lấy tộc Cyborg"),
    s(4,"Up V2 — đồng giá (đủ tiền)",10900,"race-upgrade","normal","Đã có V1, đủ tiền","upgrade-v2-du"),
    s(5,"Up V2 — đồng giá (thiếu tiền)",16900,"race-upgrade","normal","Đã có V1, thiếu tiền","upgrade-v2-thieu"),
    s(6,"Up V3 — đồng giá (đủ tiền)",10900,"race-upgrade","normal","Đã có V2, đủ tiền","upgrade-v3-du"),
    s(7,"Up V3 — đồng giá (thiếu tiền)",22900,"race-upgrade","normal","Đã có V2, thiếu tiền","upgrade-v3-thieu"),
    s(8,"VIP Lấy V2 + V3",29900,"race-upgrade","vip","VIP combo V2 và V3","upgrade-vip-v2v3"),
    s(9,"VIP All V2 + V3 (thiếu tiền)",49900,"race-upgrade","vip","VIP full V2-V3 thiếu tiền","upgrade-vip-all"),
    s(10,"Lấy mũ Rip_Indra",34900,"race-v4","normal","Mũ Rip cho V4"),
    s(11,"Lấy mảnh gương (Mirror Fractal)",47900,"race-v4","normal","Mirror Fractal"),
    s(12,"Treo đảo bí ẩn",29900,"race-v4","normal","Gạt cần V4"),
    s(13,"VIP All: Mũ + Gương + Đảo",99900,"race-v4","vip","VIP combo V4 đầy đủ"),
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
    s(38,"Đai Trắng",5900,"draco","normal","Draco đai trắng"),
    s(39,"Đai Vàng",5900,"draco","normal","Draco đai vàng"),
    s(40,"Đai Cam",5900,"draco","normal","Draco đai cam"),
    s(41,"Đai Xanh Lá",5900,"draco","normal","Draco đai xanh lá"),
    s(42,"Đai Xanh Dương",5900,"draco","normal","Draco đai xanh dương"),
    s(43,"Đai Hồng",5900,"draco","normal","Draco đai hồng"),
    s(44,"Đai Đỏ",10900,"draco","normal","Draco đai đỏ"),
    s(45,"Đai Đen",22900,"draco","normal","Draco đai đen"),
    s(46,"VIP Lấy Full Đai (Trắng→Đen)",54900,"draco","vip","VIP full đai"),
    s(47,"Draco V1",11900,"draco","normal","Lấy Draco V1"),
    s(48,"Draco V2 (đủ tiền)",22900,"draco","normal","Đủ tiền in-game"),
    s(49,"Draco V2 (thiếu tiền)",29900,"draco","normal","Thiếu tiền in-game"),
    s(50,"Draco V3 (đủ tiền)",11900,"draco","normal","Đủ tiền in-game"),
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
