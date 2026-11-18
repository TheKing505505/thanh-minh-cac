function filterAdminOrders(filter,btn){
    adminOrderFilter=filter;
    document.querySelectorAll('#adminOrders .history-filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    getOrdersFromDB().then(orders=>renderAdminOrders(orders)).catch(e=>showNotif('Không tải được đơn hàng: '+(e.message||e),'error'));
}

function renderAdminOrders(orders){
    const c=document.getElementById('adminOrderList');
    let list=orders;
    if(adminOrderFilter!=='all') list=list.filter(o=>o.status===adminOrderFilter);
    if(!list.length){c.innerHTML='<div class="no-data"><p>Không có đơn nào</p></div>';return;}
    c.innerHTML=list.map(o=>{
        const statusClass=o.status==='done'?'done':o.status==='cancelled'?'failed':'pending';
        const idArg=safeJsArg(o.id);
        return `<div class="admin-order-card ${statusClass}">
            <span class="order-status-badge ${statusClass}">${statusClass==='done'?'✅ Xong':statusClass==='failed'?'⛔ Đã lưu trữ':'⏳ Chờ Cày'}</span>
            <div style="font-family:monospace;font-size:0.82rem;color:var(--purple);margin-bottom:6px">${escapeHTML(o.id)} · ${escapeHTML(o.time)}</div>
            <div style="font-weight:700;margin-bottom:8px">${escapeHTML(o.serviceName)}</div>
            <div class="order-fields">
                <div class="order-field"><span>Khách: </span><strong>${escapeHTML(o.username||'Ẩn danh')}</strong></div>
                <div class="order-field"><span>Giá: </span><strong style="color:var(--gold)">${formatPrice(Number(o.price)||0)}</strong></div>
                <div class="order-field"><span>TK Roblox: </span><strong>${escapeHTML(o.account)}</strong></div>
                <div class="order-field"><span>Thông tin đăng nhập: </span><strong style="color:var(--accent)">Khách trao đổi riêng với shop</strong></div>
                ${o.subOption?`<div class="order-field"><span>Lựa chọn: </span><strong style="color:var(--accent)">${escapeHTML(o.subOption)}</strong></div>`:''}
                ${o.note?`<div class="order-field" style="grid-column:1/-1"><span>Ghi chú: </span><strong>${escapeHTML(o.note)}</strong></div>`:''}
            </div>
            ${o.doneTime?`<div style="font-size:0.75rem;color:var(--green);margin-top:6px">✅ Xong lúc: ${escapeHTML(o.doneTime)}</div>`:''}
            <div class="order-actions">
                ${statusClass==='pending'?`<button class="btn-done-order" onclick="markOrderDone(${idArg})">✅ Đánh Dấu Xong</button>`:''}
                <button class="btn-notify-order" onclick="openNotifyModal(${idArg})">💬 Thông Báo Khách</button>
                ${statusClass!=='failed'?`<button class="btn-delete" onclick="deleteOrder(${idArg})">🗄️ Lưu trữ</button>`:''}
            </div>
        </div>`;
    }).join('');
}

async function markOrderDone(id){
    try{
        const orders=await getOrdersFromDB();
        const o=orders.find(x=>x.id===id);if(!o) throw new Error('Không tìm thấy đơn hàng.');
        const result = await completeOrderAndChargeAdmin(id);
        showNotif(`✅ Đơn ${id} hoàn thành. Đã trừ ${formatPrice(o.price||0)}; số dư mới ${formatPrice(result.nextBalance)}.`, 'success');
        triggerCelebration();
        loadAdminData();
    } catch(e){ console.error('complete order:', e); showNotif(e.message || 'Không thể hoàn thành đơn.', 'error'); }
}

async function deleteOrder(id){
    if(!confirm(`Lưu trữ đơn ${id}? Dữ liệu đơn vẫn được giữ lại trong Firestore.`)) return;
    try{
        await updateOrderInDB(id,{status:'cancelled',archivedAt:Date.now(),archivedBy:ADMIN_UID,doneMessage:'Đơn đã được shop lưu trữ. Nếu cần hỗ trợ, vui lòng liên hệ shop.'});
        showNotif('Đã lưu trữ đơn; dữ liệu được giữ lại.','info');
        loadAdminData();
    } catch(e){console.error(e);showNotif('Không lưu trữ được đơn: '+(e.message||e),'error');}
}

async function openNotifyModal(id){
    let o;
    try { const orders=await getOrdersFromDB(); o=orders.find(x=>x.id===id); }
    catch(e) { showNotif('Không tải được đơn: '+(e.message||e),'error'); return; }
    if(!o) return;
    const msg=o.doneMessage||`📢 Cập nhật đơn hàng!\n🆔 Mã đơn: ${o.id}\n📦 Dịch vụ: ${o.serviceName}\n⏳ Trạng thái: ${o.status==='done'?'✅ Hoàn thành':'🔄 Đang tiến hành'}\nMọi thắc mắc liên hệ Thanh Minh Các!`;
    document.getElementById('notifyPreviewText').textContent=msg;
    document.getElementById('notifyFbLink').href='https://www.facebook.com/profile.php?id=61585785807233';
    openModal('notifyModal');
}

function copyNotifyText(){
    const text=document.getElementById('notifyPreviewText').textContent;
    navigator.clipboard.writeText(text).then(()=>{showNotif('📋 Đã copy!','success');closeModal('notifyModal');})
    .catch(()=>{const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);showNotif('📋 Đã copy!','success');closeModal('notifyModal');});
}


// ============================================================
// ===== REALTIME LISTENER =====
// ============================================================

function startOrderListener(uid) {
    if (_orderListener) { _orderListener(); _orderListener = null; }
    if (!uid || !db) return;
    try {
        db.collection('orders').where('uid','==',uid).get().then(snap => {
            snap.docs.forEach(doc => {
                _knownOrderStatuses[doc.id] = doc.data().status;
            });
            _orderListener = db.collection('orders')
                .where('uid','==',uid)
                .onSnapshot(snapshot => {
                    snapshot.docChanges().forEach(change => {
                        if (change.type === 'modified') {
                            const order = { id: change.doc.id, ...change.doc.data() };
                            const oldStatus = _knownOrderStatuses[order.id];
                            if (oldStatus === 'pending' && order.status === 'done') {
                                showToastDone(order);
                                triggerCelebration();
                            } else if (oldStatus === 'pending' && order.status === 'cancelled') {
                                showNotif('Đơn '+order.id+' đã được shop lưu trữ. Liên hệ shop nếu cần hỗ trợ.','info');
                            }
                            _knownOrderStatuses[order.id] = order.status;
                        }
                        if (change.type === 'added') {
                            const order = { id: change.doc.id, ...change.doc.data() };
                            _knownOrderStatuses[order.id] = order.status;
                        }
                    });
                    // Refresh customer-facing views when admin updates an order.
                    if (currentUser && currentUser.uid === uid) {
                        const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        if (document.getElementById('historyPanel')?.classList.contains('show')) {
                            renderHistoryList(rows);
                        }
                        if (document.getElementById('profilePanel')?.classList.contains('show')) {
                            renderProfile().catch(error => console.error('Realtime profile refresh:', error));
                        }
                    }
                }, error => {
                    console.error('Customer order realtime error:', error);
                    showNotif('Không đồng bộ được trạng thái đơn: '+(error.message||error),'error');
                });
        }).catch(e=>console.warn('Order listener error:',e.message));
    } catch(e){ console.warn('Cannot start order listener:',e.message); }
}

function stopOrderListener() {
    if (_orderListener) { _orderListener(); _orderListener = null; }
    _knownOrderStatuses = {};
}

function showToastDone(order) {
    const body = document.getElementById('toastDoneBody');
    body.innerHTML = `
        <div class="toast-done-svc">${escapeHTML(order.serviceName)}</div>
        <div style="margin-top:4px">Mã đơn: <strong style="font-family:monospace;color:var(--purple)">${escapeHTML(order.id)}</strong></div>
        ${order.doneTime ? `<div style="margin-top:3px;font-size:0.72rem;color:rgba(240,230,255,0.45)">Xong lúc: ${escapeHTML(order.doneTime)}</div>` : ''}
        <div style="margin-top:6px;color:var(--gold);font-size:0.75rem">Cảm ơn đã tin tưởng Thanh Minh Các! 🐉</div>
    `;
    const toast = document.getElementById('toastDone');
    toast.classList.add('show');
    // Tự đóng sau 12 giây
    setTimeout(() => closeToastDone(), 12000);
}

function closeToastDone() {
    document.getElementById('toastDone').classList.remove('show');
}

