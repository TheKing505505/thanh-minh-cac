const TITLE_DURATION_MS = 30*24*60*60*1000;

const TITLES = [
    { id:'luyen-khi',  name:'Luyện Khí',  price:0,      cls:'dh-luyen-khi',  icon:'🟦', discount:0,  minOrder:0,       permanent:true,  free:true,    desc:'Mặc định cho mọi khách — không có ưu đãi' },
    { id:'truc-co',    name:'Trúc Cơ',    price:9900,   cls:'dh-truc-co',    icon:'🟩', discount:5,  minOrder:25000,                     desc:'Giảm 5% cho đơn từ 25,000đ · Hiệu lực 30 ngày' },
    { id:'kim-dan',    name:'Kim Đan',    price:19900,  cls:'dh-kim-dan',    icon:'🟧', discount:8,  minOrder:30000,                     desc:'Giảm 8% cho đơn từ 30,000đ · Hiệu lực 30 ngày' },
    { id:'nguyen-anh', name:'Nguyên Anh', price:29900,  cls:'dh-nguyen-anh', icon:'🟪', discount:10, minOrder:50000,                     desc:'Giảm 10% cho đơn từ 50,000đ · Hiệu lực 30 ngày' },
    { id:'hoa-than',   name:'Hoá Thần',   price:49900,  cls:'dh-hoa-than',   icon:'🩷', discount:12, minOrder:50000,                     desc:'Giảm 12% cho đơn từ 50,000đ · Hiệu lực 30 ngày' },
    { id:'luyen-hu',   name:'Luyện Hư',   price:59900,  cls:'dh-luyen-hu',   icon:'🔷', discount:15, minOrder:60000,                     desc:'Giảm 15% cho đơn từ 60,000đ · Hiệu lực 30 ngày' },
    { id:'hop-the',    name:'Hợp Thể',    price:79900,  cls:'dh-hop-the',    icon:'🌟', discount:17, minOrder:70000,  featured:true,      desc:'Giảm 17% cho đơn từ 70,000đ · Hiệu lực 30 ngày' },
    { id:'dai-thua',   name:'Đại Thừa',   price:129000, cls:'dh-dai-thua',   icon:'❄️', discount:20, minOrder:100000,                    desc:'Giảm 20% cho đơn từ 100,000đ · Hiệu lực 30 ngày' },
    { id:'do-kiep',    name:'Độ Kiếp',    price:189000, cls:'dh-do-kiep',    icon:'⚡', discount:25, minOrder:125000,                    desc:'Giảm 25% cho đơn từ 125,000đ · Hiệu lực 30 ngày' },
    { id:'dai-de',     name:'Đại Đế Cảnh',price:0,      cls:'dh-dai-de',     icon:'👑', discount:100,minOrder:0,       permanent:true,  adminOnly:true, desc:'✦ Miễn 100% mọi dịch vụ · Vĩnh viễn · Chỉ chủ shop cấp' }
];

// ── TITLE STATUS & RENEWAL HELPERS ──────────────────────────────
function getTitleStatus(user) {
    if (!user || !user.titleOverride) return { active:false, expired:false, daysLeft:0 };
    const t = TITLES.find(x => x.id === user.titleOverride);
    if (!t) return { active:false, expired:false, daysLeft:0 };
    if (t.permanent || t.id === 'luyen-khi') return { active:true, expired:false, daysLeft:Infinity, permanent:true };
    const grantedAt = user.titleGrantedAt || 0;
    if (!grantedAt) return { active:true, expired:false, daysLeft:30 };
    const expiry = grantedAt + TITLE_DURATION_MS;
    const now = Date.now();
    const msLeft = expiry - now;
    if (now > expiry) {
        const expiredDaysAgo = Math.ceil((now - expiry) / 86400000);
        return { active:false, expired:true, daysLeft:0, expiredDaysAgo };
    }
    const daysLeft = Math.ceil(msLeft / 86400000);
    return { active:true, expired:false, daysLeft, expiry, earlyRenew: daysLeft <= 3 };
}
function getRenewalPrice(title, status) {
    if (!title || title.permanent || title.id === 'luyen-khi') return 0;
    if (status && status.expired) {
        if (status.expiredDaysAgo <= 3) return Math.round(title.price * 0.5);
        return title.price;
    }
    if (status && status.earlyRenew) return Math.round(title.price * 0.4);
    return Math.round(title.price * 0.5);
}
function getTitleDiscount(user) {
    // Trả về % giảm giá thực tế (0 nếu hết hạn)
    if (!user || !user.titleOverride) return { discount:0, title:null };
    const t = TITLES.find(x => x.id === user.titleOverride);
    if (!t) return { discount:0, title:null };
    if (t.permanent) return { discount: t.discount, title:t }; // Đại Đế: 100%, vĩnh viễn
    const status = getTitleStatus(user);
    if (!status.active) return { discount:0, title:t, expired:true };
    return { discount: t.discount, title:t };
}
