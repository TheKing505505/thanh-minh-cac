// ============================================================
// ===== QUẢN LÝ KHOÁ MÃ HOÁ MẬT KHẨU ROBLOX (ADMIN) =====
// Khoá CÔNG KHAI → dán vào js/config/constants.js (ORDER_PUBLIC_KEY).
// Khoá RIÊNG  → cất ở nơi an toàn (file ngoài GitHub / trình quản lý mật khẩu).
//              Chỉ nhập vào trình duyệt khi cần xem mật khẩu; tự mất khi đóng tab/đăng xuất.
// ============================================================
function renderEncryptionStatus(){
    const el=document.getElementById('encStatus');if(!el) return;
    const on=isOrderEncryptionEnabled();
    const hasPriv=!!getAdminPrivateJwk();
    el.innerHTML=
      (on?'<div style="color:var(--green)">✅ Đã bật mã hoá: mật khẩu Roblox khách gửi được mã hoá trước khi lên Firebase.</div>'
         :'<div style="color:var(--red)">⚠️ CHƯA bật mã hoá: mật khẩu Roblox đang lưu dạng chữ thường trong Firestore. Hãy tạo khoá và dán khoá công khai vào constants.js.</div>')
      +'<div style="margin-top:6px;color:'+(hasPriv?'var(--green)':'rgba(240,230,255,0.55)')+'">'+(hasPriv?'🔓 Đã nhập khoá riêng cho phiên này.':'🔒 Chưa nhập khoá riêng (chưa giải mã được mật khẩu).')+'</div>';
}

function _downloadText(filename,text){
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));
    a.download=filename;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}

async function adminGenerateKeys(){
    if(isOrderEncryptionEnabled() && !confirm('Đã có khoá công khai trong constants.js. Tạo khoá MỚI sẽ khiến các đơn cũ KHÔNG giải mã được bằng khoá mới. Vẫn tạo?')) return;
    try{
        const {pub,priv}=await generateOrderKeyPair();
        const pubText=JSON.stringify(pub);
        document.getElementById('encPublicOut').value='const ORDER_PUBLIC_KEY = '+pubText+';';
        _downloadText('tmc-PRIVATE-KEY-giu-bi-mat.json',JSON.stringify(priv));
        setAdminPrivateJwk(priv);
        renderEncryptionStatus();
        showNotif('✅ Đã tạo khoá. File khoá RIÊNG vừa được tải về — cất kỹ, KHÔNG đưa lên GitHub!','success');
    }catch(e){showNotif('❌ Không tạo được khoá: '+(e.message||''),'error');}
}

function adminImportPrivateKey(){
    const ta=document.getElementById('encPrivateIn');
    try{
        const jwk=JSON.parse(ta.value.trim());
        if(!jwk||jwk.kty!=='RSA'||!jwk.d) throw new Error('Không phải khoá riêng RSA');
        setAdminPrivateJwk(jwk);
        ta.value='';
        renderEncryptionStatus();
        showNotif('✅ Đã nhập khoá riêng cho phiên này','success');
    }catch(e){showNotif('❌ Khoá không hợp lệ: '+(e.message||''),'error');}
}

function adminForgetPrivateKey(){
    setAdminPrivateJwk(null);renderEncryptionStatus();showNotif('Đã xoá khoá riêng khỏi trình duyệt','info');
}
