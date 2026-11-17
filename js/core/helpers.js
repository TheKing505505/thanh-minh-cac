/* Hàm tiện ích dùng chung. simpleHash chỉ được giữ để tương thích dữ liệu cũ, không phải thuật toán bảo mật mật khẩu. */
function simpleHash(str){let h=0;for(let i=0;i<str.length;i++){const c=str.charCodeAt(i);h=((h<<5)-h)+c;h=h&h;}return 'h_'+Math.abs(h).toString(36)+'_'+str.length;}
function formatPrice(p){return new Intl.NumberFormat('vi-VN').format(p)+'đ';}
function generateOrderId(){const c='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';let r='TMC-';for(let i=0;i<6;i++)r+=c[Math.floor(Math.random()*c.length)];return r;}
function getServiceImage(svc){return(svc.image&&svc.image.length>10)?svc.image:(DEFAULT_IMAGES[svc.category]||DEFAULT_IMAGES.other);}

function getYoutubeEmbedUrl(url){
    if(!url) return null;
    const m=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
    return m?`https://www.youtube.com/embed/${m[1]}?autoplay=0`:null;
}
