// ============================================================
// ===== WALLET (CHỈ ADMIN) =====
// Khách KHÔNG bao giờ được ghi số dư (firestore.rules chặn). Mọi thay đổi tiền
// đều do admin thực hiện bằng transaction: đọc → kiểm tra → ghi nguyên tử.
// Giá luôn được TÍNH LẠI ở phía admin, không tin con số khách gửi lên.
// ============================================================
function _fv(){ return firebase.firestore.FieldValue; }
function _coinLogRef(){ return db.collection('coinlogs').doc(); }
function _nowStr(){ return new Date().toLocaleString('vi-VN'); }

// Bơm/trừ tiền thủ công (delta có thể âm)
async function adminAdjustBalance(uid, delta, note){
    if(!isAdminSession()) throw new Error('Chỉ admin');
    if(!Number.isFinite(delta) || delta===0) throw new Error('Số tiền không hợp lệ');
    await db.runTransaction(async tx=>{
        const uref = db.collection('users').doc(uid);
        const us = await tx.get(uref);
        if(!us.exists) throw new Error('Không tìm thấy khách');
        const u = us.data();
        const nb = (u.balance||0) + delta;
        if(nb < 0) throw new Error('Số dư không thể âm');
        tx.update(uref,{ balance: nb });
        tx.set(_coinLogRef(),{ uid, username:u.username||'', amount:delta, note:note||'Admin chỉnh số dư', newBalance:nb, time:_nowStr(), timestamp:Date.now() });
    });
}

// Duyệt thẻ nạp: cộng tiền + đổi trạng thái thẻ + ghi log — một transaction, không thể duyệt 2 lần
async function adminApproveCard(cardId){
    if(!isAdminSession()) throw new Error('Chỉ admin');
    let result;
    await db.runTransaction(async tx=>{
        const cref = db.collection('cards').doc(cardId);
        const cs = await tx.get(cref);
        if(!cs.exists) throw new Error('Không tìm thấy thẻ');
        const c = cs.data();
        if(c.status!=='pending') throw new Error('Thẻ này đã được xử lý rồi');
        if(!Number.isFinite(c.denom) || c.denom<=0) throw new Error('Mệnh giá không hợp lệ');
        const uref = db.collection('users').doc(c.uid);
        const us = await tx.get(uref);
        if(!us.exists) throw new Error('Không tìm thấy khách của thẻ này');
        const nb = (us.data().balance||0) + c.denom;
        tx.update(uref,{ balance: nb });
        tx.update(cref,{ status:'done', note:`✅ Đã duyệt! +${new Intl.NumberFormat('vi-VN').format(c.denom)}đ vào ví`, doneAt:Date.now() });
        tx.set(_coinLogRef(),{ uid:c.uid, username:c.username||'', amount:c.denom, note:`Nạp thẻ ${c.type} ${new Intl.NumberFormat('vi-VN').format(c.denom)}đ`, newBalance:nb, time:_nowStr(), timestamp:Date.now() });
        result = { username:c.username, denom:c.denom };
    });
    return result;
}

// Tính giá chuẩn của 1 đơn ở phía admin
function quoteOrder(order, allOrders, usersById){
    const svc = getServices().find(s=>s.id===order.serviceId);
    const user = usersById ? usersById[order.uid] : null;
    if(!svc) return { ok:false, reason:'Dịch vụ không còn trong danh mục' };
    if(!user) return { ok:false, reason:'Không có dữ liệu khách' };
    const prior = (allOrders||[]).filter(o=>o.uid===order.uid && (o.timestamp||0) < (order.timestamp||0)).length;
    const q = computeServicePrice(svc, user, prior, order.timestamp);
    return { ok:true, price:q.price, discountInfo:q.discountInfo, balance:user.balance||0, enough:(user.balance||0)>=q.price, mismatch:q.price!==order.price };
}

// Hoàn thành đơn: kiểm tra số dư + trừ tiền + đổi trạng thái + ghi log (nguyên tử)
async function adminFinalizeOrder(orderId, allOrders){
    if(!isAdminSession()) throw new Error('Chỉ admin');
    let info;
    await db.runTransaction(async tx=>{
        const oref = db.collection('orders').doc(orderId);
        const os = await tx.get(oref);
        if(!os.exists) throw new Error('Đơn không tồn tại');
        const o = os.data();
        if(o.status==='done') throw new Error('Đơn đã hoàn thành rồi');
        const uref = db.collection('users').doc(o.uid);
        const us = await tx.get(uref);
        if(!us.exists) throw new Error('Không tìm thấy khách');
        const u = us.data();
        const svc = getServices().find(s=>s.id===o.serviceId);
        if(!svc) throw new Error('Dịch vụ không còn trong danh mục');
        const prior = (allOrders||[]).filter(x=>x.uid===o.uid && (x.timestamp||0)<(o.timestamp||0)).length;
        const q = computeServicePrice(svc, u, prior, o.timestamp);
        const bal = u.balance||0;
        if(bal < q.price) throw new Error(`Khách không đủ số dư (cần ${formatPrice(q.price)}, có ${formatPrice(bal)})`);
        const doneTime = _nowStr();
        const doneMessage = `🎉 Đơn hàng ${orderId} của bạn đã hoàn thành!\n✅ Dịch vụ: ${o.serviceName}\n⏰ Xong lúc: ${doneTime}\nCảm ơn đã tin tưởng Thanh Minh Các! 🐉`;
        tx.update(uref,{ balance: bal - q.price });
        tx.update(oref,{ status:'done', doneTime, doneMessage, price:q.price, discountInfo:q.discountInfo||null });
        tx.set(_coinLogRef(),{ uid:o.uid, username:u.username||'', amount:-q.price, note:`Thanh toán đơn ${orderId}`, newBalance:bal-q.price, time:doneTime, timestamp:Date.now() });
        info = { price:q.price, claimed:o.price };
    });
    return info;
}

// Cấp danh hiệu từ yêu cầu mua: kiểm tra số dư + trừ tiền + cấp danh hiệu + đóng yêu cầu (nguyên tử)
async function adminGrantTitleFromPurchase(purchaseId){
    if(!isAdminSession()) throw new Error('Chỉ admin');
    let info;
    await db.runTransaction(async tx=>{
        const pref = db.collection('titlepurchases').doc(purchaseId);
        const ps = await tx.get(pref);
        if(!ps.exists) throw new Error('Không tìm thấy yêu cầu');
        const p = ps.data();
        if(p.status!=='pending') throw new Error('Yêu cầu đã được xử lý');
        const t = TITLES.find(x=>x.id===p.titleId);
        if(!t || t.adminOnly || t.free) throw new Error('Danh hiệu không hợp lệ');
        const uref = db.collection('users').doc(p.uid);
        const us = await tx.get(uref);
        if(!us.exists) throw new Error('Không tìm thấy khách');
        const u = us.data();
        const ri = getRenewalInfo(u, t.id);
        const price = Math.round(t.price * ri.pct / 100);
        const bal = u.balance||0;
        if(bal < price) throw new Error(`Khách không đủ số dư (cần ${formatPrice(price)}, có ${formatPrice(bal)})`);
        const now = Date.now();
        tx.update(uref,{ balance: bal-price, titleOverride:t.id, titleGrantedAt:now, titleExpiry:now+TITLE_DURATION_MS });
        tx.update(pref,{ status:'done', doneAt:now, price });
        tx.set(_coinLogRef(),{ uid:p.uid, username:u.username||'', amount:-price, note:`Mua danh hiệu ${t.name}`, newBalance:bal-price, time:_nowStr(), timestamp:now });
        info = { name:t.name, price, username:u.username };
    });
    return info;
}
