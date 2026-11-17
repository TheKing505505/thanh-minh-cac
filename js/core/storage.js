/* Các hàm lưu trữ tương thích với các localStorage key hiện tại. */
const LS_USERS_KEY = 'tmc_users_local';

function _getLSUsers() {
    try { return JSON.parse(localStorage.getItem(LS_USERS_KEY)||'{}'); } catch(e){return{};}
}
function _saveLSUsers(users) {
    try { localStorage.setItem(LS_USERS_KEY, JSON.stringify(users)); } catch(e){}
}
function _getLSUser(un) {
    const users = _getLSUsers();
    // Tìm case-insensitive
    const key = Object.keys(users).find(k=>k.toLowerCase()===un.toLowerCase());
    return key ? users[key] : null;
}
function _saveLSUser(u) {
    const users = _getLSUsers();
    users[u.username] = u;
    _saveLSUsers(users);
}
function _updateLSUser(un, data) {
    const users = _getLSUsers();
    const key = Object.keys(users).find(k=>k.toLowerCase()===un.toLowerCase());
    if(key){ users[key]={...users[key],...data}; _saveLSUsers(users); }
}
function _deleteLSUser(un) {
    const users = _getLSUsers();
    const key = Object.keys(users).find(k=>k.toLowerCase()===un.toLowerCase());
    if(key){ delete users[key]; _saveLSUsers(users); }
}

function saveSession(u){localStorage.setItem('tmc_session',JSON.stringify({username:u.username,role:u.role}));}
function loadSession(){return JSON.parse(localStorage.getItem('tmc_session')||'null');}
function clearSession(){localStorage.removeItem('tmc_session');}

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
