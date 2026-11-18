function getDiscountCodes(){return JSON.parse(localStorage.getItem('tmc_codes')||'[]');}
function saveDiscountCodes(codes){localStorage.setItem('tmc_codes',JSON.stringify(codes));}

function createDiscountCode(){
    const name=document.getElementById('newCodeName').value.trim().toUpperCase();
    const pct=parseInt(document.getElementById('newCodePercent').value);
    if(!name){showNotif('Nhập tên mã!','error');return;}
    if(!pct||pct<1||pct>50){showNotif('Nhập % từ 1-50!','error');return;}
    const codes=getDiscountCodes();
    if(codes.find(x=>x.name===name)){showNotif('Mã đã tồn tại!','error');return;}
    codes.push({name,percent:pct,expiry:Date.now()+3*24*60*60*1000,createdAt:new Date().toLocaleString('vi-VN')});
    saveDiscountCodes(codes);
    document.getElementById('newCodeName').value='';
    document.getElementById('newCodePercent').value='';
    renderAdminCodes();
    showNotif(`✅ Tạo mã "${name}" giảm ${pct}%`,'success');
}

function renderAdminCodes(){
    const el=document.getElementById('adminCodeList');if(!el)return;
    const codes=getDiscountCodes();const now=Date.now();
    if(!codes.length){el.innerHTML='<div class="no-data"><p>Chưa có mã nào</p></div>';return;}
    el.innerHTML=codes.map((code,i)=>{
        const exp=now>code.expiry;
        const remain=exp?'Đã hết hạn':`Còn ${Math.ceil((code.expiry-now)/86400000)} ngày`;
        return `<div class="code-item" style="${exp?'opacity:0.4':''}">
            <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-family:monospace;font-size:1rem;color:var(--accent);font-weight:700">${code.name}</span>
                <button onclick="deleteCode(${i})" style="background:transparent;border:none;color:var(--red);cursor:pointer;font-size:1rem">🗑️</button>
            </div>
            <div style="font-size:0.72rem;color:rgba(240,230,255,0.45);margin-top:4px">Giảm <strong style="color:var(--green)">${code.percent}%</strong> cho đơn trên 50k · ${remain} · Tạo: ${code.createdAt}</div>
        </div>`;
    }).join('');
}

function deleteCode(idx){
    const codes=getDiscountCodes();codes.splice(idx,1);saveDiscountCodes(codes);
    renderAdminCodes();showNotif('Đã xóa mã','info');
}


// ===== TITLE PURCHASES ADMIN =====

async function loadAdminTitlePurchases(){
    const el=document.getElementById('adminTitlePurchaseList');if(!el)return;
    el.innerHTML='<div class="no-data"><p>⏳ Đang tải...</p></div>';
    try{
        const snap=await db.collection('titlepurchases').orderBy('timestamp','desc').get();
        _titlePurchasesAll=snap.docs.map(d=>({id:d.id,...d.data()}));
        renderTitlePurchaseList();
    }catch(e){el.innerHTML='<div class="no-data"><p>Lỗi tải</p></div>';}
}

function filterTitlePurchases(status,btn){
    _titlePurchasesFilter=status;
    document.querySelectorAll('#adminTitlepurchases .history-filter-btn').forEach(b=>b.classList.remove('active'));
    if(btn)btn.classList.add('active');
    renderTitlePurchaseList();
}

function renderTitlePurchaseList(){
    const el=document.getElementById('adminTitlePurchaseList');if(!el)return;
    const tm={};TITLES.forEach(t=>tm[t.id]=t);
    const now=Date.now();
    const THREE_DAYS=3*24*60*60*1000;
    // Lọc: đơn done + doneAt > 3 ngày thì ẩn (chỉ ẩn ở filter 'pending' và 'done', không ẩn ở 'all')
    let list=_titlePurchasesAll.filter(p=>{
        if(_titlePurchasesFilter==='all') return true;
        if(_titlePurchasesFilter==='pending') return p.status!=='done';
        if(_titlePurchasesFilter==='done'){
            // Chỉ hiện đơn done trong vòng 3 ngày
            const doneAt=p.doneAt||0;
            return p.status==='done' && (now-doneAt)<THREE_DAYS;
        }
        return true;
    });
    if(!list.length){
        el.innerHTML='<div class="no-data"><p>'+(
            _titlePurchasesFilter==='pending'?'Không có đơn nào chờ cấp 🎉':
            _titlePurchasesFilter==='done'?'Không có đơn hoàn thành gần đây':'Chưa có yêu cầu nào'
        )+'</p></div>';return;
    }
    el.innerHTML=list.map(p=>{
        const t=tm[p.titleId]||{};
        const tSvg=DH_LOGOS[p.titleId]?DH_LOGOS[p.titleId].replace(/width="64"/,'width="40"').replace(/height="72"/,'height="40"'):'<span style="font-size:1.6rem">🏆</span>';
        const isDone=p.status==='done';
        const doneAt=p.doneAt||0;
        const remainMs=isDone?(THREE_DAYS-(now-doneAt)):0;
        const remainDays=isDone?Math.ceil(remainMs/86400000):0;
        return `<div id="tprow-${escapeHTML(p.id)}" style="background:var(--bg-card);border:1px solid ${isDone?'rgba(74,222,128,0.2)':'rgba(255,215,0,0.2)'};border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;transition:all 0.3s">
            <div style="width:40px;height:40px;flex-shrink:0">${tSvg}</div>
            <div style="flex:1;min-width:140px">
                <div style="font-weight:700;font-size:0.9rem;margin-bottom:2px">${escapeHTML(p.username)} <span style="color:rgba(240,230,255,0.4);font-weight:400">→</span> <span class="${t.cls||''}" style="padding:2px 8px;border-radius:6px;font-size:0.8rem;font-weight:700">${escapeHTML(p.titleName||t.name||'?')}</span></div>
                <div style="font-size:0.72rem;color:rgba(240,230,255,0.4)">${escapeHTML(p.time||'')} · ${formatPrice(p.price||0)}${isDone&&remainDays>0?` · <span style="color:rgba(74,222,128,0.6)">ẩn sau ${remainDays} ngày</span>`:''}</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                ${isDone
                    ?`<span style="padding:4px 12px;border-radius:8px;font-size:0.75rem;font-weight:700;background:rgba(74,222,128,0.15);color:var(--green)">✅ Đã cấp</span>`
                    :`<button onclick="grantTitleFromPurchase(${safeJsArg(p.id)},${safeJsArg(p.username)},${safeJsArg(p.titleId)})" style="padding:6px 14px;border-radius:20px;border:none;background:linear-gradient(135deg,var(--pink),var(--purple));color:#fff;font-size:0.78rem;font-weight:700;cursor:pointer;font-family:'Quicksand',sans-serif">🏆 Cấp Danh Hiệu</button>
                     <button onclick="markTitlePurchaseDone(${safeJsArg(p.id)})" style="padding:6px 14px;border-radius:20px;border:1px solid rgba(74,222,128,0.4);background:transparent;color:var(--green);font-size:0.78rem;font-weight:700;cursor:pointer;font-family:'Quicksand',sans-serif">✅ Hoàn Thành</button>`
                }
            </div>
        </div>`;
    }).join('');
}

async function grantTitleFromPurchase(purchaseId, username, titleId){
    try{
        const user=await findUserInDB(username);
        if(!user){showNotif('❌ Không tìm thấy user: '+username,'error');return;}
        const t=TITLES.find(x=>x.id===titleId);
        const isPermanent=t&&(t.permanent||t.adminOnly);
        const now=Date.now();
        const updateData={
            titleOverride:titleId,
            titleGrantedAt: isPermanent ? 0 : now,
            titleExpiry: isPermanent ? 0 : (now+TITLE_DURATION_MS)
        };
        await db.collection('users').doc(user.id).update(updateData);
        await markTitlePurchaseDone(purchaseId, true);
        showNotif(`✅ Đã cấp ${t?t.name:titleId} cho ${username}${isPermanent?' (vĩnh viễn)':' (30 ngày)'}`,'success');
    }catch(e){showNotif('❌ Lỗi cấp danh hiệu: '+e.message,'error');}
}

async function markTitlePurchaseDone(purchaseId, skipNotif=false){
    try{
        const now=Date.now();
        await db.collection('titlepurchases').doc(purchaseId).update({status:'done',doneAt:now});
        // Cập nhật local cache
        const idx=_titlePurchasesAll.findIndex(p=>p.id===purchaseId);
        if(idx>-1){_titlePurchasesAll[idx].status='done';_titlePurchasesAll[idx].doneAt=now;}
        renderTitlePurchaseList();
        if(!skipNotif)showNotif('✅ Đã đánh dấu hoàn thành','success');
    }catch(e){showNotif('❌ Lỗi: '+e.message,'error');}
}
