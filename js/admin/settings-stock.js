// ============================================================
// ===== VIDEO SETTING =====
// ============================================================
function getYoutubeEmbedUrl(url){
    if(!url) return null;
    const m=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
    return m?`https://www.youtube.com/embed/${m[1]}?autoplay=0`:null;
}

function applyVideoSetting(){
    const settings=getShopSettings();
    const banner=document.getElementById('videoBanner');
    const frame=document.getElementById('videoFrame');
    if(settings.videoUrl){
        const embed=getYoutubeEmbedUrl(settings.videoUrl);
        if(embed){frame.src=embed;banner.style.display='block';return;}
    }
    banner.style.display='none';
    frame.src='';
}

function saveVideoSetting(){
    const url=document.getElementById('settingsVideoUrl').value.trim();
    const settings=getShopSettings();
    settings.videoUrl=url;
    saveShopSettings(settings);
    applyVideoSetting();
    showNotif(url?'✅ Đã lưu video!':'✅ Đã tắt video','success');
}

function saveAnnounceSetting(){
    const txt=document.getElementById('settingsAnnounce').value.trim();
    const settings=getShopSettings();
    settings.announce=txt;
    saveShopSettings(settings);
    showNotif('✅ Đã lưu thông báo','success');
}


// ===== ADMIN FRUIT STOCK =====

async function loadFruitStockAdmin(){
    const grid = document.getElementById('fruitStockAdminGrid');
    if(!grid) return;
    grid.innerHTML='<div class="no-data"><p>⏳ Đang tải...</p></div>';
    try {
        // Load từ Firestore
        const snap = await db.collection('fruitstock').get();
        _fruitStockAdminData = {};
        snap.forEach(doc=>{ _fruitStockAdminData[doc.id]=doc.data(); });
        // Merge với cache realtime
        Object.assign(_fruitStockAdminData, _fruitStockCache);
        renderFruitStockAdmin();
    } catch(e){
        // Fallback: dùng cache
        _fruitStockAdminData = Object.assign({}, _fruitStockCache);
        renderFruitStockAdmin();
    }
}

function filterFruitStockAdmin(q){
    _fruitStockAdminFilter = q.toLowerCase();
    renderFruitStockAdmin();
}

function renderFruitStockAdmin(){
    const grid = document.getElementById('fruitStockAdminGrid');
    if(!grid) return;
    const fruits = getFruitServices();
    const filtered = _fruitStockAdminFilter
        ? fruits.filter(s=>s.name.toLowerCase().includes(_fruitStockAdminFilter))
        : fruits;
    if(!filtered.length){
        grid.innerHTML='<div class="no-data"><p>Không tìm thấy trái nào</p></div>';
        return;
    }
    grid.innerHTML = filtered.map(svc=>{
        const d = _fruitStockAdminData[String(svc.id)] || {};
        const qty = d.qty || 0;
        const inStock = qty > 0;
        return `<div class="fruit-stock-item" id="fstock-admin-${Number(svc.id)}">
            <div style="display:flex;align-items:center;gap:6px">
                <div class="stock-status-dot ${inStock?'in':'out'}"></div>
                <div class="fruit-stock-name">${esc(svc.name)}</div>
            </div>
            <div style="font-size:0.7rem;color:${inStock?'var(--green)':'var(--red)'};font-weight:600">
                ${inStock?'✅ Còn '+qty+' trái':'❌ Hết hàng'}
            </div>
            <div class="fruit-stock-controls">
                <input type="number" min="0" max="9999" class="fruit-stock-input" 
                    id="fstock-input-${Number(svc.id)}" value="${Number(qty)||0}" placeholder="Số lượng (0=hết)"
                    oninput="previewFruitStock(${Number(svc.id)},this.value)">
                <button class="btn-stock-save" onclick="saveFruitStock(${Number(svc.id)})" id="fstock-btn-${Number(svc.id)}">
                    💾 Lưu
                </button>
            </div>
            <div style="font-size:0.65rem;color:rgba(240,230,255,0.3)">
                ${d.updatedAt?'Cập nhật: '+new Date(d.updatedAt).toLocaleString('vi-VN'):'Chưa có dữ liệu'}
            </div>
        </div>`;
    }).join('');
}

function previewFruitStock(svcId, val){
    const qty = parseInt(val)||0;
    const dot = document.querySelector(`#fstock-admin-${svcId} .stock-status-dot`);
    const label = document.querySelector(`#fstock-admin-${svcId} div[style*="green"], #fstock-admin-${svcId} div[style*="red"]`);
    if(dot){ dot.className='stock-status-dot '+(qty>0?'in':'out'); }
}

async function saveFruitStock(svcId){
    const input = document.getElementById('fstock-input-'+svcId);
    const btn = document.getElementById('fstock-btn-'+svcId);
    if(!input) return;
    if(!db){ showNotif('❌ Firebase chưa kết nối, thử reload trang!','error'); return; }
    const qty = Math.min(9999, Math.max(0, parseInt(input.value)||0));
    const key = String(svcId);
    btn.disabled=true; btn.textContent='⏳';
    try {
        const data = { qty, updatedAt: Date.now() };
        await db.collection('fruitstock').doc(key).set(data, {merge:true});
        _fruitStockAdminData[key] = data;
        _fruitStockCache[key] = data;
        btn.textContent='✅';
        setTimeout(()=>{btn.textContent='💾 Lưu';btn.disabled=false;},1500);
        applyFruitStockToUI();
        showNotif(qty>0?`✅ Đã cập nhật: còn ${qty} trái`:'✅ Đã đặt hết hàng','success');
        const dot = document.querySelector(`#fstock-admin-${svcId} .stock-status-dot`);
        const statusLabel = document.querySelector(`#fstock-admin-${svcId} div:nth-child(2)`);
        if(dot) dot.className='stock-status-dot '+(qty>0?'in':'out');
        if(statusLabel) statusLabel.innerHTML = qty>0?'✅ Còn '+qty+' trái':'❌ Hết hàng';
        if(statusLabel) statusLabel.style.color = qty>0?'var(--green)':'var(--red)';
    } catch(e){
        btn.textContent='💾 Lưu'; btn.disabled=false;
        showNotif('❌ Lỗi lưu, thử lại','error');
    }
}

async function saveAllFruitStock(){
    if(!db){ showNotif('❌ Firebase chưa kết nối, thử reload trang!','error'); return; }
    const fruits = getFruitServices();
    let count=0, errors=0, permDenied=false;
    for(const svc of fruits){
        const input = document.getElementById('fstock-input-'+svc.id);
        if(!input) continue;
        const qty = Math.max(0, parseInt(input.value)||0);
        try {
            const data = { qty, updatedAt: Date.now() };
            await db.collection('fruitstock').doc(String(svc.id)).set(data,{merge:true});
            _fruitStockAdminData[String(svc.id)] = data;
            _fruitStockCache[String(svc.id)] = data;
            count++;
        } catch(e){
            errors++;
            if(e.code==='permission-denied'||e.message?.includes('permissions')) permDenied=true;
        }
    }
    applyFruitStockToUI();
    showNotif(errors===0?`✅ Đã lưu ${count} loại trái!`:`Lưu ${count} OK, ${errors} lỗi — thử reload trang`,'success');
    renderFruitStockAdmin();
}

async function setAllOutOfStock(){
    if(!confirm('Đặt hết hàng tất cả trái ác quỷ?')) return;
    const fruits = getFruitServices();
    const batch = db.batch ? db.batch() : null;
    try {
        const now = Date.now();
        for(const svc of fruits){
            const ref = db.collection('fruitstock').doc(String(svc.id));
            if(batch) batch.set(ref,{qty:0,updatedAt:now},{merge:true});
            else await ref.set({qty:0,updatedAt:now},{merge:true});
            _fruitStockAdminData[String(svc.id)]={qty:0,updatedAt:now};
            _fruitStockCache[String(svc.id)]={qty:0,updatedAt:now};
        }
        if(batch) await batch.commit();
        applyFruitStockToUI();
        renderFruitStockAdmin();
        showNotif('✅ Đã đặt hết hàng tất cả!','success');
    } catch(e){ showNotif('Lỗi: '+e.message,'error'); }
}
