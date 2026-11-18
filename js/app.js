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


// ===== INIT =====
// ============================================================
(async function(){
    // Khôi phục phiên khách cũ; không bao giờ khôi phục quyền admin từ localStorage.
    const session=loadSession();
    if(session && session.role === 'user'){
        try{
            const user=await findUserInDB(session.username);
            if(user) currentUser={username:user.username,role:'user'};
            else clearSession();
        }catch(e){ currentUser=null; }
    }

    // Firebase Auth là nguồn sự thật duy nhất cho phiên quản trị.
    if(auth){
        auth.onAuthStateChanged(firebaseUser=>{
            if(firebaseUser){
                if(firebaseUser.uid===ADMIN_UID){
                    currentUser={username:ADMIN_USER,role:'admin',uid:firebaseUser.uid,email:firebaseUser.email};
                    clearSession();
                    updateNav();
                    if(!document.getElementById('adminPanel').classList.contains('show')) showAdmin();
                } else {
                    // Không cấp quyền admin cho UID khác. Không tự đăng xuất khách Auth tương lai.
                    if(currentUser && currentUser.role==='admin') currentUser=null;
                    updateNav();
                }
            } else if(currentUser && currentUser.role==='admin'){
                currentUser=null;
                updateNav();
                showHome();
            }
        });
    }

    renderServices();
    updateNav();
    applyVideoSetting();
    loadSocialProof();
    loadTopNap();
    renderTitleShopGrid();
    if(db) startFruitStockListener();
})();;
