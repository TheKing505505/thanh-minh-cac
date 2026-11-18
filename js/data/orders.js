// Orders: admin đọc toàn bộ; khách chỉ truy vấn các đơn gắn với UID của mình.
function _assertOrderUser() {
    if (!auth || !auth.currentUser) throw new Error('Bạn cần đăng nhập để thao tác đơn hàng.');
    return auth.currentUser;
}

async function getOrdersFromDB() {
    const fbUser = _assertOrderUser();
    let query = db.collection('orders');
    if (fbUser.uid !== ADMIN_UID) query = query.where('uid', '==', fbUser.uid);
    const snap = await query.get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
}

async function saveOrderToDB(order) {
    const fbUser = _assertOrderUser();
    if (fbUser.uid === ADMIN_UID) throw new Error('Admin không thể đặt đơn khách.');
    const profile = await getUserProfileByUid(fbUser.uid);
    if (!profile || profile.disabled) throw new Error('Không tìm thấy hồ sơ khách hàng đang hoạt động.');
    const payload = {
        ...order,
        uid: fbUser.uid,
        username: profile.username,
        usernameLower: normalizeUsername(profile.username)
    };
    await db.collection('orders').doc(payload.id).set(payload);
    return payload;
}

async function updateOrderInDB(id, data) {
    const fbUser = _assertOrderUser();
    if (fbUser.uid !== ADMIN_UID) throw new Error('Chỉ chủ shop được cập nhật đơn hàng.');
    await db.collection('orders').doc(id).update(data);
}

async function completeOrderAndChargeAdmin(orderId) {
    const fbUser = _assertOrderUser();
    if (fbUser.uid !== ADMIN_UID) throw new Error('Chỉ chủ shop được hoàn thành đơn.');
    const orderRef = db.collection('orders').doc(orderId);
    const logRef = db.collection('coinlogs').doc();
    // Recompute price in the admin browser from the shared shop catalog and customer profile.
    // This is a guard against a modified customer-side price; it is not a substitute for a trusted server.
    const orderCheckSnap = await orderRef.get();
    if (!orderCheckSnap.exists) throw new Error('Không tìm thấy đơn hàng.');
    const orderCheck = orderCheckSnap.data();
    const service = getServices().find(item => String(item.id) === String(orderCheck.serviceId));
    if (!service) throw new Error('Không còn tìm thấy dịch vụ trong bảng giá. Hãy kiểm tra đơn trước khi xử lý.');
    if (Number(orderCheck.origPrice) !== Number(service.price)) throw new Error('Giá gốc trên đơn khác bảng giá hiện tại. Vui lòng kiểm tra thủ công trước khi hoàn thành.');
    const customer = await findUserInDB(orderCheck.username);
    if (!customer) throw new Error('Không tìm thấy hồ sơ khách để kiểm tra giá.');
    let expectedPrice = Number(service.price);
    const titleDiscount = getTitleDiscount(customer);
    let hasTitleDiscount = false;
    if (titleDiscount.title && titleDiscount.discount > 0 && expectedPrice >= titleDiscount.title.minOrder) {
        expectedPrice = titleDiscount.discount === 100 ? 0 : Math.round(expectedPrice * (1 - titleDiscount.discount / 100));
        hasTitleDiscount = true;
    }
    if (!hasTitleDiscount && expectedPrice > 80000 && service.category !== 'fruit') {
        const customerOrders = await getOrdersFromDB();
        if (customerOrders.filter(item => item.username === orderCheck.username && item.id !== orderId).length === 0) {
            expectedPrice = Math.round(expectedPrice * 0.85);
        }
    }
    if (Number(orderCheck.price) !== expectedPrice) {
        throw new Error(`Giá đơn không khớp bảng giá/ưu đãi. Giá dự kiến ${formatPrice(expectedPrice)}, đơn đang ghi ${formatPrice(Number(orderCheck.price) || 0)}. Không tự động trừ tiền.`);
    }
    return db.runTransaction(async tx => {
        const orderSnap = await tx.get(orderRef);
        if (!orderSnap.exists) throw new Error('Không tìm thấy đơn hàng.');
        const order = orderSnap.data();
        if (order.status === 'done') throw new Error('Đơn này đã hoàn thành.');
        const userRef = userDocRef(order.username);
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists) throw new Error('Không tìm thấy hồ sơ khách hàng.');
        const user = userSnap.data();
        if (user.uid !== order.uid || normalizeUsername(user.username) !== order.usernameLower || user.disabled === true) {
            throw new Error('UID đơn hàng không khớp hồ sơ khách hàng hoặc tài khoản đã bị vô hiệu hóa.');
        }
        if (order.status !== 'pending') throw new Error('Chỉ có thể hoàn thành đơn đang chờ xử lý.');
        const price = Math.max(0, Number(order.price) || 0);
        const oldBalance = Number(user.balance) || 0;
        if (oldBalance < price) throw new Error(`Khách không đủ số dư: cần ${formatPrice(price)}, hiện có ${formatPrice(oldBalance)}.`);
        const nextBalance = oldBalance - price;
        const doneTime = new Date().toLocaleString('vi-VN');
        const doneMessage = `🎉 Đơn hàng ${orderId} đã hoàn thành! Dịch vụ: ${order.serviceName}. Xong lúc: ${doneTime}`;
        tx.update(userRef, { balance: nextBalance });
        tx.update(orderRef, { status: 'done', doneTime, doneMessage, chargedAt: Date.now(), chargedAmount: price });
        tx.set(logRef, {
            username: user.username,
            amount: -price,
            note: `Thanh toán đơn ${orderId}`,
            newBalance: nextBalance,
            time: doneTime,
            timestamp: Date.now()
        });
        return { doneTime, doneMessage, nextBalance };
    });
}
