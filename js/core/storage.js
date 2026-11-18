// Firebase Authentication is the only source of identity/session truth.
function clearSession() { localStorage.removeItem('tmc_session'); }

const SERVICES_VERSION = '6.0';
const SHOP_CONFIG_DOCS = {
    services: 'storefront_services',
    categories: 'storefront_categories',
    settings: 'storefront_settings',
    codes: 'storefront_discount_codes'
};
let _remoteShopConfig = {};

function _localJson(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { return fallback; }
}
function _writeLocalJson(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn(e); } }
function _cloneConfig(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
}

function _showConfigSaveError(error) {
    console.error('Shared shop configuration error:', error);
    if (typeof showNotif === 'function') showNotif('Không đồng bộ được cấu hình shop: ' + (error.message || error), 'error');
}

async function _saveSharedConfig(name, value) {
    if (!db || !auth || !auth.currentUser || auth.currentUser.uid !== ADMIN_UID) {
        throw new Error('Chỉ chủ shop đã đăng nhập mới được đồng bộ cấu hình.');
    }
    // Chỉ cập nhật cache sau khi Firestore xác nhận ghi thành công.
    await db.collection('system_configs').doc(SHOP_CONFIG_DOCS[name]).set({ value, updatedAt: Date.now() }, { merge: true });
    _remoteShopConfig[name] = _cloneConfig(value);
    _writeLocalJson('tmc_' + (name === 'codes' ? 'codes' : name), value);
    return value;
}
function getServices() {
    const ver = localStorage.getItem('tmc_services_ver');
    if (ver !== SERVICES_VERSION) {
        // Do not delete locally saved service data during a version bump.
        localStorage.setItem('tmc_services_ver', SERVICES_VERSION);
    }
    if (_remoteShopConfig.services) return _cloneConfig(_remoteShopConfig.services);
    const cached = _localJson('tmc_services', null);
    if (cached) return _cloneConfig(cached);
    const defaults = getDefaultServices();
    _writeLocalJson('tmc_services', defaults);
    return _cloneConfig(defaults);
}
async function saveServices(services) { return _saveSharedConfig('services', _cloneConfig(services)); }

function getCustomCategories() {
    if (_remoteShopConfig.categories) return _cloneConfig(_remoteShopConfig.categories);
    const cached = _localJson('tmc_categories', null);
    if (cached) return _cloneConfig(cached);
    const categories = Object.entries(CATEGORIES).map(([key, name]) => ({ key, name, icon: name.match(/^\S+/)?.[0] || '📦', image: DEFAULT_IMAGES[key] || '' }));
    _writeLocalJson('tmc_categories', categories);
    return categories;
}
async function saveCustomCategories(categories) { return _saveSharedConfig('categories', _cloneConfig(categories)); }

function getShopSettings() { return _cloneConfig(_remoteShopConfig.settings || _localJson('tmc_settings', {})); }
async function saveShopSettings(settings) { return _saveSharedConfig('settings', _cloneConfig(settings)); }
function getDiscountCodes() { return _cloneConfig(_remoteShopConfig.codes || _localJson('tmc_codes', [])); }
async function saveDiscountCodes(codes) { return _saveSharedConfig('codes', _cloneConfig(codes)); }

function startShopConfigSync() {
    if (!db || _shopConfigUnsubs.length) return;
    Object.entries(SHOP_CONFIG_DOCS).forEach(([name, docId]) => {
        const unsubscribe = db.collection('system_configs').doc(docId).onSnapshot(snap => {
            if (!snap.exists) return;
            const value = snap.data().value;
            _remoteShopConfig[name] = value;
            _writeLocalJson('tmc_' + (name === 'codes' ? 'codes' : name), value);
            if (name === 'services' || name === 'categories') renderServices();
            if (name === 'settings') applyVideoSetting();
            if (name === 'codes' && typeof renderAdminCodes === 'function') renderAdminCodes();
        }, error => console.error('Shop config listener failed:', docId, error));
        _shopConfigUnsubs.push(unsubscribe);
    });
}


async function seedMissingShopConfigAsAdmin() {
    if (!auth || !auth.currentUser || auth.currentUser.uid !== ADMIN_UID || !db) return;
    const values = {
        services: getServices(),
        categories: getCustomCategories(),
        settings: getShopSettings(),
        codes: getDiscountCodes()
    };
    for (const [name, docId] of Object.entries(SHOP_CONFIG_DOCS)) {
        const ref = db.collection('system_configs').doc(docId);
        const snap = await ref.get();
        if (!snap.exists) {
            await ref.set({ value: values[name], updatedAt: Date.now() });
            _remoteShopConfig[name] = values[name];
        }
    }
}

function stopShopConfigSync() {
    _shopConfigUnsubs.forEach(unsubscribe => { try { unsubscribe(); } catch (e) {} });
    _shopConfigUnsubs = [];
}
