/* Đăng ký, đăng nhập khách hàng, đăng xuất và cập nhật thanh điều hướng. */
async function handleRegister() {
    const username=document.getElementById('regUser').value.trim();
    const email=document.getElementById('regEmail').value.trim();
    const facebook=document.getElementById('regFacebook').value.trim();
    const pass=document.getElementById('regPass').value;
    const pass2=document.getElementById('regPass2').value;
    // Hiển thị lỗi inline trong modal thay vì notification
    const showRegErr=(msg)=>{
        let errEl=document.getElementById('regErrorMsg');
        if(!errEl){errEl=document.createElement('div');errEl.id='regErrorMsg';errEl.style.cssText='background:rgba(255,71,87,0.12);border:1px solid rgba(255,71,87,0.4);border-radius:10px;padding:8px 14px;font-size:0.8rem;color:var(--red);font-weight:600;margin-bottom:12px;text-align:center';const btn=document.querySelector('#registerModal .btn-modal-submit');btn.parentNode.insertBefore(errEl,btn);}
        errEl.innerHTML='❌ '+msg;errEl.style.display='block';
    };
    const clearRegErr=()=>{const el=document.getElementById('regErrorMsg');if(el)el.style.display='none';};
    clearRegErr();
    if(!username||username.length<2){showRegErr('Tên đăng nhập ít nhất 2 ký tự!');return;}
    if(/[^\w\sÀ-ỹ]/i.test(username)&&false){} // cho phép tên tiếng Việt
    if(email&&!email.includes('@')){showRegErr('Email không hợp lệ!');return;}
    if(pass.length<6){showRegErr('Mật khẩu ít nhất 6 ký tự!');return;}
    if(pass!==pass2){showRegErr('Mật khẩu nhập lại không khớp!');return;}
    if(username.toLowerCase()===ADMIN_USER.toLowerCase()){showRegErr('Tên này không được phép dùng!');return;}
    // Lấy đúng nút đăng ký (nút đầu tiên có text ✦ Đăng Ký)
    const regBtn=document.getElementById('regSubmitBtn');
    if(!regBtn) return;
    regBtn.disabled=true; regBtn.textContent='⏳ Đang đăng ký...';
    try {
        const existing=await findUserInDB(username);
        if(existing){showRegErr('Tên đăng nhập đã tồn tại! Vui lòng chọn tên khác.');regBtn.disabled=false;regBtn.textContent='✦ Đăng Ký';return;}
        const newUser={
            username, email: email||'', facebook: facebook||'',
            passwordHash: simpleHash(pass),
            titleOverride: null,
            createdAt: new Date().toLocaleString('vi-VN'),
            createdAtTs: Date.now(),
            balance: 0, role: 'user'
        };
        await saveUserToDB(newUser);
        clearRegErr();
        // Reset form
        ['regUser','regEmail','regFacebook','regPass','regPass2'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
        closeModal('registerModal');
        showNotif('🎉 Đăng ký thành công! Hãy đăng nhập.','success');
        setTimeout(()=>openModal('loginModal'),600);
    } catch(e){
        console.error('Register error:',e);
        if(e.code==='permission-denied'||e.message.includes('permissions')){
            showRegErr('Lỗi quyền truy cập Firebase. Shop đang dùng chế độ offline — thử lại ngay!');
        } else {
            showRegErr('Lỗi kết nối, vui lòng thử lại!');
        }
    }
    finally{regBtn.disabled=false;regBtn.textContent='✦ Đăng Ký';}
}

async function handleLogin() {
    const username=document.getElementById('loginUser').value.trim();
    const pass=document.getElementById('loginPass').value;
    if(!username||!pass){showNotif('Vui lòng điền đầy đủ!','error');return;}
    if(username.toLowerCase()===ADMIN_USER.toLowerCase()){
        showNotif('Đăng nhập quản trị đang tạm khóa. Cần cấu hình Firebase Authentication và quyền admin phía máy chủ.','error');
        return;
    }
    const loginBtn=document.getElementById('loginSubmitBtn')||document.querySelector('#loginModal .btn-modal-submit');
    if(loginBtn){loginBtn.disabled=true;loginBtn.textContent='⏳ Đang đăng nhập...';}
    try {
        const user=await findUserInDB(username);
        if(!user){showNotif('❌ Tài khoản không tồn tại!','error');return;}
        if(user.passwordHash!==simpleHash(pass)){showNotif('❌ Sai mật khẩu!','error');return;}
        // Đăng nhập thành công
        currentUser={username:user.username,role:'user'};
        _useLocalStorage=false; // reset để các thao tác tiếp theo dùng Firestore
        _usersCache=null;
        saveSession(currentUser);
        closeModal('loginModal');
        showNotif(`👋 Chào ${user.username}! 🎮`,'success');
        // updateNav không throw vì đã có try/catch bên trong
        updateNav(); // không await để không block
    } catch(e){
        console.error('Login error:',e);
        showNotif('❌ Lỗi đăng nhập, thử lại!','error');
    } finally {
        if(loginBtn){loginBtn.disabled=false;loginBtn.textContent='✦ Đăng Nhập';}
    }
}

function logoutUser(){
    stopOrderListener();
    currentUser=null;
    clearSession();
    // Reset để lần đăng nhập tiếp theo luôn đọc từ Firestore
    _useLocalStorage=false;
    _usersCache=null;
    showNotif('Đã đăng xuất','info');
    updateNav();
    showHome();
}

async function updateNav() {
    const isUser=currentUser&&currentUser.role==='user';
    const isAdmin=currentUser&&currentUser.role==='admin';
    document.getElementById('navLoginBtn').style.display=currentUser?'none':'';
    document.getElementById('navRegisterBtn').style.display=currentUser?'none':'';
    document.getElementById('navLogoutBtn').style.display=currentUser?'':'none';
    document.getElementById('navHistoryBtn').style.display=isUser?'':'none';
    document.getElementById('navCardBtn').style.display=isUser?'':'none';
    document.getElementById('navAdminBtn').style.display=isAdmin?'':'none';
    document.getElementById('navUserBadge').style.display=isUser?'':'none';
    if(isUser){
        document.getElementById('navAvatar').textContent=currentUser.username[0].toUpperCase();
        document.getElementById('navUsername').textContent=currentUser.username;
        try{
            const user=await findUserInDB(currentUser.username);
            const title=user&&user.titleOverride?TITLES.find(t=>t.id===user.titleOverride):null;
            const navBadge=document.getElementById('navTitleBadge');
            if(title&&DH_LOGOS[title.id]){
                navBadge.innerHTML=`<span style="display:inline-flex;align-items:center;gap:4px"><span style="display:inline-block;width:20px;height:20px;vertical-align:middle">${DH_LOGOS[title.id].replace(/width="64"/,'width="20"').replace(/height="72"/,'height="20"')}</span>${title.name}</span>`;
            } else {
                navBadge.textContent=title?title.icon+' '+title.name:'';
            }
        } catch(e){}
    }
    renderServices();
    loadSocialProof();
    loadTopCustomers();
    // Bắt đầu listener nếu là user
    if (currentUser && currentUser.role === 'user') {
        startOrderListener(currentUser.username);
    }
    applyVideoSetting();
}
