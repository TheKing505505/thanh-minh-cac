// ============================================================
// ===== USER SYSTEM =====
// ============================================================
let _pendingRegistrationUid = null;
let _registrationInProgress = false;

async function handleRegister() {
    const username = document.getElementById('regUser').value.trim();
    const contactEmail = document.getElementById('regEmail').value.trim().toLowerCase();
    const authEmail = `${username.trim().toLowerCase()}@thanhminhcacuser.com`;
    const facebook = document.getElementById('regFacebook').value.trim();
    const pass = document.getElementById('regPass').value;
    const pass2 = document.getElementById('regPass2').value;
    const regBtn = document.getElementById('regSubmitBtn');
    const showRegErr = msg => {
        let el = document.getElementById('regErrorMsg');
        if (!el) {
            el = document.createElement('div');
            el.id = 'regErrorMsg';
            el.style.cssText = 'background:rgba(255,71,87,0.12);border:1px solid rgba(255,71,87,0.4);border-radius:10px;padding:8px 14px;font-size:0.8rem;color:var(--red);font-weight:600;margin-bottom:12px;text-align:center';
            const btn = document.querySelector('#registerModal .btn-modal-submit');
            if (btn && btn.parentNode) btn.parentNode.insertBefore(el, btn);
        }
        el.textContent = '❌ ' + msg;
        el.style.display = 'block';
    };
    const clearRegErr = () => { const el = document.getElementById('regErrorMsg'); if (el) el.style.display = 'none'; };
    clearRegErr();

    if (!username || !/^[a-zA-Z0-9._-]{2,32}$/.test(username)) {
        showRegErr('Tên đăng nhập dài 2–32 ký tự, chỉ gồm chữ không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang.'); return;
    }
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
        showRegErr('Gmail không hợp lệ. Hãy kiểm tra lại hoặc để trống nếu không muốn cung cấp.'); return;
    }
    if (pass.length < 6) { showRegErr('Mật khẩu ít nhất 6 ký tự!'); return; }
    if (pass !== pass2) { showRegErr('Mật khẩu nhập lại không khớp!'); return; }
    if (username.toLowerCase() === ADMIN_USER.toLowerCase()) { showRegErr('Tên này không được phép dùng!'); return; }
    if (!auth || !db) { showRegErr('Firebase chưa khởi tạo. Tải lại trang hoặc báo chủ shop.'); return; }

    regBtn.disabled = true;
    regBtn.textContent = '⏳ Đang đăng ký...';
    let credential = null;
    _registrationInProgress = true;
    try {
        credential = await auth.createUserWithEmailAndPassword(authEmail, pass);
        _pendingRegistrationUid = credential.user.uid;
        const usernameLower = normalizeUsername(username);
        const profile = {
            uid: credential.user.uid,
            username,
            usernameLower,
            email: contactEmail,
            authEmail,
            facebook: facebook || '',
            createdAt: new Date().toLocaleString('vi-VN'),
            createdAtTs: Date.now(),
            balance: 0,
            role: 'user',
            titleOverride: 'luyen-khi',
            disabled: false
        };
        await saveUserToDB(profile);
        currentUser = { username, usernameLower, role: 'user', uid: credential.user.uid, email: contactEmail };
        _pendingRegistrationUid = null;
        _registrationInProgress = false;
        clearSession();
        _usersCache = null;
        // onAuthStateChanged may have intentionally ignored the create-user event
        // while registration was in progress; attach customer listeners explicitly.
        if (typeof startOrderListener === 'function') startOrderListener(credential.user.uid);
        if (typeof startCustomerDataListeners === 'function') startCustomerDataListeners(credential.user.uid, usernameLower);
        ['regUser','regEmail','regFacebook','regPass','regPass2'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        closeModal('registerModal');
        showNotif('🎉 Đăng ký và tạo hồ sơ thành công!', 'success');
        updateNav();
    } catch (error) {
        console.error('Register error:', error);
        _pendingRegistrationUid = null;
        // Keep the auth observer paused while cleaning up a failed registration.
        // Nếu tạo Auth được nhưng Firestore profile không tạo được, thu hồi Auth user vừa tạo.
        if (credential && credential.user) {
            try { await credential.user.delete(); } catch (cleanupError) {
                console.error('Không thể thu hồi tài khoản đăng ký lỗi:', cleanupError);
            }
        }
        const messages = {
            'auth/email-already-in-use': 'Tên đăng nhập này đã có tài khoản. Hãy chọn tên khác.',
            'auth/invalid-email': 'Tên đăng nhập hoặc email không hợp lệ.',
            'auth/weak-password': 'Mật khẩu quá yếu; hãy dùng ít nhất 6 ký tự.',
            'auth/operation-not-allowed': 'Firebase Console chưa bật Email/Password.',
            'permission-denied': 'Firestore Rules từ chối tạo hồ sơ. Hãy Publish firebaserulev3.rules bản 3.0 cho đúng project rồi thử lại.',
            'firestore/permission-denied': 'Firestore Rules từ chối tạo hồ sơ. Hãy Publish firebaserulev3.rules bản 3.0 cho đúng project rồi thử lại.',
            'already-exists': 'Tên đăng nhập đã được sử dụng. Hãy chọn tên khác.'
        };
        showRegErr(messages[error.code] || error.message || 'Không thể đăng ký. Hãy thử lại.');
    } finally {
        _registrationInProgress = false;
        regBtn.disabled = false;
        regBtn.textContent = '✦ Đăng Ký';
    }
}

async function handleLogin() {
    const loginName = document.getElementById('loginUser').value.trim().toLowerCase();
    const pass = document.getElementById('loginPass').value;
    if (!loginName || !pass) { showNotif('Vui lòng nhập tên đăng nhập và mật khẩu!', 'error'); return; }
    // Admin vẫn có thể đăng nhập bằng email quản trị hiện tại.
    // Khách chỉ cần nhập username; hệ thống tự ghép email nội bộ.
    const email = loginName.includes('@') ? loginName : `${loginName}@thanhminhcacuser.com`;
    if (!auth || !db) { showNotif('Firebase chưa khởi tạo. Hãy tải lại trang.', 'error'); return; }

    const loginBtn = document.getElementById('loginSubmitBtn') || document.querySelector('#loginModal .btn-modal-submit');
    if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = '⏳ Đang đăng nhập...'; }
    try {
        const credential = await auth.signInWithEmailAndPassword(email, pass);
        const firebaseUser = credential.user;
        if (!firebaseUser) throw new Error('Firebase không trả về tài khoản đăng nhập.');

        if (firebaseUser.uid === ADMIN_UID) {
            currentUser = { username: ADMIN_USER, usernameLower: normalizeUsername(ADMIN_USER), role: 'admin', uid: firebaseUser.uid, email: firebaseUser.email };
            clearSession();
            closeModal('loginModal');
            showNotif('Đăng nhập quản trị thành công!', 'success');
            updateNav();
            // Firebase onAuthStateChanged sẽ khôi phục bảng quản trị sau khi xác thực xong.
            return;
        }

        const profile = await getUserProfileByUid(firebaseUser.uid);
        if (!profile || profile.disabled) {
            await auth.signOut();
            currentUser = null;
            throw new Error(profile && profile.disabled
                ? 'Tài khoản đã bị chủ shop vô hiệu hóa. Hãy liên hệ shop.'
                : 'Tài khoản Auth chưa có hồ sơ khách trong Firestore. Hãy đăng ký lại hoặc liên hệ shop.');
        }
        currentUser = { username: profile.username, usernameLower: profile.usernameLower, role: 'user', uid: firebaseUser.uid, email: profile.email || '' };
        clearSession();
        _usersCache = null;
        if (typeof startOrderListener === 'function') startOrderListener(firebaseUser.uid);
        if (typeof startCustomerDataListeners === 'function') startCustomerDataListeners(firebaseUser.uid, profile.usernameLower);
        closeModal('loginModal');
        showNotif(`👋 Chào ${profile.username}! 🎮`, 'success');
        updateNav();
    } catch (error) {
        console.error('Login error:', error);
        const messages = {
            'auth/invalid-email': 'Tên đăng nhập hoặc email không hợp lệ.',
            'auth/user-not-found': 'Không tìm thấy tài khoản. Hãy kiểm tra tên đăng nhập.',
            'auth/wrong-password': 'Mật khẩu không đúng.',
            'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
            'auth/email-already-in-use': 'Email đã được sử dụng.',
            'auth/too-many-requests': 'Đăng nhập tạm thời bị giới hạn. Hãy thử lại sau.',
            'auth/configuration-not-found': 'Firebase Authentication chưa được cấu hình trên đúng project.',
            'permission-denied': 'Firestore Rules từ chối đọc hồ sơ. Kiểm tra UID và Rules phiên bản 3.0.',
            'firestore/permission-denied': 'Firestore Rules từ chối đọc hồ sơ. Kiểm tra UID và Rules phiên bản 3.0.'
        };
        showNotif(messages[error.code] || error.message || 'Lỗi đăng nhập, thử lại!', 'error');
    } finally {
        if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = '✦ Đăng Nhập'; }
    }
}

async function logoutUser(){
    stopOrderListener();
    if(auth && auth.currentUser){ try { await auth.signOut(); } catch(e) { console.warn('Auth signOut:',e); } }
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
        startOrderListener(currentUser.uid);
        startCustomerDataListeners(currentUser.uid, currentUser.usernameLower);
    } else {
        stopCustomerDataListeners();
    }
    applyVideoSetting();
}
