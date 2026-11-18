// Cards: customer queries own UID only; admin can query all for review.
async function getCardsFromDB() {
    if (!auth || !auth.currentUser) throw new Error('Bạn cần đăng nhập.');
    let query = db.collection('cards');
    if (auth.currentUser.uid !== ADMIN_UID) query = query.where('uid', '==', auth.currentUser.uid);
    const snap = await query.get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
}

async function saveCardToDB(card) {
    if (!auth || !auth.currentUser || auth.currentUser.uid === ADMIN_UID) throw new Error('Bạn cần đăng nhập bằng tài khoản khách.');
    const profile = await getUserProfileByUid(auth.currentUser.uid);
    if (!profile || profile.disabled) throw new Error('Không tìm thấy hồ sơ khách hàng.');
    const payload = { ...card, uid: auth.currentUser.uid, username: profile.username, usernameLower: normalizeUsername(profile.username) };
    await db.collection('cards').doc(payload.id).set(payload);
}

async function updateCardInDB(id, data) {
    requireAdmin();
    await db.collection('cards').doc(id).update(data);
}

async function approveCardAndCreditAdmin(cardId) {
    requireAdmin();
    const cardRef = db.collection('cards').doc(cardId);
    const logRef = db.collection('coinlogs').doc();
    return db.runTransaction(async tx => {
        const cardSnap = await tx.get(cardRef);
        if (!cardSnap.exists) throw new Error('Không tìm thấy thẻ.');
        const card = cardSnap.data();
        if (card.status !== 'pending') throw new Error('Thẻ này không còn ở trạng thái chờ duyệt.');
        const userRef = userDocRef(card.username);
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists) throw new Error('Không tìm thấy khách hàng.');
        const user = userSnap.data();
        if (user.uid !== card.uid || normalizeUsername(user.username) !== card.usernameLower || user.disabled === true) {
            throw new Error('UID yêu cầu nạp thẻ không khớp hồ sơ khách hàng.');
        }
        const amount = Number(card.denom);
        if (!Number.isFinite(amount) || amount <= 0 || amount > 500000) throw new Error('Mệnh giá thẻ không hợp lệ.');
        const newBalance = (Number(user.balance) || 0) + amount;
        const now = new Date().toLocaleString('vi-VN');
        tx.update(userRef, { balance: newBalance });
        tx.update(cardRef, { status: 'done', note: `Đã duyệt, cộng ${formatPrice(amount)} vào ví.`, serial: null, code: null, reviewedAt: Date.now() });
        tx.set(logRef, { username: user.username, amount, note: `Nạp thẻ ${card.type}`, newBalance, time: now, timestamp: Date.now() });
        return newBalance;
    });
}
