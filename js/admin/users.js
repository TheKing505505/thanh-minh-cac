let _legacyList=[];

function renderAdminUsers(users){
    const c=document.getElementById('adminUserList');
    const refreshBtn=`<div style="display:flex;justify-content:flex-end;margin-bottom:10px">
        <button onclick="_refreshAdminUsers()" style="padding:6px 14px;border-radius:8px;border:1px solid rgba(196,77,255,0.3);background:transparent;color:var(--accent);cursor:pointer;font-family:'Quicksand',sans-serif;font-size:0.78rem;font-weight:600">🔄 Làm mới</button>
    </div>`;
    const all=users||[];
    const current=all.filter(u=>u.uid);
    _legacyList=all.filter(u=>!u.uid);

    let legacyHtml='';
    if(_legacyList.length){
        legacyHtml=`<div style="background:rgba(255,165,0,0.08);border:1px solid rgba(255,165,0,0.35);border-radius:12px;padding:12px 14px;margin-bottom:14px;font-size:0.78rem;line-height:1.6">
            <div style="color:#ffa502;font-weight:700;margin-bottom:6px">⚠️ Tài khoản cũ chưa chuyển (${_legacyList.length}) — còn chứa mật khẩu băm kiểu cũ</div>
            <div style="color:rgba(240,230,255,0.6);margin-bottom:8px">Khi khách đăng ký lại bằng tài khoản mới (cùng tên), bấm “Chuyển” để chuyển số dư + danh hiệu và <strong>xoá hồ sơ cũ</strong>.</div>
            ${_legacyList.map((u,i)=>`<div style="display:flex;gap:8px;align-items:center;justify-content:space-between;padding:6px 0;border-top:1px solid rgba(255,255,255,0.06)">
                <span>👤 ${esc(u.username||u.id)} · 💰 ${formatPrice(u.balance||0)}</span>
                <span><button class="btn-grant-title" onclick="migrateLegacyUser(${i})">➡️ Chuyển</button> <button class="btn-delete" onclick="deleteLegacyUser(${i})">🗑️</button></span>
            </div>`).join('')}
        </div>`;
    }

    if(!current.length){
        c.innerHTML=refreshBtn+legacyHtml+'<div class="no-data"><p>Chưa có người dùng nào (hoặc bạn chưa đăng nhập đúng tài khoản admin / chưa publish firestore.rules)</p></div>';
        return;
    }
    c.innerHTML=refreshBtn+legacyHtml+current.map(u=>{
        const sid=safeId(u.id);
        const title=u.titleOverride?TITLES.find(t=>t.id===u.titleOverride):null;
        const titleSvg=title&&DH_LOGOS[title.id]?DH_LOGOS[title.id].replace(/width="64"/,'width="22"').replace(/height="72"/,'height="22"'):'';
        return `<div class="user-item">
            <div class="user-item-info">
                <div class="user-item-name">👤 ${esc(u.username)}</div>
                <div class="user-item-sub">📧 ${esc(u.email||'—')}${u.facebook?` | 📘 ${esc(u.facebook)}`:''}</div>
                <div class="user-item-sub">Tham gia: ${esc(u.createdAt||'—')}</div>
                ${title?`<span class="user-item-title ${esc(title.cls)}" style="display:inline-flex;align-items:center;gap:5px">${titleSvg}<span>${esc(title.name)}</span></span>`:'<span style="font-size:0.7rem;color:rgba(240,230,255,0.3)">Chưa có danh hiệu</span>'}
                <div class="user-balance">💰 Số dư: ${formatPrice(u.balance||0)}</div>
            </div>
            <div class="user-item-actions">
                <button class="btn-grant-title" onclick="openGrantTitle('${sid}')">🏆 Cấp Danh Hiệu</button>
                <button class="btn-add-coin" onclick="openAddCoin('${sid}')">💰 Bơm Tiền</button>
                <button class="btn-delete" onclick="deleteUser('${sid}')">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

function _refreshAdminUsers(){
    const c=document.getElementById('adminUserList');
    if(c) c.innerHTML='<div class="no-data"><p>⏳ Đang tải...</p></div>';
    _usersCache=null;
    getUsersFromDB().then(users=>renderAdminUsers(users));
}

function _userById(id){return (_usersCache||[]).find(u=>u.id===id)||null;}

async function deleteUser(uid){
    const u=_userById(uid);
    if(!confirm(`Xóa hồ sơ "${u?u.username:uid}"?\n(Muốn chặn hẳn đăng nhập: xoá thêm trong Firebase Console → Authentication)`)) return;
    try{await deleteUserFromDB(uid);const users=await getUsersFromDB();renderAdminUsers(users);showNotif(`Đã xóa hồ sơ`,'info');recomputePublicStats();}
    catch(e){showNotif('Lỗi!','error');}
}

async function deleteLegacyUser(i){
    const u=_legacyList[i];if(!u) return;
    if(!confirm(`Xoá hồ sơ CŨ "${u.username||u.id}" (mất số dư ${formatPrice(u.balance||0)} nếu chưa chuyển)?`)) return;
    try{await db.collection('users').doc(u.id).delete();_refreshAdminUsers();showNotif('Đã xoá hồ sơ cũ','info');}
    catch(e){showNotif('Lỗi!','error');}
}

// Chuyển số dư/danh hiệu từ hồ sơ cũ sang tài khoản mới cùng tên, rồi xoá hồ sơ cũ (xoá luôn passwordHash yếu)
async function migrateLegacyUser(i){
    const old=_legacyList[i];if(!old) return;
    const key=normalizeUsername(old.username||old.id);
    const nu=(_usersCache||[]).find(u=>u.uid&&u.usernameLower===key);
    if(!nu){showNotif('Khách chưa đăng ký lại bằng tài khoản mới (cùng tên đăng nhập)!','error');return;}
    if(!confirm(`Chuyển ${formatPrice(old.balance||0)} + danh hiệu từ hồ sơ cũ sang tài khoản mới "${nu.username}" và xoá hồ sơ cũ?`)) return;
    try{
        await db.runTransaction(async tx=>{
            const oref=db.collection('users').doc(old.id), nref=db.collection('users').doc(nu.id);
            const [os,ns]=await Promise.all([tx.get(oref),tx.get(nref)]);
            if(!os.exists) throw new Error('Hồ sơ cũ không còn');
            if(!ns.exists) throw new Error('Tài khoản mới không tồn tại');
            const o=os.data(), n=ns.data(), amt=o.balance||0, nb=(n.balance||0)+amt;
            const upd={balance:nb};
            if(o.titleOverride && !n.titleOverride){ upd.titleOverride=o.titleOverride; upd.titleGrantedAt=o.titleGrantedAt||0; upd.titleExpiry=o.titleExpiry||0; }
            tx.update(nref,upd);
            tx.delete(oref);
            tx.set(db.collection('coinlogs').doc(),{uid:nu.id,username:n.username||'',amount:amt,note:'Chuyển số dư từ tài khoản cũ',newBalance:nb,time:new Date().toLocaleString('vi-VN'),timestamp:Date.now()});
        });
        showNotif('✅ Đã chuyển & xoá hồ sơ cũ','success');_refreshAdminUsers();
    }catch(e){showNotif('❌ '+(e.message||'Lỗi'),'error');}
}

function openGrantTitle(uid){
    const u=_userById(uid);if(!u) return;
    grantTitleSelected=null;
    document.getElementById('grantTitleTarget').value=uid;
    document.getElementById('grantTitleUsername').textContent='Cấp danh hiệu cho: '+u.username;
    const grid=document.getElementById('titleSelectGrid');
    grid.innerHTML=TITLES.map(t=>{
        const svg=DH_LOGOS[t.id]?DH_LOGOS[t.id].replace(/width="64"/,'width="32"').replace(/height="72"/,'height="32"'):'';
        return`<div class="title-option" onclick="selectTitle('${safeId(t.id)}',this)">
            <div style="display:flex;align-items:center;gap:8px">
                ${svg}
                <div>
                    <div class="t-name ${esc(t.cls)}" style="padding:2px 8px;border-radius:8px;display:inline-block">${esc(t.name)}</div>
                    <div class="t-min" style="font-size:0.68rem;color:rgba(240,230,255,0.4);margin-top:2px">${t.adminOnly?'Chỉ chủ shop cấp':formatPrice(t.price)}</div>
                </div>
            </div>
        </div>`;
    }).join('');
    openModal('grantTitleModal');
}
function selectTitle(id,el){
    grantTitleSelected=id;
    document.querySelectorAll('.title-option').forEach(e=>e.classList.remove('selected'));
    el.classList.add('selected');
}
// Admin tặng danh hiệu (không trừ tiền)
async function confirmGrantTitle(){
    if(!grantTitleSelected){showNotif('Chọn danh hiệu!','error');return;}
    const uid=document.getElementById('grantTitleTarget').value;
    const u=_userById(uid);
    try{
        const t=TITLES.find(x=>x.id===grantTitleSelected);
        const isPermanent=t&&(t.permanent||t.adminOnly);
        const now=Date.now();
        await updateUserInDB(uid,{
            titleOverride:grantTitleSelected,
            titleGrantedAt: isPermanent?0:now,
            titleExpiry: isPermanent?0:(now+TITLE_DURATION_MS)
        });
        closeModal('grantTitleModal');
        showNotif(`🏆 Đã cấp "${t.name}" cho ${u?u.username:''}${isPermanent?' (vĩnh viễn)':' (30 ngày)'}`,'success');
        const users=await getUsersFromDB();renderAdminUsers(users);
    } catch(e){showNotif('Lỗi!','error');}
}

// ADD COIN
async function openAddCoin(uid){
    const u=_userById(uid);if(!u) return;
    addCoinUsername = uid;     // lưu UID (không lưu tên)
    addCoinCurrent = u.balance||0;
    document.getElementById('addCoinTarget').textContent = u.username;
    document.getElementById('addCoinCurrentBalance').textContent = formatPrice(addCoinCurrent);
    document.getElementById('addCoinAmount').value = '';
    document.getElementById('addCoinNote').value = '';
    openModal('addCoinModal');
}

function setQuickCoin(amount){
    const cur = parseInt(document.getElementById('addCoinAmount').value)||0;
    document.getElementById('addCoinAmount').value = cur + amount;
}

async function confirmAddCoin(){
    const amount = parseInt(document.getElementById('addCoinAmount').value);
    const note = document.getElementById('addCoinNote').value.trim().slice(0,150);
    if(!amount||amount<=0||amount>50000000){showNotif('Nhập số tiền hợp lệ (tối đa 50,000,000)!','error');return;}
    if(!addCoinUsername){return;}
    try{
        await adminAdjustBalance(addCoinUsername, amount, note||'Admin bơm tiền');   // transaction + coinlog
        closeModal('addCoinModal');
        showNotif(`💰 Đã bơm ${formatPrice(amount)}!`,'success');
        loadAdminData();
    } catch(e){ showNotif('Lỗi bơm tiền: '+(e.message||''),'error'); }
}
