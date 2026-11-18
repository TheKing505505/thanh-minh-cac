// ADMIN CARDS
async function loadAdminCards(){
    const c=document.getElementById('adminCardList');
    c.innerHTML='<div class="no-data"><p>⏳ Đang tải...</p></div>';
    const cards=await getCardsFromDB();
    let list=cards;
    if(adminCardFilter!=='all') list=list.filter(c=>c.status===adminCardFilter);
    if(!list.length){c.innerHTML='<div class="no-data"><p>Không có thẻ nào</p></div>';return;}
    c.innerHTML=list.map(card=>{
        const sid=safeId(card.id);
        return `
        <div class="admin-card-item">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <strong>${esc(card.username)} — ${esc(card.type)} ${new Intl.NumberFormat('vi-VN').format(Number(card.denom)||0)}đ</strong>
                <span class="card-status-badge card-status-${esc(card.status)}">${card.status==='done'?'✅ Đã duyệt':card.status==='failed'?'❌ Thất bại':'⏳ Chờ duyệt'}</span>
            </div>
            <div class="admin-card-fields">
                <div class="admin-card-field"><span>Seri: </span><strong>${esc(card.serial)}</strong></div>
                <div class="admin-card-field"><span>Mã: </span><strong style="color:var(--pink)">${esc(card.code)}</strong></div>
            </div>
            <div style="font-size:0.72rem;color:rgba(240,230,255,0.35);margin-bottom:8px">${esc(card.time)}</div>
            ${card.status==='pending'?`
            <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn-approve-card" onclick="approveCard('${sid}')">✅ Duyệt</button>
                <button class="btn-reject-card" onclick="rejectCard('${sid}')">❌ Từ Chối</button>
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
        const r=await adminApproveCard(id);   // transaction: không thể duyệt 2 lần, cộng tiền nguyên tử
        showNotif(`✅ Đã duyệt! Cộng ${new Intl.NumberFormat('vi-VN').format(r.denom)}đ cho ${r.username}`,'success');
        loadAdminCards();
        recomputePublicStats();
    } catch(e){ console.error(e); showNotif('❌ '+(e.message||'Lỗi duyệt thẻ!'),'error'); }
}
async function rejectCard(id){
    const reason=(prompt('Lý do từ chối (tuỳ chọn):','Thẻ không hợp lệ')||'Thẻ không hợp lệ').slice(0,150);
    try{
        await updateCardInDB(id,{status:'failed',note:'❌ '+reason});
        showNotif('Đã từ chối thẻ','info');loadAdminCards();
    } catch(e){showNotif('Lỗi!','error');}
}
