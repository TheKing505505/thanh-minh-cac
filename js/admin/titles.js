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
                <span style="font-family:monospace;font-size:1rem;color:var(--accent);font-weight:700">${esc(code.name)}</span>
                <button onclick="deleteCode(${i})" style="background:transparent;border:none;color:var(--red);cursor:pointer;font-size:1rem">🗑️</button>
            </div>
            <div style="font-size:0.72rem;color:rgba(240,230,255,0.45);margin-top:4px">Giảm <strong style="color:var(--green)">${code.percent}%</strong> cho đơn trên 50k · ${remain} · Tạo: ${esc(code.createdAt)}</div>
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
    let list=_titlePurchasesAll.filter(p=>{
        if(_titlePurchasesFilter==='all') return true;
        if(_titlePurchasesFilter==='pending') return p.status==='pending';
        if(_titlePurchasesFilter==='done'){
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
        const sid=safeId(p.id);
        const t=tm[p.titleId]||{};
        const tSvg=DH_LOGOS[p.titleId]?DH_LOGOS[p.titleId].replace(/width="64"/,'width="40"').replace(/height="72"/,'height="40"'):'<span style="font-size:1.6rem">🏆</span>';
        const isDone=p.status==='done';
        const isRejected=p.status==='rejected';
        const doneAt=p.doneAt||0;
        const remainMs=isDone?(THREE_DAYS-(now-doneAt)):0;
        const remainDays=isDone?Math.ceil(remainMs/86400000):0;
        return `<div id="tprow-${sid}" style="background:var(--bg-card);border:1px solid ${isDone?'rgba(74,222,128,0.2)':'rgba(255,215,0,0.2)'};border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;transition:all 0.3s">
            <div style="width:40px;height:40px;flex-shrink:0">${tSvg}</div>
            <div style="flex:1;min-width:140px">
                <div style="font-weight:700;font-size:0.9rem;margin-bottom:2px">${esc(p.username)} <span style="color:rgba(240,230,255,0.4);font-weight:400">→</span> <span class="${esc(t.cls||'')}" style="padding:2px 8px;border-radius:6px;font-size:0.8rem;font-weight:700">${esc(t.name||'?')}</span></div>
                <div style="font-size:0.72rem;color:rgba(240,230,255,0.4)">${esc(p.time||'')} · ${isDone?'đã thu':'dự kiến'} ${formatPrice(p.price||0)}${isDone&&remainDays>0?` · <span style="color:rgba(74,222,128,0.6)">ẩn sau ${remainDays} ngày</span>`:''}</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                ${isDone
                    ?`<span style="padding:4px 12px;border-radius:8px;font-size:0.75rem;font-weight:700;background:rgba(74,222,128,0.15);color:var(--green)">✅ Đã cấp</span>`
                    :isRejected
                    ?`<span style="padding:4px 12px;border-radius:8px;font-size:0.75rem;font-weight:700;background:rgba(255,71,87,0.12);color:var(--red)">✖ Đã từ chối</span>`
                    :`<button onclick="grantTitleFromPurchase('${sid}')" style="padding:6px 14px;border-radius:20px;border:none;background:linear-gradient(135deg,var(--pink),var(--purple));color:#fff;font-size:0.78rem;font-weight:700;cursor:pointer;font-family:'Quicksand',sans-serif">🏆 Cấp &amp; Trừ Tiền</button>
                     <button onclick="rejectTitlePurchase('${sid}')" style="padding:6px 14px;border-radius:20px;border:1px solid rgba(255,71,87,0.4);background:transparent;color:var(--red);font-size:0.78rem;font-weight:700;cursor:pointer;font-family:'Quicksand',sans-serif">✖ Từ Chối</button>`
                }
            </div>
        </div>`;
    }).join('');
}

// Cấp danh hiệu + trừ tiền theo giá chuẩn, trong 1 transaction
async function grantTitleFromPurchase(purchaseId){
    try{
        const r=await adminGrantTitleFromPurchase(purchaseId);
        showNotif(`✅ Đã cấp ${r.name} cho ${r.username} (30 ngày) · trừ ${formatPrice(r.price)}`,'success');
        loadAdminTitlePurchases();
        getUsersFromDB();
    }catch(e){showNotif('❌ '+(e.message||'Lỗi cấp danh hiệu'),'error');}
}

async function rejectTitlePurchase(purchaseId){
    if(!confirm('Từ chối yêu cầu này? (không trừ tiền, không cấp danh hiệu)')) return;
    try{
        await db.collection('titlepurchases').doc(purchaseId).update({status:'rejected',doneAt:Date.now()});
        showNotif('Đã từ chối yêu cầu','info');
        loadAdminTitlePurchases();
    }catch(e){showNotif('❌ Lỗi: '+(e.message||''),'error');}
}
