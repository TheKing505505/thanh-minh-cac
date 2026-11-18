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
    if (!db || !auth || !auth.currentUser || auth.currentUser.uid === ADMIN_UID) {
        throw new Error('[AUTH] Bạn cần đăng nhập bằng tài khoản khách Firebase.');
    }

    const uid = auth.currentUser.uid;
    let profile;
    try {
        profile = await getUserProfileByUid(uid);
    } catch (error) {
        console.error('Card submit: profile lookup failed', {
            code: error.code || null,
            uid,
            projectId: firebase.app().options.projectId
        });
        throw new Error(`[PROFILE_READ:${error.code || 'unknown'}] Không đọc được hồ sơ khách từ Firestore. Kiểm tra Rules của users và UID đăng nhập.`);
    }

    if (!profile || profile.disabled) {
        throw new Error('[PROFILE_MISSING] Tài khoản Auth chưa có hồ sơ users tương ứng hoặc đã bị vô hiệu hóa.');
    }

    const usernameLower = normalizeUsername(profile.username);
    if (!usernameLower || usernameLower.includes('/') || profile.usernameLower !== usernameLower) {
        throw new Error('[PROFILE_KEY_MISMATCH] usernameLower trong hồ sơ không khớp username đã chuẩn hóa. Kiểm tra document users/{usernameLower}.');
    }

    const payload = {
        id: String(card.id),
        uid,
        username: profile.username,
        usernameLower,
        type: String(card.type || ''),
        denom: Number(card.denom),
        serial: String(card.serial || ''),
        code: String(card.code || ''),
        time: String(card.time || ''),
        timestamp: Number(card.timestamp),
        status: 'pending',
        note: String(card.note || '')
    };

    try {
        await db.collection('cards').doc(payload.id).set(payload);
    } catch (error) {
        console.error('Card submit: Firestore cards create denied', {
            code: error.code || null,
            projectId: firebase.app().options.projectId,
            uid,
            usernameLower,
            cardId: payload.id,
            payloadKeys: Object.keys(payload)
        });
        throw new Error(`[CARD_CREATE:${error.code || 'unknown'}] Firestore từ chối tạo document cards. Kiểm tra Rules đã Publish trên đúng project thanh-minh-cac-41666 và điều kiện UID/profile.`);
    }
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
