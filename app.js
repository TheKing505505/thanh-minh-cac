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
// ⚠️  HÃY THAY CHUỖI NÀY THÀNH UID THẬT CỦA BẠN TRÊN FIREBASE
const ADMIN_UID = "dZ1j9g4vVcSDlGDtRIEkQlY7Vbt1";

// Thời hạn danh hiệu: 30 ngày tính bằng milliseconds
const TITLE_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

// Định nghĩa tất cả danh hiệu tu luyện
const TITLES = [
  { id:"luyen-khi",  name:"Luyện Khí",   price:0,      cls:"dh-luyen-khi",  icon:"🟦", permanent:true,  free:true,   adminOnly:false },
  { id:\"truc-co\",    name:\"Trúc Cơ\",     price:9900,   cls:\"dh-truc-co\",    icon:\"🟩\", adminOnly:false },
  { id:\"kim-dan\",    name:\"Kim Đan\",     price:24900,  cls:\"dh-kim-dan\",    icon:\"🟨\", adminOnly:false },
  { id:\"nguyen-anh\",  name:\"Nguyên Anh\",  price:49900,  cls:\"dh-nguyen-anh\", icon:\"🟧\", adminOnly:false },
  { id:\"hoa-than\",   name:\"Hóa Thần\",    price:99900,  cls:\"dh-hoa-than\",   icon:\"🟥\", adminOnly:false },
  { id:\"luyen-hu\",    name:\"Luyện Hư\",    price:149900, cls:\"dh-luyen-hu\",   icon:\"🟪\", adminOnly:false },
  { id:\"hop-the\",    name:\"Hợp Thể\",     price:249900, cls:\"dh-hop-the\",    icon:\"✨\", adminOnly:false, featured:true },
  { id:\"dai-thua\",   name:\"Đại Thừa\",    price:499900, cls:\"dh-dai-thua\",   icon:\"👑\", adminOnly:false },
  { id:\"do-kiep\",    name:\"Độ Kiếp\",     price:999900, cls:\"dh-do-kiep\",    icon:\"⚡\", adminOnly:false },
  { id:\"ca-chep\",    name:\"Cá Chép\",     price:0,      cls:\"dh-ca-chep\",    icon:\"🐟\", adminOnly:true },
  { id:\"than-bi\",    name:\"Thần Bí\",     price:0,      cls:\"dh-than-bi\",    icon:\"❓\", adminOnly:true },
  { id:\"kiem-ton\",   name:\"Kiếm Tôn\",    price:0,      cls:\"dh-kiem-ton\",   icon:\"⚔️\", adminOnly:true }
];

let currentUser = null;
let activeCategory = "all";

// Danh sách dịch vụ cày thuê gốc
function s(id, name, price, cat, type, desc) {
  return { id, name, price, cat, type, desc };
}
const SERVICES = [
    s(1,"Level 1 - 2550 (Max)",49900,"level","normal","Cày cấp độ từ 1 đến Tối đa mượt mà"),
    s(2,"Level 1500 - 2550",34900,"level","normal","Cày từ đầu Sea 3 lên Max"),
    s(3,"Level 700 - 1500",19900,"level","normal","Cày trọn vẹn Sea 2"),
    s(4,"Cày lẻ 100 Level (Sea 1)",3900,"level","normal","Mỗi đơn vị mua tương ứng 100 cấp"),
    s(5,"Cày lẻ 100 Level (Sea 2)",2900,"level","normal","Mỗi đơn vị mua tương ứng 100 cấp"),
    s(6,"Cày lẻ 100 Level (Sea 3)",3500,"level","normal","Mỗi đơn vị mua tương ứng 100 cấp"),
    s(7,"VIP Level 1 - Max + Full Melee V2",109900,"level","vip","Bao gồm Max Level và tất cả võ học V2"),
    s(8,"SVIP Thành Chủ (Max Lv + Godhuman + Sg/Cdk)",199900,"level","svip","Gói tối thượng cho khởi đầu hoàn hảo"),
    s(9,"Beli: 10,000,000 Beli",9900,"beli","normal","Cày tiền nhanh chóng"),
    s(10,"Beli: 50,000,000 Beli",39900,"beli","normal","Gói tiền lớn tiết kiệm"),
    s(11,"Fragment: 10,000 F",9900,"frag","normal","Cày mảnh vỡ thạch"),
    s(12,"Fragment: 50,000 F",39900,"frag","normal","Gói mảnh vỡ số lượng lớn"),
    s(13,"Godhuman (Đủ nguyên liệu & 400 Mastery)",44900,"melee","normal","Học võ học tối thượng Godhuman"),
    s(14,"Sanguine Art",39900,"melee","normal","Học võ học hút máu Sanguine Art"),
    s(15,"Superhuman / Death Step / Sharkman Karate / Electric Claw / Dragon Talon",14900,"melee","normal","Cày lẻ từng loại võ học tiến hóa"),
    s(16,"Cày Mastery Melee (Mỗi 100 điểm - Max 600)",4900,"melee","normal","Tăng điểm thông thạo võ học"),
    s(17,"Cursed Dual Katana (CDK)",44900,"sword","normal","Cày thanh song kiếm nguyền rủa"),
    s(18,"Soul Guitar",34900,"sword","normal","Cày khẩu súng thần thoại"),
    s(19,"Shark Anchor (Mỏ neo)",34900,"sword","normal","Lấy mỏ neo huyền thoại từ quái biển"),
    s(20,"Triple Dark Blade (Chỉ nhận khi có sẵn 3 kiếm)",149900,"sword","vip","Hợp thể tam kiếm tối thượng"),
    s(21,"Cày Mastery Kiếm/Súng/Trái (Mỗi 100 điểm)",4900,"sword","normal","Nâng thông thạo cho vũ khí/trái ác quỷ"),
    s(22,"Raid Thường (Mỗi Trận - Tối thiểu 5 trận)",1900,"raid","normal","Điêu phối Raid kiếm Fragment"),
    s(23,"Raid Tộc V4 (Mỗi trận thắng)",14900,"raid","normal","Điêu phối gạt cần nâng tộc V4"),
    s(24,"Trọn bộ Tộc V4 Full Gear (Chưa có gạt cần)",119900,"raid","vip","Nâng cấp tối đa sức mạnh Tộc V4"),
    s(25,"Trọn bộ Tộc V4 Full Gear (Đã có gạt cần)",89900,"raid","vip","Tiết kiệm hơn nếu đã hoàn thành gạt cần"),
    s(26,"Mở khóa đảo bí ẩn (Mirage Island)",29000,"sea","normal","Tìm kiếm đảo ẩn trong đêm trăng"),
    s(27,"Săn Sea Beast (Mỗi 5 con)",14900,"sea","normal","Diệt quái biển lấy vật phẩm và tiền"),
    s(28,"Gói Săn Quái Biển 5 Giờ Liên Tục",49900,"sea","vip","Tập trung farm tài nguyên biển"),
    s(29,"Chủng tộc V3 (Nhân loại/Thỏ/Cá/Thiên thần...)",9900,"sea","normal","Nâng cấp tiến hóa chủng tộc lên V3"),
    s(30,"Cày Trọn Gói Trầm Tích Đáy Biển (Full Tộc V4 + Gh + Cdk + Sg)",299900,"level","svip","Tài khoản bá chủ mọi mặt trận"),
    s(31,"Yêu cầu riêng biệt theo giờ (Mỗi giờ)",15000,"level","normal","Liên hệ cửa hàng để thống nhất công việc"),
    s(32,"Hạt Lạc (Mảnh gương)",35000,"sea","normal","Săn mảnh gương vỡ mảnh"),
    s(33,"Đả bại Boss Dough King (Thức tỉnh Dough)",35000,"raid","normal","Đánh bại vua bánh ngọt"),
    s(34,"Dough Raid (Thức tỉnh toàn bộ chiêu)",45000,"raid","normal","Thức tỉnh hoàn chỉnh trái Dough"),
    s(35,"Phoenix Raid (Thức tỉnh toàn bộ chiêu)",45000,"raid","normal","Thức tỉnh hoàn chỉnh trái Phượng hoàng"),
    s(36,"Săn Trùm Leviathan lấy Tim (Leviathan Heart)",65000,"sea","normal","Săn trái tim vương quái"),
    s(37,"Hút Thạch Quái Biển (Farm Leviathan Shield)",45000,"sea","normal","Cày nguyên liệu rương thần thoại"),
    s(38,"Kiếm Tà Thần Tushita",20000,"sword","normal","Lấy thanh kiếm Tushita ẩn giấu"),
    s(39,"Kiếm Ma Thần Shisui / Wando / Saddi",15000,"sword","normal","Lấy lẻ từng thanh trong bộ tam kiếm"),
    s(40,"Kiếm Thánh Yama",20000,"sword","normal","Hoàn thành thử thách lấy kiếm Yama"),
    s(41,"Trọn bộ Tam Kiếm Trấn Phái (True Triple Katana)",55000,"sword","vip","Sở hữu thanh tam kiếm cổ đại"),
    s(42,"Lấy Áo Choàng Bóng Tối (Dark Coat)",65000,"sword","normal","Săn boss râu đen lấy áo choàng tỉ lệ thấp"),
    s(43,"Cày Điểm Định Mệnh (Bones Farm - Mỗi 1000 xương)",10000,"frag","normal","Farm xương đảo hồn ma"),
    s(44,"Kẹo Giáng Sinh (Candy Farm - Mỗi 1000 kẹo)",15000,"frag","normal","Sự kiện giới hạn"),
    s(45,"Săn Thuyền Ma Tốc Độ (Ship Raid - 10 Thuyền)",20000,"sea","normal","Săn tàu chiến cổ đại"),
    s(46,"Săn Ấn Thạch Rồng (Dragon Breath)",15000,"melee","normal","Học võ rồng V1"),
    s(47,"Võ Ếch Trấn Phái (Water Kungfu)",15000,"melee","normal","Học võ nước V1"),
    s(48,"Võ Hắc Cước (Dark Step)",10000,"melee","normal","Học võ chân đen V1"),
    s(49,"Võ Điện Long (Electro)",12000,"melee","normal","Học võ điện V1"),
    s(50,"Võ Cổ Đại Quỷ Tộc (Godhuman V1 Prep)",15000,"melee","normal","Chuẩn bị võ học nền tảng"),
    s(51,"Tầm Bảo Rương Vàng (Farm 50 Rương Vàng)",10000,"beli","normal","Nhặt rương tích lũy"),
    s(52,"Thức tỉnh Trái Ác Quỷ Bất Kỳ (1 Chiêu)",10000,"raid","normal","Thức tỉnh lẻ chiêu thức"),
    s(53,"Trọn Bộ Thức Tỉnh Trái Thường (Flame/Ice/Light/Dark...)",25000,"raid","normal","Thức tỉnh full bộ kỹ năng"),
    s(54,"Raid Nâng Cấp Tộc V4 Đơn Lẻ (1 Lần Chọn)",20000,"raid","normal","Nâng cấp lẻ tầng bánh răng"),
    s(55,"Vượt Cửa Ải Mirage lấy Ngôi Sao (Blue Gear)",39000,"sea","normal","Tìm bánh răng xanh trên đảo Mirage"),
    s(56,"Lấy Mũ Phi Đội (Pilot Helmet)",10000,"sword","normal","Săn phụ kiện tăng tốc chạy"),
    s(57,"Lấy Khuyên Tai Thần Thánh (Pale Scarf)",15000,"sword","normal","Vật phẩm định vị khoảng cách"),
    s(58,"Săn Boss Khổng Lồ Cake Prince",20000,"raid","normal","Tiền thân Dough King"),
    s(59,"Tìm Kiếm Trái Ác Quỷ Ngẫu Nhiên (1 Trái)",10000,"sea","normal","Nhặt trái rải rác trên bản đồ"),
    s(60,"Săn Trùm Thần Thoại Rip Indra",30000,"raid","normal","Đánh bại ảo ảnh Indra lấy cổng dịch chuyển"),
    s(61,"Mở Khóa Cổng Dịch Chuyển Portal Sea 3",25000,"sea","normal","Kích hoạt toàn bộ điểm dịch chuyển"),
    s(62,"Cày Đầy Thanh Nộ Tộc V4 (Mastery V4)",20000,"raid","normal","Tập luyện tăng thời gian hóa thần tộc"),
    s(63,"Học Võ Cyborg Trấn Phái",30000,"melee","normal","Mở khóa phong cách chiến đấu cơ khí"),
    s(64,"Đảo Núi Lửa Thử Thách",45000,"sea","normal","Farm sự kiện đảo nham thạch"),
    s(65,"Tìm Kiếm Rương Ma Thuật (Mirage Chest)",35000,"sea","normal","Săn lùng rương thần thoại đảo Mirage"),
    s(66,"Đảo Núi Lửa Gear 1 (mở khóa)",22900,"draco","normal","Thiếu fragment"),
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
    s(77,"Rumble",12000,"fruit","normal","Trái Rumble"),
    s(78,"Portal",15000,"fruit","normal","Trái Portal"),
    s(79,"Blizzard",12000,"fruit","normal","Trái Blizzard"),
    s(80,"Buddha",12000,"fruit","normal","Trái Buddha"),
    s(81,"Magma",8000,"fruit","normal","Trái Magma"),
    s(82,"Light",5000,"fruit","normal","Trái Light"),
    s(83,"Ice",5000,"fruit","normal","Trái Ice"),
    s(84,"Dark",5000,"fruit","normal","Trái Dark")
];

// ============================================================
// ===== KHỞI CHẠY HỆ THỐNG & ĐĂNG NHẬP ========================
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

function initApp() {
  setupTabs();
  renderServices();
  renderTitles();
  setupAuthModals();

  // Lắng nghe trạng thái đăng nhập từ Firebase Auth
  onAuthStateChanged(auth, async (user) => {
    const accountBtn = document.getElementById("accountBtn");
    const loginModal = document.getElementById("loginModal");
    
    if (user) {
      currentUser = user;
      if (loginModal) loginModal.style.display = "none";

      // KIỂM TRA XEM CÓ PHẢI CHỦ SHOP ĐĂNG NHẬP KHÔNG
      if (user.uid === ADMIN_UID) {
        showNotif("👑 Chào mừng Chủ Shop trở lại!", "success");
        
        if (accountBtn) {
          accountBtn.innerHTML = `⚙️ Quản Trị (${user.email.split('@')[0]})`;
          accountBtn.onclick = () => {
            // Click vào sẽ nhảy thẳng sang trang quản lý đơn admin.html
            window.location.href = "admin.html"; 
          };
        }
        document.querySelectorAll(".admin-only").forEach(el => el.style.display = "block");

      } else {
        // Tài khoản khách hàng thông thường
        if (accountBtn) {
          accountBtn.innerHTML = `👤 ${user.displayName || user.email.split('@')[0]}`;
          accountBtn.onclick = () => showUserDashboard();
        }
      }

      await loadUserBalance(user.uid);
      setupOrdersListener(user.uid);

    } else {
      // Khi đăng xuất hoặc chưa đăng nhập
      currentUser = null;
      if (accountBtn) {
        accountBtn.innerHTML = "👤 Tài Khoản";
        accountBtn.onclick = () => {
          const modal = document.getElementById("loginModal");
          if (modal) modal.style.display = "flex";
        };
      }
      document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
    }
  });

  // Tải danh sách đua top nạp thẻ ngầm công khai
  loadTopDeposits();
}

// ============================================================
// ===== LOGIC VÍ / TIỀN TỆ / ĐƠN HÀNG CỦA KHÁCH ================
// ============================================================

async function loadUserBalance(uid) {
  try {
    const userDocRef = doc(db, "users", uid);
    const snap = await getDoc(userDocRef);
    let balance = 0;
    if (snap.exists()) {
      balance = snap.data().balance || 0;
    } else {
      await setDoc(userDocRef, { balance: 0, totalDeposit: 0, email: currentUser.email });
    }
    const balEl = document.getElementById("userBalanceAmount");
    if (balEl) balEl.innerText = balance.toLocaleString() + "đ";
  } catch (e) {
    console.error("Lỗi ví:", e);
  }
}

function setupOrdersListener(uid) {
  const q = query(collection(db, "orders"), where("uid", "==", uid), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    const listEl = document.getElementById("userOrderList");
    if (!listEl) return;
    if (snapshot.empty) {
      listEl.innerHTML = `<div class="empty-state">Bạn chưa đặt đơn cày thuê nào cả. Hoạt động ngay!</div>`;
      return;
    }
    let html = "";
    snapshot.forEach(docSnap => {
      const o = docSnap.data();
      let statusCls = "st-pending";
      let statusText = "Đang xử lý";
      if (o.status === "completed") { statusCls = "st-completed"; statusText = "Hoàn thành"; }
      if (o.status === "cancelled") { statusCls = "st-cancelled"; statusText = "Đã hủy/Sai TK"; }

      const t = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000).toLocaleString("vi-VN") : "Đang đồng bộ...";
      
      html += `
        <div class="order-item-card">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <strong style="color:var(--accent);">${o.serviceName}</strong>
            <span class="status-badge ${statusCls}">${statusText}</span>
          </div>
          <div style="font-size:0.8rem; opacity:0.7; line-height:1.4;">
            <div>Giá: <span style="color:var(--gold); font-weight:bold;">${o.price.toLocaleString()}đ</span></div>
            <div>Tài khoản: ${o.ingameUser} | Mật khẩu: ******</div>
            <div>Ghi chú đơn: ${o.note || "Không có"}</div>
            <div style="margin-top:4px; font-size:0.72rem; opacity:0.5;">Thời gian đặt: ${t}</div>
          </div>
        </div>
      `;
    });
    listEl.innerHTML = html;
  });
}

// ============================================================
// ===== ĐỒ HỌA GIAO DIỆN & RENDER SERVICES ====================
// ============================================================

function setupTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeCategory = tab.getAttribute("data-cat");
      renderServices();
    });
  });
}

function renderServices() {
  const grid = document.getElementById("servicesGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const filtered = SERVICES.filter(s => activeCategory === "all" || s.cat === activeCategory);

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:4px; opacity:0.4;">Sắp ra mắt các gói cày mới...</div>`;
    return;
  }

  filtered.forEach(s => {
    const card = document.createElement("div");
    card.className = `service-card ${s.type === 'vip' ? 'featured' : ''} ${s.type === 'svip' ? 'svip-card' : ''}`;
    
    card.innerHTML = `
      ${s.type === 'vip' ? '<div class="badge-hot">CHOÁM</div>' : ''}
      ${s.type === 'svip' ? '<div class="badge-hot" style="background:linear-gradient(45deg, #ff0055, #9900ff)">TỐI THƯỢNG</div>' : ''}
      <div class="service-title">${s.name}</div>
      <div class="service-desc">${s.desc}</div>
      <div class="service-footer">
        <div class="price">${s.price.toLocaleString()}đ</div>
        <button class="btn btn-buy" data-id="${s.id}">Mua Ngay</button>
      </div>
    `;
    grid.appendChild(card);
  });

  // Gắn sự kiện nút mua
  grid.querySelectorAll(".btn-buy").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const sid = parseInt(e.target.getAttribute("data-id"));
      openOrderModal(sid);
    });
  });
}

// ============================================================
// ===== QUẢN LÝ MODAL (ĐẶT ĐƠN, ĐĂNG NHẬP, VÍ) =================
// ============================================================

function openOrderModal(sid) {
  if (!currentUser) {
    showNotif("⚠️ Vui lòng đăng nhập tài khoản trước khi mua gói cày!", "error");
    document.getElementById("loginModal").style.display = "flex";
    return;
  }
  const sObj = SERVICES.find(x => x.id === sid);
  if (!sObj) return;

  const modal = document.getElementById("orderModal");
  document.getElementById("orderServiceTitle").innerText = sObj.name;
  document.getElementById("orderServicePrice").innerText = sObj.price.toLocaleString() + "đ";

  const form = document.getElementById("orderForm");
  form.onsubmit = async (e) => {
    e.preventDefault();
    const userIn = document.getElementById("orderUser").value.trim();
    const passIn = document.getElementById("orderPass").value.trim();
    const noteIn = document.getElementById("orderNote").value.trim();

    if (!userIn || !passIn) {
      showNotif("⚠️ Bạn phải điền đầy đủ thông tin tài khoản và mật khẩu game!", "error");
      return;
    }

    try {
      // Kiểm tra ví khách xem đủ tiền không
      const userRef = doc(db, "users", currentUser.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists() || (snap.data().balance || 0) < sObj.price) {
        showNotif("❌ Số dư ví không đủ! Vui lòng nạp thêm thẻ cào.", "error");
        return;
      }

      // Trừ tiền tài khoản
      const currentBal = snap.data().balance || 0;
      await updateDoc(userRef, { balance: currentBal - sObj.price });

      // Ghi đơn cày thuê lên Cloud Firestore
      await addDoc(collection(db, "orders"), {
        uid: currentUser.uid,
        email: currentUser.email,
        serviceId: sObj.id,
        serviceName: sObj.name,
        price: sObj.price,
        ingameUser: userIn,
        ingamePass: passIn,
        note: noteIn,
        status: "pending",
        createdAt: serverTimestamp()
      });

      showNotif("🎉 Đặt đơn cày thuê thành công! Chủ shop đang tiến hành duyệt.", "success");
      modal.style.display = "none";
      form.reset();
      await loadUserBalance(currentUser.uid);

    } catch (err) {
      console.error(err);
      showNotif("❌ Lỗi hệ thống khi xử lý đơn!", "error");
    }
  };

  modal.style.display = "flex";
}

// Giao diện cá nhân Dashboard của Khách
function showUserDashboard() {
  showPanelSection("dashboardPanel");
}
function showHome() {
  showPanelSection("mainFrontstore");
}
function showPanelSection(id) {
  const sections = ["mainFrontstore", "dashboardPanel"];
  sections.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.style.display = (s === id) ? "block" : "none";
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============================================================
// ===== HỆ THỐNG DANH HIỆU TU LUYỆN ==========================
// ============================================================

function renderTitles() {
  const row1 = document.getElementById("titleRow1");
  const row2 = document.getElementById("titleRow2");
  if (!row1 || !row2) return;

  row1.innerHTML = "";
  row2.innerHTML = "";

  TITLES.forEach(t => {
    const logoSvg = DH_LOGOS[t.id] || `<div class="dh-card-icon">${t.icon}</div>`;
    const card = document.createElement("div");
    card.className = `dh-card ${t.id === 'luyen-khi' ? 'banner-card' : ''} ${t.featured ? 'title-featured' : ''}`;

    let btnHtml = "";
    if (t.free) {
      btnHtml = `<button class="btn-dh btn-dh-free" onclick="activateFreeTitle('${t.id}')">Đột Phá Miễn Phí</button>`;
    } else if (t.adminOnly) {
      btnHtml = `<button class="btn-dh btn-dh-lock" disabled>Danh hiệu Trấn Phái (Admin)</button>`;
    } else {
      btnHtml = `<button class="btn-dh btn-dh-buy" onclick="buyTitle('${t.id}')">Đổi Vị Trí (${t.price.toLocaleString()}đ)</button>`;
    }

    card.innerHTML = `
      ${logoSvg}
      <div class="dh-card-body">
        <div class="dh-card-title">${t.name} ${t.adminOnly ? '<span style="color:var(--red);font-size:0.75rem;">[Chủ Môn]</span>' : ''}</div>
        <div class="dh-card-desc">Tăng hào quang tu luyện và uy tín trang cá nhân.</div>
        ${btnHtml}
      </div>
    `;

    if (t.id === "luyen-khi") {
      row1.appendChild(card);
    } else {
      row2.appendChild(card);
    }
  });
}

window.activateFreeTitle = async function(id) {
  if (!currentUser) { showNotif("⚠️ Hãy đăng nhập để kích hoạt danh hiệu!", "error"); return; }
  try {
    await setDoc(doc(db, "titlepurchases", currentUser.uid + "_" + id), {
      uid: currentUser.uid,
      titleId: id,
      expiresAt: Date.now() + TITLE_DURATION_MS,
      activatedAt: serverTimestamp()
    });
    showNotif("✨ Chúc mừng bạn đã đột phá cảnh giới Luyện Khí thành công!", "success");
  } catch (e) { showNotif("❌ Đột phá thất bại!", "error"); }
};

window.buyTitle = async function(id) {
  if (!currentUser) { showNotif("⚠️ Hãy đăng nhập để mua danh hiệu tu luyện!", "error"); return; }
  const tObj = TITLES.find(x => x.id === id);
  if (!tObj) return;

  try {
    const userRef = doc(db, "users", currentUser.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists() || (snap.data().balance || 0) < tObj.price) {
      showNotif("❌ Tài khoản thiếu linh thạch (tiền ví)! Hãy nạp thẻ cào.", "error");
      return;
    }
    const currentBal = snap.data().balance || 0;
    await updateDoc(userRef, { balance: currentBal - tObj.price });

    await setDoc(doc(db, "titlepurchases", currentUser.uid + "_" + id), {
      uid: currentUser.uid,
      titleId: id,
      expiresAt: Date.now() + TITLE_DURATION_MS,
      activatedAt: serverTimestamp()
    });

    showNotif(`🔥 Cảnh giới Đột phá thành công: Bạn đã đạt danh hiệu ${tObj.name}!`, "success");
    await loadUserBalance(currentUser.uid);
  } catch (e) { showNotif("❌ Giao dịch cảnh giới thất bại!", "error"); }
};

// ============================================================
// ===== HỆ THỐNG ĐĂNG KÝ / ĐĂNG NHẬP / THẺ CÀO ================
// ============================================================

function setupAuthModals() {
  const loginModal = document.getElementById("loginModal");
  const regModal = document.getElementById("registerModal");

  window.openRegister = () => { loginModal.style.display = "none"; regModal.style.display = "flex"; };
  window.openLogin = () => { regModal.style.display = "none"; loginModal.style.display = "flex"; };
  window.closeAuthModal = () => { loginModal.style.display = "none"; regModal.style.display = "none"; };

  // Xử lý nộp form đăng nhập
  document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const em = document.getElementById("loginEmail").value.trim();
    const pa = document.getElementById("loginPass").value.trim();
    try {
      await signInWithEmailAndPassword(auth, em, pa);
      showNotif("🚀 Đăng nhập tài khoản thành công!", "success");
    } catch (err) {
      showNotif("❌ Sai tài khoản hoặc mật khẩu rồi đạo hữu ơi!", "error");
    }
  });

  // Xử lý nộp form đăng ký
  document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const em = document.getElementById("regEmail").value.trim();
    const pa = document.getElementById("regPass").value.trim();
    const rePa = document.getElementById("regPassConfirm").value.trim();

    if (pa !== rePa) { showNotif("⚠️ Hai mật khẩu không trùng khớp!", "error"); return; }
    try {
      const cred = await createUserWithEmailAndPassword(auth, em, pa);
      await setDoc(doc(db, "users", cred.user.uid), { balance: 0, totalDeposit: 0, email: em });
      showNotif("🎉 Tạo tài khoản thành công!Chào mừng bạn gia nhập môn phái.", "success");
    } catch (err) {
      showNotif("❌ Email đã tồn tại hoặc mật khẩu quá yếu (Yêu cầu > 6 ký tự)!", "error");
    }
  });

  // Nút đăng xuất
  window.logoutUser = async () => {
    await signOut(auth);
    showNotif("👋 Đã đăng xuất tài khoản an toàn.", "info");
    showHome();
  };

  // Nạp thẻ cào giả lập (Đẩy lệnh duyệt lên Firebase tích điểm)
  document.getElementById("cardForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) { showNotif("⚠️ Vui lòng đăng nhập trước khi nạp tiền!", "error"); return; }
    
    const telco = document.getElementById("cardTelco").value;
    const amount = parseInt(document.getElementById("cardAmount").value);
    const pin = document.getElementById("cardPin").value.trim();
    const ser = document.getElementById("cardSerial").value.trim();

    if (!pin || !ser) { showNotif("⚠️ Bạn phải nhập đầy đủ mã thẻ và số Seri!", "error"); return; }

    try {
      await addDoc(collection(db, "cards"), {
        uid: currentUser.uid,
        email: currentUser.email,
        telco, amount, pin, serial: ser,
        status: "pending",
        createdAt: serverTimestamp()
      });
      showNotif("📥 Thẻ cào đã được gửi lên hệ thống! Vui lòng đợi chủ shop kiểm tra seri trong vài phút.", "info");
      document.getElementById("cardForm").reset();
    } catch (err) {
      showNotif("❌ Lỗi gửi thẻ cào!", "error");
    }
  });
}

// Lấy danh sách đua top nạp tiền đổ ra trang chủ công khai
async function loadTopDeposits() {
  const topListEl = document.getElementById("topDepositList");
  if (!topListEl) return;
  try {
    const q = query(collection(db, "users"), orderBy("totalDeposit", "desc"));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      topListEl.innerHTML = `<div class="top-loading">Chưa có bảng xếp hạng cao thủ đại gia.</div>`;
      return;
    }
    let html = "";
    let rank = 1;
    snapshot.forEach(docSnap => {
      const u = docSnap.data();
      if (!u.totalDeposit || u.totalDeposit <= 0 || rank > 3) return;
      const maskEmail = u.email ? u.email.split('@')[0] : "Ẩn Danh";
      html += `
        <div class="top-card">
          <div class="top-rank">#${rank}</div>
          <div class="top-name">${maskEmail}</div>
          <div class="top-count">${u.totalDeposit.toLocaleString()}đ</div>
        </div>
      `;
      rank++;
    });
    topListEl.innerHTML = html || `<div class="top-loading">Chưa có dữ liệu nạp thẻ.</div>`;
  } catch (e) {
    topListEl.innerHTML = `<div class="top-loading">Không thể tải bảng xếp hạng tài phú.</div>`;
  }
}

// Hàm thông báo Toast nổi nhanh
window.showNotif = function(msg, type = "info") {
  const notif = document.getElementById("notification");
  if (!notif) return;
  notif.innerText = msg;
  notif.className = `notification show ${type}`;
  setTimeout(() => { notif.classList.remove("show"); }, 4000);
};

window.closeOrderModal = () => { document.getElementById("orderModal").style.display = "none"; };
