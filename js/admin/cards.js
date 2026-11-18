// ADMIN CARDS
async function loadAdminCards(){
    const c=document.getElementById('adminCardList');
    c.innerHTML='<div class="no-data"><p>⏳ Đang tải...</p></div>';
    let cards;
    try { cards = await getCardsFromDB(); }
    catch (error) {
        console.error('loadAdminCards:', error);
        c.innerHTML = `<div class="no-data"><p>Không tải được thẻ: ${escapeHTML(error.message || error)}</p></div>`;
        return;
    }
    let list=cards;
    if(adminCardFilter!=='all') list=list.filter(c=>c.status===adminCardFilter);
    if(!list.length){c.innerHTML='<div class="no-data"><p>Không có thẻ nào</p></div>';return;}
    c.innerHTML=list.map(card=>{
        const statusClass=['done','failed','pending'].includes(card.status)?card.status:'pending';
        const cardId=safeJsArg(card.id);
        return `<div class="admin-card-item">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <strong>${escapeHTML(card.username)} — ${escapeHTML(card.type)} ${new Intl.NumberFormat('vi-VN').format(Number(card.denom)||0)}đ</strong>
                <span class="card-status-badge card-status-${statusClass}">${statusClass==='done'?'✅ Đã duyệt':statusClass==='failed'?'❌ Thất bại':'⏳ Chờ duyệt'}</span>
            </div>
            ${statusClass==='pending' ? `<div class="admin-card-fields">
                <div class="admin-card-field"><span>Seri: </span><strong>${escapeHTML(card.serial)}</strong></div>
                <div class="admin-card-field"><span>Mã: </span><strong style="color:var(--pink)">${escapeHTML(card.code)}</strong></div>
            </div>` : '<div style="font-size:.72rem;color:var(--green)">Thông tin mã/seri đã được xóa sau khi xử lý.</div>'}
            <div style="font-size:0.72rem;color:rgba(240,230,255,0.35);margin-bottom:8px">${escapeHTML(card.time)}</div>
            ${statusClass==='pending'?`
            <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn-approve-card" onclick="approveCard(${cardId})">✅ Duyệt</button>
                <button class="btn-reject-card" onclick="rejectCard(${cardId})">❌ Từ Chối</button>
            </div>`:''}
        </div>`;
    }).join('');
}

function filterAdminCards(filter,btn){
    adminCardFilter=filter;
    document.querySelectorAll('#adminCards .history-filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    loadAdminCards();
}

async function approveCard(id){
    try{
        // Lấy thông tin thẻ
        const newBalance = await approveCardAndCreditAdmin(id);
        showNotif(`✅ Đã duyệt thẻ. Số dư mới: ${formatPrice(newBalance)}.`, 'success');
        loadAdminCards();
    } catch(e){ console.error(e); showNotif('Lỗi duyệt thẻ: ' + (e.message || 'không xác định'), 'error'); }
}
async function rejectCard(id){
    const reason=prompt('Lý do từ chối (tuỳ chọn):','Thẻ không hợp lệ')||'Thẻ không hợp lệ';
    try{
        await updateCardInDB(id,{status:'failed',note:'❌ '+reason,serial:null,code:null,reviewedAt:Date.now()});
        showNotif('Đã từ chối thẻ','info');loadAdminCards();
    } catch(e){console.error(e);showNotif('Không từ chối được thẻ: '+(e.message||e),'error');}
}

