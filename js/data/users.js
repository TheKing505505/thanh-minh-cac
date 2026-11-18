// Firestore user profiles. Document ID is username.toLowerCase(); Auth UID is identity.
function normalizeUsername(value) {
    return String(value || '').trim().toLowerCase();
}

function requireSignedIn() {
    if (!auth || !auth.currentUser) throw new Error('Bạn cần đăng nhập lại.');
    return auth.currentUser;
}

function requireAdmin() {
    const fbUser = requireSignedIn();
    if (fbUser.uid !== ADMIN_UID) throw new Error('Bạn không có quyền quản trị.');
    return fbUser;
}

function userDocRef(username) {
    if (!db) throw new Error('Firestore chưa khởi tạo.');
    const key = normalizeUsername(username);
    if (!key || key.includes('/')) throw new Error('Tên đăng nhập không hợp lệ.');
    return db.collection('users').doc(key);
}

async function getUserProfileByUid(uid) {
    requireSignedIn();
    if (!uid || uid !== auth.currentUser.uid) throw new Error('UID không khớp phiên đăng nhập.');
    const snap = await db.collection('users').where('uid', '==', uid).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
}

async function getUsersFromDB() {
    requireAdmin();
    const snap = await db.collection('users').get();
    _usersCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return _usersCache;
}

async function saveUserToDB(user) {
    const fbUser = requireSignedIn();
    if (!user || user.uid !== fbUser.uid || user.role !== 'user') {
        throw new Error('Hồ sơ không khớp tài khoản Firebase đang đăng nhập.');
    }
    const ref = userDocRef(user.username);
    await ref.set(user); // Nếu document đã tồn tại, Rules chỉ cho chủ sở hữu/admin update các trường hợp lệ; UID khác bị từ chối.
    _usersCache = null;
    return { id: ref.id, ...user };
}

async function findUserInDB(username) {
    const fbUser = requireSignedIn();
    if (fbUser.uid === ADMIN_UID) {
        const snap = await userDocRef(username).get();
        return snap.exists ? { id: snap.id, ...snap.data() } : null;
    }

    const own = await getUserProfileByUid(fbUser.uid);
    if (!own || normalizeUsername(own.username) !== normalizeUsername(username)) return null;
    return own;
}

async function updateUserInDB(username, data) {
    const fbUser = requireSignedIn();
    const ref = userDocRef(username);
    const safeData = { ...data };
    delete safeData.uid;
    delete safeData.username;
    delete safeData.usernameLower;
    delete safeData.role;
    delete safeData.disabled;
    if (fbUser.uid !== ADMIN_UID) {
        const allowed = Object.keys(safeData).every(key => ['email', 'facebook'].includes(key));
        if (!allowed) throw new Error('Khách chỉ được cập nhật email và Facebook.');
        const profile = await getUserProfileByUid(fbUser.uid);
        if (!profile || normalizeUsername(profile.username) !== normalizeUsername(username)) {
            throw new Error('Bạn không có quyền sửa hồ sơ này.');
        }
    }
    await ref.update(safeData);
    _usersCache = null;
}

async function deleteUserFromDB(username) {
    requireAdmin();
    // Soft-disable: không xóa Auth account hoặc lịch sử đơn hàng khỏi Firestore.
    await userDocRef(username).update({ disabled: true, disabledAt: Date.now() });
    _usersCache = null;
}

async function changeUserBalanceAdmin(username, delta, reason) {
    requireAdmin();
    const ref = userDocRef(username);
    const logRef = db.collection('coinlogs').doc();
    return db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new Error('Không tìm thấy khách hàng.');
        const user = snap.data();
        const oldBalance = Number(user.balance) || 0;
        const nextBalance = oldBalance + Number(delta);
        if (!Number.isFinite(nextBalance) || nextBalance < 0) throw new Error('Số dư không hợp lệ.');
        tx.update(ref, { balance: nextBalance });
        tx.set(logRef, {
            username: user.username,
            amount: Number(delta),
            note: String(reason || 'Điều chỉnh số dư bởi chủ shop').slice(0, 300),
            newBalance: nextBalance,
            time: new Date().toLocaleString('vi-VN'),
            timestamp: Date.now()
        });
        return nextBalance;
    });
}
