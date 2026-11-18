// (Đã xoá: lưu tài khoản/phiên đăng nhập trong localStorage — dùng Firebase Authentication)
// Xoá dữ liệu tài khoản cũ còn sót trong trình duyệt của khách:
try{localStorage.removeItem('tmc_users_local');localStorage.removeItem('tmc_session');}catch(e){}

// ============================================================
// ===== SERVICES =====
// ============================================================
const SERVICES_VERSION = '6.0';
function getServices() {
    const ver=localStorage.getItem('tmc_services_ver');
    if(ver!==SERVICES_VERSION){localStorage.removeItem('tmc_services');localStorage.removeItem('tmc_categories');localStorage.setItem('tmc_services_ver',SERVICES_VERSION);}
    const s=localStorage.getItem('tmc_services');
    if(s) return JSON.parse(s);
    const d=getDefaultServices();
    localStorage.setItem('tmc_services',JSON.stringify(d));
    return d;
}
function saveServices(s){localStorage.setItem('tmc_services',JSON.stringify(s));}

function getCustomCategories() {
    const s=localStorage.getItem('tmc_categories');
    if(s) return JSON.parse(s);
    const cats=Object.entries(CATEGORIES).map(([key,name])=>({key,name,icon:name.match(/^\S+/)?.[0]||'📦',image:DEFAULT_IMAGES[key]||''}));
    localStorage.setItem('tmc_categories',JSON.stringify(cats));
    return cats;
}
function saveCustomCategories(cats){localStorage.setItem('tmc_categories',JSON.stringify(cats));}

function getShopSettings(){return JSON.parse(localStorage.getItem('tmc_settings')||'{}');}
function saveShopSettings(s){localStorage.setItem('tmc_settings',JSON.stringify(s));}


function getDiscountCodes(){return JSON.parse(localStorage.getItem('tmc_codes')||'[]');}
function saveDiscountCodes(codes){localStorage.setItem('tmc_codes',JSON.stringify(codes));}
