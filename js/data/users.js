// ============================================================
// ===== USERS (Firebase Auth + Firestore users/{uid}) =====
// Khách chỉ đọc/sửa được hồ sơ của chính mình. Admin đọc/sửa tất cả.
// Quyền thật sự do firestore.rules quyết định, không phải code này.
// ============================================================
function currentUid(){ return (auth && auth.currentUser) ? auth.currentUser.uid : null; }
function isAdminSession(){ return currentUid() === ADMIN_UID; }

// Hồ sơ của chính người đang đăng nhập (khách)
async function getMyUser(){
    const uid = currentUid();
    if(!db || !uid || uid === ADMIN_UID) return null;
    const d = await db.collection('users').doc(uid).get();
    return d.exists ? { id: d.id, ...d.data() } : null;
}

// ADMIN: lấy toàn bộ người dùng (rules chặn nếu không phải admin)
async function getUsersFromDB(){
    if(!db) return [];
    try{
        const snap = await db.collection('users').get();
        _usersCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return _usersCache;
    }catch(e){
        console.warn('getUsersFromDB:', e.code || e.message);
        _usersCache = [];
        return [];
    }
}

// ADMIN: sửa người dùng theo uid
async function updateUserInDB(id, data){
    if(!db) throw new Error('DB not ready');
    await db.collection('users').doc(id).update(data);
    _usersCache = null;
}

// ADMIN: xoá hồ sơ (và giải phóng tên đăng nhập). Tài khoản Auth phải xoá thêm trong Firebase Console nếu muốn chặn hẳn.
async function deleteUserFromDB(id){
    if(!db) throw new Error('DB not ready');
    const ref = db.collection('users').doc(id);
    const snap = await ref.get();
    const batch = db.batch();
    batch.delete(ref);
    if(snap.exists && snap.data().usernameLower){
        batch.delete(db.collection('usernames').doc('n_' + snap.data().usernameLower));
    }
    await batch.commit();
    _usersCache = null;
}
