
function selectCardType(type,btn){
    selectedCardType=type;
    document.querySelectorAll('.card-type-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('cardType').value=type;
}

async function submitCard(){
    if(!currentUser||currentUser.role!=='user'){showNotif('Đăng nhập để nạp thẻ!','error');return;}
    if(!db){showNotif('❌ Firebase chưa kết nối, thử reload trang!','error');return;}
    const serial=document.getElementById('cardSerial').value.trim();
    const code=document.getElementById('cardCode').value.trim();
    if(serial.length<5||serial.length>40||code.length<5||code.length>40){showNotif('Seri/mã thẻ phải từ 5 đến 40 ký tự!','error');return;}
    const denom=parseInt(document.getElementById('cardDenom').value);
    if(!serial){showNotif('Nhập số seri thẻ!','error');return;}
    if(!code){showNotif('Nhập mã số thẻ!','error');return;}
    if(!denom||isNaN(denom)){showNotif('Chọn mệnh giá thẻ!','error');return;}
    const btn=document.getElementById('cardSubmitBtn');
    btn.disabled=true;btn.textContent='⏳ Đang gửi...';
    try{
        const id='CARD-'+secureRandomString(12);
        await saveCardToDB({id,uid:currentUser.uid,username:currentUser.username,type:selectedCardType,denom,serial,code,time:new Date().toLocaleString('vi-VN'),timestamp:Date.now(),status:'pending',note:''});
        document.getElementById('cardSerial').value='';
        document.getElementById('cardCode').value='';
        showNotif('✅ Đã gửi thẻ! Chờ admin duyệt.','success');
        loadCardHistory();
    } catch(e){
        console.error('submitCard error:',e);
        if(e.message==='DB not ready') showNotif('❌ Firebase chưa kết nối, thử reload!','error');
        else showNotif('❌ Lỗi gửi thẻ, vui lòng thử lại!','error');
    }
    finally{btn.disabled=false;btn.textContent='💳 Gửi Thẻ Nạp';}
}

async function loadCardHistory(){
    const c=document.getElementById('cardHistoryList');
    if(!c) return;
    c.innerHTML='<div class="no-data"><p>⏳ Đang tải...</p></div>';
    try{
        const cards=await getCardsFromDB();
        const mine=cards;
        if(!mine.length){c.innerHTML='<div class="no-data"><p>Chưa có lịch sử nạp thẻ</p></div>';return;}
        c.innerHTML=mine.map(card=>`
            <div class="card-history-item">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                    <strong>${esc(card.type)} — ${new Intl.NumberFormat('vi-VN').format(card.denom)}đ</strong>
                    <span class="card-status-badge card-status-${esc(card.status)}">${card.status==='done'?'✅ Đã duyệt':card.status==='failed'?'❌ Thất bại':'⏳ Chờ duyệt'}</span>
                </div>
                <div style="font-size:0.75rem;color:rgba(240,230,255,0.4)">${esc(card.time)}</div>
                ${card.note?`<div style="font-size:0.75rem;color:var(--accent);margin-top:4px">${esc(card.note)}</div>`:''}
            </div>
        `).join('');
    } catch(e){c.innerHTML='<div class="no-data"><p>Lỗi tải dữ liệu</p></div>';}
}

