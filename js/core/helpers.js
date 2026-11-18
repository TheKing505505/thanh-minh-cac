function simpleHash(str){let h=0;for(let i=0;i<str.length;i++){const c=str.charCodeAt(i);h=((h<<5)-h)+c;h=h&h;}return 'h_'+Math.abs(h).toString(36)+'_'+str.length;}
function formatPrice(p){return new Intl.NumberFormat('vi-VN').format(p)+'đ';}
function generateOrderId(){const c='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';let r='TMC-';for(let i=0;i<6;i++)r+=c[Math.floor(Math.random()*c.length)];return r;}
function getServiceImage(svc){return(svc.image&&svc.image.length>10)?svc.image:(DEFAULT_IMAGES[svc.category]||DEFAULT_IMAGES.other);}

// Escape du lieu khong tin cay truoc khi chen vao innerHTML.
function escapeHTML(value){
    return String(value == null ? '' : value).replace(/[&<>\"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[ch]));
}
// Tao tham so chuoi an toan cho inline handler HTML cu.
function safeJsArg(value){
    return escapeHTML(JSON.stringify(String(value == null ? '' : value)));
}
