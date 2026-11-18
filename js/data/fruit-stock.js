// ===== FRUIT STOCK SYSTEM =====
// ============================================================
// Cache local để render nhanh, Firestore realtime listener cập nhật tức thì

// Danh sách trái từ services (category='fruit')
function getFruitServices(){
    return getServices().filter(s=>s.category==='fruit').sort((a,b)=>(a.order||a.id)-(b.order||b.id));
}

// Lấy trạng thái tồn kho cho 1 trái
function getFruitStock(svcId){
    const d = _fruitStockCache[String(svcId)];
    if(!d) return { qty: 0, inStock: false };
    return { qty: d.qty||0, inStock: (d.qty||0) > 0 };
}

// Start realtime listener cho fruit stock
function startFruitStockListener(){
    if(_fruitStockListener) return;
    if(!db) return; // db chưa sẵn sàng, INIT sẽ gọi lại sau
    try {
        _fruitStockListener = db.collection('fruitstock').onSnapshot(snap=>{
            snap.forEach(doc=>{ _fruitStockCache[doc.id] = doc.data(); });
            snap.docChanges().forEach(change=>{
                if(change.type==='removed') delete _fruitStockCache[change.doc.id];
            });
            applyFruitStockToUI();
        }, err=>{ console.warn('FruitStock listener error:',err.code||err.message); });
    } catch(e){ console.warn('Cannot start fruitstock listener:',e.message); }
}

function stopFruitStockListener(){
    if(_fruitStockListener){ _fruitStockListener(); _fruitStockListener=null; }
}

// Áp dụng stock lên UI (badges, nút đặt, header panel)
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

