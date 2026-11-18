// ============================================================
// ===== NOTIFICATIONS =====
// ============================================================
function showNotif(msg,type='success'){
    const n=document.getElementById('notification');
    if(!n) return;
    if(_notifTimer){clearTimeout(_notifTimer);_notifTimer=null;}
    const icons={success:'✅',error:'❌',info:'ℹ️'};
    n.className=`notification ${type==='error'||type==='info'?type:'success'}`;
    n.textContent=`${icons[type]||''} ${msg}`;   // textContent: nội dung động không thể chèn HTML
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
    // Nếu Firebase chưa sẵn sàng (CDN chậm), thử khởi tạo lại tối đa 3 lần
    if(!db||!auth){
        for(let i=0;i<3;i++){
            await new Promise(r=>setTimeout(r,1000));
            if(typeof firebase!=='undefined'){ initFirebase(); }
            if(db&&auth) break;
        }
    }

    renderServices();
    applyVideoSetting();
    loadTopNap();
    renderTitleShopGrid();

    if(auth){
        // Nguồn sự thật duy nhất về việc đăng nhập: Firebase Authentication
        auth.onAuthStateChanged(async fbUser=>{
            if(_registering) return;      // đang đăng ký: handleRegister tự cập nhật sau khi tạo hồ sơ
            await syncCurrentUser(fbUser);
            if(!fbUser) stopOrderListener();
            updateNav();
        });
    } else {
        updateNav();
    }
    if(db){
        startFruitStockListener();
    }
})();
