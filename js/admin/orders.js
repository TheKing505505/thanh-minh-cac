function filterAdminOrders(filter,btn){
    adminOrderFilter=filter;
    document.querySelectorAll('#adminOrders .history-filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    getOrdersFromDB().then(orders=>renderAdminOrders(orders));
}

function renderAdminOrders(orders){
    const c=document.getElementById('adminOrderList');
    let list=orders;
    if(adminOrderFilter!=='all') list=list.filter(o=>o.status===adminOrderFilter);
    if(!list.length){c.innerHTML='<div class="no-data"><p>Không có đơn nào</p></div>';return;}
    c.innerHTML=list.map(o=>`
        <div class="admin-order-card ${o.status}">
            <span class="order-status-badge ${o.status}">${o.status==='done'?'✅ Xong':'⏳ Chờ Cày'}</span>
            <div style="font-family:monospace;font-size:0.82rem;color:var(--purple);margin-bottom:6px">${o.id} · ${o.time}</div>
            <div style="font-weight:700;margin-bottom:8px">${o.serviceName}</div>
            <div class="order-fields">
                <div class="order-field"><span>Khách: </span><strong>${o.username||'Ẩn danh'}</strong></div>
                <div class="order-field"><span>Giá: </span><strong style="color:var(--gold)">${formatPrice(o.price)}</strong></div>
                <div class="order-field"><span>TK Roblox: </span><strong>${o.account}</strong></div>
                <div class="order-field"><span>Mật khẩu: </span><strong style="color:var(--pink)">${o.password}</strong></div>
                ${o.subOption?`<div class="order-field"><span>Lựa chọn: </span><strong style="color:var(--accent)">${o.subOption}</strong></div>`:''}
                ${o.note?`<div class="order-field" style="grid-column:1/-1"><span>Ghi chú: </span><strong>${o.note}</strong></div>`:''}
            </div>
            ${o.doneTime?`<div style="font-size:0.75rem;color:var(--green);margin-top:6px">✅ Xong lúc: ${o.doneTime}</div>`:''}
            <div class="order-actions">
                ${o.status==='pending'?`<button class="btn-done-order" onclick="markOrderDone('${o.id}')">✅ Đánh Dấu Xong</button>`:''}
                <button class="btn-notify-order" onclick="openNotifyModal('${o.id}')">💬 Thông Báo Khách</button>
                <button class="btn-delete" onclick="deleteOrder('${o.id}')">🗑️ Xóa</button>
            </div>
        </div>
    `).join('');
}

async function markOrderDone(id){
    const orders=await getOrdersFromDB();
    const o=orders.find(x=>x.id===id);if(!o) return;
    const doneTime=new Date().toLocaleString('vi-VN');
    const doneMessage=`🎉 Đơn hàng ${id} của bạn đã hoàn thành!\n✅ Dịch vụ: ${o.serviceName}\n⏰ Xong lúc: ${doneTime}\nCảm ơn đã tin tưởng Thanh Minh Các! 🐉`;
    try{
        await updateOrderInDB(id,{status:'done',doneTime,doneMessage});
        showNotif('✅ Đã đánh dấu xong đơn '+id,'success');
        triggerCelebration();
        loadAdminData();
    } catch(e){showNotif('Lỗi!','error');}
}

async function deleteOrder(id){
    if(!confirm(`Xóa đơn ${id}?`)) return;
    try{await db.collection('orders').doc(id).delete();showNotif('Đã xóa đơn','info');loadAdminData();}
    catch(e){showNotif('Lỗi!','error');}
}

async function openNotifyModal(id){
    const orders=await getOrdersFromDB();
    const o=orders.find(x=>x.id===id);if(!o) return;
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

function startOrderListener(username) {
    if (_orderListener) { _orderListener(); _orderListener = null; }
    if (!username || !db) return;
    try {
        db.collection('orders').where('username','==',username).get().then(snap => {
            snap.docs.forEach(doc => {
                _knownOrderStatuses[doc.id] = doc.data().status;
            });
            _orderListener = db.collection('orders')
                .where('username','==',username)
                .onSnapshot(snapshot => {
                    snapshot.docChanges().forEach(change => {
                        if (change.type === 'modified') {
                            const order = { id: change.doc.id, ...change.doc.data() };
                            const oldStatus = _knownOrderStatuses[order.id];
                            if (oldStatus === 'pending' && order.status === 'done') {
                                showToastDone(order);
                                triggerCelebration();
                            }
                            _knownOrderStatuses[order.id] = order.status;
                        }
                        if (change.type === 'added') {
                            const order = { id: change.doc.id, ...change.doc.data() };
                            _knownOrderStatuses[order.id] = order.status;
                        }
                    });
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
        <div class="toast-done-svc">${order.serviceName}</div>
        <div style="margin-top:4px">Mã đơn: <strong style="font-family:monospace;color:var(--purple)">${order.id}</strong></div>
        ${order.doneTime ? `<div style="margin-top:3px;font-size:0.72rem;color:rgba(240,230,255,0.45)">Xong lúc: ${order.doneTime}</div>` : ''}
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

