let _adminOrdersCache=[];

function filterAdminOrders(filter,btn){
    adminOrderFilter=filter;
    document.querySelectorAll('#adminOrders .history-filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    getOrdersFromDB().then(orders=>renderAdminOrders(orders));
}

function renderAdminOrders(orders){
    _adminOrdersCache=orders||[];
    const usersById={};(_usersCache||[]).forEach(u=>{usersById[u.id]=u;});
    const c=document.getElementById('adminOrderList');
    let list=_adminOrdersCache;
    if(adminOrderFilter!=='all') list=list.filter(o=>o.status===adminOrderFilter);
    if(!list.length){c.innerHTML='<div class="no-data"><p>Không có đơn nào</p></div>';return;}
    c.innerHTML=list.map(o=>{
        const sid=safeId(o.id);
        const q=o.status==='pending'?quoteOrder(o,_adminOrdersCache,usersById):null;
        const quoteHtml=q?(q.ok
            ?`<div style="font-size:0.76rem;margin:6px 0;padding:6px 10px;border-radius:8px;background:rgba(255,255,255,0.04)">💵 Giá chuẩn sẽ trừ: <strong style="color:var(--gold)">${formatPrice(q.price)}</strong>${q.discountInfo?` (${esc(q.discountInfo)})`:''} · Số dư khách: <strong style="color:${q.enough?'var(--green)':'var(--red)'}">${formatPrice(q.balance)}</strong>${q.enough?'':' ⚠️ KHÔNG ĐỦ — chưa nên cày'}${q.mismatch?` <span style="color:var(--red)">⚠️ Khách khai ${formatPrice(o.price)} ≠ giá chuẩn</span>`:''}</div>`
            :`<div style="font-size:0.76rem;margin:6px 0;color:var(--red)">⚠️ ${esc(q.reason)}</div>`):'';
        const pwHtml=o.passwordEnc
            ?`<button class="btn-notify-order" style="padding:2px 10px;font-size:0.72rem" onclick="revealOrderPassword('${sid}',this)">🔓 Giải mã</button> <strong id="pw-${sid}" style="color:var(--pink)"></strong>`
            :`<strong style="color:var(--pink)">${esc(o.password)}</strong> <span style="font-size:0.65rem;color:var(--red)">(chưa mã hoá)</span>`;
        return `
        <div class="admin-order-card ${esc(o.status)}">
            <span class="order-status-badge ${esc(o.status)}">${o.status==='done'?'✅ Xong':'⏳ Chờ Cày'}</span>
            <div style="font-family:monospace;font-size:0.82rem;color:var(--purple);margin-bottom:6px">${esc(o.id)} · ${esc(o.time)}</div>
            <div style="font-weight:700;margin-bottom:8px">${esc(o.serviceName)}</div>
            <div class="order-fields">
                <div class="order-field"><span>Khách: </span><strong>${esc(o.username||'Ẩn danh')}</strong></div>
                <div class="order-field"><span>Giá: </span><strong style="color:var(--gold)">${formatPrice(o.price)}</strong></div>
                <div class="order-field"><span>TK Roblox: </span><strong>${esc(o.account)}</strong></div>
                <div class="order-field"><span>Mật khẩu: </span>${pwHtml}</div>
                ${o.subOption?`<div class="order-field"><span>Lựa chọn: </span><strong style="color:var(--accent)">${esc(o.subOption)}</strong></div>`:''}
                ${o.note?`<div class="order-field" style="grid-column:1/-1"><span>Ghi chú: </span><strong>${esc(o.note)}</strong></div>`:''}
            </div>
            ${quoteHtml}
            ${o.doneTime?`<div style="font-size:0.75rem;color:var(--green);margin-top:6px">✅ Xong lúc: ${esc(o.doneTime)}</div>`:''}
            <div class="order-actions">
                ${o.status==='pending'?`<button class="btn-done-order" onclick="markOrderDone('${sid}')">✅ Hoàn Thành &amp; Trừ Tiền</button>`:''}
                <button class="btn-notify-order" onclick="openNotifyModal('${sid}')">💬 Thông Báo Khách</button>
                <button class="btn-delete" onclick="deleteOrder('${sid}')">🗑️ Xóa</button>
            </div>
        </div>`;
    }).join('');
}

async function revealOrderPassword(id,btn){
    const o=_adminOrdersCache.find(x=>x.id===id);if(!o||!o.passwordEnc) return;
    try{
        const pw=await decryptAsAdmin(o.passwordEnc);
        const el=document.getElementById('pw-'+id);
        if(el) el.textContent=pw;      // textContent: không bao giờ chạy như HTML
        btn.style.display='none';
    }catch(e){showNotif('❌ Không giải mã được: '+(e.message||'sai khoá'),'error');}
}

async function markOrderDone(id){
    try{
        const info=await adminFinalizeOrder(id,_adminOrdersCache);
        showNotif(`✅ Xong đơn ${id} · đã trừ ${formatPrice(info.price)}`,'success');
        triggerCelebration();
        loadAdminData();
    } catch(e){ showNotif('❌ '+(e.message||'Lỗi!'),'error'); }
}

async function deleteOrder(id){
    if(!confirm(`Xóa đơn ${id}?`)) return;
    try{await db.collection('orders').doc(id).delete();showNotif('Đã xóa đơn','info');loadAdminData();}
    catch(e){showNotif('Lỗi!','error');}
}

async function openNotifyModal(id){
    const o=_adminOrdersCache.find(x=>x.id===id);if(!o) return;
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
        <div class="toast-done-svc">${esc(order.serviceName)}</div>
        <div style="margin-top:4px">Mã đơn: <strong style="font-family:monospace;color:var(--purple)">${esc(order.id)}</strong></div>
        ${order.doneTime ? `<div style="margin-top:3px;font-size:0.72rem;color:rgba(240,230,255,0.45)">Xong lúc: ${esc(order.doneTime)}</div>` : ''}
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

