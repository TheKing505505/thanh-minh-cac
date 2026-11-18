// ============================================================
// ===== SECURITY HELPERS =====
// Nạp TRƯỚC mọi file khác (xem index.html).
// ============================================================

// Chống XSS: escape mọi dữ liệu động trước khi đưa vào innerHTML.
function esc(v){
    return String(v==null?'':v).replace(/[&<>"'`]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c]));
}
// Dùng cho giá trị đưa vào onclick="fn('...')": chỉ cho phép ký tự an toàn (id/uid).
// KHÔNG dùng esc() trong ngữ cảnh JS vì trình duyệt giải mã &#39; trước khi chạy JS.
function safeId(v){
    const s=String(v==null?'':v);
    return /^[A-Za-z0-9_-]{1,64}$/.test(s)?s:'';
}
// Chỉ cho phép ảnh https:// hoặc data:image/... (chặn javascript: và các scheme lạ)
function safeImgUrl(u){
    const s=String(u||'').trim();
    if(/^https:\/\/[^\s"'<>]+$/i.test(s)) return s;
    if(/^data:image\/(png|jpe?g|webp|gif|svg\+xml)[;,][^\s"'<>]*$/i.test(s)) return s;
    return '';
}

// Số ngẫu nhiên an toàn (thay Math.random cho mã đơn / mã thẻ)
function secureRandomString(len,alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'){
    const arr=new Uint32Array(len);crypto.getRandomValues(arr);
    let r='';for(let i=0;i<len;i++)r+=alphabet[arr[i]%alphabet.length];
    return r;
}

// ---- Tên đăng nhập → email nội bộ cho Firebase Auth ----
function normalizeUsername(u){
    return String(u||'').normalize('NFC').trim().replace(/\s+/g,' ').toLowerCase();
}
function isValidUsername(u){
    // 2–20 ký tự: chữ (có dấu), số, khoảng trắng, _ và -
    return /^[\p{L}\p{N}_ -]{2,20}$/u.test(String(u||'').normalize('NFC').trim());
}
async function sha256Hex(str){
    const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function usernameToEmail(username){
    const h=await sha256Hex(normalizeUsername(username));
    return 'u'+h.slice(0,40)+'@'+USER_EMAIL_DOMAIN;
}

// ---- Mã hoá mật khẩu Roblox bằng RSA-OAEP (chỉ admin có khoá riêng mới đọc được) ----
const ENC_PREFIX='rsa1:';
function _b64(buf){let s='';new Uint8Array(buf).forEach(b=>s+=String.fromCharCode(b));return btoa(s);}
function _unb64(str){const s=atob(str);const a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a;}
function isOrderEncryptionEnabled(){return !!ORDER_PUBLIC_KEY;}
async function encryptForAdmin(plain){
    if(!ORDER_PUBLIC_KEY) return null;
    const bytes=new TextEncoder().encode(plain);
    if(bytes.length>190) throw new Error('Mật khẩu quá dài (tối đa ~190 byte)');
    const key=await crypto.subtle.importKey('jwk',ORDER_PUBLIC_KEY,{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);
    const ct=await crypto.subtle.encrypt({name:'RSA-OAEP'},key,bytes);
    return ENC_PREFIX+_b64(ct);
}
const _PRIV_SESSION_KEY='tmc_admin_priv_jwk';
function getAdminPrivateJwk(){
    try{const s=sessionStorage.getItem(_PRIV_SESSION_KEY);return s?JSON.parse(s):null;}catch(e){return null;}
}
function setAdminPrivateJwk(jwk){
    try{if(jwk)sessionStorage.setItem(_PRIV_SESSION_KEY,JSON.stringify(jwk));else sessionStorage.removeItem(_PRIV_SESSION_KEY);}catch(e){}
}
async function decryptAsAdmin(enc){
    const jwk=getAdminPrivateJwk();
    if(!jwk) throw new Error('Chưa nhập khoá riêng (Cài Đặt → Mã hoá mật khẩu Roblox)');
    if(!String(enc).startsWith(ENC_PREFIX)) return String(enc);
    const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSA-OAEP',hash:'SHA-256'},false,['decrypt']);
    const pt=await crypto.subtle.decrypt({name:'RSA-OAEP'},key,_unb64(String(enc).slice(ENC_PREFIX.length)));
    return new TextDecoder().decode(pt);
}
async function generateOrderKeyPair(){
    const kp=await crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['encrypt','decrypt']);
    const pub=await crypto.subtle.exportKey('jwk',kp.publicKey);
    const priv=await crypto.subtle.exportKey('jwk',kp.privateKey);
    return {pub,priv};
}
