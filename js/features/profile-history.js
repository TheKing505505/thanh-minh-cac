// ============================================================
// ===== HISTORY =====
// ============================================================
async function loadAndRenderHistory(){
    document.getElementById('historyList').innerHTML='<div class="no-data"><p>⏳ Đang tải...</p></div>';
    const myOrders=await getOrdersFromDB();   // đã lọc theo uid của chính mình
    renderHistoryList(myOrders);
}
function filterHistoryStatus(status,btn){
    historyFilter=status;
    document.querySelectorAll('.history-filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    loadAndRenderHistory();
}
function renderHistoryList(allOrders){
    const c=document.getElementById('historyList');
    let orders=allOrders;
    if(historyFilter!=='all') orders=orders.filter(o=>o.status===historyFilter);
    if(!orders.length){c.innerHTML='<div class="no-data"><p>Chưa có đơn hàng nào</p></div>';return;}
    c.innerHTML=orders.map(o=>`
        <div class="history-card">
            <div class="hc-top"><div class="hc-id">${esc(o.id)}</div><div class="hc-time">${esc(o.time)}</div></div>
            <div class="hc-service">${esc(o.serviceName)}</div>
            <div style="font-size:0.8rem;color:rgba(240,230,255,0.5);margin-bottom:6px">TK: <strong style="color:var(--text)">${esc(o.account)}</strong>${o.subOption?` | Chọn: <strong style="color:var(--accent)">${esc(o.subOption)}</strong>`:''} ${o.note?`| ${esc(o.note)}`:''}</div>
            <div class="hc-price">${formatPrice(o.price)}</div>
            <span class="hc-status ${esc(o.status)}">${o.status==='done'?'✅ Hoàn thành':'⏳ Đang xử lý'}</span>
            ${o.doneMessage?`<div class="hc-done-msg">${esc(o.doneMessage)}</div>`:''}
        </div>
    `).join('');
}

// ============================================================
// ===== PROFILE + ZEIGARNIK PROGRESS =====
// ============================================================
async function renderProfile(){
    if(!currentUser) return;
    const user=await getMyUser();if(!user) return;
    const myOrders=await getOrdersFromDB();
    const hold=await getMyHold();
    const doneOrders=myOrders.filter(o=>o.status==='done');
    const totalSpent=doneOrders.reduce((s,o)=>s+o.price,0);
    let title=null;
    if(user.titleOverride){title=TITLES.find(t=>t.id===user.titleOverride);}
    else{const auto=TITLES.filter(t=>!t.adminOnly).sort((a,b)=>b.min-a.min);title=auto.find(t=>totalSpent>=t.min)||null;}

    // Zeigarnik — tìm danh hiệu tiếp theo
    const autoTitles=TITLES.filter(t=>!t.adminOnly).sort((a,b)=>a.min-b.min);
    const nextTitle=autoTitles.find(t=>totalSpent<t.min);
    let progressHtml='';
    if(nextTitle&&!user.titleOverride){
        const prev=autoTitles[autoTitles.indexOf(nextTitle)-1];
        const prevMin=prev?prev.min:0;
        const pct=Math.min(100,Math.round((totalSpent-prevMin)/(nextTitle.min-prevMin)*100));
        const remain=formatPrice(nextTitle.min-totalSpent);
        progressHtml=`<div class="title-progress-bar">
            <div class="title-progress-label">Tiến trình → ${esc(nextTitle.name)}</div>
            <div class="title-progress-track"><div class="title-progress-fill" style="width:${pct}%"></div></div>
            <div class="title-progress-hint">✨ Còn ${remain} nữa để đạt ${esc(nextTitle.name)}!</div>
        </div>`;
    }

    document.getElementById('profileCard').innerHTML=`
        <div class="profile-avatar">${esc(user.username[0].toUpperCase())}</div>
        <div class="profile-name">${esc(user.username)}</div>
        ${title?(()=>{const svg=DH_LOGOS[title.id]?DH_LOGOS[title.id].replace(/width="64"/,'width="36"').replace(/height="72"/,'height="36"'):'';return`<div class="profile-title-badge ${title.cls}" style="display:inline-flex;align-items:center;gap:8px">${svg}<span>${esc(title.name)}</span></div>`;})():'<div style="color:rgba(240,230,255,0.3);font-size:0.8rem;margin-bottom:8px">Chưa có danh hiệu</div>'}
        <div class="profile-email">📧 ${esc(user.email||'—')}</div>
        ${user.facebook?`<div class="profile-facebook">📘 ${esc(user.facebook)}</div>`:''}
        <div class="profile-info-row">
            <div class="profile-info-item" style="border:1px solid rgba(74,222,128,0.2);background:rgba(74,222,128,0.05)"><div class="profile-info-num" style="color:var(--green)">${formatPrice(user.balance||0)}</div><div class="profile-info-label">Số Dư${hold>0?` · đang giữ ${formatPrice(hold)}`:''}</div></div>
        <div class="profile-info-item"><div class="profile-info-num">${myOrders.length}</div><div class="profile-info-label">Tổng Đơn</div></div>
            <div class="profile-info-item"><div class="profile-info-num">${doneOrders.length}</div><div class="profile-info-label">Đã Xong</div></div>
            <div class="profile-info-item"><div class="profile-info-num">${formatPrice(totalSpent)}</div><div class="profile-info-label">Đã Chi</div></div>
        </div>
        <div style="font-size:0.72rem;color:rgba(240,230,255,0.3);margin-top:12px">Tham gia: ${esc(user.createdAt)}</div>
        ${(()=>{
            if(!user.titleOverride||user.titleOverride==='luyen-khi') return '';
            const tSt=getTitleStatus(user);
            const tObj=TITLES.find(x=>x.id===user.titleOverride);
            if(!tObj) return '';
            if(tSt.permanent) return `<div style="margin-top:10px;padding:8px 14px;border-radius:10px;background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.3);font-size:0.75rem;color:var(--gold);text-align:center">👑 Vĩnh viễn · Miễn 100% mọi dịch vụ</div>`;
            if(tSt.expired){
                const ri=getRenewalInfo(user,user.titleOverride);
                const rPrice=Math.round(tObj.price*ri.pct/100);
                const label=ri.pct<100?`Gia hạn ${ri.pct}% = ${formatPrice(rPrice)}`:`Mua lại full = ${formatPrice(rPrice)}`;
                return `<div style="margin-top:10px;padding:10px 14px;border-radius:10px;background:rgba(255,71,87,0.08);border:1px solid rgba(255,71,87,0.35);font-size:0.78rem;text-align:center">
                    <div style="color:var(--red);font-weight:700;margin-bottom:6px">⚠️ Danh hiệu đã hết hạn ${tSt.expiredDaysAgo} ngày trước</div>
                    <div style="color:rgba(240,230,255,0.5);font-size:0.7rem;margin-bottom:8px">${ri.pct<100?'Còn trong cửa sổ gia hạn ưu đãi!':'Đã qua cửa sổ gia hạn — phải mua lại full giá'}</div>
                    <button onclick="showHome();setTimeout(()=>document.getElementById('titleShopGrid').scrollIntoView({behavior:'smooth'}),300)" style="padding:7px 18px;border-radius:20px;border:none;background:linear-gradient(135deg,var(--red),#c00);color:#fff;font-family:'Quicksand',sans-serif;font-weight:700;font-size:0.78rem;cursor:pointer">${label}</button>
                </div>`;
            }
            const urgency=tSt.daysLeft<=3;
            const barPct=Math.round((tSt.daysLeft/30)*100);
            const barColor=urgency?'#ff4757':tSt.daysLeft<=7?'#ffa502':'#4ade80';
            const ri=getRenewalInfo(user,user.titleOverride);
            const rPrice=Math.round(tObj.price*ri.pct/100);
            return `<div style="margin-top:10px;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid ${urgency?'rgba(255,71,87,0.4)':'rgba(74,222,128,0.2)'};font-size:0.78rem">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                    <span style="color:rgba(240,230,255,0.55);font-size:0.7rem">⏳ Hiệu lực danh hiệu</span>
                    <span style="font-weight:700;color:${barColor}">${urgency?'⚠️ ':''} Còn ${tSt.daysLeft} ngày</span>
                </div>
                <div style="height:4px;background:rgba(255,255,255,0.08);border-radius:2px;margin-bottom:8px">
                    <div style="height:4px;width:${barPct}%;background:${barColor};border-radius:2px;transition:width 0.5s"></div>
                </div>
                ${urgency?`<button onclick="showHome();setTimeout(()=>document.getElementById('titleShopGrid').scrollIntoView({behavior:'smooth'}),300)" style="width:100%;padding:7px;border-radius:8px;border:none;background:linear-gradient(135deg,var(--pink),var(--purple));color:#fff;font-family:'Quicksand',sans-serif;font-weight:700;font-size:0.78rem;cursor:pointer">🔄 Gia hạn sớm 40% = ${formatPrice(rPrice)}</button>`
                :`<div style="font-size:0.7rem;color:rgba(240,230,255,0.35);text-align:center">Gia hạn sớm (≤3 ngày cuối) chỉ 40% = ${formatPrice(Math.round(tObj.price*0.4))}</div>`}
            </div>`;
        })()}
        ${progressHtml}
    `;
    const ol=document.getElementById('profileOrderList');

    // === EXPIRY + RENEWAL BOX ===
    const expiryEl=document.getElementById('profileExpiryBox');
    if(expiryEl){
        const tid=user.titleOverride;
        const t=tid?TITLES.find(x=>x.id===tid):null;
        if(t&&!t.adminOnly&&!t.free&&tid!=='luyen-khi'){
            const expiry=user.titleExpiry||0;
            const now=Date.now();
            const remain=expiry-now;
            const days=Math.ceil(remain/86400000);
            const DAY3=3*24*60*60*1000;
            let boxClass='title-expiry-box';
            let countdownHtml='';
            let renewHtml='';
            const renewPrice40=Math.round(t.price*0.4);
            const renewPrice50=Math.round(t.price*0.5);
            if(remain>0){
                if(remain<=DAY3){
                    boxClass+=' title-expiry-urgent';
                    countdownHtml=`<div class="expiry-countdown expiry-urgent-text">⚠️ Còn ${days} ngày hết hạn!</div>`;
                    renewHtml=`<div style="font-size:0.72rem;color:rgba(240,230,255,.5);margin-bottom:8px">Gia hạn ngay giá <strong style="color:#ff9040">50%</strong> = ${formatPrice(renewPrice50)} (tiết kiệm ${formatPrice(t.price-renewPrice50)})</div><button class="btn-renew btn-renew-normal" onclick="openBuyTitle('${t.id}')">🔄 Gia Hạn Ngay</button>`;
                } else {
                    countdownHtml=`<div class="expiry-countdown expiry-ok-text">✅ Còn ${days} ngày</div>`;
                    renewHtml=`<div style="font-size:0.72rem;color:rgba(240,230,255,.5);margin-bottom:8px">Gia hạn sớm giá <strong style="color:#4ade80">40%</strong> = ${formatPrice(renewPrice40)} (tiết kiệm ${formatPrice(t.price-renewPrice40)})</div><button class="btn-renew btn-renew-early" onclick="openBuyTitle('${t.id}')">💚 Gia Hạn Sớm (-40%)</button>`;
                }
            } else {
                const overDays=Math.floor(-remain/86400000);
                if(-remain<=DAY3){
                    boxClass+=' title-expiry-urgent';
                    countdownHtml=`<div class="expiry-countdown expiry-urgent-text">⏰ Hết hạn ${overDays>0?overDays+' ngày trước':'hôm nay'}!</div>`;
                    renewHtml=`<div style="font-size:0.72rem;color:rgba(240,230,255,.5);margin-bottom:8px">Gia hạn trong cửa sổ 3 ngày giá <strong style="color:#ff9040">50%</strong> = ${formatPrice(renewPrice50)}</div><button class="btn-renew btn-renew-normal" onclick="openBuyTitle('${t.id}')">🔄 Gia Hạn (50%)</button>`;
                } else {
                    boxClass+=' title-expiry-expired';
                    countdownHtml=`<div class="expiry-countdown expiry-expired-text">❌ Hết hạn ${overDays} ngày trước</div>`;
                    renewHtml=`<div style="font-size:0.72rem;color:rgba(240,230,255,.5);margin-bottom:8px">Cửa sổ gia hạn đã đóng — phải mua lại giá gốc ${formatPrice(t.price)}</div><button class="btn-renew btn-renew-full" onclick="openBuyTitle('${t.id}')">🛒 Mua Lại Full Giá</button>`;
                }
            }
            expiryEl.innerHTML=`<div class="${boxClass}">
                <div style="font-size:0.72rem;color:rgba(240,230,255,.45);margin-bottom:4px">⏱ HIỆU LỰC DANH HIỆU</div>
                ${countdownHtml}
                <div style="margin-top:10px">${renewHtml}</div>
            </div>`;
        } else { expiryEl.innerHTML=''; }
    }

    // === BỔ SUNG THÔNG TIN LIÊN HỆ ===
    const suppEl = document.getElementById('profileContactSupp');
    if(suppEl){
        const missingEmail = !user.email;
        const missingFb = !user.facebook;
        if(missingEmail || missingFb){
            suppEl.innerHTML=`
            <div id="contactSuppBox" style="background:linear-gradient(135deg,rgba(255,215,0,0.07),rgba(196,77,255,0.05));border:1px solid rgba(255,215,0,0.28);border-radius:14px;padding:16px 18px;margin-bottom:20px">
                <div style="font-weight:700;font-size:0.9rem;color:var(--gold);margin-bottom:4px">📬 Bổ Sung Thông Tin Liên Hệ</div>
                <div style="font-size:0.75rem;color:rgba(240,230,255,0.6);margin-bottom:14px;line-height:1.6">Giúp chủ shop liên hệ bạn dễ dàng hơn — chỉ cần điền 1 trong 2 là đủ.</div>
                <div style="display:grid;gap:10px">
                    ${missingEmail?`<div>
                        <label style="font-size:0.72rem;color:rgba(240,230,255,0.45);letter-spacing:0.05em;font-weight:600;display:block;margin-bottom:5px">📧 EMAIL</label>
                        <input id="suppEmailInput" class="modal-input" type="email" placeholder="email@example.com" style="margin-bottom:0">
                    </div>`:''}
                    ${missingFb?`<div>
                        <label style="font-size:0.72rem;color:rgba(240,230,255,0.45);letter-spacing:0.05em;font-weight:600;display:block;margin-bottom:5px">📘 FACEBOOK</label>
                        <input id="suppFbInput" class="modal-input" placeholder="Link hoặc tên Facebook của bạn" style="margin-bottom:0">
                    </div>`:''}
                </div>
                <button onclick="saveContactSupp()" style="margin-top:14px;width:100%;padding:10px;border-radius:10px;border:none;background:linear-gradient(135deg,var(--pink),var(--purple));color:#fff;font-family:'Quicksand',sans-serif;font-weight:700;font-size:0.85rem;cursor:pointer">💾 Lưu Thông Tin</button>
            </div>`;
        } else {
            suppEl.innerHTML='';
        }
    }


    if(!myOrders.length){ol.innerHTML='<div class="no-data"><p>Chưa có đơn hàng nào</p></div>';return;}
    ol.innerHTML=myOrders.slice(0,5).map(o=>`
        <div class="history-card">
            <div class="hc-top"><div class="hc-id">${esc(o.id)}</div><div class="hc-time">${esc(o.time)}</div></div>
            <div class="hc-service">${esc(o.serviceName)}</div>
            <div class="hc-price">${formatPrice(o.price)}</div>
            <span class="hc-status ${esc(o.status)}">${o.status==='done'?'✅ Hoàn thành':'⏳ Đang xử lý'}</span>
            ${o.doneMessage?`<div class="hc-done-msg">${esc(o.doneMessage)}</div>`:''}
        </div>
    `).join('');
}

// ============================================================
// ===== BỔ SUNG THÔNG TIN LIÊN HỆ =====
// ============================================================
async function saveContactSupp(){
    if(!currentUser||currentUser.role!=='user') return;
    const emailEl=document.getElementById('suppEmailInput');
    const fbEl=document.getElementById('suppFbInput');
    const email=(emailEl?emailEl.value.trim():'');
    const fb=(fbEl?fbEl.value.trim():'');
        if(!email&&!fb){showNotif('Điền ít nhất email hoặc Facebook!','error');return;}
    const updateData={};
    if(email){ if(email.length>100||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){showNotif('Email không hợp lệ!','error');return;} updateData.email=email; }
    if(fb){ if(fb.length>200){showNotif('Facebook quá dài!','error');return;} updateData.facebook=fb; }
    try{
        await db.collection('users').doc(currentUser.uid).update(updateData);
        showNotif('✅ Đã lưu thông tin liên hệ!','success');
        renderProfile();
    } catch(e){showNotif('Lỗi lưu thông tin!','error');}
}

