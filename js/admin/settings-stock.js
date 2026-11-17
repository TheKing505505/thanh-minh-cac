/* Cài đặt video/thông báo, mã giảm giá và giao diện quản trị tồn kho. */
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

// ===== ANALYTICS =====

// ===== ADMIN FRUIT STOCK =====
let _fruitStockAdminData = {}; // local edit buffer
let _fruitStockAdminFilter = '';

async function loadFruitStockAdmin(){
    const grid = document.getElementById('fruitStockAdminGrid');
    if(!grid) return;
    grid.innerHTML='<div class="no-data"><p>⏳ Đang tải...</p></div>';
    try {
        // Load từ Firestore
        _fruitStockAdminData = await getFruitStockFromDB();
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
        return `<div class="fruit-stock-item" id="fstock-admin-${svc.id}">
            <div style="display:flex;align-items:center;gap:6px">
                <div class="stock-status-dot ${inStock?'in':'out'}"></div>
                <div class="fruit-stock-name">${svc.name}</div>
            </div>
            <div style="font-size:0.7rem;color:${inStock?'var(--green)':'var(--red)'};font-weight:600">
                ${inStock?'✅ Còn '+qty+' trái':'❌ Hết hàng'}
            </div>
            <div class="fruit-stock-controls">
                <input type="number" min="0" max="9999" class="fruit-stock-input" 
                    id="fstock-input-${svc.id}" value="${qty}" placeholder="Số lượng (0=hết)"
                    oninput="previewFruitStock(${svc.id},this.value)">
                <button class="btn-stock-save" onclick="saveFruitStock(${svc.id})" id="fstock-btn-${svc.id}">
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
    const qty = Math.max(0, parseInt(input.value)||0);
    const key = String(svcId);
    btn.disabled=true; btn.textContent='⏳';
    try {
        const data = { qty, updatedAt: Date.now() };
        await saveFruitStockToDB(key, data);
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
        showNotif('❌ Lỗi lưu: '+(e.message||'thử lại'),'error');
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
            await saveFruitStockToDB(String(svc.id), data);
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
    try {
        const now = Date.now();
        const entries = fruits.map(svc => [String(svc.id), { qty: 0, updatedAt: now }]);
        await saveFruitStocksToDB(entries);
        entries.forEach(([key, data]) => {
            _fruitStockAdminData[key] = data;
            _fruitStockCache[key] = data;
        });
        applyFruitStockToUI();
        renderFruitStockAdmin();
        showNotif('✅ Đã đặt hết hàng tất cả!','success');
    } catch(e){ showNotif('Lỗi: '+e.message,'error'); }
}
