// ============================================================
// ===== NOTIFICATIONS =====
// ============================================================
function showNotif(msg,type='success'){
    const n=document.getElementById('notification');
    if(!n) return;
    if(_notifTimer){clearTimeout(_notifTimer);_notifTimer=null;}
    const icons={success:'✅',error:'❌',info:'ℹ️'};
    n.className=`notification ${type}`;
    n.textContent=`${icons[type]||''} ${String(msg == null ? '' : msg)}`;
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



function stopCustomerDataListeners() {
    if (_customerProfileUnsub) { try { _customerProfileUnsub(); } catch (e) {} }
    if (_customerCardsUnsub) { try { _customerCardsUnsub(); } catch (e) {} }
    _customerProfileUnsub = null;
    _customerCardsUnsub = null;
    _customerListenerUid = null;
}

function startCustomerDataListeners(uid, usernameLower) {
    if (!db || !auth || !auth.currentUser || auth.currentUser.uid !== uid) return;
    if (_customerListenerUid === uid && _customerProfileUnsub && _customerCardsUnsub) return;
    stopCustomerDataListeners();
    _customerListenerUid = uid;

    _customerProfileUnsub = db.collection('users').doc(usernameLower).onSnapshot(async snap => {
        if (!currentUser || currentUser.uid !== uid) return;
        if (!snap.exists || snap.data().disabled === true) {
            showNotif('Hồ sơ khách hàng không còn hoạt động. Phiên đăng nhập đã kết thúc.', 'error');
            try { await auth.signOut(); } catch (e) { console.error('Auto sign out:', e); }
            return;
        }
        const profile = snap.data();
        currentUser.username = profile.username;
        currentUser.usernameLower = profile.usernameLower;
        currentUser.email = profile.email;
        if (document.getElementById('profilePanel')?.classList.contains('show')) renderProfile();
    }, error => {
        console.error('Customer profile realtime error:', error);
        showNotif('Không đồng bộ được hồ sơ: ' + (error.message || error), 'error');
    });

    _customerCardsUnsub = db.collection('cards').where('uid', '==', uid).onSnapshot(() => {
        if (currentUser && currentUser.uid === uid && document.getElementById('cardPanel')?.classList.contains('show')) {
            loadCardHistory();
        }
    }, error => {
        console.error('Customer cards realtime error:', error);
        showNotif('Không đồng bộ được lịch sử nạp thẻ: ' + (error.message || error), 'error');
    });
}

// ===== AUTH + APP INITIALIZATION =====
function stopAdminRealtimeListeners() {
    _adminRealtimeUnsubs.forEach(unsubscribe => { try { unsubscribe(); } catch (e) {} });
    _adminRealtimeUnsubs = [];
}

function startAdminRealtimeListeners() {
    stopAdminRealtimeListeners();
    if (!db || !auth || !auth.currentUser || auth.currentUser.uid !== ADMIN_UID) return;
    const isAdminPanelOpen = () => currentUser && currentUser.role === 'admin' && document.getElementById('adminPanel')?.classList.contains('show');
    const addListener = (collectionName, handler) => {
        const unsubscribe = db.collection(collectionName).onSnapshot(handler, error => {
            console.error('Admin realtime ' + collectionName + ':', error);
            showNotif('Không thể đồng bộ ' + collectionName + ': ' + (error.message || error), 'error');
        });
        _adminRealtimeUnsubs.push(unsubscribe);
    };
    addListener('users', snap => {
        if (isAdminPanelOpen()) renderAdminUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    addListener('orders', snap => {
        if (isAdminPanelOpen()) renderAdminOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    addListener('cards', () => {
        if (isAdminPanelOpen() && document.getElementById('adminCards')?.classList.contains('show')) loadAdminCards();
    });
    addListener('titlepurchases', snap => {
        if (isAdminPanelOpen()) {
            _titlePurchasesAll = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
            if (document.getElementById('adminTitlepurchases')?.classList.contains('show')) renderTitlePurchaseList();
        }
    });
}

(function initializeApplication() {
    // Legacy localStorage sessions are intentionally ignored; Firebase Auth is the session source.
    clearSession();
    startShopConfigSync();

    if (auth) {
        auth.onAuthStateChanged(async firebaseUser => {
            if (!firebaseUser) {
                const wasAdmin = currentUser && currentUser.role === 'admin';
                currentUser = null;
                stopOrderListener();
                stopCustomerDataListeners();
                stopAdminRealtimeListeners();
                updateNav();
                if (wasAdmin) showHome();
                return;
            }

            if (_registrationInProgress || (_pendingRegistrationUid && firebaseUser.uid === _pendingRegistrationUid)) return;

            if (firebaseUser.uid === ADMIN_UID) {
                stopOrderListener();
                stopCustomerDataListeners();
                currentUser = { username: ADMIN_USER, usernameLower: normalizeUsername(ADMIN_USER), role: 'admin', uid: firebaseUser.uid, email: firebaseUser.email };
                updateNav();
                try { await seedMissingShopConfigAsAdmin(); } catch (error) { console.error('Seed shared config:', error); showNotif('Không khởi tạo được cấu hình shop: '+(error.message||error),'error'); }
                showAdmin();
                stopCustomerDataListeners();
                startAdminRealtimeListeners();
                loadTopNap();
                return;
            }

            try {
                const profile = await getUserProfileByUid(firebaseUser.uid);
                if (!profile || profile.disabled) {
                    currentUser = null;
                    await auth.signOut();
                    showNotif(profile && profile.disabled ? 'Tài khoản đã bị vô hiệu hóa.' : 'Tài khoản Auth chưa có hồ sơ khách trong Firestore. Hoàn tất đăng ký hoặc liên hệ shop.', 'error');
                    updateNav();
                    return;
                }
                currentUser = { username: profile.username, usernameLower: profile.usernameLower, role: 'user', uid: firebaseUser.uid, email: firebaseUser.email };
                stopAdminRealtimeListeners();
                updateNav();
                startOrderListener(currentUser.uid);
                startCustomerDataListeners(currentUser.uid, currentUser.usernameLower);
            } catch (error) {
                console.error('Load customer profile:', error);
                currentUser = null;
                await auth.signOut();
                showNotif('Không tải được hồ sơ khách: ' + (error.message || error), 'error');
                updateNav();
            }
        });
    }

    renderServices();
    updateNav();
    applyVideoSetting();
    loadSocialProof();
    loadTopNap();
    renderTitleShopGrid();
    if (db) startFruitStockListener();
})();
