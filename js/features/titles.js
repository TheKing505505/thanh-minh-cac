// ===== DANH HIỆU GRID =====
(function(){
    const s=document.createElement('style');
    s.textContent=`
@keyframes dh-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes dh-glow-b{0%,100%{filter:drop-shadow(0 3px 5px #1e40af) drop-shadow(0 0 10px #3b82f650)}50%{filter:drop-shadow(0 4px 14px #3b82f6) drop-shadow(0 0 24px #93c5fd90)}}
@keyframes dh-glow-g{0%,100%{filter:drop-shadow(0 3px 5px #166534) drop-shadow(0 0 10px #22c55e50)}50%{filter:drop-shadow(0 4px 14px #22c55e) drop-shadow(0 0 24px #86efac90)}}
@keyframes dh-glow-o{0%,100%{filter:drop-shadow(0 3px 6px #9a3412) drop-shadow(0 0 12px #f9731650)}50%{filter:drop-shadow(0 4px 16px #f97316) drop-shadow(0 0 28px #fdba7490)}}
@keyframes dh-glow-p{0%,100%{filter:drop-shadow(0 3px 6px #581c87) drop-shadow(0 0 12px #a855f755)}50%{filter:drop-shadow(0 5px 18px #a855f7) drop-shadow(0 0 34px #d8b4fe99)}}
@keyframes dh-glow-m{0%,100%{filter:drop-shadow(0 4px 8px #86198f) drop-shadow(0 0 14px #d946ef60)}50%{filter:drop-shadow(0 5px 22px #d946ef) drop-shadow(0 0 42px #f0abfcaa)}}
@keyframes dh-glow-y{0%,100%{filter:drop-shadow(0 4px 10px #92400e) drop-shadow(0 0 16px #f59e0b70)}50%{filter:drop-shadow(0 6px 26px #f59e0b) drop-shadow(0 0 50px #fde68acc)}}
@keyframes dh-glow-dd{0%,100%{filter:drop-shadow(0 5px 12px #78350f) drop-shadow(0 0 20px #ffd70080)}50%{filter:drop-shadow(0 7px 30px #ffd700) drop-shadow(0 0 60px #fff5aacc) drop-shadow(0 0 90px #ffd70040)}}
@keyframes dh-glow-lh{0%,100%{filter:drop-shadow(0 3px 6px #007a88) drop-shadow(0 0 12px #00e5cc55)}50%{filter:drop-shadow(0 5px 18px #00e5cc) drop-shadow(0 0 36px #80fff099) drop-shadow(0 0 54px #00e5cc30)}}
@keyframes dh-glow-dt{0%,100%{filter:drop-shadow(0 3px 7px #102858) drop-shadow(0 0 14px #5090d860)}50%{filter:drop-shadow(0 5px 20px #80b8ff) drop-shadow(0 0 40px #c0dcffa0) drop-shadow(0 0 65px #5090d830)}}
@keyframes dh-glow-dk{0%,100%{filter:drop-shadow(0 4px 8px #600000) drop-shadow(0 0 16px #cc000070)}50%{filter:drop-shadow(0 6px 24px #ff3030) drop-shadow(0 0 50px #ff606099) drop-shadow(0 0 80px #cc000035)}}
.dh-gb{animation:dh-bob 2.8s ease-in-out infinite,dh-glow-b 2.5s ease-in-out infinite}
.dh-gg{animation:dh-bob 2.8s .3s ease-in-out infinite,dh-glow-g 2.5s .3s ease-in-out infinite}
.dh-go{animation:dh-bob 2.8s .6s ease-in-out infinite,dh-glow-o 2.5s .6s ease-in-out infinite}
.dh-gp{animation:dh-bob 2.8s .9s ease-in-out infinite,dh-glow-p 2.5s .9s ease-in-out infinite}
.dh-gm{animation:dh-bob 2.8s 1.2s ease-in-out infinite,dh-glow-m 2s 1.2s ease-in-out infinite}
.dh-gy{animation:dh-bob 2.8s 1.5s ease-in-out infinite,dh-glow-y 2s 1.5s ease-in-out infinite}
.dh-gd{animation:dh-bob 2.8s 1.8s ease-in-out infinite,dh-glow-dd 1.8s 1.8s ease-in-out infinite}
.dh-glh{animation:dh-bob 2.8s 2.1s ease-in-out infinite,dh-glow-lh 2.2s 2.1s ease-in-out infinite}
.dh-gdt{animation:dh-bob 2.8s 2.4s ease-in-out infinite,dh-glow-dt 2s 2.4s ease-in-out infinite}
.dh-gdk{animation:dh-bob 2.4s 2.7s ease-in-out infinite,dh-glow-dk 1.6s 2.7s ease-in-out infinite}
`;
    document.head.appendChild(s);
})();


function renderTitleShopGrid(){
    // Kiểm tra element mới (3 row) hoặc cũ (1 grid)
    const row1=document.getElementById('titleRow1');
    const row2=document.getElementById('titleRow2');
    const row3=document.getElementById('titleRow3');
    const oldGrid=document.getElementById('titleShopGrid');

    // Helper tạo HTML 1 card
    function cardHtml(t, tierCls, extraCls='', extraStyle=''){
        const isFree=t.free||t.price===0;
        const logoSvg=DH_LOGOS[t.id]||`<span style="font-size:2rem">${t.icon}</span>`;
        const renewHint=(!isFree)?`<div style="font-size:0.62rem;color:rgba(240,230,255,0.3);margin-bottom:6px">GH sớm: <span style="color:var(--accent)">${formatPrice(Math.round(t.price*0.4))}</span> · Hết ≤3 ngày: <span style="color:var(--gold)">${formatPrice(Math.round(t.price*0.5))}</span></div>`:'';
        return `<div class="dh-card ${tierCls} ${extraCls}" style="${extraStyle}" onclick="openBuyTitle('${t.id}')">
            <div class="dh-card-logo">${logoSvg}</div>
            <div class="dh-card-name"><span class="${t.cls}" style="padding:2px 8px;border-radius:8px;display:inline-block">${t.name}</span></div>
            <div class="dh-card-price">${isFree?'<span style="color:var(--green);font-size:0.78rem;font-family:Quicksand,sans-serif">Mặc định</span>':formatPrice(t.price)}</div>
            ${renewHint}
            <div class="dh-card-perk">${t.desc}${t.discount>0&&t.discount<100?`<br><span class="hl">✨ -${t.discount}% đơn ≥${formatPrice(t.minOrder)}</span>`:''}</div>
            <div class="dh-card-btn">${isFree?'Đã có':'Mua Ngay →'}</div>
        </div>`;
    }

    // Card banner Độ Kiếp nằm ngang
    function bannerHtml(t){
        const logoSvg=DH_LOGOS[t.id]||`<span style="font-size:2rem">${t.icon}</span>`;
        return `<div class="dh-card tier-8 banner-card" onclick="openBuyTitle('${t.id}')">
            <div class="dh-card-logo" style="width:72px;height:72px;flex-shrink:0;margin:0">${logoSvg}</div>
            <div class="dh-card-body">
                <div class="dh-card-name"><span class="${t.cls}" style="padding:2px 10px;border-radius:8px;display:inline-block">${t.name}</span></div>
                <div class="dh-card-price">${formatPrice(t.price)}</div>
                <div style="font-size:0.62rem;color:rgba(240,230,255,0.3);margin-bottom:6px">GH sớm: <span style="color:var(--accent)">${formatPrice(Math.round(t.price*0.4))}</span> · Hết ≤3 ngày: <span style="color:var(--gold)">${formatPrice(Math.round(t.price*0.5))}</span></div>
                <div class="dh-card-perk" style="font-size:0.72rem">${t.desc}<br><span class="hl">✨ Giảm ${t.discount}% đơn ≥${formatPrice(t.minOrder)}</span></div>
            </div>
            <div style="flex-shrink:0">
                <div class="dh-card-btn" style="padding:9px 22px;font-size:0.8rem">Mua Ngay →</div>
            </div>
        </div>`;
    }

    const T=TITLES;
    const tiers=['tier-1','tier-2','tier-3','tier-4','tier-5','tier-5b','tier-6','tier-7','tier-8'];

    if(row1&&row2&&row3){
        // === Layout 3 ROW ===
        // ROW 1: Luyện Khí, Trúc Cơ, Kim Đan, Nguyên Anh, Hoá Thần (5 card nhỏ)
        const row1Titles=[T[0],T[1],T[2],T[3],T[4]];
        row1.innerHTML=row1Titles.map((t,i)=>cardHtml(t,tiers[i])).join('');

        // ROW 2: Luyện Hư | HỢP THỂ (featured to) | Đại Thừa
        const luyenHu=T[5]; const hopThe=T[6]; const daiThua=T[7];
        row2.innerHTML=
            cardHtml(luyenHu,'tier-5b')+
            // HỢP THỂ — featured card ở giữa, to hơn, có nhãn HOT
            `<div class="dh-card tier-6 featured-card title-featured" onclick="openBuyTitle('${hopThe.id}')" style="position:relative;overflow:visible">
                <div class="dh-card-logo" style="width:80px;height:80px;margin:0 auto 12px">${DH_LOGOS[hopThe.id]||hopThe.icon}</div>
                <div class="dh-card-name" style="font-size:1.05rem"><span class="${hopThe.cls}" style="padding:2px 10px;border-radius:8px;display:inline-block">${hopThe.name}</span></div>
                <div class="dh-card-price" style="font-size:1rem">${formatPrice(hopThe.price)}</div>
                <div style="font-size:0.62rem;color:rgba(240,230,255,0.3);margin-bottom:6px">GH sớm: <span style="color:var(--accent)">${formatPrice(Math.round(hopThe.price*0.4))}</span> · ≤3 ngày: <span style="color:var(--gold)">${formatPrice(Math.round(hopThe.price*0.5))}</span></div>
                <div class="dh-card-perk">${hopThe.desc}<br><span class="hl">✨ -${hopThe.discount}% đơn ≥${formatPrice(hopThe.minOrder)}</span></div>
                <div class="dh-card-btn" style="padding:9px 22px">Mua Ngay →</div>
            </div>`+
            cardHtml(daiThua,'tier-7');

        // ROW 3: Độ Kiếp — banner ngang full width
        const doKiep=T[8];
        row3.innerHTML=bannerHtml(doKiep);

    } else if(oldGrid){
        // Fallback: layout cũ
        oldGrid.innerHTML=T.filter(t=>!t.adminOnly).map((t,i)=>cardHtml(t,tiers[i]||'tier-1')).join('');
    }
}

// Lấy giá gia hạn: 40% nếu còn trong hạn/trước 3 ngày hết, 50% nếu hết hạn trong 3 ngày, full nếu quá 3 ngày
function getRenewalInfo(user, titleId){
    if(!user||!user.titleOverride||user.titleOverride!==titleId) return {type:'new', pct:100};
    if(user.titleId_adminOnly) return {type:'permanent', pct:0};
    const expiry=user.titleExpiry||0;
    const now=Date.now();
    const DAY3=3*24*60*60*1000;
    if(expiry===0) return {type:'new', pct:100};
    if(now < expiry) return {type:'early', pct:40};           // còn trong hạn → gia hạn sớm 40%
    if(now < expiry+DAY3) return {type:'grace', pct:50};      // hết hạn ≤3 ngày → 50%
    return {type:'full', pct:100};                             // quá 3 ngày → full
}

async function openBuyTitle(titleId){
    if(!currentUser||currentUser.role!=='user'){showNotif('Đăng nhập để mua danh hiệu!','error');openModal('loginModal');return;}
    const t=TITLES.find(x=>x.id===titleId);if(!t||t.adminOnly)return;
    if(t.free){showNotif('Luyện Khí là danh hiệu mặc định, bạn đã có rồi!','info');return;}
    try{
        const user=await getMyUser();
        if(!user){showNotif('Không đọc được tài khoản!','error');return;}
        // Không cho gửi trùng yêu cầu đang chờ
        const pend=await db.collection('titlepurchases').where('uid','==',currentUser.uid).get();
        if(pend.docs.some(d=>d.data().status==='pending'&&d.data().titleId===titleId)){showNotif('⏳ Bạn đã gửi yêu cầu danh hiệu này, đang chờ chủ shop duyệt.','info');return;}
        const hold=await getMyHold();
        const balance=(user.balance||0)-hold;
        const ri=getRenewalInfo(user,titleId);
        const finalPrice=Math.round(t.price*ri.pct/100);
        let confirmMsg='';
        if(ri.type==='early') confirmMsg=`🔄 Gia hạn sớm "${t.name}"\n💚 Giá ưu đãi 40%: ${formatPrice(finalPrice)} (tiết kiệm ${formatPrice(t.price-finalPrice)})\nSố dư khả dụng sau khi trừ: ${formatPrice(balance-finalPrice)}`;
        else if(ri.type==='grace') confirmMsg=`🔄 Gia hạn "${t.name}"\n✨ Giá gia hạn 50%: ${formatPrice(finalPrice)} (tiết kiệm ${formatPrice(t.price-finalPrice)})\nSố dư khả dụng sau khi trừ: ${formatPrice(balance-finalPrice)}`;
        else confirmMsg=`🛒 Mua "${t.icon} ${t.name}"\nGiá: ${formatPrice(finalPrice)}\nSố dư khả dụng sau khi trừ: ${formatPrice(balance-finalPrice)}`;
        if(balance<finalPrice){showNotif(`❌ Số dư khả dụng không đủ! Cần ${formatPrice(finalPrice)}, khả dụng ${formatPrice(Math.max(0,balance))}.`,'error');return;}
        if(!confirm(confirmMsg+'\n\n(Tiền được trừ khi chủ shop duyệt và cấp danh hiệu)'))return;
        const id=secureRandomString(20,'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
        await db.collection('titlepurchases').doc(id).set({
            uid:currentUser.uid,username:currentUser.username,titleId,titleName:t.name,
            price:finalPrice,origPrice:t.price,renewalType:ri.type,
            time:new Date().toLocaleString('vi-VN'),timestamp:Date.now(),status:'pending'
        });
        showNotif(`✅ Đã gửi yêu cầu ${ri.type==='new'?'mua':'gia hạn'} ${t.name}! Chờ chủ shop cấp.`,'success');
        triggerCelebration();
    }catch(e){console.error('openBuyTitle:',e.code||e.message);showNotif('Lỗi mua danh hiệu!','error');}
}

// ===== MÃ GIẢM GIÁ =====
