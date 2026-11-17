/* UI trang chủ, thông báo, panel, social proof, dịch vụ và trạng thái tồn kho hiển thị. */
let _notifTimer=null;
function showNotif(msg,type='success'){
    const n=document.getElementById('notification');
    if(!n) return;
    if(_notifTimer){clearTimeout(_notifTimer);_notifTimer=null;}
    const icons={success:'✅',error:'❌',info:'ℹ️'};
    n.className=`notification ${type}`;
    n.innerHTML=`${icons[type]||''} ${msg}`;
    n.classList.add('show');
    _notifTimer=setTimeout(()=>{n.classList.remove('show');_notifTimer=null;},3500);
}

// ============================================================
// ===== MODALS =====
// ============================================================
function openModal(id){document.getElementById(id).classList.add('show');}
function closeModal(id){document.getElementById(id).classList.remove('show');}
document.querySelectorAll('.modal-overlay').forEach(o=>{
    o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('show');});
});
function togglePw(id,el){const i=document.getElementById(id);i.type=i.type==='password'?'text':'password';el.textContent=i.type==='password'?'👁️':'🙈';}

// ============================================================
// ===== PANELS =====
// ============================================================
function hideAllPanels(){
    document.getElementById('mainContent').style.display='none';
    ['adminPanel','historyPanel','profilePanel','cardPanel'].forEach(id=>document.getElementById(id).classList.remove('show'));
}
function showHome(){hideAllPanels();document.getElementById('mainContent').style.display='block';window.scrollTo({top:0,behavior:'smooth'});}
function showHistory(){
    if(!currentUser||currentUser.role==='admin'){showNotif('Đăng nhập để xem lịch sử','error');return;}
    hideAllPanels();document.getElementById('historyPanel').classList.add('show');
    loadAndRenderHistory();window.scrollTo({top:0,behavior:'smooth'});
}
function showProfile(){
    if(!currentUser||currentUser.role==='admin') return;
    hideAllPanels();document.getElementById('profilePanel').classList.add('show');
    renderProfile();window.scrollTo({top:0,behavior:'smooth'});
}
function showAdmin(){
    if(!currentUser||currentUser.role!=='admin') return;
    // Reset flag để đảm bảo admin luôn đọc từ Firestore
    _useLocalStorage = false;
    _usersCache = null;
    hideAllPanels();document.getElementById('adminPanel').classList.add('show');
    loadAdminData();window.scrollTo({top:0,behavior:'smooth'});
}
function showCardPanel(){
    if(!currentUser||currentUser.role!=='user'){showNotif('Đăng nhập để nạp thẻ','error');return;}
    hideAllPanels();document.getElementById('cardPanel').classList.add('show');
    loadCardHistory();window.scrollTo({top:0,behavior:'smooth'});
}

async function loadSocialProof(){
    try{
        const [orders,users]=await Promise.all([getOrdersFromDB(),getUsersFromDB()]);
        document.getElementById('spOrders').textContent=orders.filter(o=>o.status==='done').length;
        document.getElementById('spUsers').textContent=users.length;
        document.getElementById('spServices').textContent=getServices().length;
    } catch(e){}
}

async function loadTopCustomers(){
    const grid=document.getElementById('topGrid');
    if(!grid) return;
    try{
        const orders=await getOrdersFromDB();
        const done=orders.filter(o=>o.status==='done');
        const counts={};
        done.forEach(o=>{counts[o.username]=(counts[o.username]||0)+1;});
        const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);
        if(!sorted.length){grid.innerHTML='<div class="top-loading">Chưa có đơn hoàn thành</div>';return;}
        const medals=['🥇','🥈','🥉','4️⃣','5️⃣'];
        grid.innerHTML=sorted.map(([name,count],i)=>`
            <div class="top-card">
                <div class="top-rank">${medals[i]||'🎖️'}</div>
                <div class="top-name">${name}</div>
                <div class="top-count">${count} đơn</div>
            </div>
        `).join('');
    } catch(e){grid.innerHTML='<div class="top-loading">Không thể tải</div>';}
}

// ============================================================

// ============================================================
// ===== SERVICES RENDER =====
// ============================================================
function renderCategoryTabs(){}
function renderVipSection(){}

function renderServices(){
    const grid=document.getElementById('servicesGrid');
    const services=getServices();
    const isLoggedIn=currentUser&&currentUser.role==='user';
    let html='<div class="services-cat-grid">';
    const customCats=getCustomCategories();
    customCats.forEach(({key:catKey,name:catName,image:catImgCustom})=>{
        const catSvcs=services.filter(s=>s.category===catKey).sort((a,b)=>(a.order||a.id)-(b.order||b.id));
        if(!catSvcs.length) return;
        const hasVip=catSvcs.some(s=>s.badge==='vip'||s.badge==='svip');
        const catImg=catImgCustom||getServiceImage({image:'',category:catKey});
        const isVipCat=catKey==='vip';
        const isFruitMainCard = catKey==='fruit';
        // Với trái ác quỷ: thêm placeholder badge tồn kho (JS sẽ update sau)
        const fruitCardBadge = isFruitMainCard
            ? `<div id="catcard-fruit-stock-badge" style="position:absolute;bottom:8px;left:8px;padding:3px 8px;border-radius:8px;background:rgba(26,10,46,0.85);border:1px solid rgba(196,77,255,0.4);font-size:0.65rem;font-weight:700;color:var(--accent);backdrop-filter:blur(4px)">🍎 ...</div>`
            : '';
        html+=`<div class="cat-card${isVipCat?' cat-card-vip':''}" id="catcard-${catKey}">
            <div class="cat-card-front" onclick="openCatPanel('${catKey}')">
                <div class="cat-card-img-wrap" style="position:relative">
                    <img src="${catImg}" alt="${catName}" onerror="this.src='${FALLBACK_IMG}'">
                    <div class="cat-card-overlay"></div>
                    ${hasVip?'<div style="position:absolute;top:8px;right:8px;padding:3px 8px;border-radius:8px;background:rgba(255,215,0,0.2);border:1px solid rgba(255,215,0,0.4);font-size:0.65rem;font-weight:700;color:var(--gold)">⭐ VIP</div>':''}
                    ${fruitCardBadge}
                </div>
                <div class="cat-card-info">
                    <div class="cat-card-title">${catName}</div>
                    <div class="cat-card-count">${catSvcs.length} gói dịch vụ</div>
                    <div class="cat-card-btn">Xem & Đặt →</div>
                </div>
            </div>
        </div>`;
    });
    html+='</div>';
    // Panels
    customCats.forEach(({key:catKey,name:catName})=>{
        const catSvcs=services.filter(s=>s.category===catKey).sort((a,b)=>(a.order||a.id)-(b.order||b.id));
        if(!catSvcs.length) return;
        const isFruitCat = catKey === 'fruit';
        // Tạo header tồn kho nếu là danh mục trái ác quỷ
        const fruitStockHeaderHtml = isFruitCat ? `<div id="fruitStockHeader-${catKey}" style="margin-bottom:12px"></div>` : '';
        html+=`<div class="cat-panel" id="catpanel-${catKey}" style="display:none">
            <div class="cat-panel-header">
                <button class="cat-panel-back" onclick="closeCatPanel('${catKey}')">← Quay lại</button>
                <span class="cat-panel-title">${catName}</span>
            </div>
            ${fruitStockHeaderHtml}
            <div class="svc-list">
                ${catSvcs.map(svc=>{
                    const isVip=svc.badge==='vip';
                    const isSvip=svc.badge==='svip';
                    const rowClass=isSvip?'svc-row svc-row-svip':isVip?'svc-row svc-row-vip':'svc-row';
                    const btnClass=isSvip?'btn-order-row btn-order-row-svip':isVip?'btn-order-row btn-order-row-vip':'btn-order-row';
                    const bc=isSvip?'badge-svip':isVip?'badge-vip':'';
                    const bt=isSvip?'SSVIP':isVip?'VIP':'';
                    // Tạo stock badge placeholder nếu là trái ác quỷ (sẽ được fill bởi JS realtime)
                    const stockHtml = isFruitCat
                        ? `<span class="fruit-stock-badge" id="fstock-badge-${svc.id}">⏳</span>`
                        : '';
                    return `<div class="${rowClass}" style="position:relative;overflow:hidden" id="svc-row-${svc.id}">
                        <div class="svc-row-info">
                            <div class="svc-row-name">${svc.name}${bt?` <span class="svc-row-badge ${bc}">${bt}</span>`:''}${stockHtml}</div>
                            <div class="svc-row-desc">${svc.desc}</div>
                        </div>
                        <div class="svc-row-price">${formatPrice(svc.price)}</div>
                        <button class="${btnClass}" id="svc-btn-${svc.id}" ${!isLoggedIn?'disabled':''} onclick="openOrderModal(${svc.id})">
                            ${!isLoggedIn?'🔒':'🛒 Đặt'}
                        </button>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    });
    grid.innerHTML=html||'<div class="no-data"><p>Không có dịch vụ</p></div>';
}

function openCatPanel(catKey){
    const g=document.querySelector('.services-cat-grid');
    if(g) g.style.display='none';
    const panel=document.getElementById('catpanel-'+catKey);
    if(panel){
        panel.style.display='block';
        panel.scrollIntoView({behavior:'smooth',block:'start'});
        // Áp dụng stock ngay khi mở panel trái ác quỷ
        if(catKey==='fruit') applyFruitStockToUI();
    }
}
function closeCatPanel(catKey){
    const p=document.getElementById('catpanel-'+catKey);
    if(p) p.style.display='none';
    const g=document.querySelector('.services-cat-grid');
    if(g) g.style.display='grid';
}

// ============================================================
// ===== ORDER — CHỐNG SPAM =====
// ============================================================

// ===== CELEBRATION (Peak-End Rule) =====
// ============================================================
function triggerCelebration(){
    const overlay=document.createElement('div');
    overlay.className='celebration-overlay';
    document.body.appendChild(overlay);
    const colors=['#ff6b9d','#c44dff','#ffd700','#4ade80','#ff9de2'];
    for(let i=0;i<40;i++){
        const c=document.createElement('div');
        c.className='confetti';
        c.style.left=Math.random()*100+'vw';
        c.style.top='0';
        c.style.background=colors[Math.floor(Math.random()*colors.length)];
        c.style.animationDuration=(Math.random()*2+1.5)+'s';
        c.style.animationDelay=Math.random()*0.5+'s';
        c.style.width=(Math.random()*8+4)+'px';
        c.style.height=(Math.random()*8+4)+'px';
        overlay.appendChild(c);
    }
    setTimeout(()=>overlay.remove(),3000);
}

// ============================================================
// ===== SAKURA (OPTIMIZED — static pool, no DOM thrash) =====
// ============================================================
(function initSakuraPool(){
    const c=document.getElementById('sakuraContainer');
    if(!c) return;
    // Xóa bất kỳ cánh nào đã thêm từ code mới bên dưới (tránh duplicate)
    c.innerHTML='';
    const isMobile=window.innerWidth<600;
    const count=isMobile?6:12; // giữ 12 cánh tĩnh, loop vô hạn, không tạo/xóa DOM
    const emojis=['🌸','🌸','🌸','💮','🌸','🌸'];
    for(let i=0;i<count;i++){
        const s=document.createElement('div');
        s.className='sakura';
        s.textContent=emojis[i%emojis.length];
        const dur=9+Math.random()*10;
        const delay=-(Math.random()*dur); // bắt đầu ở vị trí ngẫu nhiên ngay lập tức
        s.style.cssText=`left:${Math.random()*100}%;font-size:${10+Math.random()*12}px;animation-duration:${dur}s;animation-delay:${delay}s;opacity:${0.35+Math.random()*0.55};`;
        c.appendChild(s);
    }
}());

window.addEventListener('scroll',()=>document.getElementById('header').classList.toggle('scrolled',window.scrollY>50));
document.addEventListener('keydown',e=>{
    if(e.key==='Enter'){
        if(document.getElementById('loginModal').classList.contains('show')) handleLogin();
        if(document.getElementById('registerModal').classList.contains('show')) handleRegister();
        if(document.getElementById('orderModal').classList.contains('show')) submitOrder();
    }
});
setTimeout(()=>{const t=document.getElementById('messengerTooltip');t.style.display='block';setTimeout(()=>t.style.display='none',4000);},2000);

function applyFruitStockToUI(){
    const fruits = getFruitServices();
    fruits.forEach(svc=>{
        const { qty, inStock } = getFruitStock(svc.id);
        // Badge bên cạnh tên
        const badge = document.getElementById('fstock-badge-'+svc.id);
        if(badge){
            if(inStock){
                badge.className='fruit-stock-badge in-stock';
                badge.innerHTML='✅ Còn '+qty;
            } else {
                badge.className='fruit-stock-badge out-of-stock';
                badge.innerHTML='❌ Hết';
            }
        }
        // Nút đặt: disable nếu hết hàng (áp cho mọi user kể cả guest)
        const btn = document.getElementById('svc-btn-'+svc.id);
        if(btn){
            if(!inStock){
                btn.disabled=true;
                btn.textContent='Hết Hàng';
                btn.style.background='rgba(255,255,255,0.08)';
                btn.style.color='rgba(240,230,255,0.3)';
                btn.style.cursor='not-allowed';
            } else if(currentUser && currentUser.role==='user'){
                btn.disabled=false;
                btn.textContent='🛒 Đặt';
                btn.style.background='';
                btn.style.color='';
                btn.style.cursor='';
            }
        }
    });

    // Cập nhật badge tổng quan trên card danh mục trái ác quỷ (trang chủ)
    const catBadge = document.getElementById('catcard-fruit-stock-badge');
    if(catBadge){
        const total = fruits.length;
        const inStockCount = fruits.filter(s=>getFruitStock(s.id).inStock).length;
        if(total>0){
            if(inStockCount===0){
                catBadge.innerHTML='❌ Hết hàng';
                catBadge.style.borderColor='rgba(255,71,87,0.5)';
                catBadge.style.color='var(--red)';
            } else if(inStockCount<total){
                catBadge.innerHTML=`🍎 Còn ${inStockCount}/${total} loại`;
                catBadge.style.borderColor='rgba(255,165,0,0.5)';
                catBadge.style.color='#ffa502';
            } else {
                catBadge.innerHTML=`✅ Đủ hàng ${total} loại`;
                catBadge.style.borderColor='rgba(74,222,128,0.4)';
                catBadge.style.color='var(--green)';
            }
        }
    }

    // Cập nhật header panel trái ác quỷ nếu đang mở
    updateFruitPanelHeader();
}

function updateFruitPanelHeader(){
    const headerEl = document.getElementById('fruitStockHeader-fruit');
    if(!headerEl) return;
    const fruits = getFruitServices();
    const total = fruits.length;
    const inStockCount = fruits.filter(s=>getFruitStock(s.id).inStock).length;
    if(total===0){ headerEl.innerHTML=''; return; }
    const pct = Math.round(inStockCount/total*100);
    const color = inStockCount===0?'var(--red)':inStockCount<total/2?'#ffa502':'var(--green)';
    headerEl.innerHTML=`<div class="fruit-stock-banner">
        <div class="fruit-stock-banner-dot" style="background:${color}"></div>
        <div style="flex:1">
            <div style="font-weight:700;font-size:0.85rem;color:${color}">🍎 Tồn kho: ${inStockCount}/${total} loại còn hàng</div>
            <div style="font-size:0.7rem;color:rgba(240,230,255,0.45);margin-top:2px">Dữ liệu cập nhật realtime từ chủ shop</div>
        </div>
        <div style="font-family:'Orbitron',sans-serif;font-size:1.1rem;font-weight:700;color:${color}">${pct}%</div>
    </div>`;
}
