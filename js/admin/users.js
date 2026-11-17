/* Danh sách khách, cấp danh hiệu thủ công và điều chỉnh số dư. */
function renderAdminUsers(users){
    const c=document.getElementById('adminUserList');
    const refreshBtn=`<div style="display:flex;justify-content:flex-end;margin-bottom:10px">
        <button onclick="_refreshAdminUsers()" style="padding:6px 14px;border-radius:8px;border:1px solid rgba(196,77,255,0.3);background:transparent;color:var(--accent);cursor:pointer;font-family:'Quicksand',sans-serif;font-size:0.78rem;font-weight:600">🔄 Làm mới</button>
    </div>`;
    if(!users||!users.length){
        const permWarn=_useLocalStorage
            ?`<div style="background:rgba(255,71,87,0.08);border:1px solid rgba(255,71,87,0.3);border-radius:12px;padding:14px 16px;margin-bottom:14px;font-size:0.82rem;line-height:1.7">
                <div style="color:var(--red);font-weight:700;margin-bottom:6px">⚠️ Không đọc được dữ liệu Firestore</div>
                <div style="color:rgba(240,230,255,0.65)">Không mở quyền đọc/ghi công khai để khắc phục lỗi này. Hãy cấu hình Firebase Authentication và Firestore Security Rules theo từng vai trò trước khi triển khai.</div>
              </div>` : '';
        c.innerHTML=refreshBtn+permWarn+'<div class="no-data"><p>Chưa có người dùng nào</p></div>';
        return;
    }
    c.innerHTML=refreshBtn+users.map(u=>{
        const title=u.titleOverride?TITLES.find(t=>t.id===u.titleOverride):null;
        const titleSvg=title&&DH_LOGOS[title.id]?DH_LOGOS[title.id].replace(/width="64"/,'width="22"').replace(/height="72"/,'height="22"'):'';
        return `<div class="user-item">
            <div class="user-item-info">
                <div class="user-item-name">👤 ${u.username}</div>
                <div class="user-item-sub">📧 ${u.email||'—'}${u.facebook?` | 📘 ${u.facebook}`:''}</div>
                <div class="user-item-sub">Tham gia: ${u.createdAt||'—'}</div>
                ${title?`<span class="user-item-title ${title.cls}" style="display:inline-flex;align-items:center;gap:5px">${titleSvg}<span>${title.name}</span></span>`:'<span style="font-size:0.7rem;color:rgba(240,230,255,0.3)">Chưa có danh hiệu</span>'}
                <div class="user-balance">💰 Số dư: ${formatPrice(u.balance||0)}</div>
            </div>
            <div class="user-item-actions">
                <button class="btn-grant-title" onclick="openGrantTitle('${u.username}')">🏆 Cấp Danh Hiệu</button>
                <button class="btn-add-coin" onclick="openAddCoin('${u.username}')">💰 Bơm Tiền</button>
                <button class="btn-delete" onclick="deleteUser('${u.username}')">🗑️</button>
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

async function deleteUser(username){
    if(!confirm(`Xóa tài khoản "${username}"?`)) return;
    try{await deleteUserFromDB(username);const users=await getUsersFromDB();renderAdminUsers(users);showNotif(`Đã xóa ${username}`,'info');}
    catch(e){showNotif('Lỗi!','error');}
}

let grantTitleSelected=null;
function openGrantTitle(username){
    grantTitleSelected=null;
    document.getElementById('grantTitleTarget').value=username;
    document.getElementById('grantTitleUsername').textContent='Cấp danh hiệu cho: '+username;
    const grid=document.getElementById('titleSelectGrid');
    grid.innerHTML=TITLES.map(t=>{
        const svg=DH_LOGOS[t.id]?DH_LOGOS[t.id].replace(/width="64"/,'width="32"').replace(/height="72"/,'height="32"'):'';
        return`<div class="title-option" onclick="selectTitle('${t.id}',this)">
            <div style="display:flex;align-items:center;gap:8px">
                ${svg}
                <div>
                    <div class="t-name ${t.cls}" style="padding:2px 8px;border-radius:8px;display:inline-block">${t.name}</div>
                    <div class="t-min" style="font-size:0.68rem;color:rgba(240,230,255,0.4);margin-top:2px">${t.adminOnly?'Chỉ chủ shop cấp':('≥'+formatPrice(t.min))}</div>
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
async function confirmGrantTitle(){
    if(!grantTitleSelected){showNotif('Chọn danh hiệu!','error');return;}
    const username=document.getElementById('grantTitleTarget').value;
    try{
        const t=TITLES.find(x=>x.id===grantTitleSelected);
        const isPermanent=t&&(t.permanent||t.adminOnly);
        const now=Date.now();
        await updateUserInDB(username,{
            titleOverride:grantTitleSelected,
            titleGrantedAt: isPermanent?0:now,
            titleExpiry: isPermanent?0:(now+TITLE_DURATION_MS)
        });
        closeModal('grantTitleModal');
        showNotif(`🏆 Đã cấp "${t.name}" cho ${username}${isPermanent?' (vĩnh viễn)':' (30 ngày)'}`,'success');
        const users=await getUsersFromDB();renderAdminUsers(users);updateNav();
    } catch(e){showNotif('Lỗi!','error');}
}

// ADD COIN
let addCoinUsername = null;
let addCoinCurrent = 0;

async function openAddCoin(username){
    addCoinUsername = username;
    const user = await findUserInDB(username);
    addCoinCurrent = user ? (user.balance||0) : 0;
    document.getElementById('addCoinTarget').textContent = username;
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
    const note = document.getElementById('addCoinNote').value.trim();
    if(!amount||amount<=0){showNotif('Nhập số tiền hợp lệ!','error');return;}
    if(!addCoinUsername){return;}
    const newBalance = addCoinCurrent + amount;
    try{
        await setWalletBalance(addCoinUsername, newBalance);
        // Lưu log bơm tiền
        await writeWalletLog({
            username: addCoinUsername,
            amount, note: note||'Admin bơm tiền',
            newBalance,
            time: new Date().toLocaleString('vi-VN'),
            timestamp: Date.now()
        });
        closeModal('addCoinModal');
        showNotif(`💰 Đã bơm ${formatPrice(amount)} cho ${addCoinUsername}!`,'success');
        loadAdminData();
    } catch(e){ showNotif('Lỗi bơm tiền!','error'); }
}

// ADMIN CARDS
