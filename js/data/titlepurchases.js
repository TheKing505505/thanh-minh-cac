// Title purchase requests.
async function saveTitlePurchaseToDB(purchase) {
    if (!auth || !auth.currentUser || auth.currentUser.uid === ADMIN_UID) throw new Error('Bạn cần đăng nhập bằng tài khoản khách.');
    const profile = await getUserProfileByUid(auth.currentUser.uid);
    if (!profile || profile.disabled) throw new Error('Không tìm thấy hồ sơ khách hàng.');
    const payload = { ...purchase, uid: auth.currentUser.uid, username: profile.username, usernameLower: normalizeUsername(profile.username) };
    const ref = await db.collection('titlepurchases').add(payload);
    return ref.id;
}

async function getTitlePurchasesFromDB() {
    if (!auth || !auth.currentUser) throw new Error('Bạn cần đăng nhập.');
    let query = db.collection('titlepurchases');
    if (auth.currentUser.uid !== ADMIN_UID) query = query.where('uid', '==', auth.currentUser.uid);
    const snap = await query.get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
}
