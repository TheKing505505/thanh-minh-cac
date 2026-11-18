// ============================================================
// ===== USER SYSTEM — Firebase Authentication =====
// Khách: đăng nhập bằng "tên đăng nhập" (tự đổi thành email nội bộ).
// Admin: đăng nhập bằng EMAIL thật của tài khoản admin trong Firebase Auth (gõ email vào ô tên đăng nhập).
// Không còn mật khẩu nào nằm trong source code.
// ============================================================
let _registering = false;

function _authErrMsg(e){
    const c = e && e.code || '';
    if(c==='auth/too-many-requests') return 'Bạn thử quá nhiều lần. Vui lòng đợi vài phút rồi thử lại.';
    if(c==='auth/network-request-failed') return 'Lỗi mạng, vui lòng thử lại.';
    if(c==='auth/operation-not-allowed') return 'Chủ shop chưa bật đăng nhập Email/Mật khẩu trong Firebase.';
    return null;
}

// Đồng bộ biến currentUser (chỉ để hiển thị UI; quyền thật do firestore.rules quyết định)
async function syncCurrentUser(fbUser){
    if(!fbUser){ currentUser=null; return; }
    if(fbUser.uid===ADMIN_UID){ currentUser={uid:fbUser.uid,username:ADMIN_USER,role:'admin'}; return; }
    try{
        const u=await getMyUser();
        currentUser = u ? {uid:fbUser.uid,username:u.username,role:'user'} : null;
    }catch(e){ currentUser=null; }
}

async function _createProfile(uid, username, email, facebook){
    const norm = normalizeUsername(username);
    const batch = db.batch();
    batch.set(db.collection('usernames').doc('n_'+norm), { uid, usernameLower:norm });
    batch.set(db.collection('users').doc(uid), {
        uid, username:username.normalize('NFC').trim().replace(/\s+/g,' '), usernameLower:norm,
        email: email||'', facebook: facebook||'',
        titleOverride:null, balance:0, role:'user',
        createdAt:new Date().toLocaleString('vi-VN'), createdAtTs:Date.now()
    });
    await batch.commit();
}

async function handleRegister() {
    const username=document.getElementById('regUser').value.trim();
    const email=document.getElementById('regEmail').value.trim();
    const facebook=document.getElementById('regFacebook').value.trim();
    const pass=document.getElementById('regPass').value;
    const pass2=document.getElementById('regPass2').value;
    const showRegErr=(msg)=>{
        let errEl=document.getElementById('regErrorMsg');
        if(!errEl){errEl=document.createElement('div');errEl.id='regErrorMsg';errEl.style.cssText='background:rgba(255,71,87,0.12);border:1px solid rgba(255,71,87,0.4);border-radius:10px;padding:8px 14px;font-size:0.8rem;color:var(--red);font-weight:600;margin-bottom:12px;text-align:center';const btn=document.querySelector('#registerModal .btn-modal-submit');btn.parentNode.insertBefore(errEl,btn);}
        errEl.textContent='❌ '+msg;errEl.style.display='block';
    };
    const clearRegErr=()=>{const el=document.getElementById('regErrorMsg');if(el)el.style.display='none';};
    clearRegErr();
    if(!auth||!db){showRegErr('Firebase chưa kết nối, hãy tải lại trang!');return;}
    if(!isValidUsername(username)){showRegErr('Tên đăng nhập 2–20 ký tự, chỉ gồm chữ, số, khoảng trắng, _ hoặc -');return;}
    if(email&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>100)){showRegErr('Email không hợp lệ!');return;}
    if(facebook.length>200){showRegErr('Facebook quá dài!');return;}
    if(pass.length<8){showRegErr('Mật khẩu ít nhất 8 ký tự!');return;}
    if(pass!==pass2){showRegErr('Mật khẩu nhập lại không khớp!');return;}
    if(normalizeUsername(username)===normalizeUsername(ADMIN_USER)){showRegErr('Tên này không được phép dùng!');return;}
    const regBtn=document.getElementById('regSubmitBtn');
    if(!regBtn) return;
    regBtn.disabled=true; regBtn.textContent='⏳ Đang đăng ký...';
    _registering=true;
    let cred=null;
    try {
        const authEmail=await usernameToEmail(username);
        cred=await auth.createUserWithEmailAndPassword(authEmail,pass);
        await _createProfile(cred.user.uid,username,email,facebook);
        ['regUser','regEmail','regFacebook','regPass','regPass2'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
        closeModal('registerModal');
        await syncCurrentUser(cred.user);
        updateNav();
        showNotif('🎉 Đăng ký thành công! Chào mừng bạn.','success');
    } catch(e){
        console.error('Register error:',e.code||e.message);
        if(cred && cred.user){ try{ await cred.user.delete(); }catch(_){ try{await auth.signOut();}catch(__){} } }
        if(e.code==='auth/email-already-in-use') showRegErr('Tên đăng nhập đã tồn tại! Vui lòng chọn tên khác.');
        else if(e.code==='auth/weak-password') showRegErr('Mật khẩu quá yếu!');
        else if(e.code==='permission-denied') showRegErr('Tên đăng nhập đã tồn tại hoặc không hợp lệ.');
        else showRegErr(_authErrMsg(e)||'Lỗi đăng ký, vui lòng thử lại!');
    }
    finally{_registering=false;regBtn.disabled=false;regBtn.textContent='✦ Đăng Ký';}
}

async function handleLogin() {
    const username=document.getElementById('loginUser').value.trim();
    const pass=document.getElementById('loginPass').value;
    if(!username||!pass){showNotif('Vui lòng điền đầy đủ!','error');return;}
    if(!auth||!db){showNotif('Firebase chưa kết nối, hãy tải lại trang!','error');return;}
    const loginBtn=document.getElementById('loginSubmitBtn')||document.querySelector('#loginModal .btn-modal-submit');
    if(loginBtn){loginBtn.disabled=true;loginBtn.textContent='⏳ Đang đăng nhập...';}
    try {
        const isEmail = username.includes('@');   // admin đăng nhập bằng email
        const authEmail = isEmail ? username : await usernameToEmail(username);
        const cred = await auth.signInWithEmailAndPassword(authEmail, pass);
        const fbUser = cred.user;
        if(fbUser.uid===ADMIN_UID){
            await syncCurrentUser(fbUser);
            document.getElementById('loginPass').value='';
            closeModal('loginModal');
            showNotif('🔥 Chào Thanh Minh Các Chủ!','success');
            updateNav(); showAdmin(); return;
        }
        if(isEmail){ // email không phải admin → không dùng đường này cho khách
            await auth.signOut(); showNotif('❌ Sai tên đăng nhập hoặc mật khẩu!','error'); return;
        }
        // Khôi phục hồ sơ nếu lần đăng ký trước bị lỗi giữa chừng
        let prof = await getMyUser();
        if(!prof){
            try{ await _createProfile(fbUser.uid, username, '', ''); }catch(e){ await auth.signOut(); showNotif('❌ Tài khoản chưa có hồ sơ, liên hệ chủ shop.','error'); return; }
        }
        await syncCurrentUser(fbUser);
        document.getElementById('loginPass').value='';
        closeModal('loginModal');
        showNotif(`👋 Chào ${currentUser?currentUser.username:''}! 🎮`,'success');
        updateNav();
    } catch(e){
        const c=e&&e.code||'';
        if(['auth/invalid-credential','auth/user-not-found','auth/wrong-password','auth/invalid-email'].includes(c)){
            // Không tiết lộ tài khoản có tồn tại hay không
            showNotif('❌ Sai tên đăng nhập hoặc mật khẩu! (Khách cũ: vui lòng đăng ký lại cùng tên để chủ shop chuyển số dư)','error');
        } else showNotif('❌ '+(_authErrMsg(e)||'Lỗi đăng nhập, thử lại!'),'error');
    } finally {
        if(loginBtn){loginBtn.disabled=false;loginBtn.textContent='✦ Đăng Nhập';}
    }
}

async function logoutUser(){
    stopOrderListener();
    setAdminPrivateJwk(null);
    try{ if(auth) await auth.signOut(); }catch(e){}
    currentUser=null;
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
            const user=await getMyUser();
            const title=user&&user.titleOverride?TITLES.find(t=>t.id===user.titleOverride):null;
            const navBadge=document.getElementById('navTitleBadge');
            if(title&&DH_LOGOS[title.id]){
                navBadge.innerHTML=`<span style="display:inline-flex;align-items:center;gap:4px"><span style="display:inline-block;width:20px;height:20px;vertical-align:middle">${DH_LOGOS[title.id].replace(/width="64"/,'width="20"').replace(/height="72"/,'height="20"')}</span>${esc(title.name)}</span>`;
            } else {
                navBadge.textContent=title?title.icon+' '+title.name:'';
            }
        } catch(e){}
    }
    renderServices();
    loadSocialProof();
    loadTopCustomers();
    if (currentUser && currentUser.role === 'user') {
        startOrderListener(currentUser.uid);
    }
    applyVideoSetting();
}
