// ADMIN CARDS
async function loadAdminCards(){
    const c=document.getElementById('adminCardList');
    c.innerHTML='<div class="no-data"><p>⏳ Đang tải...</p></div>';
    const cards=await getCardsFromDB();
    let list=cards;
    if(adminCardFilter!=='all') list=list.filter(c=>c.status===adminCardFilter);
    if(!list.length){c.innerHTML='<div class="no-data"><p>Không có thẻ nào</p></div>';return;}
    c.innerHTML=list.map(card=>`
        <div class="admin-card-item">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <strong>${card.username} — ${card.type} ${new Intl.NumberFormat('vi-VN').format(card.denom)}đ</strong>
                <span class="card-status-badge card-status-${card.status}">${card.status==='done'?'✅ Đã duyệt':card.status==='failed'?'❌ Thất bại':'⏳ Chờ duyệt'}</span>
            </div>
            <div class="admin-card-fields">
                <div class="admin-card-field"><span>Seri: </span><strong>${card.serial}</strong></div>
                <div class="admin-card-field"><span>Mã: </span><strong style="color:var(--pink)">${card.code}</strong></div>
            </div>
            <div style="font-size:0.72rem;color:rgba(240,230,255,0.35);margin-bottom:8px">${card.time}</div>
            ${card.status==='pending'?`
            <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn-approve-card" onclick="approveCard('${card.id}')">✅ Duyệt</button>
                <button class="btn-reject-card" onclick="rejectCard('${card.id}')">❌ Từ Chối</button>
            </div>`:''}
        </div>
    `).join('');
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
        const cards = await getCardsFromDB();
        const card = cards.find(c=>c.id===id);
        if(!card){ showNotif('Không tìm thấy thẻ!','error'); return; }
        if(card.status==='done'){ showNotif('Thẻ này đã được duyệt rồi!','error'); return; }

        // Cộng tiền vào ví khách
        const user = await findUserInDB(card.username);
        const oldBalance = user ? (user.balance||0) : 0;
        const newBalance = oldBalance + card.denom;
        await updateUserInDB(card.username, { balance: newBalance });

        // Cập nhật trạng thái thẻ
        await updateCardInDB(id, {
            status:'done',
            note:`✅ Đã duyệt! +${new Intl.NumberFormat('vi-VN').format(card.denom)}đ vào ví`
        });

        // Lưu log
        await db.collection('coinlogs').add({
            username: card.username,
            amount: card.denom,
            note: `Nạp thẻ ${card.type} ${new Intl.NumberFormat('vi-VN').format(card.denom)}đ`,
            newBalance,
            time: new Date().toLocaleString('vi-VN'),
            timestamp: Date.now()
        });

        showNotif(`✅ Đã duyệt! Cộng ${new Intl.NumberFormat('vi-VN').format(card.denom)}đ cho ${card.username}`,'success');
        loadAdminCards();
    } catch(e){ console.error(e); showNotif('Lỗi duyệt thẻ!','error'); }
}
async function rejectCard(id){
    const reason=prompt('Lý do từ chối (tuỳ chọn):','Thẻ không hợp lệ')||'Thẻ không hợp lệ';
    try{
        await updateCardInDB(id,{status:'failed',note:'❌ '+reason});
        showNotif('Đã từ chối thẻ','info');loadAdminCards();
    } catch(e){showNotif('Lỗi!','error');}
}

