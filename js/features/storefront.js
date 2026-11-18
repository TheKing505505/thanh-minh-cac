// ============================================================
// ===== SOCIAL PROOF + TOP CUSTOMERS =====
// ============================================================
async function loadSocialProof(){
    try{
        const st=await getPublicStats();
        document.getElementById('spOrders').textContent=st.doneOrders||0;
        document.getElementById('spUsers').textContent=st.users||0;
        document.getElementById('spServices').textContent=getServices().length;
    } catch(e){}
}

async function loadTopCustomers(){
    const grid=document.getElementById('topGrid');
    if(!grid) return;
    try{
        const st=await getPublicStats();
        const sorted=(st.topCustomers||[]).slice(0,5);
        if(!sorted.length){grid.innerHTML='<div class="top-loading">Chưa có đơn hoàn thành</div>';return;}
        const medals=['🥇','🥈','🥉','4️⃣','5️⃣'];
        grid.innerHTML=sorted.map((r,i)=>`
            <div class="top-card">
                <div class="top-rank">${medals[i]||'🎖️'}</div>
                <div class="top-name">${esc(r.name)}</div>
                <div class="top-count">${esc(r.count)} đơn</div>
            </div>
        `).join('');
    } catch(e){grid.innerHTML='<div class="top-loading">Không thể tải</div>';}
}


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
        html+=`<div class="cat-card${isVipCat?' cat-card-vip':''}" id="catcard-${safeId(catKey)}">
            <div class="cat-card-front" onclick="openCatPanel('${safeId(catKey)}')">
                <div class="cat-card-img-wrap" style="position:relative">
                    <img src="${esc(safeImgUrl(catImg)||FALLBACK_IMG)}" alt="${esc(catName)}" onerror="this.onerror=null;this.src=FALLBACK_IMG">
                    <div class="cat-card-overlay"></div>
                    ${hasVip?'<div style="position:absolute;top:8px;right:8px;padding:3px 8px;border-radius:8px;background:rgba(255,215,0,0.2);border:1px solid rgba(255,215,0,0.4);font-size:0.65rem;font-weight:700;color:var(--gold)">⭐ VIP</div>':''}
                    ${fruitCardBadge}
                </div>
                <div class="cat-card-info">
                    <div class="cat-card-title">${esc(catName)}</div>
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
        const fruitStockHeaderHtml = isFruitCat ? `<div id="fruitStockHeader-${safeId(catKey)}" style="margin-bottom:12px"></div>` : '';
        html+=`<div class="cat-panel" id="catpanel-${safeId(catKey)}" style="display:none">
            <div class="cat-panel-header">
                <button class="cat-panel-back" onclick="closeCatPanel('${safeId(catKey)}')">← Quay lại</button>
                <span class="cat-panel-title">${esc(catName)}</span>
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
                        ? `<span class="fruit-stock-badge" id="fstock-badge-${Number(svc.id)}">⏳</span>`
                        : '';
                    return `<div class="${rowClass}" style="position:relative;overflow:hidden" id="svc-row-${Number(svc.id)}">
                        <div class="svc-row-info">
                            <div class="svc-row-name">${esc(svc.name)}${bt?` <span class="svc-row-badge ${bc}">${bt}</span>`:''}${stockHtml}</div>
                            <div class="svc-row-desc">${esc(svc.desc)}</div>
                        </div>
                        <div class="svc-row-price">${formatPrice(svc.price)}</div>
                        <button class="${btnClass}" id="svc-btn-${Number(svc.id)}" ${!isLoggedIn?'disabled':''} onclick="openOrderModal(${Number(svc.id)})">
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

